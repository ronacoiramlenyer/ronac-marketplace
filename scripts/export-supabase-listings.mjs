// Ronac — copy listings from Supabase to Cloudflare (D1 + R2).
//
// Reads every row of the Supabase `listings` table and its product photo
// using the public anon key (listings and the product-images bucket are
// publicly readable), then writes:
//
//   migration-export/seed_listings.sql   INSERT statements for D1
//   migration-export/images/<key>        downloaded product photos
//   migration-export/upload-images.sh    wrangler commands to put photos in R2
//
// Usage (Node 18+, no npm install needed):
//
//   SUPABASE_URL=https://xxxx.supabase.co \
//   SUPABASE_ANON_KEY=eyJ... \
//   node scripts/export-supabase-listings.mjs [--default-stock 10]
//
// Supabase listings have no stock count. "available" listings get
// --default-stock packs (default 0 — set real counts on the Listings page
// afterwards); "pending" and "sold" listings get 0.
//
// Then, after `npx wrangler d1 migrations apply ronac --remote`:
//
//   npx wrangler d1 execute ronac --remote --file migration-export/seed_listings.sql
//   sh migration-export/upload-images.sh

import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const SUPABASE_URL = process.env.SUPABASE_URL?.replace(/\/$/, "");
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
const IMAGE_BUCKET = process.env.SUPABASE_STORAGE_BUCKET || "product-images";
const R2_BUCKET = process.env.R2_IMAGES_BUCKET || "ronac-product-images";
const OUT_DIR = "migration-export";

const stockFlag = process.argv.indexOf("--default-stock");
const DEFAULT_STOCK = stockFlag > -1 ? Number(process.argv[stockFlag + 1]) : 0;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error("Set SUPABASE_URL and SUPABASE_ANON_KEY (Supabase Dashboard -> Project Settings -> API).");
  process.exit(1);
}
if (!Number.isInteger(DEFAULT_STOCK) || DEFAULT_STOCK < 0) {
  console.error("--default-stock must be a whole number, 0 or more.");
  process.exit(1);
}

function sql(value) {
  if (value === null || value === undefined) return "null";
  if (typeof value === "number") return String(value);
  return `'${String(value).replace(/'/g, "''")}'`;
}

function shellQuote(value) {
  return `'${String(value).replace(/'/g, `'\\''`)}'`;
}

// Public URLs look like <SUPABASE_URL>/storage/v1/object/public/<bucket>/<key>
function imageKeyFromUrl(url) {
  if (!url) return null;
  const marker = `/storage/v1/object/public/${IMAGE_BUCKET}/`;
  const i = url.indexOf(marker);
  if (i === -1) return null;
  return decodeURIComponent(url.slice(i + marker.length).split("?")[0]);
}

async function fetchListings() {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/listings?select=*&order=created_at.asc`, {
    headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` },
  });
  if (!res.ok) throw new Error(`Supabase listings request failed: ${res.status} ${await res.text()}`);
  return res.json();
}

async function main() {
  const listings = await fetchListings();
  console.log(`Found ${listings.length} listing(s).`);

  await mkdir(path.join(OUT_DIR, "images"), { recursive: true });

  const inserts = [];
  const uploads = ["#!/bin/sh", "set -e", `cd "$(dirname "$0")"`];
  const warnings = [];

  for (const l of listings) {
    const status = (l.status || "available").toLowerCase();
    const stock = status === "available" ? DEFAULT_STOCK : 0;

    let imageKey = imageKeyFromUrl(l.image_url);
    if (l.image_url && !imageKey) {
      warnings.push(`${l.product_name}: image is not in the ${IMAGE_BUCKET} bucket, skipped (${l.image_url})`);
    }
    if (imageKey) {
      const res = await fetch(l.image_url);
      if (!res.ok) {
        warnings.push(`${l.product_name}: could not download photo (${res.status}), listing copied without it`);
        imageKey = null;
      } else {
        const file = path.join(OUT_DIR, "images", imageKey);
        await mkdir(path.dirname(file), { recursive: true });
        await writeFile(file, Buffer.from(await res.arrayBuffer()));
        const contentType = res.headers.get("content-type") || "application/octet-stream";
        uploads.push(
          `npx wrangler r2 object put ${shellQuote(`${R2_BUCKET}/${imageKey}`)} --file ${shellQuote(`images/${imageKey}`)} --content-type ${shellQuote(contentType)} --remote`
        );
      }
    }

    inserts.push(
      "insert or replace into listings (id, product_name, description, price, stock, image_key, is_active, created_at) values (" +
        [
          sql(l.id),
          sql(l.product_name),
          sql(l.description || null),
          sql(Math.round(Number(l.price) * 100)),
          sql(stock),
          sql(imageKey),
          sql(1),
          sql(new Date(l.created_at).toISOString().replace("T", " ").slice(0, 19)),
        ].join(", ") +
        ");"
    );
    console.log(`  ${l.product_name} — ₱${l.price} — ${status} → stock ${stock}${imageKey ? " (photo)" : ""}`);
  }

  await writeFile(
    path.join(OUT_DIR, "seed_listings.sql"),
    `-- Exported from Supabase on ${new Date().toISOString()}\n${inserts.join("\n")}\n`
  );
  await writeFile(path.join(OUT_DIR, "upload-images.sh"), uploads.join("\n") + "\n", { mode: 0o755 });

  for (const w of warnings) console.warn(`WARNING: ${w}`);
  console.log(`\nWrote ${OUT_DIR}/seed_listings.sql and ${OUT_DIR}/upload-images.sh`);
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});

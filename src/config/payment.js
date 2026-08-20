// Ronac — payment method details for manual checkout.
//
// Edit the values below with your real GCash and BPI details.
// For each QR code, add the image file to the /public folder (same
// filename as referenced here) — e.g. /public/gcash-qr.png

export const PAYMENT_METHODS = [
  {
    id: "gcash",
    label: "GCash",
    accountName: "RE***L MA**O C.", // TODO: your GCash registered name
    accountNumber: "0956 466 0037", // TODO: your GCash number
    qrImage: "/gcash-qr.jpeg", // TODO: replace with your real GCash QR (e.g. /gcash-qr.png)
  },
  {
    id: "bpi",
    label: "BPI",
    accountName: "REYNEL MARIO CANOR", // TODO: your BPI account name
    accountNumber: "3109 1450 08", // TODO: your BPI account number
    qrImage: "/bpi-qr.png", // TODO: replace with your real BPI QR (e.g. /bpi-qr.png)
  },
];

// Ronac — payment method details for manual checkout.
//
// Edit the values below with your real GCash and BPI details.
// For each QR code, add the image file to the /public folder (same
// filename as referenced here) — e.g. /public/gcash-qr.png

export const PAYMENT_METHODS = [
  {
    id: "gcash",
    label: "GCash",
    accountName: "Juan Dela Cruz", // TODO: your GCash registered name
    accountNumber: "0917 000 0000", // TODO: your GCash number
    qrImage: "/gcash-qr.svg", // TODO: replace with your real GCash QR (e.g. /gcash-qr.png)
  },
  {
    id: "bpi",
    label: "BPI",
    accountName: "Juan Dela Cruz", // TODO: your BPI account name
    accountNumber: "0000 0000 00", // TODO: your BPI account number
    qrImage: "/bpi-qr.svg", // TODO: replace with your real BPI QR (e.g. /bpi-qr.png)
  },
];

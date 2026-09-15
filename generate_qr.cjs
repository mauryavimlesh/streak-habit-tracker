const QRCode = require('qrcode');
const fs = require('fs');

QRCode.toFile('public/streakloop_qr.png', 'https://streakloop.vercel.app', {
  color: {
    dark: '#000000',  // Black dots
    light: '#FFFFFF' // White background
  },
  width: 400,
  margin: 1
}, function (err) {
  if (err) throw err;
  console.log('QR code updated to .app successfully!');
});

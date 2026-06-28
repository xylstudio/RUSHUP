const ReceiptPrinterEncoder = require('@point-of-sale/receipt-printer-encoder');
const encoder = new ReceiptPrinterEncoder({ printerModel: 'xprinter-xp-n160ii', columns: 48 });
const data = encoder.initialize().raw([0x1B, 0x70, 0x00, 0x32, 0x32]).encode();
let hex = '';
data.forEach(b => hex += b.toString(16).padStart(2, '0'));
console.log(hex);

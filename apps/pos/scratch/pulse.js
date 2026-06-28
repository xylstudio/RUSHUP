const ReceiptPrinterEncoder = require('@point-of-sale/receipt-printer-encoder');
const encoder = new ReceiptPrinterEncoder({ printerModel: 'xprinter-xp-n160ii', columns: 48 });
const data = encoder.initialize().pulse(0, 120, 120).pulse(1, 120, 120).encode();
let hex = '';
data.forEach(b => hex += b.toString(16).padStart(2, '0'));
console.log(hex);

const ReceiptPrinterEncoder = require('@point-of-sale/receipt-printer-encoder').default;
const encoder = new ReceiptPrinterEncoder({ printerModel: 'xprinter-xp-n160ii', columns: 48 });
const data = encoder.initialize().pulse().encode();
let hex = '';
data.forEach(b => hex += b.toString(16).padStart(2, '0'));
console.log(hex);

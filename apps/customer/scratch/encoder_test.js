const ReceiptPrinterEncoder = require('@point-of-sale/receipt-printer-encoder');
const encoder = new ReceiptPrinterEncoder({ columns: 48 });
console.log(typeof encoder.table);

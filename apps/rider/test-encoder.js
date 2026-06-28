const ReceiptPrinterEncoder = require('@point-of-sale/receipt-printer-encoder');
const encoder = new ReceiptPrinterEncoder({
    language: 'esc-pos',
    columns: 48,
});
encoder.initialize().codepage('cp874').text('สวัสดี').newline();
console.log(encoder.encode().toString('hex'));

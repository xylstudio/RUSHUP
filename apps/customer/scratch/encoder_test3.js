const ReceiptPrinterEncoder = require('@point-of-sale/receipt-printer-encoder');
const encoder = new ReceiptPrinterEncoder({ columns: 48, codepageMapping: { 'cp874': 0xff, 'tis620': 0xff } });
const data = encoder.initialize()
  .codepage('cp874')
  .table(
    [
      { width: 34, align: 'left' },
      { width: 14, align: 'right' }
    ],
    [
      [ '1x ลาเต้เย็น', '80.00' ],
      [ 'ยอดรวม (Total)', '1000.00' ]
    ]
  )
  .encode();
let str = '';
data.forEach(b => {
  if (b >= 32 && b < 127) str += String.fromCharCode(b);
  else if (b === 10) str += '\n';
  else str += '?';
});
console.log(str);

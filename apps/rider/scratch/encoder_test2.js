const ReceiptPrinterEncoder = require('@point-of-sale/receipt-printer-encoder');
const encoder = new ReceiptPrinterEncoder({ columns: 48, codepageMapping: { 'cp874': 0xff, 'tis620': 0xff } });
const data = encoder.initialize()
  .codepage('cp874')
  .table(
    [
      { width: 36, align: 'left' },
      { width: 12, align: 'right' }
    ],
    [
      [ '1x ลาเต้เย็น', '80.00' ],
      [ 'วันที่: 12/06/2026', 'คิว: A01' ]
    ]
  )
  .encode();
// decode it back to string roughly just to see padding
let str = '';
data.forEach(b => {
  if (b >= 32 && b < 127) str += String.fromCharCode(b);
  else if (b === 10) str += '\n';
  else str += '?';
});
console.log(str);

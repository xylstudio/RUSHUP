const fs = require('fs');
let content = fs.readFileSync('components/pos/POSTerminal.tsx', 'utf-8');

const target1 = `  const handlePrintReceipt = useReactToPrint({
    contentRef: receiptRef,
  })`;
const replace1 = `  const printPageStyle = \`
    @page { size: 80mm auto; margin: 0; }
    @media print {
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; margin: 0; padding: 0; }
      html { background: transparent; }
    }
  \`;

  const handlePrintReceipt = useReactToPrint({
    contentRef: receiptRef,
    pageStyle: printPageStyle,
  })`;

const target2 = `  const handlePrintKitchen = useReactToPrint({
    contentRef: kitchenReceiptRef,
  })`;
const replace2 = `  const handlePrintKitchen = useReactToPrint({
    contentRef: kitchenReceiptRef,
    pageStyle: printPageStyle,
  })`;

content = content.replace(target1, replace1).replace(target2, replace2);
fs.writeFileSync('components/pos/POSTerminal.tsx', content);
console.log('done');

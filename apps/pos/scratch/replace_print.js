const fs = require('fs');
let content = fs.readFileSync('components/pos/POSTerminal.tsx', 'utf-8');

// Replace react-to-print imports and hooks
content = content.replace(/import \{ useReactToPrint \} from 'react-to-print'/g, '');

const hookRegex = /const printPageStyle = `[\s\S]*?`\s*const handlePrintReceipt = useReactToPrint\(\{[\s\S]*?\}\)\s*const handlePrintKitchen = useReactToPrint\(\{[\s\S]*?\}\)/;

const newHooks = `
  const [printMode, setPrintMode] = useState<'none' | 'receipt' | 'kitchen'>('none');

  useEffect(() => {
    if (printMode !== 'none') {
      const timer = setTimeout(() => {
        window.print();
        setPrintMode('none');
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [printMode]);

  const handlePrintReceipt = () => {
    setPrintMode('receipt');
  };

  const handlePrintKitchen = () => {
    setPrintMode('kitchen');
  };
`;
content = content.replace(hookRegex, newHooks);

// Replace the hidden printing area
const hiddenAreaRegex = /\{\/\* Hidden Receipt for Printing \*\/\}\s*<div className="absolute left-\[-9999px\] top-\[-9999px\] opacity-0 overflow-hidden">\s*<POSReceipt[\s\S]*?ref=\{receiptRef\}[\s\S]*?\/>\s*<\/div>\s*\{\/\* Hidden Kitchen Ticket \*\/\}\s*<div className="absolute left-\[-9999px\] top-\[-9999px\] opacity-0 overflow-hidden">\s*<POSKitchenTicket[\s\S]*?ref=\{kitchenReceiptRef\}[\s\S]*?\/>\s*<\/div>/;

const newHiddenArea = `
        {/* Global Print Area */}
        <div id="print-area" className={printMode !== 'none' ? 'block' : 'hidden'}>
          {printMode === 'receipt' && paymentSuccessData && (
            <POSReceipt 
              order={paymentSuccessData.order} 
              items={paymentSuccessData.items} 
              shopSettings={shopSettings} 
              changeAmount={paymentSuccessData.changeAmount} 
            />
          )}
          {printMode === 'kitchen' && paymentSuccessData && (
            <POSKitchenTicket 
              order={paymentSuccessData.order} 
              items={paymentSuccessData.items} 
              shopSettings={shopSettings} 
            />
          )}
        </div>
`;

content = content.replace(hiddenAreaRegex, newHiddenArea);

// Add the global print styles before the final return of the component wrapper
const styleInsert = `
      {/* 4. MODALS & SLIDEOVERS */}
      <style jsx global>{\`
        @media print {
          body * {
            visibility: hidden;
          }
          #print-area, #print-area * {
            visibility: visible;
          }
          #print-area {
            position: absolute;
            left: 0;
            top: 0;
            width: 80mm;
            margin: 0;
            padding: 0;
          }
          @page { size: 80mm auto; margin: 0; }
          html, body {
            background: transparent;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
        }
      \`}</style>
`;
content = content.replace(/\{\/\* 4\. MODALS & SLIDEOVERS \*\/\}/, styleInsert);

fs.writeFileSync('components/pos/POSTerminal.tsx', content);
console.log('done');

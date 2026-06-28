const fs = require('fs');
let content = fs.readFileSync('components/pos/POSTerminal.tsx', 'utf-8');

const target = `    </div>
  )
}
`;

const replacement = `
      {/* GLOBAL PRINT STYLES */}
      <style jsx global>{\`
        @media print {
          body * {
            visibility: hidden !important;
          }
          #print-area, #print-area * {
            visibility: visible !important;
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
            background: transparent !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
        }
      \`}</style>
    </div>
  )
}
`;

content = content.replace(target, replacement);
fs.writeFileSync('components/pos/POSTerminal.tsx', content);
console.log('done');

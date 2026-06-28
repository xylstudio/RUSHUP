const fs = require('fs');
let content = fs.readFileSync('components/pos/POSTerminal.tsx', 'utf-8');

content = content.replace(/content: \(\) => receiptRef\.current,/, 'contentRef: receiptRef,');

fs.writeFileSync('components/pos/POSTerminal.tsx', content);
console.log('Fixed hook args');

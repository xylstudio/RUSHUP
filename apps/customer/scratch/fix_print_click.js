const fs = require('fs');
let content = fs.readFileSync('components/pos/POSTerminal.tsx', 'utf-8');

const target1 = `onClick={handlePrintKitchen}`;
const replace1 = `onClick={() => handlePrintKitchen()}`;

const target2 = `onClick={handlePrintReceipt}`;
const replace2 = `onClick={() => handlePrintReceipt()}`;

const target3 = `                {/* Hidden Receipt for Printing */}
                <div className="hidden">`;
const replace3 = `                {/* Hidden Receipt for Printing */}
                <div className="absolute left-[-9999px] top-[-9999px] opacity-0 overflow-hidden">`;

content = content.replace(target1, replace1).replace(target2, replace2).replace(target3, replace3);
fs.writeFileSync('components/pos/POSTerminal.tsx', content);
console.log('done');

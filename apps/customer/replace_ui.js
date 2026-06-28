const fs = require('fs');
const path = '/Users/natthanchaimongkol/Downloads/XYLPROJECT-main/components/pos/POSShopSettings.tsx';
let content = fs.readFileSync(path, 'utf8');

const returnIndex = content.indexOf('return (');
if (returnIndex === -1) {
    console.error('Could not find return block');
    process.exit(1);
}

const beforeReturn = content.substring(0, returnIndex);
const newUi = fs.readFileSync('/Users/natthanchaimongkol/Downloads/XYLPROJECT-main/ui_replacement.txt', 'utf8');

fs.writeFileSync(path, beforeReturn + newUi);
console.log('Successfully replaced UI');

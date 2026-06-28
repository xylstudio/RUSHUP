const fs = require('fs');
const content = fs.readFileSync('/Users/natthanchaimongkol/Downloads/XYLPROJECT-main/components/pos/POSShopSettings.tsx', 'utf8');
const returnIndex = content.indexOf('  return (\n');
const beforeReturn = content.substring(0, returnIndex);
const minimal = `  return (
    <div>test</div>
  )
}
`;
fs.writeFileSync('/Users/natthanchaimongkol/Downloads/XYLPROJECT-main/components/pos/POSShopSettings_test.tsx', beforeReturn + minimal);

const fs = require('fs');
const path = require('path');

const targetPath = path.join(__dirname, '../app/dashboard/customer/orders/[orderId]/page.tsx');
let content = fs.readFileSync(targetPath, 'utf8');

// Replace rounded corners
content = content.replace(/rounded-3xl/g, 'rounded-none');
content = content.replace(/rounded-2xl/g, 'rounded-none');
content = content.replace(/rounded-xl/g, 'rounded-none');
content = content.replace(/rounded-lg/g, 'rounded-none');
content = content.replace(/rounded-full/g, 'rounded-none');
content = content.replace(/rounded-md/g, 'rounded-none');

// Replace green theme colors with sharp theme colors
// Green dark -> Sharp Black
content = content.replace(/#1B2A22/g, '#111111');
content = content.replace(/#214031/g, '#111111');

// Accent -> Sharp Accent (Brown)
content = content.replace(/#34D399/g, '#AF907A');

// Soft backgrounds -> Sharp borders
content = content.replace(/bg-\[\#F4F1EA\]/g, 'bg-white border border-[#F0EFEB]');
content = content.replace(/bg-\[\#FDFBF9\]/g, 'bg-[#F9F8F4] border border-[#111111] shadow-[4px_4px_0px_0px_rgba(17,17,17,1)]');
content = content.replace(/border-\[\#EBE9E0\]/g, 'border-[#F0EFEB]');

// Buttons & Modals
content = content.replace(/shadow-xl shadow-\[\#1B2A22\]\/5/g, 'shadow-[8px_8px_0px_0px_rgba(17,17,17,1)] border border-[#111111]');
content = content.replace(/shadow-lg shadow-\[\#1B2A22\]\/20/g, 'shadow-[4px_4px_0px_0px_rgba(17,17,17,1)]');
content = content.replace(/shadow-sm/g, 'shadow-none');
content = content.replace(/shadow-md/g, 'shadow-none border border-[#111111]');

fs.writeFileSync(targetPath, content);
console.log('Done replacing styles');

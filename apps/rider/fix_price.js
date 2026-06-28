const fs = require('fs');
const file1 = 'app/liff/menu/page.tsx';
let content1 = fs.readFileSync(file1, 'utf8');

content1 = content1.replace(/m\.price \|\| 0/g, 'm.price_adjustment || m.price || 0');
content1 = content1.replace(/mod\?\.price \|\| 0/g, 'mod?.price_adjustment || mod?.price || 0');
content1 = content1.replace(/opt\.price > 0/g, '(opt.price_adjustment || opt.price) > 0');
content1 = content1.replace(/opt\.price\}/g, 'opt.price_adjustment || opt.price}');

fs.writeFileSync(file1, content1);

const file2 = 'app/api/checkout/route.ts';
let content2 = fs.readFileSync(file2, 'utf8');

content2 = content2.replace(/mod\?\.price \|\| 0/g, 'mod?.price_adjustment || mod?.price || 0');
content2 = content2.replace(/m\.price \|\| 0/g, 'm.price_adjustment || m.price || 0');

fs.writeFileSync(file2, content2);
console.log('Fixed');

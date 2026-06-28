const fs = require('fs');

// Fix GardenCalendar
let gc = fs.readFileSync('components/customer/GardenCalendar.tsx', 'utf8');
gc = gc.replace(/const \{ locale \} = useI18n\(\);\n/g, '');
fs.writeFileSync('components/customer/GardenCalendar.tsx', gc, 'utf8');

// Fix [houseId]/page.tsx
let hp = fs.readFileSync('app/dashboard/customer/houses/[houseId]/page.tsx', 'utf8');
hp = hp.replace(/const \{ locale \} = useI18n\(\);\n/g, '');
fs.writeFileSync('app/dashboard/customer/houses/[houseId]/page.tsx', hp, 'utf8');

// Fix POSCustomerSelect line 232
let pcs = fs.readFileSync('components/pos/POSCustomerSelect.tsx', 'utf8');
pcs = pcs.replace(/\{locale === 'en' \? '                                     \{locale[\s\S]*?\}<\/button>/g, "{locale === 'en' ? 'Cancel' : locale === 'zh' ? '取消' : 'ยกเลิก'}</button>");
fs.writeFileSync('components/pos/POSCustomerSelect.tsx', pcs, 'utf8');

// Fix PointGenerator
let pg = fs.readFileSync('components/pos/PointGenerator.tsx', 'utf8');
pg = pg.replace(/\{locale === 'en' \? '                     \{locale[\s\S]*?Collect points[\s\S]*?\}<\/button>/g, "{locale === 'en' ? 'Collect points' : locale === 'zh' ? '收集积分' : 'สะสมแต้ม'}</button>");
pg = pg.replace(/\{locale === 'en' \? '                     \{locale[\s\S]*?Collect glass[\s\S]*?\}<\/button>/g, "{locale === 'en' ? 'Collect glass' : locale === 'zh' ? '收集玻璃' : 'สะสมแก้ว'}</button>");
pg = pg.replace(/\{locale === 'en' \? '                             \{locale[\s\S]*?OK[\s\S]*?\}<\/button>/g, "{locale === 'en' ? 'OK' : locale === 'zh' ? '好的' : 'ตกลง'}</button>");
pg = pg.replace(/<ArrowLeft size=\{14\} \/> \{locale === 'en' \? ' ทำใหม่[\s\S]*?\}<\/button>/g, "<ArrowLeft size={14} /> {locale === 'en' ? 'Redo' : locale === 'zh' ? '重做' : 'ทำใหม่'}</button>");
pg = pg.replace(/\{locale === 'en' \? '                   \{locale[\s\S]*?Finished[\s\S]*?\}<\/button>/g, "{locale === 'en' ? 'Finished' : locale === 'zh' ? '完成' : 'เสร็จสิ้น'}</button>");
fs.writeFileSync('components/pos/PointGenerator.tsx', pg, 'utf8');

console.log('Fixed syntax errors');

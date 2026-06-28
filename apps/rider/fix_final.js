const fs = require('fs');

function fixNestedLocale(filePath) {
    if (!fs.existsSync(filePath)) return;
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Using a simpler approach: replace any heavily nested locale strings manually
    content = content.replace(/\{locale === 'en' \? ' Signature Series • เมนูแนะนำ[\s\S]*?\}<\/h2>/g, "{locale === 'en' ? 'Signature Series • Recommended menu' : locale === 'zh' ? '招牌系列 • 推荐菜单' : 'Signature Series • เมนูแนะนำ'}</h2>");
    
    // Also look for others in the file
    content = content.replace(/\{locale === 'en' \? '                               \{locale[\s\S]*?toLocaleString\(\)\}/g, "{locale === 'en' ? '฿' : locale === 'zh' ? '฿' : '฿'}{((item.sale_price + (item.selected_modifiers?.reduce((acc, m) => acc + (m.price || 0), 0) || 0)) * item.quantity).toLocaleString()}");

    fs.writeFileSync(filePath, content, 'utf8');
}

fixNestedLocale('app/liff/menu/page.tsx');

let trackFile = 'app/liff/track/[id]/page.tsx';
if (fs.existsSync(trackFile)) {
    let content = fs.readFileSync(trackFile, 'utf8');
    content = content.replace(/\{locale === 'en' \? '               \{locale[\s\S]*?รอพนักงานรับออเดอร์[\s\S]*?\}<\/p>/g, "{locale === 'en' ? 'Waiting for staff to take order...' : locale === 'zh' ? '等待员工接单...' : 'รอพนักงานรับออเดอร์สักครู่...'}</p>");
    fs.writeFileSync(trackFile, content, 'utf8');
}

console.log("Fixed final syntax errors.");

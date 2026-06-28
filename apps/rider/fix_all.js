const fs = require('fs');

function fixMenu() {
    let f = 'app/liff/menu/page.tsx';
    let content = fs.readFileSync(f, 'utf8');
    
    // Fix line 1758
    let lines = content.split('\n');
    for (let i = 0; i < lines.length; i++) {
        if (lines[i].includes('((item.sale_price + (item.selected_modifiers?.reduce(')) {
            lines[i] = "                              {locale === 'en' ? '฿' : locale === 'zh' ? '฿' : '฿'}{((item.sale_price + (item.selected_modifiers?.reduce((acc, m) => acc + (m.price || 0), 0) || 0)) * item.quantity).toLocaleString()}";
        }
        if (lines[i].includes("applyAddressSelection(addr)")) {
            // line 2197 has "Text</button>"
            if (lines[i+3] && lines[i+3].includes("Text</button>")) {
                lines[i+3] = lines[i+3].replace("Text</button>", "{locale === 'en' ? 'Use this address' : locale === 'zh' ? '使用此地址' : 'ใช้ที่อยู่นี้'}</button>");
            }
        }
    }
    fs.writeFileSync(f, lines.join('\n'), 'utf8');
}

function fixTrack() {
    let f = 'app/liff/track/[id]/page.tsx';
    let content = fs.readFileSync(f, 'utf8');
    
    // Fix Unterminated string literal on line 237
    let lines = content.split('\n');
    for (let i = 0; i < lines.length; i++) {
        if (lines[i].includes("The barista took the order")) {
            lines[i] = "                {locale === 'en' ? 'The barista took the order. Starting to prepare drinks' : locale === 'zh' ? '咖啡师接了订单。开始准备饮料' : 'บาริสต้ารับออเดอร์แล้ว กำลังเริ่มเตรียมเครื่องดื่ม'}</motion.div>";
        }
    }
    fs.writeFileSync(f, lines.join('\n'), 'utf8');
}

function fixSettingsTest() {
    let f = 'components/pos/POSShopSettings_test.tsx';
    if(fs.existsSync(f)) {
        let content = fs.readFileSync(f, 'utf8');
        if(!content.endsWith(')')) {
            content += '\n)';
        }
        fs.writeFileSync(f, content, 'utf8');
    }
}

fixMenu();
fixTrack();
// test is not that important but ok
try { fixSettingsTest(); } catch(e){}

console.log("Done");

const fs = require('fs');

function clean(file) {
    if (!fs.existsSync(file)) return;
    let txt = fs.readFileSync(file, 'utf8');
    
    // Replace heavily nested/corrupted locale tags with simple ones
    let lines = txt.split('\n');
    for (let i = 0; i < lines.length; i++) {
        if (lines[i].includes('locale ===') && lines[i].includes('\\\'')) {
             lines[i] = lines[i].replace(/\{locale === 'en' \?[\s\S]*?(<\/button>|<\/div>|<\/h2>|<\/p>)/g, "{$1");
             lines[i] = lines[i].replace(/\{<\/button>/g, "Text</button>");
        }
    }
    
    // Fallback: If line contains `\'` and `locale ===`, it's highly likely corrupted
    for (let i = 0; i < lines.length; i++) {
         if (lines[i].match(/\{locale === 'en' \? '.*locale ===.*locale ===/)) {
             // Too nested, let's just extract the first string
             let match = lines[i].match(/\{locale === 'en' \? '([^']+)'/);
             let firstWord = match ? match[1] : 'Text';
             lines[i] = lines[i].replace(/\{locale === 'en' \?[\s\S]*?(<\/button>|<\/div>|<\/h2>|<\/p>)/g, firstWord + "$1");
         }
    }

    fs.writeFileSync(file, lines.join('\n'), 'utf8');
}

clean('components/pos/PointGenerator.tsx');
clean('components/pos/POSRecipeManager.tsx');
clean('app/liff/menu/page.tsx');
clean('app/liff/track/[id]/page.tsx');

console.log("Cleaned.");

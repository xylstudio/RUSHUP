const fs = require('fs');
const path = require('path');

const cachePath = path.join(__dirname, 'translation_cache.json');
let cache = {};
if (fs.existsSync(cachePath)) {
  cache = JSON.parse(fs.readFileSync(cachePath, 'utf8'));
}

const files = [];

function walk(dir) {
  const list = fs.readdirSync(dir);
  for (const file of list) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      walk(filePath);
    } else if (filePath.endsWith('.tsx')) {
      files.push(filePath);
    }
  }
}

walk('app');
walk('components');

const replacedRegex = /\{locale === 'en' \? '(.*?)' : locale === 'zh' \? '(.*?)' : '(.*?)'\}/g;

let updatedFiles = 0;

for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');
  let hasChanges = false;
  
  content = content.replace(replacedRegex, (match, en, zh, th) => {
    // If the en is Thai, it means it was a fallback!
    if (/[\u0E00-\u0E7F]/.test(en)) {
      const trimmed = th.trim();
      const trans = cache[trimmed];
      if (trans) {
        const enText = th.replace(trimmed, trans.en || trimmed).replace(/'/g, "\\'").replace(/\n/g, " ");
        const zhText = th.replace(trimmed, trans.zh || trimmed).replace(/'/g, "\\'").replace(/\n/g, " ");
        const thText = th.replace(/'/g, "\\'").replace(/\n/g, " ");
        hasChanges = true;
        return `{locale === 'en' ? '${enText}' : locale === 'zh' ? '${zhText}' : '${thText}'}`;
      }
    }
    return match; // return unchanged if not a fallback or not in cache
  });

  if (hasChanges) {
    fs.writeFileSync(file, content, 'utf8');
    updatedFiles++;
    console.log(`Fixed translations in ${file}`);
  }
}

console.log(`Fixed malformed translations in ${updatedFiles} files.`);

const fs = require('fs');
const path = require('path');

const cache = JSON.parse(fs.readFileSync('translation_cache.json', 'utf8'));

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
  const content = fs.readFileSync(file, 'utf8');
  let hasModifications = false;
  
  const newContent = content.replace(replacedRegex, (match, enFallback, zhFallback, originalTh) => {
    // Look up the true translation from cache
    // Note: The script escaped quotes, we might need to unescape to look up, or just try to match.
    // The keys in cache are original strings (trimmed).
    const trimmed = originalTh.replace(/\\'/g, "'").trim();
    
    if (cache[trimmed]) {
      const trans = cache[trimmed];
      const enText = (trans.en || trimmed).replace(/'/g, "\\'").replace(/\n/g, " ");
      const zhText = (trans.zh || trimmed).replace(/'/g, "\\'").replace(/\n/g, " ");
      const thText = originalTh; // keep it escaped as it was
      
      hasModifications = true;
      return `{locale === 'en' ? '${enText}' : locale === 'zh' ? '${zhText}' : '${thText}'}`;
    }
    
    return match; // If not in cache, leave it alone
  });
  
  if (hasModifications && newContent !== content) {
    fs.writeFileSync(file, newContent, 'utf8');
    updatedFiles++;
    console.log(`Fixed translations in ${file}`);
  }
}

console.log(`Fixed fallback translations in ${updatedFiles} files.`);

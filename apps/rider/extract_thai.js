const fs = require('fs');
const path = require('path');

const THAI_REGEX = /[\u0E00-\u0E7F]/;
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

const uniqueThaiStrings = new Set();
// Simple regex to extract what was replaced:
const replacedRegex = /\{locale === 'en' \? '(.*?)' : locale === 'zh' \? '(.*?)' : '(.*?)'\}/g;

for (const file of files) {
  const content = fs.readFileSync(file, 'utf8');
  let match;
  while ((match = replacedRegex.exec(content)) !== null) {
    const en = match[1];
    const zh = match[2];
    const th = match[3];
    if (THAI_REGEX.test(th)) {
      uniqueThaiStrings.add(th);
    }
  }
}

const arr = Array.from(uniqueThaiStrings);
fs.writeFileSync('unique_thai.json', JSON.stringify(arr, null, 2));
console.log('Extracted ' + arr.length + ' unique Thai strings.');

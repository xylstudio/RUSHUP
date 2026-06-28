const fs = require('fs');
const content = fs.readFileSync('/Users/natthanchaimongkol/Downloads/XYLPROJECT-main/ui_replacement.txt', 'utf8');

let open = 0;
for (let i = 0; i < content.length; i++) {
    if (content[i] === '{') open++;
    if (content[i] === '}') open--;
}
console.log('Curly braces diff:', open);

let paren = 0;
for (let i = 0; i < content.length; i++) {
    if (content[i] === '(') paren++;
    if (content[i] === ')') paren--;
}
console.log('Parentheses diff:', paren);

let angle = 0;
for (let i = 0; i < content.length; i++) {
    if (content[i] === '<') angle++;
    if (content[i] === '>') angle--;
}
console.log('Angle brackets diff:', angle);


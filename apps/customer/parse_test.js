const fs = require('fs');
const content = fs.readFileSync('/Users/natthanchaimongkol/Downloads/XYLPROJECT-main/components/pos/POSShopSettings.tsx', 'utf8');

// Use simple stack
let lines = content.split('\n');
let stack = [];
for (let i = 0; i < lines.length; i++) {
    for (let j = 0; j < lines[i].length; j++) {
        let char = lines[i][j];
        if (char === '{' || char === '(' || char === '<') {
            stack.push({ char, line: i + 1, col: j + 1 });
        } else if (char === '}' || char === ')' || char === '>') {
            if (stack.length === 0) {
                console.log(`Unmatched ${char} at ${i + 1}:${j + 1}`);
            } else {
                let last = stack.pop();
                // We won't strictly enforce match because of JSX tags like < /> and strings, but let's see.
            }
        }
    }
}
console.log('Done');

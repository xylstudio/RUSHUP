const { Project, SyntaxKind, Node } = require('ts-morph');
const fs = require('fs');

const THAI_REGEX = /[\u0E00-\u0E7F]/;
const project = new Project({ tsConfigFilePath: 'tsconfig.json' });

const sourceFiles = project.getSourceFiles().filter(sf => {
  const fp = sf.getFilePath();
  return (fp.includes('/app/') || fp.includes('/components/')) && fp.endsWith('.tsx');
});

const uniqueThai = new Set();

for (const sf of sourceFiles) {
  // Find all JsxText
  const jsxTexts = sf.getDescendantsOfKind(SyntaxKind.JsxText);
  for (const textNode of jsxTexts) {
    const text = textNode.getLiteralText().trim();
    if (text && THAI_REGEX.test(text)) {
      uniqueThai.add(text);
    }
  }

  // Find all StringLiterals in JsxAttributes
  const jsxAttributes = sf.getDescendantsOfKind(SyntaxKind.JsxAttribute);
  for (const attr of jsxAttributes) {
    const init = attr.getInitializer();
    if (init && Node.isStringLiteral(init)) {
      const text = init.getLiteralValue().trim();
      if (text && THAI_REGEX.test(text)) {
        uniqueThai.add(text);
      }
    }
  }
}

const arr = Array.from(uniqueThai);
fs.writeFileSync('all_unique_thai.json', JSON.stringify(arr, null, 2));
console.log('Total unique Thai strings across entire project: ' + arr.length);

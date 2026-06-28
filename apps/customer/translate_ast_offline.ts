import { Project, SyntaxKind, Node, FunctionDeclaration, ArrowFunction, FunctionExpression } from 'ts-morph';
import fs from 'fs';
import path from 'path';

const THAI_REGEX = /[\u0E00-\u0E7F]/;

const project = new Project({
  tsConfigFilePath: 'tsconfig.json',
});

const sourceFiles = project.getSourceFiles().filter(sf => {
  const fp = sf.getFilePath();
  return (fp.includes('/app/') || fp.includes('/components/')) && fp.endsWith('.tsx');
});

const cachePath = path.join(__dirname, 'translation_cache.json');
let translationCache: Record<string, { en: string; zh: string }> = {};
if (fs.existsSync(cachePath)) {
  translationCache = JSON.parse(fs.readFileSync(cachePath, 'utf8'));
}

function getEnclosingFunction(node: Node): FunctionDeclaration | ArrowFunction | FunctionExpression | undefined {
  let current: Node | undefined = node;
  while (current) {
    if (Node.isFunctionDeclaration(current) || Node.isArrowFunction(current) || Node.isFunctionExpression(current)) {
      return current;
    }
    current = current.getParent();
  }
  return undefined;
}

async function processFile(sf: import('ts-morph').SourceFile) {
  let hasModifications = false;
  const functionsToInject = new Set<Node>();

  const processText = (text: string, node: Node) => {
    const trimmed = text.trim();
    if (!trimmed || !THAI_REGEX.test(trimmed)) return;
    
    // Look up from cache
    let trans = translationCache[trimmed];
    if (!trans) trans = { en: trimmed, zh: trimmed }; // fallback
    
    const enText = text.replace(trimmed, trans.en || trimmed).replace(/'/g, "\\'").replace(/\n/g, " ");
    const zhText = text.replace(trimmed, trans.zh || trimmed).replace(/'/g, "\\'").replace(/\n/g, " ");
    const thText = text.replace(/'/g, "\\'").replace(/\n/g, " ");
    
    const replacement = `{locale === 'en' ? '${enText}' : locale === 'zh' ? '${zhText}' : '${thText}'}`;
    
    const func = getEnclosingFunction(node);
    node.replaceWithText(replacement);
    hasModifications = true;
    if (func) functionsToInject.add(func);
  };

  const jsxTexts = sf.getDescendantsOfKind(SyntaxKind.JsxText);
  for (const textNode of jsxTexts) {
    processText(textNode.getLiteralText(), textNode);
  }

  const jsxAttributes = sf.getDescendantsOfKind(SyntaxKind.JsxAttribute);
  for (const attr of jsxAttributes) {
    const init = attr.getInitializer();
    if (init && Node.isStringLiteral(init)) {
      processText(init.getLiteralValue(), init);
    }
  }

  if (hasModifications) {
    const hasImport = sf.getImportDeclarations().some(imp => imp.getModuleSpecifierValue() === '@/lib/I18nContext');
    if (!hasImport) {
      sf.addImportDeclaration({
        namedImports: ['useI18n'],
        moduleSpecifier: '@/lib/I18nContext'
      });
    }

    for (const func of functionsToInject) {
      let body = func.getBody();
      if (Node.isBlock(body)) {
        const hasUseI18n = body.getStatements().some(s => s.getText().includes('useI18n'));
        if (!hasUseI18n) {
          body.insertStatements(0, 'const { locale } = useI18n();');
        }
      }
    }

    const statements = sf.getStatements();
    const hasUseClient = statements.some(s => s.getText() === "'use client';" || s.getText() === "'use client'");
    if (hasUseClient) {
        statements.forEach(s => {
             if (s.getText() === "'use client';" || s.getText() === "'use client'") {
                 s.remove();
             }
        });
        sf.insertStatements(0, "'use client';");
    }

    await sf.save();
    console.log(`Updated ${sf.getFilePath()}`);
  }
}

async function run() {
  console.log(`Found ${sourceFiles.length} files to scan.`);
  for (const sf of sourceFiles) {
      if (THAI_REGEX.test(sf.getFullText())) {
          await processFile(sf);
      }
  }
  console.log('All done!');
}

run().catch(console.error);

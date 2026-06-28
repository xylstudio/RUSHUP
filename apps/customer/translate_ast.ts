import { Project, SyntaxKind, Node, FunctionDeclaration, ArrowFunction, FunctionExpression } from 'ts-morph';
import { translate } from '@vitalets/google-translate-api';
import fs from 'fs';
import path from 'path';

// Sleep helper to avoid API rate limits
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const THAI_REGEX = /[\u0E00-\u0E7F]/;

const project = new Project({
  tsConfigFilePath: 'tsconfig.json',
});

// We only want to process app/ and components/
const sourceFiles = project.getSourceFiles().filter(sf => {
  const fp = sf.getFilePath();
  return (fp.includes('/app/') || fp.includes('/components/')) && fp.endsWith('.tsx');
});

// Cache translations to save API calls
const cachePath = path.join(__dirname, 'translation_cache.json');
let translationCache: Record<string, { en: string; zh: string }> = {};
if (fs.existsSync(cachePath)) {
  translationCache = JSON.parse(fs.readFileSync(cachePath, 'utf8'));
}

async function getTranslation(text: string): Promise<{ en: string; zh: string }> {
  const trimmed = text.trim();
  if (!trimmed) return { en: text, zh: text }; // Preserve formatting for whitespace-only strings
  
  if (translationCache[trimmed]) {
    return translationCache[trimmed];
  }

  try {
    const enRes = await translate(trimmed, { to: 'en' });
    await sleep(200); // 200ms delay to avoid rate limiting
    const zhRes = await translate(trimmed, { to: 'zh-CN' });
    await sleep(200);

    const result = {
      en: enRes.text,
      zh: zhRes.text
    };
    translationCache[trimmed] = result;
    fs.writeFileSync(cachePath, JSON.stringify(translationCache, null, 2));
    console.log(`Translated: "${trimmed}" -> "${result.en}" / "${result.zh}"`);
    return result;
  } catch (err) {
    console.error(`Translation failed for "${trimmed}":`, err.message);
    // Fallback to English/Chinese placeholder or original if API fails
    return { en: trimmed, zh: trimmed };
  }
}

// Find enclosing function to inject `useI18n`
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

  // Find all JsxText
  const jsxTexts = sf.getDescendantsOfKind(SyntaxKind.JsxText);
  for (const textNode of jsxTexts) {
    const text = textNode.getLiteralText();
    if (THAI_REGEX.test(text)) {
      const trans = await getTranslation(text);
      const enText = text.replace(text.trim(), trans.en).replace(/'/g, "\\'").replace(/\n/g, " ");
      const zhText = text.replace(text.trim(), trans.zh).replace(/'/g, "\\'").replace(/\n/g, " ");
      const thText = text.replace(/'/g, "\\'").replace(/\n/g, " ");
      
      const replacement = `{locale === 'en' ? '${enText}' : locale === 'zh' ? '${zhText}' : '${thText}'}`;
      const func = getEnclosingFunction(textNode);
      textNode.replaceWithText(replacement);
      hasModifications = true;
      if (func) functionsToInject.add(func);
    }
  }

  // Find all StringLiterals inside JsxAttributes
  const jsxAttributes = sf.getDescendantsOfKind(SyntaxKind.JsxAttribute);
  for (const attr of jsxAttributes) {
    const init = attr.getInitializer();
    if (init && Node.isStringLiteral(init)) {
      const text = init.getLiteralValue();
      if (THAI_REGEX.test(text)) {
        const trans = await getTranslation(text);
        const enText = text.replace(text.trim(), trans.en).replace(/'/g, "\\'").replace(/\n/g, " ");
        const zhText = text.replace(text.trim(), trans.zh).replace(/'/g, "\\'").replace(/\n/g, " ");
        const thText = text.replace(/'/g, "\\'").replace(/\n/g, " ");
        
        const replacement = `{locale === 'en' ? '${enText}' : locale === 'zh' ? '${zhText}' : '${thText}'}`;
        const func = getEnclosingFunction(attr);
        init.replaceWithText(replacement);
        hasModifications = true;
        if (func) functionsToInject.add(func);
      }
    }
  }

  if (hasModifications) {
    // Check and add import
    const hasImport = sf.getImportDeclarations().some(imp => imp.getModuleSpecifierValue() === '@/lib/I18nContext');
    if (!hasImport) {
      sf.addImportDeclaration({
        namedImports: ['useI18n'],
        moduleSpecifier: '@/lib/I18nContext'
      });
    }

    // Inject const { locale } = useI18n(); into functions
    for (const func of functionsToInject) {
      let body = func.getBody();
      if (Node.isBlock(body)) {
        const hasUseI18n = body.getStatements().some(s => s.getText().includes('useI18n'));
        if (!hasUseI18n) {
          body.insertStatements(0, 'const { locale } = useI18n();');
        }
      }
    }

    // Make sure 'use client' is at the top if it existed anywhere
    const statements = sf.getStatements();
    const hasUseClient = statements.some(s => s.getText() === "'use client';" || s.getText() === "'use client'");
    if (hasUseClient) {
        // Remove all 'use client' directives
        statements.forEach(s => {
             if (s.getText() === "'use client';" || s.getText() === "'use client'") {
                 s.remove();
             }
        });
        // Insert it at the very top
        sf.insertStatements(0, "'use client';");
    }

    await sf.save();
    console.log(`Updated ${sf.getFilePath()}`);
  }
}

async function run() {
  console.log(`Found ${sourceFiles.length} files to scan.`);
  for (const sf of sourceFiles) {
      // Only process files with Thai characters
      if (THAI_REGEX.test(sf.getFullText())) {
          await processFile(sf);
      }
  }
  console.log('All done!');
}

run().catch(console.error);

import fs from 'fs';
import path from 'path';
import pkg from 'glob';
const { globSync } = pkg;

const files = globSync('components/pos/**/*.tsx').concat(globSync('app/dashboard/pos/**/*.tsx'));

for (const file of files) {
    let content = fs.readFileSync(file, 'utf-8');
    let original = content;

    content = content.replace(/useEffect\(\(\) => \{\n\s*const \{ locale \} = useI18n\(\);\n/g, 'useEffect(() => {\n');
    content = content.replace(/useEffect\(\(\) => \{ const \{ locale \} = useI18n\(\); /g, 'useEffect(() => { ');

    if (content !== original) {
        const componentRegex = /export default function ([A-Z][a-zA-Z0-9_]*)\([^)]*\)\s*\{/;
        const match = content.match(componentRegex);
        if (match) {
            const funcStart = match.index + match[0].length;
            const prefix = content.substring(0, funcStart);
            const suffix = content.substring(funcStart);
            if (!suffix.trim().startsWith('const { locale } = useI18n();') && !suffix.trim().startsWith('const { locale, copy } = useI18n()') && !suffix.trim().startsWith('const { locale } = useI18n()')) {
                 content = prefix + '\n    const { locale } = useI18n();' + suffix;
            }
        }
        fs.writeFileSync(file, content);
        console.log(`Fixed ${file}`);
    }
}
console.log('Done!');

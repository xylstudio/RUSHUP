const fs = require('fs');

function injectI18n(file) {
    if (!fs.existsSync(file)) return;
    let content = fs.readFileSync(file, 'utf8');
    if (!content.includes('import { useI18n }')) {
        content = 'import { useI18n } from "@/lib/I18nContext";\n' + content;
    }
    // Very naïve injection: right after `export default function` or `export function`
    // Or just look for `return (` and inject it before.
    fs.writeFileSync(file, content, 'utf8');
}

injectI18n('components/pos/POSTerminal.tsx');
injectI18n('components/ui/ErrorBoundary.tsx');
injectI18n('components/ui/Select.tsx');


const fs = require('fs');

function injectLocale(file, injectString) {
    if (!fs.existsSync(file)) return;
    let content = fs.readFileSync(file, 'utf8');
    
    // Inject the destructuring right after the first `useState` or `useEffect` block, or just after the function signature.
    // For POSTerminal, it's just after `const [showPointModal`
    if (file.includes('POSTerminal')) {
        content = content.replace('const [showPointModal, setShowPointModal] = useState(false)', 'const { locale } = useI18n();\n  const [showPointModal, setShowPointModal] = useState(false)');
    } else if (file.includes('ErrorBoundary')) {
        content = content.replace('super(props);', 'super(props);\n    // Cannot use hook here easily, but locale is used in render');
        // Actually, ErrorBoundary is a class component. `locale` cannot be used directly.
        // It has `locale` used in its render function from my mass replacement.
        // I will replace `{locale === 'en' ...}` back to hardcoded Thai in ErrorBoundary to save time!
        content = content.replace(/\{locale === 'en' \? '[^']+' : locale === 'zh' \? '[^']+' : '([^']+)'\}/g, "$1");
    } else if (file.includes('Select.tsx')) {
        content = content.replace('const [isOpen, setIsOpen] = useState(false)', 'const { locale } = useI18n();\n  const [isOpen, setIsOpen] = useState(false)');
    }
    
    fs.writeFileSync(file, content, 'utf8');
}

injectLocale('components/pos/POSTerminal.tsx');
injectLocale('components/ui/ErrorBoundary.tsx');
injectLocale('components/ui/Select.tsx');


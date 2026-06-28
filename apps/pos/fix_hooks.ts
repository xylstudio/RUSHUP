import { Project, SyntaxKind, FunctionDeclaration, ArrowFunction, Node } from 'ts-morph';
import * as fs from 'fs';

const project = new Project();
project.addSourceFilesAtPaths("components/pos/**/*.tsx");
project.addSourceFilesAtPaths("app/dashboard/pos/**/*.tsx");

const sourceFiles = project.getSourceFiles();

function isReactComponent(node: Node): boolean {
    if (Node.isFunctionDeclaration(node)) {
        const name = node.getName();
        return name ? /^[A-Z]/.test(name) : false;
    }
    if (Node.isArrowFunction(node) || Node.isFunctionExpression(node)) {
        const parent = node.getParent();
        if (Node.isVariableDeclaration(parent)) {
            const name = parent.getName();
            return name ? /^[A-Z]/.test(name) : false;
        }
    }
    return false;
}

for (const sourceFile of sourceFiles) {
    let modified = false;
    const varDecls = sourceFile.getDescendantsOfKind(SyntaxKind.VariableDeclaration);
    
    // Find all 'const { locale } = useI18n()' declarations
    for (const varDecl of varDecls) {
        const init = varDecl.getInitializer();
        if (init && Node.isCallExpression(init)) {
            const exp = init.getExpression();
            if (exp.getText() === 'useI18n') {
                let isTopLevelOfComponent = false;

                // Find the immediate enclosing function
                const enclosingFunction = varDecl.getFirstAncestorByKind(SyntaxKind.FunctionDeclaration) ||
                                          varDecl.getFirstAncestorByKind(SyntaxKind.ArrowFunction) ||
                                          varDecl.getFirstAncestorByKind(SyntaxKind.FunctionExpression);

                if (enclosingFunction) {
                    if (isReactComponent(enclosingFunction)) {
                        isTopLevelOfComponent = true;
                    }
                }

                // If it's NOT at the top level of a React Component, remove it!
                if (!isTopLevelOfComponent) {
                    const stmt = varDecl.getFirstAncestorByKind(SyntaxKind.VariableStatement);
                    if (stmt) {
                        console.log(`Removing invalid useI18n from ${sourceFile.getBaseName()}`);
                        stmt.remove();
                        modified = true;
                    }
                }
            }
        }
    }
    
    // Now ensure that every React component actually has const { locale } = useI18n(); if it uses 'locale'
    const funcs = [...sourceFile.getDescendantsOfKind(SyntaxKind.FunctionDeclaration), ...sourceFile.getDescendantsOfKind(SyntaxKind.ArrowFunction)];
    for (const f of funcs) {
        if (isReactComponent(f)) {
            const body = f.getBody();
            if (body && Node.isBlock(body)) {
                const text = body.getText();
                // Does it use locale?
                if (text.includes('locale') && !text.includes('const { locale } = useI18n')) {
                    body.insertStatements(0, 'const { locale } = useI18n();');
                    modified = true;
                    console.log(`Adding missing useI18n to component in ${sourceFile.getBaseName()}`);
                }
            }
        }
    }

    if (modified) {
        // Ensure import exists
        if (!sourceFile.getText().includes('useI18n')) {
             sourceFile.insertStatements(0, 'import { useI18n } from "@/lib/I18nContext";');
        }
        sourceFile.saveSync();
    }
}
console.log('Done!');

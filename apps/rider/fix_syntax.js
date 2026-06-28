const { execSync } = require('child_process');
const fs = require('fs');

try {
    execSync('npx tsc --noEmit', { stdio: 'pipe' });
    console.log("No syntax errors found.");
} catch (error) {
    const output = error.stdout.toString();
    const lines = output.split('\n');
    
    const filesToFix = new Set();
    
    for (const line of lines) {
        if (line.includes('error TS')) {
            const match = line.match(/^(.+?)\((\d+),\d+\): error TS/);
            if (match) {
                filesToFix.add(match[1]);
            }
        }
    }
    
    console.log(Array.from(filesToFix).join('\n'));
}

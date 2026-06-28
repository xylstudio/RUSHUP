const fs = require('fs');
const logPath = '/Users/natthanchaimongkol/.gemini/antigravity-ide/brain/9b3ced14-0f5f-4464-907f-9f116888bd15/.system_generated/logs/transcript.jsonl';
const lines = fs.readFileSync(logPath, 'utf8').split('\n');
let c = 0;
for (let i = lines.length - 1; i >= 0; i--) {
  if (!lines[i]) continue;
  const step = JSON.parse(lines[i]);
  if (step.tool_calls) {
     for (const call of step.tool_calls) {
        if (call.function?.name === 'default_api:view_file' && call.function.arguments) {
            const args = JSON.parse(call.function.arguments);
            if (args.AbsolutePath && args.AbsolutePath.includes('POSMenuManager.tsx')) {
               for (let j = i + 1; j < lines.length; j++) {
                  if (!lines[j]) continue;
                  const respStep = JSON.parse(lines[j]);
                  if (respStep.tool_responses) {
                      for (const resp of respStep.tool_responses) {
                          if (resp.name === 'default_api:view_file' && resp.content) {
                              try {
                                  const cObj = JSON.parse(resp.content);
                                  if (cObj.output && cObj.output.includes('POSMenuManager.tsx')) {
                                       const outputLines = cObj.output.split('\n');
                                       const restoredLines = [];
                                       for (const line of outputLines) {
                                           const match = line.match(/^\d+:\s?(.*)$/);
                                           if (match) {
                                               restoredLines.push(match[1]);
                                           }
                                       }
                                       console.log('Found backup with lines:', restoredLines.length);
                                       if (restoredLines.length === 683) {
                                            fs.writeFileSync('/Users/natthanchaimongkol/Downloads/XYLPROJECT-main/components/pos/POSMenuManager.tsx', restoredLines.join('\n'));
                                            console.log('Restored exactly 683 lines!');
                                            process.exit(0);
                                       }
                                  }
                              } catch(e) {}
                          }
                      }
                  }
               }
            }
        }
     }
  }
}

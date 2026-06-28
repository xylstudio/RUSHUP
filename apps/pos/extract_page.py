import json

with open('/Users/chenchirawongpothisan/.gemini/antigravity/brain/01d5701c-c75c-4174-919d-6e3113b7e9bf/.system_generated/logs/transcript.jsonl', 'r') as f:
    for line in f:
        data = json.loads(line)
        if 'content' in data and 'File Path: `file:///Users/chenchirawongpothisan/Desktop/xylproject-pr-copilot-swe-agent-3/xylem-landscape/app/dashboard/customer/orders/%5BorderId%5D/page.tsx`' in data['content']:
            print(data['content'][:5000])
            break

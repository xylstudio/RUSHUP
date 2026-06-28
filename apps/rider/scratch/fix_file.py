import sys

file_path = r'c:\Users\localadmin\Desktop\xylproject-pr-copilot-swe-agent-3\xylem-landscape\components\pos\POSInventoryManager.tsx'

with open(file_path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Remove lines 415 to 423 (0-indexed: 414 to 422)
# Line 414 in view_file is index 413
# We want to keep up to line 414 (index 413)
# And skip lines 415 to 423 (index 414 to 422)

new_lines = lines[:414] + lines[423:]

with open(file_path, 'w', encoding='utf-8') as f:
    f.writelines(new_lines)

print(f"Removed {len(lines) - len(new_lines)} lines.")


import sys

def check_braces(filename):
    with open(filename, 'r', encoding='utf-8') as f:
        content = f.read()
    
    stack = []
    lines = content.split('\n')
    for i, line in enumerate(lines):
        for char in line:
            if char in '{[(':
                stack.append((char, i+1))
            elif char in '}])':
                if not stack:
                    print(f"Extra closing {char} at line {i+1}")
                    continue
                last, last_line = stack.pop()
                if (char == '}' and last != '{') or (char == ']' and last != '[') or (char == ')' and last != '('):
                    print(f"Mismatched {char} at line {i+1} (matches {last} at line {last_line})")
    
    for char, line in stack:
        print(f"Unclosed {char} at line {line}")

if __name__ == "__main__":
    check_braces(sys.argv[1])

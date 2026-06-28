import json
import time
from deep_translator import GoogleTranslator

with open('all_unique_thai.json', 'r', encoding='utf-8') as f:
    strings = json.load(f)

result = {}
try:
    with open('translation_cache.json', 'r', encoding='utf-8') as f:
        result = json.load(f)
except:
    pass

en_translator = GoogleTranslator(source='th', target='en')
zh_translator = GoogleTranslator(source='th', target='zh-CN')

count = 0
for text in strings:
    if text in result and result[text]['en'] != text:
        # already translated
        continue
    
    try:
        en_text = en_translator.translate(text)
        time.sleep(0.5)
        zh_text = zh_translator.translate(text)
        time.sleep(0.5)
        
        result[text] = {
            'en': en_text,
            'zh': zh_text
        }
        count += 1
        print(f"Translated {count}/{len(strings)}: {text[:20]}...")
        
        # save every 10
        if count % 10 == 0:
            with open('translation_cache.json', 'w', encoding='utf-8') as f:
                json.dump(result, f, ensure_ascii=False, indent=2)
                
    except Exception as e:
        print(f"Error translating {text}: {e}")
        time.sleep(5)

with open('translation_cache.json', 'w', encoding='utf-8') as f:
    json.dump(result, f, ensure_ascii=False, indent=2)
print("Finished translation!")

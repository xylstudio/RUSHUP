from googletrans import Translator
translator = Translator()
res = translator.translate('ทดสอบ', dest='en')
print(res.text)

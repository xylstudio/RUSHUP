const fs = require('fs')
let code = fs.readFileSync('components/pos/POSTerminal.tsx', 'utf8')

const target = `                        {['grab', 'lineman', 'shopee', 'foodpanda', 'robinhood'].map(platform => (`

const replacement = `                        {(shopSettings?.opening_hours?.active_delivery_platforms || ['grab', 'lineman', 'shopee', 'foodpanda', 'robinhood']).map((platform: string) => (`

if (code.includes(target)) {
  code = code.replace(target, replacement)
  fs.writeFileSync('components/pos/POSTerminal.tsx', code)
  console.log("Patched platforms in POSTerminal!")
} else {
  console.log("Target not found")
}


const fs = require('fs')
let code = fs.readFileSync('components/pos/POSTerminal.tsx', 'utf8')

const targetInsert = `            delivery_platform: orderType === 'delivery' ? deliveryPlatform : null,
            delivery_gp_amount: deliveryGpAmount,
          })`
          
const replacementInsert = `            delivery_platform: orderType === 'delivery' ? deliveryPlatform : null,
            delivery_gp_amount: deliveryGpAmount,
            reference_name: orderType === 'delivery' && platformOrderId ? platformOrderId : null,
          })`

if (code.includes(targetInsert)) {
  code = code.replace(targetInsert, replacementInsert)
  fs.writeFileSync('components/pos/POSTerminal.tsx', code)
  console.log("Patched insert!")
} else {
  console.log("Not found targetInsert")
}

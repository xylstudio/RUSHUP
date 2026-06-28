const fs = require('fs')
let code = fs.readFileSync('components/pos/POSTerminal.tsx', 'utf8')

const target1 = `            delivery_platform: orderType === 'delivery' ? deliveryPlatform : null,
            delivery_gp_amount: 0,`
            
const replacement1 = `            delivery_platform: orderType === 'delivery' ? deliveryPlatform : null,
            delivery_gp_amount: 0,
            reference_name: orderType === 'delivery' && platformOrderId ? platformOrderId : null,`

if (code.includes(target1)) {
  code = code.replace(target1, replacement1)
  fs.writeFileSync('components/pos/POSTerminal.tsx', code)
  console.log("Patched insert 1")
}

const target2 = `            delivery_platform: orderType === 'delivery' ? deliveryPlatform : null,
          })`

const replacement2 = `            delivery_platform: orderType === 'delivery' ? deliveryPlatform : null,
            reference_name: orderType === 'delivery' && platformOrderId ? platformOrderId : null,
          })`

if (code.includes(target2)) {
  code = code.replace(target2, replacement2)
  fs.writeFileSync('components/pos/POSTerminal.tsx', code)
  console.log("Patched insert 2")
}

const target3 = `            delivery_platform: orderType === 'delivery' ? deliveryPlatform : null,
          })
          .eq('id', editingOrderId)`
          
const replacement3 = `            delivery_platform: orderType === 'delivery' ? deliveryPlatform : null,
            reference_name: orderType === 'delivery' && platformOrderId ? platformOrderId : null,
          })
          .eq('id', editingOrderId)`

if (code.includes(target3)) {
  code = code.replace(target3, replacement3)
  fs.writeFileSync('components/pos/POSTerminal.tsx', code)
  console.log("Patched update")
}


const fs = require('fs')
let code = fs.readFileSync('components/pos/POSTerminal.tsx', 'utf8')

const targetUpdate = `            payment_method: method,
            paid_at: new Date().toISOString(),
            delivery_platform: orderType === 'delivery' ? deliveryPlatform : null,
            delivery_gp_amount: deliveryGpAmount,
          })
          .eq('id', editingOrderId)`
          
const replacementUpdate = `            payment_method: method,
            paid_at: new Date().toISOString(),
            delivery_platform: orderType === 'delivery' ? deliveryPlatform : null,
            delivery_gp_amount: deliveryGpAmount,
            reference_name: orderType === 'delivery' && platformOrderId ? platformOrderId : null,
          })
          .eq('id', editingOrderId)`

if (code.includes(targetUpdate)) {
  code = code.replace(targetUpdate, replacementUpdate)
  fs.writeFileSync('components/pos/POSTerminal.tsx', code)
  console.log("Patched update!")
}

const targetInsert = `            order_type: orderType,
            table_id: selectedTable?.id,
            table_number: selectedTable?.table_number,
            order_source: 'pos',
            delivery_platform: orderType === 'delivery' ? deliveryPlatform : null,
            delivery_gp_amount: deliveryGpAmount,
          })`
          
const replacementInsert = `            order_type: orderType,
            table_id: selectedTable?.id,
            table_number: selectedTable?.table_number,
            order_source: 'pos',
            delivery_platform: orderType === 'delivery' ? deliveryPlatform : null,
            delivery_gp_amount: deliveryGpAmount,
            reference_name: orderType === 'delivery' && platformOrderId ? platformOrderId : null,
          })`

if (code.includes(targetInsert)) {
  code = code.replace(targetInsert, replacementInsert)
  fs.writeFileSync('components/pos/POSTerminal.tsx', code)
  console.log("Patched insert!")
}

const fs = require('fs')
let code = fs.readFileSync('components/pos/POSReceipt.tsx', 'utf8')

const targetProps = `  timestamp: string
  cashierName: string
}`

const replacementProps = `  timestamp: string
  cashierName: string
  deliveryPlatform?: string
  referenceName?: string
}`

if (code.includes(targetProps)) {
  code = code.replace(targetProps, replacementProps)
}

const targetDestruct = `  timestamp,
  cashierName
}, ref) => {`

const replacementDestruct = `  timestamp,
  cashierName,
  deliveryPlatform,
  referenceName
}, ref) => {`

if (code.includes(targetDestruct)) {
  code = code.replace(targetDestruct, replacementDestruct)
}

const targetType = `        <div className="flex justify-between"><span>Type:</span> <span className="uppercase">{orderType.replace('_', ' ')}</span></div>`

const replacementType = `        <div className="flex justify-between"><span>Type:</span> <span className="uppercase">{orderType.replace('_', ' ')}</span></div>
        {orderType === 'delivery' && deliveryPlatform && <div className="flex justify-between"><span>Platform:</span> <span className="uppercase">{deliveryPlatform}</span></div>}
        {referenceName && <div className="flex justify-between"><span>Bill No:</span> <span className="uppercase">#{referenceName}</span></div>}`

if (code.includes(targetType)) {
  code = code.replace(targetType, replacementType)
}

fs.writeFileSync('components/pos/POSReceipt.tsx', code)
console.log("Patched POSReceipt.tsx!")

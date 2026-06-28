const fs = require('fs')
let code = fs.readFileSync('components/pos/POSHistory.tsx', 'utf8')

const target = `                    <span className="bg-gray-100 px-1.5 py-0.5 text-[8px] font-black uppercase tracking-tighter text-gray-500">
                      {order.payment_method || 'Paid'}
                    </span>`

const replacement = `                    <span className="bg-gray-100 px-1.5 py-0.5 text-[8px] font-black uppercase tracking-tighter text-gray-500">
                      {order.payment_method || 'Paid'}
                    </span>
                    {order.order_type === 'delivery' && order.delivery_platform && (
                      <span className="bg-orange-100 px-1.5 py-0.5 text-[8px] font-black uppercase tracking-tighter text-orange-700">
                        {order.delivery_platform}
                      </span>
                    )}
                    {order.reference_name && (
                      <span className="bg-blue-100 px-1.5 py-0.5 text-[8px] font-black uppercase tracking-tighter text-blue-700">
                        #{order.reference_name}
                      </span>
                    )}`

if (code.includes(target)) {
  code = code.replace(target, replacement)
  fs.writeFileSync('components/pos/POSHistory.tsx', code)
  console.log("Patched POSHistory!")
} else {
  console.log("Target not found in POSHistory")
}

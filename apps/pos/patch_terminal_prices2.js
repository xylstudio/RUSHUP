const fs = require('fs')
let code = fs.readFileSync('components/pos/POSTerminal.tsx', 'utf8')

const targetCartDisplay = `                          <p className="mt-1 text-xs font-black text-orange-500">
                            ฿{(item.sale_price).toLocaleString()}
                          </p>`

const replacementCartDisplay = `                          <p className="mt-1 text-xs font-black text-orange-500">
                            ฿{(orderType === 'delivery' && deliveryPlatform && item.platform_prices && item.platform_prices[deliveryPlatform] ? item.platform_prices[deliveryPlatform] : item.sale_price).toLocaleString()}
                          </p>`

if (code.includes(targetCartDisplay)) {
  code = code.replace(targetCartDisplay, replacementCartDisplay)
  fs.writeFileSync('components/pos/POSTerminal.tsx', code)
  console.log("Patched cart item price display!")
} else {
  console.log("cart item price display not found")
}

const targetGridDisplay = `                        <p className="text-[#FF5F1F] font-black text-[12px] truncate">{locale === 'en' ? '฿' : locale === 'zh' ? '฿' : '฿'}{item.sale_price.toLocaleString()}</p>`

const replacementGridDisplay = `                        <p className="text-[#FF5F1F] font-black text-[12px] truncate">{locale === 'en' ? '฿' : locale === 'zh' ? '฿' : '฿'}{(orderType === 'delivery' && deliveryPlatform && item.platform_prices && item.platform_prices[deliveryPlatform] ? item.platform_prices[deliveryPlatform] : item.sale_price).toLocaleString()}</p>`

// Replacing all occurrences in grid/list views
code = code.split(targetGridDisplay).join(replacementGridDisplay)
fs.writeFileSync('components/pos/POSTerminal.tsx', code)
console.log("Patched grid/list item price display!")

const targetCheckout = `        const orderData: any = {
            order_number: newOrderNumber,
            staff_id: profile.id,
            customer_id: selectedCustomer?.id || null,
            table_id: selectedTable?.id || null,
            table_number: selectedTable?.table_number || null,
            total_amount: cartSubTotal - discountTotalValue + vatAmount + serviceChargeAmount,
            net_total: cartSubTotal,
            tax_amount: vatAmount,
            service_charge_amount: serviceChargeAmount,
            discount_amount: discountTotalValue,
            discount_type: discountType,
            promo_code: discountName,
            payment_method: paymentMethod,
            status: paymentMethod === 'pending' ? 'payment_pending' : 'paid',
            paid_at: paymentMethod !== 'pending' ? new Date().toISOString() : null,
            shift_id: activeShift.id,
            order_type: orderType,
            delivery_platform: orderType === 'delivery' ? deliveryPlatform : null,
            customer_name: selectedCustomer?.full_name || null,
            points_earned: pointsEarned,
            branch_id: shopSettings?.branch_id || null,
        }`

const replacementCheckout = `        const orderData: any = {
            order_number: newOrderNumber,
            staff_id: profile.id,
            customer_id: selectedCustomer?.id || null,
            table_id: selectedTable?.id || null,
            table_number: selectedTable?.table_number || null,
            total_amount: cartSubTotal - discountTotalValue + vatAmount + serviceChargeAmount,
            net_total: cartSubTotal,
            tax_amount: vatAmount,
            service_charge_amount: serviceChargeAmount,
            discount_amount: discountTotalValue,
            discount_type: discountType,
            promo_code: discountName,
            payment_method: paymentMethod,
            status: paymentMethod === 'pending' ? 'payment_pending' : 'paid',
            paid_at: paymentMethod !== 'pending' ? new Date().toISOString() : null,
            shift_id: activeShift.id,
            order_type: orderType,
            delivery_platform: orderType === 'delivery' ? deliveryPlatform : null,
            reference_name: orderType === 'delivery' && platformOrderId ? platformOrderId : null,
            customer_name: selectedCustomer?.full_name || null,
            points_earned: pointsEarned,
            branch_id: shopSettings?.branch_id || null,
        }`

if (code.includes(targetCheckout)) {
  code = code.replace(targetCheckout, replacementCheckout)
  fs.writeFileSync('components/pos/POSTerminal.tsx', code)
  console.log("Patched Checkout orderData!")
} else {
  console.log("Checkout orderData not found")
}

const targetOrderItems = `            unit_price: item.sale_price,
            cost_price: item.cost_price || 0,`

const replacementOrderItems = `            unit_price: (orderType === 'delivery' && deliveryPlatform && item.platform_prices && item.platform_prices[deliveryPlatform]) ? item.platform_prices[deliveryPlatform] : item.sale_price,
            cost_price: item.cost_price || 0,`

code = code.split(targetOrderItems).join(replacementOrderItems)
fs.writeFileSync('components/pos/POSTerminal.tsx', code)
console.log("Patched order items price!")

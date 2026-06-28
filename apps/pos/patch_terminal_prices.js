const fs = require('fs')
let code = fs.readFileSync('components/pos/POSTerminal.tsx', 'utf8')

const targetType = `interface MenuItem {
  id: string
  name: string
  sale_price: number
  cost_price?: number
  image_url: string | null
  category_id: string
  category?: { name: string }
  modifiers?: any[]
}`

const replacementType = `interface MenuItem {
  id: string
  name: string
  sale_price: number
  cost_price?: number
  image_url: string | null
  category_id: string
  category?: { name: string }
  modifiers?: any[]
  platform_prices?: any
}`

if (code.includes(targetType)) {
  code = code.replace(targetType, replacementType)
  fs.writeFileSync('components/pos/POSTerminal.tsx', code)
  console.log("Patched MenuItem interface!")
} else {
  console.log("MenuItem interface not found")
}

const targetCartSubTotal = `  const cartSubTotal = useMemo(
    () =>
      cart.reduce((acc, item) => {
        const modsPrice =
          item.selected_modifiers?.reduce(
            (ma: number, m: any) => ma + (m.price_adjustment || 0),
            0
          ) || 0
        return acc + (item.sale_price + modsPrice) * item.quantity
      }, 0),
    [cart]
  )`

const replacementCartSubTotal = `  const cartSubTotal = useMemo(
    () =>
      cart.reduce((acc, item) => {
        const modsPrice =
          item.selected_modifiers?.reduce(
            (ma: number, m: any) => ma + (m.price_adjustment || 0),
            0
          ) || 0
          
        let basePrice = item.sale_price;
        if (orderType === 'delivery' && deliveryPlatform && item.platform_prices && item.platform_prices[deliveryPlatform]) {
            basePrice = item.platform_prices[deliveryPlatform];
        }
        
        return acc + (basePrice + modsPrice) * item.quantity
      }, 0),
    [cart, orderType, deliveryPlatform]
  )`

if (code.includes(targetCartSubTotal)) {
  code = code.replace(targetCartSubTotal, replacementCartSubTotal)
  fs.writeFileSync('components/pos/POSTerminal.tsx', code)
  console.log("Patched cartSubTotal!")
} else {
  console.log("cartSubTotal not found")
}

const targetFetch = `      let itemQuery = supabase
        .from('pos_menu_items')
        .select(\`*, category:pos_menu_categories(name), modifiers:pos_item_modifier_links(group_id)\`)`

const replacementFetch = `      let itemQuery = supabase
        .from('pos_menu_items')
        .select(\`*, platform_prices, category:pos_menu_categories(name), modifiers:pos_item_modifier_links(group_id)\`)`

if (code.includes(targetFetch)) {
  code = code.replace(targetFetch, replacementFetch)
  fs.writeFileSync('components/pos/POSTerminal.tsx', code)
  console.log("Patched fetchItems!")
} else {
  console.log("fetchItems target not found")
}


const fs = require('fs')
let code = fs.readFileSync('components/pos/POSTerminal.tsx', 'utf8')

const target = `              {orderType === 'delivery' && (
                  <div className="flex w-full mt-4 gap-2 pb-2">
                    <select
                        value={deliveryPlatform || 'grab'}
                        onChange={(e) => setDeliveryPlatform(e.target.value)}
                        className="w-2/5 bg-orange-50/50 border border-orange-200/50 rounded-xl py-3 px-4 text-[11px] font-black uppercase tracking-widest outline-none focus:border-orange-500 text-orange-600 appearance-none"
                    >
                        {(shopSettings?.opening_hours?.active_delivery_platforms || ['grab', 'lineman', 'shopee', 'foodpanda', 'robinhood']).map((platform: string) => (
                            <option key={platform} value={platform}>
                                {platform === 'grab' ? 'Grab' : platform === 'lineman' ? 'LINE MAN' : platform === 'shopee' ? 'ShopeeFood' : platform === 'foodpanda' ? 'Foodpanda' : 'Robinhood'}
                            </option>
                        ))}
                    </select>
                    <input
                        type="text"
                        placeholder="รหัสบิล (Order ID)"
                        value={platformOrderId}
                        onChange={(e) => setPlatformOrderId(e.target.value)}
                        className="w-3/5 bg-gray-50 border border-gray-200 rounded-xl py-3 px-4 text-[11px] font-black uppercase tracking-widest outline-none focus:border-orange-500 text-black"
                    />
                  </div>
              )}`

const replacement = `              {orderType === 'delivery' && (
                  <div className="flex w-full mt-2 gap-1.5 pb-1">
                    <select
                        value={deliveryPlatform || 'grab'}
                        onChange={(e) => setDeliveryPlatform(e.target.value)}
                        className="w-[35%] bg-orange-50/50 border border-orange-200/50 rounded-lg py-1.5 px-2.5 text-[10px] font-black uppercase tracking-widest outline-none focus:border-orange-500 text-orange-600 appearance-none"
                    >
                        {(shopSettings?.opening_hours?.active_delivery_platforms || ['grab', 'lineman', 'shopee', 'foodpanda', 'robinhood']).map((platform: string) => (
                            <option key={platform} value={platform}>
                                {platform === 'grab' ? 'Grab' : platform === 'lineman' ? 'LINE' : platform === 'shopee' ? 'Shopee' : platform === 'foodpanda' ? 'Panda' : 'Robin'}
                            </option>
                        ))}
                    </select>
                    <input
                        type="text"
                        placeholder="รหัสบิล (Order ID)"
                        value={platformOrderId}
                        onChange={(e) => setPlatformOrderId(e.target.value)}
                        className="w-[65%] bg-gray-50 border border-gray-200 rounded-lg py-1.5 px-3 text-[10px] font-black uppercase tracking-widest outline-none focus:border-orange-500 text-black"
                    />
                  </div>
              )}`

if (code.includes(target)) {
  code = code.replace(target, replacement)
  fs.writeFileSync('components/pos/POSTerminal.tsx', code)
  console.log("Patched layout in POSTerminal to be slimmer!")
} else {
  console.log("Target not found")
}


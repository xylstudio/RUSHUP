const fs = require('fs')
let code = fs.readFileSync('components/pos/POSTerminal.tsx', 'utf8')

const target = `              {orderType === 'delivery' && (
                  <div className="flex flex-col w-full mt-2 gap-2">
                    <div className="flex w-full gap-2 overflow-x-auto no-scrollbar pb-1">
                        {(shopSettings?.opening_hours?.active_delivery_platforms || ['grab', 'lineman', 'shopee', 'foodpanda', 'robinhood']).map((platform: string) => (
                            <button
                                key={platform}
                                onClick={() => setDeliveryPlatform(platform)}
                                className={\`flex-shrink-0 px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all \${deliveryPlatform === platform ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}\`}
                            >
                                {platform === 'grab' ? 'Grab' : platform === 'lineman' ? 'LINE MAN' : platform === 'shopee' ? 'ShopeeFood' : platform === 'foodpanda' ? 'Foodpanda' : 'Robinhood'}
                            </button>
                        ))}
                    </div>
                    <div className="flex w-full items-center gap-2 px-2 pb-2">
                        <input
                            type="text"
                            placeholder="รหัสบิล (Platform Order ID / Bill Number)"
                            value={platformOrderId}
                            onChange={(e) => setPlatformOrderId(e.target.value)}
                            className="w-full bg-gray-50 border border-gray-200 py-3 px-4 text-sm outline-none focus:border-orange-500 font-bold text-black"
                        />
                    </div>
                  </div>
              )}`

const replacement = `              {orderType === 'delivery' && (
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

if (code.includes(target)) {
  code = code.replace(target, replacement)
  fs.writeFileSync('components/pos/POSTerminal.tsx', code)
  console.log("Patched layout in POSTerminal!")
} else {
  console.log("Target not found")
}


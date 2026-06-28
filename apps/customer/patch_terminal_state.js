const fs = require('fs')
let code = fs.readFileSync('components/pos/POSTerminal.tsx', 'utf8')

const targetState = `  const [isCartBumping, setIsCartBumping] = useState(false)`
const replacementState = `  const [isCartBumping, setIsCartBumping] = useState(false)
  const [platformOrderId, setPlatformOrderId] = useState('')`

if (code.includes(targetState)) {
  code = code.replace(targetState, replacementState)
  fs.writeFileSync('components/pos/POSTerminal.tsx', code)
  console.log("Patched State!")
} else {
  console.log("State Target not found")
}

const targetUI = `              {orderType === 'delivery' && (
                  <div className="flex w-full mt-2 gap-2 overflow-x-auto no-scrollbar pb-1">
                      {['grab', 'lineman', 'shopee', 'foodpanda', 'robinhood'].map(platform => (
                          <button
                              key={platform}
                              onClick={() => setDeliveryPlatform(platform)}
                              className={\`flex-shrink-0 px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all \${deliveryPlatform === platform ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}\`}
                          >
                              {platform === 'grab' ? 'Grab' : platform === 'lineman' ? 'LINE MAN' : platform === 'shopee' ? 'ShopeeFood' : platform === 'foodpanda' ? 'Foodpanda' : 'Robinhood'}
                          </button>
                      ))}
                  </div>
              )}`

const replacementUI = `              {orderType === 'delivery' && (
                  <div className="flex flex-col w-full mt-2 gap-2">
                    <div className="flex w-full gap-2 overflow-x-auto no-scrollbar pb-1">
                        {['grab', 'lineman', 'shopee', 'foodpanda', 'robinhood'].map(platform => (
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

if (code.includes(targetUI)) {
  code = code.replace(targetUI, replacementUI)
  fs.writeFileSync('components/pos/POSTerminal.tsx', code)
  console.log("Patched UI!")
} else {
  console.log("UI Target not found")
}


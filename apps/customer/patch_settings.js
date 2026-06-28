const fs = require('fs')
let code = fs.readFileSync('components/pos/POSShopSettings.tsx', 'utf8')

// 1. Initial State
const targetState = `                loyalty_earn_rate: data.opening_hours?.loyalty_earn_rate || 100,
                delivery_gp: data.opening_hours?.delivery_gp || { grab: 32.1, lineman: 32.1, shopee: 32.1, foodpanda: 32.1, robinhood: 0 },`

const replacementState = `                loyalty_earn_rate: data.opening_hours?.loyalty_earn_rate || 100,
                delivery_gp: data.opening_hours?.delivery_gp || { grab: 32.1, lineman: 32.1, shopee: 32.1, foodpanda: 32.1, robinhood: 0 },
                active_delivery_platforms: data.opening_hours?.active_delivery_platforms || ['grab', 'shopee', 'lineman', 'foodpanda', 'robinhood'],`

if (code.includes(targetState)) {
    // Replace all instances of targetState (it appears twice: fetchSettings and handleSave)
    code = code.split(targetState).join(replacementState)
}

// 2. handleSave payload
const targetSavePayload = `        loyalty_earn_rate: settings.loyalty_earn_rate,
        delivery_gp: settings.delivery_gp,`

const replacementSavePayload = `        loyalty_earn_rate: settings.loyalty_earn_rate,
        delivery_gp: settings.delivery_gp,
        active_delivery_platforms: settings.active_delivery_platforms,`

if (code.includes(targetSavePayload)) {
    code = code.replace(targetSavePayload, replacementSavePayload)
}

// 3. handleSave delete payload
const targetDelete = `    delete payload.address;
    delete payload.delivery_gp;`

const replacementDelete = `    delete payload.address;
    delete payload.delivery_gp;
    delete payload.active_delivery_platforms;`

if (code.includes(targetDelete)) {
    code = code.replace(targetDelete, replacementDelete)
}

// 4. UI addition
const targetUI = `                                        {['grab', 'lineman', 'shopee', 'foodpanda', 'robinhood'].map(platform => (
                                            <div key={platform} className="space-y-3">
                                                <label className="text-[11px] font-black uppercase tracking-widest text-gray-400">
                                                    {platform === 'grab' ? 'Grab' : platform === 'lineman' ? 'LINE MAN' : platform === 'shopee' ? 'ShopeeFood' : platform === 'foodpanda' ? 'Foodpanda' : 'Robinhood'}
                                                </label>
                                                <div className="relative">
                                                    <input 
                                                        type="number" 
                                                        step="0.1"
                                                        value={settings.delivery_gp?.[platform] ?? 32.1}
                                                        onChange={e => setSettings({
                                                            ...settings, 
                                                            delivery_gp: { ...settings.delivery_gp, [platform]: parseFloat(e.target.value) || 0 }
                                                        })}
                                                        className="w-full bg-gray-50 border border-gray-200 rounded-xl py-3 px-4 text-[14px] font-bold outline-none focus:ring-2 focus:ring-black pr-10" 
                                                    />
                                                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 font-black">%</span>
                                                </div>
                                            </div>
                                        ))}`

const replacementUI = `                                        {['grab', 'lineman', 'shopee', 'foodpanda', 'robinhood'].map(platform => {
                                            const isActive = settings.active_delivery_platforms?.includes(platform) ?? true;
                                            return (
                                            <div key={platform} className={\`space-y-3 \${isActive ? '' : 'opacity-50'}\`}>
                                                <div className="flex items-center justify-between">
                                                    <label className="text-[11px] font-black uppercase tracking-widest text-gray-400">
                                                        {platform === 'grab' ? 'Grab' : platform === 'lineman' ? 'LINE MAN' : platform === 'shopee' ? 'ShopeeFood' : platform === 'foodpanda' ? 'Foodpanda' : 'Robinhood'}
                                                    </label>
                                                    <button
                                                        onClick={() => {
                                                            let active = settings.active_delivery_platforms || ['grab', 'lineman', 'shopee', 'foodpanda', 'robinhood'];
                                                            if (active.includes(platform)) {
                                                                active = active.filter(p => p !== platform);
                                                            } else {
                                                                active = [...active, platform];
                                                            }
                                                            setSettings({...settings, active_delivery_platforms: active});
                                                        }}
                                                        className={\`w-10 h-5 rounded-full relative transition-colors \${isActive ? 'bg-black' : 'bg-gray-300'}\`}
                                                    >
                                                        <div className={\`w-4 h-4 rounded-full bg-white absolute top-0.5 transition-all \${isActive ? 'left-5' : 'left-0.5'}\`} />
                                                    </button>
                                                </div>
                                                <div className="relative">
                                                    <input 
                                                        type="number" 
                                                        step="0.1"
                                                        disabled={!isActive}
                                                        value={settings.delivery_gp?.[platform] ?? 32.1}
                                                        onChange={e => setSettings({
                                                            ...settings, 
                                                            delivery_gp: { ...settings.delivery_gp, [platform]: parseFloat(e.target.value) || 0 }
                                                        })}
                                                        className="w-full bg-gray-50 border border-gray-200 rounded-xl py-3 px-4 text-[14px] font-bold outline-none focus:ring-2 focus:ring-black pr-10" 
                                                    />
                                                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 font-black">%</span>
                                                </div>
                                            </div>
                                        )})}`

if (code.includes(targetUI)) {
    code = code.replace(targetUI, replacementUI)
}

fs.writeFileSync('components/pos/POSShopSettings.tsx', code)
console.log("Patched POSShopSettings!")

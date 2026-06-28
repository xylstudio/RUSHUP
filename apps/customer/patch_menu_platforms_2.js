const fs = require('fs')
let code = fs.readFileSync('components/pos/POSMenuManager.tsx', 'utf8')

const target = `                          <div className="space-y-3 font-bold border-none font-bold font-bold font-bold font-bold">
                              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-[#1A1A18]/50 font-bold font-bold font-bold font-bold font-bold">GRAB PRICE</label>
                              <input 
                                  type="number"
                                  value={editingItem.platform_prices?.grab || ''}
                                  onChange={e => setEditingItem({...editingItem, platform_prices: {...(editingItem.platform_prices || {}), grab: Number(e.target.value) || null}})}
                                  className="w-full bg-[#00B14F]/10 border border-[#00B14F]/30 py-5 px-6 text-sm outline-none font-bold text-[#00B14F] placeholder:text-[#00B14F]/50 focus:border-[#00B14F]"
                                  placeholder="Auto"
                              />
                          </div>
                          <div className="space-y-3 font-bold border-none font-bold font-bold font-bold font-bold">
                              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-[#1A1A18]/50 font-bold font-bold font-bold">LINEMAN PRICE</label>
                              <input 
                                  type="number"
                                  value={editingItem.platform_prices?.lineman || ''}
                                  onChange={e => setEditingItem({...editingItem, platform_prices: {...(editingItem.platform_prices || {}), lineman: Number(e.target.value) || null}})}
                                  className="w-full bg-[#00B900]/10 border border-[#00B900]/30 py-5 px-6 text-sm outline-none font-bold text-[#00B900] placeholder:text-[#00B900]/50 focus:border-[#00B900]"
                                  placeholder="Auto"
                              />
                          </div>
                          <div className="space-y-3 font-bold border-none font-bold font-bold font-bold font-bold">
                              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-[#1A1A18]/50 font-bold font-bold font-bold">SHOPEE PRICE</label>
                              <input 
                                  type="number"
                                  value={editingItem.platform_prices?.shopee || ''}
                                  onChange={e => setEditingItem({...editingItem, platform_prices: {...(editingItem.platform_prices || {}), shopee: Number(e.target.value) || null}})}
                                  className="w-full bg-[#EE4D2D]/10 border border-[#EE4D2D]/30 py-5 px-6 text-sm outline-none font-bold text-[#EE4D2D] placeholder:text-[#EE4D2D]/50 focus:border-[#EE4D2D]"
                                  placeholder="Auto"
                              />
                          </div>
                          <div className="space-y-3 font-bold border-none font-bold font-bold font-bold font-bold">
                              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-[#1A1A18]/50 font-bold font-bold font-bold">FOODPANDA PRICE</label>
                              <input 
                                  type="number"
                                  value={editingItem.platform_prices?.foodpanda || ''}
                                  onChange={e => setEditingItem({...editingItem, platform_prices: {...(editingItem.platform_prices || {}), foodpanda: Number(e.target.value) || null}})}
                                  className="w-full bg-[#D70F64]/10 border border-[#D70F64]/30 py-5 px-6 text-sm outline-none font-bold text-[#D70F64] placeholder:text-[#D70F64]/50 focus:border-[#D70F64]"
                                  placeholder="Auto"
                              />
                          </div>
                          <div className="space-y-3 font-bold border-none font-bold font-bold font-bold font-bold">
                              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-[#1A1A18]/50 font-bold font-bold font-bold">ROBINHOOD PRICE</label>
                              <input 
                                  type="number"
                                  value={editingItem.platform_prices?.robinhood || ''}
                                  onChange={e => setEditingItem({...editingItem, platform_prices: {...(editingItem.platform_prices || {}), robinhood: Number(e.target.value) || null}})}
                                  className="w-full bg-[#6023A2]/10 border border-[#6023A2]/30 py-5 px-6 text-sm outline-none font-bold text-[#6023A2] placeholder:text-[#6023A2]/50 focus:border-[#6023A2]"
                                  placeholder="Auto"
                              />
                          </div>`

const replacement = `                          {(!shopSettings?.opening_hours?.active_delivery_platforms || shopSettings.opening_hours.active_delivery_platforms.includes('grab')) && (
                          <div className="space-y-3 font-bold border-none font-bold font-bold font-bold font-bold">
                              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-[#1A1A18]/50 font-bold font-bold font-bold font-bold font-bold">GRAB PRICE</label>
                              <input 
                                  type="number"
                                  value={editingItem.platform_prices?.grab || ''}
                                  onChange={e => setEditingItem({...editingItem, platform_prices: {...(editingItem.platform_prices || {}), grab: Number(e.target.value) || null}})}
                                  className="w-full bg-[#00B14F]/10 border border-[#00B14F]/30 py-5 px-6 text-sm outline-none font-bold text-[#00B14F] placeholder:text-[#00B14F]/50 focus:border-[#00B14F]"
                                  placeholder="Auto"
                              />
                          </div>)}
                          {(!shopSettings?.opening_hours?.active_delivery_platforms || shopSettings.opening_hours.active_delivery_platforms.includes('lineman')) && (
                          <div className="space-y-3 font-bold border-none font-bold font-bold font-bold font-bold">
                              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-[#1A1A18]/50 font-bold font-bold font-bold">LINEMAN PRICE</label>
                              <input 
                                  type="number"
                                  value={editingItem.platform_prices?.lineman || ''}
                                  onChange={e => setEditingItem({...editingItem, platform_prices: {...(editingItem.platform_prices || {}), lineman: Number(e.target.value) || null}})}
                                  className="w-full bg-[#00B900]/10 border border-[#00B900]/30 py-5 px-6 text-sm outline-none font-bold text-[#00B900] placeholder:text-[#00B900]/50 focus:border-[#00B900]"
                                  placeholder="Auto"
                              />
                          </div>)}
                          {(!shopSettings?.opening_hours?.active_delivery_platforms || shopSettings.opening_hours.active_delivery_platforms.includes('shopee')) && (
                          <div className="space-y-3 font-bold border-none font-bold font-bold font-bold font-bold">
                              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-[#1A1A18]/50 font-bold font-bold font-bold">SHOPEE PRICE</label>
                              <input 
                                  type="number"
                                  value={editingItem.platform_prices?.shopee || ''}
                                  onChange={e => setEditingItem({...editingItem, platform_prices: {...(editingItem.platform_prices || {}), shopee: Number(e.target.value) || null}})}
                                  className="w-full bg-[#EE4D2D]/10 border border-[#EE4D2D]/30 py-5 px-6 text-sm outline-none font-bold text-[#EE4D2D] placeholder:text-[#EE4D2D]/50 focus:border-[#EE4D2D]"
                                  placeholder="Auto"
                              />
                          </div>)}
                          {(!shopSettings?.opening_hours?.active_delivery_platforms || shopSettings.opening_hours.active_delivery_platforms.includes('foodpanda')) && (
                          <div className="space-y-3 font-bold border-none font-bold font-bold font-bold font-bold">
                              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-[#1A1A18]/50 font-bold font-bold font-bold">FOODPANDA PRICE</label>
                              <input 
                                  type="number"
                                  value={editingItem.platform_prices?.foodpanda || ''}
                                  onChange={e => setEditingItem({...editingItem, platform_prices: {...(editingItem.platform_prices || {}), foodpanda: Number(e.target.value) || null}})}
                                  className="w-full bg-[#D70F64]/10 border border-[#D70F64]/30 py-5 px-6 text-sm outline-none font-bold text-[#D70F64] placeholder:text-[#D70F64]/50 focus:border-[#D70F64]"
                                  placeholder="Auto"
                              />
                          </div>)}
                          {(!shopSettings?.opening_hours?.active_delivery_platforms || shopSettings.opening_hours.active_delivery_platforms.includes('robinhood')) && (
                          <div className="space-y-3 font-bold border-none font-bold font-bold font-bold font-bold">
                              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-[#1A1A18]/50 font-bold font-bold font-bold">ROBINHOOD PRICE</label>
                              <input 
                                  type="number"
                                  value={editingItem.platform_prices?.robinhood || ''}
                                  onChange={e => setEditingItem({...editingItem, platform_prices: {...(editingItem.platform_prices || {}), robinhood: Number(e.target.value) || null}})}
                                  className="w-full bg-[#6023A2]/10 border border-[#6023A2]/30 py-5 px-6 text-sm outline-none font-bold text-[#6023A2] placeholder:text-[#6023A2]/50 focus:border-[#6023A2]"
                                  placeholder="Auto"
                              />
                          </div>)}`

if (code.includes(target)) {
    code = code.replace(target, replacement)
    fs.writeFileSync('components/pos/POSMenuManager.tsx', code)
    console.log("Patched POSMenuManager.tsx!")
}


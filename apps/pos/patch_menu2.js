const fs = require('fs')

let code = fs.readFileSync('components/pos/POSMenuManager.tsx', 'utf8')

const regex = /<label className="text-\[10px\] font-black uppercase tracking-\[0\.2em\] text-\[#1A1A18\]\/50 font-bold font-bold font-bold">COST PRICE<\/label>[\s\S]*?<\/div>[\s\S]*?<\/div>/;

const replacement = `<label className="text-[10px] font-black uppercase tracking-[0.2em] text-[#1A1A18]/50 font-bold font-bold font-bold">COST PRICE</label>
                              <input 
                                  type="number"
                                  value={editingItem.cost_price}
                                  onChange={e => setEditingItem({...editingItem, cost_price: Number(e.target.value)})}
                                  className="w-full bg-white border border-[#E5E5DF] py-5 px-6 text-sm outline-none font-bold text-black font-bold font-bold border-none font-bold"
                              />
                          </div>
                      </div>

                      <div className="grid grid-cols-2 gap-6 font-bold border-none font-bold font-bold font-bold mt-6">
                          <div className="space-y-3 font-bold border-none font-bold font-bold font-bold font-bold">
                              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-[#1A1A18]/50 font-bold font-bold font-bold font-bold font-bold">GRAB PRICE</label>
                              <input 
                                  type="number"
                                  value={editingItem.platform_prices?.grab || ''}
                                  onChange={e => setEditingItem({...editingItem, platform_prices: {...(editingItem.platform_prices || {}), grab: Number(e.target.value) || null}})}
                                  className="w-full bg-[#00B14F]/10 border border-[#00B14F]/30 py-5 px-6 text-sm outline-none font-bold text-[#00B14F] placeholder:text-[#00B14F]/50 focus:border-[#00B14F]"
                                  placeholder="Auto (Sale Price)"
                              />
                          </div>
                          <div className="space-y-3 font-bold border-none font-bold font-bold font-bold font-bold">
                              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-[#1A1A18]/50 font-bold font-bold font-bold">SHOPEE PRICE</label>
                              <input 
                                  type="number"
                                  value={editingItem.platform_prices?.shopee || ''}
                                  onChange={e => setEditingItem({...editingItem, platform_prices: {...(editingItem.platform_prices || {}), shopee: Number(e.target.value) || null}})}
                                  className="w-full bg-[#EE4D2D]/10 border border-[#EE4D2D]/30 py-5 px-6 text-sm outline-none font-bold text-[#EE4D2D] placeholder:text-[#EE4D2D]/50 focus:border-[#EE4D2D]"
                                  placeholder="Auto (Sale Price)"
                              />
                          </div>
                      </div>`;

if (regex.test(code)) {
  fs.writeFileSync('components/pos/POSMenuManager.tsx', code.replace(regex, replacement))
  console.log("Patched POSMenuManager.tsx")
} else {
  console.log("Target regex not found!")
}

const fs = require('fs');

let code = fs.readFileSync('components/pos/POSInventoryManager.tsx', 'utf8');

const targetTableStart = '<table className="w-full text-left border-collapse min-w-[1200px]">';
const targetTableEnd = '</table>';

const startIndex = code.indexOf(targetTableStart);
const endIndex = code.indexOf(targetTableEnd) + targetTableEnd.length;

if (startIndex !== -1 && endIndex !== -1) {
    const replacement = `
                  <div className="space-y-12">
                      {categories.concat([{ id: 'uncategorized', name: 'อื่นๆ (Uncategorized)', is_active: true }]).map(cat => {
                          const itemsInCat = filteredInventory.filter(item => 
                              cat.id === 'uncategorized' 
                              ? !item.category_id || !categories.find(c => c.id === item.category_id)
                              : item.category_id === cat.id
                          );
                          
                          if (itemsInCat.length === 0) return null;

                          return (
                              <div key={cat.id} className="bg-white border border-[#F0F0E8] overflow-hidden rounded-xl shadow-sm">
                                  <div className="bg-[#1A1A18] text-white p-4 sm:p-5 flex items-center justify-between">
                                      <h3 className="text-lg sm:text-xl font-black uppercase tracking-widest">{cat.name}</h3>
                                      <span className="text-[10px] sm:text-xs font-black opacity-60 bg-white/10 px-3 py-1 rounded-full">{itemsInCat.length} Items</span>
                                  </div>
                                  <div className="overflow-x-auto no-scrollbar">
                                      <table className="w-full text-left border-collapse min-w-[800px] sm:min-w-full">
                                          <thead>
                                              <tr className="bg-gray-50/50 border-b border-[#F0F0E8]">
                                                  <th className="p-4 sm:p-6 text-[10px] font-black uppercase tracking-widest text-[#8C8A81] w-1/3 sm:w-auto border-r border-[#F0F0E8]">ชื่อวัตถุดิบ</th>
                                                  <th className="p-4 sm:p-6 text-[10px] font-black uppercase tracking-widest text-[#8C8A81] w-24 sm:w-32 text-center border-r border-[#F0F0E8]">หน่วย (Unit)</th>
                                                  <th className="p-4 sm:p-6 text-[10px] font-black uppercase tracking-widest text-[#8C8A81] w-28 sm:w-40 text-center border-r border-[#F0F0E8]">ยอดสต็อกระบบ</th>
                                                  {isAdmin && (
                                                    <th className="p-4 sm:p-6 text-[10px] font-black uppercase tracking-widest text-[#8C8A81] w-28 sm:w-40 text-center border-r border-[#F0F0E8]">ต้นทุน / หน่วย</th>
                                                  )}
                                                  <th className="p-4 sm:p-6 text-[10px] font-black uppercase tracking-widest text-emerald-700 w-28 sm:w-40 text-center bg-emerald-50/50 border-r border-[#F0F0E8]">ยอดนับจริง (Audit)</th>
                                                  <th className="p-4 sm:p-6 text-[10px] font-black uppercase tracking-widest text-[#8C8A81] w-20 sm:w-28 text-center border-r border-[#F0F0E8]">ส่วนต่าง</th>
                                                  <th className="p-4 sm:p-6 text-[10px] font-black uppercase tracking-widest text-[#8C8A81] w-20 sm:w-28 text-center">จัดการ</th>
                                              </tr>
                                          </thead>
                                          <tbody className="divide-y divide-[#F0F0E8]">
                                              {itemsInCat.map((item) => {
                                                  const physical = auditCounts[item.id] !== undefined && auditCounts[item.id] !== '' ? Number(auditCounts[item.id]) : null;
                                                  const discrepancy = physical !== null ? physical - (item.stock_quantity || 0) : null;

                                                  return (
                                                    <tr key={item.id} className="group hover:bg-sage-50/20 transition-colors">
                                                        <td className="p-0 border-r border-[#F0F0E8]">
                                                            <input 
                                                                type="text" 
                                                                defaultValue={item.name} 
                                                                readOnly={!isAdmin}
                                                                onBlur={(e) => isAdmin && handleBulkUpdate(item.id, 'name', e.target.value)}
                                                                className={\`w-full h-full p-4 sm:p-6 bg-transparent outline-none text-sm sm:text-base font-black uppercase text-black transition-all \${isAdmin ? 'focus:bg-white focus:ring-2 focus:ring-inset focus:ring-black' : 'cursor-not-allowed'}\`}
                                                            />
                                                        </td>

                                                        <td className="p-0 border-r border-[#F0F0E8]">
                                                            <input 
                                                                type="text" 
                                                                defaultValue={item.unit} 
                                                                readOnly={!isAdmin}
                                                                onBlur={(e) => isAdmin && handleBulkUpdate(item.id, 'unit', e.target.value)}
                                                                className={\`w-full h-full p-4 sm:p-6 bg-transparent outline-none text-[10px] sm:text-xs font-black uppercase text-gray-400 text-center transition-all \${isAdmin ? 'focus:bg-white focus:ring-2 focus:ring-inset focus:ring-black' : 'cursor-not-allowed'}\`}
                                                            />
                                                        </td>

                                                        <td className="p-0 border-r border-[#F0F0E8] bg-gray-50/30">
                                                            <input 
                                                                type="number" 
                                                                defaultValue={item.stock_quantity || 0} 
                                                                readOnly={!isAdmin}
                                                                onBlur={(e) => isAdmin && handleBulkUpdate(item.id, 'stock_quantity', Number(e.target.value))}
                                                                className={\`w-full h-full p-4 sm:p-6 bg-transparent outline-none text-lg sm:text-xl font-black text-center text-black transition-all \${isAdmin ? 'focus:bg-white focus:ring-2 focus:ring-inset focus:ring-black' : 'cursor-not-allowed'}\`}
                                                            />
                                                        </td>

                                                        {isAdmin && (
                                                            <td className="p-0 border-r border-[#F0F0E8]">
                                                                <input 
                                                                    type="number" 
                                                                    defaultValue={item.cost_price} 
                                                                    readOnly={!isAdmin}
                                                                    onBlur={(e) => isAdmin && handleBulkUpdate(item.id, 'cost_price', Number(e.target.value))}
                                                                    className={\`w-full h-full p-4 sm:p-6 bg-transparent outline-none text-sm sm:text-base font-black text-center text-emerald-600 transition-all focus:bg-white focus:ring-2 focus:ring-inset focus:ring-black\`}
                                                                />
                                                            </td>
                                                        )}

                                                        <td className="p-0 border-r border-[#F0F0E8] bg-emerald-50/20">
                                                            <input 
                                                                type="number"
                                                                placeholder="-"
                                                                className="w-full h-full p-4 sm:p-6 bg-transparent outline-none text-lg sm:text-xl font-black text-center text-emerald-600 focus:bg-emerald-600 focus:text-white transition-all placeholder:text-emerald-200"
                                                                value={auditCounts[item.id] || ''}
                                                                onChange={(e) => setAuditCounts({...auditCounts, [item.id]: e.target.value})}
                                                                onFocus={(e) => e.target.select()}
                                                            />
                                                        </td>

                                                        <td className="p-4 sm:p-6 text-center border-r border-[#F0F0E8]">
                                                            <div className={\`text-xs sm:text-sm font-black \${discrepancy === 0 ? 'text-gray-300' : discrepancy! > 0 ? 'text-green-500' : 'text-red-500'}\`}>
                                                                {discrepancy !== null ? (discrepancy > 0 ? \`+\${discrepancy}\` : discrepancy) : ''}
                                                            </div>
                                                        </td>

                                                        <td className="p-4 sm:p-6 text-center">
                                                            <div className="flex items-center justify-center gap-3 sm:gap-4">
                                                                {isAdmin && (
                                                                    <button onClick={() => { setEditingItem(item); setIsEditorOpen(true); setShowHistory(false); }} className="text-gray-300 hover:text-black transition-all p-2 bg-gray-50 hover:bg-gray-200 rounded-full">
                                                                        <Edit3 size={18} />
                                                                    </button>
                                                                )}
                                                                <button onClick={() => { setEditingItem(item); setIsRestockOpen(true); setShowHistory(false); }} className="text-gray-300 hover:text-green-600 transition-all p-2 bg-gray-50 hover:bg-green-50 rounded-full">
                                                                    <Plus size={18} />
                                                                </button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                  )
                                              })}
                                          </tbody>
                                      </table>
                                  </div>
                              </div>
                          );
                      })}
                  </div>`;
    
    code = code.substring(0, startIndex) + replacement + code.substring(endIndex);
    fs.writeFileSync('components/pos/POSInventoryManager.tsx', code);
    console.log("Patched POSInventoryManager.tsx successfully.");
} else {
    console.error("Could not find table tag in POSInventoryManager.tsx");
}

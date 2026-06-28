const fs = require('fs');

let code = fs.readFileSync('components/pos/POSMenuManager.tsx', 'utf8');

const targetStart = '<div className="space-y-12">';
const targetEnd = '                </div>\n            </div>\n           )}';

const startIndex = code.indexOf(targetStart);
const endIndex = code.indexOf(targetEnd) + targetEnd.length;

if (startIndex !== -1 && endIndex !== -1) {
    const replacement = `
                <div className="space-y-12">
                    {categories.concat([{ id: 'uncategorized', name: 'อื่นๆ (Uncategorized)', is_active: true }]).map(cat => {
                        const itemsInCat = filteredItems.filter(item => 
                            cat.id === 'uncategorized' 
                            ? !item.category_id || !categories.find(c => c.id === item.category_id)
                            : item.category_id === cat.id
                        );
                        
                        if (itemsInCat.length === 0) return null;

                        const activePlatforms = shopSettings?.opening_hours?.active_delivery_platforms || ['grab', 'lineman', 'shopee', 'foodpanda', 'robinhood'];

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
                                                <th className="p-4 sm:p-6 text-[10px] font-black uppercase tracking-widest text-[#8C8A81] w-12 sm:w-16 text-center border-r border-[#F0F0E8]">Pic</th>
                                                <th className="p-4 sm:p-6 text-[10px] font-black uppercase tracking-widest text-[#8C8A81] border-r border-[#F0F0E8] w-1/3 sm:w-auto min-w-[150px]">ชื่อเมนู</th>
                                                <th className="p-4 sm:p-6 text-[10px] font-black uppercase tracking-widest text-[#8C8A81] w-28 sm:w-48 text-center border-r border-[#F0F0E8] bg-gray-50">หน้าร้าน (฿)</th>
                                                
                                                {activePlatforms.includes('grab') && <th className="p-4 sm:p-6 text-[10px] font-black uppercase tracking-widest text-[#00B14F] w-24 sm:w-32 text-center border-r border-[#F0F0E8] bg-[#00B14F]/5">Grab</th>}
                                                {activePlatforms.includes('lineman') && <th className="p-4 sm:p-6 text-[10px] font-black uppercase tracking-widest text-[#00B900] w-24 sm:w-32 text-center border-r border-[#F0F0E8] bg-[#00B900]/5">Lineman</th>}
                                                {activePlatforms.includes('shopee') && <th className="p-4 sm:p-6 text-[10px] font-black uppercase tracking-widest text-[#EE4D2D] w-24 sm:w-32 text-center border-r border-[#F0F0E8] bg-[#EE4D2D]/5">Shopee</th>}
                                                {activePlatforms.includes('foodpanda') && <th className="p-4 sm:p-6 text-[10px] font-black uppercase tracking-widest text-[#D70F64] w-24 sm:w-32 text-center border-r border-[#F0F0E8] bg-[#D70F64]/5">Foodpanda</th>}
                                                {activePlatforms.includes('robinhood') && <th className="p-4 sm:p-6 text-[10px] font-black uppercase tracking-widest text-[#6023A2] w-24 sm:w-32 text-center border-r border-[#F0F0E8] bg-[#6023A2]/5">Robinhood</th>}
                                                
                                                <th className="p-4 sm:p-6 text-[10px] font-black uppercase tracking-widest text-[#8C8A81] w-24 sm:w-32 text-center border-r border-[#F0F0E8]">สถานะ</th>
                                                <th className="p-4 sm:p-6 text-[10px] font-black uppercase tracking-widest text-[#8C8A81] w-20 sm:w-28 text-center">จัดการ</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-[#F0F0E8]">
                                            {itemsInCat.map((item, idx) => (
                                                <tr key={item.id} className="group hover:bg-sage-50/20 transition-colors">
                                                    <td className="p-3 sm:p-4 border-r border-[#F0F0E8]">
                                                        <div className="w-10 h-10 sm:w-14 sm:h-14 bg-gray-50 border border-gray-100 overflow-hidden mx-auto rounded-lg">
                                                            {item.image_url ? <img src={item.image_url} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center opacity-10"><ImageIcon size={16} /></div>}
                                                        </div>
                                                    </td>
                                                    <td className="p-0 border-r border-[#F0F0E8]">
                                                        <input 
                                                            type="text" 
                                                            defaultValue={item.name} 
                                                            onBlur={(e) => handleBulkUpdate(item.id, 'name', e.target.value)}
                                                            className="w-full h-full p-4 sm:p-6 bg-transparent outline-none focus:bg-white focus:ring-2 focus:ring-inset focus:ring-black text-sm sm:text-base font-black uppercase text-black transition-all"
                                                        />
                                                    </td>
                                                    <td className="p-0 border-r border-[#F0F0E8] bg-gray-50/30">
                                                        <input 
                                                            type="number" 
                                                            defaultValue={item.sale_price} 
                                                            onBlur={(e) => handleBulkUpdate(item.id, 'sale_price', Number(e.target.value))}
                                                            className="w-full h-full p-4 sm:p-6 bg-transparent outline-none focus:bg-white focus:ring-2 focus:ring-inset focus:ring-black text-lg sm:text-xl font-black text-black text-center transition-all"
                                                        />
                                                    </td>
                                                    
                                                    {activePlatforms.includes('grab') && (
                                                        <td className="p-0 border-r border-[#F0F0E8] bg-[#00B14F]/5">
                                                            <input 
                                                                type="number" 
                                                                defaultValue={item.platform_prices?.grab || ''} 
                                                                placeholder="Auto"
                                                                onBlur={(e) => handleBulkUpdate(item.id, 'platform_prices', {...(item.platform_prices || {}), grab: Number(e.target.value) || null})}
                                                                className="w-full h-full p-4 sm:p-6 bg-transparent outline-none focus:bg-white focus:ring-2 focus:ring-inset focus:ring-[#00B14F] text-base sm:text-lg font-black text-[#00B14F] placeholder:text-[#00B14F]/30 text-center transition-all"
                                                            />
                                                        </td>
                                                    )}
                                                    {activePlatforms.includes('lineman') && (
                                                        <td className="p-0 border-r border-[#F0F0E8] bg-[#00B900]/5">
                                                            <input 
                                                                type="number" 
                                                                defaultValue={item.platform_prices?.lineman || ''} 
                                                                placeholder="Auto"
                                                                onBlur={(e) => handleBulkUpdate(item.id, 'platform_prices', {...(item.platform_prices || {}), lineman: Number(e.target.value) || null})}
                                                                className="w-full h-full p-4 sm:p-6 bg-transparent outline-none focus:bg-white focus:ring-2 focus:ring-inset focus:ring-[#00B900] text-base sm:text-lg font-black text-[#00B900] placeholder:text-[#00B900]/30 text-center transition-all"
                                                            />
                                                        </td>
                                                    )}
                                                    {activePlatforms.includes('shopee') && (
                                                        <td className="p-0 border-r border-[#F0F0E8] bg-[#EE4D2D]/5">
                                                            <input 
                                                                type="number" 
                                                                defaultValue={item.platform_prices?.shopee || ''} 
                                                                placeholder="Auto"
                                                                onBlur={(e) => handleBulkUpdate(item.id, 'platform_prices', {...(item.platform_prices || {}), shopee: Number(e.target.value) || null})}
                                                                className="w-full h-full p-4 sm:p-6 bg-transparent outline-none focus:bg-white focus:ring-2 focus:ring-inset focus:ring-[#EE4D2D] text-base sm:text-lg font-black text-[#EE4D2D] placeholder:text-[#EE4D2D]/30 text-center transition-all"
                                                            />
                                                        </td>
                                                    )}
                                                    {activePlatforms.includes('foodpanda') && (
                                                        <td className="p-0 border-r border-[#F0F0E8] bg-[#D70F64]/5">
                                                            <input 
                                                                type="number" 
                                                                defaultValue={item.platform_prices?.foodpanda || ''} 
                                                                placeholder="Auto"
                                                                onBlur={(e) => handleBulkUpdate(item.id, 'platform_prices', {...(item.platform_prices || {}), foodpanda: Number(e.target.value) || null})}
                                                                className="w-full h-full p-4 sm:p-6 bg-transparent outline-none focus:bg-white focus:ring-2 focus:ring-inset focus:ring-[#D70F64] text-base sm:text-lg font-black text-[#D70F64] placeholder:text-[#D70F64]/30 text-center transition-all"
                                                            />
                                                        </td>
                                                    )}
                                                    {activePlatforms.includes('robinhood') && (
                                                        <td className="p-0 border-r border-[#F0F0E8] bg-[#6023A2]/5">
                                                            <input 
                                                                type="number" 
                                                                defaultValue={item.platform_prices?.robinhood || ''} 
                                                                placeholder="Auto"
                                                                onBlur={(e) => handleBulkUpdate(item.id, 'platform_prices', {...(item.platform_prices || {}), robinhood: Number(e.target.value) || null})}
                                                                className="w-full h-full p-4 sm:p-6 bg-transparent outline-none focus:bg-white focus:ring-2 focus:ring-inset focus:ring-[#6023A2] text-base sm:text-lg font-black text-[#6023A2] placeholder:text-[#6023A2]/30 text-center transition-all"
                                                            />
                                                        </td>
                                                    )}

                                                    <td className="p-0 border-r border-[#F0F0E8]">
                                                        <select 
                                                            value={item.status}
                                                            onChange={(e) => handleBulkUpdate(item.id, 'status', e.target.value)}
                                                            className="w-full h-full p-4 sm:p-6 bg-transparent outline-none focus:bg-white focus:ring-2 focus:ring-inset focus:ring-black text-[10px] sm:text-[11px] font-black uppercase text-center cursor-pointer transition-all"
                                                        >
                                                            <option value="active">Active</option>
                                                            <option value="inactive">Hidden</option>
                                                            <option value="out_of_stock">Out of Stock</option>
                                                        </select>
                                                    </td>
                                                    <td className="p-4 sm:p-6 text-center">
                                                        <div className="flex gap-3 sm:gap-4 justify-center">
                                                            <button onClick={() => { setEditingItem(item); fetchItemLinks(item.id); setIsEditorOpen(true); }} className="text-gray-300 hover:text-black transition-all p-2 bg-gray-50 hover:bg-gray-200 rounded-full">
                                                                <Edit3 size={18} />
                                                            </button>
                                                            <button onClick={() => handleDeleteItem(item.id)} className="text-gray-300 hover:text-red-500 transition-all p-2 bg-gray-50 hover:bg-red-50 rounded-full">
                                                                <Trash2 size={18} />
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
           )}`;
    
    code = code.substring(0, startIndex) + replacement + code.substring(endIndex);
    fs.writeFileSync('components/pos/POSMenuManager.tsx', code);
    console.log("Patched POSMenuManager.tsx successfully.");
} else {
    console.error("Could not find table tag in POSMenuManager.tsx");
}

const fs = require('fs');
let content = fs.readFileSync('components/pos/POSCustomerSelect.tsx', 'utf8');

// The file is mangled from `{onManage && (` up to `</button>`
const cutIndex = content.indexOf('{onManage && (');
if (cutIndex !== -1) {
  content = content.slice(0, cutIndex);
  
  const tail = `                            {onManage && (
                                <button 
                                    onClick={onManage}
                                    className="w-full py-4 text-sage-600 text-[10px] font-black uppercase tracking-widest hover:underline flex items-center justify-center gap-2"
                                >
                                    <Layers size={14} /> {locale === 'en' ? 'Manage all member databases' : locale === 'zh' ? '管理所有会员数据库' : 'จัดการฐานข้อมูลสมาชิกทั้งหมด'}</button>
                            )}
                        </>
                    ) : (
                        <form onSubmit={handleCreateCustomer} className="space-y-5 animate-in slide-in-from-bottom-5 duration-300">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-4 font-bold">{locale === 'en' ? 'First and last name' : locale === 'zh' ? '名字和姓氏' : 'ชื่อ-นามสกุล'}</label>
                                <input 
                                    required
                                    type="text" 
                                    className="w-full bg-gray-50 border-none py-4 px-6 rounded-none text-sm font-bold outline-none focus:ring-1 focus:ring-black"
                                    value={newCustomer.name}
                                    onChange={e => setNewCustomer({...newCustomer, name: e.target.value})}
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-4 font-bold">{locale === 'en' ? 'เบอร์โทรศัพท์ติดต่อ' : locale === 'zh' ? 'เบอร์โทรศัพท์ติดต่อ' : 'เบอร์โทรศัพท์ติดต่อ'}</label>
                                <input 
                                    required
                                    type="tel" 
                                    className="w-full bg-gray-50 border-none py-4 px-6 rounded-none text-sm font-bold outline-none focus:ring-1 focus:ring-black"
                                    value={newCustomer.phone}
                                    onChange={e => setNewCustomer({...newCustomer, phone: e.target.value})}
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-4 font-bold">{locale === 'en' ? 'อีเมล (ถ้ามี)' : locale === 'zh' ? 'อีเมล (ถ้ามี)' : 'อีเมล (ถ้ามี)'}</label>
                                <input 
                                    type="email" 
                                    className="w-full bg-gray-50 border-none py-4 px-6 rounded-none text-sm font-bold outline-none focus:ring-1 focus:ring-black"
                                    value={newCustomer.email}
                                    onChange={e => setNewCustomer({...newCustomer, email: e.target.value})}
                                />
                            </div>
                            
                            <div className="grid grid-cols-2 gap-4 pt-4">
                                <button 
                                    type="button"
                                    onClick={() => setIsCreating(false)}
                                    className="py-5 bg-gray-50 text-gray-400 text-xs font-black uppercase tracking-widest rounded-none"
                                >
                                    {locale === 'en' ? 'Cancel' : locale === 'zh' ? '取消' : 'ยกเลิก'}
                                </button>
                                <button 
                                    disabled={loading}
                                    type="submit"
                                    className="py-5 bg-black text-white text-xs font-black uppercase tracking-widest rounded-none shadow-xl flex items-center justify-center gap-2"
                                >
                                    {loading ? <Loader2 className="animate-spin" /> : (locale === 'en' ? 'Register and Select' : locale === 'zh' ? '注册并选择' : 'ลงทะเบียนและเลือก')}
                                </button>
                            </div>
                        </form>
                    )}
                </div>

                {selectedCustomer && (
                    <footer className="p-8 bg-sage-50 border-t border-sage-100 flex items-center justify-between">
                          <div className="flex items-center gap-4">
                             <div className="w-10 h-10 rounded-none bg-sage-600 text-white flex items-center justify-center font-black text-xs uppercase overflow-hidden">
                                {selectedCustomer.avatar_url ? (
                                    <img src={selectedCustomer.avatar_url} alt={selectedCustomer.display_name} className="w-full h-full object-cover" />
                                ) : (
                                    (selectedCustomer.display_name || selectedCustomer.full_name || 'M').slice(0,1)
                                )}
                             </div>
                             <div>
                                 <div className="text-[10px] font-black uppercase tracking-widest text-sage-600">{locale === 'en' ? 'สมาชิกที่เลือก' : locale === 'zh' ? 'สมาชิกที่เลือก' : 'สมาชิกที่เลือก'}</div>
                                 <div className="text-xs font-black uppercase">{selectedCustomer.display_name || selectedCustomer.full_name}</div>
                             </div>
                          </div>
                         <button onClick={() => onSelect(null)} className="text-[10px] font-black uppercase text-red-500 underline underline-offset-4">{locale === 'en' ? 'ยกเลิกการเลือก' : locale === 'zh' ? 'ยกเลิกการเลือก' : 'ยกเลิกการเลือก'}</button>
                    </footer>
                )}
            </div>
        </div>
    )
}
`;
  
  fs.writeFileSync('components/pos/POSCustomerSelect.tsx', content + tail, 'utf8');
}

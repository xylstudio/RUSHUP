const fs = require('fs');
let code = fs.readFileSync('components/pos/POSCustomerSelect.tsx', 'utf8');

// I will just replace the entire form block
const goodForm = `                        <form onSubmit={handleCreateCustomer} className="space-y-5 animate-in slide-in-from-bottom-5 duration-300">
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
                                    {loading ? <Loader2 className="animate-spin" /> : 'ลงทะเบียนและเลือก'}
                                </button>
                            </div>
                        </form>
                    )}
                </div>

                {selectedCustomer && (
                    <footer className="p-8 bg-sage-50 border-t border-sage-100 flex items-center justify-between">`;

// Find the start of the form
const formStart = code.indexOf('<form onSubmit={handleCreateCustomer}');
const footerStart = code.indexOf('<footer className="p-8 bg-sage-50');

if (formStart !== -1 && footerStart !== -1) {
    code = code.substring(0, formStart) + goodForm + code.substring(footerStart + '<footer className="p-8 bg-sage-50 border-t border-sage-100 flex items-center justify-between">'.length);
    fs.writeFileSync('components/pos/POSCustomerSelect.tsx', code);
    console.log('Fixed POSCustomerSelect.tsx');
} else {
    console.log('Could not find boundaries');
}

// Fix NotificationBell.tsx
let notifCode = fs.readFileSync('components/NotificationBell.tsx', 'utf8');
notifCode = notifCode.replace('import { useI18n } from \'../lib/I18nContext\';\n', '');
fs.writeFileSync('components/NotificationBell.tsx', notifCode);
console.log('Fixed NotificationBell.tsx');


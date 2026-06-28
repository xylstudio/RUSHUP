const fs = require('fs');
const file = '/Users/natthanchaimongkol/Downloads/XYLPROJECT-main สำเนา 3/components/pos/POSInventoryManager.tsx';
let content = fs.readFileSync(file, 'utf8');

const regex = /{isAuditTypeModalOpen && \([\s\S]*?<\/AnimatePresence>/;
const replacement = `{isAuditTypeModalOpen && (
          <div className="fixed inset-0 z-[1300] flex flex-col justify-end sm:justify-center sm:p-6 font-bold">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-[#1A1A18]/80 backdrop-blur-sm" onClick={() => setIsAuditTypeModalOpen(false)} />
            
            <motion.div 
              initial={{ y: "100%" }} 
              animate={{ y: 0 }} 
              exit={{ y: "100%" }} 
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="relative w-full h-[90vh] sm:h-auto sm:max-h-[90vh] sm:max-w-2xl bg-gray-50 sm:rounded-3xl shadow-2xl flex flex-col font-bold overflow-hidden rounded-t-[2rem]"
            >
               {/* APP HEADER */}
               <header className="px-6 py-5 bg-white border-b border-gray-100 flex items-center justify-between sticky top-0 z-10">
                  <div className="flex flex-col">
                      <h2 className="text-xl sm:text-2xl font-black uppercase tracking-tighter text-[#1A1A18] leading-none">{locale === 'en' ? 'Select Categories' : locale === 'zh' ? 'Select Categories' : 'เลือกหมวดหมู่ที่ต้องการนับ'}</h2>
                      <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mt-1 leading-none">{locale === 'en' ? 'Stock Audit Setup' : locale === 'zh' ? 'Stock Audit Setup' : 'ตั้งค่าการนับสต็อก'}</p>
                  </div>
                  <button onClick={() => setIsAuditTypeModalOpen(false)} className="w-10 h-10 bg-gray-100 hover:bg-gray-200 active:bg-gray-300 rounded-full flex items-center justify-center text-gray-500 transition-colors">
                      <X size={20} />
                  </button>
               </header>

               {/* QUICK SELECT TOGGLE */}
               <div className="bg-white px-6 py-4 border-b border-gray-100 flex items-center justify-between shadow-sm z-10">
                   <span className="text-[11px] font-black uppercase text-gray-500 tracking-widest">
                       {auditCategory.length} {locale === 'en' ? 'Selected' : locale === 'zh' ? 'Selected' : 'รายการที่เลือก'}
                   </span>
                   <button 
                       onClick={() => {
                           if (auditCategory.length === categories.length) setAuditCategory([]);
                           else setAuditCategory(categories.map(c => c.id));
                       }}
                       className="text-[11px] font-black uppercase tracking-widest text-blue-600 bg-blue-50 px-4 py-2 rounded-full active:bg-blue-100 transition-colors"
                   >
                       {auditCategory.length === categories.length ? (locale === 'en' ? 'Deselect All' : locale === 'zh' ? 'Deselect All' : 'ยกเลิกทั้งหมด') : (locale === 'en' ? 'Select All' : locale === 'zh' ? 'Select All' : 'เลือกทั้งหมด')}
                   </button>
               </div>

               {/* CATEGORY GRID */}
               <div className="flex-1 overflow-y-auto no-scrollbar p-6 bg-gray-50 pb-32">
                   <div className="grid grid-cols-2 gap-3 sm:gap-4 font-bold">
                        {categories.map(cat => {
                          const isSelected = auditCategory.includes(cat.id);
                          return (
                            <button 
                              key={cat.id}
                              onClick={() => {
                                if (isSelected) setAuditCategory(prev => prev.filter(id => id !== cat.id));
                                else setAuditCategory(prev => [...prev, cat.id]);
                              }}
                              className={\`relative group p-5 rounded-2xl flex flex-col items-center gap-3 text-center transition-all active:scale-95 \${isSelected ? 'bg-white border-2 border-sage-500 shadow-[0_8px_16px_rgba(112,143,121,0.15)]' : 'bg-white border-2 border-transparent shadow-sm hover:border-gray-200'}\`}
                            >
                              <div className={\`w-12 h-12 rounded-full flex items-center justify-center transition-all \${isSelected ? 'bg-sage-100 text-sage-600' : 'bg-gray-50 text-gray-400'}\`}>
                                 {isSelected ? <CheckCircle2 size={24} /> : <Boxes size={24} />}
                              </div>
                              <div className="w-full">
                                <div className={\`text-[13px] sm:text-[14px] font-black uppercase leading-tight line-clamp-2 \${isSelected ? 'text-[#1A1A18]' : 'text-gray-600'}\`}>{cat.name}</div>
                              </div>
                              
                              {isSelected && (
                                  <div className="absolute top-3 right-3 w-3 h-3 bg-sage-500 rounded-full animate-pulse"></div>
                              )}
                            </button>
                          );
                        })}
                   </div>
               </div>

               {/* STICKY BOTTOM ACTION BAR */}
               <div className="absolute bottom-0 left-0 right-0 p-6 bg-white border-t border-gray-100 pb-[max(1.5rem,env(safe-area-inset-bottom))] shadow-[0_-10px_20px_rgba(0,0,0,0.05)]">
                   <button 
                        disabled={auditCategory.length === 0}
                        onClick={() => { setIsAuditMode(true); setIsAuditTypeModalOpen(false); setViewMode('grid'); }}
                        className={\`w-full h-14 sm:h-16 flex items-center justify-center gap-3 rounded-2xl transition-all font-black uppercase tracking-widest text-[12px] sm:text-[14px] shadow-lg \${auditCategory.length > 0 ? 'bg-[#1A1A18] text-white active:scale-95 shadow-black/20' : 'bg-gray-100 text-gray-300 cursor-not-allowed shadow-none'}\`}
                      >
                        <span>{auditCategory.length === categories.length ? (locale === 'en' ? 'Start Full Audit' : locale === 'zh' ? 'Start Full Audit' : 'เริ่มนับสต็อกทั้งหมด') : (locale === 'en' ? \`Start Counting (\${auditCategory.length})\` : locale === 'zh' ? \`Start Counting (\${auditCategory.length})\` : \`เริ่มนับสต็อก (\${auditCategory.length} หมวด)\`)}</span>
                        {auditCategory.length > 0 && <ArrowUpRight size={20} />}
                   </button>
               </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>`;

content = content.replace(regex, replacement);

fs.writeFileSync(file, content);
console.log("Patched Category Selection modal");

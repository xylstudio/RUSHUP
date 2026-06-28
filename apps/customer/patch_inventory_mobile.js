const fs = require('fs');
const file = '/Users/natthanchaimongkol/Downloads/XYLPROJECT-main สำเนา 3/components/pos/POSInventoryManager.tsx';
let content = fs.readFileSync(file, 'utf8');

// 1. Remove the old header buttons for Audit Mode, so they don't appear at the top.
// Actually, let's keep the Cancel button at the top if we want, or completely move them down.
// In the useEffect for setViewExtraHeader, we have:
// {isAuditMode && (
//   <div className="flex items-center gap-2">
//     <button ... onClick={finalizeAudit} ...
//     <button ... onClick={() => { setIsAuditMode(false); setAuditCounts({}); setAuditFullCounts({}); setAuditPartialCounts({}); }} ...
//   </div>
// )}
// Let's replace that section with null so the header is clean in audit mode.
content = content.replace(
    /{isAuditMode && \([\s\S]*?<\/div>\n        \)}/,
    `{isAuditMode && (
          <div className="hidden sm:flex items-center gap-2">
            <button 
              onClick={() => { setIsAuditMode(false); setAuditCounts({}); setAuditFullCounts({}); setAuditPartialCounts({}); }}
              className="h-9 sm:h-10 px-4 sm:px-6 border border-red-100 text-red-400 hover:bg-red-50 hover:text-red-600 transition-all text-[10px] font-black uppercase tracking-widest"
            >
              {locale === 'en' ? 'cancel' : locale === 'zh' ? '取消' : 'ยกเลิก'}
            </button>
          </div>
        )}`
);

// 2. Remove the old inline PROGRESS bar (lines ~793-806)
content = content.replace(
    /{\/\* AUDIT SUMMARY DRAWER \(MOBILE FULLSCREEN\) \*\/}[\s\S]*?{isAuditSummaryOpen && \([\s\S]*?}\n          \)}/,
    `{/* AUDIT SUMMARY DRAWER (MOBILE FULLSCREEN) */}
          {isAuditSummaryOpen && (
              <div className="fixed inset-0 z-[200] bg-white sm:bg-black/50 p-0 sm:p-10 overflow-y-auto">
                  <div className="bg-white min-h-full sm:min-h-0 sm:rounded-2xl shadow-2xl p-6 sm:p-10 max-w-4xl mx-auto">
                      <h2 className="text-2xl font-black mb-6">{locale === 'en' ? 'สรุปผลการนับสต็อก' : locale === 'zh' ? 'สรุปผลการนับสต็อก' : 'สรุปผลการนับสต็อก'}</h2>
                      <div className="divide-y border-y mb-6">
                        {auditSummary?.details.map((d: any) => (
                            <div key={d.item_id} className="py-4 flex justify-between">
                                <span>{d.item_name}</span>
                                <span className={d.discrepancy !== 0 ? 'text-red-600' : 'text-green-600'}>
                                    {d.system_quantity_before} → {d.counted_quantity}
                                </span>
                            </div>
                        ))}
                      </div>
                      <button onClick={() => setIsAuditSummaryOpen(false)} className="w-full py-4 bg-black text-white font-black uppercase">{locale === 'en' ? 'ปิดหน้าต่าง' : locale === 'zh' ? 'ปิดหน้าต่าง' : 'ปิดหน้าต่าง'}</button>
                  </div>
              </div>
          )}

          {/* STICKY BOTTOM BAR FOR MOBILE AUDIT */}
          {isAuditMode && (
              <div className="fixed bottom-[80px] sm:bottom-0 left-0 right-0 lg:left-[240px] z-[100] bg-white border-t border-gray-200 shadow-[0_-10px_40px_rgba(0,0,0,0.1)] p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
                  <div className="max-w-4xl mx-auto flex items-center justify-between gap-4">
                      <div className="flex flex-col">
                          <span className="text-[10px] font-black uppercase text-gray-400 tracking-widest">{locale === 'en' ? 'Progress' : locale === 'zh' ? 'Progress' : 'ความคืบหน้า'}</span>
                          <span className="text-lg font-black text-[#1A1A18] leading-none mt-1">
                              {Object.keys(auditCounts).filter(k => auditCounts[k] !== '').length} <span className="text-sm text-gray-400">/ {inventory.length}</span>
                          </span>
                      </div>
                      
                      <div className="flex items-center gap-3 flex-1 justify-end">
                          <button 
                              onClick={() => { setIsAuditMode(false); setAuditCounts({}); setAuditFullCounts({}); setAuditPartialCounts({}); }}
                              className="h-12 sm:h-14 px-4 sm:px-6 border border-gray-200 text-gray-500 rounded-2xl font-black uppercase text-[10px] sm:text-[12px] tracking-widest active:bg-gray-50 transition-all"
                          >
                              {locale === 'en' ? 'Cancel' : locale === 'zh' ? '取消' : 'ยกเลิก'}
                          </button>
                          
                          <button 
                              onClick={finalizeAudit}
                              disabled={isSaving}
                              className="flex-1 max-w-[240px] h-12 sm:h-14 bg-[#4A5D4E] text-white rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-sage-500/30 active:scale-95 transition-all"
                          >
                              {isSaving ? <Loader2 className="animate-spin" size={18} /> : <CheckCircle2 size={20} />}
                              <span className="text-[12px] sm:text-[14px] font-black uppercase tracking-widest">{locale === 'en' ? 'Save Audit' : locale === 'zh' ? 'Save Audit' : 'บันทึกยอดนับ'}</span>
                          </button>
                      </div>
                  </div>
              </div>
          )}
          `
);

// We also need to remove the old top banner for AUDIT mode.
// Let's find: <div className="bg-[#1A1A18] text-white rounded-[2rem] p-6 sm:p-8 mb-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 relative overflow-hidden">
// and replace it with null or just a simpler banner.
content = content.replace(
    /{isAuditMode && \([\s\S]*?<div className="w-full sm:w-auto bg-black\/20 px-6 sm:px-8 py-3 sm:py-4 border border-white\/10 text-center sm:text-right">[\s\S]*?<\/div>\n              <\/div>\n          \)}/,
    `{isAuditMode && (
              <div className="bg-[#1A1A18] text-white rounded-3xl p-6 mb-6 relative overflow-hidden">
                  <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-white/5 rounded-full blur-3xl"></div>
                  <div className="relative z-10">
                      <h2 className="text-xl sm:text-2xl font-black uppercase tracking-widest mb-2 flex items-center gap-3">
                          <ClipboardCheck size={24} className="text-sage-400" />
                          {locale === 'en' ? 'Stock Counting' : locale === 'zh' ? 'Stock Counting' : 'โหมดนับสต็อก'}
                      </h2>
                      <p className="text-[11px] font-black uppercase tracking-widest text-white/50">{locale === 'en' ? 'Please verify actual physical quantities' : locale === 'zh' ? 'Please verify actual physical quantities' : 'กรุณาระบุจำนวนสินค้าที่มีอยู่จริง'}</p>
                  </div>
              </div>
          )}`
);

// 3. Update the audit card rendering logic
// Find the whole isAuditMode return block inside filteredInventory.map
content = content.replace(
    /if \(isAuditMode\) {[\s\S]*?return \([\s\S]*?<\/motion\.div>\n                          \)\n                      }/,
    `if (isAuditMode) {
                          const isCounted = auditCounts[item.id] !== undefined && auditCounts[item.id] !== '';
                          const physicalValue = Number(auditCounts[item.id] || 0);

                          return (
                              <motion.div layout key={item.id} className={\`bg-white rounded-[1.5rem] border p-4 sm:p-5 flex flex-col gap-4 font-bold transition-all \${isCounted ? 'border-sage-400 shadow-[0_0_0_1px_rgba(112,143,121,1)] bg-sage-50/10' : 'border-gray-200 shadow-sm'}\`}>
                                  <div className="flex items-start justify-between gap-3">
                                      <div className="flex items-center gap-3 flex-1 min-w-0">
                                          <div className={\`w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center transition-all \${isLowStock ? 'bg-red-50 text-red-500' : isCounted ? 'bg-sage-100 text-sage-600' : 'bg-slate-50 text-slate-400'}\`}>
                                              {isCounted ? <CheckCircle2 size={18} /> : <Package size={18} />}
                                          </div>
                                          <div className="min-w-0 flex-1">
                                              <div className="text-sm sm:text-base font-black uppercase tracking-tight text-[#1A1A18] truncate leading-none mb-1.5">{item.name}</div>
                                              <div className="text-[10px] text-gray-400 font-black uppercase tracking-widest flex items-center gap-2">
                                                  <span>{locale === 'en' ? 'SYS:' : locale === 'zh' ? 'SYS:' : 'ระบบ:'} <span className="text-gray-600">{item.stock_quantity || 0}</span></span>
                                                  <span className="w-1 h-1 bg-gray-200 rounded-full"></span>
                                                  <span>{item.unit}</span>
                                              </div>
                                          </div>
                                      </div>
                                      <div className={\`w-14 text-center flex flex-col justify-center items-center transition-all \${discrepancy === null ? 'opacity-0' : 'opacity-100'}\`}>
                                          <div className={\`text-[11px] font-black px-2 py-1 rounded-lg \${discrepancy === 0 ? 'bg-gray-100 text-gray-500' : discrepancy! > 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}\`}>
                                              {discrepancy! > 0 ? '+' : ''}{discrepancy}
                                          </div>
                                      </div>
                                  </div>

                                  {/* Mobile-Friendly Input Section */}
                                  <div className="bg-gray-50/50 p-3 rounded-2xl flex flex-col gap-3">
                                      {item.conversion_factor && item.conversion_factor > 1 && item.purchase_unit ? (
                                          <div className="flex flex-col gap-2 w-full">
                                              <div className="flex items-center gap-2">
                                                  <div className="flex-1 flex items-center justify-between bg-white border border-gray-200 rounded-xl overflow-hidden p-1 shadow-sm">
                                                      <button onClick={() => handleDualCountChange(item, 'full', String(Math.max(0, Number(auditFullCounts[item.id] || 0) - 1)))} className="w-10 h-10 flex items-center justify-center text-gray-400 hover:text-black active:bg-gray-50 rounded-lg transition-colors"><Minus size={16} /></button>
                                                      <input 
                                                          type="text" 
                                                          inputMode="decimal"
                                                          className="w-12 bg-transparent text-sm font-black text-center outline-none"
                                                          value={auditFullCounts[item.id] || ''}
                                                          onChange={(e) => handleDualCountChange(item, 'full', e.target.value)}
                                                          onFocus={e => e.target.select()}
                                                          placeholder="0"
                                                      />
                                                      <button onClick={() => handleDualCountChange(item, 'full', String(Number(auditFullCounts[item.id] || 0) + 1))} className="w-10 h-10 flex items-center justify-center text-gray-400 hover:text-black active:bg-gray-50 rounded-lg transition-colors"><Plus size={16} /></button>
                                                  </div>
                                                  <span className="text-[10px] font-black text-gray-400 uppercase w-10 text-center shrink-0">{item.purchase_unit}</span>
                                              </div>
                                              <div className="flex items-center gap-2">
                                                  <div className="flex-1 flex items-center justify-between bg-white border border-gray-200 rounded-xl overflow-hidden p-1 shadow-sm">
                                                      <button onClick={() => handleDualCountChange(item, 'partial', String(Math.max(0, Number(auditPartialCounts[item.id] || 0) - 1)))} className="w-10 h-10 flex items-center justify-center text-gray-400 hover:text-black active:bg-gray-50 rounded-lg transition-colors"><Minus size={16} /></button>
                                                      <input 
                                                          type="text" 
                                                          inputMode="decimal"
                                                          className="w-12 bg-transparent text-sm font-black text-center outline-none"
                                                          value={auditPartialCounts[item.id] || ''}
                                                          onChange={(e) => handleDualCountChange(item, 'partial', e.target.value)}
                                                          onFocus={e => e.target.select()}
                                                          placeholder="0"
                                                      />
                                                      <button onClick={() => handleDualCountChange(item, 'partial', String(Number(auditPartialCounts[item.id] || 0) + 1))} className="w-10 h-10 flex items-center justify-center text-gray-400 hover:text-black active:bg-gray-50 rounded-lg transition-colors"><Plus size={16} /></button>
                                                  </div>
                                                  <span className="text-[10px] font-black text-gray-400 uppercase w-10 text-center shrink-0">{item.unit}</span>
                                              </div>
                                              <div className="flex items-center justify-between mt-1 px-1">
                                                  <div className="flex gap-1">
                                                      <button onClick={() => handleDualCountChange(item, 'partial_add', String(item.conversion_factor * 0.25))} className="px-3 py-1.5 text-[9px] bg-white border border-gray-200 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-black transition-colors font-black active:scale-95 shadow-sm">1/4</button>
                                                      <button onClick={() => handleDualCountChange(item, 'partial_add', String(item.conversion_factor * 0.5))} className="px-3 py-1.5 text-[9px] bg-white border border-gray-200 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-black transition-colors font-black active:scale-95 shadow-sm">1/2</button>
                                                  </div>
                                                  <div className="text-[11px] text-right font-black text-sage-700">Total: {auditCounts[item.id] || 0} {item.unit}</div>
                                              </div>
                                          </div>
                                      ) : (
                                          <div className="flex items-center justify-between bg-white border border-gray-200 rounded-2xl overflow-hidden p-1.5 shadow-sm">
                                              <button 
                                                  onClick={() => setAuditCounts({...auditCounts, [item.id]: String(Math.max(0, physicalValue - 1))})}
                                                  className="w-14 h-12 bg-gray-50 hover:bg-gray-100 active:bg-gray-200 text-gray-600 rounded-xl flex items-center justify-center transition-colors"
                                              >
                                                  <Minus size={20} />
                                              </button>
                                              
                                              <div className="flex-1 flex flex-col relative justify-center">
                                                  <input 
                                                      type="text"
                                                      inputMode="decimal"
                                                      placeholder="0"
                                                      className="w-full bg-transparent py-2 px-2 text-xl sm:text-2xl font-black outline-none text-center text-[#1A1A18] placeholder:text-gray-200"
                                                      value={auditCounts[item.id] || ''}
                                                      onChange={(e) => setAuditCounts({...auditCounts, [item.id]: e.target.value.replace(/[^0-9.]/g, '')})}
                                                      onFocus={(e) => e.target.select()}
                                                  />
                                              </div>
                                              
                                              <button 
                                                  onClick={() => setAuditCounts({...auditCounts, [item.id]: String(physicalValue + 1)})}
                                                  className="w-14 h-12 bg-sage-50 hover:bg-sage-100 active:bg-sage-200 text-sage-600 rounded-xl flex items-center justify-center transition-colors"
                                              >
                                                  <Plus size={20} />
                                              </button>
                                          </div>
                                      )}
                                  </div>
                              </motion.div>
                          )
                      }`
);

// We need to make sure 'Minus' is imported from 'lucide-react'
if (!content.includes('Minus,')) {
    content = content.replace('Plus, Search,', 'Plus, Minus, Search,');
}

// Add padding to the bottom of the list when in audit mode so the fixed bar doesn't cover items
content = content.replace(
    /<div className={`grid gap-2 font-bold \${isAuditMode \? 'grid-cols-1 max-w-4xl mx-auto' : 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6'}`}>/,
    `<div className={\`grid gap-3 font-bold \${isAuditMode ? 'grid-cols-1 max-w-xl mx-auto pb-40' : 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6'}\`}>`
);

fs.writeFileSync(file, content);
console.log("Patched POSInventoryManager.tsx");

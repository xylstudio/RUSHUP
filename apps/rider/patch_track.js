const fs = require('fs');
let file = fs.readFileSync('app/liff/track/[id]/page.tsx', 'utf8');

// I will just replace everything from line 319 to the end of the motion.div
// I'll use string splits.

const newBlock = `                     {status === 'payment_pending' && 'สัญญาณเชื่อมต่อสำเร็จ รอคุณชำระเงินในขั้นตอนสุดท้าย'}
                     {status === 'pending' && (
                       <span className="flex items-center justify-center gap-2">
                         <span className="w-1.5 h-1.5 bg-emerald-500 rounded-none animate-pulse" />
                         {queueAhead > 0 
                           ? \`มีออเดอร์ก่อนหน้าคุณอีก \${queueAhead} คิว พนักงานกำลังเร่งเข้าตรวจสอบออเดอร์ของคุณ\`
                           : 'พนักงานกำลังเข้าตรวจสอบสัญญาณออเดอร์ของคุณ สักครู่เดียว...'}
                       </span>
                     )}
                     {(isPreparing || status === 'accepted') && (
                        queueAhead > 0 
                          ? \`มีอีก \${queueAhead} รายการก่อนหน้าคุณ เครื่องชงซิกเนเจอร์พร้อมดำเนินการทันทีที่คุณถึงคิว\`
                          : 'เครื่องชงกาแฟซิกเนเจอร์เริ่มทำงานพร้อมปรุงเมนูพิเศษสำหรับคุณ'
                     )}
                     {isShipping && 'ไรเดอร์กำลังนำออเดอร์มุ่งหน้าไปหาคุณโดยเร็วที่สุด'}
                     {isCompleted && 'ขอให้มีความสุขกับเมนูพิเศษของเรา ขอบคุณที่ใช้บริการ XYL STUDIO'}
                     {status === 'cancelled' && 'คำสั่งซื้อนี้ถูกยกเลิกโดยระบบหรือความต้องการลูกค้า'}
                   </p>
                </motion.div>
              </AnimatePresence>

              {/* 🌟 RATING SYSTEM */}
              {isCompleted && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
                  className="p-6 bg-gray-50/50 rounded-none border border-gray-100 mt-6"
                >
                   {order.rating > 0 ? (
                      <div className="text-center space-y-3">
                         <div className="flex justify-center mb-2">
                           <div className="w-12 h-12 bg-emerald-50 rounded-full flex items-center justify-center">
                             <CheckCircle2 size={24} className="text-emerald-500" />
                           </div>
                         </div>
                         <h3 className="text-[10px] font-black uppercase text-gray-900 tracking-[0.2em]">{locale === 'en' ? 'Thank you for your feedback' : locale === 'zh' ? '感谢您的反馈' : 'ขอบคุณสำหรับฟีดแบ็คครับ'}</h3>
                         <div className="flex justify-center gap-1">
                           {[1, 2, 3, 4, 5].map((val) => (
                             <Star 
                               key={val}
                               size={16} 
                               fill={val <= order.rating ? "#F6C144" : "none"} 
                               stroke={val <= order.rating ? "#F6C144" : "#E2E8F0"} 
                             />
                           ))}
                         </div>
                         {order.comment && (
                           <p className="text-[8px] font-bold text-gray-500 mt-2">{order.comment}</p>
                         )}
                      </div>
                   ) : (
                      <div className="space-y-6">
                         <p className="text-[7px] font-black uppercase tracking-[0.3em] text-gray-400 leading-none">{locale === 'en' ? 'Rate satisfaction' : locale === 'zh' ? '评价满意度' : 'ให้คะแนนความพึงพอใจ'}</p>
                         <div className="flex justify-center gap-3">
                           {[1, 2, 3, 4, 5].map((val) => (
                             <button
                               key={val}
                               onMouseEnter={() => setHoverRating(val)}
                               onMouseLeave={() => setHoverRating(0)}
                               onClick={() => setOrder((prev) => ({ ...prev, tempRating: val }))}
                               className="transition-all active:scale-90"
                             >
                               <Star 
                                 size={28} 
                                 fill={val <= (order.tempRating || hoverRating) ? "#F6C144" : "none"} 
                                 stroke={val <= (order.tempRating || hoverRating) ? "#F6C144" : "#E2E8F0"} 
                                 className="transition-colors"
                               />
                             </button>
                           ))}
                         </div>

                         <div className="space-y-3">
                           <label className="text-[7px] font-black uppercase tracking-[0.3em] text-gray-400 block text-left">{locale === 'en' ? 'Additional suggestions' : locale === 'zh' ? '附加建议' : 'ข้อเสนอแนะเพิ่มเติม'}</label>
                           <textarea 
                             value={comment}
                             onChange={(e) => setComment(e.target.value)}
                             placeholder={locale === 'en' ? 'What impressed you? Or would you like us to improve any part...' : locale === 'zh' ? '什么让你印象深刻？或者您希望我们改进任何部分...' : 'คุณประทับใจอะไร หรือต้องการให้เราปรับปรุงส่วนไหน...'}
                             className="w-full bg-white border border-gray-200 p-4 text-xs font-bold focus:ring-0 placeholder:text-gray-200 resize-none h-20 rounded-none"
                           />
                           <button 
                             onClick={() => {
                               if (!order.tempRating) {
                                 alert(locale === 'en' ? 'Please select a star rating first.' : 'กรุณากดเลือกดาวเพื่อประเมินความพึงพอใจก่อนครับ');
                                 return;
                               }
                               handleRate(order.tempRating);
                             }}
                             className={\`w-full py-3 text-[9px] font-black uppercase tracking-widest rounded-none active:scale-95 transition-all \${!order.tempRating ? 'bg-gray-200 text-gray-400 cursor-not-allowed' : 'bg-black text-white'}\`}
                           >
                             {isSaving ? 'กำลังบันทึก...' : 'บันทึกความคิดเห็น'}
                           </button>
                         </div>
                      </div>
                   )}
                </motion.div>
              )}
           </div>`;

const parts = file.split('<p className="text-[9px] font-black uppercase text-emerald-500 tracking-[0.2em]">');
const tailParts = parts[1].split('           </div>\n        </div>\n\n        {/* 📦 ORDER SUMMARY MINI-LIST */}');

if(parts.length > 1 && tailParts.length > 1) {
  const finalFile = parts[0] + '<p className="text-[9px] font-black uppercase text-emerald-500 tracking-[0.2em]">\n' + newBlock + '\n        </div>\n\n        {/* 📦 ORDER SUMMARY MINI-LIST */}\n' + tailParts[1];
  fs.writeFileSync('app/liff/track/[id]/page.tsx', finalFile);
  console.log('Fixed track UI');
} else {
  console.log('Split failed', parts.length, tailParts.length);
}

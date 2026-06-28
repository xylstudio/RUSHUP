import re

file_path = "app/liff/menu/page.tsx"

with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

target = """                   <div className="p-3 relative z-10">
                      <h3 className="text-[10px] font-bold text-gray-800 line-clamp-1">{getPrimaryMenuName(item)}</h3>
                      {getSecondaryMenuName(item, locale === 'zh' ? 'zh' : 'en') && (
                        <p className="mt-1 text-[8px] font-semibold text-gray-500 line-clamp-1">
                          {getSecondaryMenuName(item, locale === 'zh' ? 'zh' : 'en')}
                        </p>
                      )}
                </div>
              ))}
            </div>
          </div>
        )}"""

replacement = """                   <div className="p-3 relative z-10">
                      <h3 className="text-[10px] font-bold text-gray-800 line-clamp-1">{getPrimaryMenuName(item)}</h3>
                      {getSecondaryMenuName(item, locale === 'zh' ? 'zh' : 'en') && (
                        <p className="mt-1 text-[8px] font-semibold text-gray-500 line-clamp-1">
                          {getSecondaryMenuName(item, locale === 'zh' ? 'zh' : 'en')}
                        </p>
                      )}
                      <div className="flex justify-between items-center mt-1">
                        <span className="text-[10px] font-black">{locale === 'en' ? '฿' : locale === 'zh' ? '฿' : '฿'}{item.sale_price}</span>
                        <button disabled={item.in_stock === false} onClick={() => item.in_stock !== false && addToCart(item)} className={`w-7 h-7 border flex items-center justify-center rounded-none transition-all ${item.in_stock === false ? 'border-gray-200 bg-gray-100 text-gray-300 cursor-not-allowed' : 'border-gray-100 text-gray-400 hover:bg-black hover:text-white'}`}>
                          <Plus size={12} />
                        </button>
                      </div>
                   </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* 🌟 Social Proof Divider */}
        {recentReviews.length > 0 && activeCategoryId === 'all' && !searchTerm && (
          <div className="my-12 px-4 py-10 bg-[#f9f9f5] border-y border-gray-50 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-10 opacity-5 -rotate-12 translate-x-1/2 -translate-y-1/2">
                <Star size={120} fill="currentColor" className="text-amber-500" />
            </div>
            <h2 className="text-[10px] font-black uppercase tracking-[0.4em] text-gray-400 mb-8 px-1 text-center">{locale === 'en' ? 'ความประทับใจจากลูกค้าของเรา' : locale === 'zh' ? 'ความประทับใจจากลูกค้าของเรา' : 'ความประทับใจจากลูกค้าของเรา'}</h2>
            <div className="flex gap-4 overflow-x-auto no-scrollbar pb-2">
              {recentReviews.map((rev, idx) => (
                <div key={idx} className="flex-shrink-0 w-72 p-8 bg-white border border-gray-100 rounded-none shadow-sm relative">
                   <div className="flex items-center gap-1 mb-4">
                       {[...Array(5)].map((_, i) => (
                         <Star key={i} size={10} fill={i < rev.rating ? "#F6C144" : "none"} stroke={i < rev.rating ? "#F6C144" : "#E2E8F0"} />
                       ))}
                   </div>
                   <p className="text-[11px] font-bold text-gray-800 italic mb-6 leading-relaxed line-clamp-2">"{rev.comment}"</p>
                   <div className="flex items-center gap-3">
                     <div className="w-6 h-6 rounded-none bg-gray-200 overflow-hidden">
                       {rev.customer_image && <img src={rev.customer_image} className="w-full h-full object-cover" />}
                     </div>
                     <span className="text-[9px] font-black uppercase text-emerald-600 tracking-[0.2em]">{rev.customer_name || 'ลูกค้าคนสำคัญ'}</span>
                   </div>
                </div>
              ))}
            </div>
          </div>
        )}"""

if target in content:
    content = content.replace(target, replacement)
    with open(file_path, "w", encoding="utf-8") as f:
        f.write(content)
    print("Replaced successfully!")
else:
    print("Target not found!")


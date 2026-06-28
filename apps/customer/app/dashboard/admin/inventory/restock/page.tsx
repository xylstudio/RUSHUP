'use client';
import React, { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { Package, AlertTriangle, ArrowLeft, Printer, Download, ShoppingCart, CheckCircle2, ChevronRight, Boxes } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import { useI18n } from "@/lib/I18nContext";

export default function RestockListPage() {
    const { locale } = useI18n();
  const [items, setItems] = useState<any[]>([])
  const [categories, setCategories] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchRestockItems()
  }, [])

  async function fetchRestockItems() {
    setLoading(true)
    // Fetch categories first
    const { data: catData } = await supabase.from('inventory_categories').select('*')
    if (catData) setCategories(catData)

    // Fetch items where stock <= min_stock_level
    const { data: invData } = await supabase
      .from('inventory_items')
      .select('*')
      .eq('is_active', true)
      .order('name')
    
    if (invData) {
      const restockItems = invData.filter((i: any) => (i.stock_quantity || 0) <= (i.min_stock_level || 0))
      setItems(restockItems)
    }
    setLoading(false)
  }

  const handlePrint = () => {
    window.print()
  }

  return (
    <div className="max-w-5xl mx-auto py-6 md:py-10 px-3 sm:px-4">
      {/* Editorial Header */}
      <div className="mb-8 md:mb-12 flex flex-col md:flex-row md:items-end justify-between gap-5 md:gap-6 border-b border-[#1A1A1A]/10 pb-8 md:pb-10">
        <div className="space-y-4">
          <Link href="/dashboard/admin" className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-[#A3A3A3] hover:text-black transition-colors mb-2">
            <ArrowLeft size={14} /> Back to Dashboard
          </Link>
          <div className="flex items-center gap-3">
             <div className="w-1.5 h-1.5 bg-red-500 rounded-none" />
             <h1 className="text-[11px] font-black uppercase tracking-[0.5em] text-red-500">Restock Priority List</h1>
          </div>
          <h2 className="text-4xl md:text-6xl font-black uppercase tracking-tighter text-[#1A1A1A] leading-none">
            {locale === 'en' ? 'Items to buy' : locale === 'zh' ? '需要购买的物品' : '             รายการที่ต้องซื้อ'}<span className="text-red-500">.</span>
          </h2>
          <p className="text-sm text-[#70706B] font-medium max-w-lg">
            {locale === 'en' ? 'Compile a list of all raw materials and products whose balance is below the designated ordering point. To replenish stock to be ready for operations.' : locale === 'zh' ? '编制一份余额低于指定订购点的所有原材料和产品的清单。补充库存，为运营做好准备。' : '             รวบรวมรายการวัตถุดิบและสินค้าทั้งหมดที่ยอดคงเหลือต่ำกว่าจุดสั่งซื้อที่กำหนดไว้ เพื่อดำเนินการเติมสต็อกให้พร้อมสำหรับการดำเนินงาน           '}</p>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full md:w-auto print:hidden">
          <button 
            onClick={handlePrint}
            className="w-full h-14 px-5 bg-white border border-[#1A1A1A] text-[#1A1A1A] flex items-center justify-center gap-3 text-[10px] font-black uppercase tracking-[0.28em] hover:bg-[#F5F5F5] transition-all min-h-[48px]"
          >
            <Printer size={16} /> Print Sheet
          </button>
          <button 
            className="w-full h-14 px-5 bg-[#1A1A1A] text-white flex items-center justify-center gap-3 text-[10px] font-black uppercase tracking-[0.28em] hover:bg-black shadow-xl transition-all min-h-[48px]"
          >
            <Download size={16} /> Export CSV
          </button>
        </div>
      </div>

      {loading ? (
        <div className="py-32 flex flex-col items-center justify-center gap-6 opacity-20">
          <div className="w-12 h-12 border-2 border-t-black border-gray-100 animate-spin rounded-none" />
          <p className="text-[10px] font-black uppercase tracking-[0.5em]">Analyzing Inventory Levels...</p>
        </div>
      ) : items.length === 0 ? (
        <div className="py-40 text-center bg-[#FAFAF8] border border-dashed border-[#E5E5DF]">
           <div className="w-20 h-20 bg-green-50 text-green-500 flex items-center justify-center mx-auto mb-8">
              <CheckCircle2 size={40} />
           </div>
           <h3 className="text-3xl font-black uppercase tracking-tight text-[#1A1A1A]">{locale === 'en' ? 'Complete normal stock' : locale === 'zh' ? '正常库存齐全' : 'สต็อกปกติครบถ้วน'}</h3>
           <p className="text-[#70706B] mt-3 font-medium max-w-md mx-auto">{locale === 'en' ? 'There are currently no items with stock levels below the order point. The system has already checked the latest movement.' : locale === 'zh' ? '目前没有库存水平低于订购点的商品。系统已经查到了最新的动向。' : 'ขณะนี้ไม่มีรายการใดที่มีระดับสต็อกต่ำกว่าจุดสั่งซื้อ ระบบตรวจสอบความเคลื่อนไหวล่าสุดเรียบร้อยแล้ว'}</p>
           <Link href="/dashboard/admin" className="mt-10 inline-block px-10 py-5 bg-[#1A1A1A] text-white text-[10px] font-black uppercase tracking-[0.3em]">
              {locale === 'en' ? 'Return to home page' : locale === 'zh' ? '返回首页' : '               กลับสู่หน้าหลัก            '}</Link>
        </div>
      ) : (
        <div className="grid gap-4">
          <div className="hidden md:grid grid-cols-12 px-6 py-4 border-b border-[#1A1A1A]/5 text-[10px] font-black uppercase tracking-[0.4em] text-[#A3A3A3]">
             <div className="col-span-5">Items Description</div>
             <div className="col-span-3 text-center">Current Stock</div>
             <div className="col-span-2 text-center">Safety Point</div>
             <div className="col-span-2 text-right">Suggested Order</div>
          </div>
          
          {items.map((item, idx) => (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
              key={item.id} 
              className="group relative overflow-hidden rounded-none border border-[#F1F1EB] bg-white p-4 sm:p-5 md:p-6 transition-all hover:border-[#1A1A1A]"
            >
              {/* Status Indicator */}
              <div className="absolute left-0 top-0 bottom-0 w-1 bg-red-500" />
              
              <div className="grid gap-4 md:grid-cols-12 md:gap-0 items-stretch">
                <div className="md:col-span-5 flex items-start gap-4 md:gap-6">
                 <div className="shrink-0 w-12 h-12 md:w-14 md:h-14 bg-[#FAFAF8] flex items-center justify-center text-[#1A1A1A] border border-[#F1F1EB] group-hover:bg-red-50 group-hover:text-red-500 transition-colors">
                    <Package size={22} />
                 </div>
                 <div className="min-w-0 pr-1">
                    <h3 className="text-[17px] sm:text-xl font-black uppercase tracking-tight text-[#1A1A1A] leading-tight break-words">{item.name}</h3>
                    <div className="flex flex-wrap items-center gap-2 sm:gap-3 mt-2">
                      <span className="px-2 py-1 bg-[#F1F1EB] text-[9px] font-black uppercase tracking-widest text-[#70706B]">
                        {categories.find(c => c.id === item.category_id)?.name || 'General'}
                      </span>
                      <span className="text-[9px] font-bold text-[#A3A3A3] uppercase tracking-widest">SKU: {item.sku || 'N/A'}</span>
                    </div>
                 </div>
                </div>

                <div className="grid grid-cols-3 gap-2 md:col-span-7 md:grid md:grid-cols-12 md:gap-0">
                  <div className="flex flex-col items-center justify-center rounded-none bg-[#FAFAF8] px-3 py-3 md:col-span-3 md:bg-transparent md:border-l md:border-[#F1F1EB] md:py-2">
                     <p className="mb-1 text-[8px] font-black uppercase text-[#A3A3A3] md:hidden">Current</p>
                     <span className="text-[18px] sm:text-2xl font-black text-red-500 tabular-nums leading-none">
                       {item.stock_quantity} <span className="text-[10px] text-[#A3A3A3] ml-1">{item.unit}</span>
                     </span>
                  </div>

                  <div className="flex flex-col items-center justify-center rounded-none bg-[#FAFAF8] px-3 py-3 md:col-span-2 md:bg-transparent md:border-l md:border-[#F1F1EB] md:py-2">
                     <p className="mb-1 text-[8px] font-black uppercase text-[#A3A3A3] md:hidden">Threshold</p>
                     <span className="text-[16px] sm:text-xl font-bold text-[#1A1A1A] tabular-nums leading-none">
                       {item.min_stock_level} <span className="text-[10px] text-[#A3A3A3] ml-1">{item.unit}</span>
                     </span>
                  </div>

                  <div className="flex flex-col items-center justify-center rounded-none bg-[#FAFAF8] px-3 py-3 md:col-span-2 md:bg-transparent md:border-l md:border-[#F1F1EB] md:py-2">
                     <p className="mb-1 text-[8px] font-black uppercase text-[#A3A3A3] md:hidden">Recommended</p>
                     <span className="text-[18px] sm:text-2xl font-black text-[#10B981] tabular-nums leading-none">
                       + {Math.max(0, item.min_stock_level - item.stock_quantity + 5)}
                     </span>
                     <p className="mt-1 text-[9px] font-bold text-[#A3A3A3] uppercase">Min + Buffer</p>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}

          <div className="mt-10 md:mt-12 p-5 sm:p-8 md:p-10 bg-[#FAFAF8] border border-[#F1F1EB] flex flex-col md:flex-row items-stretch md:items-center justify-between gap-6 md:gap-8">
             <div className="flex items-start gap-4 md:gap-6">
                <div className="shrink-0 w-14 h-14 md:w-20 md:h-20 bg-white border border-[#F1F1EB] flex items-center justify-center text-[#1A1A1A] shadow-sm">
                   <Boxes size={32} />
                </div>
                <div>
                   <p className="text-[10px] font-black uppercase tracking-[0.4em] text-[#A3A3A3] mb-1">Total Procurement Needed</p>
                   <h4 className="text-2xl sm:text-3xl font-black text-[#1A1A1A] leading-tight">{items.length} Unique Items Requested</h4>
                   <p className="text-sm text-[#70706B] font-medium mt-1">{locale === 'en' ? 'These product items have actual counts below the safety level (Safety Stock).' : locale === 'zh' ? '这些产品的实际数量低于安全水平（安全库存）。' : 'รายการสินค้าเหล่านี้มียอดนับจริงต่ำกว่าระดับความปลอดภัย (Safety Stock)'}</p>
                </div>
             </div>
             <button className="w-full md:w-auto h-16 px-8 sm:px-12 bg-[#1A1A1A] text-white text-[11px] font-black uppercase tracking-[0.4em] hover:bg-black transition-all shadow-2xl flex items-center justify-center gap-4 min-h-[52px]">
                <ShoppingCart size={20} /> Generate Purchase Order
             </button>
          </div>
        </div>
      )}

      {/* Footer Disclaimer */}
      <div className="mt-20 pt-10 border-t border-[#F1F1EB] text-center">
         <p className="text-[9px] font-bold text-[#A3A3A3] uppercase tracking-[0.5em]">
           Xylem Landscape Inventory Management System • Generated at {new Date().toLocaleString('th-TH')}
         </p>
      </div>
    </div>
  )
}

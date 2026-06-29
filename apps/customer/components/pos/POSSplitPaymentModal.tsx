import React, { useState, useEffect } from 'react'
import { X, Check, Calculator, Divide, CheckSquare, Square, Banknote, QrCode, CreditCard } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useI18n } from "@/lib/I18nContext";

export default function POSSplitPaymentModal({
  onClose,
  cart,
  cartTotal,
  remainingTotal,
  handleProcessPayment,
  isProcessing
}: any) {
    const { locale } = useI18n();
  const [splitMode, setSplitMode] = useState<'none' | 'equal' | 'item'>('none')
  const [splitCount, setSplitCount] = useState(2)
  const [selectedBillItems, setSelectedBillItems] = useState<string[]>([])
  
  // Equal Split Amount
  const equalSplitAmount = splitCount > 0 ? remainingTotal / splitCount : 0

  // Item Split Amount
  const itemSplitAmount = cart
    .filter((item: any) => selectedBillItems.includes(item.id))
    .reduce((sum: number, item: any) => sum + (item.sale_price * item.quantity), 0)
    
  // Proportionally add VAT/Service Charge if any? We can just do a proportional calc based on item price / cartSubTotal
  // For simplicity, just use itemSplitAmount. If you want exact with tax, proportional is better.
  const calculateItemSplitTotal = () => {
     if (cartTotal === 0) return 0;
     const subtotal = cart.reduce((sum: number, item: any) => sum + (item.sale_price * item.quantity), 0)
     if (subtotal === 0) return 0;
     return (itemSplitAmount / subtotal) * cartTotal;
  }
  
  const finalSplitTotal = splitMode === 'equal' ? equalSplitAmount : calculateItemSplitTotal()

  const toggleBillItem = (id: string) => {
    if (selectedBillItems.includes(id)) {
      setSelectedBillItems(prev => prev.filter(i => i !== id))
    } else {
      setSelectedBillItems(prev => [...prev, id])
    }
  }

  return (
    <div className="fixed inset-0 z-[3000] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose}></div>
      <div className="relative flex w-full max-w-2xl flex-col bg-[#FDFDFB] font-bold shadow-2xl animate-in zoom-in-95 duration-200 h-[80vh]">
        <header className="flex items-center justify-between border-b border-gray-100 bg-white p-6">
          <h2 className="text-xl font-black uppercase tracking-tighter text-black">{locale === 'en' ? 'หารจ่าย / แยกจ่าย (SPLIT BILL)' : locale === 'zh' ? 'หารจ่าย / แยกจ่าย (SPLIT BILL)' : 'หารจ่าย / แยกจ่าย (SPLIT BILL)'}</h2>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-black transition-colors"><X size={20} /></button>
        </header>
        
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <div className="flex bg-gray-100 p-1 font-bold">
            <button
              onClick={() => setSplitMode('equal')}
              className={`flex-1 h-12 flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest transition-all ${splitMode === 'equal' ? 'bg-[#1A1A18] text-white shadow-lg' : 'text-gray-400 hover:text-black'}`}
            >
              <Divide size={14} /> {locale === 'en' ? ' หารเท่ากัน (Equal)             ' : locale === 'zh' ? ' หารเท่ากัน (Equal)             ' : ' หารเท่ากัน (Equal)             '}</button>
            <button
              onClick={() => setSplitMode('item')}
              className={`flex-1 h-12 flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest transition-all ${splitMode === 'item' ? 'bg-[#1A1A18] text-white shadow-lg' : 'text-gray-400 hover:text-black'}`}
            >
              <CheckSquare size={14} /> {locale === 'en' ? ' เลือกรายการ (By Item)             ' : locale === 'zh' ? ' เลือกรายการ (By Item)             ' : ' เลือกรายการ (By Item)             '}</button>
          </div>

          {splitMode === 'equal' && (
            <div className="space-y-6 animate-in slide-in-from-bottom-2 fade-in duration-300">
              <div className="flex flex-col items-center justify-center border-2 border-dashed border-gray-200 p-8">
                <span className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-4">{locale === 'en' ? 'จำนวนคนหาร' : locale === 'zh' ? 'จำนวนคนหาร' : 'จำนวนคนหาร'}</span>
                <div className="flex items-center gap-6">
                  <button onClick={() => setSplitCount(Math.max(2, splitCount - 1))} className="h-12 w-12 border-2 border-black flex items-center justify-center text-xl hover:bg-black hover:text-white transition-colors">-</button>
                  <span className="text-5xl font-black">{splitCount}</span>
                  <button onClick={() => setSplitCount(splitCount + 1)} className="h-12 w-12 border-2 border-black flex items-center justify-center text-xl hover:bg-black hover:text-white transition-colors">+</button>
                </div>
              </div>
            </div>
          )}

          {splitMode === 'item' && (
            <div className="space-y-4 animate-in slide-in-from-bottom-2 fade-in duration-300 border border-gray-100 bg-white">
               {cart.map((item: any) => (
                  <button
                    key={item.id}
                    onClick={() => toggleBillItem(item.id)}
                    className="w-full flex items-center justify-between p-4 border-b border-gray-50 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className="text-emerald-500">
                        {selectedBillItems.includes(item.id) ? <CheckSquare size={20} /> : <Square size={20} className="text-gray-300" />}
                      </div>
                      <div className="flex flex-col items-start">
                        <span className="text-sm font-black uppercase tracking-tight">{item.name}</span>
                        {item.customer_name && <span className="text-[10px] font-bold text-gray-400">👤 {item.customer_name}</span>}
                      </div>
                    </div>
                    <span className="font-black text-black">{locale === 'en' ? '฿ ' : locale === 'zh' ? '฿ ' : '฿ '}{(item.sale_price * item.quantity).toLocaleString()}</span>
                  </button>
               ))}
            </div>
          )}
        </div>

        <footer className="border-t border-gray-100 bg-white p-6">
           <div className="flex items-end justify-between mb-6">
             <div className="flex flex-col">
               <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">{locale === 'en' ? 'ยอดชำระส่วนนี้' : locale === 'zh' ? 'ยอดชำระส่วนนี้' : 'ยอดชำระส่วนนี้'}</span>
               <span className="text-xs font-bold text-gray-400">{locale === 'en' ? 'จากยอดคงเหลือ ฿ ' : locale === 'zh' ? 'จากยอดคงเหลือ ฿ ' : 'จากยอดคงเหลือ ฿ '}{remainingTotal.toLocaleString()}</span>
             </div>
             <span className="text-4xl font-black">{locale === 'en' ? '฿ ' : locale === 'zh' ? '฿ ' : '฿ '}{finalSplitTotal.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
           </div>
           
           <div className="grid grid-cols-3 gap-2">
             <button disabled={isProcessing || finalSplitTotal === 0} onClick={() => handleProcessPayment('cash', finalSplitTotal)} className="h-16 flex flex-col items-center justify-center border border-gray-200 hover:bg-black hover:text-white transition-colors group disabled:opacity-50">
               <Banknote size={18} className="text-gray-400 group-hover:text-white mb-1" />
               <span className="text-[9px] font-black tracking-widest">CASH</span>
             </button>
             <button disabled={isProcessing || finalSplitTotal === 0} onClick={() => handleProcessPayment('promptpay', finalSplitTotal)} className="h-16 flex flex-col items-center justify-center border border-gray-200 hover:bg-black hover:text-white transition-colors group disabled:opacity-50">
               <QrCode size={18} className="text-gray-400 group-hover:text-white mb-1" />
               <span className="text-[9px] font-black tracking-widest">QR PAY</span>
             </button>
             <button disabled={isProcessing || finalSplitTotal === 0} onClick={() => handleProcessPayment('credit_card', finalSplitTotal)} className="h-16 flex flex-col items-center justify-center border border-gray-200 hover:bg-black hover:text-white transition-colors group disabled:opacity-50">
               <CreditCard size={18} className="text-gray-400 group-hover:text-white mb-1" />
               <span className="text-[9px] font-black tracking-widest">CARD</span>
             </button>
           </div>
        </footer>
      </div>
    </div>
  )
}

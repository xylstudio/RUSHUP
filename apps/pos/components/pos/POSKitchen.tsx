'use client';
import React, { useState, useEffect } from 'react'
import { 
  Clock, ChefHat, CheckCircle2, 
  RefreshCcw, X, Timer,
  Flame, BellRing, Inbox, Zap, ShoppingBag, Truck, Store
} from 'lucide-react'
import { supabase } from '@/lib/supabaseClient'
import { useI18n } from "@/lib/I18nContext";

interface POSKitchenProps {
  profile: any
  activeView: string
  allowedNav: any[]
  onSetView: (view: any) => void
  onShiftModalOpen?: () => void
  activeShift?: any
  syncPulse?: number
  setViewExtraHeader: (node: React.ReactNode) => void
}

export default function POSKitchen({ 
  profile, activeView, allowedNav, onSetView, onShiftModalOpen, activeShift, syncPulse, setViewExtraHeader
}: POSKitchenProps) {
  const { locale } = useI18n();
  const [orders, setOrders] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchKitchenOrders(true)
  }, [])

  useEffect(() => {
    setViewExtraHeader(
      <div className="flex items-center justify-end flex-1 pr-4 text-white">
          <div className="flex items-center gap-6">
              <div className="flex flex-col items-end">
                  <span className="text-[9px] font-black text-white/40 uppercase tracking-widest leading-none mb-1">{locale === 'en' ? 'ออเดอร์ในคิว' : locale === 'zh' ? 'ออเดอร์ในคิว' : 'ออเดอร์ในคิว'}</span>
                  <span className="text-xl font-black text-white leading-none">{orders.length}</span>
              </div>
          </div>
      </div>
    );
    return () => setViewExtraHeader(null);
  }, [setViewExtraHeader, orders.length]);

  useEffect(() => {
     if (syncPulse && syncPulse > 0) {
        fetchKitchenOrders(false);
     }
  }, [syncPulse]);

  const fetchKitchenOrders = async (showLoading = false) => {
    if (showLoading) setLoading(true)
    const { data } = await supabase
      .from('pos_orders')
      .select('*, items:pos_order_items(*, item:pos_menu_items!item_id(name))')
      .in('status', ['pending', 'paid', 'preparing', 'accepted'])
      .order('created_at', { ascending: true })
    if (data) setOrders(data)
    if (showLoading) setLoading(false)
  }

  const updateOrderStatus = async (orderId: string, status: string) => {
    await supabase.from('pos_orders').update({ status }).eq('id', orderId)
    const targetOrder = orders.find((order) => order.id === orderId)
    if (targetOrder?.line_user_id && targetOrder.order_source === 'liff') {
      fetch('/api/line/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: targetOrder.line_user_id,
          type: 'flex',
          orderData: {
            status,
            orderNumber: targetOrder.order_number,
            orderId: targetOrder.id,
            totalAmount: Number(targetOrder.net_total ?? targetOrder.total_amount ?? 0),
            deliveryFee: Number(targetOrder.delivery_fee || 0),
            items: (targetOrder.items || []).map((item: any) => ({
              name: item.item?.name || item.name || 'Item',
              quantity: Number(item.quantity || 0),
              sale_price: Number(item.unit_price || 0),
            })),
          },
        }),
      }).catch((error) => console.error('Kitchen LINE notify failed:', error))
    }
    fetchKitchenOrders()
  }

  return (
    <>
      <main className="flex-1 overflow-x-auto p-4 sm:p-12 bg-[#0A0A0A] flex flex-row gap-8 custom-scrollbar font-bold">
          {orders.map(order => {
              const isDelivery = order.order_type === 'delivery';
              const isLiff = order.order_source === 'liff';
              
              return (
                <div key={order.id} className="w-[350px] sm:w-[450px] flex-shrink-0 flex flex-col bg-[#1A1A18] text-white h-[650px] rounded-[32px] overflow-hidden border-2 border-white/5 shadow-2xl animate-in slide-in-from-right-5 duration-500">
                    {/* 🏷️ HEADER: ORDER TYPE & NUMBER */}
                    <header className={`p-8 relative overflow-hidden ${isDelivery ? 'bg-emerald-600' : 'bg-white'}`}>
                        <div className="relative z-10 flex justify-between items-start">
                            <div>
                                <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full mb-3 ${isDelivery ? 'bg-black/20 text-white' : 'bg-black/5 text-black/40'}`}>
                                    {isDelivery ? <Truck size={14} /> : isLiff ? <ShoppingBag size={14} /> : <Store size={14} />}
                                    <span className="text-[10px] font-black uppercase tracking-widest">
                                        {isDelivery ? 'Delivery' : isLiff ? 'Mobile App' : 'Walk-in'}
                                    </span>
                                </div>
                                <h3 className={`text-5xl font-black tracking-tighter ${isDelivery ? 'text-white' : 'text-black'}`}>
                                    {order.order_number}
                                </h3>
                                <p className={`text-[11px] font-bold uppercase mt-2 opacity-50 ${isDelivery ? 'text-white' : 'text-black'}`}>
                                    Table: {order.table_number || 'N/A'} • {new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </p>
                            </div>
                            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${isDelivery ? 'bg-black/20 text-white' : 'bg-black text-white'}`}>
                                <Clock size={24} />
                            </div>
                        </div>
                        {/* Status Pulse */}
                        {order.status === 'preparing' && (
                            <div className="absolute top-0 right-0 p-4">
                                <span className="flex h-3 w-3 relative">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                                </span>
                            </div>
                        )}
                    </header>

                    {/* 📝 MENU ITEMS (Giant & Clear) */}
                    <div className="flex-1 p-8 space-y-8 overflow-y-auto no-scrollbar">
                        {order.items?.map((item: any, idx: number) => (
                            <div key={idx} className="flex gap-6 items-start group">
                                <div className="text-3xl font-black text-emerald-500 bg-emerald-500/10 w-16 h-16 flex items-center justify-center rounded-2xl group-hover:scale-110 transition-transform">
                                    {item.quantity}
                                </div>
                                <div className="flex-1 py-1">
                                    <h4 className="text-xl font-black uppercase leading-tight tracking-tight">
                                        {item.item?.name || item.name || 'Unknown Item'}
                                    </h4>
                                    {item.selected_modifiers && item.selected_modifiers.length > 0 && (
                                        <div className="mt-3 flex flex-wrap gap-2">
                                            {item.selected_modifiers.map((m: any, mIdx: number) => {
                                                const modifierLabel = m?.is_note
                                                    ? `หมายเหตุ: ${m?.value || m?.name || ''}`
                                                    : m?.value && m.value !== m.name
                                                      ? `${m.name}: ${m.value}`
                                                      : m?.name || ''

                                                if (!modifierLabel) return null

                                                return (
                                                    <span key={mIdx} className="px-3 py-1 bg-white/5 border border-white/10 rounded-lg text-[10px] font-black text-white/40 uppercase tracking-widest">
                                                        + {modifierLabel}
                                                    </span>
                                                )
                                            })}
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* 🎮 CONTROLS */}
                    <footer className="p-8 bg-black/50 border-t border-white/5 flex gap-4">
                         {order.status === 'pending' || order.status === 'paid' || order.status === 'accepted' ? (
                             <button 
                                 onClick={() => updateOrderStatus(order.id, 'preparing')}
                                 className="flex-1 h-20 bg-emerald-500 text-black text-[12px] font-black uppercase tracking-[0.2em] rounded-2xl flex items-center justify-center gap-3 hover:bg-emerald-400 transition-all active:scale-95"
                             >
                                 <ChefHat size={20} />
                                 START COOKING
                             </button>
                         ) : (
                             <button 
                                 onClick={() => updateOrderStatus(order.id, isDelivery ? 'shipping' : 'completed')}
                                 className="flex-1 h-20 bg-white text-black text-[12px] font-black uppercase tracking-[0.2em] rounded-2xl flex items-center justify-center gap-3 hover:bg-neutral-200 transition-all active:scale-95 shadow-[0_20px_40px_rgba(255,255,255,0.1)]"
                             >
                                 <CheckCircle2 size={20} />
                                 MARK AS DONE
                             </button>
                         )}
                         <button 
                            onClick={async () => {
                               if (!confirm("ยกเลิกออเดอร์นี้จากหน้าครัว?")) return;
                               await supabase.from('pos_orders').update({ status: 'cancelled' }).eq('id', order.id);
                               if (order?.line_user_id && order.order_source === 'liff') {
                                 fetch('/api/line/notify', {
                                   method: 'POST',
                                   headers: { 'Content-Type': 'application/json' },
                                   body: JSON.stringify({
                                     to: order.line_user_id,
                                     type: 'flex',
                                     orderData: {
                                       status: 'cancelled',
                                       orderNumber: order.order_number,
                                       orderId: order.id,
                                       totalAmount: Number(order.net_total ?? order.total_amount ?? 0),
                                       items: (order.items || []).map((item: any) => ({
                                         name: item.item?.name || item.name || 'Item',
                                         quantity: Number(item.quantity || 0),
                                         sale_price: Number(item.unit_price || 0),
                                       })),
                                     },
                                   }),
                                 }).catch((error) => console.error('Kitchen cancel LINE notify failed:', error))
                               }
                               fetchKitchenOrders();
                            }}
                            className="w-20 h-20 bg-red-500/10 border border-red-500/20 text-red-500 rounded-2xl flex items-center justify-center hover:bg-red-500 hover:text-white transition-all active:scale-95"
                         >
                            <X size={24} />
                         </button>
                    </footer>
                </div>
              )
          })}
          {orders.length === 0 && (
              <div className="flex-1 flex flex-col items-center justify-center opacity-10 gap-10">
                  <Inbox size={150} strokeWidth={0.5} color="white" />
                  <p className="text-[14px] font-black uppercase tracking-[1em] text-center text-white">KITCHEN CLEAR</p>
              </div>
          )}
      </main>

      <style jsx global>{`
          @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@200;300;400;500;900&family=Prompt:wght@200;300;400&display=swap');
          body { font-family: 'Outfit', 'Prompt', sans-serif; }
          .no-scrollbar::-webkit-scrollbar { display: none; }
          .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
          .custom-scrollbar::-webkit-scrollbar { width: 8px; height: 8px; }
          .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
          .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.05); border-radius: 10px; }
          .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.1); }
      `}</style>
    </>
  )
}

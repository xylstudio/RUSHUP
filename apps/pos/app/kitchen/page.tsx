'use client'

import React, { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { 
  Clock, CheckCircle, Play, ChevronRight, 
  ChefHat, Coffee, Loader2, AlertCircle, 
  ArrowLeft, RefreshCw, Layers
} from 'lucide-react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'

import { Suspense } from 'react'

interface KDSOrder {
  id: string
  order_number: string
  table_number: string
  created_at: string
  kds_status: 'pending' | 'prep' | 'ready' | 'served'
  items: KDSItem[]
}

interface KDSItem {
  id: string
  name: string
  quantity: number
  modifiers: string[] // Combined names for display
}

function KDSContent() {
  const searchParams = useSearchParams()
  const branchId = searchParams.get('branch_id')

  const [orders, setOrders] = useState<KDSOrder[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchOrders()
    
    // Realtime subscription
    const channel = supabase
      .channel('kds-orders')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pos_orders' }, () => {
        fetchOrders()
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [branchId])

  const fetchOrders = async () => {
    let query = supabase
      .from('pos_orders')
      .select('*, pos_order_items(*, item:pos_menu_items!item_id(name))')
      .in('kds_status', ['pending', 'prep', 'ready'])
      .order('created_at', { ascending: true })

    if (branchId) {
      query = query.eq('branch_id', branchId)
    }

    const { data: rawOrders } = await query

    if (rawOrders) {
      const formatted = rawOrders.map((o: any) => ({
        ...o,
        items: o.pos_order_items.map((i: any) => ({
          id: i.id,
          name: i.item?.name || 'Unknown',
          quantity: i.quantity,
          modifiers: [] // Will fetch separately if needed
        }))
      }))
      setOrders(formatted)
    }
    setLoading(false)
  }

  const updateStatus = async (id: string, current: string) => {
    let next = 'prep'
    if (current === 'prep') next = 'ready'
    if (current === 'ready') next = 'served'

    await supabase.from('pos_orders').update({ kds_status: next }).eq('id', id)
    fetchOrders()
  }

  return (
    <div className="min-h-screen bg-[#111111] text-white p-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-12">
            <div className="flex items-center gap-6">
                 <Link href="/dashboard/pos" className="bg-white/10 p-4 rounded-full hover:bg-white/20 transition-all">
                    <ArrowLeft size={24} />
                 </Link>
                 <div>
                    <h1 className="text-4xl font-black uppercase tracking-tighter flex items-center gap-4">
                        <ChefHat size={40} className="text-sage-400" /> Kitchen Display System
                    </h1>
                    <p className="text-gray-500 font-black uppercase tracking-widest text-[10px] mt-1">Real-time Order Processing • Backend</p>
                 </div>
            </div>
            <div className="flex items-center gap-6 bg-white/5 px-8 py-4 rounded-3xl border border-white/10">
                <div className="flex flex-col items-end">
                    <span className="text-[10px] font-black uppercase tracking-widest text-gray-500">Live Status</span>
                    <span className="text-xl font-bold font-mono">{new Date().toLocaleTimeString()}</span>
                </div>
                <RefreshCw size={24} className="text-sage-500 animate-spin-slow" />
            </div>
        </div>

        {/* Content */}
        {loading ? (
            <div className="h-[60vh] flex flex-col items-center justify-center opacity-40">
                <Loader2 className="animate-spin mb-6" size={64} />
                <span className="text-xs font-black uppercase tracking-widest">Waking up the Kitchen...</span>
            </div>
        ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-8">
                {orders.map(order => (
                    <div 
                        key={order.id}
                        className={`bg-white/5 border-2 rounded-[40px] flex flex-col overflow-hidden transition-all duration-500 group ${order.kds_status === 'pending' ? 'border-red-500/50 animate-pulse-slow' : order.kds_status === 'prep' ? 'border-blue-500/50' : 'border-sage-500/50'}`}
                    >
                        {/* Order Header */}
                        <div className={`p-6 flex justify-between items-center ${order.kds_status === 'pending' ? 'bg-red-500' : order.kds_status === 'prep' ? 'bg-blue-500' : 'bg-sage-500 text-black'}`}>
                            <div>
                                <div className="text-[10px] font-black uppercase tracking-widest opacity-70">Order #{order.order_number.slice(-4)}</div>
                                <div className="text-2xl font-black">Table {order.table_number || 'Take'}</div>
                            </div>
                            <div className="flex flex-col items-end">
                                <Clock size={20} className="mb-px" />
                                <span className="text-xs font-black">{Math.floor((new Date().getTime() - new Date(order.created_at).getTime()) / 60000)}m ago</span>
                            </div>
                        </div>

                        {/* Items List */}
                        <div className="flex-1 p-6 space-y-4 max-h-[400px] overflow-y-auto scrollbar-hide">
                            {order.items.map(item => (
                                <div key={item.id} className="bg-white/5 rounded-[24px] p-5 flex items-start justify-between group-hover:bg-white/10 transition-colors">
                                    <div className="flex-1">
                                        <div className="text-lg font-black leading-tight">{item.name}</div>
                                        <div className="text-[10px] font-black text-gray-500 uppercase tracking-widest mt-1">
                                            Normal Portion • No Sugar
                                        </div>
                                    </div>
                                    <div className="bg-white text-black w-10 h-10 rounded-xl flex items-center justify-center font-black text-xl">
                                        {item.quantity}
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Action Footer */}
                        <div className="p-6 border-t border-white/10 bg-white/5 group-hover:bg-white/10 transition-all">
                             <button 
                                onClick={() => updateStatus(order.id, order.kds_status)}
                                className={`w-full py-6 rounded-[32px] font-black uppercase tracking-widest text-sm flex items-center justify-center gap-3 transition-all active:scale-95 ${order.kds_status === 'pending' ? 'bg-red-500 hover:bg-red-600' : order.kds_status === 'prep' ? 'bg-blue-500 hover:bg-blue-600' : 'bg-sage-500 text-black hover:bg-sage-600'}`}
                             >
                                {order.kds_status === 'pending' && <Play size={20} />}
                                {order.kds_status === 'prep' && <ChefHat size={20} />}
                                {order.kds_status === 'ready' && <CheckCircle size={20} />}
                                
                                {order.kds_status === 'pending' && 'Start Preparation'}
                                {order.kds_status === 'prep' && 'Order Ready'}
                                {order.kds_status === 'ready' && 'Confirm Delivery'}
                             </button>
                        </div>
                    </div>
                ))}

                {orders.length === 0 && (
                     <div className="col-span-full border-2 border-dashed border-white/10 rounded-[60px] p-24 text-center opacity-30 flex flex-col items-center">
                        <Layers size={64} className="mb-6" />
                        <h3 className="text-3xl font-black uppercase tracking-tight">No Active Orders</h3>
                        <p className="text-xs font-bold uppercase tracking-widest mt-2">The kitchen is clear. Take a rest!</p>
                     </div>
                )}
            </div>
        )}

        <style jsx global>{`
            @keyframes pulse-slow {
                0%, 100% { opacity: 1; border-color: rgba(239, 68, 68, 0.5); }
                50% { opacity: 0.8; border-color: rgba(239, 68, 68, 0.2); }
            }
            .animate-pulse-slow {
                animation: pulse-slow 3s infinite ease-in-out;
            }
            .animate-spin-slow {
                animation: spin 8s linear infinite;
            }
            @keyframes spin {
                from { transform: rotate(0deg); }
                to { transform: rotate(360deg); }
            }
        `}</style>
    </div>
  )
}

export default function KDSPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#111111] text-white flex items-center justify-center">Loading...</div>}>
      <KDSContent />
    </Suspense>
  )
}

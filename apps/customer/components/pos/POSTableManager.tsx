'use client';
import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { 
  Plus, Search, Edit3, Trash2, Loader2, 
  ChevronRight, Save, LayoutGrid, X,
  Menu as MenuIcon, LogOut, Settings,
  Map, Square, Circle, Trash, Grid, MapPin,
  QrCode, Printer, Download
} from 'lucide-react'
import { supabase } from '@/lib/supabaseClient'
import Link from 'next/link'
import { QRCodeSVG, QRCodeCanvas } from 'qrcode.react'
import { Capacitor } from '@capacitor/core'
import { PrinterSocket } from 'custom-printer-plugin'
import ReceiptPrinterEncoder from '@point-of-sale/receipt-printer-encoder'
import { useI18n } from "@/lib/I18nContext";

interface POSTableManagerProps {
  profile: any
  activeView: string
  allowedNav: any[]
  onSetView: (view: any) => void
  onShiftModalOpen?: () => void
  activeShift?: any
  setViewExtraHeader: (node: React.ReactNode) => void
  shopSettings?: any
}

export default function POSTableManager({ 
  profile, activeView, allowedNav, onSetView, onShiftModalOpen, activeShift, setViewExtraHeader, shopSettings
}: POSTableManagerProps) {
    const { locale } = useI18n();
  const [tables, setTables] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [isEditorOpen, setIsEditorOpen] = useState(false)
  const [editingTable, setEditingTable] = useState<any>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [showQrModal, setShowQrModal] = useState<any>(null)
  
  const [isLayoutMode, setIsLayoutMode] = useState(false)
  const [savingLayout, setSavingLayout] = useState(false)

  useEffect(() => {
    setViewExtraHeader(
      <div className="flex items-center justify-end flex-1 gap-2">
          {isLayoutMode ? (
            <button onClick={handleSaveLayout} disabled={savingLayout} className="h-11 px-6 bg-emerald-600 text-white hover:bg-emerald-700 flex items-center justify-center gap-2 shadow-sm font-bold transition-all">
                {savingLayout ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />} 
                <span className="text-[10px] font-black uppercase tracking-widest hidden sm:inline">SAVE LAYOUT</span>
            </button>
          ) : (
            <button onClick={() => setIsLayoutMode(true)} className="h-11 px-6 bg-white border border-[#F0F0E8] text-black hover:bg-gray-50 flex items-center justify-center gap-2 shadow-sm font-bold transition-all">
                <Map size={16} /> <span className="text-[10px] font-black uppercase tracking-widest hidden sm:inline">EDIT LAYOUT</span>
            </button>
          )}
          <button onClick={() => window.print()} className="h-11 px-6 bg-white text-[#1A1A18] border border-[#F0F0E8] hover:bg-gray-50 flex items-center justify-center gap-2 shadow-sm font-bold transition-all">
              <Printer size={16} /> <span className="text-[10px] font-black uppercase tracking-widest hidden sm:inline">PRINT ALL QR</span>
          </button>
          <button onClick={() => { setEditingTable({ table_number: '', capacity: 4, zone: 'Main', status: 'available', branch_id: shopSettings?.branch_id || null }); setIsEditorOpen(true); }} className="h-11 px-8 bg-[#1A1A18] text-white flex items-center justify-center gap-3 shadow-lg font-bold">
              <Plus size={16} /> <span className="text-[10px] font-black uppercase tracking-widest font-bold">ADD TABLE</span>
          </button>
      </div>
    );
    return () => setViewExtraHeader(null);
  }, [setViewExtraHeader, isLayoutMode, savingLayout, tables]);

  const fetchTables = async () => {
    setLoading(true)
    try {
        const branchId = shopSettings?.branch_id;
        let query = supabase.from('pos_tables').select('*').order('table_number')
        if (branchId) {
            query = query.or(`branch_id.eq.${branchId},branch_id.is.null`)
        } else {
            query = query.is('branch_id', null)
        }
        const { data, error } = await query
        if (error) throw error
        if (data) {
           const formatted = data.map((t, idx) => ({
              ...t,
              position_x: t.position_x ?? (idx % 5) * 150 + 20,
              position_y: t.position_y ?? Math.floor(idx / 5) * 150 + 20
           }));
           setTables(formatted)
        }
    } catch (e) {
        console.error('Fetch Tables Error:', e)
    } finally {
        setLoading(false)
    }
  }

  useEffect(() => {
    fetchTables()

    const channel = supabase
      .channel('public:pos_tables')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pos_tables' }, () => {
        if (!isLayoutMode) {
          fetchTables()
        }
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLayoutMode, shopSettings?.branch_id])

  const handleSaveLayout = async () => {
     setSavingLayout(true)
     try {
       const updates = tables.map(t => ({
          id: t.id,
          position_x: t.position_x,
          position_y: t.position_y,
          shape: t.shape || 'square',
       }))
       
       for (const update of updates) {
          const { error } = await supabase.from('pos_tables').update({
             position_x: Math.round(update.position_x || 0),
             position_y: Math.round(update.position_y || 0),
             shape: update.shape
          }).eq('id', update.id)
          
          if (error) {
             console.error("Supabase update error:", error)
             throw new Error(error.message)
          }
       }
       alert('บันทึกตำแหน่งและรูปแบบโต๊ะเรียบร้อยแล้ว!')
       setIsLayoutMode(false)
     } catch (e) {
       console.error(e)
       alert('Error saving layout')
     } finally {
       setSavingLayout(false)
     }
  }

  const handleDragEnd = (id: string, info: any) => {
    setTables(prev => prev.map(t => {
      if (t.id === id) {
        return {
          ...t,
          position_x: (t.position_x || 0) + info.offset.x,
          position_y: (t.position_y || 0) + info.offset.y
        }
      }
      return t
    }))
  }

  const handleDeleteTable = async (id: string) => {
    if (!confirm('ยืนยันการลบโต๊ะนี้?')) return
    await supabase.from('pos_tables').delete().eq('id', id)
    fetchTables()
  }

  const handleSaveTable = async () => {
    setIsSaving(true)
    const { error } = await supabase.from('pos_tables').upsert(editingTable)
    if (!error) {
      setIsEditorOpen(false)
      fetchTables()
    }
    setIsSaving(false)
  }

  const printTableQRCode = async (table: any) => {
    const qrUrl = `${window.location.origin}/menu/${table.table_number}`
    if (Capacitor.isNativePlatform()) {
      const { data: shopSettings } = await supabase.from('pos_shop_settings').select('printers').single()
      const printers = shopSettings?.printers || []
      const receiptPrinter = printers.find((p: any) => p.type === 'receipt')
      
      let ip = receiptPrinter?.ip
      if (!ip) {
        ip = prompt('กรุณาระบุ IP Address ของเครื่องปริ้น (เช่น 192.168.1.100):', '192.168.1.100');
        if (!ip) return;
      }
      const model = receiptPrinter?.model || 'xprinter-xp-n160ii';
      const encoder = new ReceiptPrinterEncoder({ printerModel: model as any, columns: 48 });
      let result = encoder.initialize().codepage('auto').align('center').bold(true);
      result = result.line('--- SCAN TO ORDER ---').newline();
      result = result.qrcode(qrUrl, 1, 8, 'l').newline();
      result = result.line(`Table: ${table.table_number}`).newline().newline().newline().cut();
      
      const data = result.encode();
      let hex = '';
      data.forEach(b => hex += b.toString(16).padStart(2, '0'));
      
      try {
        await PrinterSocket.send({ ipAddress: ip, port: 9100, data: hex });
        alert('สั่งปริ้น QR Code โต๊ะเรียบร้อย');
      } catch (e: any) {
        console.error(e);
        alert('Print QR error: ' + (e?.message || JSON.stringify(e)));
      }
    } else {
      window.print();
    }
  };

  const saveQrasPNG = () => {
    const canvas = document.getElementById('qr-canvas-' + showQrModal?.id) as HTMLCanvasElement;
    if (!canvas) return;
    
    canvas.toBlob(async (blob) => {
      if (!blob) return;
      const file = new File([blob], `table_${showQrModal?.table_number}.png`, { type: 'image/png' });
      
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        try {
          await navigator.share({
            files: [file],
            title: `Table ${showQrModal?.table_number} QR Code`,
          });
        } catch (err) {
          console.error("Share failed", err);
        }
      } else {
        // Fallback for desktop
        const pngUrl = URL.createObjectURL(blob);
        let downloadLink = document.createElement("a");
        downloadLink.href = pngUrl;
        downloadLink.download = `table_${showQrModal?.table_number}.png`;
        document.body.appendChild(downloadLink);
        downloadLink.click();
        document.body.removeChild(downloadLink);
        URL.revokeObjectURL(pngUrl);
      }
    }, 'image/png');
  }

  return (
    <>
      <div className="p-4 sm:p-10 font-bold overflow-y-auto no-scrollbar print:hidden">

        {/* 2. MAIN TABLE CANVAS */}
        <div className="flex-1 mt-4 relative w-full h-[70vh] bg-[#fcfcf9] border border-gray-200 overflow-hidden shadow-inner"
             style={{ backgroundImage: isLayoutMode ? 'radial-gradient(#d1d5db 1px, transparent 1px)' : 'none', backgroundSize: '20px 20px' }}>
            {loading ? (
               <div className="h-full flex items-center justify-center opacity-20 font-bold">
                   <Loader2 className="animate-spin font-bold" size={48} />
               </div>
            ) : (
               <>
                  {tables.map(table => (
                      <motion.div 
                          key={table.id} 
                          drag={isLayoutMode}
                          dragMomentum={false}
                          onDragEnd={(e, info) => handleDragEnd(table.id, info)}
                          initial={{ x: table.position_x || 0, y: table.position_y || 0 }}
                          animate={{ x: table.position_x || 0, y: table.position_y || 0 }}
                          className={`absolute w-24 h-24 sm:w-32 sm:h-32 flex flex-col items-center justify-center group transition-colors ${table.shape === 'circle' ? 'rounded-full' : 'rounded-none'} ${table.status === 'occupied' ? 'bg-red-500 border-red-600 text-white' : 'bg-white border-[#F0F0E8] text-black'} ${isLayoutMode ? 'cursor-grab active:cursor-grabbing border-2 border-blue-400 z-10 shadow-xl' : 'cursor-pointer border hover:border-black hover:shadow-2xl'}`}
                          onClick={() => {
                             if (isLayoutMode) {
                                // Toggle shape between square and circle
                                setTables(prev => prev.map(t => {
                                   if (t.id === table.id) {
                                      return { ...t, shape: (t.shape === 'circle' ? 'square' : 'circle') }
                                   }
                                   return t
                                }))
                             } else {
                                setEditingTable(table); 
                                setIsEditorOpen(true);
                             }
                          }}
                      >
                          <div className={`text-3xl sm:text-4xl font-serif-luxury ${table.status === 'occupied' ? 'text-white' : 'text-[#1A1A18]'} lowercase italic font-bold pointer-events-none`}>{table.table_number}.</div>
                          <div className="mt-2 flex flex-col items-center font-bold pointer-events-none">
                              <span className={`text-[8px] font-black ${table.status === 'occupied' ? 'text-white/80' : 'text-gray-400'} uppercase tracking-widest hidden sm:block`}>SEATS: {table.capacity}</span>
                              <div className={`mt-2 w-2 h-2 rounded-full ${table.status === 'available' ? 'bg-green-500' : 'bg-white shadow-[0_0_5px_rgba(255,255,255,0.8)]'}`}></div>
                          </div>
                          
                          {!isLayoutMode && (
                            <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
                                <button onClick={(e) => { e.stopPropagation(); setShowQrModal(table); }} className="p-1 sm:p-2 text-gray-400 hover:text-black bg-white/90 rounded"><QrCode size={14} /></button>
                                <button onClick={(e) => { e.stopPropagation(); handleDeleteTable(table.id); }} className="p-1 sm:p-2 text-red-300 hover:text-red-500 bg-white/90 rounded transition-all"><Trash size={14} /></button>
                            </div>
                          )}
                      </motion.div>
                  ))}
               </>
            )}
        </div>
      </div>

      {/* TABLE EDITOR (Slide-up or Full screen) */}
      {isEditorOpen && (
          <div className="fixed inset-0 z-[1200] flex items-center justify-end font-bold">
              <div className="absolute inset-0 bg-[#1A1A18]/40 backdrop-blur-md animate-in fade-in duration-300 font-bold" onClick={() => setIsEditorOpen(false)}></div>
              <div className="relative w-full sm:max-w-xl bg-white h-full shadow-2xl flex flex-col py-10 sm:py-20 px-6 sm:px-16 animate-in slide-in-from-right duration-500 font-bold overflow-y-auto no-scrollbar">
                  <header className="mb-10 sm:mb-16 flex justify-between items-start font-bold">
                      <div className="font-bold">
                          <h2 className="font-serif-luxury text-4xl sm:text-5xl font-light tracking-tighter text-[#1A1A18] border-none font-bold">SPATIAL ENTRY</h2>
                          <p className="text-[10px] font-black uppercase tracking-[0.4em] text-[#8C8A81] mt-4 font-bold font-bold font-bold">ARCHITECTURE • {editingTable.table_number || 'NEW'}</p>
                      </div>
                      <button onClick={() => setIsEditorOpen(false)} className="w-12 h-12 bg-gray-50 flex items-center justify-center font-bold font-bold"><X size={24} /></button>
                  </header>

                  <div className="space-y-8 font-bold font-bold font-bold">
                      <div className="space-y-3 font-bold border-none font-bold font-bold font-bold font-bold">
                          <label className="text-[10px] font-black uppercase tracking-[0.2em] text-[#1A1A18]/50 font-bold font-bold font-bold">{locale === 'en' ? 'TABLE IDENTIFIER / หมายเลขโต๊ะ' : locale === 'zh' ? 'TABLE IDENTIFIER / หมายเลขโต๊ะ' : 'TABLE IDENTIFIER / หมายเลขโต๊ะ'}</label>
                          <input type="text" value={editingTable.table_number} onChange={e => setEditingTable({...editingTable, table_number: e.target.value})} className="w-full bg-[#fcfcf9] border border-[#F0F0E8] py-5 px-6 text-sm outline-none focus:border-[#1A1A18] font-bold text-black font-bold font-bold font-bold font-bold" />
                      </div>
                      <div className="grid grid-cols-2 gap-6 font-bold border-none font-bold font-bold font-bold font-bold">
                        <div className="space-y-3 font-bold border-none font-bold font-bold font-bold font-bold font-bold">
                            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-[#1A1A18]/50 font-bold font-bold font-bold font-bold">SEATING CAPACITY</label>
                            <input type="number" value={editingTable.capacity} onChange={e => setEditingTable({...editingTable, capacity: Number(e.target.value)})} className="w-full bg-[#fcfcf9] border border-[#F0F0E8] py-5 px-6 text-sm outline-none font-bold text-black font-bold font-bold border-none font-bold" />
                        </div>
                        <div className="space-y-3 font-bold border-none font-bold font-bold font-bold font-bold font-bold">
                            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-[#1A1A18]/50 font-bold font-bold font-bold font-bold">{locale === 'en' ? 'ZONE / โซน' : locale === 'zh' ? 'ZONE / โซน' : 'ZONE / โซน'}</label>
                            <select value={editingTable.zone} onChange={e => setEditingTable({...editingTable, zone: e.target.value})} className="w-full bg-[#fcfcf9] border border-[#F0F0E8] py-5 px-6 text-sm outline-none font-bold text-black font-bold font-bold border-none font-bold font-bold">
                                <option value="Main">MAIN HALL</option>
                                <option value="Outdoor">OUTDOOR</option>
                                <option value="VIP">VIP LOUNGE</option>
                            </select>
                        </div>
                      </div>
                  </div>

                  <button onClick={handleSaveTable} disabled={isSaving} className="w-full mt-auto py-8 bg-[#1A1A18] text-white text-[11px] font-black uppercase tracking-[0.5em] transition-all font-bold">
                    {isSaving ? <Loader2 className="animate-spin text-white font-bold font-bold font-bold font-bold" /> : 'SAVE ARCHITECTURE'}
                  </button>
              </div>
          </div>
      )}

      {/* QR MODAL */}
      {showQrModal && (
        <div className="fixed inset-0 z-[3000] flex items-center justify-center">
           <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowQrModal(null)}></div>
           <div className="relative animate-in zoom-in-95 bg-white p-10 flex flex-col items-center justify-center shadow-2xl">
              <button onClick={() => setShowQrModal(null)} className="absolute top-4 right-4 p-2 text-gray-400 hover:text-black"><X size={24} /></button>
              <h3 className="text-xl font-black uppercase tracking-widest mb-2">Table {showQrModal.table_number}</h3>
              <p className="text-xs text-gray-500 mb-8 font-bold uppercase tracking-widest text-center">Scan to Order</p>
              
              <div className="bg-white p-4 border-4 border-black mb-8 rounded-xl">
                 <QRCodeCanvas 
                    id={`qr-canvas-${showQrModal.id}`}
                    value={`${typeof window !== 'undefined' ? window.location.origin : ''}/menu/${showQrModal.table_number}`} 
                    size={200}
                    level="L"
                 />
              </div>

              <div className="flex gap-2 w-full">
                 <button 
                    onClick={saveQrasPNG}
                    className="flex-1 flex items-center gap-2 px-4 py-4 bg-gray-100 text-[#1A1A18] font-black uppercase tracking-widest text-sm justify-center transition-transform active:scale-95 hover:bg-gray-200"
                 >
                    <Download size={18} />
                    Save PNG
                 </button>
                 <button 
                    onClick={() => { printTableQRCode(showQrModal); setShowQrModal(null); }}
                    className="flex-[2] flex items-center gap-3 px-8 py-4 bg-black text-white font-black uppercase tracking-widest text-sm justify-center transition-transform active:scale-95"
                 >
                    <Printer size={18} />
                    Print QR Code
                 </button>
              </div>
           </div>
        </div>
      )}

      {/* PRINT ALL QR TEMPLATE (Hidden from screen, visible on print) */}
      <div className="hidden print:block p-8">
         <h1 className="text-3xl font-black mb-8 text-center uppercase tracking-widest">Table QR Codes</h1>
         <div className="grid grid-cols-2 sm:grid-cols-3 gap-12">
            {tables.map(table => (
               <div key={`print-${table.id}`} className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-gray-300 break-inside-avoid">
                  <h3 className="text-2xl font-black uppercase tracking-widest mb-4">Table {table.table_number}</h3>
                  <QRCodeSVG 
                     value={`${typeof window !== 'undefined' ? window.location.origin : ''}/menu/${table.table_number}`} 
                     size={200}
                     level="L"
                  />
                  <p className="text-xs text-gray-500 mt-4 font-bold uppercase tracking-widest text-center">Scan to Order</p>
               </div>
            ))}
         </div>
      </div>

      <style jsx global>{`
          @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;1,300;1,400&family=Outfit:wght@200;300;400;500;900&family=Prompt:wght@200;300;400&display=swap');
          .font-serif-luxury { font-family: 'Cormorant Garamond', serif; }
          .no-scrollbar::-webkit-scrollbar { display: none; }
          .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </>
  )
}

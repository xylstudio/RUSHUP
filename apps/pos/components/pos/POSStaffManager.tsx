'use client';
import React, { useState, useEffect } from 'react'
import { 
  Plus, Search, Edit3, Trash2, Loader2, 
  ChevronRight, Save, LayoutGrid, X,
  Menu as MenuIcon, LogOut, Settings, Users,
  ShieldCheck, UserPlus, Phone, Mail,
  Calendar, Award, Briefcase, Trash
} from 'lucide-react'
import { supabase } from '@/lib/supabaseClient'
import Link from 'next/link'
import { useI18n } from "@/lib/I18nContext";

interface POSStaffManagerProps {
  profile: any
  activeView: string
  allowedNav: any[]
  onSetView: (view: any) => void
  onShiftModalOpen?: () => void
  activeShift?: any
  setViewExtraHeader: (node: React.ReactNode) => void
  shopSettings?: any
}

export default function POSStaffManager({ 
  profile, activeView, allowedNav, onSetView, onShiftModalOpen, activeShift, setViewExtraHeader, shopSettings
}: POSStaffManagerProps) {
    const { locale } = useI18n();
  const [staff, setStaff] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [isEditorOpen, setIsEditorOpen] = useState(false)
  const [editingStaff, setEditingStaff] = useState<any>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)

  useEffect(() => {
    fetchStaff()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shopSettings?.branch_id])

  useEffect(() => {
    setViewExtraHeader(null);
    return () => setViewExtraHeader(null);
  }, [setViewExtraHeader]);

  const fetchStaff = async () => {
    setLoading(true)
    const branchId = shopSettings?.branch_id

    if (branchId) {
      // Lookup branch_code for the active branch, then filter staff by branch_code
      const { data: branchData } = await supabase
        .from('branches')
        .select('branch_code')
        .eq('id', branchId)
        .maybeSingle()

      if (branchData?.branch_code) {
        const { data } = await supabase
          .from('profiles')
          .select('*')
          .eq('role', 'staff')
          .eq('staff_type', 'cafe')
          .eq('branch_code', branchData.branch_code)
          .order('display_name')
        if (data) setStaff(data)
        setLoading(false)
        return
      }
    }

    // Fallback: admin with no branch — show all cafe staff only
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('role', 'staff')
      .eq('staff_type', 'cafe')
      .order('display_name')
    if (data) setStaff(data)
    setLoading(false)
  }


  const handleUpdateStaff = async () => {
    setIsSaving(true)
    const { error } = await supabase.from('profiles').update({
        staff_level: editingStaff.staff_level,
        staff_type: editingStaff.staff_type,
        is_pos_account: editingStaff.is_pos_account
    }).eq('id', editingStaff.id)
    if (!error) {
        setIsEditorOpen(false)
        fetchStaff()
    }
    setIsSaving(false)
  }

  return (
    <>
      <div className="p-4 sm:p-10 font-bold overflow-y-auto no-scrollbar">

          {/* 2. MAIN STAFF GRID */}
          <div className="flex-1">
          {loading ? (
             <div className="h-full flex flex-col items-center justify-center opacity-20 font-bold">
                 <Loader2 className="animate-spin font-bold" size={48} />
             </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-8 font-bold">
                {staff.map(person => (
                    <div key={person.id} className="group bg-white border border-[#E5E5DF] p-8 sm:p-10 flex flex-col relative transition-all hover:shadow-2xl font-bold">
                        <div className="flex items-center gap-6 sm:gap-8 mb-8 sm:mb-10 font-bold border-none">
                            <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gray-50 flex items-center justify-center text-[#1A1A18] group-hover:bg-[#1A1A18] group-hover:text-white transition-all font-bold">
                                <span className="text-2xl font-black">{(person.display_name || person.full_name || '').slice(0,1).toUpperCase()}</span>
                            </div>
                            <div className="font-bold border-none">
                                <h4 className="text-base sm:text-lg font-black uppercase tracking-tighter text-[#1A1A18] font-bold border-none line-clamp-1 font-bold">{person.display_name || person.full_name || 'Staff'}</h4>
                                <p className="text-[8px] font-black uppercase tracking-[0.2em] text-sage-600 mt-1 font-bold border-none font-bold">AUTHENTICATED {person.staff_level?.toUpperCase()}</p>
                            </div>
                        </div>

                        <div className="space-y-4 flex-1 font-bold border-none">
                            <div className="flex items-center gap-3 text-gray-300 font-bold border-none">
                                <Briefcase size={14} /><span className="text-[9px] font-black uppercase tracking-widest font-bold border-none">{person.staff_type || 'GENERAL'}</span>
                            </div>
                            <div className="flex items-center gap-3 text-gray-300 font-bold border-none">
                                <Mail size={14} /><span className="text-[9px] font-black uppercase tracking-tight font-bold border-none">{person.id.slice(0,12)}</span>
                            </div>
                        </div>

                        <div className="mt-10 pt-6 border-t border-gray-50 flex justify-between items-center font-bold border-none">
                            <button 
                                onClick={() => { setEditingStaff(person); setIsEditorOpen(true); }}
                                className="h-10 px-6 sm:h-11 sm:px-8 bg-gray-50 text-[9px] font-black uppercase tracking-widest text-[#1A1A18] hover:bg-black hover:text-white transition-all font-bold"
                            >
                                ACCESS CONFIG
                            </button>
                            <div className="flex items-center gap-2">
                                {person.is_pos_account && <span className="text-[8px] font-black uppercase text-[#3A5A40]">POS ONLY</span>}
                                <div className={`w-2 h-2 rounded-none bg-green-500 font-bold`}></div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
          )}
          </div>
      </div>

      {/* STAFF EDITOR (Full width mobile) */}
      {isEditorOpen && (
          <div className="fixed inset-0 z-[1200] flex items-center justify-end font-bold">
              <div className="absolute inset-0 bg-[#1A1A18]/40 backdrop-blur-md animate-in fade-in duration-300 font-bold" onClick={() => setIsEditorOpen(false)}></div>
              <div className="relative w-full sm:max-w-xl bg-white h-full shadow-2xl flex flex-col py-10 sm:py-20 px-6 sm:px-16 animate-in slide-in-from-right duration-500 font-bold overflow-y-auto no-scrollbar">
                  <header className="mb-10 sm:mb-16 flex justify-between items-start font-bold">
                      <div className="font-bold border-none">
                          <h2 className="font-serif-luxury text-4xl sm:text-5xl font-light tracking-tighter text-[#1A1A18] border-none font-bold">ACCESS CONTROL</h2>
                          <p className="text-[10px] font-black uppercase tracking-[0.4em] text-[#8C8A81] mt-4 font-bold border-none">PERMISSIONS • {editingStaff.display_name || editingStaff.full_name || ''}</p>
                      </div>
                      <button onClick={() => setIsEditorOpen(false)} className="w-12 h-12 bg-gray-50 flex items-center justify-center font-bold font-bold"><X size={24} /></button>
                  </header>

                  <div className="space-y-12 font-bold">
                      <div className="space-y-3 font-bold border-none">
                          <label className="text-[10px] font-black uppercase tracking-[0.2em] text-[#1A1A18]/50 font-bold">{locale === 'en' ? 'ACCESS LEVEL / ระดับสิทธิ์' : locale === 'zh' ? 'ACCESS LEVEL / ระดับสิทธิ์' : 'ACCESS LEVEL / ระดับสิทธิ์'}</label>
                          <select value={editingStaff.staff_level || ''} onChange={e => setEditingStaff({...editingStaff, staff_level: e.target.value})} className="w-full bg-[#fcfcf9] border border-[#F0F0E8] py-5 px-6 text-sm outline-none font-black text-black font-bold border-none">
                              <option value="staff">STAFF</option>
                              <option value="manager">MANAGER</option>
                              <option value="admin">ADMINISTRATOR</option>
                          </select>
                      </div>
                      <div className="space-y-3 font-bold border-none">
                          <label className="text-[10px] font-black uppercase tracking-[0.2em] text-[#1A1A18]/50 font-bold">{locale === 'en' ? 'DUTY TYPE / ประเภทงาน' : locale === 'zh' ? 'DUTY TYPE / ประเภทงาน' : 'DUTY TYPE / ประเภทงาน'}</label>
                          <select value={editingStaff.staff_type || ''} onChange={e => setEditingStaff({...editingStaff, staff_type: e.target.value})} className="w-full bg-[#fcfcf9] border border-[#F0F0E8] py-5 px-6 text-sm outline-none font-black text-black font-bold border-none">
                              <option value="cafe">CAFE OPERATIONS</option>
                              <option value="general">GENERAL DUTY</option>
                          </select>
                      </div>
                      <div className="space-y-3 font-bold border-none pt-4">
                          <label className="text-[10px] font-black uppercase tracking-[0.2em] text-[#1A1A18]/50 font-bold">POS ONLY ACCOUNT / บัญชีประจำเครื่อง POS</label>
                          <div className="flex items-center gap-4">
                              <button
                                  onClick={() => setEditingStaff({...editingStaff, is_pos_account: !editingStaff.is_pos_account})}
                                  className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors ${editingStaff.is_pos_account ? 'bg-[#3A5A40]' : 'bg-gray-200'}`}
                              >
                                  <span className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${editingStaff.is_pos_account ? 'translate-x-7' : 'translate-x-1'}`} />
                              </button>
                              <span className="text-xs text-gray-400 font-bold">{editingStaff.is_pos_account ? 'เปิดใช้งาน (เข้า POS อัตโนมัติ)' : 'ปิดการใช้งาน'}</span>
                          </div>
                      </div>
                  </div>

                  <button onClick={handleUpdateStaff} disabled={isSaving} className="w-full mt-auto py-8 bg-[#1A1A18] text-white text-[11px] font-black uppercase tracking-[0.5em] transition-all font-bold">
                    {isSaving ? <Loader2 className="animate-spin text-white font-bold" /> : 'UPDATE PERMISSIONS'}
                  </button>
              </div>
          </div>
      )}

      <style jsx global>{`
          @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;1,300;1,400&family=Outfit:wght@200;300;400;500;900&family=Prompt:wght@200;300;400&display=swap');
          .font-serif-luxury { font-family: 'Cormorant Garamond', serif; }
          .no-scrollbar::-webkit-scrollbar { display: none; }
          .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </>
  )
}

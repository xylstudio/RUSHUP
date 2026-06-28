'use client';
import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabaseClient'
import { 
  Users, UserPlus, ShieldCheck, Search, 
  ChevronRight, Briefcase, MapPin, CheckCircle2,
  AlertCircle, Loader2, ArrowUpRight
} from 'lucide-react'
import { motion } from 'framer-motion'
import { useI18n } from "@/lib/I18nContext";

export default function AdminStaffPage() {
    const { locale } = useI18n();
  const [staff, setStaff] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [pendingCount, setPendingCount] = useState(0)

  useEffect(() => {
    fetchStaff()
    fetchPendingCount()
  }, [])

  const fetchStaff = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('role', 'staff')
      .order('display_name', { ascending: true })
    
    if (data) setStaff(data)
    setLoading(false)
  }

  const togglePosAccount = async (id: string, currentValue: boolean) => {
    const { error } = await supabase
      .from('profiles')
      .update({ is_pos_account: !currentValue })
      .eq('id', id)
    
    if (!error) {
      setStaff(staff.map(s => s.id === id ? { ...s, is_pos_account: !currentValue } : s))
    } else {
      alert('Failed to update POS account status')
    }
  }

  const fetchPendingCount = async () => {
    const { count } = await supabase
      .from('staff_identity')
      .select('*', { count: 'exact', head: true })
      .is('verified_at', null)
    
    setPendingCount(count || 0)
  }

  const filteredStaff = staff.filter(s => 
    s.display_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.staff_code?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="min-h-screen bg-[#FAFAF8] p-4 sm:p-10 font-bold">
      <div className="max-w-6xl mx-auto">
        
        {/* 1. HEADER SECTION */}
        <header className="mb-12 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-2">
            <div className="text-[10px] font-black uppercase tracking-[0.3em] text-[#3A5A40]">Staff Management</div>
            <h1 className="text-4xl font-black uppercase tracking-tight text-black">{locale === 'en' ? 'จัดการพนักงาน' : locale === 'zh' ? 'จัดการพนักงาน' : 'จัดการพนักงาน'}</h1>
            <p className="text-[12px] text-gray-400 font-bold">{locale === 'en' ? 'ดูแลข้อมูลพนักงาน ตรวจสอบการยืนยันตัวตน และสถานะการทำงาน' : locale === 'zh' ? 'ดูแลข้อมูลพนักงาน ตรวจสอบการยืนยันตัวตน และสถานะการทำงาน' : 'ดูแลข้อมูลพนักงาน ตรวจสอบการยืนยันตัวตน และสถานะการทำงาน'}</p>
          </div>

          <div className="flex flex-wrap gap-4">
             {/* 🔥 THE MAIN ENTRY TO VERIFICATION PAGE */}
             <Link 
                href="/dashboard/admin/staff/verification"
                className="relative group bg-white border border-amber-200 p-5 pr-16 hover:border-amber-500 transition-all shadow-sm"
             >
                <div className="text-[9px] font-black uppercase tracking-widest text-amber-600 mb-1">Pending Approval</div>
                <div className="text-[13px] font-black text-black">{locale === 'en' ? 'ตรวจสอบพนักงานใหม่' : locale === 'zh' ? 'ตรวจสอบพนักงานใหม่' : 'ตรวจสอบพนักงานใหม่'}</div>
                <div className="absolute right-5 top-1/2 -translate-y-1/2 w-8 h-8 bg-amber-500 text-white flex items-center justify-center font-black">
                    {pendingCount}
                </div>
                {pendingCount > 0 && (
                    <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-ping"></div>
                )}
             </Link>

             <button className="bg-black text-white px-8 py-5 flex items-center gap-3 hover:bg-[#333] transition-all">
                <UserPlus size={18} />
                <span className="text-[11px] font-black uppercase tracking-widest">{locale === 'en' ? 'Add employees' : locale === 'zh' ? '添加员工' : 'เพิ่มพนักงาน'}</span>
             </button>
          </div>
        </header>

        {/* 2. STATS ROW */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-12">
            <div className="bg-white border border-gray-100 p-8 shadow-sm">
                <div className="text-[10px] font-black uppercase tracking-widest text-gray-300 mb-4">{locale === 'en' ? 'All employees' : locale === 'zh' ? '全体员工' : 'พนักงานทั้งหมด'}</div>
                <div className="text-4xl font-black">{staff.length}</div>
            </div>
            <div className="bg-white border border-gray-100 p-8 shadow-sm">
                <div className="text-[10px] font-black uppercase tracking-widest text-gray-300 mb-4">{locale === 'en' ? 'ยืนยันตัวตนแล้ว' : locale === 'zh' ? 'ยืนยันตัวตนแล้ว' : 'ยืนยันตัวตนแล้ว'}</div>
                <div className="text-4xl font-black text-green-600">{staff.filter(s => s.is_verified).length}</div>
            </div>
            <div className="bg-white border border-gray-100 p-8 shadow-sm">
                <div className="text-[10px] font-black uppercase tracking-widest text-gray-300 mb-4">{locale === 'en' ? 'รอยืนยันตัวตน' : locale === 'zh' ? 'รอยืนยันตัวตน' : 'รอยืนยันตัวตน'}</div>
                <div className="text-4xl font-black text-amber-500">{staff.filter(s => !s.is_verified).length}</div>
            </div>
        </div>

        {/* 3. SEARCH & LIST */}
        <div className="bg-white border border-gray-100 shadow-xl overflow-hidden">
            <div className="p-6 border-b border-gray-50 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" size={18} />
                    <input 
                        type="text" 
                        placeholder={locale === 'en' ? 'ค้นหาพนักงานด้วยชื่อ หรือ รหัส...' : locale === 'zh' ? 'ค้นหาพนักงานด้วยชื่อ หรือ รหัส...' : 'ค้นหาพนักงานด้วยชื่อ หรือ รหัส...'} 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-gray-50 border-none py-4 pl-12 pr-4 text-sm font-bold focus:ring-1 focus:ring-black outline-none"
                    />
                </div>
                <div className="flex items-center gap-4 text-[10px] font-black uppercase tracking-widest text-gray-400">
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div> Verified
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-amber-500 rounded-full"></div> Unverified
                    </div>
                </div>
            </div>

            {loading ? (
                <div className="py-20 flex flex-col items-center justify-center gap-4">
                    <Loader2 className="animate-spin text-gray-200" size={48} />
                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-300">{locale === 'en' ? 'Loading data...' : locale === 'zh' ? '正在加载数据...' : 'กำลังโหลดข้อมูล...'}</p>
                </div>
            ) : filteredStaff.length === 0 ? (
                <div className="py-20 text-center">
                    <Users className="mx-auto text-gray-100 mb-4" size={64} />
                    <p className="text-gray-400 font-bold uppercase tracking-widest text-sm">{locale === 'en' ? 'Employee information not found' : locale === 'zh' ? '未找到员工信息' : 'ไม่พบข้อมูลพนักงาน'}</p>
                </div>
            ) : (
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-gray-50 text-[10px] font-black uppercase tracking-widest text-gray-400">
                                <th className="px-8 py-6">{locale === 'en' ? 'employee' : locale === 'zh' ? '员工' : 'พนักงาน'}</th>
                                <th className="px-8 py-6">{locale === 'en' ? 'ข้อมูลงาน' : locale === 'zh' ? 'ข้อมูลงาน' : 'ข้อมูลงาน'}</th>
                                <th className="px-8 py-6">POS Account</th>
                                <th className="px-8 py-6">{locale === 'en' ? 'การยืนยันตัวตน' : locale === 'zh' ? 'การยืนยันตัวตน' : 'การยืนยันตัวตน'}</th>
                                <th className="px-8 py-6">{locale === 'en' ? 'สาขา' : locale === 'zh' ? 'สาขา' : 'สาขา'}</th>
                                <th className="px-8 py-6">{locale === 'en' ? 'จัดการ' : locale === 'zh' ? 'จัดการ' : 'จัดการ'}</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {filteredStaff.map((s) => (
                                <tr key={s.id} className="group hover:bg-gray-50/50 transition-colors">
                                    <td className="px-8 py-6">
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 bg-gray-100 text-gray-400 flex items-center justify-center rounded-xl text-lg font-light overflow-hidden">
                                                {s.display_name?.slice(0,1).toUpperCase() || <Users size={20} />}
                                            </div>
                                            <div>
                                                <div className="text-[14px] font-black text-black group-hover:text-[#3A5A40] transition-colors">{s.display_name || 'พนักงาน'}</div>
                                                <div className="text-[10px] text-gray-400 font-mono mt-0.5">{s.staff_code || 'No Staff ID'}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-8 py-6">
                                        <div className="flex flex-col gap-1">
                                            <span className="text-[11px] font-black uppercase text-gray-600 flex items-center gap-2">
                                                <Briefcase size={12} className="text-gray-300" />
                                                {s.staff_type || 'General Staff'}
                                            </span>
                                            <span className="text-[9px] text-gray-400 font-bold">{s.email}</span>
                                        </div>
                                    </td>
                                    <td className="px-8 py-6">
                                        <button
                                            onClick={() => togglePosAccount(s.id, !!s.is_pos_account)}
                                            className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${s.is_pos_account ? 'bg-[#3A5A40]' : 'bg-gray-200'}`}
                                        >
                                            <span className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${s.is_pos_account ? 'translate-x-5' : 'translate-x-1'}`} />
                                        </button>
                                        {s.is_pos_account && <div className="text-[8px] font-black uppercase text-[#3A5A40] mt-1">POS ONLY</div>}
                                    </td>
                                    <td className="px-8 py-6">
                                        {s.is_verified ? (
                                            <div className="flex items-center gap-2 text-green-600">
                                                <CheckCircle2 size={16} />
                                                <span className="text-[10px] font-black uppercase tracking-widest">Verified</span>
                                            </div>
                                        ) : (
                                            <div className="flex items-center gap-2 text-amber-500">
                                                <AlertCircle size={16} />
                                                <span className="text-[10px] font-black uppercase tracking-widest">Unverified</span>
                                            </div>
                                        )}
                                    </td>
                                    <td className="px-8 py-6">
                                        <div className="flex items-center gap-2 text-gray-500 text-[11px] font-black uppercase">
                                            <MapPin size={12} className="text-gray-300" />
                                            {s.branch_code || 'Headquarter'}
                                        </div>
                                    </td>
                                    <td className="px-8 py-6">
                                        <Link 
                                            href={`/dashboard/admin/staff/${s.id}`}
                                            className="w-10 h-10 border border-gray-100 flex items-center justify-center hover:bg-black hover:text-white transition-all bg-white shadow-sm"
                                        >
                                            <ArrowUpRight size={16} />
                                        </Link>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
      </div>
    </div>
  )
}
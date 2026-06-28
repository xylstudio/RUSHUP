'use client';
import React, { useState, useEffect } from 'react'
import { MapPin, X, Loader2, Store } from 'lucide-react'
import { supabase } from '@/lib/supabaseClient'
import { useI18n } from "@/lib/I18nContext";

interface Branch {
    id: string
    branch_name: string
    branch_code: string
}

interface POSBranchSelectModalProps {
    isOpen: boolean
    onClose: () => void
    onSelect: (branchId: string) => void
    currentBranchId?: string
}

export default function POSBranchSelectModal({ isOpen, onClose, onSelect, currentBranchId }: POSBranchSelectModalProps) {
    const { locale } = useI18n();
    const [branches, setBranches] = useState<Branch[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        if (isOpen) {
            fetchBranches()
        }
    }, [isOpen])

    const fetchBranches = async () => {
        setLoading(true)
        const { data, error } = await supabase
            .from('branches')
            .select('id, branch_name, branch_code')
            .order('created_at', { ascending: true })
        
        if (data) {
            setBranches(data)
        }
        setLoading(false)
    }

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 z-[3000] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose}></div>
            <div className="relative w-full max-w-md bg-white rounded-none shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                <header className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                    <div>
                        <h3 className="text-xl font-black uppercase tracking-tight flex items-center gap-2">
                            <Store size={20} className="text-sage-600" />
                            {locale === 'en' ? '                             เลือกสาขา ' : locale === 'zh' ? '                             เลือกสาขา ' : '                             เลือกสาขา '}<span className="text-sage-600">Branch</span>
                        </h3>
                        <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mt-1">
                            {locale === 'en' ? '                             เลือกระบบจัดการของสาขาที่ต้องการ                         ' : locale === 'zh' ? '                             เลือกระบบจัดการของสาขาที่ต้องการ                         ' : '                             เลือกระบบจัดการของสาขาที่ต้องการ                         '}</p>
                    </div>
                    <button onClick={onClose} className="p-3 bg-white border border-gray-100 hover:bg-gray-50 transition-all rounded-none">
                        <X size={18} />
                    </button>
                </header>

                <div className="p-6 max-h-[60vh] overflow-y-auto space-y-3">
                    {loading ? (
                        <div className="py-12 flex justify-center">
                            <Loader2 className="animate-spin text-sage-500" />
                        </div>
                    ) : branches.length > 0 ? (
                        branches.map(branch => (
                            <button
                                key={branch.id}
                                onClick={() => onSelect(branch.id)}
                                className={`w-full flex items-center justify-between p-5 border transition-all group ${
                                    currentBranchId === branch.id 
                                        ? 'border-sage-500 bg-sage-50' 
                                        : 'border-gray-100 hover:border-black bg-white hover:bg-gray-50'
                                }`}
                            >
                                <div className="flex items-center gap-4 text-left">
                                    <div className={`w-10 h-10 flex items-center justify-center font-black rounded-none ${
                                        currentBranchId === branch.id ? 'bg-sage-600 text-white' : 'bg-gray-100 text-gray-500 group-hover:bg-black group-hover:text-white transition-all'
                                    }`}>
                                        <MapPin size={18} />
                                    </div>
                                    <div>
                                        <div className="font-black text-sm uppercase">{branch.branch_name || 'ไม่ระบุชื่อสาขา'}</div>
                                        <div className="text-[10px] text-gray-400 font-bold tracking-widest uppercase">
                                            {locale === 'en' ? '                                             รหัสสาขา: ' : locale === 'zh' ? '                                             รหัสสาขา: ' : '                                             รหัสสาขา: '}{branch.branch_code || '-'}
                                        </div>
                                    </div>
                                </div>
                                {currentBranchId === branch.id && (
                                    <span className="text-[10px] font-black bg-sage-600 text-white px-2 py-1 uppercase tracking-widest">
                                        {locale === 'en' ? '                                         กำลังใช้งาน                                     ' : locale === 'zh' ? '                                         กำลังใช้งาน                                     ' : '                                         กำลังใช้งาน                                     '}</span>
                                )}
                            </button>
                        ))
                    ) : (
                        <div className="py-8 text-center text-gray-400 text-xs font-black uppercase tracking-widest">
                            {locale === 'en' ? '                             ไม่พบข้อมูลสาขา                         ' : locale === 'zh' ? '                             ไม่พบข้อมูลสาขา                         ' : '                             ไม่พบข้อมูลสาขา                         '}</div>
                    )}
                </div>
            </div>
        </div>
    )
}

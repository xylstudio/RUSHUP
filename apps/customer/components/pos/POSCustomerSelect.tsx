'use client';
import React, { useState, useEffect } from 'react'
import { Users, Search, QrCode, Phone, ChevronRight, UserPlus, Loader2, Star, Coffee, X, Layers } from 'lucide-react'
import { supabase } from '@/lib/supabaseClient'
import { useI18n } from "@/lib/I18nContext";

interface Customer {
    id: string
    display_name?: string
    full_name?: string
    avatar_url?: string
    phone: string
    email: string
    points: number
    tier: string
}

interface POSCustomerSelectProps {
    onSelect: (customer: Customer | null) => void
    selectedCustomer: Customer | null
    onClose: () => void
    onManage?: () => void
    shopSettings?: any
}

export default function POSCustomerSelect({ onSelect, selectedCustomer, onClose, onManage, shopSettings }: POSCustomerSelectProps) {
    const { locale } = useI18n();
    const [searchTerm, setSearchTerm] = useState('')
    const [customers, setCustomers] = useState<Customer[]>([])
    const [loading, setLoading] = useState(false)
    const [isCreating, setIsCreating] = useState(false)
    const [newCustomer, setNewCustomer] = useState({ name: '', phone: '', email: '' })

    useEffect(() => {
        if (searchTerm.length >= 2) {
            searchCustomers()
        } else if (searchTerm.length === 0) {
            fetchRecentCustomers()
        }
    }, [searchTerm])

    const searchCustomers = async () => {
        setLoading(true)
        const branchId = shopSettings?.shared_member_branch_id || shopSettings?.branch_id

        let query = supabase
            .from('pos_members')
            .select('*')
            .or(`display_name.ilike.%${searchTerm}%,full_name.ilike.%${searchTerm}%,phone.ilike.%${searchTerm}%`)

        if (branchId) {
            query = query.eq('branch_id', branchId)
        } else {
            query = query.is('branch_id', null)
        }
            
        const { data } = await query.limit(5)
        
        if (data) setCustomers(data)
        setLoading(false)
    }

    const fetchRecentCustomers = async () => {
        setLoading(true)
        const branchId = shopSettings?.shared_member_branch_id || shopSettings?.branch_id
        
        let query = supabase
            .from('pos_members')
            .select('*')
            .order('updated_at', { ascending: false })
            
        if (branchId) {
            query = query.eq('branch_id', branchId)
        } else {
            query = query.is('branch_id', null)
        }
            
        const { data } = await query.limit(5)
        
        if (data) setCustomers(data)
        setLoading(false)
    }

    const handleCreateCustomer = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        const { data, error } = await supabase
            .from('pos_members')
            .insert({
                display_name: newCustomer.name,
                full_name: newCustomer.name,
                phone: newCustomer.phone,
                email: newCustomer.email,
                branch_id: shopSettings?.shared_member_branch_id || shopSettings?.branch_id || null
            })
            .select()
            .single()
        
        if (data) {
            onSelect(data)
            onClose()
        } else if (error) {
            alert('Error creating customer: ' + error.message)
        }
        setLoading(false)
    }

    return (
        <div className="fixed inset-0 z-[1200] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={onClose} />
            <div className="relative w-full max-w-lg bg-white rounded-none shadow-4xl overflow-hidden animate-in zoom-in-95 duration-200">
                <header className="p-8 border-b border-gray-50 flex justify-between items-center">
                    <div>
                        <h3 className="text-2xl font-black uppercase tracking-tighter">{locale === 'en' ? 'Loyalty ' : locale === 'zh' ? '会员系统 ' : 'ระบบสมาชิก '}<span className="text-sage-600">Loyalty</span></h3>
                        <p className="text-[9px] font-black uppercase tracking-widest text-gray-300 mt-1">{locale === 'en' ? 'Search or register member' : locale === 'zh' ? '搜索或注册会员' : 'ค้นหาหรือลงทะเบียนสมาชิกใหม่'}</p>
                    </div>
                    <button onClick={onClose} className="p-4 bg-gray-50 rounded-none hover:bg-gray-100 transition-all"><X size={20} /></button>
                </header>

                <div className="p-8 space-y-6">
                    {!isCreating ? (
                        <>
                            <div className="relative group">
                                <Search size={18} className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-300 group-focus-within:text-sage-600 transition-colors" />
                                <input 
                                    autoFocus
                                    type="text" 
                                    placeholder={locale === 'en' ? 'Search by name or phone (08x...)' : locale === 'zh' ? '用姓名或电话搜索' : 'ค้นหาด้วยชื่อหรือเบอร์โทร (08x...)'} 
                                    className="w-full bg-gray-50 border-none py-5 pl-14 pr-6 rounded-none text-sm font-bold placeholder:text-gray-300 outline-none focus:ring-2 focus:ring-black transition-all"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>

                            <div className="space-y-3 max-h-60 overflow-y-auto no-scrollbar">
                                {loading && customers.length === 0 ? (
                                    <div className="py-10 flex justify-center"><Loader2 className="animate-spin text-sage-500" /></div>
                                ) : customers.length > 0 ? (
                                    customers.map(c => (
                                        <button 
                                            key={c.id}
                                            onClick={() => { onSelect(c); onClose(); }}
                                            className="w-full flex items-center justify-between p-5 bg-white border border-gray-100 rounded-none hover:border-black hover:bg-gray-50 transition-all group"
                                        >
                                            <div className="flex items-center gap-4">
                                                <div className="w-12 h-12 rounded-none bg-sage-50 text-sage-600 flex items-center justify-center font-black overflow-hidden">
                                                    {c.avatar_url ? (
                                                        <img src={c.avatar_url} alt={c.display_name} className="w-full h-full object-cover" />
                                                    ) : (
                                                        (c.display_name || c.full_name || 'M').slice(0,1)
                                                    )}
                                                </div>
                                                <div className="text-left font-bold">
                                                    <div className="text-sm font-black uppercase tracking-tight">{c.display_name || c.full_name}</div>
                                                    <div className="text-[10px] text-gray-400 font-bold flex items-center gap-2">
                                                        <Phone size={10} /> {c.phone || 'ไม่ระบุเบอร์'}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <div className="text-right pr-3 border-r border-gray-100 flex flex-col justify-center">
                                                    <div className="flex items-center justify-end gap-0.5 mb-1">
                                                        {[...Array(5)].map((_, i) => {
                                                            const stampCount = Math.floor(c.points / 100);
                                                            const isFilled = i < (stampCount % 5);
                                                            return <div key={i} className={`w-1 h-1 rounded-none ${isFilled ? 'bg-sage-500' : 'bg-gray-100'}`} />
                                                        })}
                                                    </div>
                                                    <div className="text-[11px] font-black">{c.points.toLocaleString()} {locale === 'en' ? ' points' : locale === 'zh' ? ' 积分' : ' คะแนน'}</div>
                                                </div>
                                                <ChevronRight size={16} className="text-gray-200 group-hover:text-black" />
                                            </div>
                                        </button>
                                    ))
                                ) : searchTerm.length >= 2 ? (
                                    <div className="py-10 text-center text-gray-300 text-xs font-bold uppercase tracking-widest">{locale === 'en' ? 'Member not found' : locale === 'zh' ? '未找到会员' : 'ไม่พบสมาชิกในระบบ'}</div>
                                ) : null}
                            </div>

                            <button 
                                onClick={() => setIsCreating(true)}
                                className="w-full py-5 border-2 border-dashed border-gray-100 text-gray-400 rounded-none text-xs font-black uppercase tracking-widest hover:border-black hover:text-black transition-all flex items-center justify-center gap-2"
                            >
                                <UserPlus size={18} /> {locale === 'en' ? 'Register new member' : locale === 'zh' ? '注册新会员' : 'ลงทะเบียนสมาชิกใหม่'}
                            </button>

                            {onManage && (
                                <button 
                                    onClick={onManage}
                                    className="w-full py-4 text-sage-600 text-[10px] font-black uppercase tracking-widest hover:underline flex items-center justify-center gap-2"
                                >
                                    <Layers size={14} /> {locale === 'en' ? 'Manage all member databases' : locale === 'zh' ? '管理所有会员数据库' : 'จัดการฐานข้อมูลสมาชิกทั้งหมด'}
                                </button>
                            )}
                        </>
                    ) : (
                        <form onSubmit={handleCreateCustomer} className="space-y-5 animate-in slide-in-from-bottom-5 duration-300">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-4 font-bold">{locale === 'en' ? 'First and last name' : locale === 'zh' ? '名字和姓氏' : 'ชื่อ-นามสกุล'}</label>
                                <input 
                                    required
                                    type="text" 
                                    className="w-full bg-gray-50 border-none py-4 px-6 rounded-none text-sm font-bold outline-none focus:ring-1 focus:ring-black"
                                    value={newCustomer.name}
                                    onChange={e => setNewCustomer({...newCustomer, name: e.target.value})}
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-4 font-bold">{locale === 'en' ? 'Phone number' : locale === 'zh' ? '电话号码' : 'เบอร์โทรศัพท์ติดต่อ'}</label>
                                <input 
                                    required
                                    type="tel" 
                                    className="w-full bg-gray-50 border-none py-4 px-6 rounded-none text-sm font-bold outline-none focus:ring-1 focus:ring-black"
                                    value={newCustomer.phone}
                                    onChange={e => setNewCustomer({...newCustomer, phone: e.target.value})}
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-4 font-bold">{locale === 'en' ? 'Email (Optional)' : locale === 'zh' ? '邮箱(可选)' : 'อีเมล (ถ้ามี)'}</label>
                                <input 
                                    type="email" 
                                    className="w-full bg-gray-50 border-none py-4 px-6 rounded-none text-sm font-bold outline-none focus:ring-1 focus:ring-black"
                                    value={newCustomer.email}
                                    onChange={e => setNewCustomer({...newCustomer, email: e.target.value})}
                                />
                            </div>
                            
                            <div className="grid grid-cols-2 gap-4 pt-4">
                                <button 
                                    type="button"
                                    onClick={() => setIsCreating(false)}
                                    className="py-5 bg-gray-50 text-gray-400 text-xs font-black uppercase tracking-widest rounded-none"
                                >
                                    {locale === 'en' ? 'Cancel' : locale === 'zh' ? '取消' : 'ยกเลิก'}
                                </button>
                                <button 
                                    disabled={loading}
                                    type="submit"
                                    className="py-5 bg-black text-white text-xs font-black uppercase tracking-widest rounded-none shadow-xl flex items-center justify-center gap-2"
                                >
                                    {loading ? <Loader2 className="animate-spin" /> : (locale === 'en' ? 'Register' : locale === 'zh' ? '注册' : 'ลงทะเบียนและเลือก')}
                                </button>
                            </div>
                        </form>
                    )}
                </div>

                {selectedCustomer && (
                    <footer className="p-8 bg-sage-50 border-t border-sage-100 flex items-center justify-between">
                          <div className="flex items-center gap-4">
                             <div className="w-10 h-10 rounded-none bg-sage-600 text-white flex items-center justify-center font-black text-xs uppercase overflow-hidden">
                                {selectedCustomer.avatar_url ? (
                                    <img src={selectedCustomer.avatar_url} alt={selectedCustomer.display_name} className="w-full h-full object-cover" />
                                ) : (
                                    (selectedCustomer.display_name || selectedCustomer.full_name || 'M').slice(0,1)
                                )}
                             </div>
                             <div>
                                 <div className="text-[10px] font-black uppercase tracking-widest text-sage-600">{locale === 'en' ? 'Selected Member' : locale === 'zh' ? '已选会员' : 'สมาชิกที่เลือก'}</div>
                                 <div className="text-xs font-black uppercase">{selectedCustomer.display_name || selectedCustomer.full_name}</div>
                             </div>
                          </div>
                         <button onClick={() => onSelect(null)} className="text-[10px] font-black uppercase text-red-500 underline underline-offset-4">{locale === 'en' ? 'Deselect' : locale === 'zh' ? '取消选择' : 'ยกเลิกการเลือก'}</button>
                    </footer>
                )}
            </div>
        </div>
    )
}

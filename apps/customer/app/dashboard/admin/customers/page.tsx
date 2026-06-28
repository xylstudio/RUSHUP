'use client';
import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabaseClient'
import { 
  Users, 
  Search, 
  Home, 
  Calendar, 
  ChevronRight,
  UserPlus,
  Filter
} from 'lucide-react'
import { useI18n } from "@/lib/I18nContext";

interface Customer {
  id: string
  display_name: string
  email: string
  customer_base_code: string
  created_at: string
  house_count: number
  active_plans_count: number
}

export default function AdminCustomersPage() {
    const { locale } = useI18n();
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    fetchCustomers()
  }, [])

  async function fetchCustomers() {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/customers')
      if (!res.ok) throw new Error('Failed to fetch customers')
      const json = await res.json()
      setCustomers(json.data || [])
    } catch (error) {
      console.error('Error fetching customers:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredCustomers = customers.filter(c => 
    c.display_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.customer_base_code?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  if (loading && customers.length === 0) return (
    <div className="flex items-center justify-center min-h-screen bg-[#FAFAF8] font-serif-thai z-[200]">
      <div className="flex flex-col items-center gap-6">
        <div className="animate-spin h-8 w-8 border-4 border-[#1A1A1A] border-t-transparent"></div>
        <div className="text-center">
          <p className="text-[10px] font-black uppercase tracking-widest text-[#A3A3A3] mb-4">{locale === 'en' ? 'กำลังโหลดรายชื่อลูกค้า...' : locale === 'zh' ? 'กำลังโหลดรายชื่อลูกค้า...' : 'กำลังโหลดรายชื่อลูกค้า...'}</p>
        </div>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-[#FAFAF8] p-4 md:p-8 font-serif-thai">
      {/* Header */}
      <div className="mb-10">
        <div className="flex items-center gap-2 mb-4">
          <div className="h-[1px] w-8 bg-[#1A1A1A]"></div>
          <span className="text-[10px] font-black uppercase tracking-[0.3em] text-[#1A1A1A]">{locale === 'en' ? 'ระบบบริหารจัดการลูกค้า (CRM)' : locale === 'zh' ? 'ระบบบริหารจัดการลูกค้า (CRM)' : 'ระบบบริหารจัดการลูกค้า (CRM)'}</span>
        </div>
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <h1 className="text-4xl font-light tracking-tight text-[#1A1A1A] mb-2">{locale === 'en' ? 'รายชื่อลูกค้า' : locale === 'zh' ? 'รายชื่อลูกค้า' : 'รายชื่อลูกค้า'}</h1>
            <p className="text-sm text-[#70706B] uppercase tracking-widest font-medium">Customer Relationship Management</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#A3A3A3]" />
              <input 
                type="text"
                placeholder={locale === 'en' ? 'ค้นหาลูกค้า...' : locale === 'zh' ? 'ค้นหาลูกค้า...' : 'ค้นหาลูกค้า...'}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 bg-white border border-[#E5E5DF] text-sm focus:outline-none focus:border-[#1A1A1A] transition-colors w-64 rounded-none"
              />
            </div>
            <button className="bg-[#1A1A1A] text-white p-2 hover:bg-[#333] transition-colors rounded-none">
              <Filter className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
        {[
          { label: 'ลูกค้าทั้งหมด', value: customers.length, icon: Users },
          { label: 'จำนวนบ้านทั้งหมด', value: customers.reduce((acc, c) => acc + c.house_count, 0), icon: Home },
          { label: 'แผนที่ใช้งานอยู่', value: customers.reduce((acc, c) => acc + c.active_plans_count, 0), icon: Calendar },
          { label: 'สมาชิกใหม่เดือนนี้', value: 0, icon: UserPlus },
        ].map((stat, i) => (
          <div key={i} className="bg-white border border-[#E5E5DF] p-6">
            <div className="flex items-start justify-between mb-4">
              <stat.icon className="h-4 w-4 text-[#A3A3A3]" />
              <span className="text-[10px] font-bold text-[#D4D4D4] font-mono">0{(i+1)}</span>
            </div>
            <p className="text-[10px] font-black uppercase tracking-widest text-[#A3A3A3] mb-1">{stat.label}</p>
            <p className="text-2xl font-light text-[#1A1A1A]">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white border border-[#E5E5DF] overflow-hidden">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-[#F1F1EB] bg-[#FAFAF8]">
              <th className="px-6 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-[#A3A3A3]">{locale === 'en' ? 'ข้อมูลลูกค้า' : locale === 'zh' ? 'ข้อมูลลูกค้า' : 'ข้อมูลลูกค้า'}</th>
              <th className="px-6 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-[#A3A3A3]">{locale === 'en' ? 'รหัสลูกค้า' : locale === 'zh' ? 'รหัสลูกค้า' : 'รหัสลูกค้า'}</th>
              <th className="px-6 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-[#A3A3A3]">{locale === 'en' ? 'บ้าน/อาคาร' : locale === 'zh' ? 'บ้าน/อาคาร' : 'บ้าน/อาคาร'}</th>
              <th className="px-6 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-[#A3A3A3]">{locale === 'en' ? 'สถานะแผนบริการ' : locale === 'zh' ? 'สถานะแผนบริการ' : 'สถานะแผนบริการ'}</th>
              <th className="px-6 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-[#A3A3A3] text-right">{locale === 'en' ? 'จัดการ' : locale === 'zh' ? 'จัดการ' : 'จัดการ'}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#F1F1EB]">
            {loading ? (
              [...Array(5)].map((_, i) => (
                <tr key={i} className="animate-pulse">
                  <td colSpan={5} className="px-6 py-8 h-16 bg-gray-50/50"></td>
                </tr>
              ))
            ) : filteredCustomers.map((customer) => (
              <tr key={customer.id} className="group hover:bg-[#FAFAF8] transition-colors">
                <td className="px-6 py-6">
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 bg-[#1A1A1A] text-white flex items-center justify-center text-xs font-bold">
                      {customer.display_name?.charAt(0) || 'U'}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-[#1A1A1A] group-hover:text-[#666] transition-colors uppercase tracking-wider">
                        {customer.display_name}
                      </p>
                      <p className="text-xs text-[#A3A3A3] font-mono">{customer.email}</p>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-6">
                  <span className="text-xs font-mono text-[#666666] border border-[#E5E5DF] px-2 py-1 bg-white">
                    {customer.customer_base_code || '-'}
                  </span>
                </td>
                <td className="px-6 py-6">
                  <div className="flex items-center gap-2">
                    <Home className="h-3 w-3 text-[#A3A3A3]" />
                    <span className="text-sm text-[#1A1A1A]">{customer.house_count} {locale === 'en' ? 'behind' : locale === 'zh' ? '在后面' : ' หลัง'}</span>
                  </div>
                </td>
                <td className="px-6 py-6">
                  <div className="flex items-center gap-2">
                    <div className={`h-1.5 w-1.5 rounded-full ${customer.active_plans_count > 0 ? 'bg-green-500' : 'bg-[#D4D4D4]'}`}></div>
                    <span className="text-xs font-bold uppercase tracking-wider text-[#666]">
                      {customer.active_plans_count > 0 ? `${customer.active_plans_count} แผนที่ใช้งานอยู่` : 'ยังไม่มีแผนบริการ'}
                    </span>
                  </div>
                </td>
                <td className="px-6 py-6 text-right">
                  <Link 
                    href={`/dashboard/admin/customers/${customer.id}`}
                    className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-[#1A1A1A] hover:gap-4 transition-all"
                  >
                    {locale === 'en' ? 'View details' : locale === 'zh' ? '查看详情' : '                     ดูรายละเอียด '}<ChevronRight className="h-3 w-3" />
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        
        {!loading && filteredCustomers.length === 0 && (
          <div className="p-20 text-center">
            <p className="text-sm text-[#A3A3A3] uppercase tracking-widest">{locale === 'en' ? 'No customer information found.' : locale === 'zh' ? '没有找到客户信息。' : 'ไม่พบข้อมูลลูกค้า'}</p>
          </div>
        )}
      </div>
    </div>
  )
}
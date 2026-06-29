'use client';

import React, { useEffect, useState } from 'react'
import {
  X, Plus, Trash2, Edit2, Loader2, Tag, AlertCircle, Save
} from 'lucide-react'
import { supabase, getBranches, type Branch } from '@/lib/supabaseClient'
import { motion, AnimatePresence } from 'framer-motion'

interface Promotion {
  id: string;
  branch_id: string | null;
  name: string;
  description: string | null;
  discount_type: 'fixed' | 'percent';
  discount_value: number;
  is_active: boolean;
  start_date: string | null;
  end_date: string | null;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onPromotionsChanged: () => void;
  shopSettings: any;
}

export default function POSPromotionsModal({ isOpen, onClose, onPromotionsChanged, shopSettings }: Props) {
  const [promotions, setPromotions] = useState<Promotion[]>([])
  const [branches, setBranches] = useState<Branch[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formData, setFormData] = useState<Partial<Promotion>>({
    name: '',
    discount_type: 'fixed',
    discount_value: 0,
    is_active: true,
    branch_id: shopSettings?.branch_id || null
  })

  useEffect(() => {
    if (isOpen) {
      fetchData()
    }
  }, [isOpen])

  const fetchData = async () => {
    setLoading(true)
    setError(null)
    try {
      const { data: branchData } = await getBranches()
      if (branchData) setBranches(branchData)

      let query = supabase.from('pos_promotions').select('*').order('created_at', { ascending: false })
      if (shopSettings?.branch_id) {
          query = query.or(`branch_id.eq.${shopSettings.branch_id},branch_id.is.null`)
      }
      const { data: promoData, error: promoError } = await query
      
      if (promoError) throw promoError
      setPromotions(promoData || [])
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleOpenForm = (promo?: Promotion) => {
    if (promo) {
      setEditingId(promo.id)
      setFormData({
        name: promo.name,
        discount_type: promo.discount_type,
        discount_value: promo.discount_value,
        is_active: promo.is_active,
        branch_id: promo.branch_id
      })
    } else {
      setEditingId(null)
      setFormData({
        name: '',
        discount_type: 'fixed',
        discount_value: 0,
        is_active: true,
        branch_id: shopSettings?.branch_id || null
      })
    }
    setIsFormOpen(true)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.name || !formData.discount_value) return
    
    setSaving(true)
    try {
      const payload = {
        ...formData,
      }

      if (editingId) {
        const { error } = await supabase.from('pos_promotions').update(payload).eq('id', editingId)
        if (error) throw error
      } else {
        const { error } = await supabase.from('pos_promotions').insert([payload])
        if (error) throw error
      }
      
      setIsFormOpen(false)
      fetchData()
      onPromotionsChanged()
    } catch (err: any) {
      alert('Error: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('ยืนยันการลบโปรโมชั่นนี้?')) return
    try {
      const { error } = await supabase.from('pos_promotions').delete().eq('id', id)
      if (error) throw error
      fetchData()
      onPromotionsChanged()
    } catch (err: any) {
      alert('Error: ' + err.message)
    }
  }

  const toggleStatus = async (id: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase.from('pos_promotions').update({ is_active: !currentStatus }).eq('id', id)
      if (error) throw error
      setPromotions(prev => prev.map(p => p.id === id ? { ...p, is_active: !currentStatus } : p))
      onPromotionsChanged()
    } catch (err: any) {
      alert('Error: ' + err.message)
    }
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        className="w-full max-w-4xl overflow-hidden rounded-[2rem] bg-[#FAFAFA] shadow-2xl flex flex-col h-[85vh] relative"
      >
        <div className="p-6 sm:p-8 flex items-center justify-between border-b border-[#E5E5E5] bg-white shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
              <Tag size={24} />
            </div>
            <div>
              <h3 className="text-2xl font-black text-[#1A1A18] uppercase tracking-tight">
                Promotions
              </h3>
              <p className="text-xs font-bold text-gray-400 mt-0.5">จัดการโปรโมชั่นส่วนลดในระบบ</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            {!isFormOpen && (
              <button
                onClick={() => handleOpenForm()}
                className="flex items-center gap-2 rounded-xl bg-[#1A1A18] px-5 py-3 text-[11px] font-black uppercase tracking-widest text-white transition-all hover:bg-[#333333] active:scale-95"
              >
                <Plus size={16} />
                สร้างโปรใหม่
              </button>
            )}
            <button
              onClick={() => {
                if (isFormOpen) setIsFormOpen(false)
                else onClose()
              }}
              className="flex h-12 w-12 items-center justify-center rounded-xl bg-gray-100 text-gray-500 transition-all hover:bg-gray-200 hover:text-black"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 sm:p-8 custom-scrollbar">
          {error && (
            <div className="mb-6 p-4 border border-red-200 bg-red-50 text-red-700 text-sm flex items-start gap-3 rounded-xl">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">System Error</p>
                <p>{error}</p>
              </div>
            </div>
          )}

          {isFormOpen ? (
            <div className="max-w-2xl mx-auto bg-white p-8 rounded-2xl border border-[#E5E5E5] shadow-sm">
              <h4 className="text-lg font-black uppercase mb-6">{editingId ? 'แก้ไขโปรโมชั่น' : 'สร้างโปรโมชั่นใหม่'}</h4>
              <form id="promoForm" onSubmit={handleSave} className="space-y-6">
                <div>
                  <label className="mb-2 block text-[11px] font-black uppercase tracking-widest text-gray-400">ชื่อโปรโมชั่น *</label>
                  <input
                    required
                    type="text"
                    value={formData.name || ''}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                    placeholder="เช่น ลด 10% ฉลองเปิดร้าน"
                    className="w-full rounded-xl border border-gray-200 bg-gray-50 p-4 font-bold text-[#1A1A18] transition-all focus:border-[#1A1A18] focus:bg-white focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="mb-2 block text-[11px] font-black uppercase tracking-widest text-gray-400">ประเภทส่วนลด</label>
                    <select
                      value={formData.discount_type}
                      onChange={e => setFormData({ ...formData, discount_type: e.target.value as any })}
                      className="w-full rounded-xl border border-gray-200 bg-gray-50 p-4 font-bold text-[#1A1A18] transition-all focus:border-[#1A1A18] focus:bg-white focus:outline-none"
                    >
                      <option value="fixed">ลดเป็นบาท (฿)</option>
                      <option value="percent">ลดเปอร์เซ็นต์ (%)</option>
                    </select>
                  </div>
                  <div>
                    <label className="mb-2 block text-[11px] font-black uppercase tracking-widest text-gray-400">มูลค่า *</label>
                    <input
                      required
                      type="number"
                      min={0}
                      step={0.1}
                      value={formData.discount_value}
                      onChange={e => setFormData({ ...formData, discount_value: Number(e.target.value) })}
                      className="w-full rounded-xl border border-gray-200 bg-gray-50 p-4 font-bold text-[#1A1A18] transition-all focus:border-[#1A1A18] focus:bg-white focus:outline-none"
                    />
                  </div>
                </div>

                <div className="flex gap-4 pt-4 border-t border-[#E5E5E5]">
                   <button
                    type="button"
                    onClick={() => setIsFormOpen(false)}
                    className="flex-1 rounded-xl bg-gray-100 p-4 text-[13px] font-black uppercase tracking-widest text-gray-500 transition-all hover:bg-gray-200"
                  >
                    ยกเลิก
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#111111] p-4 text-[13px] font-black uppercase tracking-widest text-white transition-all hover:bg-[#333333] active:scale-95 disabled:opacity-50"
                  >
                    {saving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                    บันทึก
                  </button>
                </div>
              </form>
            </div>
          ) : loading ? (
            <div className="flex justify-center py-20">
              <Loader2 className="w-10 h-10 animate-spin text-[#A3A3A3]" />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {promotions.map(promo => (
                <div key={promo.id} className="bg-white border border-[#E5E5E5] rounded-2xl p-6 hover:shadow-lg transition-all relative group flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between items-start mb-4">
                      <h3 className="font-bold text-lg leading-tight uppercase pr-8">{promo.name}</h3>
                      <div className="absolute top-6 right-6 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => handleOpenForm(promo)} className="h-8 w-8 rounded-full bg-blue-50 flex items-center justify-center text-blue-500 hover:bg-blue-100 transition-colors">
                          <Edit2 size={14} />
                        </button>
                        <button onClick={() => handleDelete(promo.id)} className="h-8 w-8 rounded-full bg-red-50 flex items-center justify-center text-red-500 hover:bg-red-100 transition-colors">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                    <p className="text-sm text-gray-500 mb-4 h-10 overflow-hidden line-clamp-2">
                      {promo.description || 'ไม่มีคำอธิบาย'}
                    </p>
                    
                    <div className="flex items-center gap-2 mb-6">
                      <span className="bg-emerald-100 text-emerald-800 text-xs font-black px-3 py-1 rounded-md uppercase">
                        ลด {promo.discount_type === 'fixed' ? '฿' : ''}{promo.discount_value}{promo.discount_type === 'percent' ? '%' : ''}
                      </span>
                    </div>
                  </div>

                  <div className="border-t border-[#E5E5E5] pt-4 flex items-center justify-between">
                    <div className="text-[10px] text-gray-400 font-mono">
                      สถานะการใช้งาน
                    </div>
                    <button
                      onClick={() => toggleStatus(promo.id, promo.is_active)}
                      className={`w-12 h-6 rounded-full p-1 transition-colors relative ${promo.is_active ? 'bg-emerald-500' : 'bg-[#E5E5E5]'}`}
                    >
                      <div className={`w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${promo.is_active ? 'translate-x-6' : 'translate-x-0'}`} />
                    </button>
                  </div>
                </div>
              ))}
              
              {promotions.length === 0 && !error && (
                <div className="col-span-full py-20 text-center border-2 border-dashed border-[#E5E5E5] rounded-2xl text-gray-400 flex flex-col items-center bg-white">
                  <Tag className="w-12 h-12 mb-4 opacity-20" />
                  <p className="text-sm uppercase tracking-widest font-bold text-gray-300">ไม่มีโปรโมชั่น</p>
                  <button onClick={() => handleOpenForm()} className="mt-4 text-[11px] font-black text-[#1A1A18] uppercase tracking-widest hover:underline">สร้างเลย</button>
                </div>
              )}
            </div>
          )}
        </div>
      </motion.div>
    </div>
  )
}

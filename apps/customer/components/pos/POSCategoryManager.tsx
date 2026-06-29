'use client';
import React, { useState, useEffect } from 'react'
import { Tag, Plus, Trash2, Save, X, GripVertical, Loader2, Edit3, AlertTriangle, CheckCircle2 } from 'lucide-react'
import { supabase } from '@/lib/supabaseClient'
import { motion, AnimatePresence, Reorder } from 'framer-motion'
import { useI18n } from '@/lib/I18nContext'

interface Category {
  id: string
  name: string
  color?: string
  icon?: string
  order_index?: number
  branch_id?: string | null
  item_count?: number
}

interface POSCategoryManagerProps {
  shopSettings?: any
  onCategoriesChange?: (categories: Category[]) => void
}

export default function POSCategoryManager({ shopSettings, onCategoriesChange }: POSCategoryManagerProps) {
  const { locale } = useI18n()
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [editingCat, setEditingCat] = useState<Category | null>(null)
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null)
  const [hasOrderChanges, setHasOrderChanges] = useState(false)

  // Form state
  const [formName, setFormName] = useState('')

  const branchId = shopSettings?.branch_id || null

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }

  const fetchCategories = async () => {
    setLoading(true)
    try {
      let query = supabase
        .from('pos_menu_categories')
        .select('*, pos_menu_items(count)')
        .order('order_index')

      if (branchId) {
        query = query.eq('branch_id', branchId)
      } else {
        query = query.is('branch_id', null)
      }

      const { data, error } = await query
      if (error) throw error

      // Get item counts per category
      const cats = (data || []).map((c: any) => ({
        ...c,
        item_count: c.pos_menu_items?.[0]?.count || 0
      }))

      // Also fetch actual item counts
      const catIds = cats.map((c: any) => c.id)
      if (catIds.length > 0) {
        let countQuery = supabase
          .from('pos_menu_items')
          .select('category_id')
          .in('category_id', catIds)
          .eq('is_active', true)

        if (branchId) countQuery = countQuery.eq('branch_id', branchId)
        else countQuery = countQuery.is('branch_id', null)

        const { data: itemData } = await countQuery
        const countMap: Record<string, number> = {}
        itemData?.forEach((i: any) => {
          countMap[i.category_id] = (countMap[i.category_id] || 0) + 1
        })
        cats.forEach((c: any) => { c.item_count = countMap[c.id] || 0 })
      }

      setCategories(cats)
      setHasOrderChanges(false)
      onCategoriesChange?.(cats)
    } catch (e: any) {
      showToast(e.message || 'โหลดหมวดหมู่ไม่สำเร็จ', 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchCategories()
  }, [shopSettings?.branch_id])

  const openAdd = () => {
    setFormName('')
    setEditingCat(null)
    setIsAddOpen(true)
  }

  const openEdit = (cat: Category) => {
    setFormName(cat.name)
    setEditingCat(cat)
    setIsAddOpen(true)
  }

  const handleSave = async () => {
    if (!formName.trim()) return showToast('กรุณาใส่ชื่อหมวดหมู่', 'error')
    setSaving(true)
    try {
      const payload: any = {
        name: formName.trim(),
        branch_id: branchId,
      }

      if (editingCat) {
        // Update
        const { error } = await supabase
          .from('pos_menu_categories')
          .update(payload)
          .eq('id', editingCat.id)
        if (error) throw error
        showToast('อัปเดตหมวดหมู่สำเร็จ')
      } else {
        // Insert
        payload.order_index = categories.length
        const { error } = await supabase
          .from('pos_menu_categories')
          .insert(payload)
        if (error) throw error
        showToast('เพิ่มหมวดหมู่สำเร็จ')
      }

      setIsAddOpen(false)
      await fetchCategories()
    } catch (e: any) {
      showToast(e.message || 'บันทึกไม่สำเร็จ', 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (cat: Category) => {
    if (cat.item_count && cat.item_count > 0) {
      return showToast(`ไม่สามารถลบได้ — ยังมีสินค้า ${cat.item_count} รายการในหมวดนี้ กรุณาย้ายสินค้าออกก่อน`, 'error')
    }
    setSaving(true)
    try {
      const { error } = await supabase
        .from('pos_menu_categories')
        .delete()
        .eq('id', cat.id)
      if (error) throw error
      showToast('ลบหมวดหมู่สำเร็จ')
      setDeleteConfirmId(null)
      await fetchCategories()
    } catch (e: any) {
      showToast(e.message || 'ลบไม่สำเร็จ', 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleCategoryReorder = (nextCategories: Category[]) => {
    const updatedCats = nextCategories.map((c, i) => ({ ...c, order_index: i }))
    setCategories(updatedCats)
    setHasOrderChanges(true)
  }

  const handleSaveOrder = async () => {
    setSaving(true)
    try {
      await Promise.all(
        categories.map((c, index) =>
          supabase.from('pos_menu_categories').update({ order_index: index }).eq('id', c.id)
        )
      )
      const normalized = categories.map((c, index) => ({ ...c, order_index: index }))
      setCategories(normalized)
      setHasOrderChanges(false)
      onCategoriesChange?.(normalized)
      showToast('บันทึกลำดับหมวดหมู่สำเร็จ')
    } catch (e: any) {
      showToast(e.message || 'บันทึกลำดับไม่สำเร็จ', 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="p-6 sm:p-10 font-bold">
      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={`fixed top-6 right-6 z-[200] flex items-center gap-3 px-5 py-4 shadow-xl text-white text-[11px] font-black uppercase tracking-widest ${toast.type === 'success' ? 'bg-emerald-600' : 'bg-red-600'}`}
          >
            {toast.type === 'success' ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
            {toast.msg}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="flex items-center justify-between mb-10">
        <div>
          <h2 className="text-xl font-black uppercase tracking-tighter flex items-center gap-3">
            <Tag size={24} className="text-emerald-500" />
            {locale === 'th' ? 'จัดการหมวดหมู่เมนู' : 'Menu Categories'}
          </h2>
          <p className="mt-1 text-[10px] font-black uppercase tracking-widest text-gray-400">
            {categories.length} {locale === 'th' ? 'หมวดหมู่' : 'categories'} · ลากเพื่อเรียงลำดับ
          </p>
        </div>
        <div className="flex items-center gap-3">
          {hasOrderChanges && (
            <button
              onClick={handleSaveOrder}
              disabled={saving}
              className="flex items-center gap-2 border border-emerald-500 bg-emerald-500 px-6 py-3 text-[10px] font-black uppercase tracking-widest text-white transition-all hover:bg-emerald-600 disabled:opacity-60"
            >
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
              บันทึกลำดับ
            </button>
          )}
          <button
            onClick={openAdd}
            className="flex items-center gap-2 bg-black text-white px-6 py-3 text-[10px] font-black uppercase tracking-widest hover:bg-gray-800 transition-all"
          >
            <Plus size={14} />
            {locale === 'th' ? 'เพิ่มหมวดหมู่' : 'Add Category'}
          </button>
        </div>
      </div>

      {/* Category List */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 text-gray-300">
          <Loader2 size={40} className="animate-spin mb-4" />
          <p className="text-[11px] font-black uppercase tracking-widest">Loading...</p>
        </div>
      ) : categories.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 border-2 border-dashed border-gray-100">
          <Tag size={48} className="text-gray-200 mb-6" />
          <p className="text-[12px] font-black uppercase tracking-widest text-gray-300 mb-2">
            ยังไม่มีหมวดหมู่
          </p>
          <p className="text-[10px] text-gray-300 mb-6">กดปุ่ม "เพิ่มหมวดหมู่" เพื่อเริ่มต้น</p>
          <button
            onClick={openAdd}
            className="flex items-center gap-2 border border-black px-6 py-3 text-[10px] font-black uppercase tracking-widest hover:bg-black hover:text-white transition-all"
          >
            <Plus size={14} /> เพิ่มหมวดหมู่แรก
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {/* Column Headers */}
          <div className="grid grid-cols-[40px_1fr_80px_100px_120px] gap-4 px-4 py-2 text-[8px] font-black uppercase tracking-widest text-gray-400">
            <div></div>
            <div>หมวดหมู่</div>
            <div className="text-center">สินค้า</div>
            <div className="text-center">ลำดับ</div>
            <div className="text-right">จัดการ</div>
          </div>

          <Reorder.Group axis="y" values={categories} onReorder={handleCategoryReorder} className="space-y-2">
            <AnimatePresence>
            {categories.map((cat, idx) => (
              <Reorder.Item
                key={cat.id}
                value={cat}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                className="grid grid-cols-[40px_1fr_80px_100px_120px] gap-4 items-center bg-white border border-gray-100 px-4 py-5 hover:border-gray-300 transition-all group"
              >
                {/* Grip */}
                <div className="flex cursor-grab justify-center text-gray-300 active:cursor-grabbing">
                  <GripVertical size={18} />
                </div>

                {/* Name */}
                <div className="flex items-center gap-4">
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 bg-gray-100"
                  >
                    <div className="w-4 h-4 rounded-full bg-black" />
                  </div>
                  <div>
                    <div className="text-[13px] font-black text-[#1A1A18]">{cat.name}</div>
                  </div>
                </div>

                {/* Item Count */}
                <div className="text-center">
                  <span className={`inline-block px-2 py-1 text-[10px] font-black ${(cat.item_count || 0) > 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-50 text-gray-400'}`}>
                    {cat.item_count || 0} รายการ
                  </span>
                </div>

                {/* Order */}
                <div className="flex items-center justify-center gap-1">
                  <span className="inline-flex min-w-[44px] items-center justify-center border border-gray-100 px-3 py-2 text-[10px] font-black text-gray-500">
                    #{idx + 1}
                  </span>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-end gap-2">
                  <button
                    onClick={() => openEdit(cat)}
                    className="flex items-center gap-1.5 px-3 py-2 border border-gray-100 text-[9px] font-black uppercase tracking-wider hover:border-black hover:bg-black hover:text-white transition-all"
                  >
                    <Edit3 size={11} /> แก้ไข
                  </button>

                  {deleteConfirmId === cat.id ? (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleDelete(cat)}
                        disabled={saving}
                        className="px-3 py-2 bg-red-600 text-white text-[9px] font-black uppercase tracking-wider hover:bg-red-700 transition-all"
                      >
                        ยืนยัน
                      </button>
                      <button
                        onClick={() => setDeleteConfirmId(null)}
                        className="px-2 py-2 border border-gray-200 text-[9px] font-black hover:bg-gray-50"
                      >
                        <X size={11} />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => {
                        if ((cat.item_count || 0) > 0) {
                          showToast(`ไม่สามารถลบได้ — มีสินค้า ${cat.item_count} รายการอยู่ในหมวดนี้`, 'error')
                        } else {
                          setDeleteConfirmId(cat.id)
                        }
                      }}
                      className="flex items-center justify-center w-8 h-8 border border-red-100 text-red-400 hover:bg-red-600 hover:text-white hover:border-red-600 transition-all"
                    >
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>
              </Reorder.Item>
            ))}
          </AnimatePresence>
          </Reorder.Group>
        </div>
      )}

      {/* Add/Edit Modal */}
      <AnimatePresence>
        {isAddOpen && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white w-full max-w-lg shadow-2xl"
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between px-8 py-6 border-b border-gray-100">
                <h3 className="text-[13px] font-black uppercase tracking-widest">
                  {editingCat ? 'แก้ไขหมวดหมู่' : 'เพิ่มหมวดหมู่ใหม่'}
                </h3>
                <button onClick={() => setIsAddOpen(false)} className="p-2 hover:bg-gray-50">
                  <X size={18} />
                </button>
              </div>

              {/* Form */}
              <div className="p-8 space-y-8">
                {/* Preview */}
                <div className="flex items-center justify-center">
                  <div
                    className="flex items-center gap-4 px-6 py-4 border-2 rounded-full border-black bg-gray-50"
                  >
                    <div className="w-4 h-4 rounded-full bg-black" />
                    <span className="text-[15px] font-black tracking-tight text-black">
                      {formName || 'ชื่อหมวดหมู่'}
                    </span>
                  </div>
                </div>

                {/* Name */}
                <div>
                  <label className="block text-[9px] font-black uppercase tracking-widest text-gray-400 mb-2">
                    ชื่อหมวดหมู่ *
                  </label>
                  <input
                    autoFocus
                    type="text"
                    value={formName}
                    onChange={e => setFormName(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleSave()}
                    placeholder="เช่น อาหารจานหลัก, เครื่องดื่ม..."
                    className="w-full px-4 py-3 border border-gray-200 text-[13px] font-bold outline-none focus:border-black transition-colors"
                  />
                </div>


              </div>

              {/* Footer */}
              <div className="flex items-center gap-3 px-8 py-6 border-t border-gray-100">
                <button
                  onClick={handleSave}
                  disabled={saving || !formName.trim()}
                  className="flex-1 flex items-center justify-center gap-2 bg-black text-white py-4 text-[10px] font-black uppercase tracking-widest hover:bg-gray-800 disabled:opacity-50 transition-all"
                >
                  {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                  {editingCat ? 'บันทึกการแก้ไข' : 'เพิ่มหมวดหมู่'}
                </button>
                <button
                  onClick={() => setIsAddOpen(false)}
                  className="px-6 py-4 border border-gray-200 text-[10px] font-black uppercase tracking-widest hover:bg-gray-50 transition-all"
                >
                  ยกเลิก
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}

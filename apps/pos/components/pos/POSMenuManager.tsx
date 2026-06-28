'use client';
import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { 
  Plus, Search, Edit3, Trash2, Filter, 
  MoreVertical, Check, X, Loader2, Image as ImageIcon,
  ChevronRight, RefreshCcw, Save, Trash, LayoutGrid,
  Menu as MenuIcon, LogOut, Settings, List, Star
} from 'lucide-react'
import { supabase } from '@/lib/supabaseClient'
import Link from 'next/link'
import { motion, AnimatePresence, Reorder } from 'framer-motion'
import { useI18n } from "@/lib/I18nContext";
import { getMenuSearchText, getPrimaryMenuName, getSecondaryMenuName } from '@/lib/posMenuLabels'
import { sortMenuItemsByOrder, withMenuSortOrder } from '@/lib/posMenuOrder'

interface POSMenuManagerProps {
  profile: any
  activeView: string
  allowedNav: any[]
  onSetView: (view: any) => void
  onShiftModalOpen?: () => void
  activeShift?: any
  setViewExtraHeader: (node: React.ReactNode) => void
  shopSettings?: any
}

export default function POSMenuManager({ 
  profile, activeView, allowedNav, onSetView, onShiftModalOpen, activeShift, setViewExtraHeader, shopSettings
}: POSMenuManagerProps) {
  const { locale } = useI18n();
  const [items, setItems] = useState<any[]>([])
  const [categories, setCategories] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [activeCategory, setActiveCategory] = useState<string | null>(null)
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  
  const [isEditorOpen, setIsEditorOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<any>(null)
  const [isSaving, setIsSaving] = useState(false)

  const [allModifierGroups, setAllModifierGroups] = useState<any[]>([])
  const [itemModifierLinks, setItemModifierLinks] = useState<string[]>([])

  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false)

  // --- Bulk Edit / Table View ---
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid')
  const [visibleColumns, setVisibleColumns] = useState<string[]>(['image_url', 'name', 'category_id', 'sale_price', 'cost_price', 'is_recommended'])
  const [showColumnSelector, setShowColumnSelector] = useState(false)
  const [reorderMode, setReorderMode] = useState(false)
  const [dirtyCategoryKeys, setDirtyCategoryKeys] = useState<string[]>([])
  const [reorderDraft, setReorderDraft] = useState<Record<string, string[]>>({})
  const reorderSnapshotRef = useRef<any[] | null>(null)
  const itemsRef = useRef<any[]>([])

  const columns = [
    { id: 'image_url', label: 'รูปภาพ' },
    { id: 'name', label: 'ชื่อเมนู' },
    { id: 'category_id', label: 'หมวดหมู่' },
    { id: 'sale_price', label: 'ราคาขาย' },
    { id: 'cost_price', label: 'ราคาต้นทุน' },
    { id: 'is_recommended', label: 'เมนูแนะนำ' },
    { id: 'is_popular', label: 'ยอดนิยม' },
    { id: 'is_online_available', label: 'สั่งผ่าน QR' },
    { id: 'is_delivery_available', label: 'Delivery' },
    { id: 'status', label: 'สถานะ' },
  ]

  const getItemOrderKey = (item: any) => item.category_id || 'uncategorized'

  const sortMenuItems = (list: any[]) => sortMenuItemsByOrder(list)

  const categorySections = useMemo(() => {
    const uncategorizedSection = { id: 'uncategorized', name: 'อื่นๆ (Uncategorized)' }
    return [...categories, uncategorizedSection]
  }, [categories])

  const itemMap = useMemo(() => {
    const nextMap = new Map<string, any>()
    items.forEach(item => nextMap.set(item.id, item))
    return nextMap
  }, [items])

  const buildReorderDraft = useCallback((sourceItems: any[]) => {
    const draft: Record<string, string[]> = {}
    categorySections.forEach(cat => {
      draft[cat.id] = sortMenuItems(
        sourceItems.filter(item =>
          cat.id === 'uncategorized'
            ? !item.category_id || !categories.find(c => c.id === item.category_id)
            : item.category_id === cat.id
        )
      ).map(item => item.id)
    })
    return draft
  }, [categories, categorySections])

  useEffect(() => {
    itemsRef.current = items
  }, [items])

  useEffect(() => {
    if (shopSettings) {
      fetchData()
    }
  }, [shopSettings?.branch_id])

  const handleCancelReorder = useCallback(() => {
    if (reorderSnapshotRef.current) {
      setItems(reorderSnapshotRef.current.map(item => ({ ...item })))
    }
    setReorderDraft({})
    setDirtyCategoryKeys([])
    setReorderMode(false)
  }, [])

  const handleStartReorder = useCallback(() => {
    const snapshot = itemsRef.current.map(item => ({ ...item }))
    reorderSnapshotRef.current = snapshot
    setReorderDraft(buildReorderDraft(snapshot))
    setViewMode('table')
    setDirtyCategoryKeys([])
    setReorderMode(true)
  }, [buildReorderDraft])

  const handleSaveReorder = useCallback(async () => {
    setIsSaving(true)
    try {
      const currentItems = itemsRef.current
      const nextItems = currentItems.map(item => ({ ...item }))
      const nextItemMap = new Map(nextItems.map(item => [item.id, item]))
      const updates = dirtyCategoryKeys.flatMap(categoryKey =>
        (reorderDraft[categoryKey] || []).map((itemId, index) => {
          const targetItem = nextItemMap.get(itemId)
          const nextPlatformPrices = withMenuSortOrder(targetItem?.platform_prices, index)
          if (targetItem) {
            targetItem.sort_order = index
            targetItem.platform_prices = nextPlatformPrices
          }
          return supabase.from('pos_menu_items').update({ platform_prices: nextPlatformPrices }).eq('id', itemId)
        })
      )

      await Promise.all(updates)
      setItems(sortMenuItems(nextItems))
      reorderSnapshotRef.current = null
      setReorderDraft({})
      setDirtyCategoryKeys([])
      setReorderMode(false)
    } finally {
      setIsSaving(false)
    }
  }, [dirtyCategoryKeys, reorderDraft])

  useEffect(() => {
    setViewExtraHeader(
      <div className="flex items-center justify-end flex-1">
          <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 p-1 bg-gray-50 border border-gray-100 mr-2">
                   <button 
                       onClick={() => setViewMode('grid')} 
                       className={`w-10 h-10 flex items-center justify-center transition-all ${viewMode === 'grid' ? 'bg-[#1A1A18] text-white shadow-lg' : 'text-gray-300 hover:text-black'}`}
                   >
                       <LayoutGrid size={18} />
                   </button>
                   <button 
                       onClick={() => setViewMode('table')} 
                       className={`w-10 h-10 flex items-center justify-center transition-all ${viewMode === 'table' ? 'bg-[#1A1A18] text-white shadow-lg' : 'text-gray-300 hover:text-black'}`}
                   >
                       <List size={18} />
                   </button>
               </div>
              <button
                  onClick={reorderMode ? handleCancelReorder : handleStartReorder}
                  className={`h-10 px-5 flex items-center justify-center gap-2 border transition-all font-bold whitespace-nowrap ${
                      reorderMode
                        ? 'border-amber-500 bg-amber-500 text-white shadow-lg'
                        : 'border-[#F0F0E8] bg-white text-[#1A1A18] hover:border-black'
                  }`}
              >
                  <MenuIcon size={14} />
                  <span className="text-[10px] font-black uppercase tracking-widest">{reorderMode ? 'ยกเลิกจัดลำดับ' : 'จัดลำดับเมนู'}</span>
              </button>
              {reorderMode && dirtyCategoryKeys.length > 0 && (
                <button
                    onClick={handleSaveReorder}
                    className="h-10 px-5 bg-emerald-500 text-white flex items-center justify-center gap-2 shadow-lg font-bold whitespace-nowrap"
                >
                    {isSaving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                    <span className="text-[10px] font-black uppercase tracking-widest">บันทึกลำดับ</span>
                </button>
              )}
              <button 
                  onClick={() => { setEditingItem({ name: '', name_en: '', name_zh: '', sale_price: 0, status: 'active', category_id: categories[0]?.id }); setIsEditorOpen(true); }} 
                  className="h-10 px-8 bg-[#1A1A18] text-white flex items-center justify-center gap-3 shadow-lg font-bold whitespace-nowrap"
              >
                  <Plus size={16} /> <span className="text-[10px] font-black uppercase tracking-widest font-bold">{locale === 'en' ? 'เพิ่มรายการเมนู' : locale === 'zh' ? 'เพิ่มรายการเมนู' : 'เพิ่มรายการเมนู'}</span>
              </button>
          </div>
      </div>
    );
    return () => setViewExtraHeader(null);
  }, [setViewExtraHeader, viewMode, categories, reorderMode, dirtyCategoryKeys.length, isSaving, handleCancelReorder, handleStartReorder, handleSaveReorder]);
  const fetchData = async () => {
    setLoading(true)
    const branchId = shopSettings?.branch_id
    
    let catQuery = supabase.from('pos_menu_categories').select('*').order('order_index')
    let itemQuery = supabase.from('pos_menu_items').select('*, category:pos_menu_categories(name), modifiers:pos_item_modifier_links(group_id)').eq('is_active', true).order('name')
    let groupQuery = supabase.from('pos_menu_modifier_groups').select('*').order('name')

    if (branchId) {
      catQuery = catQuery.eq('branch_id', branchId)
      itemQuery = itemQuery.eq('branch_id', branchId)
      groupQuery = groupQuery.eq('branch_id', branchId)
    } else {
      catQuery = catQuery.is('branch_id', null)
      itemQuery = itemQuery.is('branch_id', null)
      groupQuery = groupQuery.is('branch_id', null)
    }

    const [catData, itemData, groupData] = await Promise.all([
      catQuery,
      itemQuery,
      groupQuery
    ])
    
    // Fetch inventory for dynamic cost calculation
    const { data: inventory } = await supabase.from('inventory_items').select('id, cost_price')
    
    if (catData.data) setCategories(catData.data)
    
    if (itemData.data) {
        if (inventory) {
            const invCostMap = new Map(inventory.map(i => [i.id, i.cost_price || 0]))
            const calculateRecipeCost = (recipe: any[]) => {
                return (recipe || []).reduce((sum, ing) => {
                    const cost = invCostMap.get(ing.ingredient_id) || 0
                    return sum + (cost * Number(ing.quantity || 0) * (ing.factor || 1))
                }, 0)
            }
            
            itemData.data.forEach(item => {
                const dynamicCost = calculateRecipeCost(item.recipe_data || [])
                if (dynamicCost > 0) {
                    item.cost_price = dynamicCost
                }
            })
        }
        setItems(sortMenuItems(itemData.data))
    }
    
    if (groupData.data) setAllModifierGroups(groupData.data)
    setLoading(false)
  }

  const fetchItemLinks = async (itemId: string) => {
    const { data } = await supabase.from('pos_item_modifier_links').select('group_id').eq('item_id', itemId)
    if (data) setItemModifierLinks(data.map(d => d.group_id))
    else setItemModifierLinks([])
  }

  const handleSaveItem = async () => {
      setIsSaving(true)
      const { category, modifiers, ...cleanItem } = editingItem
      const { updated_at, ...finalItem } = cleanItem as any

      if (!finalItem.branch_id && shopSettings?.branch_id) {
          finalItem.branch_id = shopSettings.branch_id
      }

      if (!editingItem?.id) {
          const siblingCount = items.filter(item => getItemOrderKey(item) === getItemOrderKey(finalItem)).length
          finalItem.platform_prices = withMenuSortOrder(finalItem.platform_prices, siblingCount)
      }

      const { data: savedItem, error } = await supabase.from('pos_menu_items').upsert(finalItem).select().single()
      
      if (!error && savedItem) {
          // Sync Modifiers
          const itemId = savedItem.id;
          
          // Delete old links
          await supabase.from('pos_item_modifier_links').delete().eq('item_id', itemId);
          
          // Insert new links
          if (itemModifierLinks.length > 0) {
              const links = itemModifierLinks.map(groupId => ({ item_id: itemId, group_id: groupId }));
              await supabase.from('pos_item_modifier_links').insert(links);
          }

          setIsEditorOpen(false)
          fetchData()
      } else {
          console.error('Save failed:', error)
          alert('ไม่สามารถบันทึกข้อมูลได้: ' + (error?.message || 'Unknown error'))
      }
      setIsSaving(false)
  }

  const handleBulkUpdate = async (id: string, field: string, value: any) => {
    setItems(prev => prev.map(item => item.id === id ? { ...item, [field]: value } : item))
    const { error } = await supabase.from('pos_menu_items').update({ [field]: value }).eq('id', id)
    if (error) {
        fetchData()
    }
   }

  const handleModifierGroupToggle = async (itemId: string, groupId: string) => {
    const currentItem = items.find(item => item.id === itemId)
    const currentGroupIds = (currentItem?.modifiers || []).map((modifier: any) => modifier.group_id)
    const nextGroupIds = currentGroupIds.includes(groupId)
      ? currentGroupIds.filter((id: string) => id !== groupId)
      : [...currentGroupIds, groupId]

    setItems(prev => prev.map(item =>
      item.id === itemId
        ? { ...item, modifiers: nextGroupIds.map(id => ({ group_id: id })) }
        : item
    ))

    await supabase.from('pos_item_modifier_links').delete().eq('item_id', itemId)
    if (nextGroupIds.length > 0) {
      await supabase.from('pos_item_modifier_links').insert(
        nextGroupIds.map(id => ({ item_id: itemId, group_id: id }))
      )
    }
  }

  const handleInlineImageUpload = async (itemId: string, file?: File) => {
    if (!file) return

    setIsSaving(true)
    try {
      const fileExt = file.name.split('.').pop()
      const fileName = `${Math.random()}.${fileExt}`
      const filePath = `${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('marketplace-images')
        .upload(filePath, file)

      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage
        .from('marketplace-images')
        .getPublicUrl(filePath)

      await handleBulkUpdate(itemId, 'image_url', publicUrl)
    } catch (error: any) {
      alert('Error uploading image: ' + error.message)
    } finally {
      setIsSaving(false)
    }
  }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (!file) return
      
      setIsSaving(true)
      try {
          const fileExt = file.name.split('.').pop()
          const fileName = `${Math.random()}.${fileExt}`
          const filePath = `${fileName}`
          
          // ⚠️ We use 'marketplace-images' as a fallback as it's a common public bucket in this project
          const { error: uploadError, data } = await supabase.storage
              .from('marketplace-images')
              .upload(filePath, file)
              
          if (uploadError) throw uploadError
          
          const { data: { publicUrl } } = supabase.storage
              .from('marketplace-images')
              .getPublicUrl(filePath)
              
          setEditingItem({ ...editingItem, image_url: publicUrl })
      } catch (error: any) {
          alert('Error uploading image: ' + error.message + '\n(Please ensure the "marketplace-images" bucket exists in Supabase Storage)')
      } finally {
          setIsSaving(false)
      }
  }

  const handleDeleteItem = async (id: string) => {
      if (!confirm('ยืนยันการลบรายการนี้?')) return
      await supabase.from('pos_menu_items').delete().eq('id', id)
      fetchData()
  }

  const filteredItems = useMemo(() => sortMenuItems(items.filter(item => {
      const matchesSearch = getMenuSearchText(item).includes(searchTerm.toLowerCase())
      const matchesCategory = !activeCategory || item.category_id === activeCategory
      return matchesSearch && matchesCategory
  })), [items, searchTerm, activeCategory])

  const handleGroupedItemsReorder = (categoryKey: string, reorderedIds: string[]) => {
      setReorderDraft(prev => ({ ...prev, [categoryKey]: reorderedIds }))
      setDirtyCategoryKeys(prev => (prev.includes(categoryKey) ? prev : [...prev, categoryKey]))
  }

  return (
    <>
      <div className="p-4 sm:p-10 font-bold overflow-y-auto no-scrollbar">
          
          {/* 1. SEARCH BAR */}
          <div className="mb-6">
              <div className="relative group w-full">
                  <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300 group-focus-within:text-[#1A1A18]" />
                  <input 
                      type="text" 
                      placeholder={locale === 'en' ? 'ค้นหาชื่อเมนู หรือ ข้อมูลอาหาร...' : locale === 'zh' ? 'ค้นหาชื่อเมนู หรือ ข้อมูลอาหาร...' : 'ค้นหาชื่อเมนู หรือ ข้อมูลอาหาร...'} 
                      className="w-full bg-white border border-[#F0F0E8] py-4 pl-12 pr-4 text-[14px] outline-none focus:border-[#1A1A18] transition-all font-bold placeholder:text-gray-200 text-black shadow-sm"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                  />
              </div>
          </div>

          {/* 2. CATEGORIES BAR */}
          <div className="bg-white border-b border-[#F0F0E8] mb-10">
              <div className="flex items-center overflow-x-auto no-scrollbar pb-4 gap-2">
                    <button onClick={() => setActiveCategory(null)} className={`whitespace-nowrap px-4 py-2 text-[10px] font-black uppercase tracking-widest transition-all ${!activeCategory ? 'bg-[#1A1A18] text-white' : 'bg-gray-100 text-gray-400 hover:text-[#1A1A18]'}`}>{locale === 'en' ? 'ทั้งหมด' : locale === 'zh' ? 'ทั้งหมด' : 'ทั้งหมด'}</button>
                    {categories.map(cat => (
                        <button key={cat.id} onClick={() => setActiveCategory(cat.id)} className={`whitespace-nowrap px-4 py-2 text-[10px] font-black uppercase tracking-widest transition-all ${activeCategory === cat.id ? 'bg-[#1A1A18] text-white' : 'bg-gray-100 text-gray-400 hover:text-[#1A1A18]'}`}>{cat.name}</button>
                    ))}
              </div>
          </div>

          {/* 3. MAIN LIST */}
          <div className="flex-1">
          {loading ? (
               <div className="h-full flex items-center justify-center opacity-20 font-bold border-none">
                   <Loader2 className="animate-spin font-bold border-none font-bold font-bold" size={48} />
               </div>
           ) : viewMode === 'grid' ? (
               <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4 sm:gap-8 font-bold">
                   {filteredItems.map(item => (
                       <div key={item.id} className="group bg-white border border-[#F0F0E8] p-3 sm:p-5 flex flex-col transition-all hover:shadow-2xl font-bold">
                           <div className="aspect-square bg-gray-50 overflow-hidden mb-4 transition-all duration-700 relative font-bold">
                               {item.image_url ? <img src={item.image_url} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-[20s]" /> : <div className="w-full h-full flex items-center justify-center font-bold font-bold font-bold"><ImageIcon size={32} className="text-gray-100" /></div>}
                               {item.is_recommended && (
                                   <div className="absolute top-2 right-2 bg-amber-400 text-white p-1.5 rounded-none shadow-lg animate-pulse z-10">
                                       <Star size={12} fill="currentColor" />
                                   </div>
                               )}
                           </div>
                           <div className="space-y-3 flex-1 font-bold border-none font-bold">
                               <div className="font-bold border-none">
                                   <span className="text-[8px] font-black uppercase tracking-widest text-sage-600 mb-1 block font-bold font-bold">{item.category?.name || 'GENERIC'}</span>
                                   <h4 className="text-[12px] sm:text-[13px] font-black uppercase tracking-tight leading-tight line-clamp-2 min-h-8 text-black border-none font-bold font-bold">{getPrimaryMenuName(item)}</h4>
                                   {getSecondaryMenuName(item, locale === 'zh' ? 'zh' : 'en') && (
                                     <p className="mt-1 text-[10px] font-semibold leading-tight text-gray-500 line-clamp-2">
                                       {getSecondaryMenuName(item, locale === 'zh' ? 'zh' : 'en')}
                                     </p>
                                   )}
                               </div>
                                <div className="flex gap-4 items-end pt-3 border-t border-gray-50 font-bold border-none w-full">
                                    <div className="flex-1 font-bold border-none">
                                        <div className="text-[8px] font-black text-gray-300 uppercase font-bold border-none">{locale === 'en' ? 'ราคาขาย' : locale === 'zh' ? 'ราคาขาย' : 'ราคาขาย'}</div>
                                        <div className="text-sm font-black text-black font-bold border-none">{locale === 'en' ? '฿ ' : locale === 'zh' ? '฿ ' : '฿ '}{item.sale_price.toLocaleString()}</div>
                                    </div>
                                    <div className="flex-1 font-bold border-none text-right">
                                        <div className="text-[8px] font-black text-gray-300 uppercase font-bold border-none">{locale === 'en' ? 'กำไร' : locale === 'zh' ? 'กำไร' : 'กำไร'}</div>
                                        <div className={`text-[11px] font-black ${item.sale_price > 0 && ((item.sale_price - (item.cost_price || 0)) / item.sale_price) > 0.6 ? 'text-emerald-500' : 'text-gray-400'}`}>
                                            {item.sale_price > 0 ? Math.round(((item.sale_price - (item.cost_price || 0)) / item.sale_price) * 100) : 0}%
                                        </div>
                                    </div>
                                </div>
                                <div className="flex justify-between items-center pt-2 font-bold">
                                    <div className="text-[8px] font-black text-gray-200 uppercase">{locale === 'en' ? 'ต้นทุน: ฿' : locale === 'zh' ? 'ต้นทุน: ฿' : 'ต้นทุน: ฿'}{item.cost_price || 0}</div>
                                    <div className="flex gap-1 sm:gap-2 font-bold">
                                        <button onClick={() => { setEditingItem(item); fetchItemLinks(item.id); setIsEditorOpen(true); }} className="w-8 h-8 sm:w-8 sm:h-8 bg-white border border-gray-100 flex items-center justify-center hover:bg-black hover:text-white transition-all font-bold"><Edit3 size={12} /></button>
                                        <button onClick={() => handleDeleteItem(item.id)} className="w-8 h-8 sm:w-8 sm:h-8 bg-white border border-gray-100 flex items-center justify-center text-red-200 hover:bg-red-500 hover:text-white transition-all font-bold"><Trash2 size={12} /></button>
                                    </div>
                                </div>
                           </div>
                       </div>
                   ))}
               </div>
           ) : reorderMode ? (
            <div className="space-y-6">
                <div className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm font-semibold text-amber-900">
                    ลากเมนูภายในแต่ละหมวดเพื่อกำหนดลำดับที่ลูกค้าและพนักงานจะเห็น แล้วกดปุ่ม "บันทึกลำดับ"
                </div>
                {categorySections.map(cat => {
                    const itemIdsInCat = reorderDraft[cat.id] || []
                    const itemsInCat = itemIdsInCat
                      .map(itemId => itemMap.get(itemId))
                      .filter(Boolean)

                    if (itemsInCat.length === 0) return null

                    return (
                      <div key={cat.id} className="overflow-hidden rounded-2xl border border-[#F0F0E8] bg-white shadow-sm">
                        <div className="flex items-center justify-between border-b border-[#F0F0E8] bg-[#1A1A18] px-5 py-4 text-white">
                          <div>
                            <h3 className="text-lg font-black uppercase tracking-widest">{cat.name}</h3>
                            <p className="mt-1 text-[10px] font-black uppercase tracking-[0.22em] text-white/55">
                              {itemsInCat.length} items
                            </p>
                          </div>
                          {dirtyCategoryKeys.includes(cat.id) && (
                            <span className="rounded-full bg-white/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-amber-200">
                              ยังไม่บันทึก
                            </span>
                          )}
                        </div>

                        <Reorder.Group
                          axis="y"
                          values={itemIdsInCat}
                          onReorder={(nextOrder) => handleGroupedItemsReorder(cat.id, nextOrder)}
                          className="divide-y divide-[#F0F0E8]"
                        >
                          {itemsInCat.map((item, idx) => (
                            <Reorder.Item
                              key={item.id}
                              value={item.id}
                              dragMomentum={false}
                              dragElastic={0.02}
                              whileDrag={{ scale: 1.008, boxShadow: '0 14px 32px rgba(15, 23, 42, 0.14)' }}
                              transition={{ duration: 0.08 }}
                              className="flex cursor-grab touch-none items-center gap-4 bg-white px-4 py-4 active:cursor-grabbing sm:px-5"
                            >
                              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl border border-[#F0F0E8] bg-[#FAF9F6] text-gray-400">
                                <MenuIcon size={14} />
                              </div>
                              <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-xl border border-[#F0F0E8] bg-gray-50">
                                {item.image_url ? <img src={item.image_url} className="h-full w-full object-cover" /> : <ImageIcon size={16} className="text-gray-300" />}
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="truncate text-sm font-black text-[#1A1A18]">{getPrimaryMenuName(item)}</div>
                                {getSecondaryMenuName(item, locale === 'zh' ? 'zh' : 'en') && (
                                  <div className="mt-1 truncate text-[11px] font-semibold text-gray-500">
                                    {getSecondaryMenuName(item, locale === 'zh' ? 'zh' : 'en')}
                                  </div>
                                )}
                              </div>
                              <div className="text-right">
                                <div className="text-[10px] font-black uppercase tracking-[0.18em] text-gray-400">ลำดับ</div>
                                <div className="mt-1 text-sm font-black text-[#1A1A18]">#{idx + 1}</div>
                              </div>
                            </Reorder.Item>
                          ))}
                        </Reorder.Group>
                      </div>
                    )
                })}
            </div>
           ) : (
            <div className="bg-white border border-[#F0F0E8] overflow-x-auto relative min-h-[500px]">
                <div className="absolute left-0 top-[-40px] z-20">
                  <button 
                      onClick={() => setShowColumnSelector(!showColumnSelector)}
                      className="flex items-center gap-2 text-[9px] font-black uppercase tracking-widest bg-gray-50 px-4 py-2 border border-[#F0F0E8] hover:border-black transition-all"
                  >
                      <Settings size={12} /> {locale === 'en' ? 'Customize table' : locale === 'zh' ? '自定义表格' : 'ปรับแต่งตาราง'}</button>
                  <AnimatePresence>
                      {showColumnSelector && (
                          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} className="absolute left-0 top-12 w-64 bg-white border border-black shadow-2xl p-6 z-30 space-y-4">
                              <div className="text-[10px] font-black uppercase tracking-widest border-b border-gray-50 pb-2 mb-4">{locale === 'en' ? 'แสดงคอลัมน์' : locale === 'zh' ? 'แสดงคอลัมน์' : 'แสดงคอลัมน์'}</div>
                              {columns.map(col => (
                                  <label key={col.id} className="flex items-center gap-3 cursor-pointer group">
                                      <input 
                                          type="checkbox" 
                                          className="accent-black w-4 h-4" 
                                          checked={visibleColumns.includes(col.id)}
                                          onChange={() => setVisibleColumns(prev => prev.includes(col.id) ? prev.filter(p => p !== col.id) : [...prev, col.id])}
                                      />
                                      <span className="text-[11px] font-black uppercase text-gray-400 group-hover:text-black transition-colors">{col.label}</span>
                                  </label>
                              ))}
                          </motion.div>
                      )}
                  </AnimatePresence>
                </div>

                
                <div className="space-y-12">
                    {categorySections.map(cat => {
                        const itemsInCat = filteredItems.filter(item => 
                            cat.id === 'uncategorized' 
                            ? !item.category_id || !categories.find(c => c.id === item.category_id)
                            : item.category_id === cat.id
                        );
                        
                        if (itemsInCat.length === 0) return null;

                        const activePlatforms = shopSettings?.opening_hours?.active_delivery_platforms || ['grab', 'lineman', 'shopee', 'foodpanda', 'robinhood'];
                        const tableColSpan = 5 + activePlatforms.length

                        return (
                            <div key={cat.id} className="bg-white border border-[#F0F0E8] overflow-hidden rounded-xl shadow-sm">
                                <div className="bg-[#1A1A18] text-white p-4 sm:p-5 flex items-center justify-between">
                                    <h3 className="text-lg sm:text-xl font-black uppercase tracking-widest">{cat.name}</h3>
                                    <span className="text-[10px] sm:text-xs font-black opacity-60 bg-white/10 px-3 py-1 rounded-full">{itemsInCat.length} Items</span>
                                </div>
                                <div className="overflow-x-auto no-scrollbar">
                                    <table className="w-full text-left border-collapse min-w-[800px] sm:min-w-full">
                                        <thead>
                                            <tr className="bg-gray-50/50 border-b border-[#F0F0E8]">
                                                <th className="p-4 sm:p-6 text-[10px] font-black uppercase tracking-widest text-[#8C8A81] w-12 sm:w-16 text-center border-r border-[#F0F0E8]">Pic</th>
                                                <th className="p-4 sm:p-6 text-[10px] font-black uppercase tracking-widest text-[#8C8A81] border-r border-[#F0F0E8] w-1/3 sm:w-auto min-w-[190px]">ชื่อเมนู</th>
                                                <th className="p-4 sm:p-6 text-[10px] font-black uppercase tracking-widest text-[#8C8A81] w-28 sm:w-48 text-center border-r border-[#F0F0E8] bg-gray-50">หน้าร้าน (฿)</th>
                                                
                                                {activePlatforms.includes('grab') && <th className="p-4 sm:p-6 text-[10px] font-black uppercase tracking-widest text-[#00B14F] w-24 sm:w-32 text-center border-r border-[#F0F0E8] bg-[#00B14F]/5">Grab</th>}
                                                {activePlatforms.includes('lineman') && <th className="p-4 sm:p-6 text-[10px] font-black uppercase tracking-widest text-[#00B900] w-24 sm:w-32 text-center border-r border-[#F0F0E8] bg-[#00B900]/5">Lineman</th>}
                                                {activePlatforms.includes('shopee') && <th className="p-4 sm:p-6 text-[10px] font-black uppercase tracking-widest text-[#EE4D2D] w-24 sm:w-32 text-center border-r border-[#F0F0E8] bg-[#EE4D2D]/5">Shopee</th>}
                                                {activePlatforms.includes('foodpanda') && <th className="p-4 sm:p-6 text-[10px] font-black uppercase tracking-widest text-[#D70F64] w-24 sm:w-32 text-center border-r border-[#F0F0E8] bg-[#D70F64]/5">Foodpanda</th>}
                                                {activePlatforms.includes('robinhood') && <th className="p-4 sm:p-6 text-[10px] font-black uppercase tracking-widest text-[#6023A2] w-24 sm:w-32 text-center border-r border-[#F0F0E8] bg-[#6023A2]/5">Robinhood</th>}
                                                
                                                <th className="p-4 sm:p-6 text-[10px] font-black uppercase tracking-widest text-[#8C8A81] w-24 sm:w-32 text-center border-r border-[#F0F0E8]">สถานะ</th>
                                                <th className="p-4 sm:p-6 text-[10px] font-black uppercase tracking-widest text-[#8C8A81] w-20 sm:w-28 text-center">ลบ</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-[#F0F0E8]">
                                            {itemsInCat.map((item, idx) => (
                                                <React.Fragment key={item.id}>
                                                  <tr className="group hover:bg-sage-50/20 transition-colors align-top">
                                                      <td className="p-3 sm:p-4 border-r border-[#F0F0E8]">
                                                          <div className="space-y-3">
                                                            <div className="w-10 h-10 sm:w-14 sm:h-14 bg-gray-50 border border-gray-100 overflow-hidden mx-auto rounded-lg">
                                                                {item.image_url ? <img src={item.image_url} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center opacity-10"><ImageIcon size={16} /></div>}
                                                            </div>
                                                            <label className="block cursor-pointer">
                                                              <input
                                                                type="file"
                                                                className="hidden"
                                                                accept="image/*"
                                                                onChange={(e) => handleInlineImageUpload(item.id, e.target.files?.[0])}
                                                              />
                                                              <span className="block border border-[#E5E5DF] bg-white px-2 py-1 text-center text-[9px] font-black uppercase tracking-widest text-gray-500 hover:border-black hover:text-black transition-all">
                                                                รูป
                                                              </span>
                                                            </label>
                                                          </div>
                                                      </td>
                                                      <td className="p-0 border-r border-[#F0F0E8]">
                                                          <div className="flex h-full flex-col justify-center gap-2 p-4 sm:p-6">
                                                              <input 
                                                                  type="text" 
                                                                  defaultValue={item.name} 
                                                                  onBlur={(e) => handleBulkUpdate(item.id, 'name', e.target.value)}
                                                                  className="w-full bg-transparent outline-none focus:bg-white focus:ring-2 focus:ring-inset focus:ring-black text-sm sm:text-base font-black uppercase text-black transition-all"
                                                              />
                                                              <input
                                                                type="text"
                                                                defaultValue={item.name_en || ''}
                                                                onBlur={(e) => handleBulkUpdate(item.id, 'name_en', e.target.value)}
                                                                placeholder="English name"
                                                                className="w-full bg-white/70 px-3 py-2 text-[11px] font-semibold text-gray-600 outline-none focus:ring-2 focus:ring-inset focus:ring-black"
                                                              />
                                                              <input
                                                                type="text"
                                                                defaultValue={item.name_zh || ''}
                                                                onBlur={(e) => handleBulkUpdate(item.id, 'name_zh', e.target.value)}
                                                                placeholder="Chinese name"
                                                                className="w-full bg-white/70 px-3 py-2 text-[11px] font-semibold text-gray-600 outline-none focus:ring-2 focus:ring-inset focus:ring-black"
                                                              />
                                                          </div>
                                                      </td>
                                                      <td className="p-0 border-r border-[#F0F0E8] bg-gray-50/30">
                                                          <div className="grid h-full grid-cols-1">
                                                            <input 
                                                                type="number" 
                                                                defaultValue={item.sale_price} 
                                                                onBlur={(e) => handleBulkUpdate(item.id, 'sale_price', Number(e.target.value))}
                                                                className="w-full p-4 sm:p-5 bg-transparent outline-none focus:bg-white focus:ring-2 focus:ring-inset focus:ring-black text-lg sm:text-xl font-black text-black text-center transition-all border-b border-[#F0F0E8]"
                                                            />
                                                            <input
                                                              type="number"
                                                              defaultValue={item.cost_price || 0}
                                                              onBlur={(e) => handleBulkUpdate(item.id, 'cost_price', Number(e.target.value))}
                                                              className="w-full p-3 sm:p-4 bg-transparent outline-none focus:bg-white focus:ring-2 focus:ring-inset focus:ring-black text-sm font-black text-gray-600 text-center transition-all"
                                                              placeholder="ต้นทุน"
                                                            />
                                                          </div>
                                                      </td>
                                                      
                                                      {activePlatforms.includes('grab') && (
                                                          <td className="p-0 border-r border-[#F0F0E8] bg-[#00B14F]/5">
                                                              <input 
                                                                  type="number" 
                                                                  defaultValue={item.platform_prices?.grab || ''} 
                                                                  placeholder="Auto"
                                                                  onBlur={(e) => handleBulkUpdate(item.id, 'platform_prices', {...(item.platform_prices || {}), grab: Number(e.target.value) || null})}
                                                                  className="w-full h-full p-4 sm:p-6 bg-transparent outline-none focus:bg-white focus:ring-2 focus:ring-inset focus:ring-[#00B14F] text-base sm:text-lg font-black text-[#00B14F] placeholder:text-[#00B14F]/30 text-center transition-all"
                                                              />
                                                          </td>
                                                      )}
                                                      {activePlatforms.includes('lineman') && (
                                                          <td className="p-0 border-r border-[#F0F0E8] bg-[#00B900]/5">
                                                              <input 
                                                                  type="number" 
                                                                  defaultValue={item.platform_prices?.lineman || ''} 
                                                                  placeholder="Auto"
                                                                  onBlur={(e) => handleBulkUpdate(item.id, 'platform_prices', {...(item.platform_prices || {}), lineman: Number(e.target.value) || null})}
                                                                  className="w-full h-full p-4 sm:p-6 bg-transparent outline-none focus:bg-white focus:ring-2 focus:ring-inset focus:ring-[#00B900] text-base sm:text-lg font-black text-[#00B900] placeholder:text-[#00B900]/30 text-center transition-all"
                                                              />
                                                          </td>
                                                      )}
                                                      {activePlatforms.includes('shopee') && (
                                                          <td className="p-0 border-r border-[#F0F0E8] bg-[#EE4D2D]/5">
                                                              <input 
                                                                  type="number" 
                                                                  defaultValue={item.platform_prices?.shopee || ''} 
                                                                  placeholder="Auto"
                                                                  onBlur={(e) => handleBulkUpdate(item.id, 'platform_prices', {...(item.platform_prices || {}), shopee: Number(e.target.value) || null})}
                                                                  className="w-full h-full p-4 sm:p-6 bg-transparent outline-none focus:bg-white focus:ring-2 focus:ring-inset focus:ring-[#EE4D2D] text-base sm:text-lg font-black text-[#EE4D2D] placeholder:text-[#EE4D2D]/30 text-center transition-all"
                                                              />
                                                          </td>
                                                      )}
                                                      {activePlatforms.includes('foodpanda') && (
                                                          <td className="p-0 border-r border-[#F0F0E8] bg-[#D70F64]/5">
                                                              <input 
                                                                  type="number" 
                                                                  defaultValue={item.platform_prices?.foodpanda || ''} 
                                                                  placeholder="Auto"
                                                                  onBlur={(e) => handleBulkUpdate(item.id, 'platform_prices', {...(item.platform_prices || {}), foodpanda: Number(e.target.value) || null})}
                                                                  className="w-full h-full p-4 sm:p-6 bg-transparent outline-none focus:bg-white focus:ring-2 focus:ring-inset focus:ring-[#D70F64] text-base sm:text-lg font-black text-[#D70F64] placeholder:text-[#D70F64]/30 text-center transition-all"
                                                              />
                                                          </td>
                                                      )}
                                                      {activePlatforms.includes('robinhood') && (
                                                          <td className="p-0 border-r border-[#F0F0E8] bg-[#6023A2]/5">
                                                              <input 
                                                                  type="number" 
                                                                  defaultValue={item.platform_prices?.robinhood || ''} 
                                                                  placeholder="Auto"
                                                                  onBlur={(e) => handleBulkUpdate(item.id, 'platform_prices', {...(item.platform_prices || {}), robinhood: Number(e.target.value) || null})}
                                                                  className="w-full h-full p-4 sm:p-6 bg-transparent outline-none focus:bg-white focus:ring-2 focus:ring-inset focus:ring-[#6023A2] text-base sm:text-lg font-black text-[#6023A2] placeholder:text-[#6023A2]/30 text-center transition-all"
                                                              />
                                                          </td>
                                                      )}

                                                      <td className="p-0 border-r border-[#F0F0E8]">
                                                          <select 
                                                              value={item.status}
                                                              onChange={(e) => handleBulkUpdate(item.id, 'status', e.target.value)}
                                                              className="w-full h-full p-4 sm:p-6 bg-transparent outline-none focus:bg-white focus:ring-2 focus:ring-inset focus:ring-black text-[10px] sm:text-[11px] font-black uppercase text-center cursor-pointer transition-all"
                                                          >
                                                              <option value="active">Active</option>
                                                              <option value="inactive">Hidden</option>
                                                              <option value="out_of_stock">Out of Stock</option>
                                                          </select>
                                                      </td>
                                                      <td className="p-4 sm:p-6 text-center">
                                                          <button onClick={() => handleDeleteItem(item.id)} className="text-gray-300 hover:text-red-500 transition-all p-2 bg-gray-50 hover:bg-red-50 rounded-full">
                                                              <Trash2 size={18} />
                                                          </button>
                                                      </td>
                                                  </tr>
                                                  <tr className="bg-[#FAF9F6]/80">
                                                    <td colSpan={tableColSpan} className="border-t border-[#F0F0E8] px-4 py-4 sm:px-6 sm:py-5">
                                                      <div className="grid gap-4 lg:grid-cols-[220px_220px_1fr]">
                                                        <div className="space-y-3">
                                                          <div>
                                                            <div className="mb-2 text-[9px] font-black uppercase tracking-[0.18em] text-gray-400">หมวดหมู่</div>
                                                            <select
                                                              value={item.category_id || ''}
                                                              onChange={(e) => handleBulkUpdate(item.id, 'category_id', e.target.value || null)}
                                                              className="w-full border border-[#E5E5DF] bg-white px-3 py-2 text-[11px] font-black text-black outline-none focus:ring-2 focus:ring-inset focus:ring-black"
                                                            >
                                                              <option value="">ไม่ระบุหมวด</option>
                                                              {categories.map(category => (
                                                                <option key={category.id} value={category.id}>{category.name}</option>
                                                              ))}
                                                            </select>
                                                          </div>
                                                          <div>
                                                            <div className="mb-2 text-[9px] font-black uppercase tracking-[0.18em] text-gray-400">ลิงก์รูปภาพ</div>
                                                            <input
                                                              type="text"
                                                              defaultValue={item.image_url || ''}
                                                              onBlur={(e) => handleBulkUpdate(item.id, 'image_url', e.target.value || null)}
                                                              placeholder="https://..."
                                                              className="w-full border border-[#E5E5DF] bg-white px-3 py-2 text-[11px] font-semibold text-black outline-none focus:ring-2 focus:ring-inset focus:ring-black"
                                                            />
                                                          </div>
                                                        </div>

                                                        <div className="space-y-3">
                                                          <div>
                                                            <div className="mb-2 text-[9px] font-black uppercase tracking-[0.18em] text-gray-400">การแสดงผล</div>
                                                            <div className="grid grid-cols-2 gap-2">
                                                              {[
                                                                { key: 'is_recommended', label: 'แนะนำ', active: item.is_recommended, activeClass: 'bg-amber-400 text-white border-amber-400' },
                                                                { key: 'is_popular', label: 'ยอดนิยม', active: item.is_popular, activeClass: 'bg-rose-500 text-white border-rose-500' },
                                                                { key: 'is_online_available', label: 'QR Menu', active: item.is_online_available !== false, activeClass: 'bg-emerald-500 text-white border-emerald-500' },
                                                                { key: 'is_delivery_available', label: 'Delivery', active: item.is_delivery_available !== false, activeClass: 'bg-blue-500 text-white border-blue-500' },
                                                                { key: 'in_stock', label: 'สต็อก (In Stock)', active: item.in_stock !== false, activeClass: 'bg-teal-500 text-white border-teal-500' },
                                                              ].map(toggle => (
                                                                <button
                                                                  key={toggle.key}
                                                                  type="button"
                                                                  onClick={() => handleBulkUpdate(item.id, toggle.key, !toggle.active)}
                                                                  className={`border px-3 py-2 text-[10px] font-black uppercase tracking-widest transition-all ${
                                                                    toggle.active ? toggle.activeClass : 'border-[#E5E5DF] bg-white text-gray-400'
                                                                  }`}
                                                                >
                                                                  {toggle.label}
                                                                </button>
                                                              ))}
                                                            </div>
                                                          </div>
                                                          <div>
                                                            <div className="mb-2 text-[9px] font-black uppercase tracking-[0.18em] text-gray-400">Modifier Groups</div>
                                                            <div className="flex flex-wrap gap-2">
                                                              {allModifierGroups.map(group => {
                                                                const active = (item.modifiers || []).some((modifier: any) => modifier.group_id === group.id)
                                                                return (
                                                                  <button
                                                                    key={group.id}
                                                                    type="button"
                                                                    onClick={() => handleModifierGroupToggle(item.id, group.id)}
                                                                    className={`border px-3 py-2 text-[10px] font-black uppercase tracking-widest transition-all ${
                                                                      active ? 'border-black bg-black text-white' : 'border-[#E5E5DF] bg-white text-gray-500'
                                                                    }`}
                                                                  >
                                                                    {group.name}
                                                                  </button>
                                                                )
                                                              })}
                                                            </div>
                                                          </div>
                                                        </div>

                                                        <div>
                                                          <div className="mb-2 text-[9px] font-black uppercase tracking-[0.18em] text-gray-400">คำอธิบาย</div>
                                                          <textarea
                                                            defaultValue={item.description || ''}
                                                            onBlur={(e) => handleBulkUpdate(item.id, 'description', e.target.value)}
                                                            placeholder="รายละเอียดเมนู"
                                                            className="min-h-[112px] w-full border border-[#E5E5DF] bg-white px-3 py-3 text-[11px] font-semibold text-black outline-none focus:ring-2 focus:ring-inset focus:ring-black resize-y"
                                                          />
                                                        </div>
                                                      </div>
                                                    </td>
                                                  </tr>
                                                </React.Fragment>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        );
                    })}
                    {filteredItems.length === 0 && (
                      <div className="flex min-h-[280px] items-center justify-center border border-dashed border-[#E5E5DF] bg-[#FAF9F6] px-6 text-center">
                        <div>
                          <div className="text-[11px] font-black uppercase tracking-[0.28em] text-[#8C8A81]">ไม่พบเมนู</div>
                          <p className="mt-3 text-sm font-semibold text-gray-500">
                            ลองล้างคำค้นหา หรือเลือกหมวดหมู่อื่น
                          </p>
                        </div>
                      </div>
                    )}
                </div>
            </div>
           )}
           </div>
      </div>
      {/* EDITOR MODAL (Full width on mobile) */}
      {isEditorOpen && (
          <div className="fixed inset-0 z-[1200] flex items-center justify-end font-bold">
              <div className="absolute inset-0 bg-black/40 backdrop-blur-md animate-in fade-in duration-300 font-bold" onClick={() => setIsEditorOpen(false)}></div>
              <div className="relative w-full sm:max-w-xl bg-[#F5F4F0] h-full shadow-2xl flex flex-col py-10 sm:py-20 px-6 sm:px-16 animate-in slide-in-from-right duration-500 font-bold overflow-y-auto no-scrollbar">
                  <header className="mb-10 sm:mb-16 flex justify-between items-start font-bold">
                      <div className="font-bold">
                          <h2 className="font-serif-luxury text-4xl sm:text-5xl font-light tracking-tighter text-[#1A1A18] border-none font-bold">MENU ASSET</h2>
                          <p className="text-[10px] font-black uppercase tracking-[0.4em] text-[#8C8A81] mt-4 font-bold font-bold font-bold">PROPERTIES • {editingItem.id ? 'EDIT' : 'NEW entry'}</p>
                      </div>
                      <button onClick={() => setIsEditorOpen(false)} className="w-12 h-12 bg-white flex items-center justify-center font-bold font-bold"><X size={24} /></button>
                  </header>

                  <div className="space-y-8 font-bold border-none font-bold">
                      <div className="space-y-3 font-bold border-none font-bold font-bold">
                          <label className="text-[10px] font-black uppercase tracking-[0.2em] text-[#1A1A18]/50 font-bold font-bold">{locale === 'en' ? 'ASSET NAME / ชื่อเมนู' : locale === 'zh' ? 'ASSET NAME / ชื่อเมนู' : 'ASSET NAME / ชื่อเมนู'}</label>
                          <input 
                              type="text"
                              value={editingItem.name}
                              onChange={e => setEditingItem({...editingItem, name: e.target.value})}
                              className="w-full bg-white border border-[#E5E5DF] py-5 px-6 text-sm outline-none focus:border-[#1A1A18] font-bold text-black font-bold font-bold font-bold font-bold font-bold"
                          />
                      </div>

                      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                          <div className="space-y-3">
                              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-[#1A1A18]/50">English Name</label>
                              <input
                                  type="text"
                                  value={editingItem.name_en || ''}
                                  onChange={e => setEditingItem({ ...editingItem, name_en: e.target.value })}
                                  placeholder="Iced Latte"
                                  className="w-full bg-white border border-[#E5E5DF] py-5 px-6 text-sm outline-none focus:border-[#1A1A18] font-bold text-black"
                              />
                          </div>
                          <div className="space-y-3">
                              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-[#1A1A18]/50">Chinese Name</label>
                              <input
                                  type="text"
                                  value={editingItem.name_zh || ''}
                                  onChange={e => setEditingItem({ ...editingItem, name_zh: e.target.value })}
                                  placeholder="冰拿铁"
                                  className="w-full bg-white border border-[#E5E5DF] py-5 px-6 text-sm outline-none focus:border-[#1A1A18] font-bold text-black"
                              />
                          </div>
                      </div>

                      <div className="grid grid-cols-2 gap-6 font-bold border-none font-bold font-bold font-bold">
                          <div className="space-y-3 font-bold border-none font-bold font-bold font-bold font-bold">
                              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-[#1A1A18]/50 font-bold font-bold font-bold font-bold font-bold">SALE PRICE</label>
                              <input 
                                  type="number"
                                  value={editingItem.sale_price}
                                  onChange={e => setEditingItem({...editingItem, sale_price: Number(e.target.value)})}
                                  className="w-full bg-white border border-[#E5E5DF] py-5 px-6 text-sm outline-none font-bold text-black font-bold font-bold font-bold border-none font-bold"
                              />
                          </div>
                          <div className="space-y-3 font-bold border-none font-bold font-bold font-bold font-bold">
                              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-[#1A1A18]/50 font-bold font-bold font-bold">COST PRICE</label>
                              <input 
                                  type="number"
                                  value={editingItem.cost_price}
                                  onChange={e => setEditingItem({...editingItem, cost_price: Number(e.target.value)})}
                                  className="w-full bg-white border border-[#E5E5DF] py-5 px-6 text-sm outline-none font-bold text-black font-bold font-bold border-none font-bold"
                              />
                          </div>
                      </div>

                      <div className="grid grid-cols-2 gap-6 font-bold border-none font-bold font-bold font-bold mt-6">
                          {(!shopSettings?.opening_hours?.active_delivery_platforms || shopSettings.opening_hours.active_delivery_platforms.includes('grab')) && (
                          <div className="space-y-3 font-bold border-none font-bold font-bold font-bold font-bold">
                              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-[#1A1A18]/50 font-bold font-bold font-bold font-bold font-bold">GRAB PRICE</label>
                              <input 
                                  type="number"
                                  value={editingItem.platform_prices?.grab || ''}
                                  onChange={e => setEditingItem({...editingItem, platform_prices: {...(editingItem.platform_prices || {}), grab: Number(e.target.value) || null}})}
                                  className="w-full bg-[#00B14F]/10 border border-[#00B14F]/30 py-5 px-6 text-sm outline-none font-bold text-[#00B14F] placeholder:text-[#00B14F]/50 focus:border-[#00B14F]"
                                  placeholder="Auto"
                              />
                          </div>)}
                          {(!shopSettings?.opening_hours?.active_delivery_platforms || shopSettings.opening_hours.active_delivery_platforms.includes('lineman')) && (
                          <div className="space-y-3 font-bold border-none font-bold font-bold font-bold font-bold">
                              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-[#1A1A18]/50 font-bold font-bold font-bold">LINEMAN PRICE</label>
                              <input 
                                  type="number"
                                  value={editingItem.platform_prices?.lineman || ''}
                                  onChange={e => setEditingItem({...editingItem, platform_prices: {...(editingItem.platform_prices || {}), lineman: Number(e.target.value) || null}})}
                                  className="w-full bg-[#00B900]/10 border border-[#00B900]/30 py-5 px-6 text-sm outline-none font-bold text-[#00B900] placeholder:text-[#00B900]/50 focus:border-[#00B900]"
                                  placeholder="Auto"
                              />
                          </div>)}
                          {(!shopSettings?.opening_hours?.active_delivery_platforms || shopSettings.opening_hours.active_delivery_platforms.includes('shopee')) && (
                          <div className="space-y-3 font-bold border-none font-bold font-bold font-bold font-bold">
                              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-[#1A1A18]/50 font-bold font-bold font-bold">SHOPEE PRICE</label>
                              <input 
                                  type="number"
                                  value={editingItem.platform_prices?.shopee || ''}
                                  onChange={e => setEditingItem({...editingItem, platform_prices: {...(editingItem.platform_prices || {}), shopee: Number(e.target.value) || null}})}
                                  className="w-full bg-[#EE4D2D]/10 border border-[#EE4D2D]/30 py-5 px-6 text-sm outline-none font-bold text-[#EE4D2D] placeholder:text-[#EE4D2D]/50 focus:border-[#EE4D2D]"
                                  placeholder="Auto"
                              />
                          </div>)}
                          {(!shopSettings?.opening_hours?.active_delivery_platforms || shopSettings.opening_hours.active_delivery_platforms.includes('foodpanda')) && (
                          <div className="space-y-3 font-bold border-none font-bold font-bold font-bold font-bold">
                              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-[#1A1A18]/50 font-bold font-bold font-bold">FOODPANDA PRICE</label>
                              <input 
                                  type="number"
                                  value={editingItem.platform_prices?.foodpanda || ''}
                                  onChange={e => setEditingItem({...editingItem, platform_prices: {...(editingItem.platform_prices || {}), foodpanda: Number(e.target.value) || null}})}
                                  className="w-full bg-[#D70F64]/10 border border-[#D70F64]/30 py-5 px-6 text-sm outline-none font-bold text-[#D70F64] placeholder:text-[#D70F64]/50 focus:border-[#D70F64]"
                                  placeholder="Auto"
                              />
                          </div>)}
                          {(!shopSettings?.opening_hours?.active_delivery_platforms || shopSettings.opening_hours.active_delivery_platforms.includes('robinhood')) && (
                          <div className="space-y-3 font-bold border-none font-bold font-bold font-bold font-bold">
                              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-[#1A1A18]/50 font-bold font-bold font-bold">ROBINHOOD PRICE</label>
                              <input 
                                  type="number"
                                  value={editingItem.platform_prices?.robinhood || ''}
                                  onChange={e => setEditingItem({...editingItem, platform_prices: {...(editingItem.platform_prices || {}), robinhood: Number(e.target.value) || null}})}
                                  className="w-full bg-[#6023A2]/10 border border-[#6023A2]/30 py-5 px-6 text-sm outline-none font-bold text-[#6023A2] placeholder:text-[#6023A2]/50 focus:border-[#6023A2]"
                                  placeholder="Auto"
                              />
                          </div>)}
                      </div>

                      <div className="space-y-3 font-bold border-none font-bold font-bold font-bold">
                          <label className="text-[10px] font-black uppercase tracking-[0.2em] text-[#1A1A18]/50 font-bold font-bold font-bold">{locale === 'en' ? 'CATEGORY / หมวดหมู่' : locale === 'zh' ? 'CATEGORY / หมวดหมู่' : 'CATEGORY / หมวดหมู่'}</label>
                          <select 
                              value={editingItem.category_id || ''}
                              onChange={e => setEditingItem({...editingItem, category_id: e.target.value})}
                              className="w-full bg-white border border-[#E5E5DF] py-5 px-6 text-sm outline-none font-black text-black font-bold font-bold border-none font-bold font-bold"
                          >
                              <option value="">SELECT CATEGORY...</option>
                              {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                          </select>
                      </div>

                      <div className="space-y-3 font-bold border-none font-bold">
                          <label className="text-[10px] font-black uppercase tracking-[0.2em] text-[#1A1A18]/50 font-bold">{locale === 'en' ? 'DESCRIPTION / คำอธิบาย' : locale === 'zh' ? 'DESCRIPTION / คำอธิบาย' : 'DESCRIPTION / คำอธิบาย'}</label>
                          <textarea 
                              value={editingItem.description || ''}
                              onChange={e => setEditingItem({...editingItem, description: e.target.value})}
                              placeholder="Describe this asset (Flavor notes, ingredients, etc.)"
                              className="w-full bg-white border border-[#E5E5DF] py-5 px-6 text-sm outline-none focus:border-[#1A1A18] font-bold text-black min-h-[120px] resize-none"
                          />
                      </div>

                      <div className="space-y-4 font-bold border-none font-bold pb-10">
                          <label className="text-[10px] font-black uppercase tracking-[0.2em] text-[#1A1A18]/50 font-bold">{locale === 'en' ? 'MODIFIERS / ตัวเลือกเสริม' : locale === 'zh' ? 'MODIFIERS / ตัวเลือกเสริม' : 'MODIFIERS / ตัวเลือกเสริม'}</label>
                          <div className="grid grid-cols-2 gap-3">
                              {allModifierGroups.map(group => {
                                  const isActive = itemModifierLinks.includes(group.id);
                                  return (
                                      <button 
                                          key={group.id}
                                          type="button"
                                          onClick={() => setItemModifierLinks(prev => isActive ? prev.filter(id => id !== group.id) : [...prev, group.id])}
                                          className={`p-4 border text-left transition-all flex justify-between items-center group/mod ${isActive ? 'bg-[#1A1A18] border-[#1A1A18] text-white shadow-lg' : 'bg-white border-[#E5E5DF] text-[#1A1A18] hover:border-[#1A1A18]'}`}
                                      >
                                          <div className="flex flex-col">
                                              <span className="text-[11px] font-black uppercase leading-tight">{group.name}</span>
                                              <span className={`text-[8px] font-bold uppercase tracking-widest mt-1 ${isActive ? 'text-emerald-400' : 'text-gray-300'}`}>
                                                  {isActive ? 'Active' : 'Not Linked'}
                                              </span>
                                          </div>
                                          <div className={`w-6 h-6 flex items-center justify-center transition-all ${isActive ? 'bg-emerald-500 scale-110' : 'bg-gray-50 border border-gray-100 opacity-20'}`}>
                                              {isActive && <Check size={12} className="text-white" />}
                                          </div>
                                      </button>
                                  );
                              })}
                          </div>
                          {allModifierGroups.length === 0 && (
                              <div className="p-6 bg-gray-50 border border-gray-100 text-[10px] font-black uppercase text-gray-400 text-center tracking-widest">
                                  No modifier groups defined.
                              </div>
                          )}
                      </div>

                      <div className="space-y-3 font-bold border-none font-bold">
                          <label className="text-[10px] font-black uppercase tracking-[0.2em] text-[#1A1A18]/50 font-bold">{locale === 'en' ? 'IMAGE / รูปภาพ' : locale === 'zh' ? 'IMAGE / รูปภาพ' : 'IMAGE / รูปภาพ'}</label>
                          <div className="flex flex-col gap-4">
                              <div className="aspect-video bg-gray-50 border border-dashed border-gray-200 flex items-center justify-center relative overflow-hidden group">
                                  {editingItem.image_url ? (
                                      <>
                                          <img src={editingItem.image_url} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                                          <button 
                                              onClick={() => setEditingItem({...editingItem, image_url: null})}
                                              className="absolute top-4 right-4 p-2 bg-white/80 backdrop-blur-md shadow-xl text-red-500 hover:bg-white transition-all"
                                          >
                                              <Trash size={16} />
                                          </button>
                                      </>
                                  ) : (
                                      <div className="flex flex-col items-center gap-2 opacity-20 group-hover:opacity-100 transition-all">
                                          <ImageIcon size={48} />
                                          <span className="text-[8px] font-black uppercase tracking-widest">No Image Asset</span>
                                      </div>
                                  )}
                              </div>
                              <label className="cursor-pointer w-full h-16 border border-[#1A1A18] flex items-center justify-center gap-4 hover:bg-gray-50 transition-all font-bold">
                                  <ImageIcon size={16} />
                                  <span className="text-[10px] font-black uppercase tracking-[0.3em]">
                                      {editingItem.image_url ? 'CHANGE IMAGE' : 'UPLOAD IMAGE'}
                                  </span>
                                  <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} disabled={isSaving} />
                              </label>
                          </div>
                      </div>

                      <div className="p-6 bg-amber-50 border border-amber-100 flex items-center justify-between transition-all">
                          <div className="flex items-center gap-4">
                              <div className="p-3 bg-amber-100 text-amber-600 rounded-[16px]">
                                  <Star size={20} fill="currentColor" />
                              </div>
                              <div>
                                  <h4 className="text-[10px] font-black uppercase tracking-widest text-amber-900">Recommended Item</h4>
                                  <p className="text-[8px] font-bold text-amber-600/60 uppercase mt-0.5 tracking-widest">Show in Signature section on LIFF</p>
                              </div>
                          </div>
                          <button 
                              onClick={() => setEditingItem({...editingItem, is_recommended: !editingItem?.is_recommended})}
                              type="button"
                              className={`w-14 h-8 rounded-none relative transition-all duration-300 ${editingItem?.is_recommended ? 'bg-amber-400' : 'bg-gray-200'}`}
                          >
                              <div className={`absolute top-1 left-1 w-6 h-6 bg-white rounded-none transition-all duration-300 ${editingItem?.is_recommended ? 'translate-x-6' : 'translate-x-0'}`} />
                          </button>
                      </div>

                      <div className="p-6 bg-rose-50 border border-rose-100 flex items-center justify-between transition-all">
                          <div className="flex items-center gap-4">
                              <div className="p-3 bg-rose-100 text-rose-600 rounded-[16px]">
                                  <Star size={20} fill="currentColor" />
                              </div>
                              <div>
                                  <h4 className="text-[10px] font-black uppercase tracking-widest text-rose-900">Popular Item</h4>
                                  <p className="text-[8px] font-bold text-rose-600/60 uppercase mt-0.5 tracking-widest">Highlight as popular menu</p>
                              </div>
                          </div>
                          <button 
                              onClick={() => setEditingItem({...editingItem, is_popular: !editingItem?.is_popular})}
                              type="button"
                              className={`w-14 h-8 rounded-none relative transition-all duration-300 ${editingItem?.is_popular ? 'bg-rose-500' : 'bg-gray-200'}`}
                          >
                              <div className={`absolute top-1 left-1 w-6 h-6 bg-white rounded-none transition-all duration-300 ${editingItem?.is_popular ? 'translate-x-6' : 'translate-x-0'}`} />
                          </button>
                      </div>

                      <div className="p-6 bg-emerald-50 border border-emerald-100 flex items-center justify-between transition-all">
                          <div className="flex items-center gap-4">
                              <div className="p-3 bg-emerald-100 text-emerald-600 rounded-[16px]">
                                  <Check size={20} />
                              </div>
                              <div>
                                  <h4 className="text-[10px] font-black uppercase tracking-widest text-emerald-900">Available Online (QR Menu)</h4>
                                  <p className="text-[8px] font-bold text-emerald-600/60 uppercase mt-0.5 tracking-widest">Allow customers to order via QR Code</p>
                              </div>
                          </div>
                          <button 
                              onClick={() => setEditingItem({...editingItem, is_online_available: editingItem.is_online_available === undefined ? false : !editingItem.is_online_available})}
                              type="button"
                              className={`w-14 h-8 rounded-none relative transition-all duration-300 ${editingItem?.is_online_available !== false ? 'bg-emerald-500' : 'bg-gray-200'}`}
                          >
                              <div className={`absolute top-1 left-1 w-6 h-6 bg-white rounded-none transition-all duration-300 ${editingItem?.is_online_available !== false ? 'translate-x-6' : 'translate-x-0'}`} />
                          </button>
                      </div>

                      <div className="p-6 bg-blue-50 border border-blue-100 flex items-center justify-between transition-all">
                          <div className="flex items-center gap-4">
                              <div className="p-3 bg-blue-100 text-blue-600 rounded-[16px]">
                                  <Check size={20} />
                              </div>
                              <div>
                                  <h4 className="text-[10px] font-black uppercase tracking-widest text-blue-900">Available for Delivery</h4>
                                  <p className="text-[8px] font-bold text-blue-600/60 uppercase mt-0.5 tracking-widest">Allow customers to order for delivery</p>
                              </div>
                          </div>
                          <button 
                              onClick={() => setEditingItem({...editingItem, is_delivery_available: editingItem.is_delivery_available === undefined ? false : !editingItem.is_delivery_available})}
                              type="button"
                              className={`w-14 h-8 rounded-none relative transition-all duration-300 ${editingItem?.is_delivery_available !== false ? 'bg-blue-500' : 'bg-gray-200'}`}
                          >
                              <div className={`absolute top-1 left-1 w-6 h-6 bg-white rounded-none transition-all duration-300 ${editingItem?.is_delivery_available !== false ? 'translate-x-6' : 'translate-x-0'}`} />
                          </button>
                      </div>
                  </div>

                  <button onClick={handleSaveItem} disabled={isSaving} className="w-full mt-auto py-8 bg-[#1A1A18] text-white text-[11px] font-black uppercase tracking-[0.5em] transition-all flex items-center justify-center gap-6 font-bold">
                     {isSaving ? <Loader2 className="animate-spin text-white font-bold font-bold font-bold" /> : (editingItem.id ? 'บันทึกการแก้ไข' : 'เพิ่มรายการเมนู')}
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

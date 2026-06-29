'use client';
import React, { useState, useEffect } from 'react'
import {
  Plus,
  Search,
  Edit3,
  Trash2,
  Loader2,
  Check,
  X,
  Save,
  Settings,
  Layers,
  Menu,
  ChevronRight,
  List,
  LayoutGrid,
  Info,
  AlertTriangle,
  Star,
  GripVertical,
} from 'lucide-react'
import { supabase } from '@/lib/supabaseClient'
import { motion, AnimatePresence, Reorder, useDragControls } from 'framer-motion'
import { useI18n } from "@/lib/I18nContext";

interface POSModifierManagerProps {
  profile: any
  activeView: string
  allowedNav: any[]
  onSetView: (view: any) => void
  activeShift?: any
  onShiftModalOpen?: () => void
  setViewExtraHeader: (node: React.ReactNode) => void
  shopSettings?: any
}

const ModifierGroupItem = ({
  group,
  onReorderOptions,
}: {
  group: any
  onReorderOptions: (newOptions: any[]) => void
}) => {
  const controls = useDragControls()
  const { locale } = useI18n();

  return (
    <Reorder.Item
      value={group}
      dragListener={false}
      dragControls={controls}
      className="flex flex-col border-2 border-[#1A1A18] bg-white shadow-sm"
    >
      <div className="flex items-center gap-4 border-b border-gray-100 bg-gray-50 p-4">
        <div
          onPointerDown={e => controls.start(e)}
          className="cursor-grab p-1 active:cursor-grabbing"
          style={{ touchAction: 'none' }}
        >
          <GripVertical size={20} className="text-gray-400" />
        </div>
        <h3 className="font-black uppercase tracking-tighter text-black">{group.name}</h3>
      </div>
      {group.options && group.options.length > 0 && (
        <div className="bg-white p-4">
          <Reorder.Group
            axis="y"
            values={group.options}
            onReorder={onReorderOptions}
            className="space-y-2"
          >
            {group.options.map((opt: any) => (
              <Reorder.Item
                key={opt.id}
                value={opt}
                className="group/item flex cursor-grab items-center gap-3 border border-gray-100 bg-white p-3 transition-all hover:border-[#1A1A18]/20 hover:shadow-sm active:cursor-grabbing"
                style={{ touchAction: 'none' }}
              >
                <Menu size={14} className="text-gray-300 group-hover/item:text-black" />
                <span className="text-[12px] font-bold uppercase text-gray-600 transition-colors group-hover/item:text-black">
                  {opt.name}
                </span>
                {opt.price_adjustment > 0 && (
                  <span className="ml-auto text-[10px] font-black text-emerald-600">
                    {locale === 'en' ? '                     + ฿' : locale === 'zh' ? '                     + ฿' : '                     + ฿'}{opt.price_adjustment}
                  </span>
                )}
              </Reorder.Item>
            ))}
          </Reorder.Group>
        </div>
      )}
    </Reorder.Item>
  )
}

export default function POSModifierManager({
  profile, activeView, allowedNav, onSetView, activeShift, onShiftModalOpen, setViewExtraHeader, shopSettings
}: POSModifierManagerProps) {
  const { locale } = useI18n();
  const [groups, setGroups] = useState<any[]>([])
  const [allOptions, setAllOptions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')

  const [isGroupEditorOpen, setIsGroupEditorOpen] = useState(false)
  const [editingGroup, setEditingGroup] = useState<any>(null)

  const [isOptionEditorOpen, setIsOptionEditorOpen] = useState(false)
  const [editingOption, setEditingOption] = useState<any>(null)

  const [isSaving, setIsSaving] = useState(false)

  const [allMenuItems, setAllMenuItems] = useState<any[]>([])
  const [groupLinks, setGroupLinks] = useState<string[]>([])

  // --- Bulk Edit / Table View ---
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid')
  const [visibleColumns, setVisibleColumns] = useState<string[]>([
    'name',
    'group_name',
    'price_adjustment',
    'is_active',
  ])
  const [showColumnSelector, setShowColumnSelector] = useState(false)
  const [isSortMode, setIsSortMode] = useState(false)
  const [isSavingOrder, setIsSavingOrder] = useState(false)

  const handleReorderGroups = (newGroups: any[]) => {
    setGroups(newGroups)
  }

  const handleReorderOptions = (groupId: string, newOptions: any[]) => {
    setGroups(prev => prev.map(g => (g.id === groupId ? { ...g, options: newOptions } : g)))
  }

  // DEBOUNCED SAVE LOGIC
  useEffect(() => {
    if (!isSortMode) return

    const saveOrder = async () => {
      setIsSavingOrder(true)
      try {
        // 1. Save Groups Order
        const groupUpdates = groups.map((g, idx) => ({ id: g.id, sort_order: idx + 1 }))
        for (const update of groupUpdates) {
          await supabase
            .from('pos_menu_modifier_groups')
            .update({ sort_order: update.sort_order })
            .eq('id', update.id)
        }

        // 2. Save Options Order within each group
        for (const group of groups) {
          if (group.options) {
            const optionUpdates = group.options.map((o: any, idx: number) => ({
              id: o.id,
              sort_order: idx + 1,
            }))
            for (const update of optionUpdates) {
              await supabase
                .from('pos_menu_modifiers')
                .update({ sort_order: update.sort_order })
                .eq('id', update.id)
            }
          }
        }
      } catch (e) {
        console.error('Failed to save order:', e)
      } finally {
        setIsSavingOrder(false)
      }
    }

    const timer = setTimeout(saveOrder, 2000)
    return () => clearTimeout(timer)
  }, [groups, isSortMode])

  const columns = [
    { id: 'name', label: 'ชื่อรายการย่อย' },
    { id: 'group_name', label: 'กลุ่มตัวเลือก' },
    { id: 'price_adjustment', label: 'ราคาเพิ่ม/ลด' },
    { id: 'sort_order', label: 'ลำดับ' },
    { id: 'is_active', label: 'เปิดใช้งาน' },
  ]

  useEffect(() => {
    if (shopSettings) {
      fetchData()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shopSettings?.branch_id])

  useEffect(() => {
    setViewExtraHeader(
      <div className="flex items-center justify-end gap-4">
        <div className="flex items-center gap-1 border border-gray-100 bg-gray-50 p-1">
          <button
            onClick={() => setIsSortMode(prev => !prev)}
            className={`flex h-10 items-center justify-center px-4 transition-all ${isSortMode ? 'bg-[#1A1A18] text-white shadow-lg' : 'font-bold text-gray-300 hover:text-black'} gap-2 text-[10px] font-black uppercase tracking-widest`}
          >
            <GripVertical size={14} /> {isSortMode ? 'Done Sorting' : 'Sort Mode'}
          </button>
          <button
            onClick={() => setViewMode('grid')}
            className={`flex h-10 w-10 items-center justify-center transition-all ${viewMode === 'grid' ? 'bg-[#1A1A18] text-white shadow-lg' : 'font-bold text-gray-300 hover:text-black'}`}
          >
            <LayoutGrid size={18} />
          </button>
          <button
            onClick={() => setViewMode('table')}
            className={`flex h-10 w-10 items-center justify-center transition-all ${viewMode === 'table' ? 'bg-[#1A1A18] text-white shadow-lg' : 'font-bold text-gray-300 hover:text-black'}`}
          >
            <List size={18} />
          </button>
        </div>
        <button
          onClick={() => openGroupEditor()}
          className="flex h-10 items-center justify-center gap-3 whitespace-nowrap bg-[#1A1A18] px-8 font-bold text-white shadow-xl transition-all hover:bg-black"
        >
          <Plus size={16} />{' '}
          <span className="text-[10px] font-black font-bold uppercase tracking-widest">
            {locale === 'en' ? '             เพิ่มกลุ่มตัวเลือก           ' : locale === 'zh' ? '             เพิ่มกลุ่มตัวเลือก           ' : '             เพิ่มกลุ่มตัวเลือก           '}</span>
        </button>
      </div>
    )
    return () => setViewExtraHeader(null)
  }, [setViewExtraHeader, searchTerm, viewMode, isSortMode])

  const fetchData = async () => {
    setLoading(true)
    const branchId = shopSettings?.branch_id

    let query = supabase
      .from('pos_menu_modifier_groups')
      .select('*, options:pos_menu_modifiers(*)')
      .order('sort_order', { ascending: true })
      .order('name', { ascending: true })

    if (branchId) {
      query = query.eq('branch_id', branchId)
    } else {
      query = query.is('branch_id', null)
    }

    const { data: groupData } = await query

    // Fetch all menu items for linking
    const { data: itemData } = await supabase
      .from('pos_menu_items')
      .select('id, name')
      .order('name')
    if (itemData) setAllMenuItems(itemData)

    if (groupData) {
      setGroups(groupData)
      const flatOptions: any[] = []
      groupData.forEach((g: any) => {
        if (g.options) {
          // Sort options within group
          const sortedOptions = [...g.options].sort(
            (a: any, b: any) => a.sort_order - b.sort_order || a.name.localeCompare(b.name)
          )
          sortedOptions.forEach((o: any) => {
            flatOptions.push({ ...o, group_name: g.name })
          })
        }
      })
      setAllOptions(flatOptions)
    }
    setLoading(false)
  }

  const fetchGroupLinks = async (groupId: string) => {
    const { data } = await supabase
      .from('pos_item_modifier_links')
      .select('item_id')
      .eq('group_id', groupId)
    if (data) setGroupLinks(data.map(d => d.item_id))
    else setGroupLinks([])
  }

  const openGroupEditor = (group: any = null) => {
    setEditingGroup(
      group || { name: '', min_selection: 0, max_selection: 1, sort_order: 0, is_active: true }
    )
    if (group) fetchGroupLinks(group.id)
    else setGroupLinks([])
    setIsGroupEditorOpen(true)
  }

  const openOptionEditor = (group: any, option: any = null) => {
    setEditingOption(
      option || {
        group_id: group.id,
        name: '',
        price_adjustment: 0,
        sort_order: 0,
        is_active: true,
      }
    )
    setIsOptionEditorOpen(true)
  }

  const handleSaveGroup = async () => {
    setIsSaving(true)
    try {
      const { options, ...cleanGroup } = editingGroup

      // Ensure we use the correct column names for selection constraints
      const groupToSave = {
        ...cleanGroup,
        min_selection: cleanGroup.min_select || cleanGroup.min_selection || 0,
        max_selection: cleanGroup.max_select || cleanGroup.max_selection || 1,
        // Sync with the legacy columns if they exist
        min_select: cleanGroup.min_select || cleanGroup.min_selection || 0,
        max_select: cleanGroup.max_select || cleanGroup.max_selection || 1,
        branch_id: shopSettings?.branch_id || null
      }

      const { data: savedGroup, error } = await supabase
        .from('pos_menu_modifier_groups')
        .upsert(groupToSave)
        .select()
        .single()

      if (!error && savedGroup) {
        const groupId = savedGroup.id

        // Sync links
        await supabase.from('pos_item_modifier_links').delete().eq('group_id', groupId)
        if (groupLinks.length > 0) {
          const links = groupLinks.map(itemId => ({ group_id: groupId, item_id: itemId }))
          await supabase.from('pos_item_modifier_links').insert(links)
        }

        setIsGroupEditorOpen(false)
        fetchData()
      } else {
        alert('Error: ' + error?.message)
      }
    } catch (e) {
      console.error(e)
    }
    setIsSaving(false)
  }

  const handleSaveOption = async () => {
    setIsSaving(true)
    const { group_name, ...optionToSave } = editingOption
    const { error } = await supabase.from('pos_menu_modifiers').upsert(optionToSave)
    if (!error) {
      setIsOptionEditorOpen(false)
      fetchData()
    } else {
      alert('Error: ' + error.message)
    }
    setIsSaving(false)
  }

  const handleBulkUpdate = async (id: string, field: string, value: any) => {
    const { error } = await supabase
      .from('pos_menu_modifiers')
      .update({ [field]: value })
      .eq('id', id)
    if (!error) {
      setAllOptions(prev => prev.map(opt => (opt.id === id ? { ...opt, [field]: value } : opt)))
      // Still need to update groups state too if we want grid to sync
      fetchData()
    }
  }

  const handleDeleteGroup = async (id: string) => {
    if (!confirm('ยืนยันการลบกลุ่มนี้? รายการย่อยทั้งหมดจะถูกลบไปด้วย')) return
    await supabase.from('pos_menu_modifier_groups').delete().eq('id', id)
    fetchData()
  }

  const handleDeleteOption = async (id: string) => {
    if (!confirm('ยืนยันการลบรายการย่อยนี้?')) return
    await supabase.from('pos_menu_modifiers').delete().eq('id', id)
    fetchData()
  }

  const filteredGroups = groups.filter(g => g.name.toLowerCase().includes(searchTerm.toLowerCase()))
  const filteredOptions = allOptions.filter(
    o =>
      o.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      o.group_name.toLowerCase().includes(searchTerm.toLowerCase())
  )
  return (
    <div className="no-scrollbar relative min-h-full overflow-y-auto p-4 font-bold sm:p-10">
      
      {/* SEARCH BAR */}
      {!isSortMode && (
        <div className="mb-8">
            <div className="relative group w-full max-w-2xl">
                <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300 group-focus-within:text-[#1A1A18]" />
                <input 
                    type="text" 
                    placeholder={locale === 'en' ? 'ค้นหาชื่อตัวเลือกเสริม หรือ กลุ่มตัวเลือก...' : locale === 'zh' ? 'ค้นหาชื่อตัวเลือกเสริม หรือ กลุ่มตัวเลือก...' : 'ค้นหาชื่อตัวเลือกเสริม หรือ กลุ่มตัวเลือก...'} 
                    className="w-full bg-white border border-[#F0F0E8] py-4 pl-12 pr-4 text-[14px] outline-none focus:border-[#1A1A18] transition-all font-bold placeholder:text-gray-200 text-black shadow-sm"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>
        </div>
      )}
      {/* FLOATING ACTION BUTTON - FORCED VISIBILITY */}
      <div className="fixed bottom-10 right-10 z-[2000] flex flex-col gap-4">
        <button
          onClick={() => openGroupEditor()}
          className="flex h-16 items-center justify-center gap-4 whitespace-nowrap border-2 border-white/20 bg-[#1A1A18] px-10 font-bold text-white shadow-2xl transition-all hover:bg-black active:scale-95"
        >
          <Plus size={24} />
          <span className="text-[12px] font-black font-bold uppercase tracking-[0.2em]">
            {locale === 'en' ? '             เพิ่มกลุ่มตัวเลือกใหม่           ' : locale === 'zh' ? '             เพิ่มกลุ่มตัวเลือกใหม่           ' : '             เพิ่มกลุ่มตัวเลือกใหม่           '}</span>
        </button>
      </div>

      {loading ? (
        <div className="flex h-64 items-center justify-center opacity-20">
          <Loader2 className="animate-spin" size={48} />
        </div>
      ) : isSortMode ? (
        <div className="mx-auto w-full max-w-3xl pb-32">
          <div className="mb-8 flex items-center justify-between border border-amber-200 bg-amber-50 p-4 text-amber-800 shadow-sm">
            <div className="flex items-center gap-4">
              <AlertTriangle size={24} />
              <div className="text-[11px] font-black uppercase tracking-widest">
                Sorting Mode: Drag and drop items to reorder globally.
              </div>
            </div>
            {isSavingOrder && (
              <div className="flex items-center gap-3">
                <Loader2 size={16} className="animate-spin" />
                <span className="text-[10px] font-black uppercase tracking-widest">Saving...</span>
              </div>
            )}
          </div>
          <Reorder.Group
            axis="y"
            values={groups}
            onReorder={handleReorderGroups}
            className="space-y-6"
          >
            {groups.map((group: any) => (
              <ModifierGroupItem
                key={group.id}
                group={group}
                onReorderOptions={newOptions => handleReorderOptions(group.id, newOptions)}
              />
            ))}
          </Reorder.Group>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
          {filteredGroups.map(group => (
            <div
              key={group.id}
              className="group flex flex-col border border-[#F0F0E8] bg-white transition-all hover:shadow-xl"
            >
              <header className="flex items-center justify-between border-b border-gray-50 bg-gray-50/50 p-6">
                <div>
                  <h3 className="text-sm font-black uppercase tracking-tight text-black">
                    {group.name}
                  </h3>
                  <p className="mt-1 text-[9px] font-black uppercase tracking-widest text-gray-400">
                    {locale === 'en' ? '                     เลือก: ' : locale === 'zh' ? '                     เลือก: ' : '                     เลือก: '}{group.min_select === 0 ? 'ระบุหรือไม่ก็ได้' : 'ต้องเลือก'} {locale === 'en' ? ' (สูงสุด:' : locale === 'zh' ? ' (สูงสุด:' : ' (สูงสุด:'}{' '}
                    {group.max_select})
                  </p>
                </div>
                <div className="flex gap-2">
                  <div className="mr-2 flex flex-col items-center justify-center border border-gray-100 bg-white px-2 py-1 text-[10px] font-black uppercase tracking-widest text-gray-300" style={{ writingMode: 'vertical-rl' }}>
                    {locale === 'en' ? '                     ใช้ SORT MODE                   ' : locale === 'zh' ? '                     ใช้ SORT MODE                   ' : '                     ใช้ SORT MODE                   '}</div>
                  <button
                    onClick={() => openGroupEditor(group)}
                    className="flex h-8 w-8 items-center justify-center border border-gray-100 bg-white font-bold text-gray-400 transition-all hover:border-black hover:text-black"
                  >
                    <Edit3 size={14} />
                  </button>
                  <button
                    onClick={() => handleDeleteGroup(group.id)}
                    className="flex h-8 w-8 items-center justify-center border border-gray-100 bg-white font-bold text-red-200 transition-all hover:border-red-500 hover:text-red-500"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </header>
              <div className="flex-1 space-y-3 p-6">
                {group.options?.map((opt: any) => (
                  <div
                    key={opt.id}
                    className="flex items-center justify-between border border-transparent bg-gray-50 p-4 transition-all hover:border-black/5"
                  >
                    <div className="flex items-center gap-4">
                      <div
                        className={`h-2 w-2 rounded-none ${opt.is_active ? 'bg-emerald-400' : 'bg-gray-300'}`}
                      ></div>
                      <span className="text-[12px] font-black uppercase text-black">
                        {opt.name}
                      </span>
                      {opt.price_adjustment > 0 && (
                        <span className="text-[10px] font-black text-emerald-600">
                          {locale === 'en' ? '                           + ฿' : locale === 'zh' ? '                           + ฿' : '                           + ฿'}{opt.price_adjustment}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-4">
                      <button
                        onClick={() => openOptionEditor(group, opt)}
                        className="text-gray-300 transition-all hover:text-black"
                      >
                        <Edit3 size={12} />
                      </button>
                      <button
                        onClick={() => handleDeleteOption(opt.id)}
                        className="font-bold text-gray-200 transition-all hover:text-red-500"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  </div>
                ))}
                <button
                  onClick={() => openOptionEditor(group)}
                  className="flex w-full items-center justify-center gap-3 border-2 border-dashed border-gray-100 py-4 text-[10px] font-black font-bold uppercase tracking-widest text-gray-300 transition-all hover:border-black hover:text-black"
                >
                  <Plus size={14} /> {locale === 'en' ? ' เพิ่มตัวเลือกในกลุ่ม ' : locale === 'zh' ? ' เพิ่มตัวเลือกในกลุ่ม ' : ' เพิ่มตัวเลือกในกลุ่ม '}{group.name}
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="relative min-h-[500px] overflow-x-auto border border-[#F0F0E8] bg-white">
          <div className="absolute left-0 top-[-40px] z-20">
            <button
              onClick={() => setShowColumnSelector(!showColumnSelector)}
              className="flex items-center gap-2 border border-[#F0F0E8] bg-gray-50 px-4 py-2 text-[9px] font-black uppercase tracking-widest transition-all hover:border-black"
            >
              <Settings size={12} /> {locale === 'en' ? ' ปรับแต่งตาราง             ' : locale === 'zh' ? ' ปรับแต่งตาราง             ' : ' ปรับแต่งตาราง             '}</button>
            <AnimatePresence>
              {showColumnSelector && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="absolute left-0 top-12 z-30 w-64 space-y-4 border border-black bg-white p-6 shadow-2xl"
                >
                  <div className="mb-4 border-b border-gray-50 pb-2 text-[10px] font-black uppercase tracking-widest">
                    {locale === 'en' ? '                     แสดงคอลัมน์                   ' : locale === 'zh' ? '                     แสดงคอลัมน์                   ' : '                     แสดงคอลัมน์                   '}</div>
                  {columns.map(col => (
                    <label key={col.id} className="group flex cursor-pointer items-center gap-3">
                      <input
                        type="checkbox"
                        className="h-4 w-4 accent-black"
                        checked={visibleColumns.includes(col.id)}
                        onChange={() =>
                          setVisibleColumns(prev =>
                            prev.includes(col.id)
                              ? prev.filter(p => p !== col.id)
                              : [...prev, col.id]
                          )
                        }
                      />
                      <span className="text-[11px] font-black uppercase text-gray-400 transition-colors group-hover:text-black">
                        {col.label}
                      </span>
                    </label>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <table className="w-full min-w-[1000px] border-collapse text-left">
            <thead>
              <tr className="border-b border-[#F0F0E8] bg-gray-50">
                <th className="sticky left-0 z-10 w-12 border-r border-[#F0F0E8] bg-gray-50 p-6 text-[10px] font-black uppercase tracking-widest text-[#8C8A81]">
                  #
                </th>
                {columns
                  .filter(c => visibleColumns.includes(c.id))
                  .map(col => (
                    <th
                      key={col.id}
                      className="p-6 text-[10px] font-black uppercase tracking-widest text-[#8C8A81]"
                    >
                      {col.label}
                    </th>
                  ))}
                <th className="w-20 p-6 text-[10px] font-black uppercase tracking-widest text-[#8C8A81]">
                  Action
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F0F0E8]">
              {filteredOptions.map((opt, idx) => (
                <tr key={opt.id} className="group transition-colors hover:bg-gray-50/50">
                  <td className="sticky left-0 z-10 border-r border-[#F0F0E8] bg-white p-6 text-center text-[11px] font-black text-gray-300 group-hover:bg-gray-50/50">
                    {idx + 1}
                  </td>

                  {visibleColumns.includes('name') && (
                    <td className="border-r border-[#F0F0E8] p-0">
                      <input
                        type="text"
                        defaultValue={opt.name}
                        onBlur={e => handleBulkUpdate(opt.id, 'name', e.target.value)}
                        className="h-full w-full bg-transparent p-6 text-[12px] font-black uppercase text-black outline-none focus:ring-1 focus:ring-black"
                      />
                    </td>
                  )}

                  {visibleColumns.includes('group_name') && (
                    <td className="border-r border-[#F0F0E8] p-6">
                      <span className="border border-gray-100 bg-gray-50 px-3 py-1 text-[10px] font-black uppercase text-gray-300">
                        {opt.group_name}
                      </span>
                    </td>
                  )}

                  {visibleColumns.includes('price_adjustment') && (
                    <td className="border-r border-[#F0F0E8] p-0">
                      <div className="relative">
                        <span className="absolute left-6 top-1/2 -translate-y-1/2 text-[10px] text-gray-300">
                          {locale === 'en' ? '                           ฿                         ' : locale === 'zh' ? '                           ฿                         ' : '                           ฿                         '}</span>
                        <input
                          type="number"
                          defaultValue={opt.price_adjustment}
                          onBlur={e =>
                            handleBulkUpdate(opt.id, 'price_adjustment', Number(e.target.value))
                          }
                          className="h-full w-full bg-transparent py-6 pl-10 pr-6 text-[14px] font-black font-bold text-emerald-600 outline-none focus:ring-1 focus:ring-black"
                        />
                      </div>
                    </td>
                  )}

                  {visibleColumns.includes('sort_order') && (
                    <td className="border-r border-[#F0F0E8] p-0">
                      <input
                        type="number"
                        defaultValue={opt.sort_order}
                        onBlur={e => handleBulkUpdate(opt.id, 'sort_order', Number(e.target.value))}
                        className="h-full w-full bg-transparent p-6 text-center text-[12px] font-black outline-none focus:ring-1 focus:ring-black"
                      />
                    </td>
                  )}

                  {visibleColumns.includes('is_active') && (
                    <td className="border-r border-[#F0F0E8] p-6 text-center">
                      <button
                        onClick={() => handleBulkUpdate(opt.id, 'is_active', !opt.is_active)}
                        className={`relative h-6 w-12 rounded-none transition-all duration-300 ${opt.is_active ? 'bg-emerald-500' : 'bg-gray-200'}`}
                      >
                        <div
                          className={`absolute left-1 top-1 h-4 w-4 rounded-none bg-white transition-all duration-300 ${opt.is_active ? 'translate-x-6' : 'translate-x-0'}`}
                        />
                      </button>
                    </td>
                  )}

                  <td className="p-6 text-center">
                    <div className="flex justify-center gap-2">
                      <button
                        onClick={() => {
                          setEditingOption(opt)
                          setIsOptionEditorOpen(true)
                        }}
                        className="text-gray-200 transition-all hover:text-black"
                      >
                        <Edit3 size={16} />
                      </button>
                      <button
                        onClick={() => handleDeleteOption(opt.id)}
                        className="text-gray-100 transition-all hover:text-red-500"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* GROUP EDITOR */}
      {isGroupEditorOpen && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-end font-bold">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-md"
            onClick={() => setIsGroupEditorOpen(false)}
          ></div>
          <div className="animate-in slide-in-from-right no-scrollbar relative flex h-full w-full max-w-xl flex-col overflow-y-auto bg-white p-16 font-bold shadow-2xl duration-500">
            <header className="mb-12 flex items-start justify-between font-bold">
              <div className="border-none font-bold">
                <h2 className="border-none text-4xl font-black font-bold uppercase tracking-tighter text-black">
                  {locale === 'en' ? '                   กลุ่มตัวเลือก                 ' : locale === 'zh' ? '                   กลุ่มตัวเลือก                 ' : '                   กลุ่มตัวเลือก                 '}</h2>
                <p className="mt-2 border-none text-[10px] font-black font-bold uppercase leading-none tracking-widest text-gray-400">
                  {editingGroup.id ? 'แก้ไข' : 'สร้าง'} {locale === 'en' ? ' เงื่อนไขกลุ่มตัวเลือก                 ' : locale === 'zh' ? ' เงื่อนไขกลุ่มตัวเลือก                 ' : ' เงื่อนไขกลุ่มตัวเลือก                 '}</p>
              </div>
              <button onClick={() => setIsGroupEditorOpen(false)} className="border-none font-bold">
                <X size={24} />
              </button>
            </header>
            <div className="flex-1 space-y-8 border-none font-bold">
              <div className="space-y-4 border-none font-bold">
                <label className="border-none text-[10px] font-black font-bold uppercase leading-none text-gray-400">
                  {locale === 'en' ? '                   Group Name / ชื่อกลุ่มตัวเลือก                 ' : locale === 'zh' ? '                   Group Name / ชื่อกลุ่มตัวเลือก                 ' : '                   Group Name / ชื่อกลุ่มตัวเลือก                 '}</label>
                <input
                  type="text"
                  value={editingGroup.name}
                  onChange={e => setEditingGroup({ ...editingGroup, name: e.target.value })}
                  placeholder="e.g. Choice of Milk, Roast Level"
                  className="w-full border-none border-none bg-gray-50 px-6 py-4 text-xl font-black font-bold text-black outline-none focus:ring-2 focus:ring-[#1A1A18]"
                />
              </div>
              <div className="grid grid-cols-2 gap-8 border-none font-bold">
                <div className="space-y-4 border-none font-bold">
                  <label className="border-none text-[10px] font-black font-bold uppercase text-gray-400">
                    MIN SELECT (0=Optional)
                  </label>
                  <input
                    type="number"
                    value={editingGroup.min_select}
                    onChange={e =>
                      setEditingGroup({ ...editingGroup, min_select: Number(e.target.value) })
                    }
                    className="w-full border-none border-none bg-gray-50 px-6 py-4 text-xl font-black font-bold text-black outline-none focus:ring-2 focus:ring-[#1A1A18]"
                  />
                </div>
                <div className="space-y-4 border-none font-bold">
                  <label className="border-none text-[10px] font-black font-bold uppercase text-gray-400">
                    {locale === 'en' ? '                     MAX SELECT (สูงสุด)                   ' : locale === 'zh' ? '                     MAX SELECT (สูงสุด)                   ' : '                     MAX SELECT (สูงสุด)                   '}</label>
                  <input
                    type="number"
                    value={editingGroup.max_selection}
                    onChange={e =>
                      setEditingGroup({ ...editingGroup, max_selection: Number(e.target.value) })
                    }
                    className="w-full border-none border-none bg-gray-50 px-6 py-4 text-xl font-black font-bold text-black outline-none focus:ring-2 focus:ring-[#1A1A18]"
                  />
                </div>
              </div>

              <div className="space-y-4 border-none font-bold">
                <label className="border-none text-[10px] font-black font-bold uppercase text-gray-400">
                  {locale === 'en' ? '                   SORT ORDER (ลำดับการเรียง)                 ' : locale === 'zh' ? '                   SORT ORDER (ลำดับการเรียง)                 ' : '                   SORT ORDER (ลำดับการเรียง)                 '}</label>
                <input
                  type="number"
                  value={editingGroup.sort_order}
                  onChange={e =>
                    setEditingGroup({ ...editingGroup, sort_order: Number(e.target.value) })
                  }
                  placeholder="0, 1, 2..."
                  className="w-full border-none border-none bg-gray-100 px-6 py-4 text-xl font-black font-bold text-black outline-none focus:ring-2 focus:ring-[#1A1A18]"
                />
              </div>

              <div className="space-y-4 border-t border-none border-gray-50 pt-8 font-bold">
                <label className="border-none text-[10px] font-black font-bold uppercase text-gray-400">
                  {locale === 'en' ? '                   LINKED MENU ITEMS / ผูกกับเมนู                 ' : locale === 'zh' ? '                   LINKED MENU ITEMS / ผูกกับเมนู                 ' : '                   LINKED MENU ITEMS / ผูกกับเมนู                 '}</label>
                <div className="no-scrollbar grid max-h-[300px] grid-cols-2 gap-4 overflow-y-auto pr-2">
                  {allMenuItems.map(item => {
                    const isActive = groupLinks.includes(item.id)
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() =>
                          setGroupLinks(prev =>
                            isActive ? prev.filter(id => id !== item.id) : [...prev, item.id]
                          )
                        }
                        className={`flex items-center justify-between border p-4 text-left transition-all ${isActive ? 'border-[#1A1A18] bg-[#1A1A18] text-white shadow-lg' : 'border-[#E5E5DF] bg-white text-[#1A1A18] hover:border-[#1A1A18]'}`}
                      >
                        <span className="text-[11px] font-black uppercase leading-tight">
                          {item.name}
                        </span>
                        {isActive && <Check size={14} className="text-emerald-400" />}
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>
            <button
              onClick={handleSaveGroup}
              disabled={isSaving}
              className="flex w-full items-center justify-center gap-4 bg-[#1A1A18] py-8 text-[11px] font-black font-bold uppercase tracking-[0.4em] text-white shadow-xl"
            >
              {isSaving ? (
                <Loader2 className="animate-spin text-white" />
              ) : (
                <>
                  <Save size={18} /> {locale === 'en' ? ' ยืนยันการเปลี่ยนแปลง                 ' : locale === 'zh' ? ' ยืนยันการเปลี่ยนแปลง                 ' : ' ยืนยันการเปลี่ยนแปลง                 '}</>
              )}
            </button>
          </div>
        </div>
      )}

      {/* OPTION EDITOR */}
      {isOptionEditorOpen && (
        <div className="fixed inset-0 z-[2001] flex items-center justify-end font-bold">
          <div
            className="absolute inset-0 bg-black/60 font-bold backdrop-blur-sm"
            onClick={() => setIsOptionEditorOpen(false)}
          ></div>
          <div className="animate-in slide-in-from-right no-scrollbar relative flex h-full w-full max-w-xl flex-col overflow-y-auto bg-white p-16 font-bold shadow-2xl duration-500">
            <header className="mb-12 flex items-start justify-between font-bold">
              <div className="border-none font-bold">
                <h2 className="border-none text-4xl font-black font-bold uppercase tracking-tighter text-black">
                  {locale === 'en' ? '                   รายการย่อย                 ' : locale === 'zh' ? '                   รายการย่อย                 ' : '                   รายการย่อย                 '}</h2>
                <p className="mt-2 border-none text-[10px] font-black font-bold uppercase leading-none tracking-widest text-gray-400">
                  {editingOption.id ? 'แก้ไข' : 'สร้าง'} {locale === 'en' ? ' รายการตัวเลือก                 ' : locale === 'zh' ? ' รายการตัวเลือก                 ' : ' รายการตัวเลือก                 '}</p>
              </div>
              <button
                onClick={() => setIsOptionEditorOpen(false)}
                className="border-none font-bold"
              >
                <X size={24} />
              </button>
            </header>
            <div className="flex-1 space-y-10 border-none font-bold">
              <div className="space-y-4 border-none font-bold">
                <label className="border-none text-[10px] font-black font-bold uppercase text-gray-400">
                  {locale === 'en' ? '                   ชื่อรายการ (เช่น นมโอ๊ต, หวานน้อย)                 ' : locale === 'zh' ? '                   ชื่อรายการ (เช่น นมโอ๊ต, หวานน้อย)                 ' : '                   ชื่อรายการ (เช่น นมโอ๊ต, หวานน้อย)                 '}</label>
                <input
                  type="text"
                  value={editingOption.name}
                  onChange={e => setEditingOption({ ...editingOption, name: e.target.value })}
                  className="w-full border-none border-none bg-gray-50 px-6 py-4 text-xl font-black font-bold text-black outline-none focus:ring-2 focus:ring-[#1A1A18]"
                />
              </div>
              <div className="space-y-4 border-none font-bold">
                <label className="border-none text-[10px] font-black font-bold uppercase text-gray-400">
                  {locale === 'en' ? '                   ราคาที่ปรับเพิ่ม/ลด (+ / -)                 ' : locale === 'zh' ? '                   ราคาที่ปรับเพิ่ม/ลด (+ / -)                 ' : '                   ราคาที่ปรับเพิ่ม/ลด (+ / -)                 '}</label>
                <div className="relative">
                  <span className="absolute left-6 top-1/2 -translate-y-1/2 text-xl font-black font-bold text-gray-300">
                    {locale === 'en' ? '                     ฿                   ' : locale === 'zh' ? '                     ฿                   ' : '                     ฿                   '}</span>
                  <input
                    type="number"
                    value={editingOption.price_adjustment}
                    onChange={e =>
                      setEditingOption({
                        ...editingOption,
                        price_adjustment: Number(e.target.value),
                      })
                    }
                    className="w-full border-none border-none bg-gray-50 px-12 py-4 text-xl font-black font-bold text-emerald-600 outline-none focus:ring-2 focus:ring-[#1A1A18]"
                  />
                </div>
              </div>

              <div className="space-y-4 border-none font-bold">
                <label className="border-none text-[10px] font-black font-bold uppercase text-gray-400">
                  {locale === 'en' ? '                   SORT ORDER (ลำดับการเรียง)                 ' : locale === 'zh' ? '                   SORT ORDER (ลำดับการเรียง)                 ' : '                   SORT ORDER (ลำดับการเรียง)                 '}</label>
                <input
                  type="number"
                  value={editingOption.sort_order}
                  onChange={e =>
                    setEditingOption({ ...editingOption, sort_order: Number(e.target.value) })
                  }
                  placeholder="0, 1, 2..."
                  className="w-full border-none border-none bg-gray-100 px-6 py-4 text-xl font-black font-bold text-black outline-none focus:ring-2 focus:ring-[#1A1A18]"
                />
              </div>
              <div className="flex items-start gap-4 border border-blue-100 bg-blue-50 p-6 text-[10px] font-black font-bold uppercase tracking-widest text-blue-600">
                <Info size={16} className="shrink-0" />
                <p className="border-none font-bold font-bold leading-tight">
                  Note: You can link this option to inventory ingredients in the "Recipe Lab" after
                  saving.
                </p>
              </div>
            </div>
            <button
              onClick={handleSaveOption}
              disabled={isSaving}
              className="flex w-full items-center justify-center gap-4 bg-[#1A1A18] py-8 text-[11px] font-black font-bold uppercase tracking-[0.4em] text-white shadow-xl"
            >
              {isSaving ? (
                <Loader2 className="animate-spin font-bold text-white" />
              ) : (
                <>
                  <Save size={18} /> {locale === 'en' ? ' บันทึกรายการย่อย                 ' : locale === 'zh' ? ' บันทึกรายการย่อย                 ' : ' บันทึกรายการย่อย                 '}</>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

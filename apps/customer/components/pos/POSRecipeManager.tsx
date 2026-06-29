'use client'

import React, { useState, useEffect } from 'react'
import { 
  Plus, Search, Edit3, Trash2, Loader2, 
  ChevronRight, Save, LayoutGrid, X,
  Menu as MenuIcon, LogOut, Settings, FlaskConical,
  Beaker, Scale, BookOpen, Clock, Zap, Database,
  ArrowRight, ToggleLeft, FileText, Download
} from 'lucide-react'
import { supabase } from '@/lib/supabaseClient'
import Link from 'next/link'

interface POSRecipeManagerProps {
  profile: any
  activeView: string
  allowedNav: any[]
  onSetView: (view: any) => void
  onShiftModalOpen?: () => void
  activeShift?: any
  setViewExtraHeader: (node: React.ReactNode) => void
  shopSettings?: any
}

const UNIT_CONVERSIONS: Record<string, { label: string, factor: number }[]> = {
    'kg': [{ label: 'kg (Kilogram)', factor: 1 }, { label: 'g (Gram)', factor: 0.001 }],
    'กิโลกรัม': [{ label: 'กิโลกรัม (kg)', factor: 1 }, { label: 'กรัม (g)', factor: 0.001 }],
    'L': [{ label: 'L (Litre)', factor: 1 }, { label: 'ml (Millilitre)', factor: 0.001 }, { label: 'oz (Ounce)', factor: 0.0295 }],
    'ลิตร': [{ label: 'ลิตร (L)', factor: 1 }, { label: 'มิลลิลิตร (ml)', factor: 0.001 }, { label: 'ออนซ์ (oz)', factor: 0.0295 }],
    'pcs': [{ label: 'pcs (Pieces)', factor: 1 }],
    'ชิ้น': [{ label: 'ชิ้น (pcs)', factor: 1 }]
};

const getAvailableUnits = (baseUnit: string) => {
    return UNIT_CONVERSIONS[baseUnit] || [{ label: baseUnit, factor: 1 }];
};

export default function POSRecipeManager({ 
  profile, activeView, allowedNav, onSetView, onShiftModalOpen, activeShift, setViewExtraHeader, shopSettings
}: POSRecipeManagerProps) {
  const [recipes, setRecipes] = useState<any[]>([])
  const [modifiers, setModifiers] = useState<any[]>([])
  const [inventory, setInventory] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [ingredientSearchTerm, setIngredientSearchTerm] = useState('')
  const [mode, setMode] = useState<'items' | 'modifiers' | 'batch'>('items')
  const [isEditorOpen, setIsEditorOpen] = useState(false)
  const [editingRecipe, setEditingRecipe] = useState<any>(null)
  
  // Batch Editor State
  const [isBatchEditorOpen, setIsBatchEditorOpen] = useState(false)
  const [batchIngredient, setBatchIngredient] = useState<any>(null)
  const [batchTargets, setBatchTargets] = useState<Record<string, { type: 'items'|'modifiers', id: string, name: string, quantity: number, unit: string, factor: number, order_types?: string[] }>>({})
  const [batchSearchTerm, setBatchSearchTerm] = useState('')
  
  // Bulk Apply State
  const [bulkQty, setBulkQty] = useState<number>(1)
  const [bulkUnit, setBulkUnit] = useState<string>('')
  const [bulkOrderTypes, setBulkOrderTypes] = useState<string[]>(['dine_in', 'takeaway', 'delivery'])

  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (shopSettings) {
      fetchData()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shopSettings?.branch_id])

  useEffect(() => {
    // If setViewExtraHeader is available, we COULD set it here, but since it's shared with POSModifierManager on the same page,
    // we now render the toggle locally inside the component's main return block to prevent it from being overwritten.
    // We still call setViewExtraHeader(null) just in case, but usually we just don't use it.
  }, [searchTerm, mode]);

  const fetchData = async () => {
    setLoading(true)
    const branchId = shopSettings?.branch_id

    let menuQuery = supabase.from('pos_menu_items').select('*, category:pos_menu_categories(name)').order('name')
    let invQuery = supabase.from('inventory_items').select('*').order('name')

    if (branchId) {
      menuQuery = menuQuery.eq('branch_id', branchId)
      invQuery = invQuery.eq('branch_id', branchId)
    } else {
      menuQuery = menuQuery.is('branch_id', null)
      invQuery = invQuery.is('branch_id', null)
    }

    const [menuRes, invRes, modRes] = await Promise.all([
      menuQuery,
      invQuery,
      supabase.from('pos_menu_modifiers').select('*').order('name')
    ])
    
    if (menuRes.data) setRecipes(menuRes.data)
    if (invRes.data) setInventory(invRes.data)
    if (modRes.data) setModifiers(modRes.data)
    setLoading(false)
  }

  const exportRecipesToCSV = () => {
    const headers = ['ประเภท', 'ชื่อเมนู/ตัวเลือก', 'หมวดหมู่/กลุ่ม', 'ชื่อวัตถุดิบ', 'ปริมาณ', 'หน่วยในสูตร', 'ปริมาณตัดสต็อก (Base)', 'หน่วยฐาน', 'ต้นทุนส่วนนี้'];
    
    const rows: any[] = [];
    const dataToExport = mode === 'items' ? recipes : modifiers;

    dataToExport.forEach(item => {
      const recipeData = item.recipe_data || [];
      if (recipeData.length === 0) {
        rows.push([
          mode === 'items' ? 'เมนู' : 'ตัวเลือก',
          item.name,
          mode === 'items' ? (item.category?.name || '-') : '-',
          '(ไม่มีสูตร)',
          '-',
          '-',
          '-',
          '-',
          '-'
        ]);
      } else {
        recipeData.forEach((ing: any) => {
          const invItem = inventory.find(i => i.id === ing.ingredient_id);
          const usageInBase = Number(ing.quantity || 0) * (ing.factor || 1);
          const costPart = Number(invItem?.cost_price || 0) * usageInBase;

          rows.push([
            mode === 'items' ? 'เมนู' : 'ตัวเลือก',
            item.name,
            mode === 'items' ? (item.category?.name || '-') : '-',
            ing.name || invItem?.name || '-',
            ing.quantity || 0,
            ing.recipe_unit || '-',
            usageInBase.toFixed(4),
            ing.base_unit || invItem?.unit || '-',
            costPart.toFixed(2)
          ]);
        });
      }
    });

    const csvContent = "\uFEFF" + [headers, ...rows].map(e => e.map(cell => `"${cell}"`).join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `recipe_report_${mode}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleSaveRecipe = async () => {
    setIsSaving(true)
    const totalCost = (editingRecipe.recipe_data || []).reduce((sum: number, ing: any) => {
        const invItem = inventory.find(i => i.id === ing.ingredient_id)
        return sum + (Number(invItem?.cost_price || 0) * Number(ing.quantity || 0) * (ing.factor || 1))
    }, 0)

    const table = mode === 'items' ? 'pos_menu_items' : 'pos_menu_modifiers'
    const payload = mode === 'items' ? { recipe_data: editingRecipe.recipe_data || [], cost_price: totalCost } : { recipe_data: editingRecipe.recipe_data || [] }

    const { error } = await supabase.from(table).update(payload).eq('id', editingRecipe.id)

    if (!error) {
      setIsEditorOpen(false)
      fetchData()
    } else {
        alert('Error saving: ' + error.message)
    }
    setIsSaving(false)
  }

  const handleSaveBatch = async () => {
      setIsSaving(true);
      try {
          // Process menus
          const itemsToUpdate = recipes.filter(r => {
              const hasIt = (r.recipe_data || []).some((i: any) => i.ingredient_id === batchIngredient.id);
              const inTargets = !!batchTargets[r.id];
              return hasIt || inTargets;
          });

          for (const recipe of itemsToUpdate) {
              let currentRecipe = recipe.recipe_data || [];
              const target = batchTargets[recipe.id];
              
              if (target) {
                  const existingIndex = currentRecipe.findIndex((i: any) => i.ingredient_id === batchIngredient.id);
                  if (existingIndex >= 0) {
                      currentRecipe[existingIndex] = { ...currentRecipe[existingIndex], quantity: target.quantity, recipe_unit: target.unit, factor: target.factor, order_types: target.order_types };
                  } else {
                      currentRecipe.push({
                          ingredient_id: batchIngredient.id,
                          name: batchIngredient.name,
                          quantity: target.quantity,
                          base_unit: batchIngredient.unit,
                          recipe_unit: target.unit,
                          factor: target.factor,
                          order_types: target.order_types
                      });
                  }
              } else {
                  currentRecipe = currentRecipe.filter((i: any) => i.ingredient_id !== batchIngredient.id);
              }

              const totalCost = currentRecipe.reduce((sum: number, ing: any) => {
                  const invItem = inventory.find(i => i.id === ing.ingredient_id);
                  return sum + (Number(invItem?.cost_price || 0) * Number(ing.quantity || 0) * (ing.factor || 1));
              }, 0);

              await supabase.from('pos_menu_items').update({ recipe_data: currentRecipe, cost_price: totalCost }).eq('id', recipe.id);
          }

          // Process modifiers
          const modsToUpdate = modifiers.filter(m => {
              const hasIt = (m.recipe_data || []).some((i: any) => i.ingredient_id === batchIngredient.id);
              const inTargets = !!batchTargets[m.id];
              return hasIt || inTargets;
          });

          for (const mod of modsToUpdate) {
              let currentRecipe = mod.recipe_data || [];
              const target = batchTargets[mod.id];
              
              if (target) {
                  const existingIndex = currentRecipe.findIndex((i: any) => i.ingredient_id === batchIngredient.id);
                  if (existingIndex >= 0) {
                      currentRecipe[existingIndex] = { ...currentRecipe[existingIndex], quantity: target.quantity, recipe_unit: target.unit, factor: target.factor, order_types: target.order_types };
                  } else {
                      currentRecipe.push({
                          ingredient_id: batchIngredient.id,
                          name: batchIngredient.name,
                          quantity: target.quantity,
                          base_unit: batchIngredient.unit,
                          recipe_unit: target.unit,
                          factor: target.factor,
                          order_types: target.order_types
                      });
                  }
              } else {
                  currentRecipe = currentRecipe.filter((i: any) => i.ingredient_id !== batchIngredient.id);
              }

              await supabase.from('pos_menu_modifiers').update({ recipe_data: currentRecipe }).eq('id', mod.id);
          }

          setIsBatchEditorOpen(false);
          await fetchData();
      } catch (err: any) {
          alert('Error saving batch: ' + err.message);
      }
      setIsSaving(false);
  }

  const addIngredient = (item: any) => {
    const currentRecipe = editingRecipe.recipe_data || []
    if (currentRecipe.some((i: any) => i.ingredient_id === item.id)) return
    const availableUnits = getAvailableUnits(item.unit);
    
    setEditingRecipe({
        ...editingRecipe,
        recipe_data: [...currentRecipe, { 
            ingredient_id: item.id, 
            name: item.name, 
            quantity: 1, 
            base_unit: item.unit,
            recipe_unit: availableUnits[0].label,
            factor: availableUnits[0].factor,
            order_types: ['dine_in', 'takeaway', 'delivery']
        }]
    })
  }

  const removeIngredient = (id: string) => {
    setEditingRecipe({
        ...editingRecipe,
        recipe_data: (editingRecipe.recipe_data || []).filter((i: any) => i.ingredient_id !== id)
    })
  }

  const updateIngredient = (id: string, updates: any) => {
    setEditingRecipe({
        ...editingRecipe,
        recipe_data: (editingRecipe.recipe_data || []).map((i: any) => 
            i.ingredient_id === id ? { ...i, ...updates } : i
        )
    })
  }

  const filteredData = (mode === 'items' ? recipes : modifiers).filter(r => 
    r.name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const currentTotalCost = (editingRecipe?.recipe_data || []).reduce((sum: number, ing: any) => {
    const invItem = inventory.find(i => i.id === ing.ingredient_id)
    return sum + (Number(invItem?.cost_price || 0) * Number(ing.quantity || 0) * (ing.factor || 1))
  }, 0)

  const openBatchEditor = (item: any) => {
      setBatchIngredient(item);
      const initialTargets: Record<string, any> = {};
      
      // Auto-populate with existing usages
      recipes.forEach(r => {
          const usage = (r.recipe_data || []).find((ing: any) => ing.ingredient_id === item.id);
          if (usage) {
              initialTargets[r.id] = { type: 'items', id: r.id, name: r.name, quantity: usage.quantity, unit: usage.recipe_unit, factor: usage.factor, order_types: usage.order_types || ['dine_in', 'takeaway', 'delivery'] };
          }
      });
      modifiers.forEach(m => {
          const usage = (m.recipe_data || []).find((ing: any) => ing.ingredient_id === item.id);
          if (usage) {
              initialTargets[m.id] = { type: 'modifiers', id: m.id, name: m.name, quantity: usage.quantity, unit: usage.recipe_unit, factor: usage.factor, order_types: usage.order_types || ['dine_in', 'takeaway', 'delivery'] };
          }
      });
      
      setBatchTargets(initialTargets);
      setBulkQty(1);
      setBulkUnit(getAvailableUnits(item.unit)[0].label);
      setBulkOrderTypes(['dine_in', 'takeaway', 'delivery']);
      setIsBatchEditorOpen(true);
  }

  const toggleBatchTarget = (type: 'items'|'modifiers', targetItem: any) => {
      setBatchTargets(prev => {
          const newTargets = { ...prev };
          if (newTargets[targetItem.id]) {
              delete newTargets[targetItem.id];
          } else {
              const availableUnits = getAvailableUnits(batchIngredient.unit);
              newTargets[targetItem.id] = {
                  type,
                  id: targetItem.id,
                  name: targetItem.name,
                  quantity: 1,
                  unit: availableUnits[0].label,
                  factor: availableUnits[0].factor,
                  order_types: ['dine_in', 'takeaway', 'delivery']
              };
          }
          return newTargets;
      });
  }

  const updateBatchTargetQuantity = (id: string, qty: number) => {
      setBatchTargets(prev => ({
          ...prev,
          [id]: { ...prev[id], quantity: qty }
      }));
  }

  const updateBatchTargetUnit = (id: string, unitLabel: string) => {
      const chosen = getAvailableUnits(batchIngredient.unit).find(c => c.label === unitLabel);
      if (chosen) {
          setBatchTargets(prev => ({
              ...prev,
              [id]: { ...prev[id], unit: unitLabel, factor: chosen.factor }
          }));
      }
  }

  const updateBatchTargetOrderTypes = (id: string, type: string) => {
      setBatchTargets(prev => {
          const currentTypes = prev[id].order_types || ['dine_in', 'takeaway', 'delivery'];
          // Filter out 'none' if present before modifying
          const activeTypes = currentTypes.includes('none') ? [] : currentTypes;
          const newTypes = activeTypes.includes(type) ? activeTypes.filter((t: string) => t !== type) : [...activeTypes, type];
          // If empty, save as ['none'] to prevent DB from dropping the empty array
          const finalTypes = newTypes.length === 0 ? ['none'] : newTypes;
          return {
              ...prev,
              [id]: { ...prev[id], order_types: finalTypes }
          };
      });
  }

  const selectAllBatchTargets = () => {
      const availableUnits = getAvailableUnits(batchIngredient.unit);
      const newTargets = { ...batchTargets };
      recipes.filter(r => r.name.toLowerCase().includes(batchSearchTerm.toLowerCase())).forEach(r => {
          if (!newTargets[r.id]) {
              newTargets[r.id] = { type: 'items', id: r.id, name: r.name, quantity: 1, unit: availableUnits[0].label, factor: availableUnits[0].factor, order_types: ['dine_in', 'takeaway', 'delivery'] };
          }
      });
      modifiers.filter(m => m.name.toLowerCase().includes(batchSearchTerm.toLowerCase())).forEach(m => {
          if (!newTargets[m.id]) {
              newTargets[m.id] = { type: 'modifiers', id: m.id, name: m.name, quantity: 1, unit: availableUnits[0].label, factor: availableUnits[0].factor, order_types: ['dine_in', 'takeaway', 'delivery'] };
          }
      });
      setBatchTargets(newTargets);
  }

  const deselectAllBatchTargets = () => {
      setBatchTargets({});
  }

  const applyBulkSettings = (qty: number, unitLabel: string, types: string[]) => {
      const chosen = getAvailableUnits(batchIngredient.unit).find(c => c.label === unitLabel);
      if (!chosen) return;
      const finalTypes = types.length === 0 ? ['none'] : types;
      setBatchTargets(prev => {
          const next = { ...prev };
          Object.keys(next).forEach(key => {
              next[key] = { ...next[key], quantity: qty, unit: unitLabel, factor: chosen.factor, order_types: [...finalTypes] };
          });
          return next;
      });
  }

  return (
    <>
      <div className="p-4 sm:p-10 font-bold overflow-y-auto no-scrollbar">
          
          {/* SEARCH BAR & MODE TOGGLE */}
          <div className="mb-6 flex flex-col sm:flex-row gap-4 items-center justify-between">
              <div className="flex items-center gap-2 p-1 bg-gray-50 border border-gray-100 font-bold whitespace-nowrap shrink-0">
                  <button 
                      onClick={() => setMode('items')} 
                      className={`px-4 py-2 text-[10px] font-black uppercase tracking-widest transition-all ${mode === 'items' ? 'bg-black text-white shadow-md' : 'text-gray-400 hover:text-black'}`}
                  >
                      สูตรอาหารเมนู
                  </button>
                  <button 
                      onClick={() => setMode('modifiers')} 
                      className={`px-4 py-2 text-[10px] font-black uppercase tracking-widest transition-all ${mode === 'modifiers' ? 'bg-black text-white shadow-md' : 'text-gray-400 hover:text-black'}`}
                  >
                      สูตรตัวเลือกเสริม
                  </button>
                  <button 
                      onClick={() => setMode('batch')} 
                      className={`px-4 py-2 text-[10px] font-black uppercase tracking-widest transition-all ${mode === 'batch' ? 'bg-black text-white shadow-md' : 'text-gray-400 hover:text-black'}`}
                  >
                      โยงวัตถุดิบ (Batch)
                  </button>
                  <div className="w-[1px] h-4 bg-gray-200 mx-2" />
                  <button 
                      onClick={exportRecipesToCSV}
                      className="flex items-center gap-2 px-4 py-2 text-[10px] font-black uppercase tracking-widest text-[#1A1A18] hover:bg-gray-100 transition-all"
                  >
                      <FileText size={14} /> ส่งออก CSV
                  </button>
              </div>
              <div className="relative group w-full flex-1">
                  <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300 group-focus-within:text-[#1A1A18]" />
                  <input 
                      type="text" 
                      placeholder={mode === 'batch' ? "ค้นหาวัตถุดิบ..." : mode === 'items' ? "ค้นหาเมนูอาหาร..." : "ค้นหาตัวเลือกเสริม..."}
                      className="w-full bg-white border border-[#F0F0E8] py-3 pl-12 pr-4 text-[14px] outline-none focus:border-[#1A1A18] transition-all font-bold placeholder:text-gray-200 text-black shadow-sm"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                  />
              </div>
          </div>
          <div className="flex-1">
          {loading ? (
              <div className="h-full flex items-center justify-center opacity-20 font-bold">
                  <Loader2 className="animate-spin font-bold" size={48} />
              </div>
          ) : mode === 'batch' ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4 sm:gap-8 font-bold text-black">
                  {inventory.filter(i => i.name.toLowerCase().includes(searchTerm.toLowerCase())).map(item => (
                      <button key={item.id} onClick={() => openBatchEditor(item)} className="group bg-white border border-[#F0F0E8] p-6 sm:p-8 text-left transition-all hover:shadow-2xl hover:border-[#1A1A18] font-bold">
                          <div className={`w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center transition-all mb-6 font-bold bg-green-50 text-green-300 group-hover:bg-[#1A1A18] group-hover:text-white`}>
                              <Database size={24} strokeWidth={1.5} />
                          </div>
                          <span className="text-[8px] font-black uppercase tracking-[0.3em] text-sage-600 mb-2 block font-bold">วัตถุดิบ</span>
                          <h4 className="text-sm font-black uppercase tracking-tight leading-tight line-clamp-2 h-10 text-black border-none font-bold">{item.name}</h4>
                          <div className="mt-8 pt-4 border-t border-gray-50 flex justify-between items-center font-bold">
                              <div className="flex gap-3 text-gray-300 font-bold">
                                  <span className="text-[8px] font-black uppercase tracking-widest font-bold">คลิกเพื่อผูกเมนู</span>
                              </div>
                              <ChevronRight size={16} className="text-gray-200 group-hover:text-[#1A1A18] transition-all" />
                          </div>
                      </button>
                  ))}
              </div>
          ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4 sm:gap-8 font-bold text-black">
                  {filteredData.map(recipe => (
                      <button key={recipe.id} onClick={() => { setEditingRecipe(recipe); setIsEditorOpen(true); }} className="group bg-white border border-[#F0F0E8] p-6 sm:p-8 text-left transition-all hover:shadow-2xl hover:border-[#1A1A18] font-bold">
                          <div className={`w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center transition-all mb-6 font-bold ${mode === 'modifiers' ? 'bg-indigo-50 text-indigo-300' : 'bg-gray-50 text-gray-200'} group-hover:bg-[#1A1A18] group-hover:text-white`}>
                              {mode === 'items' ? <FlaskConical size={24} strokeWidth={1.5} /> : <Settings size={24} strokeWidth={1.5} />}
                          </div>
                          <span className="text-[8px] font-black uppercase tracking-[0.3em] text-sage-600 mb-2 block font-bold">
                            {mode === 'items' ? `Category • ${recipe.category?.name || 'GENERIC'}` : 'Product Option'}
                          </span>
                          <h4 className="text-sm font-black uppercase tracking-tight leading-tight line-clamp-2 h-10 text-black border-none font-bold">{recipe.name}</h4>
                          <div className="mt-8 pt-4 border-t border-gray-50 flex justify-between items-center font-bold">
                              <div className="flex gap-3 text-gray-300 font-bold">
                                  <Database size={12} /> <span className="text-[8px] font-black uppercase tracking-widest font-bold">{(recipe.recipe_data || []).length} Ingr.</span>
                              </div>
                              <ChevronRight size={16} className="text-gray-200 group-hover:text-[#1A1A18] transition-all" />
                          </div>
                      </button>
                  ))}
              </div>
          )}
          </div>
      </div>

      {/* RECIPE LAB EDITOR */}
      {isEditorOpen && (
          <div className="fixed inset-0 z-[1200] flex items-center justify-end font-bold">
              <div className="absolute inset-0 bg-[#1A1A18]/40 backdrop-blur-md animate-in fade-in duration-300 font-bold" onClick={() => setIsEditorOpen(false)}></div>
              <div className="relative w-full sm:max-w-5xl bg-white h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-500 font-bold">
                  
                  <div className="flex h-full font-bold">
                      {/* Left: Ingredients Selection */}
                      <div className="w-[350px] border-r border-gray-100 flex flex-col font-bold">
                          <header className="p-8 border-b border-gray-50 font-bold bg-gray-50">
                              <h3 className="text-[10px] font-black uppercase tracking-widest text-gray-400 font-bold mb-4">เลือกวัตถุดิบ (INGREDIENTS)</h3>
                              <div className="relative group w-full">
                                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300 group-focus-within:text-[#1A1A18]" />
                                  <input 
                                      type="text" 
                                      placeholder="ค้นหาวัตถุดิบ..."
                                      className="w-full bg-white border border-[#F0F0E8] py-2 pl-9 pr-4 text-[12px] outline-none focus:border-[#1A1A18] transition-all font-bold placeholder:text-gray-200 text-black shadow-sm"
                                      value={ingredientSearchTerm}
                                      onChange={(e) => setIngredientSearchTerm(e.target.value)}
                                  />
                              </div>
                          </header>
                          <div className="flex-1 overflow-y-auto p-4 font-bold space-y-2 no-scrollbar">
                              {inventory.filter(item => item.name.toLowerCase().includes(ingredientSearchTerm.toLowerCase())).map(item => (
                                  <button 
                                    key={item.id} 
                                    onClick={() => addIngredient(item)}
                                    className="w-full text-left p-4 hover:bg-gray-50 flex items-center justify-between group transition-all font-bold"
                                  >
                                      <div>
                                          <div className="text-[12px] font-black uppercase tracking-tight font-bold">{item.name}</div>
                                          <div className="text-[9px] text-gray-300 font-black uppercase tracking-widest mt-1 font-bold">Base: {item.unit} • Cost: ฿{item.cost_price}</div>
                                      </div>
                                      <Plus size={14} className="text-gray-200 group-hover:text-black" />
                                  </button>
                              ))}
                          </div>
                      </div>

                      {/* Right: Recipe Details */}
                      <div className="flex-1 flex flex-col py-10 sm:py-20 px-6 sm:px-16 font-bold overflow-y-auto no-scrollbar">
                        <header className="mb-10 sm:mb-16 flex justify-between items-start font-bold">
                            <div className="font-bold border-none">
                                <h2 className="font-serif-luxury text-4xl sm:text-5xl font-light tracking-tighter text-[#1A1A18] border-none font-bold uppercase">{mode === 'items' ? 'สูตรรายการเมนู' : 'สูตรตัวเลือกเสริม'}</h2>
                                <p className="text-[10px] font-black uppercase tracking-[0.4em] text-[#8C8A81] mt-4 font-bold border-none">{editingRecipe.name}</p>
                            </div>
                            <button onClick={() => setIsEditorOpen(false)} className="w-12 h-12 bg-gray-50 flex items-center justify-center font-bold font-bold"><X size={24} /></button>
                        </header>

                        <div className="space-y-12 font-bold mb-10 text-black">
                            <div className="grid grid-cols-2 gap-6 font-bold border-none text-black">
                                <div className="bg-white p-6 border border-[#F0F0E8] font-bold">
                                    <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest font-bold">INGREDIENT COST</span>
                                    <div className="text-xl sm:text-2xl font-black mt-1 font-bold">฿ {currentTotalCost.toFixed(2)}</div>
                                </div>
                                {mode === 'items' && (
                                    <div className="bg-[#1A1A18] p-6 border border-transparent font-bold">
                                        <span className="text-[8px] font-black text-gray-500 uppercase tracking-widest font-bold">PROFIT MARGIN</span>
                                        <div className="text-xl sm:text-2xl font-black mt-1 text-white font-bold">
                                            {editingRecipe.sale_price > 0 ? Math.round((((editingRecipe.sale_price - currentTotalCost) / editingRecipe.sale_price) * 100)) : 0}%
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="space-y-6 font-bold">
                                <h3 className="text-[11px] font-black uppercase tracking-widest font-bold">วัตถุดิบที่ใช้ (ACTIVE INGREDIENTS)</h3>
                                
                                <div className="space-y-4 font-bold">
                                    {(editingRecipe.recipe_data || []).map((ing: any) => {
                                        const convs = getAvailableUnits(ing.base_unit);
                                        return (
                                            <div key={ing.ingredient_id} className="p-8 bg-gray-50 flex flex-col gap-6 font-bold group border border-[#F0F0E8] hover:border-black transition-all">
                                                <div className="flex items-center justify-between font-bold">
                                                    <div className="flex-1 font-bold">
                                                        <div className="text-[14px] font-black uppercase font-bold text-black border-none">{ing.name}</div>
                                                        <div className="text-[9px] text-gray-300 font-black uppercase mt-1">Stocking Unit: {ing.base_unit}</div>
                                                    </div>
                                                    <button onClick={() => removeIngredient(ing.ingredient_id)} className="text-gray-300 hover:text-red-500 transition-colors font-bold"><Trash2 size={16} /></button>
                                                </div>

                                                <div className="flex items-center gap-6 font-bold">
                                                    <div className="flex-1 font-bold">
                                                        <label className="text-[9px] font-black uppercase text-gray-400 block mb-2">ปริมาณ</label>
                                                        <input 
                                                            type="number" 
                                                            value={ing.quantity} 
                                                            onChange={(e) => updateIngredient(ing.ingredient_id, { quantity: e.target.value })}
                                                            className="w-full bg-white border-none px-6 py-4 font-black text-xl outline-none focus:ring-1 focus:ring-black font-bold text-black" 
                                                        />
                                                    </div>
                                                    <ArrowRight size={20} className="mt-6 text-gray-200" />
                                                    <div className="flex-1 font-bold">
                                                        <label className="text-[9px] font-black uppercase text-gray-400 block mb-2">หน่วยในสูตร</label>
                                                        <select 
                                                            value={ing.recipe_unit}
                                                            onChange={(e) => {
                                                                const chosen = convs.find(c => c.label === e.target.value);
                                                                updateIngredient(ing.ingredient_id, { recipe_unit: e.target.value, factor: chosen?.factor || 1 });
                                                            }}
                                                            className="w-full bg-white border-none px-6 py-4 font-black text-[12px] outline-none focus:ring-1 focus:ring-black font-bold text-black appearance-none cursor-pointer"
                                                        >
                                                            {convs.map(c => <option key={c.label} value={c.label}>{c.label}</option>)}
                                                        </select>
                                                    </div>
                                                </div>

                                                <div className="pt-4 border-t border-gray-100 flex justify-between items-center text-[9px] font-black uppercase text-gray-300">
                                                    <span>ปริมาณตัดสต็อก: {(Number(ing.quantity) * (ing.factor || 1)).toFixed(4)} {ing.base_unit}</span>
                                                    <span>สัดส่วนต้นทุน: ฿{(Number(inventory.find(inv => inv.id === ing.ingredient_id)?.cost_price || 0) * Number(ing.quantity) * (ing.factor || 1)).toFixed(2)}</span>
                                                </div>

                                                <div className="pt-4 border-t border-gray-100/50">
                                                    <label className="text-[9px] font-black uppercase text-gray-400 block mb-3">ใช้สำหรับออเดอร์ประเภท (Order Types)</label>
                                                    <div className="flex gap-4">
                                                        {['dine_in', 'takeaway', 'delivery'].map(type => {
                                                            const labels: Record<string, string> = { 'dine_in': 'ทานที่ร้าน', 'takeaway': 'กลับบ้าน', 'delivery': 'เดลิเวอรี่' };
                                                            const isSelected = (ing.order_types || ['dine_in', 'takeaway', 'delivery']).includes(type) && !(ing.order_types || []).includes('none');
                                                            return (
                                                                <button
                                                                    key={type}
                                                                    onClick={() => {
                                                                        const currentTypes = ing.order_types || ['dine_in', 'takeaway', 'delivery'];
                                                                        const activeTypes = currentTypes.includes('none') ? [] : currentTypes;
                                                                        const newTypes = activeTypes.includes(type) ? activeTypes.filter((t: string) => t !== type) : [...activeTypes, type];
                                                                        const finalTypes = newTypes.length === 0 ? ['none'] : newTypes;
                                                                        updateIngredient(ing.ingredient_id, { order_types: finalTypes });
                                                                    }}
                                                                    className={`px-3 py-1.5 text-[10px] font-black uppercase tracking-widest transition-all rounded-full border ${isSelected ? 'bg-[#1A1A18] text-white border-[#1A1A18]' : 'bg-white text-gray-400 border-gray-200 hover:border-black hover:text-black'}`}
                                                                >
                                                                    {labels[type]}
                                                                </button>
                                                            )
                                                        })}
                                                    </div>
                                                </div>
                                            </div>
                                        )
                                    })}

                                    {(editingRecipe.recipe_data || []).length === 0 && (
                                        <div className="h-[200px] border-2 border-dashed border-gray-100 flex flex-col items-center justify-center opacity-30 font-bold">
                                            <Scale size={48} strokeWidth={0.5} />
                                            <p className="text-[10px] font-black mt-4 font-bold uppercase tracking-widest">NO INGREDIENT LINKED</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        <button onClick={handleSaveRecipe} disabled={isSaving} className="w-full mt-auto py-10 bg-[#1A1A18] text-white text-[12px] font-black uppercase tracking-[0.5em] transition-all font-bold hover:bg-sage-950 shadow-xl flex items-center justify-center gap-4">
                            {isSaving ? <Loader2 className="animate-spin text-white font-bold" /> : <><Save size={20} /> บันทึกสูตรอาหาร</>}
                        </button>
                      </div>
                  </div>
              </div>
          </div>
      )}

      {/* BATCH LINK EDITOR */}
      {isBatchEditorOpen && batchIngredient && (
          <div className="fixed inset-0 z-[1200] flex items-center justify-end font-bold">
              <div className="absolute inset-0 bg-[#1A1A18]/40 backdrop-blur-md animate-in fade-in duration-300 font-bold" onClick={() => setIsBatchEditorOpen(false)}></div>
              <div className="relative w-full sm:max-w-5xl bg-white h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-500 font-bold">
                  
                  <div className="flex h-full font-bold">
                      {/* Left: Targets Selection */}
                      <div className="w-[350px] border-r border-gray-100 flex flex-col font-bold">
                          <header className="p-8 border-b border-gray-50 font-bold bg-gray-50">
                              <h3 className="text-[10px] font-black uppercase tracking-widest text-gray-400 font-bold mb-4">เลือกเมนู/ตัวเลือกที่จะผูก</h3>
                              <div className="relative group w-full mb-4">
                                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300 group-focus-within:text-[#1A1A18]" />
                                  <input 
                                      type="text" 
                                      placeholder="ค้นหาเมนู..."
                                      className="w-full bg-white border border-[#F0F0E8] py-2 pl-9 pr-4 text-[12px] outline-none focus:border-[#1A1A18] transition-all font-bold placeholder:text-gray-200 text-black shadow-sm"
                                      value={batchSearchTerm}
                                      onChange={(e) => setBatchSearchTerm(e.target.value)}
                                  />
                              </div>
                              <div className="flex gap-2 font-bold">
                                  <button onClick={selectAllBatchTargets} className="flex-1 py-2 bg-black text-white text-[9px] font-black uppercase tracking-widest rounded transition hover:bg-gray-800">เลือกทั้งหมด</button>
                                  <button onClick={deselectAllBatchTargets} className="flex-1 py-2 bg-gray-200 text-black text-[9px] font-black uppercase tracking-widest rounded transition hover:bg-gray-300">ล้างที่เลือก</button>
                              </div>
                          </header>
                          <div className="flex-1 overflow-y-auto p-4 font-bold space-y-2 no-scrollbar">
                              <div className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2 mt-4 px-2">เมนูอาหาร</div>
                              {recipes.filter(r => r.name.toLowerCase().includes(batchSearchTerm.toLowerCase())).map(recipe => (
                                  <button 
                                    key={recipe.id} 
                                    onClick={() => toggleBatchTarget('items', recipe)}
                                    className={`w-full text-left p-4 flex items-center justify-between transition-all font-bold ${batchTargets[recipe.id] ? 'bg-black text-white' : 'hover:bg-gray-50 text-black'}`}
                                  >
                                      <div className="text-[12px] font-black uppercase tracking-tight font-bold">{recipe.name}</div>
                                      {batchTargets[recipe.id] && <Plus size={14} className="rotate-45" />}
                                  </button>
                              ))}

                              <div className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2 mt-8 px-2">ตัวเลือกเสริม</div>
                              {modifiers.filter(m => m.name.toLowerCase().includes(batchSearchTerm.toLowerCase())).map(mod => (
                                  <button 
                                    key={mod.id} 
                                    onClick={() => toggleBatchTarget('modifiers', mod)}
                                    className={`w-full text-left p-4 flex items-center justify-between transition-all font-bold ${batchTargets[mod.id] ? 'bg-indigo-900 text-white' : 'hover:bg-indigo-50 text-black'}`}
                                  >
                                      <div className="text-[12px] font-black uppercase tracking-tight font-bold">{mod.name}</div>
                                      {batchTargets[mod.id] && <Plus size={14} className="rotate-45" />}
                                  </button>
                              ))}
                          </div>
                      </div>

                      {/* Right: Batch Details */}
                      <div className="flex-1 flex flex-col py-10 sm:py-20 px-6 sm:px-16 font-bold overflow-y-auto no-scrollbar">
                        <header className="mb-10 sm:mb-16 flex justify-between items-start font-bold">
                            <div className="font-bold border-none">
                                <h2 className="font-serif-luxury text-4xl sm:text-5xl font-light tracking-tighter text-[#1A1A18] border-none font-bold uppercase">โยงวัตถุดิบ (Batch)</h2>
                                <p className="text-[10px] font-black uppercase tracking-[0.4em] text-[#8C8A81] mt-4 font-bold border-none">{batchIngredient.name}</p>
                            </div>
                            <button onClick={() => setIsBatchEditorOpen(false)} className="w-12 h-12 bg-gray-50 flex items-center justify-center font-bold font-bold"><X size={24} /></button>
                        </header>

                        <div className="space-y-12 font-bold mb-10 text-black">
                            <div className="space-y-6 font-bold">
                                {Object.keys(batchTargets).length > 0 && (
                                    <div className="p-8 bg-[#1A1A18] text-white flex flex-col gap-6 shadow-xl">
                                        <h3 className="text-[11px] font-black uppercase tracking-widest">ตั้งค่าทีเดียวให้ทุกเมนูที่เลือกไว้ (Apply to All)</h3>
                                        <div className="flex items-end gap-6">
                                            <div className="flex-1">
                                                <label className="text-[9px] font-black uppercase text-gray-400 block mb-2">ปริมาณ</label>
                                                <input type="number" value={bulkQty} onChange={e => setBulkQty(Number(e.target.value))} className="w-full bg-white/10 border border-white/20 px-4 py-3 font-black text-lg outline-none text-white focus:border-white transition-colors" />
                                            </div>
                                            <div className="flex-1">
                                                <label className="text-[9px] font-black uppercase text-gray-400 block mb-2">หน่วย</label>
                                                <select value={bulkUnit} onChange={e => setBulkUnit(e.target.value)} className="w-full bg-white/10 border border-white/20 px-4 py-3 font-black text-[12px] outline-none text-white appearance-none cursor-pointer focus:border-white transition-colors">
                                                    {getAvailableUnits(batchIngredient.unit).map(c => <option key={c.label} value={c.label} className="text-black">{c.label}</option>)}
                                                </select>
                                            </div>
                                        </div>
                                        <div>
                                            <label className="text-[9px] font-black uppercase text-gray-400 block mb-3">ออเดอร์ประเภท (Order Types)</label>
                                            <div className="flex gap-4">
                                                {['dine_in', 'takeaway', 'delivery'].map(type => {
                                                    const labels: Record<string, string> = { 'dine_in': 'ทานที่ร้าน', 'takeaway': 'กลับบ้าน', 'delivery': 'เดลิเวอรี่' };
                                                    const isSelected = bulkOrderTypes.includes(type);
                                                    return (
                                                        <button key={type} onClick={() => setBulkOrderTypes(prev => prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type])} className={`px-4 py-2 text-[10px] font-black uppercase tracking-widest rounded-full transition-all border ${isSelected ? 'bg-white text-black border-white' : 'bg-transparent text-gray-400 border-gray-600 hover:border-gray-400 hover:text-white'}`}>
                                                            {labels[type]}
                                                        </button>
                                                    )
                                                })}
                                            </div>
                                        </div>
                                        <button onClick={() => applyBulkSettings(bulkQty, bulkUnit, bulkOrderTypes)} className="w-full mt-2 py-4 bg-white text-black text-[10px] font-black uppercase tracking-widest hover:bg-gray-200 transition-colors flex items-center justify-center gap-2">
                                            <ArrowRight size={14} /> ใช้การตั้งค่านี้กับ {Object.keys(batchTargets).length} เมนูที่เลือก
                                        </button>
                                    </div>
                                )}

                                <h3 className="text-[11px] font-black uppercase tracking-widest font-bold">กำหนดปริมาณสำหรับแต่ละเมนู ({Object.keys(batchTargets).length} รายการ)</h3>
                                
                                <div className="space-y-4 font-bold">
                                    {Object.values(batchTargets).map((target: any) => {
                                        const convs = getAvailableUnits(batchIngredient.unit);
                                        return (
                                            <div key={target.id} className={`p-8 flex flex-col gap-6 font-bold group border hover:border-black transition-all ${target.type === 'modifiers' ? 'bg-indigo-50/30 border-indigo-100' : 'bg-gray-50 border-[#F0F0E8]'}`}>
                                                <div className="flex items-center justify-between font-bold">
                                                    <div className="flex-1 font-bold">
                                                        <div className="text-[14px] font-black uppercase font-bold text-black border-none">{target.name}</div>
                                                        <div className="text-[9px] text-gray-400 font-black uppercase mt-1">{target.type === 'items' ? 'Menu Item' : 'Modifier'}</div>
                                                    </div>
                                                    <button onClick={() => toggleBatchTarget(target.type, target)} className="text-gray-300 hover:text-red-500 transition-colors font-bold"><Trash2 size={16} /></button>
                                                </div>

                                                <div className="flex items-center gap-6 font-bold">
                                                    <div className="flex-1 font-bold">
                                                        <label className="text-[9px] font-black uppercase text-gray-400 block mb-2">ปริมาณ</label>
                                                        <input 
                                                            type="number" 
                                                            value={target.quantity} 
                                                            onChange={(e) => updateBatchTargetQuantity(target.id, Number(e.target.value))}
                                                            className="w-full bg-white border-none px-6 py-4 font-black text-xl outline-none focus:ring-1 focus:ring-black font-bold text-black shadow-sm" 
                                                        />
                                                    </div>
                                                    <ArrowRight size={20} className="mt-6 text-gray-200" />
                                                    <div className="flex-1 font-bold">
                                                        <label className="text-[9px] font-black uppercase text-gray-400 block mb-2">หน่วยในสูตร</label>
                                                        <select 
                                                            value={target.unit}
                                                            onChange={(e) => updateBatchTargetUnit(target.id, e.target.value)}
                                                            className="w-full bg-white border-none px-6 py-4 font-black text-[12px] outline-none focus:ring-1 focus:ring-black font-bold text-black appearance-none cursor-pointer shadow-sm"
                                                        >
                                                            {convs.map(c => <option key={c.label} value={c.label}>{c.label}</option>)}
                                                        </select>
                                                    </div>
                                                </div>

                                                <div className="pt-4 border-t border-gray-100/50">
                                                    <label className="text-[9px] font-black uppercase text-gray-400 block mb-3">ใช้สำหรับออเดอร์ประเภท (Order Types)</label>
                                                    <div className="flex gap-4">
                                                        {['dine_in', 'takeaway', 'delivery'].map(type => {
                                                            const labels: Record<string, string> = { 'dine_in': 'ทานที่ร้าน', 'takeaway': 'กลับบ้าน', 'delivery': 'เดลิเวอรี่' };
                                                            const isSelected = (target.order_types || ['dine_in', 'takeaway', 'delivery']).includes(type) && !(target.order_types || []).includes('none');
                                                            return (
                                                                <button
                                                                    key={type}
                                                                    onClick={() => updateBatchTargetOrderTypes(target.id, type)}
                                                                    className={`px-3 py-1.5 text-[10px] font-black uppercase tracking-widest transition-all rounded-full border ${isSelected ? 'bg-[#1A1A18] text-white border-[#1A1A18]' : 'bg-white text-gray-400 border-gray-200 hover:border-black hover:text-black'}`}
                                                                >
                                                                    {labels[type]}
                                                                </button>
                                                            )
                                                        })}
                                                    </div>
                                                </div>
                                            </div>
                                        )
                                    })}

                                    {Object.keys(batchTargets).length === 0 && (
                                        <div className="h-[200px] border-2 border-dashed border-gray-100 flex flex-col items-center justify-center opacity-30 font-bold">
                                            <MenuIcon size={48} strokeWidth={0.5} />
                                            <p className="text-[10px] font-black mt-4 font-bold uppercase tracking-widest">PLEASE SELECT AT LEAST 1 TARGET</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        <button onClick={handleSaveBatch} disabled={isSaving || Object.keys(batchTargets).length === 0} className="w-full mt-auto py-10 bg-[#1A1A18] text-white text-[12px] font-black uppercase tracking-[0.5em] transition-all font-bold hover:bg-sage-950 shadow-xl flex items-center justify-center gap-4 disabled:opacity-50">
                            {isSaving ? <Loader2 className="animate-spin text-white font-bold" /> : <><Save size={20} /> บันทึกการเชื่อมโยง</>}
                        </button>
                      </div>
                  </div>
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

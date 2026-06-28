'use client';
import React, { useState, useEffect } from 'react'
import {
  Package,
  Layers,
  FlaskConical,
  ClipboardCheck,
  Search,
  Plus,
  Edit3,
  Trash2,
  Save,
  X,
  ChevronRight,
  ArrowUpCircle,
  History,
  Filter,
  Star,
  Info,
  Scale,
  CheckCircle2,
  TrendingUp,
  AlertTriangle,
  Database,
  Zap,
  Download,
  Loader2,
  Tag,
} from 'lucide-react'
import { supabase } from '@/lib/supabaseClient'
import { motion, AnimatePresence } from 'framer-motion'

// --- REUSED SUB-COMPONENTS/PARTS ---
import POSInventoryManager from './POSInventoryManager'
import POSMenuManager from './POSMenuManager'
import POSRecipeManager from './POSRecipeManager'
import POSModifierManager from './POSModifierManager'
import POSGoogleSheetSync from './POSGoogleSheetSync'
import POSCategoryManager from './POSCategoryManager'
import { BarChart3 } from 'lucide-react'
import { useI18n } from "@/lib/I18nContext";

interface POSManagementUnifiedProps {
  profile: any
  activeView: string
  setViewExtraHeader: (node: React.ReactNode) => void
  onSetView?: (view: any) => void
  shopSettings?: any
}

type ManagementTab = 'resources' | 'assets' | 'categories' | 'logic' | 'audit'

export default function POSManagementUnified({
  profile,
  activeView,
  setViewExtraHeader,
  onSetView,
  shopSettings,
}: POSManagementUnifiedProps) {
    const { locale } = useI18n();
  const [activeTab, setActiveTab] = useState<ManagementTab>('resources')
  const [searchTerm, setSearchTerm] = useState('')

  // Shared Data
  const [inventory, setInventory] = useState<any[]>([])
  const [menuItems, setMenuItems] = useState<any[]>([])
  const [categories, setCategories] = useState<any[]>([])
  const [inventoryCategories, setInventoryCategories] = useState<any[]>([])
  const [modifiers, setModifiers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (shopSettings) {
      fetchGlobalData()
    }
  }, [shopSettings?.branch_id])

    const fetchGlobalData = async () => {
      setLoading(true)
      const branchId = shopSettings?.branch_id
      console.log('📡 Fetching all global data for branch:', branchId);
      
      let itemQuery = supabase.from('pos_menu_items').select('*, category:pos_menu_categories(name)').order('name')
      let catQuery = supabase.from('pos_menu_categories').select('*').order('order_index')
      let groupQuery = supabase.from('pos_menu_modifier_groups').select('id')
      let invQuery = supabase.from('inventory_items').select('*').order('name')
      
      if (branchId) {
        itemQuery = itemQuery.eq('branch_id', branchId)
        catQuery = catQuery.eq('branch_id', branchId)
        groupQuery = groupQuery.eq('branch_id', branchId)
        invQuery = invQuery.eq('branch_id', branchId)
      } else {
        itemQuery = itemQuery.is('branch_id', null)
        catQuery = catQuery.is('branch_id', null)
        groupQuery = groupQuery.is('branch_id', null)
        invQuery = invQuery.is('branch_id', null)
      }
      
      const [inv, menu, cat, invCat, modGroups] = await Promise.all([
        invQuery,
        itemQuery,
        catQuery,
        supabase.from('inventory_categories').select('*').order('order_index'),
        groupQuery
      ])

      let modData = []
      if (modGroups.data && modGroups.data.length > 0) {
        const groupIds = modGroups.data.map((g: any) => g.id)
        const { data: mods } = await supabase.from('pos_menu_modifiers').select('*').in('group_id', groupIds).order('name')
        if (mods) modData = mods
      } else {
        const { data: mods } = await supabase.from('pos_menu_modifiers').select('*').order('name')
        if (mods) modData = mods
      }
  
      if (inv.data) setInventory(inv.data)
      if (menu.data) setMenuItems(menu.data)
      if (cat.data) setCategories(cat.data)
      setModifiers(modData)
      
      console.log('📦 Inventory Categories Fetched:', invCat.data?.length, invCat.error);
      if (invCat.data) setInventoryCategories(invCat.data)
      setLoading(false)
    }
  
    const handleInitCategories = async () => {
      const defaults = [
        { name: 'วัตถุดิบ (Ingredients)', color: '#4ADE80', order_index: 1 },
        { name: 'เครื่องดื่ม (Beverages)', color: '#3B82F6', order_index: 2 },
        { name: 'ขนม & เบเกอรี่ (Bakery & Snacks)', color: '#F472B6', order_index: 3 },
        { name: 'บรรจุภัณฑ์ (Packaging)', color: '#FACC15', order_index: 4 },
        { name: 'อุปกรณ์สิ้นเปลือง (Consumables)', color: '#F87171', order_index: 5 },
        { name: 'เบ็ดเตล็ด (Miscellaneous)', color: '#94A3B8', order_index: 6 }
      ];
      
      for (const item of defaults) {
        await supabase.from('inventory_categories').upsert(item, { onConflict: 'name' });
      }
      fetchGlobalData();
    }

  // --- TAB CONFIG ---
  const tabs = [
    { id: 'resources', label: 'คลังพัสดุ', sub: 'Resources', icon: Package },
    { id: 'assets', label: 'จัดการเมนู', sub: 'Menu Assets', icon: Layers },
    { id: 'categories', label: 'หมวดหมู่', sub: 'Categories', icon: Tag },
    { id: 'logic', label: 'สูตรและตัวเลือก', sub: 'Logic & Recipes', icon: FlaskConical },
    { id: 'audit', label: 'สรุปการตรวจนับ', sub: 'Audit & Sync', icon: ClipboardCheck },
  ]

  return (
    <div className="flex h-full flex-col overflow-hidden bg-[#FDFDFB] font-bold">
      {/* SUB-HEADER / NAVIGATION */}
      <div className="shrink-0 border-b border-gray-100 bg-white px-10 pt-2 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as ManagementTab)}
                className={`relative flex flex-col items-start px-8 py-6 transition-all ${activeTab === tab.id ? 'text-black' : 'text-gray-300 hover:text-gray-500'}`}
              >
                <div className="mb-1 flex items-center gap-3">
                  <tab.icon size={16} />
                  <span className="text-[11px] font-black uppercase tracking-widest">
                    {tab.label}
                  </span>
                </div>
                <span className="text-[9px] font-black uppercase tracking-tighter opacity-40">
                  {tab.sub}
                </span>
                {activeTab === tab.id && (
                  <motion.div
                    layoutId="activeTabUnderline"
                    className="absolute bottom-0 left-0 right-0 h-1 bg-black"
                  />
                )}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-6">
            <div className="hidden text-right sm:block">
              <div className="text-[9px] font-black uppercase tracking-widest text-gray-300">
                {locale === 'en' ? '                 สถานะระบบ               ' : locale === 'zh' ? '                 สถานะระบบ               ' : '                 สถานะระบบ               '}</div>
              <div className="flex items-center justify-end gap-2 text-[10px] font-black font-bold uppercase text-emerald-500">
                <Zap size={10} fill="currentColor" /> {locale === 'en' ? ' เชื่อมต่อเซิร์ฟเวอร์แล้ว               ' : locale === 'zh' ? ' เชื่อมต่อเซิร์ฟเวอร์แล้ว               ' : ' เชื่อมต่อเซิร์ฟเวอร์แล้ว               '}</div>
            </div>
          </div>
        </div>
      </div>

      {/* MAIN CONTENT AREA */}
      <div className="no-scrollbar flex-1 overflow-y-auto bg-[#F5F4F0]/30">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="h-full"
          >
            {activeTab === 'resources' && (
              <POSInventoryManager
                profile={profile}
                activeView={activeView}
                allowedNav={[]}
                onSetView={() => {}}
                setViewExtraHeader={setViewExtraHeader}
                categories={inventoryCategories}
                shopSettings={shopSettings}
              />
            )}
            {activeTab === 'assets' && (
              <POSMenuManager
                profile={profile}
                activeView={activeView}
                allowedNav={[]}
                onSetView={() => {}}
                setViewExtraHeader={setViewExtraHeader}
                shopSettings={shopSettings}
              />
            )}
            {activeTab === 'categories' && (
              <POSCategoryManager
                shopSettings={shopSettings}
                onCategoriesChange={(cats) => setCategories(cats)}
              />
            )}
            {activeTab === 'logic' && (
              <div className="flex h-full flex-col overflow-hidden">
                <div className="no-scrollbar flex-1 overflow-y-auto">
                  <div className="p-10 pb-0">
                    <h2 className="mb-2 text-xl font-black uppercase tracking-tighter">
                      {locale === 'en' ? '                       จัดการสูตรตัดสต็อก (Recipes)                     ' : locale === 'zh' ? '                       จัดการสูตรตัดสต็อก (Recipes)                     ' : '                       จัดการสูตรตัดสต็อก (Recipes)                     '}</h2>
                    <p className="mb-6 text-[10px] font-black uppercase tracking-widest text-gray-400">
                      Link menu items to inventory resources
                    </p>
                  </div>
                  <POSRecipeManager
                    profile={profile}
                    activeView={activeView}
                    allowedNav={[]}
                    onSetView={() => {}}
                    setViewExtraHeader={setViewExtraHeader}
                    shopSettings={shopSettings}
                  />
                  <div className="mt-10 border-t border-gray-100 p-10 pb-0">
                    <h2 className="mb-2 text-xl font-black uppercase tracking-tighter">
                      {locale === 'en' ? '                       จัดการตัวเลือกเสริม (Modifiers)                     ' : locale === 'zh' ? '                       จัดการตัวเลือกเสริม (Modifiers)                     ' : '                       จัดการตัวเลือกเสริม (Modifiers)                     '}</h2>
                    <p className="mb-6 text-[10px] font-black uppercase tracking-widest text-gray-400">
                      Create global and item-specific customization groups
                    </p>
                  </div>
                  <POSModifierManager
                    profile={profile}
                    activeView={activeView}
                    allowedNav={[]}
                    onSetView={() => {}}
                    setViewExtraHeader={setViewExtraHeader}
                    shopSettings={shopSettings}
                  />
                </div>
              </div>
            )}

            {activeTab === 'audit' && (
              <div className="p-10 space-y-6">
                <div className="bg-amber-50 border border-amber-100 p-6 flex items-center justify-between">
                    <div>
                        <h4 className="text-sm font-black text-amber-900 uppercase">{locale === 'en' ? 'ตรวจพบหมวดหมู่ว่างเปล่า?' : locale === 'zh' ? 'ตรวจพบหมวดหมู่ว่างเปล่า?' : 'ตรวจพบหมวดหมู่ว่างเปล่า?'}</h4>
                        <p className="text-[10px] text-amber-700">{locale === 'en' ? 'หากหมวดหมู่ไม่แสดงในรายการสต็อก กรุณากดปุ่มเพื่อติดตั้งหมวดหมู่เริ่มต้น' : locale === 'zh' ? 'หากหมวดหมู่ไม่แสดงในรายการสต็อก กรุณากดปุ่มเพื่อติดตั้งหมวดหมู่เริ่มต้น' : 'หากหมวดหมู่ไม่แสดงในรายการสต็อก กรุณากดปุ่มเพื่อติดตั้งหมวดหมู่เริ่มต้น'}</p>
                    </div>
                    <button 
                        onClick={handleInitCategories}
                        className="px-6 py-3 bg-amber-600 text-white text-[10px] font-black uppercase tracking-widest hover:bg-amber-700 transition-all"
                    >
                        {locale === 'en' ? '                         ติดตั้งหมวดหมู่เริ่มต้น (FIX CATEGORIES)                     ' : locale === 'zh' ? '                         ติดตั้งหมวดหมู่เริ่มต้น (FIX CATEGORIES)                     ' : '                         ติดตั้งหมวดหมู่เริ่มต้น (FIX CATEGORIES)                     '}</button>
                </div>
                <POSGoogleSheetSync categories={inventoryCategories} onSyncComplete={fetchGlobalData} />
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      <style jsx global>{`
        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .no-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </div>
  )
}

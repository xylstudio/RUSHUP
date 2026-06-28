const fs = require('fs');

const path = '/Users/natthanchaimongkol/Downloads/XYLPROJECT-main/components/pos/POSMenuManager.tsx';
const content = fs.readFileSync(path, 'utf8');
const lines = content.split('\n');

const restOfFile = lines.slice(32).join('\n'); // Line 33 onwards (0-indexed 32)

const newTop = `'use client';
import React, { useState, useEffect, useRef } from 'react'
import { 
  Plus, Search, Edit3, Trash2, Filter, 
  MoreVertical, Check, X, Loader2, Image as ImageIcon,
  ChevronRight, RefreshCcw, Save, Trash, LayoutGrid,
  Menu as MenuIcon, LogOut, Settings, List, Star
} from 'lucide-react'
import { supabase } from '@/lib/supabaseClient'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { useI18n } from "@/lib/I18nContext";

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

  useEffect(() => {
    fetchData()
  }, [])

  useEffect(() => {
    setViewExtraHeader(
      <div className="flex items-center justify-end flex-1">
          <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 p-1 bg-gray-50 border border-gray-100 mr-2">
                   <button 
                       onClick={() => setViewMode('grid')} 
                       className={\`w-10 h-10 flex items-center justify-center transition-all \${viewMode === 'grid' ? 'bg-[#1A1A18] text-white shadow-lg' : 'text-gray-300 hover:text-black'}\`}
                   >
                       <LayoutGrid size={18} />
                   </button>
                   <button 
                       onClick={() => setViewMode('table')} 
                       className={\`w-10 h-10 flex items-center justify-center transition-all \${viewMode === 'table' ? 'bg-[#1A1A18] text-white shadow-lg' : 'text-gray-300 hover:text-black'}\`}
                   >
                       <List size={18} />
                   </button>
               </div>
              <button 
                  onClick={() => { setEditingItem({ name: '', sale_price: 0, status: 'active', category_id: categories[0]?.id }); setIsEditorOpen(true); }} 
                  className="h-10 px-8 bg-[#1A1A18] text-white flex items-center justify-center gap-3 shadow-lg font-bold whitespace-nowrap"
              >
                  <Plus size={16} /> <span className="text-[10px] font-black uppercase tracking-widest font-bold">{locale === 'en' ? 'เพิ่มรายการเมนู' : locale === 'zh' ? 'เพิ่มรายการเมนู' : 'เพิ่มรายการเมนู'}</span>
              </button>
          </div>
      </div>
    );
    return () => setViewExtraHeader(null);
  }, [setViewExtraHeader, searchTerm, viewMode, categories]);\n`;

fs.writeFileSync(path, newTop + restOfFile);
console.log('Restored fully!');

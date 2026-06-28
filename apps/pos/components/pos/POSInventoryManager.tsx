'use client';
import React, { useState, useEffect } from 'react'
import { 
  Plus, Minus, Search, Edit3, Trash2, Loader2, 
  ChevronRight, Save, LayoutGrid, X,
  LogOut, Settings, Package,
  TrendingDown, TrendingUp, AlertTriangle, ArrowUpRight,
  Database, Boxes, History, FileText, ClipboardCheck,
  CheckCircle2, AlertCircle, ArrowLeft, Download,
  ArrowDownCircle, ArrowUpCircle, RefreshCcw, Info, List, Clock, ListChecks, Landmark, ShoppingCart
} from 'lucide-react'
import { supabase } from '@/lib/supabaseClient'
import { motion, AnimatePresence } from 'framer-motion'
import { useI18n } from "@/lib/I18nContext";

interface POSInventoryManagerProps {
  profile: any
  activeView: string
  allowedNav: any[]
  onSetView: (view: any) => void
  onShiftModalOpen?: () => void
  activeShift?: any
  setViewExtraHeader: (node: React.ReactNode) => void
  categories?: any[]
  shopSettings?: any
}

export default function POSInventoryManager({ 
  profile, activeView, allowedNav, onSetView, onShiftModalOpen, activeShift, setViewExtraHeader, categories = [], shopSettings
}: POSInventoryManagerProps) {
  const { locale } = useI18n();
  const [inventory, setInventory] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [isEditorOpen, setIsEditorOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<any>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [isSummaryOpen, setIsSummaryOpen] = useState(false)

  // --- Audit / Stock Count States ---
  const [isAuditMode, setIsAuditMode] = useState(false)
  const [auditCounts, setAuditCounts] = useState<Record<string, string>>({})
  const [auditFullCounts, setAuditFullCounts] = useState<Record<string, string>>({})
  const [auditPartialCounts, setAuditPartialCounts] = useState<Record<string, string>>({})
  const [isAuditSummaryOpen, setIsAuditSummaryOpen] = useState(false)
  const [auditSummary, setAuditSummary] = useState<any>(null)
  const [isAuditTypeModalOpen, setIsAuditTypeModalOpen] = useState(false)
  const [auditCategory, setAuditCategory] = useState<string[]>([])

  // --- Restock State ---
  const [isRestockOpen, setIsRestockOpen] = useState(false)
  const [restockQty, setRestockQty] = useState('')
  const [expectedQty, setExpectedQty] = useState('')
  const [restockNote, setRestockNote] = useState('')

  // --- Supplier State ---
  const [isSupplierManagerOpen, setIsSupplierManagerOpen] = useState(false)
  const [suppliers, setSuppliers] = useState<any[]>([])
  const [isSupplierEditorOpen, setIsSupplierEditorOpen] = useState(false)
  const [editingSupplier, setEditingSupplier] = useState<any>(null)
  const [isAssignItemsOpen, setIsAssignItemsOpen] = useState(false)
  const [selectedSupplierForAssign, setSelectedSupplierForAssign] = useState<any>(null)
  const [selectedItemIdsForAssign, setSelectedItemIdsForAssign] = useState<string[]>([])

  // --- Shopping List State ---
  const [isShoppingListOpen, setIsShoppingListOpen] = useState(false)
  const [expandedInventoryCardId, setExpandedInventoryCardId] = useState<string | null>(null)

  // --- Usage / History View ---
  const [showHistory, setShowHistory] = useState(false)
  const [movements, setMovements] = useState<any[]>([])

  // --- Bulk Edit / Table View ---
  const [viewMode, setViewMode] = useState<'grid' | 'list' | 'table'>('grid')
  const [isMobileInventorySheetOpen, setIsMobileInventorySheetOpen] = useState(false)
  const [showColumnSelector, setShowColumnSelector] = useState(false)
  const [historyTab, setHistoryTab] = useState<'movements' | 'audits'>('movements')
  const [auditSessions, setAuditSessions] = useState<any[]>([])
  const [selectedAuditSession, setSelectedAuditSession] = useState<any>(null)
  const isAdmin = profile?.role === 'admin';
  const isAdminOrManager = isAdmin || profile?.staff_level === 'manager';

  const [visibleColumns, setVisibleColumns] = useState<string[]>(
    ['name', 'category_id', 'sku', 'stock_quantity', 'unit', 'min_stock_level', ...(isAdmin ? ['cost_price'] : [])]
  )

  const columns = [
    { id: 'name', label: 'ชื่อวัตถุดิบ' },
    { id: 'category_id', label: 'หมวดหมู่' },
    { id: 'sku', label: 'SKU' },
    { id: 'stock_quantity', label: 'จำนวนสต็อก' },
    { id: 'unit', label: 'หน่วยฐาน' },
    { id: 'purchase_unit', label: 'หน่วยซื้อ' },
    { id: 'conversion_factor', label: 'ตัวคูณ' },
    ...(isAdmin ? [{ id: 'cost_price', label: 'ต้นทุน' }] : []),
    { id: 'min_stock_level', label: 'จุดเติมสต็อก' },
    { id: 'category_id', label: 'หมวดหมู่' },
  ]

  useEffect(() => {
    if (shopSettings) {
      fetchInventory()
      fetchSuppliers()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shopSettings?.branch_id])


  useEffect(() => {
    setViewExtraHeader(
      <div className="relative flex items-center justify-end gap-2">
        {!isAuditMode && !showHistory && (
          <>
            <div className="hidden md:flex bg-white border border-[#F0F0E8] overflow-hidden">
              <button 
                onClick={() => { setViewMode('grid'); setShowColumnSelector(false); }} 
                className={`w-10 h-10 sm:w-11 sm:h-11 flex items-center justify-center transition-all ${viewMode === 'grid' ? 'bg-[#1A1A18] text-white' : 'text-gray-400 hover:text-black hover:bg-gray-50'}`}
              >
                <LayoutGrid size={18} />
              </button>
              <button 
                onClick={() => { setViewMode('list'); setShowColumnSelector(false); }} 
                className={`w-10 h-10 sm:w-11 sm:h-11 flex items-center justify-center border-l border-[#F0F0E8] transition-all ${viewMode === 'list' ? 'bg-[#1A1A18] text-white' : 'text-gray-400 hover:text-black hover:bg-gray-50'}`}
              >
                <List size={18} />
              </button>
              <button 
                onClick={() => { setViewMode('table'); setShowColumnSelector(false); }} 
                className={`w-10 h-10 sm:w-11 sm:h-11 flex items-center justify-center border-l border-[#F0F0E8] transition-all ${viewMode === 'table' ? 'bg-[#1A1A18] text-white' : 'text-gray-400 hover:text-black hover:bg-gray-50'}`}
              >
                <Database size={18} />
              </button>
            </div>

            <div className="hidden md:flex items-center gap-2">
              <button 
                onClick={() => setIsSupplierManagerOpen(true)}
                className="h-10 px-4 bg-white border border-[#F0F0E8] text-[#1A1A18] flex items-center justify-center gap-2 hover:border-black transition-all text-[10px] font-black uppercase tracking-widest"
              >
                <Settings size={16} />
                <span>แหล่งซื้อ</span>
              </button>
              <button 
                onClick={() => setIsShoppingListOpen(true)}
                className="h-10 px-4 bg-white border border-[#F0F0E8] text-[#1A1A18] flex items-center justify-center gap-2 hover:border-black transition-all text-[10px] font-black uppercase tracking-widest"
              >
                <ShoppingCart size={16} />
                <span>จัดซื้อ</span>
              </button>
              <button 
                onClick={() => setShowHistory(true)}
                className="w-10 h-10 bg-white border border-[#F0F0E8] text-black flex items-center justify-center hover:border-black transition-all"
                title={locale === 'en' ? 'ประวัติ' : locale === 'zh' ? 'ประวัติ' : 'ประวัติ'}
              >
                <History size={18} />
              </button>
              <button 
                onClick={() => setIsAuditTypeModalOpen(true)}
                className="w-10 h-10 bg-white border border-[#F0F0E8] text-black flex items-center justify-center hover:border-black transition-all"
                title={locale === 'en' ? 'นับสต็อก' : locale === 'zh' ? 'นับสต็อก' : 'นับสต็อก'}
              >
                <ClipboardCheck size={18} />
              </button>
            </div>
            <button
              onClick={() => setIsMobileInventorySheetOpen(true)}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-[#171714] text-white shadow-[0_10px_22px_rgba(20,20,20,0.16)] transition-all hover:bg-black md:hidden"
              title={locale === 'en' ? 'Inventory Options' : locale === 'zh' ? 'Inventory Options' : 'ตัวเลือกหน้าสต็อก'}
            >
              {viewMode === 'grid' ? <LayoutGrid size={18} /> : viewMode === 'list' ? <List size={18} /> : <Database size={18} />}
            </button>
            {isAdmin && (
              <button
                onClick={() => { setEditingItem({ name: '', min_stock_level: 5, stock_quantity: 0, unit: 'pcs', cost_price: 0 }); setIsEditorOpen(true); }}
                className="hidden h-10 w-10 items-center justify-center rounded-full bg-[#171714] text-white shadow-[0_10px_22px_rgba(20,20,20,0.16)] transition-all hover:bg-black md:flex"
                title={locale === 'en' ? 'Add Item' : locale === 'zh' ? 'Add Item' : 'เพิ่มวัตถุดิบ'}
              >
                <Plus size={18} />
              </button>
            )}
          </>
        )}

        {isAuditMode && (
          <div className="flex items-center gap-2">
            <button 
              onClick={finalizeAudit}
              disabled={isSaving}
              className="h-10 px-4 sm:px-6 bg-[#4A5D4E] text-white flex items-center justify-center gap-2 shadow-lg font-bold hover:bg-[#3A4D3E] transition-colors"
            >
              {isSaving ? <Loader2 className="animate-spin" size={14} /> : <Save size={16} />}
              <span className="text-[10px] font-black uppercase tracking-widest">{locale === 'en' ? 'บันทึกยอดนับจริง' : locale === 'zh' ? 'บันทึกยอดนับจริง' : 'บันทึกยอดนับจริง'}</span>
            </button>
          </div>
        )}
      </div>
    );
    return () => setViewExtraHeader(null);
  }, [setViewExtraHeader, searchTerm, isAuditMode, isSaving, showHistory, viewMode, isAdminOrManager, auditCounts, locale, isAdmin]);

  const fetchInventory = async () => {
    setLoading(true)
    const branchId = shopSettings?.branch_id
    let query = supabase.from('inventory_items').select('*').eq('is_active', true).order('name')
    if (branchId) {
      query = query.eq('branch_id', branchId)
    } else {
      query = query.is('branch_id', null)
    }
    const { data } = await query
    if (data) setInventory(data)
    setLoading(false)
  }

  const fetchSuppliers = async () => {
    const branchId = shopSettings?.branch_id
    let query = supabase.from('pos_suppliers').select('*').order('name')
    if (branchId) {
      query = query.eq('branch_id', branchId)
    } else {
      query = query.is('branch_id', null)
    }
    const { data } = await query
    if (data) setSuppliers(data)
  }

  const fetchMovements = async () => {
    const branchId = shopSettings?.branch_id
    let query = supabase
        .from('inventory_movements')
        .select('*, inventory_items!inner(name, branch_id)')
        .order('created_at', { ascending: false })
        .limit(50)
    if (branchId) {
      query = query.eq('inventory_items.branch_id', branchId)
    } else {
      query = query.is('inventory_items.branch_id', null)
    }
    const { data } = await query
    if (data) setMovements(data)
  }

  const fetchAuditSessions = async () => {
    // 1. Fetch sessions
    const { data: sessions, error: sessError } = await supabase
        .from('pos_inventory_audit_sessions')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(30)

    if (sessError) {
        console.error('Fetch sessions error:', sessError)
        return
    }

    if (sessions && sessions.length > 0) {
        // 2. Fetch profiles for these sessions separately
        const staffIds = [...new Set(sessions.map(s => s.staff_id))].filter(Boolean)
        const { data: profiles } = await supabase
            .from('profiles')
            .select('id, display_name')
            .in('id', staffIds)

        // 3. Fetch details for all these sessions in parallel to filter by active branch's items
        const sessionIds = sessions.map(s => s.id)
        const { data: allDetails } = await supabase
            .from('pos_inventory_audit_details')
            .select('*')
            .in('session_id', sessionIds)

        // Create a set of our active branch inventory item names or IDs for fast lookup
        const currentItemIds = new Set(inventory.map(item => item.id))

        // Map profiles and details
        const processedSessions = sessions.map(s => {
            const sessionDetails = allDetails?.filter(d => d.session_id === s.id) || []
            return {
                ...s,
                profiles: profiles?.find(p => p.id === s.staff_id) || null,
                details: sessionDetails
            }
        })

        // Filter sessions: only keep sessions that have audited items in our current branch's inventory
        // (or if they have no details at all - legacy)
        const filteredSessions = processedSessions.filter(s => {
            if (s.details.length === 0) return true
            return s.details.some((d: any) => currentItemIds.has(d.item_id))
        })

        setAuditSessions(filteredSessions.slice(0, 20))
    } else {
        setAuditSessions([])
    }
  }

  const handleSelectAuditSession = async (sessionId: string) => {
    if (selectedAuditSession === sessionId) {
        setSelectedAuditSession(null)
        return
    }
    
    setSelectedAuditSession(sessionId)
    
    // Check if we already have details for this session
    const sessionIdx = auditSessions.findIndex(s => s.id === sessionId)
    if (sessionIdx !== -1 && auditSessions[sessionIdx].details) return

    // Fetch details from pos_inventory_audit_details first
    const { data: detailsData, error: detError } = await supabase
        .from('pos_inventory_audit_details')
        .select('*')
        .eq('session_id', sessionId)
        .order('item_name', { ascending: true })
    
    if (detailsData && detailsData.length > 0) {
        setAuditSessions(prev => prev.map(s => s.id === sessionId ? { ...s, details: detailsData } : s))
    } else {
        // FALLBACK: If details table is empty, try to fetch from inventory_movements
        // Every audit session ID is stored as reference_id in movements
        const { data: movementsData } = await supabase
            .from('inventory_movements')
            .select('*, inventory_items(name)')
            .eq('reference_id', sessionId)
        
        if (movementsData && movementsData.length > 0) {
            const mappedDetails = movementsData.map(m => ({
                id: m.id,
                item_name: m.inventory_items?.name || 'Unknown Item',
                system_quantity_before: m.new_quantity - m.change_amount,
                counted_quantity: m.new_quantity,
                discrepancy: m.change_amount
            }))
            setAuditSessions(prev => prev.map(s => s.id === sessionId ? { ...s, details: mappedDetails } : s))
        } else {
            // Still nothing
            setAuditSessions(prev => prev.map(s => s.id === sessionId ? { ...s, details: [] } : s))
        }
    }
  }

  const logMovement = async (itemId: string, amount: number, newQty: number, reason: string, refId?: string) => {
    await supabase.from('inventory_movements').insert({
        item_id: itemId,
        change_amount: amount,
        new_quantity: newQty,
        reason: reason,
        reference_id: refId
    })
  }

  const handleSaveItem = async () => {
    setIsSaving(true)
    const finalItem = { ...editingItem }
    if (!finalItem.branch_id && shopSettings?.branch_id) {
      finalItem.branch_id = shopSettings.branch_id
    }
    const { data, error } = await supabase.from('inventory_items').upsert(finalItem).select().single()
    if (!error && data) {
      if (!editingItem.id) {
        await logMovement(data.id, data.stock_quantity, data.stock_quantity, 'initial_entry')
      }
      setIsEditorOpen(false)
      fetchInventory()
    }
    setIsSaving(false)
  }

  const handleBulkUpdate = async (id: string, field: string, value: any) => {
    const { error } = await supabase.from('inventory_items').update({ [field]: value }).eq('id', id)
    if (!error) {
        setInventory(prev => prev.map(item => item.id === id ? { ...item, [field]: value } : item))
    }
  }

  const handleQuickRestock = async () => {
    if (!editingItem || !restockQty) return
    setIsSaving(true)
    
    // Calculate total base units to add
    const factor = Number(editingItem.conversion_factor) || 1
    const amountInPurchaseUnit = Number(restockQty)
    const amountInBaseUnit = amountInPurchaseUnit * factor
    
    const expectedInPurchaseUnit = Number(expectedQty) || amountInPurchaseUnit
    const expectedInBaseUnit = expectedInPurchaseUnit * factor
    
    const newBaseQty = (editingItem.stock_quantity || 0) + amountInBaseUnit
    
    const { error } = await supabase.from('inventory_items')
        .update({ stock_quantity: newBaseQty })
        .eq('id', editingItem.id)
    
    if (!error) {
        const reason = amountInPurchaseUnit < expectedInPurchaseUnit ? 'restock_shortage' : amountInPurchaseUnit > expectedInPurchaseUnit ? 'restock_excess' : 'restock'
        const note = restockNote ? ` | Note: ${restockNote}` : ''
        const movementMsg = `${reason}${note}`
        const refMsg = `Purchased: ${amountInPurchaseUnit} ${editingItem.purchase_unit || editingItem.unit} (Factor: ${factor})`
        
        await logMovement(editingItem.id, amountInBaseUnit, newBaseQty, movementMsg, refMsg)
        
        setIsRestockOpen(false)
        setRestockQty('')
        setExpectedQty('')
        setRestockNote('')
        fetchInventory()
    }
    setIsSaving(false)
  }

  const handleDualCountChange = (item: any, type: 'full' | 'partial' | 'partial_add', value: string) => {
      const full = type === 'full' ? value.replace(/[^0-9.]/g, '') : (auditFullCounts[item.id] || '');
      let partial = type === 'partial' ? value.replace(/[^0-9.]/g, '') : (auditPartialCounts[item.id] || '');
      
      if (type === 'partial_add') {
          partial = String(Number(partial || 0) + Number(value));
      }

      setAuditFullCounts(prev => ({ ...prev, [item.id]: full }));
      setAuditPartialCounts(prev => ({ ...prev, [item.id]: partial }));

      const total = (Number(full || 0) * (item.conversion_factor || 1)) + Number(partial || 0);
      setAuditCounts(prev => ({ ...prev, [item.id]: total === 0 && full === '' && partial === '' ? '' : String(total) }));
  }

  const calculateDiscrepancy = (item: any) => {
    const countedInBaseUnit = auditCounts[item.id]
    if (countedInBaseUnit === undefined || countedInBaseUnit === '') return null
    
    return Number(countedInBaseUnit) - (item.stock_quantity || 0)
  }

  const exportToCSV = () => {
    const headers = ['ชื่อวัตถุดิบ', 'หมวดหมู่', 'SKU', 'จำนวนสต็อก', 'หน่วย', 'ต้นทุน', 'จุดเติมสต็อก', '', '--- รายการหมวดหมู่สำหรับทำ Dropdown ---'];
    const rows = filteredInventory.map((item, idx) => [
      item.name,
      categories.find(c => c.id === item.category_id)?.name || '-',
      item.sku || '-',
      item.stock_quantity || 0,
      item.unit,
      item.cost_price || 0,
      item.min_stock_level || 0,
      '',
      categories[idx]?.name || ''
    ]);

    const csvContent = "\uFEFF" + [headers, ...rows].map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `inventory_report_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const finalizeAudit = async () => {
    if (isSaving) return
    setIsSaving(true)

    const auditedItemsList = inventory.filter(item => auditCounts[item.id] !== undefined && auditCounts[item.id] !== '').map(item => {
        const physical = Number(auditCounts[item.id])
        const system = item.stock_quantity || 0
        return {
            item_id: item.id,
            item_name: item.name,
            system_quantity_before: system,
            counted_quantity: physical,
            discrepancy: physical - system
        }
    })

    if (auditedItemsList.length === 0) {
        alert('กรุณากรอกจำนวนที่นับได้จริงอย่างน้อย 1 รายการ')
        setIsSaving(false)
        return
    }

    const { data: session, error: sessError } = await supabase
        .from('pos_inventory_audit_sessions')
        .insert({
            staff_id: profile.id,
            total_items_counted: auditedItemsList.length,
            total_discrepancies: auditedItemsList.filter(i => i.discrepancy !== 0).length
        })
        .select()
        .single()

    if (sessError) {
        console.error('Audit session error:', sessError)
        setIsSaving(false)
        return
    }

    // Process each item
    for (const audItem of auditedItemsList) {
        await supabase.from('pos_inventory_audit_details').insert({
            session_id: session.id,
            ...audItem
        })
        await supabase.from('inventory_items').update({
            stock_quantity: audItem.counted_quantity,
            updated_at: new Date().toISOString()
        }).eq('id', audItem.item_id)

        await logMovement(audItem.item_id, audItem.discrepancy, audItem.counted_quantity, 'audit', session.id)
    }

    // Notifications logic
    try {
        // 1. Send Audit Summary to Admin
        await fetch('/api/line/notify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                type: 'inventory_audit', 
                auditData: {
                    staffName: profile.display_name || 'Staff',
                    totalItems: auditedItemsList.length,
                    totalDiscrepancies: auditedItemsList.filter(i => i.discrepancy !== 0).length,
                    discrepancies: auditedItemsList.filter(i => i.discrepancy !== 0)
                }
            })
        });

        // 2. Send Low Stock Alerts if any
        const lowStockItems = auditedItemsList.filter(audItem => {
            const item = inventory.find(i => i.id === audItem.item_id);
            return audItem.counted_quantity <= (item?.min_stock_level || 0);
        }).map(audItem => {
            const item = inventory.find(i => i.id === audItem.item_id);
            return {
                name: item?.name || audItem.item_name,
                remaining: audItem.counted_quantity,
                min: item?.min_stock_level || 0,
                unit: item?.unit || ''
            };
        });

        if (lowStockItems.length > 0) {
            await fetch('/api/line/notify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ type: 'inventory', items: lowStockItems })
            });
        }
    } catch (err) {
        console.error('Notification error:', err);
    }

    setAuditSummary({ session, details: auditedItemsList })
    setIsAuditSummaryOpen(true)
    setIsAuditMode(false)
    setAuditCounts({})
    setAuditFullCounts({})
    setAuditPartialCounts({})
    fetchInventory()
    setIsSaving(false)
  }

  const filteredInventory = inventory.filter(i => {
    const matchesSearch = i.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         (i.sku || '').toLowerCase().includes(searchTerm.toLowerCase());
    
    // In Audit Mode, we filter by the selected AUDIT categories
    if (isAuditMode) {
        // If auditCategory is empty, it means we selected "Full Audit" (or no specific filter)
        const matchesAuditCategory = auditCategory.length === 0 || auditCategory.includes(i.category_id);
        return matchesSearch && matchesAuditCategory;
    }
    
    const matchesCategory = selectedCategory === 'all' || i.category_id === selectedCategory;
    return matchesSearch && matchesCategory;
  })

  const lowStockCount = inventory.filter(i => (i.stock_quantity || 0) <= (i.min_stock_level || 0)).length
  const totalInventoryValue = inventory.reduce((acc, item) => acc + ((item.stock_quantity || 0) * (item.cost_price || 0)), 0);
  const inventoryCategoriesCount = categories.filter((cat) => {
    return inventory.some((item) => item.category_id === cat.id)
  }).length

  const mobileQuickActions = [
    {
      key: 'suppliers',
      label: locale === 'en' ? 'Suppliers' : locale === 'zh' ? 'Suppliers' : 'แหล่งจัดซื้อ',
      icon: Landmark,
      onClick: () => setIsSupplierManagerOpen(true),
    },
    {
      key: 'shopping',
      label: locale === 'en' ? 'Purchase List' : locale === 'zh' ? 'Purchase List' : 'ใบสั่งซื้อ',
      icon: ShoppingCart,
      onClick: () => setIsShoppingListOpen(true),
    },
    {
      key: 'history',
      label: locale === 'en' ? 'Stock History' : locale === 'zh' ? 'Stock History' : 'ประวัติสต็อก',
      icon: History,
      onClick: () => setShowHistory(true),
    },
    {
      key: 'audit',
      label: locale === 'en' ? 'Count Stock' : locale === 'zh' ? 'Count Stock' : 'นับสต็อก',
      icon: ClipboardCheck,
      onClick: () => setIsAuditTypeModalOpen(true),
    },
  ] as const

  return (
    <>
      <div className="p-3 sm:p-8 font-bold overflow-y-auto no-scrollbar overflow-x-hidden w-full max-w-[100vw]">
          {/* AUDIT SUMMARY DRAWER (MOBILE FULLSCREEN) */}
          {isAuditSummaryOpen && (
              <div className="fixed inset-0 z-[200] bg-white sm:bg-black/50 p-0 sm:p-10 overflow-y-auto">
                  <div className="bg-white min-h-full sm:min-h-0 sm:rounded-2xl shadow-2xl p-6 sm:p-10 max-w-4xl mx-auto">
                      <h2 className="text-2xl font-black mb-6">{locale === 'en' ? 'สรุปผลการนับสต็อก' : locale === 'zh' ? 'สรุปผลการนับสต็อก' : 'สรุปผลการนับสต็อก'}</h2>
                      <div className="divide-y border-y mb-6">
                        {auditSummary?.details.map((d: any) => (
                            <div key={d.item_id} className="py-4 flex justify-between">
                                <span>{d.item_name}</span>
                                <span className={d.discrepancy !== 0 ? 'text-red-600' : 'text-green-600'}>
                                    {d.system_quantity_before} → {d.counted_quantity}
                                </span>
                            </div>
                        ))}
                      </div>
                      <button onClick={() => setIsAuditSummaryOpen(false)} className="w-full py-4 bg-black text-white font-black uppercase">{locale === 'en' ? 'ปิดหน้าต่าง' : locale === 'zh' ? 'ปิดหน้าต่าง' : 'ปิดหน้าต่าง'}</button>
                  </div>
              </div>
          )}

          {!showHistory && !isAuditMode && (
              <div className="mb-6 space-y-4 sm:space-y-5">
                  <div className="hidden items-end justify-between gap-3 sm:flex">
                    <div className="min-w-0">
                      <div className="text-[11px] font-black uppercase tracking-[0.24em] text-[#B1B5AE]">
                        {locale === 'en' ? 'Inventory' : locale === 'zh' ? 'Inventory' : 'คลังวัตถุดิบ'}
                      </div>
                      <div className="mt-1 text-[20px] font-black tracking-tight text-[#171714] sm:text-[24px]">
                        {locale === 'en' ? 'Stock Overview' : locale === 'zh' ? 'Stock Overview' : 'ภาพรวมสต็อก'}
                      </div>
                    </div>
                    <div className="hidden text-[12px] font-black text-[#A0A49D] sm:block">
                      {locale === 'en' ? `${filteredInventory.length} items` : locale === 'zh' ? `${filteredInventory.length} items` : `แสดง ${filteredInventory.length} รายการ`}
                    </div>
                  </div>

                  <div className="relative group w-full">
                      <Search size={18} className="absolute left-5 top-1/2 -translate-y-1/2 text-[#B7BBB4] group-focus-within:text-black transition-colors" />
                      <input 
                          type="text" 
                          placeholder={locale === 'en' ? 'ค้นหาวัตถุดิบ หรือ SKU...' : locale === 'zh' ? 'ค้นหาวัตถุดิบ หรือ SKU...' : 'ค้นหาวัตถุดิบ หรือ SKU...'} 
                          className="w-full rounded-full border border-[#ECEEE8] bg-[#F7F7F4] py-4 pl-14 pr-5 text-[15px] font-bold text-[#111111] outline-none transition-all placeholder:text-[#BFC3BC] focus:border-[#171714] focus:bg-white sm:rounded-full sm:border-[#F0F0E8] sm:bg-white sm:text-base"
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                      />
                  </div>
              </div>
          )}

          {/* 1. STATS OVERVIEW */}
          {!isAuditMode && !showHistory && (
              <>
                <div className="mb-6 sm:hidden space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-[30px] border border-[#EEF0EC] bg-white px-5 py-5 shadow-[0_10px_30px_rgba(21,22,19,0.04)]">
                      <div className="mb-5 flex items-start justify-between">
                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#F5F6F2] text-[#6D746C]">
                          <Package size={18} />
                        </div>
                        <span className="rounded-full bg-[#F4F5F1] px-3 py-1 text-[10px] font-black text-[#8F948D]">
                          {locale === 'en' ? 'ALL' : locale === 'zh' ? 'ALL' : 'ทั้งหมด'}
                        </span>
                      </div>
                      <div className="space-y-2">
                        <p className="text-[12px] font-black text-[#9CA19A]">
                          {locale === 'en' ? 'รายการทั้งหมด' : locale === 'zh' ? 'รายการทั้งหมด' : 'รายการทั้งหมด'}
                        </p>
                        <div className="flex items-end gap-2 leading-none">
                          <span className="text-[38px] font-black tracking-[-0.05em] text-[#171714]">{String(inventory.length).padStart(2, '0')}</span>
                          <span className="pb-1 text-[12px] font-black text-[#C1C5BF]">SKUs</span>
                        </div>
                        <div className="flex items-center gap-2 text-[10px] font-black text-[#6E746C]">
                          <Boxes size={13} />
                          <span>{locale === 'en' ? 'รายการใช้งานอยู่' : locale === 'zh' ? 'รายการใช้งานอยู่' : 'รายการใช้งานอยู่'}</span>
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => setIsShoppingListOpen(true)}
                      className="overflow-hidden rounded-[30px] border border-[#F7E5E7] bg-white px-5 py-5 text-left shadow-[0_10px_30px_rgba(21,22,19,0.04)]"
                    >
                      <div className="mb-5 flex items-start justify-between">
                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#FFF1F2] text-[#D63530]">
                          <AlertTriangle size={18} />
                        </div>
                        <span className="rounded-full bg-[#FDEBED] px-3 py-1 text-[10px] font-black text-[#D35B56]">
                          {locale === 'en' ? 'ALERT' : locale === 'zh' ? 'ALERT' : 'เตือนภัย'}
                        </span>
                      </div>
                      <div className="space-y-2">
                        <p className="text-[12px] font-black text-[#EB7D79]">
                          {locale === 'en' ? 'รายการสต็อกต่ำ' : locale === 'zh' ? 'รายการสต็อกต่ำ' : 'รายการสต็อกต่ำ'}
                        </p>
                        <div className="flex items-end gap-2 leading-none">
                          <span className="text-[38px] font-black tracking-[-0.05em] text-[#CF201C]">{String(lowStockCount).padStart(2, '0')}</span>
                          <span className="pb-1 text-[12px] font-black text-[#EB7D79]">{locale === 'en' ? 'รายการ' : locale === 'zh' ? 'รายการ' : 'รายการ'}</span>
                        </div>
                        <div className="flex items-center gap-2 text-[10px] font-black text-[#CF201C]">
                          <AlertTriangle size={13} />
                          <span>{locale === 'en' ? 'ต้องสั่งซื้อเพิ่ม' : locale === 'zh' ? 'ต้องสั่งซื้อเพิ่ม' : 'ต้องสั่งซื้อเพิ่ม'}</span>
                        </div>
                      </div>
                    </button>
                  </div>

                  <div className="overflow-hidden rounded-[30px] border border-[#EEF0EC] bg-white p-2 shadow-[0_10px_30px_rgba(21,22,19,0.04)]">
                    <div className="grid grid-cols-4">
                      {mobileQuickActions.map((action) => {
                        const Icon = action.icon

                        return (
                          <button
                            key={action.key}
                            onClick={action.onClick}
                            className="flex min-h-[102px] flex-col items-center justify-center gap-3 rounded-[22px] px-2 py-4 text-center transition-all active:scale-[0.98]"
                          >
                            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#F6F7F3] text-[#5E6470]">
                              <Icon size={18} strokeWidth={1.9} />
                            </div>
                            <div className="text-[10px] font-black leading-tight text-[#69707A]">
                              {action.label}
                            </div>
                          </button>
                        )
                      })}
                    </div>
                  </div>
                </div>

                <div className="mb-6 hidden border border-[#F0F0E8] bg-white overflow-hidden sm:block">
                    <div className="grid grid-cols-2 xl:grid-cols-4">
                        <div className="p-4 sm:p-6 border-b xl:border-b-0 xl:border-r border-[#F0F0E8]">
                            <div className="flex items-center gap-3 mb-3">
                                <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center">
                                    <Package size={18} className="text-slate-600" />
                                </div>
                                <span className="text-[9px] sm:text-[10px] font-black text-gray-400 uppercase tracking-widest">{locale === 'en' ? 'จำนวนรายการ' : locale === 'zh' ? 'จำนวนรายการ' : 'จำนวนรายการ'}</span>
                            </div>
                            <div className="text-2xl sm:text-3xl font-black text-[#1A1A18] tracking-tight">{inventory.length}<span className="ml-2 text-base sm:text-xl text-gray-300">SKUs</span></div>
                        </div>

                        <div className="p-4 sm:p-6 border-l xl:border-l-0 border-b xl:border-b-0 xl:border-r border-[#F0F0E8]">
                            <div className="flex items-center gap-3 mb-3">
                                <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center">
                                    <AlertTriangle size={18} className="text-red-500" />
                                </div>
                                <span className="text-[9px] sm:text-[10px] font-black text-red-400 uppercase tracking-widest">{locale === 'en' ? 'ต้องสั่งเพิ่ม' : locale === 'zh' ? 'ต้องสั่งเพิ่ม' : 'ต้องสั่งเพิ่ม'}</span>
                            </div>
                            <div className="text-2xl sm:text-3xl font-black text-red-600 tracking-tight">{lowStockCount}<span className="ml-2 text-base sm:text-xl text-red-300">{locale === 'en' ? 'รายการ' : locale === 'zh' ? 'รายการ' : 'รายการ'}</span></div>
                            <button
                              onClick={() => setIsShoppingListOpen(true)}
                              className="mt-4 inline-flex h-10 items-center gap-2 border border-red-100 bg-red-50 px-4 text-[10px] font-black uppercase tracking-widest text-red-700 transition-colors hover:bg-red-100"
                            >
                              <ShoppingCart size={14} />
                              {locale === 'en' ? 'View Buy List' : locale === 'zh' ? 'View Buy List' : 'ดูรายการซื้อ'}
                            </button>
                        </div>

                        <div className="hidden xl:block p-6 border-r border-[#F0F0E8] bg-sage-50/20">
                            <span className="text-[10px] font-black text-sage-600 uppercase tracking-widest block">{locale === 'en' ? 'มูลค่าสต็อกรวม' : locale === 'zh' ? 'มูลค่าสต็อกรวม' : 'มูลค่าสต็อกรวม'}</span>
                            <div className="text-3xl font-black mt-2 text-sage-700 tracking-tight">฿{totalInventoryValue.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</div>
                        </div>

                        <div className="col-span-2 xl:col-span-1 p-4 sm:p-6 flex flex-col justify-center gap-2">
                            <button onClick={exportToCSV} className="flex items-center gap-2 text-[9px] sm:text-[10px] font-black uppercase text-[#1A1A18] hover:text-sage-700 transition-colors"><FileText size={12} className="text-gray-300" /> {locale === 'en' ? 'Export CSV' : locale === 'zh' ? '导出 CSV' : 'ส่งออก CSV'}</button>
                            <button onClick={() => window.print()} className="flex items-center gap-2 text-[9px] sm:text-[10px] font-black uppercase text-[#1A1A18] hover:text-sage-700 transition-colors"><Download size={12} className="text-gray-300" /> {locale === 'en' ? 'รายงาน PDF' : locale === 'zh' ? 'รายงาน PDF' : 'รายงาน PDF'}</button>
                            <button onClick={() => setIsSummaryOpen(true)} className="flex items-center gap-2 text-[9px] sm:text-[10px] font-black uppercase text-indigo-600 hover:text-indigo-800 transition-colors"><ListChecks size={12} className="text-indigo-300" /> {locale === 'en' ? 'สรุปสต็อกด่วน' : locale === 'zh' ? 'สรุปสต็อกด่วน' : 'สรุปสต็อกด่วน'}</button>
                            <button onClick={() => setIsShoppingListOpen(true)} className="flex items-center gap-2 text-[9px] sm:text-[10px] font-black uppercase text-amber-600 hover:text-amber-800 transition-colors"><ShoppingCart size={12} className="text-amber-400" /> {locale === 'en' ? 'รายการที่ต้องซื้อ' : locale === 'zh' ? 'รายการที่ต้องซื้อ' : 'รายการที่ต้องซื้อ'}</button>
                        </div>
                    </div>
                </div>
              </>
          )}

          {/* 2. CATEGORY AND VIEW CONTROLS */}
          {!showHistory && !isAuditMode && (
              <div className="mb-8 space-y-4">
                  <div className="space-y-3 sm:space-y-4">
                    <div className="sm:border-t sm:border-b-0 sm:border-[#F0F0E8] sm:pt-4">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex min-w-0 flex-1 items-center gap-2 overflow-x-auto no-scrollbar py-1">
                          <button
                              onClick={() => setSelectedCategory('all')}
                              className={`flex-shrink-0 whitespace-nowrap rounded-full border px-5 py-2.5 text-[13px] font-black transition-all ${
                                  selectedCategory === 'all' 
                                  ? 'border-[#121212] bg-[#121212] text-white' 
                                  : 'border-[#E9EBE6] bg-white text-[#9A9D96] hover:text-black'
                              }`}
                          >
                              {locale === 'en' ? 'ทั้งหมด' : locale === 'zh' ? 'ทั้งหมด' : 'ทั้งหมด'}
                          </button>
                          {categories.map(cat => (
                              <button
                                  key={cat.id}
                                  onClick={() => setSelectedCategory(cat.id)}
                                  className={`flex-shrink-0 whitespace-nowrap rounded-full border px-5 py-2.5 text-[13px] font-black transition-all ${
                                      selectedCategory === cat.id 
                                      ? 'border-[#121212] bg-[#121212] text-white' 
                                      : 'border-[#E9EBE6] bg-white text-[#9A9D96] hover:text-black'
                                  }`}
                              >
                                  {cat.name}
                              </button>
                          ))}
                        </div>
                        <div className="sm:hidden" />
                        <div className="hidden items-center border border-[#ECE6DC] bg-white sm:flex">
                          <button
                            onClick={() => setViewMode('grid')}
                            className={`flex h-10 w-10 items-center justify-center transition-all ${viewMode === 'grid' ? 'bg-[#1A1A18] text-white' : 'text-gray-400 hover:bg-gray-50 hover:text-black'}`}
                          >
                            <LayoutGrid size={16} />
                          </button>
                          <button
                            onClick={() => setViewMode('list')}
                            className={`flex h-10 w-10 items-center justify-center border-l border-[#ECE6DC] transition-all ${viewMode === 'list' ? 'bg-[#1A1A18] text-white' : 'text-gray-400 hover:bg-gray-50 hover:text-black'}`}
                          >
                            <List size={16} />
                          </button>
                          <button
                            onClick={() => setViewMode('table')}
                            className={`flex h-10 w-10 items-center justify-center border-l border-[#ECE6DC] transition-all ${viewMode === 'table' ? 'bg-[#1A1A18] text-white' : 'text-gray-400 hover:bg-gray-50 hover:text-black'}`}
                          >
                            <Database size={16} />
                          </button>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <div className="text-[12px] font-black text-[#A0A49D] sm:hidden">
                        {locale === 'en' ? `${filteredInventory.length} items` : locale === 'zh' ? `${filteredInventory.length} items` : `แสดง ${filteredInventory.length} รายการ`}
                      </div>
                      <div className="sm:hidden" />
                    </div>
                  </div>
              </div>
          )}

          {showHistory && (
            <div className="mb-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="flex items-center justify-between mb-6">
                    <div className="border-none">
                        <h2 className="text-xl sm:text-2xl font-black uppercase tracking-tighter text-black border-none leading-none">STOCK JOURNALS & AUDITS</h2>
                        <p className="text-[8px] font-black uppercase tracking-[0.4em] text-[#8C8A81] mt-1 border-none">{locale === 'en' ? 'ประวัติการเคลื่อนไหวและการนับสต็อก' : locale === 'zh' ? 'ประวัติการเคลื่อนไหวและการนับสต็อก' : 'ประวัติการเคลื่อนไหวและการนับสต็อก'}</p>
                    </div>
                    <button onClick={() => setShowHistory(false)} className="h-8 sm:h-10 px-4 bg-[#1A1A18] text-white text-[9px] font-black uppercase tracking-widest flex items-center justify-center gap-2">
                        <ArrowLeft size={14} /> {locale === 'en' ? 'go back' : locale === 'zh' ? '回去' : ' กลับ                     '}</button>
                </div>

                {/* HISTORY TABS */}
                <div className="flex border-b border-[#F0F0E8] mb-6">
                    <button 
                        onClick={() => { setHistoryTab('movements'); fetchMovements(); }}
                        className={`px-8 py-4 text-[10px] font-black uppercase tracking-widest transition-all ${historyTab === 'movements' ? 'border-b-2 border-black text-black' : 'text-gray-300 hover:text-black'}`}
                    >
                        {locale === 'en' ? '                         การเคลื่อนไหว (MOVEMENTS)                     ' : locale === 'zh' ? '                         การเคลื่อนไหว (MOVEMENTS)                     ' : '                         การเคลื่อนไหว (MOVEMENTS)                     '}</button>
                    <button 
                        onClick={() => { setHistoryTab('audits'); fetchAuditSessions(); }}
                        className={`px-8 py-4 text-[10px] font-black uppercase tracking-widest transition-all ${historyTab === 'audits' ? 'border-b-2 border-black text-black' : 'text-gray-300 hover:text-black'}`}
                    >
                        {locale === 'en' ? '                         ประวัติการนับสต็อก (AUDIT LOGS)                     ' : locale === 'zh' ? '                         ประวัติการนับสต็อก (AUDIT LOGS)                     ' : '                         ประวัติการนับสต็อก (AUDIT LOGS)                     '}</button>
                </div>

                {historyTab === 'movements' ? (
                    <div className="bg-white border border-[#F0F0E8] overflow-hidden">
                        <div className="grid grid-cols-1 divide-y divide-[#F0F0E8]">
                            <div className="hidden sm:grid grid-cols-12 bg-gray-50 py-1 px-3 text-[7px] font-black uppercase tracking-widest text-gray-300">
                                <div className="col-span-1 text-center">Action</div>
                                <div className="col-span-5">{locale === 'en' ? 'Item / วัตถุดิบ' : locale === 'zh' ? 'Item / วัตถุดิบ' : 'Item / วัตถุดิบ'}</div>
                                <div className="col-span-4">{locale === 'en' ? 'Log Detail / รายละเอียด' : locale === 'zh' ? 'Log Detail / รายละเอียด' : 'Log Detail / รายละเอียด'}</div>
                                <div className="col-span-2 text-right">Adjustment</div>
                            </div>
                            {movements.map(m => (
                                <div key={m.id} className="py-1 px-3 sm:grid sm:grid-cols-12 items-center hover:bg-gray-50 transition-all font-bold gap-2 border-b border-[#F0F0E8] last:border-none">
                                    <div className="col-span-1 flex justify-center">
                                        <div className={`w-5 h-5 flex items-center justify-center ${m.change_amount > 0 ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
                                            {m.change_amount > 0 ? <ArrowUpCircle size={10} /> : <ArrowDownCircle size={10} />}
                                        </div>
                                    </div>
                                    <div className="col-span-5 flex items-center gap-2">
                                        <div className="text-[9px] font-black uppercase text-black truncate max-w-[100px] sm:max-w-none">{m.inventory_items?.name || 'รายการทั่วไป'}</div>
                                        <div className="text-[6px] text-gray-300 font-black uppercase flex items-center gap-1 opacity-60">
                                            <Clock size={6} /> {m.created_at ? new Date(m.created_at).toLocaleString('th-TH', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' }) : '...'}
                                        </div>
                                    </div>
                                    <div className="col-span-4 flex items-center gap-2">
                                        <div className="text-[6px] font-black uppercase tracking-widest text-sage-600 bg-sage-50 px-1 py-0.5 inline-block">
                                            {m.reason ? m.reason.toUpperCase().replace('_', ' ') : 'GENERAL'}
                                        </div>
                                        {m.reference_id && (
                                            <div className="text-[6px] text-gray-300 font-bold truncate italic max-w-[60px] opacity-40">{m.reference_id}</div>
                                        )}
                                    </div>
                                    <div className="col-span-2 text-right flex sm:block items-center justify-between sm:justify-end">
                                        <div className={`text-[11px] font-black ${m.change_amount > 0 ? 'text-green-600' : 'text-red-600'}`}>
                                            {m.change_amount > 0 ? '+' : ''}{m.change_amount}
                                        </div>
                                        <div className="text-[7px] text-gray-300 font-black uppercase tracking-widest opacity-60">{locale === 'en' ? 'คงเหลือ: ' : locale === 'zh' ? 'คงเหลือ: ' : 'คงเหลือ: '}{m.new_quantity}</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {auditSessions.map(sess => (
                            <div key={sess.id} className="bg-white border border-[#F0F0E8] overflow-hidden hover:border-black transition-all">
                                <button 
                                    onClick={() => handleSelectAuditSession(sess.id)}
                                    className="w-full p-6 flex items-center justify-between"
                                >
                                    <div className="flex items-center gap-6">
                                        <div className="w-12 h-12 bg-gray-50 flex items-center justify-center text-gray-400">
                                            <ClipboardCheck size={20} />
                                        </div>
                                        <div className="text-left">
                                            <div className="text-[12px] font-black uppercase tracking-tight text-black">
                                                {locale === 'en' ? '                                                 การนับสต็อกรอบวันที่ ' : locale === 'zh' ? '                                                 การนับสต็อกรอบวันที่ ' : '                                                 การนับสต็อกรอบวันที่ '}{new Date(sess.created_at).toLocaleDateString('th-TH')}
                                                {sess.profiles?.display_name && (
                                                    <span className="ml-2 text-sage-600 lowercase font-bold text-[10px] bg-sage-50 px-2 py-0.5 rounded">{locale === 'en' ? 'นับโดย: ' : locale === 'zh' ? 'นับโดย: ' : 'นับโดย: '}{sess.profiles.display_name}</span>
                                                )}
                                            </div>
                                            <div className="text-[8px] font-black text-gray-400 uppercase tracking-widest mt-1">
                                                {new Date(sess.created_at).toLocaleTimeString('th-TH')} {locale === 'en' ? ' • นับทั้งหมด ' : locale === 'zh' ? ' • นับทั้งหมด ' : ' • นับทั้งหมด '}{sess.total_items_counted} {locale === 'en' ? ' รายการ • พบส่วนต่าง ' : locale === 'zh' ? ' รายการ • พบส่วนต่าง ' : ' รายการ • พบส่วนต่าง '}{sess.total_discrepancies} {locale === 'en' ? ' รายการ                                             ' : locale === 'zh' ? ' รายการ                                             ' : ' รายการ                                             '}</div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <div className={`px-3 py-1 text-[8px] font-black uppercase tracking-widest ${sess.total_discrepancies === 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
                                            {sess.total_discrepancies === 0 ? 'MATCHED' : 'DISCREPANCY'}
                                        </div>
                                        <ChevronRight size={16} className={`text-gray-300 transition-transform ${selectedAuditSession === sess.id ? 'rotate-90' : ''}`} />
                                    </div>
                                </button>
                                
                                <AnimatePresence>
                                    {selectedAuditSession === sess.id && (
                                        <motion.div 
                                            initial={{ height: 0 }} 
                                            animate={{ height: 'auto' }} 
                                            exit={{ height: 0 }} 
                                            className="overflow-hidden border-t border-gray-50 bg-gray-50/30"
                                        >
                                            <div className="p-6 space-y-2">
                                                {!sess.details ? (
                                                    <div className="py-10 flex flex-col items-center justify-center gap-3 opacity-20">
                                                        <Loader2 className="animate-spin" size={24} />
                                                        <span className="text-[10px] font-black uppercase tracking-widest">{locale === 'en' ? 'กำลังดึงรายละเอียด...' : locale === 'zh' ? 'กำลังดึงรายละเอียด...' : 'กำลังดึงรายละเอียด...'}</span>
                                                    </div>
                                                ) : sess.details.length === 0 ? (
                                                    <div className="py-12 text-center text-gray-300">
                                                        <p className="text-[10px] font-black uppercase tracking-widest opacity-40">{locale === 'en' ? 'ไม่พบข้อมูลรายการในรอบการนับนี้' : locale === 'zh' ? 'ไม่พบข้อมูลรายการในรอบการนับนี้' : 'ไม่พบข้อมูลรายการในรอบการนับนี้'}</p>
                                                    </div>
                                                ) : (
                                                    <>
                                                        <div className="grid grid-cols-12 px-4 py-2 text-[10px] font-black uppercase tracking-widest text-gray-400">
                                                            <div className="col-span-5">{locale === 'en' ? 'รายการ' : locale === 'zh' ? 'รายการ' : 'รายการ'}</div>
                                                            <div className="col-span-3 text-center">{locale === 'en' ? 'ในระบบ / นับจริง' : locale === 'zh' ? 'ในระบบ / นับจริง' : 'ในระบบ / นับจริง'}</div>
                                                            <div className="col-span-4 text-right">{locale === 'en' ? 'ส่วนต่าง' : locale === 'zh' ? 'ส่วนต่าง' : 'ส่วนต่าง'}</div>
                                                        </div>
                                                        {sess.details.map((d: any) => (
                                                            <div key={d.id} className="grid grid-cols-12 px-4 py-3 bg-white border border-gray-100 items-center">
                                                                <div className="col-span-5 text-[11px] font-black uppercase">{d.item_name}</div>
                                                                <div className="col-span-3 text-center text-[11px] font-bold text-gray-400">
                                                                    {d.system_quantity_before} <span className="mx-1">→</span> <span className="text-black">{d.counted_quantity}</span>
                                                                </div>
                                                                <div className={`col-span-4 text-right text-[12px] font-black ${d.discrepancy === 0 ? 'text-gray-300' : d.discrepancy > 0 ? 'text-green-500' : 'text-red-500'}`}>
                                                                    {d.discrepancy > 0 ? '+' : ''}{d.discrepancy}
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </>
                                                )}
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        ))}
                        {auditSessions.length === 0 && (
                            <div className="p-20 text-center text-gray-200 uppercase tracking-widest font-black text-[10px]">{locale === 'en' ? 'ไม่พบประวัติการนับสต็อก' : locale === 'zh' ? 'ไม่พบประวัติการนับสต็อก' : 'ไม่พบประวัติการนับสต็อก'}</div>
                        )}
                    </div>
                )}
            </div>
          )}

          {isAuditMode && (
              <div className="bg-sage-600 p-4 sm:p-10 flex flex-col sm:flex-row items-center justify-between mb-6 sm:mb-10 animate-in slide-in-from-top duration-500 gap-4">
                  <div className="flex items-center gap-4 sm:gap-8">
                      <div className="w-12 h-12 sm:w-16 sm:h-16 bg-white/10 flex items-center justify-center">
                          <ClipboardCheck className="text-white" size={24} />
                      </div>
                      <div>
                          <h2 className="text-white text-lg sm:text-2xl font-black uppercase tracking-tighter leading-none">{locale === 'en' ? 'Inventory Audit / นับสต็อก' : locale === 'zh' ? 'Inventory Audit / นับสต็อก' : 'Inventory Audit / นับสต็อก'}</h2>
                          <p className="text-sage-100 text-[8px] sm:text-[10px] font-black uppercase tracking-widest mt-1 sm:mt-3 font-bold leading-none">{locale === 'en' ? 'บันทึกยอดจริงเปรียบเทียบกับยอดในระบบ' : locale === 'zh' ? 'บันทึกยอดจริงเปรียบเทียบกับยอดในระบบ' : 'บันทึกยอดจริงเปรียบเทียบกับยอดในระบบ'}</p>
                      </div>
                  </div>
                  <div className="w-full sm:w-auto bg-black/20 px-6 sm:px-8 py-3 sm:py-4 border border-white/10 text-center sm:text-right">
                      <span className="text-sage-200 text-[8px] sm:text-[9px] font-black uppercase block tracking-widest mb-1">PROGRESS</span>
                      <span className="text-white text-xl sm:text-2xl font-black">{Object.keys(auditCounts).filter(k => auditCounts[k] !== '').length} / {inventory.length} SKUs</span>
                  </div>
              </div>
          )}

          {/* 3. MAIN STOCK LIST */}
          {!showHistory && (
          <div className="flex-1">
          {loading ? (
              <div className="h-full flex flex-col items-center justify-center opacity-20 font-bold gap-6">
                  <Loader2 className="animate-spin" size={64} />
                  <p className="text-[10px] font-black uppercase tracking-[0.4em]">Optimizing Supply Chain...</p>
              </div>
          ) : (viewMode !== 'table' || isAuditMode) ? (
              <div className={`grid gap-3 font-bold ${isAuditMode ? 'grid-cols-1 max-w-xl mx-auto pb-40' : viewMode === 'list' ? 'grid-cols-1' : 'grid-cols-2 xl:grid-cols-2 2xl:grid-cols-3'}`}>
                  {filteredInventory.map(item => {
                      const isLowStock = (item.stock_quantity || 0) <= (item.min_stock_level || 0);
                      const discrepancy = calculateDiscrepancy(item);
                      
                      if (isAuditMode) {
                          const isCounted = auditCounts[item.id] !== undefined && auditCounts[item.id] !== '';
                          const physicalValue = Number(auditCounts[item.id] || 0);

                          return (
                              <motion.div layout key={item.id} className={`bg-white rounded-[1.5rem] border p-4 sm:p-5 flex flex-col gap-4 font-bold transition-all ${isCounted ? 'border-sage-400 shadow-[0_0_0_1px_rgba(112,143,121,1)] bg-sage-50/10' : 'border-gray-200 shadow-sm'}`}>
                                  <div className="flex items-start justify-between gap-3">
                                      <div className="flex items-center gap-3 flex-1 min-w-0">
                                          <div className={`w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center transition-all ${isLowStock ? 'bg-red-50 text-red-500' : isCounted ? 'bg-sage-100 text-sage-600' : 'bg-slate-50 text-slate-400'}`}>
                                              {isCounted ? <CheckCircle2 size={18} /> : <Package size={18} />}
                                          </div>
                                          <div className="min-w-0 flex-1">
                                              <div className="text-sm sm:text-base font-black uppercase tracking-tight text-[#1A1A18] truncate leading-none mb-1.5">{item.name}</div>
                                              <div className="text-[10px] text-gray-400 font-black uppercase tracking-widest flex items-center gap-2">
                                                  <span>{locale === 'en' ? 'SYS:' : locale === 'zh' ? 'SYS:' : 'ระบบ:'} <span className="text-gray-600">{item.stock_quantity || 0}</span></span>
                                                  <span className="w-1 h-1 bg-gray-200 rounded-full"></span>
                                                  <span>{item.unit}</span>
                                              </div>
                                          </div>
                                      </div>
                                      <div className={`w-14 text-center flex flex-col justify-center items-center transition-all ${discrepancy === null ? 'opacity-0' : 'opacity-100'}`}>
                                          <div className={`text-[11px] font-black px-2 py-1 rounded-lg ${discrepancy === 0 ? 'bg-gray-100 text-gray-500' : discrepancy! > 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                              {discrepancy! > 0 ? '+' : ''}{discrepancy}
                                          </div>
                                      </div>
                                  </div>

                                  <div className="bg-gray-50/50 p-3 rounded-2xl flex flex-col gap-3">
                                      {item.conversion_factor && item.conversion_factor > 1 && item.purchase_unit ? (
                                          <div className="flex flex-col gap-2 w-full">
                                              <div className="flex items-center gap-2">
                                                  <div className="flex-1 flex items-center justify-between bg-white border border-gray-200 rounded-xl overflow-hidden p-1 shadow-sm">
                                                      <button onClick={() => handleDualCountChange(item, 'full', String(Math.max(0, Number(auditFullCounts[item.id] || 0) - 1)))} className="w-10 h-10 flex items-center justify-center text-gray-400 hover:text-black active:bg-gray-50 rounded-lg transition-colors"><Minus size={16} /></button>
                                                      <input 
                                                          type="text" 
                                                          inputMode="decimal"
                                                          className="w-12 bg-transparent text-sm font-black text-center outline-none"
                                                          value={auditFullCounts[item.id] || ''}
                                                          onChange={(e) => handleDualCountChange(item, 'full', e.target.value)}
                                                          onFocus={e => e.target.select()}
                                                          placeholder="0"
                                                      />
                                                      <button onClick={() => handleDualCountChange(item, 'full', String(Number(auditFullCounts[item.id] || 0) + 1))} className="w-10 h-10 flex items-center justify-center text-gray-400 hover:text-black active:bg-gray-50 rounded-lg transition-colors"><Plus size={16} /></button>
                                                  </div>
                                                  <span className="text-[10px] font-black text-gray-400 uppercase w-10 text-center shrink-0">{item.purchase_unit}</span>
                                              </div>
                                              <div className="flex items-center gap-2">
                                                  <div className="flex-1 flex items-center justify-between bg-white border border-gray-200 rounded-xl overflow-hidden p-1 shadow-sm">
                                                      <button onClick={() => handleDualCountChange(item, 'partial', String(Math.max(0, Number(auditPartialCounts[item.id] || 0) - 1)))} className="w-10 h-10 flex items-center justify-center text-gray-400 hover:text-black active:bg-gray-50 rounded-lg transition-colors"><Minus size={16} /></button>
                                                      <input 
                                                          type="text" 
                                                          inputMode="decimal"
                                                          className="w-12 bg-transparent text-sm font-black text-center outline-none"
                                                          value={auditPartialCounts[item.id] || ''}
                                                          onChange={(e) => handleDualCountChange(item, 'partial', e.target.value)}
                                                          onFocus={e => e.target.select()}
                                                          placeholder="0"
                                                      />
                                                      <button onClick={() => handleDualCountChange(item, 'partial', String(Number(auditPartialCounts[item.id] || 0) + 1))} className="w-10 h-10 flex items-center justify-center text-gray-400 hover:text-black active:bg-gray-50 rounded-lg transition-colors"><Plus size={16} /></button>
                                                  </div>
                                                  <span className="text-[10px] font-black text-gray-400 uppercase w-10 text-center shrink-0">{item.unit}</span>
                                              </div>
                                              <div className="flex items-center justify-between mt-1 px-1">
                                                  <div className="flex gap-1">
                                                      <button onClick={() => handleDualCountChange(item, 'partial_add', String(item.conversion_factor * 0.25))} className="px-3 py-1.5 text-[9px] bg-white border border-gray-200 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-black transition-colors font-black active:scale-95 shadow-sm">1/4</button>
                                                      <button onClick={() => handleDualCountChange(item, 'partial_add', String(item.conversion_factor * 0.5))} className="px-3 py-1.5 text-[9px] bg-white border border-gray-200 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-black transition-colors font-black active:scale-95 shadow-sm">1/2</button>
                                                  </div>
                                                  <div className="text-[11px] text-right font-black text-sage-700">Total: {auditCounts[item.id] || 0} {item.unit}</div>
                                              </div>
                                          </div>
                                      ) : (
                                          <div className="flex items-center justify-between bg-white border border-gray-200 rounded-2xl overflow-hidden p-1.5 shadow-sm">
                                              <button 
                                                  onClick={() => setAuditCounts({...auditCounts, [item.id]: String(Math.max(0, physicalValue - 1))})}
                                                  className="w-14 h-12 bg-gray-50 hover:bg-gray-100 active:bg-gray-200 text-gray-600 rounded-xl flex items-center justify-center transition-colors"
                                              >
                                                  <Minus size={20} />
                                              </button>
                                              
                                              <div className="flex-1 flex flex-col relative justify-center">
                                                  <input 
                                                      type="text"
                                                      inputMode="decimal"
                                                      placeholder="0"
                                                      className="w-full bg-transparent py-2 px-2 text-xl sm:text-2xl font-black outline-none text-center text-[#1A1A18] placeholder:text-gray-200"
                                                      value={auditCounts[item.id] || ''}
                                                      onChange={(e) => setAuditCounts({...auditCounts, [item.id]: e.target.value.replace(/[^0-9.]/g, '')})}
                                                      onFocus={(e) => e.target.select()}
                                                  />
                                              </div>
                                              
                                              <button 
                                                  onClick={() => setAuditCounts({...auditCounts, [item.id]: String(physicalValue + 1)})}
                                                  className="w-14 h-12 bg-sage-50 hover:bg-sage-100 active:bg-sage-200 text-sage-600 rounded-xl flex items-center justify-center transition-colors"
                                              >
                                                  <Plus size={20} />
                                              </button>
                                          </div>
                                      )}
                                  </div>
                              </motion.div>
                          )
                      }
                      
                      const stockQty = item.stock_quantity || 0
                      const minQty = item.min_stock_level || 0
                      const maxQty = Math.max(stockQty, minQty, 1)
                      const progressWidth = Math.max(8, Math.min(100, (stockQty / maxQty) * 100))
                      const categoryName = categories.find(c => c.id === item.category_id)?.name || (locale === 'en' ? 'General' : locale === 'zh' ? 'General' : 'ทั่วไป')

                      const isExpandedMobile = expandedInventoryCardId === item.id
                      const isGridCard = viewMode === 'grid' && !isAuditMode

                      return (
                          <div
                            key={item.id}
                            onClick={() => setExpandedInventoryCardId((current) => current === item.id ? null : item.id)}
                            className={`group relative overflow-hidden border transition-all cursor-pointer shadow-[0_10px_30px_rgba(21,22,19,0.04)] ${isGridCard ? 'rounded-[26px] p-4' : 'rounded-[30px] p-5'} ${isLowStock ? 'border-[#F3E4E6] bg-white' : 'border-[#ECEEE9] bg-white'} ${isExpandedMobile ? 'border-[#171714] shadow-[0_14px_28px_rgba(18,22,18,0.08)]' : ''} sm:cursor-default sm:rounded-[30px] sm:p-6`}
                          >
                              {isGridCard ? (
                                <>
                                  <div className="grid grid-cols-[minmax(0,1fr)_82px] gap-3">
                                      <div className="min-w-0 pr-2">
                                          <h4 className="line-clamp-3 text-[16px] font-black leading-[1.15] text-[#161612] sm:text-[20px]">{item.name}</h4>
                                          <div className="mt-2 text-[11px] font-bold text-[#A4A79F]">
                                            {item.supplier_name || item.supplier || categoryName}
                                            {(item.supplier_name || item.supplier) && (
                                              <span className="text-[#C1C4BC]"> • {categoryName}</span>
                                            )}
                                          </div>
                                      </div>
                                      <div className="shrink-0 text-right">
                                          <div className="flex items-end justify-end gap-1.5 leading-none">
                                            <div className={`text-[28px] font-black tracking-[-0.05em] ${isLowStock ? 'text-[#CF201C]' : 'text-[#111111]'}`}>
                                              {stockQty}
                                            </div>
                                            <div className="pb-1 text-[10px] font-black text-[#8E948E]">{item.unit}</div>
                                          </div>
                                          <div className={`mt-2 text-[11px] font-black ${isLowStock ? 'text-[#CF201C]' : 'text-[#2E7D57]'}`}>
                                            {isLowStock ? (
                                              <span className="inline-flex items-center gap-1">
                                                <AlertTriangle size={12} />
                                                {locale === 'en' ? 'วิกฤต' : locale === 'zh' ? 'วิกฤต' : 'วิกฤต'}
                                              </span>
                                            ) : (
                                              <span className="inline-flex items-center gap-1">
                                                <CheckCircle2 size={12} />
                                                {locale === 'en' ? 'ปกติ' : locale === 'zh' ? 'ปกติ' : 'ปกติ'}
                                              </span>
                                            )}
                                          </div>
                                      </div>
                                  </div>

                                  <div className="mt-5">
                                    <div className="h-[5px] w-full overflow-hidden bg-[#EFF0EB]">
                                      <div
                                        className={`${isLowStock ? 'bg-[#CF201C]' : 'bg-[#111111]'} h-full`}
                                        style={{ width: `${progressWidth}%` }}
                                      />
                                    </div>
                                  </div>

                                  <div className="mt-4 flex items-center justify-between text-[10px] font-black text-[#B2B6AF]">
                                    <span>{locale === 'en' ? 'ขั้นต่ำ' : locale === 'zh' ? 'ขั้นต่ำ' : 'ขั้นต่ำ'} {minQty}</span>
                                    <span>{locale === 'en' ? 'สูงสุด' : locale === 'zh' ? 'สูงสุด' : 'สูงสุด'} {maxQty}</span>
                                  </div>
                                </>
                              ) : (
                                <>
                                  <div className="grid grid-cols-[minmax(0,1fr)_116px] gap-5">
                                      <div className="min-w-0 pr-2 sm:border-r sm:border-[#F1ECE2] sm:pr-4">
                                          <h4 className="line-clamp-2 text-[19px] font-black leading-tight text-[#161612] sm:text-[20px]">{item.name}</h4>
                                          <div className="mt-2 text-[11px] font-bold text-[#A4A79F]">
                                            {item.supplier_name || item.supplier || categoryName}
                                            {(item.supplier_name || item.supplier) && (
                                              <span className="text-[#C1C4BC]"> • {categoryName}</span>
                                            )}
                                          </div>
                                      </div>
                                      <div className="shrink-0 text-right">
                                          <div className="flex items-end justify-end gap-1.5 leading-none">
                                            <div className={`text-[34px] font-black tracking-[-0.05em] ${isLowStock ? 'text-[#CF201C]' : 'text-[#111111]'}`}>
                                              {stockQty}
                                            </div>
                                            <div className="pb-1 text-[11px] font-black text-[#8E948E]">{item.unit}</div>
                                          </div>
                                          <div className={`mt-2 text-[11px] font-black ${isLowStock ? 'text-[#CF201C]' : 'text-[#2E7D57]'}`}>
                                            {isLowStock ? (
                                              <span className="inline-flex items-center gap-1">
                                                <AlertTriangle size={12} />
                                                {locale === 'en' ? 'ต้องซื้อเพิ่ม' : locale === 'zh' ? 'ต้องซื้อเพิ่ม' : 'ต้องซื้อเพิ่ม'}
                                              </span>
                                            ) : (
                                              <span className="inline-flex items-center gap-1">
                                                <CheckCircle2 size={12} />
                                                {locale === 'en' ? 'ปกติ' : locale === 'zh' ? 'ปกติ' : 'ปกติ'}
                                              </span>
                                            )}
                                          </div>
                                      </div>
                                  </div>

                                  <div className="mt-5">
                                    <div className="h-[5px] w-full overflow-hidden bg-[#EFF0EB]">
                                      <div
                                        className={`h-full ${isLowStock ? 'bg-[#CF201C]' : 'bg-[#111111]'}`}
                                        style={{ width: `${progressWidth}%` }}
                                      />
                                    </div>
                                  </div>

                                  <div className="mt-4 flex items-center justify-between text-[10px] font-black text-[#B2B6AF] sm:text-[11px]">
                                    <span>{locale === 'en' ? 'ขั้นต่ำ' : locale === 'zh' ? 'ขั้นต่ำ' : 'ขั้นต่ำ'} {minQty} {item.unit}</span>
                                    <span className={isLowStock ? 'text-[#CF201C]' : 'text-[#2E7D57]'}>
                                      {isLowStock ? (locale === 'en' ? 'ต้องซื้อเพิ่ม' : locale === 'zh' ? 'ต้องซื้อเพิ่ม' : 'ต้องซื้อเพิ่ม') : (locale === 'en' ? 'ปกติ' : locale === 'zh' ? 'ปกติ' : 'ปกติ')}
                                    </span>
                                    <span>{locale === 'en' ? 'สูงสุด' : locale === 'zh' ? 'สูงสุด' : 'สูงสุด'} {maxQty} {item.unit}</span>
                                  </div>
                                </>
                              )}

                              <AnimatePresence initial={false}>
                              {isExpandedMobile && (
                              <motion.div
                                initial={{ height: 0, opacity: 0, marginTop: 0 }}
                                animate={{ height: 'auto', opacity: 1, marginTop: 16 }}
                                exit={{ height: 0, opacity: 0, marginTop: 0 }}
                                transition={{ duration: 0.18 }}
                                className="overflow-hidden sm:hidden"
                              >
                              <div className="flex items-center justify-between gap-3 border-t border-[#F3EFE7] pt-4">
                                <button
                                  onClick={(event) => { event.stopPropagation(); setEditingItem(item); setIsRestockOpen(true); setShowHistory(false); }}
                                  className={`inline-flex h-10 min-w-[116px] items-center justify-center px-4 text-[11px] font-black ${isLowStock ? 'bg-[#CF201C] text-white' : 'bg-[#171714] text-white'}`}
                                >
                                  {locale === 'en' ? 'อัปเดตสต็อก' : locale === 'zh' ? 'อัปเดตสต็อก' : 'อัปเดตสต็อก'}
                                </button>
                                {isAdmin && (
                                  <button
                                    onClick={(event) => { event.stopPropagation(); setEditingItem(item); setIsEditorOpen(true); setShowHistory(false); }}
                                    className="inline-flex h-10 items-center justify-center border border-[#ECE7DE] bg-white px-4 text-[11px] font-black text-[#6F756D]"
                                  >
                                    <Edit3 size={14} className="mr-1.5" />
                                    {locale === 'en' ? 'แก้ไข' : locale === 'zh' ? 'แก้ไข' : 'แก้ไข'}
                                  </button>
                                )}
                              </div>
                              </motion.div>
                              )}
                              </AnimatePresence>

                              <div className="mt-4 hidden items-center justify-end border-t border-[#F3EFE7] pt-4 sm:flex">
                                <button
                                  onClick={(event) => { event.stopPropagation(); setEditingItem(item); setIsRestockOpen(true); setShowHistory(false); }}
                                  className={`inline-flex h-10 items-center justify-center px-4 text-[11px] font-black ${isLowStock ? 'bg-[#CF201C] text-white' : 'bg-[#171714] text-white'}`}
                                >
                                  {locale === 'en' ? 'Restock' : locale === 'zh' ? 'Restock' : 'เติมสต็อก'}
                                </button>
                              </div>
                          </div>
                      )
                  })}
              </div>
          ) : (
              <div className="overflow-x-auto relative min-h-[500px]">
                  <div className="flex justify-end mb-4">
                    <button 
                        onClick={() => setShowColumnSelector(!showColumnSelector)}
                        className="flex items-center gap-2 text-[11px] font-black uppercase tracking-widest bg-white shadow-sm px-6 py-3 rounded-full border border-gray-100 hover:border-gray-300 transition-all text-[#1A1A18]"
                    >
                        <Settings size={14} /> {locale === 'en' ? ' ปรับแต่งตาราง' : locale === 'zh' ? ' ปรับแต่งตาราง' : ' ปรับแต่งตาราง'}
                    </button>
                    <AnimatePresence>
                        {showColumnSelector && (
                            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} className="absolute right-0 top-14 w-64 bg-white border border-gray-200 shadow-xl rounded-2xl p-6 z-30 space-y-4">
                                <div className="text-[11px] font-black uppercase tracking-widest border-b border-gray-100 pb-3 mb-4">{locale === 'en' ? 'แสดงคอลัมน์' : locale === 'zh' ? 'แสดงคอลัมน์' : 'แสดงคอลัมน์'}</div>
                                {columns.map(col => (
                                    <label key={col.id} className="flex items-center gap-3 cursor-pointer group">
                                        <input 
                                            type="checkbox" 
                                            className="accent-black w-5 h-5 rounded" 
                                            checked={visibleColumns.includes(col.id)}
                                            onChange={() => setVisibleColumns(prev => prev.includes(col.id) ? prev.filter(p => p !== col.id) : [...prev, col.id])}
                                        />
                                        <span className="text-[12px] font-bold text-gray-500 group-hover:text-black transition-colors">{col.label}</span>
                                    </label>
                                ))}
                            </motion.div>
                        )}
                    </AnimatePresence>
                  </div>

                  
                  <div className="space-y-12">
                      {categories.concat([{ id: 'uncategorized', name: 'อื่นๆ (Uncategorized)', is_active: true }]).map(cat => {
                          const itemsInCat = filteredInventory.filter(item => 
                              cat.id === 'uncategorized' 
                              ? !item.category_id || !categories.find(c => c.id === item.category_id)
                              : item.category_id === cat.id
                          );
                          
                          if (itemsInCat.length === 0) return null;

                          return (
                              <div key={cat.id} className="bg-white border border-gray-100 overflow-hidden rounded-[2rem] shadow-sm">
                                  <div className="bg-[#1A1A18] text-white p-6 sm:p-8 flex items-center justify-between">
                                      <h3 className="text-xl sm:text-2xl font-black uppercase tracking-widest">{cat.name}</h3>
                                      <span className="text-xs sm:text-sm font-black opacity-80 bg-white/10 px-4 py-2 rounded-full">{itemsInCat.length} Items</span>
                                  </div>
                                  <div className="overflow-x-auto no-scrollbar">
                                      <table className="w-full text-left border-collapse min-w-[800px] sm:min-w-full">
                                          <thead>
                                              <tr className="bg-slate-50 border-b border-gray-100">
                                                  <th className="p-4 sm:p-6 text-[11px] font-black uppercase tracking-widest text-slate-500 w-1/3 sm:w-auto border-r border-gray-100">ชื่อวัตถุดิบ (Name)</th>
                                                  <th className="p-4 sm:p-6 text-[11px] font-black uppercase tracking-widest text-slate-500 w-24 sm:w-32 text-center border-r border-gray-100">หน่วย (Unit)</th>
                                                  <th className="p-4 sm:p-6 text-[11px] font-black uppercase tracking-widest text-slate-500 w-28 sm:w-40 text-center border-r border-gray-100">ยอดระบบ (System)</th>
                                                  {isAdmin && (
                                                    <th className="p-4 sm:p-6 text-[11px] font-black uppercase tracking-widest text-slate-500 w-28 sm:w-40 text-center border-r border-gray-100">ต้นทุน / หน่วย</th>
                                                  )}
                                                  <th className="p-4 sm:p-6 text-[11px] font-black uppercase tracking-widest text-emerald-700 w-32 sm:w-48 text-center bg-emerald-50 border-r border-gray-100">ยอดนับจริง (Audit)</th>
                                                  <th className="p-4 sm:p-6 text-[11px] font-black uppercase tracking-widest text-slate-500 w-20 sm:w-28 text-center border-r border-gray-100">ส่วนต่าง</th>
                                                  <th className="p-4 sm:p-6 text-[11px] font-black uppercase tracking-widest text-slate-500 w-32 text-center">จัดการ</th>
                                              </tr>
                                          </thead>
                                          <tbody className="divide-y divide-gray-100">
                                              {itemsInCat.map((item) => {
                                                  const physical = auditCounts[item.id] !== undefined && auditCounts[item.id] !== '' ? Number(auditCounts[item.id]) : null;
                                                  const discrepancy = physical !== null ? physical - (item.stock_quantity || 0) : null;

                                                  return (
                                                    <tr key={item.id} className="group hover:bg-slate-50/50 transition-colors">
                                                        <td className="p-0 border-r border-gray-100">
                                                            <input 
                                                                type="text" 
                                                                defaultValue={item.name} 
                                                                readOnly={!isAdmin}
                                                                onBlur={(e) => isAdmin && handleBulkUpdate(item.id, 'name', e.target.value)}
                                                                className={`w-full h-full min-h-[64px] p-4 sm:p-6 bg-transparent outline-none text-base font-black uppercase text-[#1A1A18] transition-all ${isAdmin ? 'focus:bg-white focus:ring-4 focus:ring-inset focus:ring-sage-500/20 focus:text-sage-700' : 'cursor-not-allowed'}`}
                                                            />
                                                        </td>

                                                        <td className="p-0 border-r border-gray-100">
                                                            <input 
                                                                type="text" 
                                                                defaultValue={item.unit} 
                                                                readOnly={!isAdmin}
                                                                onBlur={(e) => isAdmin && handleBulkUpdate(item.id, 'unit', e.target.value)}
                                                                className={`w-full h-full min-h-[64px] p-4 sm:p-6 bg-transparent outline-none text-xs font-black uppercase text-gray-500 text-center transition-all ${isAdmin ? 'focus:bg-white focus:ring-4 focus:ring-inset focus:ring-sage-500/20 focus:text-sage-700' : 'cursor-not-allowed'}`}
                                                            />
                                                        </td>

                                                        <td className="p-0 border-r border-gray-100 bg-slate-50/30">
                                                            <input 
                                                                type="number" 
                                                                defaultValue={item.stock_quantity || 0} 
                                                                readOnly={!isAdmin}
                                                                onBlur={(e) => isAdmin && handleBulkUpdate(item.id, 'stock_quantity', Number(e.target.value))}
                                                                className={`w-full h-full min-h-[64px] p-4 sm:p-6 bg-transparent outline-none text-xl font-black text-center text-[#1A1A18] transition-all ${isAdmin ? 'focus:bg-white focus:ring-4 focus:ring-inset focus:ring-sage-500/20 focus:text-sage-700' : 'cursor-not-allowed'}`}
                                                            />
                                                        </td>

                                                        {isAdmin && (
                                                            <td className="p-0 border-r border-gray-100">
                                                                <input 
                                                                    type="number" 
                                                                    defaultValue={item.cost_price} 
                                                                    readOnly={!isAdmin}
                                                                    onBlur={(e) => isAdmin && handleBulkUpdate(item.id, 'cost_price', Number(e.target.value))}
                                                                    className={`w-full h-full min-h-[64px] p-4 sm:p-6 bg-transparent outline-none text-base font-black text-center text-emerald-600 transition-all focus:bg-white focus:ring-4 focus:ring-inset focus:ring-emerald-500/20`}
                                                                />
                                                            </td>
                                                        )}

                                                        <td className="p-0 border-r border-gray-100 bg-emerald-50/30">
                                                            <input 
                                                                type="number"
                                                                placeholder="-"
                                                                className="w-full h-full min-h-[64px] p-4 sm:p-6 bg-transparent outline-none text-xl font-black text-center text-emerald-700 focus:bg-emerald-100 focus:text-emerald-800 transition-all placeholder:text-emerald-300"
                                                                value={auditCounts[item.id] || ''}
                                                                onChange={(e) => setAuditCounts({...auditCounts, [item.id]: e.target.value})}
                                                                onFocus={(e) => e.target.select()}
                                                            />
                                                        </td>

                                                        <td className="p-4 sm:p-6 text-center border-r border-gray-100">
                                                            <div className={`text-sm font-black px-3 py-1.5 inline-block rounded-lg ${discrepancy === 0 ? 'bg-gray-100 text-gray-500' : discrepancy! > 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                                                {discrepancy !== null ? (discrepancy > 0 ? `+${discrepancy}` : discrepancy) : '-'}
                                                            </div>
                                                        </td>

                                                        <td className="p-4 sm:p-6 text-center">
                                                            <div className="flex items-center justify-center gap-3">
                                                                {isAdmin && (
                                                                    <button onClick={() => { setEditingItem(item); setIsEditorOpen(true); setShowHistory(false); }} className="w-12 h-12 flex items-center justify-center text-gray-400 hover:text-[#1A1A18] transition-all bg-white border border-gray-200 shadow-sm hover:shadow-md rounded-full">
                                                                        <Edit3 size={18} />
                                                                    </button>
                                                                )}
                                                                <button onClick={() => { setEditingItem(item); setIsRestockOpen(true); setShowHistory(false); }} className="w-12 h-12 flex items-center justify-center text-green-600 hover:text-green-700 transition-all bg-green-50 border border-green-100 shadow-sm hover:shadow-md rounded-full">
                                                                    <Plus size={20} />
                                                                </button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                  )
                                              })}
                                          </tbody>
                                      </table>
                                  </div>
                              </div>
                          )
                      })}
                  </div>
              </div>
          )}
      </div>
      )}
      </div>

      {/* AUDIT SUMMARY MODAL - MOBILE FULLSCREEN REDESIGN */}
      <AnimatePresence>
        {isAuditSummaryOpen && auditSummary && (
            <div className="fixed inset-0 z-[1300] flex items-center justify-center sm:p-6 font-bold">
                {/* Backdrop only for Desktop */}
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-[#1A1A18]/90 backdrop-blur-xl hidden sm:block" />
                
                <motion.div 
                    initial={{ y: "100%", opacity: 0 }} 
                    animate={{ y: 0, opacity: 1 }} 
                    exit={{ y: "100%", opacity: 0 }} 
                    transition={{ type: "spring", damping: 25, stiffness: 200 }}
                    className="relative w-full h-full sm:h-auto sm:max-h-[90vh] sm:max-w-2xl bg-white shadow-2xl flex flex-col font-bold overflow-hidden"
                >
                    <header className="p-6 sm:p-10 border-b border-gray-100 flex justify-between items-center bg-white sticky top-0 z-10">
                        <div className="flex items-center gap-4 sm:gap-6 font-bold">
                            <div className="w-12 h-12 sm:w-16 sm:h-16 bg-[#1A1A18] flex items-center justify-center font-bold rounded-2xl shadow-xl">
                                <CheckCircle2 className="text-white" size={24} />
                            </div>
                            <div className="font-bold">
                                <h2 className="text-2xl sm:text-3xl font-black tracking-tighter text-[#1A1A18] leading-tight font-bold">{locale === 'en' ? 'สรุปผลการนับ' : locale === 'zh' ? 'สรุปผลการนับ' : 'สรุปผลการนับ'}</h2>
                                <p className="text-[10px] font-black uppercase tracking-widest text-[#8C8A81] mt-1 font-bold leading-none">Inventory Reconciled Successfully</p>
                            </div>
                        </div>
                        <button onClick={() => setIsAuditSummaryOpen(false)} className="w-12 h-12 flex items-center justify-center bg-gray-50 rounded-full text-gray-300 hover:text-black transition-all">
                            <X size={24} />
                        </button>
                    </header>
                    
                    <div className="p-6 sm:p-10 flex-1 overflow-y-auto no-scrollbar font-bold space-y-8 sm:space-y-12">
                        {/* STATS - LARGE TILES FOR MOBILE */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 font-bold">
                             <div className="p-6 sm:p-8 bg-gray-50 border border-gray-100 rounded-3xl font-bold flex flex-row sm:flex-col justify-between sm:justify-start items-center sm:items-start gap-4">
                                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest font-bold">{locale === 'en' ? 'นับทั้งหมด' : locale === 'zh' ? 'นับทั้งหมด' : 'นับทั้งหมด'}</span>
                                <div className="text-3xl sm:text-5xl font-black text-black font-bold">{auditSummary.session.total_items_counted}</div>
                             </div>
                             <div className="p-6 sm:p-8 bg-red-50 border border-red-100 rounded-3xl font-bold flex flex-row sm:flex-col justify-between sm:justify-start items-center sm:items-start gap-4">
                                <span className="text-[10px] font-black text-red-400 uppercase tracking-widest font-bold">{locale === 'en' ? 'ยอดไม่ตรง' : locale === 'zh' ? 'ยอดไม่ตรง' : 'ยอดไม่ตรง'}</span>
                                <div className="text-3xl sm:text-5xl font-black text-red-500 font-bold">{auditSummary.session.total_discrepancies}</div>
                             </div>
                             <div className="p-6 sm:p-8 bg-amber-50 border border-amber-100 rounded-3xl font-bold flex flex-row sm:flex-col justify-between sm:justify-start items-center sm:items-start gap-4">
                                <span className="text-[10px] font-black text-amber-500 uppercase tracking-widest font-bold">{locale === 'en' ? 'ต้องสั่งเพิ่ม' : locale === 'zh' ? 'ต้องสั่งเพิ่ม' : 'ต้องสั่งเพิ่ม'}</span>
                                <div className="text-3xl sm:text-5xl font-black text-amber-600 font-bold">
                                    {auditSummary.details.filter((d: any) => {
                                        const item = inventory.find(i => i.id === d.item_id);
                                        return d.counted_quantity <= (item?.min_stock_level || 0);
                                    }).length}
                                </div>
                             </div>
                             <div className="p-6 sm:p-8 bg-emerald-50 border border-emerald-100 rounded-3xl font-bold flex flex-row sm:flex-col justify-between sm:justify-start items-center sm:items-start gap-4">
                                <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest font-bold">{locale === 'en' ? 'ความแม่นยำ' : locale === 'zh' ? 'ความแม่นยำ' : 'ความแม่นยำ'}</span>
                                <div className="text-3xl sm:text-5xl font-black text-emerald-600 font-bold">
                                    {Math.round(((auditSummary.session.total_items_counted - auditSummary.session.total_discrepancies) / auditSummary.session.total_items_counted) * 100)}%
                                </div>
                             </div>
                        </div>

                        {/* LISTS */}
                        <div className="space-y-8 font-bold">
                            {/* DISCREPANCIES */}
                            {auditSummary.session.total_discrepancies > 0 && (
                                <div className="space-y-4 font-bold">
                                    <h3 className="text-[11px] font-black uppercase tracking-widest text-black/20 font-bold flex items-center gap-4">
                                        {locale === 'en' ? '                                         รายการที่ยอดไม่ตรง                                         ' : locale === 'zh' ? '                                         รายการที่ยอดไม่ตรง                                         ' : '                                         รายการที่ยอดไม่ตรง                                         '}<div className="h-px bg-black/5 flex-1"></div>
                                    </h3>
                                    <div className="space-y-3 font-bold">
                                        {auditSummary.details.filter((d: any) => d.discrepancy !== 0).map((d: any) => (
                                            <div key={d.item_id} className="p-5 bg-white border border-[#F0F0E8] rounded-2xl flex items-center justify-between font-bold">
                                                <div className="font-bold space-y-1">
                                                    <div className="text-[12px] font-black uppercase text-black">{d.item_name}</div>
                                                    <div className="text-[9px] font-black text-gray-300 uppercase tracking-widest">{locale === 'en' ? 'ระบบ ' : locale === 'zh' ? 'ระบบ ' : 'ระบบ '}{d.system_quantity_before} {locale === 'en' ? ' → นับจริง ' : locale === 'zh' ? ' → นับจริง ' : ' → นับจริง '}{d.counted_quantity}</div>
                                                </div>
                                                <div className={`text-xl font-black ${d.discrepancy > 0 ? 'text-green-500' : 'text-red-500'}`}>
                                                    {d.discrepancy > 0 ? '+' : ''}{d.discrepancy}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* LOW STOCK ITEMS */}
                            {auditSummary.details.filter((d: any) => {
                                const item = inventory.find(i => i.id === d.item_id);
                                return d.counted_quantity <= (item?.min_stock_level || 0);
                            }).length > 0 && (
                                <div className="space-y-4 font-bold">
                                    <h3 className="text-[11px] font-black uppercase tracking-widest text-amber-500/40 font-bold flex items-center gap-4">
                                        {locale === 'en' ? '                                         สินค้าที่ต้องสั่งซื้อเพิ่ม                                         ' : locale === 'zh' ? '                                         สินค้าที่ต้องสั่งซื้อเพิ่ม                                         ' : '                                         สินค้าที่ต้องสั่งซื้อเพิ่ม                                         '}<div className="h-px bg-amber-100 flex-1"></div>
                                    </h3>
                                    <div className="space-y-3 font-bold">
                                        {auditSummary.details.filter((d: any) => {
                                            const item = inventory.find(i => i.id === d.item_id);
                                            return d.counted_quantity <= (item?.min_stock_level || 0);
                                        }).map((d: any) => {
                                            const item = inventory.find(i => i.id === d.item_id);
                                            return (
                                                <div key={d.item_id} className="p-5 bg-amber-50/50 border border-amber-100 rounded-2xl flex items-center justify-between font-bold">
                                                    <div className="text-[12px] font-black uppercase text-amber-900">{d.item_name}</div>
                                                    <div className="text-[10px] font-black text-amber-600">{locale === 'en' ? 'คงเหลือ ' : locale === 'zh' ? 'คงเหลือ ' : 'คงเหลือ '}{d.counted_quantity} {locale === 'en' ? ' (จุดสั่งซื้อ ' : locale === 'zh' ? ' (จุดสั่งซื้อ ' : ' (จุดสั่งซื้อ '}{item?.min_stock_level})</div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    <footer className="p-6 sm:p-10 border-t border-gray-50 flex flex-col items-center gap-4 font-bold bg-white sticky bottom-0">
                         <button onClick={() => setIsAuditSummaryOpen(false)} className="w-full h-14 sm:h-16 bg-[#1A1A18] text-white text-[12px] sm:text-[13px] font-black uppercase tracking-widest hover:bg-black transition-all font-bold rounded-2xl shadow-xl">{locale === 'en' ? 'เสร็จสิ้นและปิด' : locale === 'zh' ? 'เสร็จสิ้นและปิด' : 'เสร็จสิ้นและปิด'}</button>
                    </footer>
                </motion.div>
            </div>
        )}
      </AnimatePresence>

      {/* QUICK RESTOCK MODAL */}
      {isRestockOpen && (
          <div className="fixed inset-0 z-[1250] flex items-center justify-center font-bold p-6">
              <div className="absolute inset-0 bg-[#1A1A18]/60 backdrop-blur-sm" onClick={() => setIsRestockOpen(false)}></div>
              <div className="relative w-full max-w-md bg-white p-10 shadow-2xl animate-in zoom-in-95 duration-200">
                  <header className="mb-8 font-bold">
                    <h3 className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">{locale === 'en' ? 'QUICK STOCK-IN / รับสินค้าเข้าคลัง' : locale === 'zh' ? 'QUICK STOCK-IN / รับสินค้าเข้าคลัง' : 'QUICK STOCK-IN / รับสินค้าเข้าคลัง'}</h3>
                    <h2 className="text-xl font-black uppercase">{editingItem.name}</h2>
                  </header>
                  
                  <div className="space-y-6 font-bold">
                      <div className="grid grid-cols-2 gap-4 font-bold">
                         <div className="space-y-2 font-bold">
                            <label className="text-[9px] font-black uppercase text-gray-300">{locale === 'en' ? 'จำนวนที่สั่ง (EXPECTED ' : locale === 'zh' ? 'จำนวนที่สั่ง (EXPECTED ' : 'จำนวนที่สั่ง (EXPECTED '}{editingItem.purchase_unit || editingItem.unit})</label>
                            <input 
                                type="number" 
                                className="w-full bg-gray-50 border-none py-4 px-6 text-xl font-black outline-none focus:ring-1 focus:ring-black"
                                value={expectedQty}
                                onChange={(e) => setExpectedQty(e.target.value)}
                                placeholder="0"
                                autoFocus
                            />
                         </div>
                         <div className="space-y-2 font-bold">
                            <label className="text-[9px] font-black uppercase text-gray-600">{locale === 'en' ? 'จำนวนที่รับจริง (RECEIVED)' : locale === 'zh' ? 'จำนวนที่รับจริง (RECEIVED)' : 'จำนวนที่รับจริง (RECEIVED)'}</label>
                            <input 
                                type="number" 
                                className="w-full bg-sage-50 border border-sage-200 py-4 px-6 text-xl font-black outline-none focus:ring-1 focus:ring-sage-600"
                                value={restockQty}
                                onChange={(e) => setRestockQty(e.target.value)}
                                placeholder="0"
                            />
                         </div>
                      </div>
                      <div className="space-y-2 font-bold">
                        <label className="text-[9px] font-black uppercase text-gray-300">{locale === 'en' ? 'หมายเหตุ / NOTES' : locale === 'zh' ? 'หมายเหตุ / NOTES' : 'หมายเหตุ / NOTES'}</label>
                        <input 
                            type="text" 
                            className="w-full bg-gray-50 border-none py-4 px-6 text-[14px] font-bold outline-none focus:ring-1 focus:ring-black"
                            value={restockNote}
                            onChange={(e) => setRestockNote(e.target.value)}
                            placeholder={locale === 'en' ? 'เช่น ใบส่งของเลขที่...' : locale === 'zh' ? 'เช่น ใบส่งของเลขที่...' : 'เช่น ใบส่งของเลขที่...'}
                        />
                      </div>
                      
                      <button 
                        onClick={handleQuickRestock}
                        disabled={isSaving || !restockQty}
                        className="w-full bg-[#1A1A18] text-white py-6 flex items-center justify-center gap-3 shadow-xl hover:bg-black transition-all disabled:opacity-50"
                      >
                        {isSaving ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
                        <span className="text-[12px] font-black uppercase tracking-widest">{locale === 'en' ? 'ยืนยันการรับสินค้า' : locale === 'zh' ? 'ยืนยันการรับสินค้า' : 'ยืนยันการรับสินค้า'}</span>
                      </button>
                  </div>
              </div>
          </div>
      )}

      {/* EDIT MODAL */}
      <AnimatePresence>
        {isEditorOpen && (
          <div className="fixed inset-0 z-[1200] flex items-center justify-center p-6 font-bold">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-[#1A1A18]/80 backdrop-blur-md" onClick={() => setIsEditorOpen(false)} />
            <motion.div initial={{ x: 100, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: 100, opacity: 0 }} className="relative w-full max-w-2xl bg-white shadow-2xl flex flex-col font-bold">
              <header className="p-10 border-b border-gray-50 flex justify-between items-center bg-gray-50 font-bold">
                <div className="font-bold">
                  <h2 className="text-3xl font-black uppercase tracking-tighter text-[#1A1A18]">{editingItem.id ? 'Edit Material' : 'New Material'}</h2>
                  <p className="text-[10px] font-black uppercase tracking-widest text-[#8C8A81] mt-1">Inventory Management Portal</p>
                </div>
                <button onClick={() => setIsEditorOpen(false)} className="w-12 h-12 flex items-center justify-center bg-white border border-[#F0F0E8] hover:border-black transition-all text-gray-300 hover:text-black">
                   <X size={20} />
                </button>
              </header>

              <div className="p-10 space-y-8 font-bold">
                <div className="grid grid-cols-2 gap-8 font-bold">
                  <div className="space-y-2 font-bold">
                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">{locale === 'en' ? 'ชื่อวัตถุดิบ' : locale === 'zh' ? 'ชื่อวัตถุดิบ' : 'ชื่อวัตถุดิบ'}</label>
                    <input 
                      type="text" 
                      className="w-full bg-gray-50 border-none py-4 px-6 text-[14px] font-bold outline-none focus:ring-1 focus:ring-black"
                      value={editingItem.name}
                      onChange={(e) => setEditingItem({...editingItem, name: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2 font-bold">
                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">{locale === 'en' ? 'หมวดหมู่สินค้า' : locale === 'zh' ? 'หมวดหมู่สินค้า' : 'หมวดหมู่สินค้า'}</label>
                    <select 
                      className="w-full bg-gray-50 border-none py-4 px-6 text-[14px] font-bold outline-none focus:ring-1 focus:ring-black h-[58px]"
                      value={editingItem.category_id || ''}
                      onChange={(e) => setEditingItem({...editingItem, category_id: e.target.value})}
                    >
                      <option value="">{locale === 'en' ? 'เลือกหมวดหมู่...' : locale === 'zh' ? 'เลือกหมวดหมู่...' : 'เลือกหมวดหมู่...'}</option>
                      {categories.map(cat => (
                        <option key={cat.id} value={cat.id}>{cat.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-8 font-bold">
                  <div className="space-y-2 font-bold">
                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">{locale === 'en' ? 'SKU / รหัส' : locale === 'zh' ? 'SKU / รหัส' : 'SKU / รหัส'}</label>
                    <input 
                      type="text" 
                      className="w-full bg-gray-50 border-none py-4 px-6 text-[14px] font-bold outline-none focus:ring-1 focus:ring-black"
                      value={editingItem.sku || ''}
                      onChange={(e) => setEditingItem({...editingItem, sku: e.target.value})}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-8 font-bold">
                  <div className="space-y-2 font-bold">
                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">{locale === 'en' ? 'หน่วยฐาน (เช่น ชิ้น, g)' : locale === 'zh' ? 'หน่วยฐาน (เช่น ชิ้น, g)' : 'หน่วยฐาน (เช่น ชิ้น, g)'}</label>
                    <input 
                      type="text" 
                      className="w-full bg-gray-50 border-none py-4 px-6 text-[14px] font-bold outline-none focus:ring-1 focus:ring-black text-center"
                      value={editingItem.unit}
                      onChange={(e) => setEditingItem({...editingItem, unit: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2 font-bold">
                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">{locale === 'en' ? 'หน่วยซื้อ (เช่น แพ็ค, ลัง)' : locale === 'zh' ? 'หน่วยซื้อ (เช่น แพ็ค, ลัง)' : 'หน่วยซื้อ (เช่น แพ็ค, ลัง)'}</label>
                    <input 
                      type="text" 
                      className="w-full bg-gray-50 border-none py-4 px-6 text-[14px] font-bold outline-none focus:ring-1 focus:ring-black text-center"
                      value={editingItem.purchase_unit || ''}
                      onChange={(e) => setEditingItem({...editingItem, purchase_unit: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2 font-bold">
                    <label className="text-[10px] font-black uppercase tracking-widest text-blue-500">{locale === 'en' ? 'จำนวนย่อยต่อ 1 ' : locale === 'zh' ? 'จำนวนย่อยต่อ 1 ' : 'จำนวนย่อยต่อ 1 '}{editingItem.purchase_unit || 'หน่วยซื้อ'}</label>
                    <input 
                      type="number" 
                      className="w-full bg-blue-50 border border-blue-100 py-4 px-6 text-[14px] font-bold outline-none focus:ring-1 focus:ring-blue-500 text-center text-blue-600"
                      value={editingItem.conversion_factor || 1}
                      onChange={(e) => {
                          const newFactor = Number(e.target.value) || 1;
                          // Keep the Bulk Price (Total Paid) constant, update unit cost
                          const currentBulkPrice = editingItem.cost_price * (editingItem.conversion_factor || 1);
                          setEditingItem({
                            ...editingItem, 
                            conversion_factor: newFactor,
                            cost_price: currentBulkPrice / newFactor
                          });
                      }}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-8 font-bold">
                  <div className="space-y-2 font-bold">
                    <label className="text-[10px] font-black uppercase tracking-widest text-emerald-600">{locale === 'en' ? 'ราคาทุนที่ซื้อมาต่อ ' : locale === 'zh' ? 'ราคาทุนที่ซื้อมาต่อ ' : 'ราคาทุนที่ซื้อมาต่อ '}{editingItem.purchase_unit || 'หน่วยซื้อ'}</label>
                    <input 
                      type="number" 
                      className="w-full bg-emerald-50 border border-emerald-100 py-4 px-6 text-xl font-black outline-none focus:ring-1 focus:ring-emerald-600 text-emerald-600"
                      value={(editingItem.cost_price * (editingItem.conversion_factor || 1)).toFixed(2)}
                      onChange={(e) => {
                          const bulk = Number(e.target.value);
                          const f = editingItem.conversion_factor || 1;
                          setEditingItem({...editingItem, cost_price: bulk / f});
                      }}
                    />
                    <div className="mt-2 p-3 bg-emerald-50/50 border border-emerald-100/50 flex items-center justify-between">
                       <span className="text-[9px] font-black text-emerald-600/60 uppercase tracking-widest">{locale === 'en' ? 'ต้นทุนเฉลี่ยต่อ ' : locale === 'zh' ? 'ต้นทุนเฉลี่ยต่อ ' : 'ต้นทุนเฉลี่ยต่อ '}{editingItem.unit}:</span>
                       <span className="text-[12px] font-black text-emerald-700">{locale === 'en' ? '฿' : locale === 'zh' ? '฿' : '฿'}{Number(editingItem.cost_price).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 4})}</span>
                    </div>
                  </div>
                  <div className="space-y-2 font-bold">
                    <label className="text-[10px] font-black uppercase tracking-widest text-red-400">{locale === 'en' ? 'จุดแจ้งเตือนสต็อกต่ำ (ในหน่วย ' : locale === 'zh' ? 'จุดแจ้งเตือนสต็อกต่ำ (ในหน่วย ' : 'จุดแจ้งเตือนสต็อกต่ำ (ในหน่วย '}{editingItem.unit})</label>
                    <input 
                      type="number" 
                      className="w-full bg-red-50 border border-red-100 py-4 px-6 text-xl font-black outline-none focus:ring-1 focus:ring-red-400 text-red-500"
                      value={editingItem.min_stock_level}
                      onChange={(e) => setEditingItem({...editingItem, min_stock_level: Number(e.target.value)})}
                    />
                  </div>
                </div>

                <div className="space-y-2 font-bold mt-4">
                  <label className="text-[10px] font-black uppercase tracking-widest text-amber-600">{locale === 'en' ? 'แหล่งจัดซื้อ / ร้านค้าประจำ' : locale === 'zh' ? 'แหล่งจัดซื้อ / ร้านค้าประจำ' : 'แหล่งจัดซื้อ / ร้านค้าประจำ'}</label>
                  <select 
                    className="w-full bg-amber-50 border border-amber-100 py-4 px-6 text-[14px] font-bold outline-none focus:ring-1 focus:ring-amber-500 text-amber-800"
                    value={editingItem.supplier_id || ''}
                    onChange={(e) => setEditingItem({...editingItem, supplier_id: e.target.value || null})}
                  >
                    <option value="">{locale === 'en' ? 'Uncategorized' : locale === 'zh' ? 'Uncategorized' : 'ไม่ระบุแหล่งซื้อ (Uncategorized)'}</option>
                    {suppliers.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <footer className="p-10 border-t border-gray-50 bg-gray-50 font-bold flex gap-4">
                <button 
                  onClick={handleSaveItem}
                  disabled={isSaving}
                  className="flex-1 bg-[#1A1A18] text-white py-6 flex items-center justify-center gap-3 shadow-xl hover:bg-black transition-all disabled:opacity-50 font-bold"
                >
                  {isSaving ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
                  <span className="text-[12px] font-black uppercase tracking-widest">Save Material</span>
                </button>
              </footer>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* QUICK SUMMARY MODAL */}
      {isSummaryOpen && (
        <div className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
            <header className="p-8 border-b border-[#F0F0E8] flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-black uppercase tracking-tighter text-black">Inventory Quick Summary</h2>
                <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mt-1">{locale === 'en' ? 'สรุปจำนวนสินค้าแยกตามหมวดหมู่' : locale === 'zh' ? 'สรุปจำนวนสินค้าแยกตามหมวดหมู่' : 'สรุปจำนวนสินค้าแยกตามหมวดหมู่'}</p>
              </div>
              <button onClick={() => setIsSummaryOpen(false)} className="w-12 h-12 flex items-center justify-center bg-white border border-[#F0F0E8] hover:border-black transition-all">
                <X size={20} className="text-black" />
              </button>
            </header>

            <div className="flex-1 overflow-y-auto p-8 space-y-12">
              {categories.map(category => {
                const categoryItems = inventory.filter(item => {
                  const itemCatId = item.category_id;
                  return itemCatId === category.id;
                });
                if (categoryItems.length === 0) return null;

                return (
                  <section key={category.id} className="space-y-4">
                    <div className="flex items-center gap-4">
                      <div className="h-4 w-1" style={{ backgroundColor: category.color || '#000' }}></div>
                      <h3 className="text-lg font-black uppercase tracking-tight text-black">{category.name}</h3>
                      <span className="text-[10px] font-black bg-gray-100 px-2 py-0.5 rounded text-gray-400">{categoryItems.length} items</span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-2 border-t border-gray-50 pt-4">
                      {categoryItems.map(item => {
                        const isLow = (item.stock_quantity || 0) <= (item.min_stock_level || 0);
                        return (
                          <div key={item.id} className="flex items-center justify-between py-2 border-b border-gray-50 group hover:bg-gray-50 px-2 transition-colors">
                            <div className="flex flex-col">
                              <span className="text-[12px] font-bold text-gray-800">{item.name}</span>
                              <span className="text-[9px] text-gray-400 font-black uppercase">{item.sku || '-'}</span>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className={`text-[14px] font-black ${isLow ? 'text-red-500' : 'text-[#1A1A18]'}`}>
                                {item.stock_quantity || 0}
                              </span>
                              <span className="text-[9px] font-bold text-gray-300 uppercase w-10">{item.unit}</span>
                              {isLow && (
                                <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </section>
                );
              })}

              {/* UNASSIGNED ITEMS */}
              {inventory.filter(item => !item.category_id || item.category_id === '').length > 0 && (
                <section className="space-y-4">
                  <div className="flex items-center gap-4">
                    <div className="h-4 w-1 bg-gray-300"></div>
                    <h3 className="text-lg font-black uppercase tracking-tight text-black">{locale === 'en' ? 'ยังไม่ได้จัดหมวดหมู่ (UNASSIGNED)' : locale === 'zh' ? 'ยังไม่ได้จัดหมวดหมู่ (UNASSIGNED)' : 'ยังไม่ได้จัดหมวดหมู่ (UNASSIGNED)'}</h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-2 border-t border-gray-50 pt-4">
                    {inventory.filter(item => !item.category_id || item.category_id === '').map(item => {
                        const isLow = (item.stock_quantity || 0) <= (item.min_stock_level || 0);
                        return (
                          <div key={item.id} className="flex items-center justify-between py-2 border-b border-gray-50 group hover:bg-gray-50 px-2 transition-colors">
                            <div className="flex flex-col">
                              <span className="text-[12px] font-bold text-gray-800">{item.name}</span>
                              <span className="text-[9px] text-gray-400 font-black uppercase">{item.sku || '-'}</span>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className={`text-[14px] font-black ${isLow ? 'text-red-500' : 'text-[#1A1A18]'}`}>
                                {item.stock_quantity || 0}
                              </span>
                              <span className="text-[9px] font-bold text-gray-300 uppercase w-10">{item.unit}</span>
                            </div>
                          </div>
                        );
                    })}
                  </div>
                </section>
              )}
            </div>

            <footer className="p-8 bg-gray-50 border-t border-[#F0F0E8] flex justify-end">
              <button 
                onClick={() => setIsSummaryOpen(false)}
                className="px-10 py-4 bg-black text-white text-[12px] font-black uppercase tracking-widest hover:bg-sage-900 transition-all shadow-xl"
              >
                Close Summary
              </button>
            </footer>
          </div>
        </div>
      )}
      <AnimatePresence>
        {isMobileInventorySheetOpen && (
          <div className="fixed inset-0 z-[1250] flex items-end justify-center sm:hidden">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/35 backdrop-blur-[2px]" onClick={() => setIsMobileInventorySheetOpen(false)} />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 24, stiffness: 220 }}
              className="relative z-10 w-full rounded-t-[32px] bg-white px-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-4 shadow-[0_-24px_60px_rgba(0,0,0,0.18)]"
            >
              <div className="mx-auto mb-5 h-2 w-14 rounded-full bg-[#E8EAF0]" />
              <div className="space-y-2">
                {[
                  { key: 'grid', label: 'มุมมอง Grid', icon: LayoutGrid, active: viewMode === 'grid', onClick: () => { setViewMode('grid'); setIsMobileInventorySheetOpen(false); } },
                  { key: 'list', label: 'มุมมอง List', icon: List, active: viewMode === 'list', onClick: () => { setViewMode('list'); setIsMobileInventorySheetOpen(false); } },
                  { key: 'table', label: 'มุมมองตาราง (Table)', icon: Database, active: viewMode === 'table', onClick: () => { setViewMode('table'); setIsMobileInventorySheetOpen(false); } },
                ].map((option) => {
                  const Icon = option.icon
                  return (
                    <button
                      key={option.key}
                      onClick={option.onClick}
                      className={`flex w-full items-center justify-between border px-4 py-4 text-left transition-all ${option.active ? 'border-[#1A1A18] bg-[#FAFAF8]' : 'border-[#EEF0F4] bg-white'}`}
                    >
                      <div className="flex items-center gap-4">
                        <Icon size={24} className="text-[#6B7280]" />
                        <span className="text-[16px] font-black text-[#1A1A18]">{option.label}</span>
                      </div>
                      <span className={`h-3 w-3 rounded-full ${option.active ? 'bg-[#1A1A18]' : 'bg-transparent border border-[#D4D7DE]'}`} />
                    </button>
                  )
                })}
              </div>

              <div className="my-6 h-px bg-[#EEF0F4]" />

              <div className="space-y-2">
                <button
                  onClick={() => { setShowHistory(true); setIsMobileInventorySheetOpen(false); }}
                  className="flex w-full items-center gap-4 px-4 py-4 text-left"
                >
                  <History size={24} className="text-[#6B7280]" />
                  <span className="text-[16px] font-black text-[#4B5563]">ประวัติการเคลื่อนไหว</span>
                </button>
                <button
                  onClick={() => { setIsAuditTypeModalOpen(true); setIsMobileInventorySheetOpen(false); }}
                  className="flex w-full items-center gap-4 border border-[#EEF0F4] px-4 py-4 text-left"
                >
                  <ClipboardCheck size={24} className="text-[#6B7280]" />
                  <span className="text-[16px] font-black text-[#4B5563]">นับสต็อกสินค้า</span>
                </button>
                {isAdmin && (
                  <button
                    onClick={() => {
                      setEditingItem({ name: '', min_stock_level: 5, stock_quantity: 0, unit: 'pcs', cost_price: 0 })
                      setIsEditorOpen(true)
                      setIsMobileInventorySheetOpen(false)
                    }}
                    className="flex w-full items-center gap-4 border border-[#EEF0F4] px-4 py-4 text-left"
                  >
                    <Plus size={24} className="text-[#6B7280]" />
                    <span className="text-[16px] font-black text-[#4B5563]">เพิ่มวัตถุดิบ</span>
                  </button>
                )}
                <button
                  onClick={() => setIsMobileInventorySheetOpen(false)}
                  className="mt-2 flex w-full items-center justify-center border border-[#D8DEE8] px-4 py-4 text-[16px] font-black text-[#A0A6B2]"
                >
                  ยกเลิก
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* AUDIT TYPE SELECTION MODAL (FULLSCREEN) */}
      <AnimatePresence>
        {isAuditTypeModalOpen && (
          <div className="fixed inset-0 z-[1300] flex flex-col font-bold bg-white">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-white" />
            
            <motion.div 
              initial={{ y: "4%" }} 
              animate={{ y: 0 }} 
              exit={{ y: "4%" }} 
              transition={{ duration: 0.2 }}
              className="relative flex h-full w-full flex-col overflow-hidden bg-white"
            >
               <header className="sticky top-0 z-10 flex items-center justify-between border-b border-[#F0F1F4] bg-white px-6 py-5">
                  <div>
                    <div className="text-[15px] font-black tracking-tight text-[#1A1A18]">Stock Audit</div>
                  </div>
                  <button onClick={() => setIsAuditTypeModalOpen(false)} className="flex h-10 w-10 items-center justify-center rounded-full border border-[#ECEEF2] text-[#1A1A18]">
                    <X size={18} />
                  </button>
               </header>

               <div className="flex-1 overflow-y-auto no-scrollbar px-6 pb-36 pt-8">
                   <div className="mb-8">
                     <h2 className="text-[28px] font-black tracking-tight text-[#111111]">
                       {locale === 'en' ? 'Select Category' : locale === 'zh' ? 'Select Category' : 'เลือกหมวดหมู่'}
                     </h2>
                     <p className="mt-3 max-w-md text-[16px] font-bold leading-8 text-[#7A7A7A]">
                       {locale === 'en' ? 'Choose a section to start auditing or perform a full store count.' : locale === 'zh' ? 'Choose a section to start auditing or perform a full store count.' : 'เลือกหมวดหมู่เพื่อเริ่มนับสต็อก หรือเริ่มนับสินค้าทั้งร้าน'}
                     </p>
                   </div>

                   <div className="grid grid-cols-2 gap-4 font-bold">
                        {categories.map(cat => {
                          const isSelected = auditCategory.includes(cat.id);
                          return (
                            <button 
                              key={cat.id}
                              onClick={() => {
                                if (isSelected) setAuditCategory(prev => prev.filter(id => id !== cat.id));
                                else setAuditCategory(prev => [...prev, cat.id]);
                              }}
                              className={`relative aspect-square rounded-[32px] border bg-white p-5 text-center transition-all active:scale-95 ${isSelected ? 'border-[#111111] shadow-[0_10px_24px_rgba(18,22,18,0.08)]' : 'border-[#E7E7E7]'}`}
                            >
                              <div className={`mx-auto flex h-16 w-16 items-center justify-center rounded-full transition-all ${isSelected ? 'bg-[#F5F6F8] text-[#111111]' : 'bg-[#F7F7F7] text-[#111111]'}`}>
                                 {isSelected ? <CheckCircle2 size={28} /> : <Boxes size={28} />}
                              </div>
                              <div className="mt-5 w-full">
                                <div className={`line-clamp-2 text-[17px] font-black leading-tight ${isSelected ? 'text-[#111111]' : 'text-[#111111]'}`}>{cat.name}</div>
                              </div>
                              {isSelected && <div className="absolute right-5 top-5 h-3 w-3 rounded-full bg-[#111111]" />}
                            </button>
                          );
                        })}
                   </div>
               </div>

               <div className="absolute bottom-0 left-0 right-0 border-t border-[#F0F1F4] bg-white p-6 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
                   <div className="mb-4 flex items-center justify-between text-[12px] font-black text-[#8E95A2]">
                     <span>{auditCategory.length} {locale === 'en' ? 'Selected' : locale === 'zh' ? 'Selected' : 'หมวดที่เลือก'}</span>
                     <button 
                       onClick={() => {
                         if (auditCategory.length === categories.length) setAuditCategory([]);
                         else setAuditCategory(categories.map(c => c.id));
                       }}
                       className="text-[#111111]"
                     >
                       {auditCategory.length === categories.length ? (locale === 'en' ? 'Deselect All' : locale === 'zh' ? 'Deselect All' : 'ยกเลิกทั้งหมด') : (locale === 'en' ? 'Select All' : locale === 'zh' ? 'Select All' : 'เลือกทั้งหมด')}
                     </button>
                   </div>
                   <button 
                        disabled={auditCategory.length === 0}
                        onClick={() => { setIsAuditMode(true); setIsAuditTypeModalOpen(false); setViewMode('grid'); }}
                        className={`flex h-16 w-full items-center justify-center gap-3 rounded-full text-[14px] font-black uppercase transition-all ${auditCategory.length > 0 ? 'bg-[#111111] text-white active:scale-95' : 'cursor-not-allowed bg-gray-100 text-gray-300'}`}
                      >
                        <ClipboardCheck size={20} />
                        <span>{auditCategory.length === categories.length ? (locale === 'en' ? 'Start Full Audit' : locale === 'zh' ? 'Start Full Audit' : 'เริ่มนับสต็อกทั้งหมด') : (locale === 'en' ? `Start Counting (${auditCategory.length})` : locale === 'zh' ? `Start Counting (${auditCategory.length})` : `เริ่มนับสต็อก (${auditCategory.length} หมวด)`)}</span>
                   </button>
               </div>
            </motion.div>
          </div>
        )}

        {/* SUPPLIER MANAGER MODAL */}
        {isSupplierManagerOpen && (
          <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center sm:p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-[#1A1A18]/80 backdrop-blur-sm" onClick={() => setIsSupplierManagerOpen(false)} />
            
            <motion.div 
              initial={{ y: "100%" }} 
              animate={{ y: 0 }} 
              exit={{ y: "100%" }} 
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="relative w-full h-[90vh] sm:h-auto sm:max-h-[90vh] sm:max-w-3xl bg-gray-50 sm:rounded-3xl shadow-2xl flex flex-col font-bold overflow-hidden rounded-t-[2rem]"
            >
               <header className="px-6 py-5 bg-white border-b border-gray-100 flex items-center justify-between sticky top-0 z-10">
                  <div className="flex flex-col">
                      <h2 className="text-xl sm:text-2xl font-black uppercase tracking-tighter text-[#1A1A18] leading-none flex items-center gap-2">
                        <Settings size={24} className="text-indigo-500" /> 
                        {locale === 'en' ? 'Manage Suppliers' : locale === 'zh' ? 'Manage Suppliers' : 'จัดการแหล่งจัดซื้อ'}
                      </h2>
                      <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mt-1 leading-none">{locale === 'en' ? 'Add locations and assign items' : locale === 'zh' ? 'Add locations and assign items' : 'เพิ่มรายชื่อสถานที่และเลือกวัตถุดิบเข้าประจำร้าน'}</p>
                  </div>
                  <button onClick={() => setIsSupplierManagerOpen(false)} className="w-10 h-10 bg-gray-100 hover:bg-gray-200 active:bg-gray-300 rounded-full flex items-center justify-center text-gray-500 transition-colors">
                      <X size={20} />
                  </button>
               </header>

               <div className="flex-1 overflow-y-auto no-scrollbar p-6 bg-gray-50 pb-32 space-y-6">
                  {/* Create New Supplier */}
                  <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm flex flex-col sm:flex-row gap-4 items-end">
                      <div className="flex-1 w-full space-y-2">
                          <label className="text-[10px] font-black uppercase tracking-widest text-indigo-600">เพิ่มสถานที่ใหม่</label>
                          <input 
                              type="text"
                              placeholder="เช่น แม็คโคร แจ้งวัฒนะ, ตลาดไท"
                              className="w-full bg-indigo-50/50 border border-indigo-100 py-3 px-4 text-[14px] font-bold outline-none focus:ring-1 focus:ring-indigo-500 text-indigo-900"
                              value={editingSupplier?.name || ''}
                              onChange={e => setEditingSupplier({name: e.target.value})}
                          />
                      </div>
                      <button 
                          onClick={async () => {
                              if (!editingSupplier?.name?.trim()) return;
                              const { data, error } = await supabase.from('pos_suppliers').insert({
                                  name: editingSupplier.name,
                                  branch_id: shopSettings?.branch_id || null
                              }).select().single();
                              if (error) {
                                  alert(`ไม่สามารถสร้างสถานที่ได้: ${error.message}`);
                                  console.error(error);
                              }
                              if (data) {
                                  setSuppliers(prev => [...prev, data].sort((a,b) => a.name.localeCompare(b.name)));
                                  setEditingSupplier(null);
                              }
                          }}
                          disabled={!editingSupplier?.name?.trim()}
                          className="h-[50px] px-8 bg-[#1A1A18] text-white flex items-center justify-center gap-2 hover:bg-black transition-all disabled:opacity-50 w-full sm:w-auto"
                      >
                          <Plus size={18} /> สร้าง
                      </button>
                  </div>

                  {/* Supplier List */}
                  <div className="space-y-4">
                      {suppliers.map(sup => {
                          const itemsInSup = inventory.filter(i => i.supplier_id === sup.id);
                          return (
                              <div key={sup.id} className="bg-white border border-gray-200 rounded-2xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                                  <div className="flex items-center gap-4">
                                      <div className="w-12 h-12 bg-indigo-50 text-indigo-500 rounded-xl flex items-center justify-center shrink-0">
                                          <Landmark size={24} />
                                      </div>
                                      <div>
                                          <h3 className="text-[16px] font-black uppercase tracking-widest text-[#1A1A18]">{sup.name}</h3>
                                          <div className="text-[11px] font-black text-gray-400 mt-1">
                                              {itemsInSup.length} วัตถุดิบในร้านนี้
                                          </div>
                                      </div>
                                  </div>
                                  <div className="flex items-center gap-2 w-full sm:w-auto">
                                      <button 
                                          onClick={() => {
                                              setSelectedSupplierForAssign(sup);
                                              setSelectedItemIdsForAssign(itemsInSup.map(i => i.id));
                                              setIsAssignItemsOpen(true);
                                          }}
                                          className="flex-1 sm:flex-none px-6 py-3 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 transition-colors text-[12px] font-black uppercase tracking-widest flex items-center justify-center gap-2"
                                      >
                                          <ListChecks size={16} /> เลือกวัตถุดิบเข้าประจำร้าน
                                      </button>
                                      <button 
                                          onClick={async () => {
                                              if (confirm('ยืนยันการลบสถานที่นี้? (วัตถุดิบในร้านนี้จะไม่ถูกลบ แต่จะกลายเป็น "ไม่ระบุแหล่งซื้อ")')) {
                                                  await supabase.from('pos_suppliers').delete().eq('id', sup.id);
                                                  setSuppliers(prev => prev.filter(s => s.id !== sup.id));
                                                  fetchInventory();
                                              }
                                          }}
                                          className="w-12 h-12 flex items-center justify-center text-red-400 bg-red-50 hover:bg-red-100 transition-colors shrink-0"
                                      >
                                          <Trash2 size={18} />
                                      </button>
                                  </div>
                              </div>
                          );
                      })}
                      {suppliers.length === 0 && (
                          <div className="text-center py-10 text-gray-400 font-bold uppercase tracking-widest text-[12px]">
                              ยังไม่มีสถานที่ซื้อ
                          </div>
                      )}
                  </div>
               </div>
            </motion.div>
          </div>
        )}

        {/* ASSIGN ITEMS MODAL */}
        {isAssignItemsOpen && selectedSupplierForAssign && (
          <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center sm:p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-[#1A1A18]/80 backdrop-blur-md" onClick={() => setIsAssignItemsOpen(false)} />
            
            <motion.div 
              initial={{ y: "100%" }} 
              animate={{ y: 0 }} 
              exit={{ y: "100%" }} 
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="relative w-full h-[95vh] sm:h-auto sm:max-h-[90vh] sm:max-w-2xl bg-white sm:rounded-3xl shadow-2xl flex flex-col font-bold overflow-hidden rounded-t-[2rem]"
            >
               <header className="px-6 py-5 bg-indigo-50 border-b border-indigo-100 flex items-center justify-between sticky top-0 z-10">
                  <div className="flex flex-col">
                      <h2 className="text-xl sm:text-2xl font-black uppercase tracking-tighter text-indigo-900 leading-none">
                        {selectedSupplierForAssign.name}
                      </h2>
                      <p className="text-[10px] font-black uppercase tracking-widest text-indigo-500 mt-1 leading-none">เลือกวัตถุดิบที่จะซื้อประจำที่ร้านนี้</p>
                  </div>
                  <button onClick={() => setIsAssignItemsOpen(false)} className="w-10 h-10 bg-white hover:bg-indigo-100 rounded-full flex items-center justify-center text-indigo-500 transition-colors">
                      <X size={20} />
                  </button>
               </header>

               <div className="flex-1 overflow-y-auto no-scrollbar p-6 pb-32">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {inventory.map(item => {
                          const isSelected = selectedItemIdsForAssign.includes(item.id);
                          // It's assigned somewhere else
                          const otherSupplier = item.supplier_id && item.supplier_id !== selectedSupplierForAssign.id 
                                ? suppliers.find(s => s.id === item.supplier_id)?.name 
                                : null;

                          return (
                              <button 
                                  key={item.id}
                                  onClick={() => {
                                      if (isSelected) {
                                          setSelectedItemIdsForAssign(prev => prev.filter(id => id !== item.id));
                                      } else {
                                          setSelectedItemIdsForAssign(prev => [...prev, item.id]);
                                      }
                                  }}
                                  className={`p-4 border-2 rounded-xl flex items-center gap-4 text-left transition-all ${isSelected ? 'border-indigo-500 bg-indigo-50' : 'border-gray-100 hover:border-gray-200'}`}
                              >
                                  <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 ${isSelected ? 'border-indigo-500 bg-indigo-500 text-white' : 'border-gray-300'}`}>
                                      {isSelected && <CheckCircle2 size={14} />}
                                  </div>
                                  <div>
                                      <div className={`text-[13px] font-black uppercase leading-tight ${isSelected ? 'text-indigo-900' : 'text-[#1A1A18]'}`}>{item.name}</div>
                                      {otherSupplier && !isSelected && (
                                          <div className="text-[9px] font-black text-amber-500 mt-1 uppercase">ตอนนี้อยู่ที่: {otherSupplier}</div>
                                      )}
                                  </div>
                              </button>
                          );
                      })}
                  </div>
               </div>

               <footer className="p-6 border-t border-gray-100 bg-white">
                  <button 
                      onClick={async () => {
                          setIsSaving(true);
                          // Find items that need updating
                          // 1. Added items: in selectedItemIdsForAssign but currently supplier_id != this supplier
                          // 2. Removed items: not in selectedItemIdsForAssign but currently supplier_id == this supplier
                          const addedIds = selectedItemIdsForAssign.filter(id => {
                              const item = inventory.find(i => i.id === id);
                              return item && item.supplier_id !== selectedSupplierForAssign.id;
                          });
                          const removedIds = inventory.filter(i => i.supplier_id === selectedSupplierForAssign.id && !selectedItemIdsForAssign.includes(i.id)).map(i => i.id);

                          if (addedIds.length > 0) {
                              await supabase.from('inventory_items').update({ supplier_id: selectedSupplierForAssign.id }).in('id', addedIds);
                          }
                          if (removedIds.length > 0) {
                              await supabase.from('inventory_items').update({ supplier_id: null }).in('id', removedIds);
                          }
                          
                          await fetchInventory();
                          setIsSaving(false);
                          setIsAssignItemsOpen(false);
                      }}
                      disabled={isSaving}
                      className="w-full h-14 bg-indigo-600 text-white flex items-center justify-center gap-2 hover:bg-indigo-700 transition-all font-black uppercase tracking-widest disabled:opacity-50"
                  >
                      {isSaving ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />} บันทึกการเลือกวัตถุดิบ
                  </button>
               </footer>
            </motion.div>
          </div>
        )}

        {/* SHOPPING LIST MODAL */}
        {isShoppingListOpen && (
          <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center sm:p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-[#1A1A18]/80 backdrop-blur-sm" onClick={() => setIsShoppingListOpen(false)} />
            
            <motion.div 
              initial={{ y: "100%" }} 
              animate={{ y: 0 }} 
              exit={{ y: "100%" }} 
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="relative w-full h-[90vh] sm:h-auto sm:max-h-[90vh] sm:max-w-4xl bg-gray-50 sm:rounded-3xl shadow-2xl flex flex-col font-bold overflow-hidden rounded-t-[2rem]"
            >
               <header className="px-6 py-5 bg-white border-b border-gray-100 flex items-center justify-between sticky top-0 z-10">
                  <div className="flex flex-col">
                      <h2 className="text-xl sm:text-2xl font-black uppercase tracking-tighter text-[#1A1A18] leading-none flex items-center gap-2">
                        <ShoppingCart size={24} className="text-amber-500" /> 
                        {locale === 'en' ? 'Shopping List' : locale === 'zh' ? 'Shopping List' : 'สรุปรายการจัดซื้อ (สต็อกต่ำ)'}
                      </h2>
                      <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mt-1 leading-none">{locale === 'en' ? 'Items grouped by supplier' : locale === 'zh' ? 'Items grouped by supplier' : 'รายการวัตถุดิบที่ต้องสั่งซื้อ แยกตามร้านค้า'}</p>
                  </div>
                  <button onClick={() => setIsShoppingListOpen(false)} className="w-10 h-10 bg-gray-100 hover:bg-gray-200 active:bg-gray-300 rounded-full flex items-center justify-center text-gray-500 transition-colors">
                      <X size={20} />
                  </button>
               </header>

               <div className="flex-1 overflow-y-auto no-scrollbar p-6 bg-gray-50 pb-32 space-y-8">
                  {(() => {
                      // Filter low stock items
                      const lowStockItems = inventory.filter(item => Number(item.stock_quantity) <= Number(item.min_stock_level));
                      if (lowStockItems.length === 0) {
                          return (
                              <div className="flex flex-col items-center justify-center py-20 opacity-50">
                                  <CheckCircle2 size={64} className="text-sage-500 mb-4" />
                                  <div className="text-xl font-black uppercase">สต็อกเต็มทุกรายการ</div>
                                  <div className="text-[11px] font-black uppercase tracking-widest text-gray-400 mt-2">ไม่จำเป็นต้องสั่งซื้อสินค้าเพิ่มในขณะนี้</div>
                              </div>
                          );
                      }

                      // Group by supplier
                      const grouped: Record<string, typeof inventory> = {};
                      lowStockItems.forEach(item => {
                          const supplierObj = suppliers.find(s => s.id === item.supplier_id);
                          const supName = supplierObj ? supplierObj.name : 'ไม่ระบุแหล่งซื้อ (Uncategorized)';
                          if (!grouped[supName]) grouped[supName] = [];
                          grouped[supName].push(item);
                      });

                      return Object.entries(grouped).sort(([a], [b]) => a.localeCompare(b)).map(([supplier, items]) => (
                          <div key={supplier} className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
                              <div className="px-6 py-4 bg-amber-50 border-b border-amber-100 flex items-center gap-3">
                                  <div className="w-10 h-10 bg-amber-100 text-amber-600 rounded-xl flex items-center justify-center">
                                      <Landmark size={20} />
                                  </div>
                                  <div>
                                      <h3 className="text-[14px] font-black uppercase tracking-widest text-amber-900">{supplier}</h3>
                                      <div className="text-[10px] font-black text-amber-600/70">{items.length} รายการ</div>
                                  </div>
                              </div>
                              <div className="divide-y divide-gray-50">
                                  {items.map(item => (
                                      <div key={item.id} className="p-4 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-gray-50 transition-colors">
                                          <div className="flex items-start gap-4">
                                              <div className="w-12 h-12 bg-red-50 text-red-500 rounded-full flex items-center justify-center shrink-0">
                                                  <AlertTriangle size={20} />
                                              </div>
                                              <div>
                                                  <div className="text-[14px] font-black uppercase text-[#1A1A18] leading-none mb-1">{item.name}</div>
                                                  <div className="text-[10px] font-black uppercase tracking-widest text-gray-400">SKU: {item.sku || '-'}</div>
                                              </div>
                                          </div>
                                          <div className="flex items-center gap-4 sm:gap-8 bg-gray-50 sm:bg-transparent p-3 sm:p-0 rounded-xl">
                                              <div className="text-center">
                                                  <div className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">สต็อกที่มี</div>
                                                  <div className="text-[16px] font-black text-red-500">{item.stock_quantity} <span className="text-[10px]">{item.unit}</span></div>
                                              </div>
                                              <div className="w-px h-8 bg-gray-200"></div>
                                              <div className="text-center">
                                                  <div className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">จุดเตือน</div>
                                                  <div className="text-[16px] font-black text-amber-500">{item.min_stock_level} <span className="text-[10px]">{item.unit}</span></div>
                                              </div>
                                              <div className="w-px h-8 bg-gray-200"></div>
                                              <div className="text-center bg-amber-50 p-2 px-4 rounded-xl border border-amber-100">
                                                  <div className="text-[10px] font-black uppercase tracking-widest text-amber-700 mb-1">ควรสั่งอย่างน้อย</div>
                                                  <div className="text-[16px] font-black text-amber-600">
                                                      {Math.max(0, item.min_stock_level - item.stock_quantity)} <span className="text-[10px]">{item.unit}</span>
                                                  </div>
                                              </div>
                                          </div>
                                      </div>
                                  ))}
                              </div>
                          </div>
                      ));
                  })()}
               </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  )
}

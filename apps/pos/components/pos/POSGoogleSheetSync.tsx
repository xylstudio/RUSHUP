'use client';
import React, { useState } from 'react'
import { 
  Database, 
  ExternalLink, 
  RefreshCcw, 
  CheckCircle2, 
  AlertTriangle, 
  Loader2, 
  FileSpreadsheet,
  Info,
  ChevronRight,
  Save,
  Download,
  Share,
  FileText,
  Utensils
} from 'lucide-react'
import { supabase } from '@/lib/supabaseClient'
import { motion } from 'framer-motion'
import { useI18n } from "@/lib/I18nContext";

interface POSGoogleSheetSyncProps {
    categories?: any[]
    onSyncComplete?: () => void
}

export default function POSGoogleSheetSync({ categories = [], onSyncComplete }: POSGoogleSheetSyncProps) {
    const { locale } = useI18n();
    const [inventoryFile, setInventoryFile] = useState<File | null>(null)
    const [recipeFile, setRecipeFile] = useState<File | null>(null)
    const [linksFile, setLinksFile] = useState<File | null>(null)
    const [status, setStatus] = useState<'idle' | 'loading' | 'syncing' | 'success' | 'error'>('idle')
    const [message, setMessage] = useState('')
    const [logs, setLogs] = useState<string[]>([])
    const [isWipeMode, setIsWipeMode] = useState(false)

        const addLog = (msg: string) => setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`])
    
        React.useEffect(() => {
            const fetchCategories = async () => {
                const { data } = await supabase.from('inventory_categories').select('*').order('order_index')
                if (data) setCategories(data)
            }
            fetchCategories()
        }, [])

        // ฟังก์ชันช่วยแปลงลิงก์ Google Sheets ให้เป็น CSV Export
        const transformToCsvUrl = (url: string) => {
            if (!url) return ''
            if (url.includes('/edit') && !url.includes('output=csv')) {
                // เปลี่ยน /edit... เป็น /export?format=csv
                return url.split('/edit')[0] + '/export?format=csv'
            }
            return url
        }

    const parseCSV = (text: string) => {
        // 1. ล้างรหัส BOM ที่อาจติดมากับไฟล์ UTF-8
        const cleanText = text.replace(/^\uFEFF/, '').trim()
        
        // 2. แบ่งบรรทัดโดยรองรับทั้ง Windows (\r\n) และ Unix (\n)
        const lines = cleanText.split(/\r?\n/).filter(l => l.trim())
        if (lines.length < 1) return []
        
        const clean = (val: string) => val ? val.replace(/^["']|["']$/g, '').trim() : ''
        
        // 3. แบ่งคอลัมน์โดยรองรับเครื่องหมายคำพูดครอบค่าที่มี Comma
        const splitLine = (line: string) => {
            const result = []
            let cur = ''
            let inQuotes = false
            for (let i = 0; i < line.length; i++) {
                const char = line[i]
                if (char === '"') inQuotes = !inQuotes
                else if (char === ',' && !inQuotes) {
                    result.push(clean(cur))
                    cur = ''
                } else cur += char
            }
            result.push(clean(cur))
            return result
        }

        const headers = splitLine(lines[0]).map(h => h.toLowerCase().trim())
        addLog(`📊 ตรวจพบหัวตาราง: [${headers.join(' | ')}]`)

        return lines.slice(1).map(line => {
            const values = splitLine(line)
            const obj: any = {}
            headers.forEach((h, i) => {
                if (h) obj[h] = values[i] || ''
            })
            return obj
        })
    }

    const downloadCSV = (filename: string, content: string) => {
        const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' })
        const link = document.createElement("a")
        const url = URL.createObjectURL(blob)
        link.setAttribute("href", url)
        link.setAttribute("download", filename)
        link.style.visibility = 'hidden'
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
    }

    const handleExportInventory = async () => {
        setStatus('loading')
        addLog('กำลังเตรียมข้อมูลคลังพัสดุสำหรับการส่งออก...')
        try {
            const { data: inv } = await supabase.from('inventory_items')
                .select('*')
                .eq('is_active', true)
                .order('name')
            if (inv) {
                const headers = ['Name', 'Category', 'SKU', 'Unit', 'Purchase Unit', 'Factor', 'Initial Stock', 'Min Stock', 'Cost', '', '--- AVAILABLE CATEGORIES (FOR DROPDOWN) ---'];
                const maxRows = Math.max(inv.length, categories.length);
                const rows = [];
                
                for (let i = 0; i < maxRows; i++) {
                    const item = inv[i];
                    const cat = categories[i];
                    
                    if (item) {
                        rows.push([
                            item.name,
                            categories.find(c => c.id === item.category_id)?.name || '-',
                            item.sku || '-',
                            item.unit || '',
                            item.purchase_unit || '',
                            item.conversion_factor || 1,
                            item.stock_quantity || 0,
                            item.min_stock_level || 0,
                            (item.cost_price * (item.conversion_factor || 1)).toFixed(2),
                            '',
                            cat ? cat.name : ''
                        ]);
                    } else if (cat) {
                        rows.push(['', '', '', '', '', '', '', '', '', '', cat.name]);
                    }
                }
                const csvContent = "\uFEFF" + [headers, ...rows].map(e => e.map(cell => `"${cell}"`).join(",")).join("\n");
                downloadCSV('inventory_master.csv', csvContent)
                addLog('✓ ส่งออกข้อมูล Inventory สำเร็จ')
                setStatus('success')
                setMessage('ส่งออกข้อมูลคลังพัสดุสำเร็จ!')
            }
        } catch (err: any) {
            setStatus('error')
            setMessage('การส่งออกผิดพลาด')
        }
    }

    const handleExportRecipes = async () => {
        setStatus('loading')
        addLog('กำลังเตรียมข้อมูลสูตร (เมนู + ตัวเลือก) สำหรับการส่งออก...')
        try {
            const { data: menu } = await supabase.from('pos_menu_items')
                .select('*, category:pos_menu_categories(name)')
                .eq('is_active', true)
                .order('name')
            const { data: mods } = await supabase.from('pos_menu_modifiers')
                .select('*, group:pos_menu_modifier_groups(name)')
                .eq('is_active', true)
                .order('name')
            const { data: inventory } = await supabase.from('inventory_items')
                .select('*')
                .eq('is_active', true)
            
            if (menu && mods && inventory) {
                const headers = ['Type', 'Name', 'Parent/Group', 'Price/Adj', 'Ingredient Name', 'Quantity', 'Unit'];
                const rows: any[] = []
                
                // Add Items
                menu.forEach(m => {
                    const recipes = m.recipe_data || []
                    if (recipes.length === 0) {
                        rows.push(['Item', m.name, m.category?.name || '-', m.sale_price, '', 0, ''])
                    } else {
                        recipes.forEach((r: any) => {
                            const invItem = inventory.find(i => i.id === r.ingredient_id);
                            rows.push(['Item', m.name, m.category?.name || '-', m.sale_price, r.name || invItem?.name || '-', r.quantity || 0, r.recipe_unit || '-'])
                        })
                    }
                })

                // Add Modifiers
                mods.forEach(m => {
                    const recipes = m.recipe_data || []
                    if (recipes.length === 0) {
                        rows.push(['Modifier', m.name, m.group?.name || '-', m.extra_price, '', 0, ''])
                    } else {
                        recipes.forEach((r: any) => {
                            const invItem = inventory.find(i => i.id === r.ingredient_id);
                            rows.push(['Modifier', m.name, m.group?.name || '-', m.extra_price, r.name || invItem?.name || '-', r.quantity || 0, r.recipe_unit || '-'])
                        })
                    }
                })

                const csvContent = "\uFEFF" + [headers, ...rows].map(e => e.map(cell => `"${cell}"`).join(",")).join("\n");
                downloadCSV('recipes_and_modifiers_master.csv', csvContent)
                addLog('✓ ส่งออกข้อมูลสูตรทั้งหมดสำเร็จ')
                setStatus('success')
                setMessage('ส่งออกข้อมูลสูตรเมนูและตัวเลือกสำเร็จ!')
            }
        } catch (err: any) {
            setStatus('error')
            setMessage('การส่งออกผิดพลาด')
        }
    }

    const handleExportLinks = async () => {
        setStatus('loading')
        addLog('กำลังเตรียมข้อมูลการเชื่อมโยงตัวเลือก (Links) สำหรับการส่งออก...')
        try {
            const { data: links } = await supabase.from('pos_item_modifier_links')
                .select('*, item:pos_menu_items!inner(name, is_active), group:pos_menu_modifier_groups(name)')
                .eq('pos_menu_items.is_active', true)
            
            if (links) {
                const headers = ['Menu Item Name', 'Modifier Group Name'];
                const rows = links.map(l => [l.item?.name || '-', l.group?.name || '-']);
                const csvContent = "\uFEFF" + [headers, ...rows].map(e => e.map(cell => `"${cell}"`).join(",")).join("\n");
                downloadCSV('item_modifier_links.csv', csvContent)
                addLog('✓ ส่งออกข้อมูล Links สำเร็จ')
                setStatus('success')
                setMessage('ส่งออกข้อมูลการเชื่อมโยงสำเร็จ!')
            }
        } catch (err: any) {
            setStatus('error')
            setMessage('การส่งออกผิดพลาด')
        }
    }

    const handleSync = async () => {
        if (!inventoryFile && !recipeFile && !linksFile) {
            setMessage('กรุณาเลือกไฟล์ที่ต้องการประสานข้อมูลอย่างน้อย 1 ไฟล์')
            return
        }

        setStatus('syncing')
        setLogs([])
        addLog('🚀 เริ่มกระบวนการประสานข้อมูลจากไฟล์...')

        const readFileContent = (file: File): Promise<string> => {
            return new Promise((resolve, reject) => {
                const reader = new FileReader()
                reader.onload = (e) => resolve(e.target?.result as string)
                reader.onerror = (e) => reject(new Error('ไม่สามารถอ่านไฟล์ได้'))
                reader.readAsText(file)
            })
        }

        try {
            // 1. WIPE IF REQUESTED
            if (isWipeMode && inventoryFile) {
                addLog('⚠️ กำลังล้างข้อมูลคลังสินค้าและประวัติเดิมทั้งหมดตามคำขอ...')
                
                // Delete movements first (due to FK)
                const { error: moveError } = await supabase.from('inventory_movements').delete().neq('id', '00000000-0000-0000-0000-000000000000')
                if (moveError) addLog(`ℹ️ ข้ามการล้างประวัติ: ${moveError.message}`)
                
                // Delete audit logs if any
                const { error: auditError } = await supabase.from('inventory_audit_details').delete().neq('id', '00000000-0000-0000-0000-000000000000')
                if (auditError) addLog(`ℹ️ ข้ามการล้างบันทึกการตรวจนับ: ${auditError.message}`)

                // Finally delete items
                const { error: wipeError } = await supabase.from('inventory_items').delete().neq('id', '00000000-0000-0000-0000-000000000000')
                if (wipeError) {
                    addLog(`❌ ไม่สามารถล้างข้อมูลสินค้าได้: ${wipeError.message}`)
                    throw new Error('Wipe failed')
                }
                addLog('✓ ล้างข้อมูลเดิมทั้งหมดเรียบร้อยแล้ว')
            }

            // 2. SYNC INVENTORY
            if (inventoryFile) {
                addLog(`📡 กำลังดึงข้อมูลคลังสินค้าจากไฟล์: ${inventoryFile.name}`)
                const text = await readFileContent(inventoryFile)
                const rows = parseCSV(text)
                
                if (rows.length === 0) {
                    addLog('⚠️ ไม่พบข้อมูลในไฟล์คลังสินค้า')
                } else {
                    addLog(`📦 พบข้อมูล ${rows.length} รายการ`)
                    
                    const seenItems = new Set<string>()
                    let successCount = 0
                    let failCount = 0

                    for (const row of rows) {
                        // Map CSV headers to database fields (Support English & Thai)
                        const name = (row['name'] || row['ชื่อ'] || row['ชื่อวัตถุดิบ'] || '').trim()
                        const sku = (row['sku'] || row['รหัส'] || '').trim()
                        const unit = (row['unit'] || row['หน่วย'] || 'g').trim()
                        const pUnit = (row['purchase unit'] || row['หน่วยซื้อ'] || row['หน่วยใหญ่'] || '').trim()
                        const factor = parseFloat(row['factor'] || row['ตัวคูณ'] || 1) || 1
                        const stock = parseFloat(row['initial stock'] || row['จำนวนที่มี'] || row['สต็อก'] || 0) || 0
                        const min = parseFloat(row['min stock'] || row['จุดเตือน'] || row['สต็อกต่ำสุด'] || 0) || 0
                        
                        // Handle Cost: Look for 'bulk', 'total', or just 'cost'
                        const rawCost = parseFloat(row['bulk cost'] || row['total cost'] || row['cost'] || row['ต้นทุน'] || 0) || 0
                        const unitCost = rawCost / factor

                        if (!name) continue

                        const catName = (row['category'] || row['หมวดหมู่'] || row['category name'] || '').trim()
                        let category = null
                        if (catName) {
                            category = categories.find(c => 
                                c.name.toLowerCase() === catName.toLowerCase() ||
                                c.name.toLowerCase().includes(catName.toLowerCase()) ||
                                catName.toLowerCase().includes(c.name.toLowerCase())
                            )
                        }

                        const payload: any = {
                            name,
                            unit,
                            purchase_unit: pUnit,
                            conversion_factor: factor,
                            stock_quantity: stock,
                            min_stock_level: min,
                            cost_price: unitCost,
                            category_id: category?.id || null,
                            is_active: true
                        }
                        if (sku && sku !== '-') payload.sku = sku

                        // Find Existing Item manually to avoid ON CONFLICT errors if constraints are missing
                        let existingItem = null;
                        if (sku && sku !== '-') {
                            const { data } = await supabase.from('inventory_items').select('id').eq('sku', sku).maybeSingle();
                            if (data) existingItem = data;
                        }
                        if (!existingItem) {
                            const { data } = await supabase.from('inventory_items').select('id').eq('name', name).maybeSingle();
                            if (data) existingItem = data;
                        }

                        let error = null;
                        if (existingItem) {
                            const { error: updateError } = await supabase.from('inventory_items').update(payload).eq('id', existingItem.id);
                            error = updateError;
                        } else {
                            const { error: insertError } = await supabase.from('inventory_items').insert(payload);
                            error = insertError;
                        }

                        if (error) {
                            addLog(`❌ ข้อผิดพลาด (${name}): ${error.message}`)
                            failCount++
                        } else {
                            seenItems.add(name.toLowerCase())
                            if (sku && sku !== '-') seenItems.add(sku.toUpperCase())
                            
                            const catMsg = category ? ` [หมวดหมู่: ${category.name}]` : ' [ไม่มีหมวดหมู่]'
                            const calcMsg = (factor > 1 
                                ? ` [฿${rawCost} / ${factor} = ฿${unitCost.toFixed(2)}]` 
                                : ` [฿${unitCost.toFixed(2)}]`) + catMsg
                            addLog(`✅ อัปเดต: ${name}${calcMsg}`)
                            successCount++
                        }
                    }
                    addLog(`📊 คลังสินค้า: สำเร็จ ${successCount}, ผิดพลาด ${failCount}`)
                }
            }

            // 2. SYNC RECIPES
            if (recipeFile) {
                addLog(`📡 กำลังอ่านไฟล์สูตรอาหาร: ${recipeFile.name}`)
                const text = await readFileContent(recipeFile)
                const rows = parseCSV(text)
                
                const menus: any = {}
                const mods: any = {}

                rows.forEach(row => {
                    const type = (row['type'] || row['ประเภท'] || '').toLowerCase().trim()
                    const name = (row['name'] || row['ชื่อรายการ'] || '').trim()
                    const parent = (row['parent/group'] || row['หมวดหมู่'] || '').trim()
                    const price = parseFloat(row['price/adj'] || row['ราคา'] || 0)
                    const ingName = (row['ingredient name'] || row['วัตถุดิบ'] || '').trim()
                    const qty = parseFloat(row['quantity'] || row['ปริมาณ'] || 0)

                    if (type === 'item') {
                        if (!menus[name]) menus[name] = { parent, price, ingredients: [] }
                        if (ingName) menus[name].ingredients.push({ ingName, qty })
                    } else if (type === 'modifier') {
                        if (!mods[name]) mods[name] = { parent, price, ingredients: [] }
                        if (ingName) mods[name].ingredients.push({ ingName, qty })
                    }
                })

                // Map to DB
                const { data: dbIngs } = await supabase.from('inventory_items').select('id, name, conversion_factor')
                const ingMap = Object.fromEntries(dbIngs?.map(i => [i.name.trim().toLowerCase(), i]) || [])

                // Process Menus
                for (const [mName, info] of Object.entries(menus)) {
                    const mInfo = info as any
                    const recipeData = mInfo.ingredients.map((ri: any) => {
                        const dbIng = ingMap[ri.ingName.toLowerCase()]
                        return dbIng ? { ingredient_id: dbIng.id, quantity: ri.qty, factor: dbIng.conversion_factor } : null
                    }).filter(Boolean)

                    const { data: cat } = await supabase.from('pos_menu_categories').upsert({ name: mInfo.parent }).select().single()
                    await supabase.from('pos_menu_items').upsert({
                        name: mName,
                        category_id: cat?.id,
                        sale_price: mInfo.price,
                        recipe_data: recipeData,
                        is_active: true
                    })
                    addLog(`🍱 อัปเดตสูตรเมนู: ${mName}`)
                }

                // Process Modifiers
                for (const [mName, info] of Object.entries(mods)) {
                    const mInfo = info as any
                    const recipeData = mInfo.ingredients.map((ri: any) => {
                        const dbIng = ingMap[ri.ingName.toLowerCase()]
                        return dbIng ? { ingredient_id: dbIng.id, quantity: ri.qty, factor: dbIng.conversion_factor } : null
                    }).filter(Boolean)

                    const { data: group } = await supabase.from('pos_menu_modifier_groups').upsert({ name: mInfo.parent }).select().single()
                    await supabase.from('pos_menu_modifiers').upsert({
                        name: mName,
                        group_id: group?.id,
                        extra_price: mInfo.price,
                        recipe_data: recipeData,
                        is_active: true
                    })
                    addLog(`✨ อัปเดตสูตรตัวเลือก: ${mName}`)
                }
            }

            // 3. SYNC LINKS
            if (linksFile) {
                addLog(`📡 กำลังอ่านไฟล์ความสัมพันธ์: ${linksFile.name}...`)
                const text = await readFileContent(linksFile)
                const data = parseCSV(text)
                for (const row of data) {
                    const itemName = (row['menu item name'] || row['ชื่อเมนู'] || '').trim()
                    const groupName = (row['modifier group name'] || row['ชื่อกลุ่มตัวเลือก'] || '').trim()
                    if (!itemName || !groupName) continue

                    const { data: item } = await supabase.from('pos_menu_items').select('id').eq('name', itemName).maybeSingle()
                    const { data: group } = await supabase.from('pos_menu_modifier_groups').select('id').eq('name', groupName).maybeSingle()

                    if (item && group) {
                        const { data: existing } = await supabase.from('pos_item_modifier_links').select('id').eq('item_id', item.id).eq('group_id', group.id).maybeSingle()
                        if (!existing) {
                            await supabase.from('pos_item_modifier_links').insert({ item_id: item.id, group_id: group.id })
                        }
                    }
                }
                addLog('✓ อัปเดตข้อมูลการเชื่อมโยงตัวเลือกสำเร็จ')
            }

            addLog('🎉 ประสานข้อมูลเสร็จสมบูรณ์!')

            setStatus('success')
            setMessage('ประสานข้อมูลกับ Google Sheets เรียบร้อยแล้ว!')
            if (onSyncComplete) onSyncComplete()
            addLog('เสร็จสิ้นกระบวนการทั้งหมด')
        } catch (err: any) {
            console.error(err)
            setStatus('error')
            setMessage(err.message || 'เกิดข้อผิดพลาดในการดึงข้อมูล')
            addLog(`❌ ข้อผิดพลาด: ${err.message}`)
        }
    }

    return (
        <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500 font-bold max-w-6xl mx-auto pb-20">
            
            {/* HERO SECTION */}
            <header className="text-center space-y-4">
                <div className="w-20 h-20 bg-[#1A1A18] text-white flex items-center justify-center mx-auto shadow-2xl">
                    <Database size={40} />
                </div>
                <h2 className="text-4xl font-black uppercase tracking-tighter text-[#1A1A18]">
                    Google Sheets Master Sync
                </h2>
                <p className="text-[12px] font-black uppercase tracking-[0.5em] text-gray-400">
                    {locale === 'en' ? '                     ควบคุมสต็อกและสูตรอาหารทั้งหมดผ่าน Spreadsheet เดียว                 ' : locale === 'zh' ? '                     ควบคุมสต็อกและสูตรอาหารทั้งหมดผ่าน Spreadsheet เดียว                 ' : '                     ควบคุมสต็อกและสูตรอาหารทั้งหมดผ่าน Spreadsheet เดียว                 '}</p>
            </header>

            {/* STEP-BY-STEP WIZARD */}
            <div className="grid grid-cols-1 gap-8">
                
                {/* STEP 1: PREPARATION */}
                <section className="bg-white border border-[#F0F0E8] p-10 shadow-sm space-y-8">
                    <div className="flex items-center gap-6 mb-10">
                        <div className="w-12 h-12 bg-gray-100 flex items-center justify-center text-xl font-black">1</div>
                        <div>
                            <h3 className="text-lg font-black uppercase tracking-tight">{locale === 'en' ? 'เตรียมข้อมูลแม่แบบ (PREPARATION)' : locale === 'zh' ? 'เตรียมข้อมูลแม่แบบ (PREPARATION)' : 'เตรียมข้อมูลแม่แบบ (PREPARATION)'}</h3>
                            <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest">{locale === 'en' ? 'ส่งออกข้อมูลปัจจุบันเพื่อใช้เป็นเทมเพลตใน Google Sheets' : locale === 'zh' ? 'ส่งออกข้อมูลปัจจุบันเพื่อใช้เป็นเทมเพลตใน Google Sheets' : 'ส่งออกข้อมูลปัจจุบันเพื่อใช้เป็นเทมเพลตใน Google Sheets'}</p>
                        </div>
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <button onClick={handleExportInventory} className="group p-8 border border-gray-100 hover:border-black transition-all text-left">
                            <Download className="text-gray-200 group-hover:text-black mb-4" size={24} />
                            <div className="text-[11px] font-black uppercase tracking-widest">{locale === 'en' ? '1. ไฟล์คลังสินค้า' : locale === 'zh' ? '1. ไฟล์คลังสินค้า' : '1. ไฟล์คลังสินค้า'}</div>
                            <div className="text-[9px] text-gray-400 mt-2">{locale === 'en' ? 'รายชื่อวัตถุดิบและสต็อกที่มีอยู่' : locale === 'zh' ? 'รายชื่อวัตถุดิบและสต็อกที่มีอยู่' : 'รายชื่อวัตถุดิบและสต็อกที่มีอยู่'}</div>
                        </button>
                        <button onClick={handleExportRecipes} className="group p-8 border border-gray-100 hover:border-black transition-all text-left">
                            <FileText className="text-gray-200 group-hover:text-black mb-4" size={24} />
                            <div className="text-[11px] font-black uppercase tracking-widest">{locale === 'en' ? '2. ไฟล์สูตรเมนู + ตัวเลือก' : locale === 'zh' ? '2. ไฟล์สูตรเมนู + ตัวเลือก' : '2. ไฟล์สูตรเมนู + ตัวเลือก'}</div>
                            <div className="text-[9px] text-gray-400 mt-2">{locale === 'en' ? 'สูตรอาหารและวัตถุดิบที่ใช้แต่ละเมนู' : locale === 'zh' ? 'สูตรอาหารและวัตถุดิบที่ใช้แต่ละเมนู' : 'สูตรอาหารและวัตถุดิบที่ใช้แต่ละเมนู'}</div>
                        </button>
                        <button onClick={handleExportLinks} className="group p-8 border border-gray-100 hover:border-black transition-all text-left">
                            <Share className="text-gray-200 group-hover:text-black mb-4" size={24} />
                            <div className="text-[11px] font-black uppercase tracking-widest">{locale === 'en' ? '3. ไฟล์ความสัมพันธ์' : locale === 'zh' ? '3. ไฟล์ความสัมพันธ์' : '3. ไฟล์ความสัมพันธ์'}</div>
                            <div className="text-[9px] text-gray-400 mt-2">{locale === 'en' ? 'เมนูไหน คู่กับ ตัวเลือกกลุ่มไหน' : locale === 'zh' ? 'เมนูไหน คู่กับ ตัวเลือกกลุ่มไหน' : 'เมนูไหน คู่กับ ตัวเลือกกลุ่มไหน'}</div>
                        </button>
                    </div>
                </section>

                {/* STEP 2: UPLOAD (File Selection) */}
                <section className="bg-white border border-[#F0F0E8] p-10 shadow-sm space-y-10">
                    <div className="flex items-center gap-6 mb-10">
                        <div className="w-12 h-12 bg-gray-100 flex items-center justify-center text-xl font-black">2</div>
                        <div>
                            <h3 className="text-lg font-black uppercase tracking-tight">{locale === 'en' ? 'เลือกไฟล์ข้อมูล (UPLOAD CSV)' : locale === 'zh' ? 'เลือกไฟล์ข้อมูล (UPLOAD CSV)' : 'เลือกไฟล์ข้อมูล (UPLOAD CSV)'}</h3>
                            <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest">{locale === 'en' ? 'เลือกไฟล์ .csv ที่ดาวน์โหลดมาจาก Google Sheets' : locale === 'zh' ? 'เลือกไฟล์ .csv ที่ดาวน์โหลดมาจาก Google Sheets' : 'เลือกไฟล์ .csv ที่ดาวน์โหลดมาจาก Google Sheets'}</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        {/* Inventory File Input */}
                        <div className="space-y-3">
                            <label className="text-[10px] font-black uppercase text-sage-600 flex items-center gap-2 italic">
                                <Database size={12} /> {locale === 'en' ? ' 1. ไฟล์คลังสินค้า (Inventory)                             ' : locale === 'zh' ? ' 1. ไฟล์คลังสินค้า (Inventory)                             ' : ' 1. ไฟล์คลังสินค้า (Inventory)                             '}</label>
                            <input
                                type="file"
                                accept=".csv"
                                onChange={(e) => setInventoryFile(e.target.files?.[0] || null)}
                                className="w-full bg-gray-50 border-none py-4 px-6 text-[12px] font-bold outline-none focus:ring-1 focus:ring-black file:mr-4 file:py-1 file:px-4 file:rounded-none file:border-0 file:text-[10px] file:font-black file:bg-black file:text-white"
                            />
                            {inventoryFile && <p className="text-[9px] text-emerald-600 font-bold">{locale === 'en' ? '✓ เลือกไฟล์: ' : locale === 'zh' ? '✓ เลือกไฟล์: ' : '✓ เลือกไฟล์: '}{inventoryFile.name}</p>}
                        </div>

                        {/* Recipe File Input */}
                        <div className="space-y-3">
                            <label className="text-[10px] font-black uppercase text-indigo-600 flex items-center gap-2 italic">
                                <Utensils size={12} /> {locale === 'en' ? ' 2. ไฟล์สูตรและเมนู (Recipes)                             ' : locale === 'zh' ? ' 2. ไฟล์สูตรและเมนู (Recipes)                             ' : ' 2. ไฟล์สูตรและเมนู (Recipes)                             '}</label>
                            <input
                                type="file"
                                accept=".csv"
                                onChange={(e) => setRecipeFile(e.target.files?.[0] || null)}
                                className="w-full bg-gray-50 border-none py-4 px-6 text-[12px] font-bold outline-none focus:ring-1 focus:ring-black file:mr-4 file:py-1 file:px-4 file:rounded-none file:border-0 file:text-[10px] file:font-black file:bg-black file:text-white"
                            />
                            {recipeFile && <p className="text-[9px] text-emerald-600 font-bold">{locale === 'en' ? '✓ เลือกไฟล์: ' : locale === 'zh' ? '✓ เลือกไฟล์: ' : '✓ เลือกไฟล์: '}{recipeFile.name}</p>}
                        </div>

                        {/* Links File Input */}
                        <div className="space-y-3">
                            <label className="text-[10px] font-black uppercase text-amber-600 flex items-center gap-2 italic">
                                <Share size={12} /> {locale === 'en' ? ' 3. ไฟล์ความสัมพันธ์ (Links)                             ' : locale === 'zh' ? ' 3. ไฟล์ความสัมพันธ์ (Links)                             ' : ' 3. ไฟล์ความสัมพันธ์ (Links)                             '}</label>
                            <input
                                type="file"
                                accept=".csv"
                                onChange={(e) => setLinksFile(e.target.files?.[0] || null)}
                                className="w-full bg-gray-50 border-none py-4 px-6 text-[12px] font-bold outline-none focus:ring-1 focus:ring-black file:mr-4 file:py-1 file:px-4 file:rounded-none file:border-0 file:text-[10px] file:font-black file:bg-black file:text-white"
                            />
                            {linksFile && <p className="text-[9px] text-emerald-600 font-bold">{locale === 'en' ? '✓ เลือกไฟล์: ' : locale === 'zh' ? '✓ เลือกไฟล์: ' : '✓ เลือกไฟล์: '}{linksFile.name}</p>}
                        </div>
                    </div>
                </section>

                {/* STEP 3: SYNC */}
                <section className="bg-white border border-[#F0F0E8] p-10 shadow-sm">
                    <div className="flex flex-col md:flex-row gap-10 items-start">
                        <div className="w-full md:w-1/2 space-y-6">
                            <div className="flex items-center gap-6 mb-6">
                                <div className="w-12 h-12 bg-gray-100 flex items-center justify-center text-xl font-black">3</div>
                                <div>
                                    <h3 className="text-lg font-black uppercase tracking-tight">{locale === 'en' ? 'ประสานข้อมูล (SYNC)' : locale === 'zh' ? 'ประสานข้อมูล (SYNC)' : 'ประสานข้อมูล (SYNC)'}</h3>
                                    <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest">{locale === 'en' ? 'อัปเดตข้อมูลเข้าระบบ POS ทันที' : locale === 'zh' ? 'อัปเดตข้อมูลเข้าระบบ POS ทันที' : 'อัปเดตข้อมูลเข้าระบบ POS ทันที'}</p>
                                </div>
                            </div>

                            {/* WIPE MODE TOGGLE */}
                            <div className={`p-6 border ${isWipeMode ? 'border-red-500 bg-red-50' : 'border-gray-200 bg-gray-50'} transition-all mb-4`}>
                                <label className="flex items-center gap-4 cursor-pointer">
                                    <input 
                                        type="checkbox" 
                                        checked={isWipeMode}
                                        onChange={(e) => setIsWipeMode(e.target.checked)}
                                        className="w-5 h-5 accent-red-600"
                                    />
                                    <div>
                                        <div className={`text-[12px] font-black uppercase ${isWipeMode ? 'text-red-600' : 'text-gray-600'}`}>
                                            {locale === 'en' ? '                                             ล้างข้อมูลเดิมทั้งหมด (WIPE & REPLACE)                                         ' : locale === 'zh' ? '                                             ล้างข้อมูลเดิมทั้งหมด (WIPE & REPLACE)                                         ' : '                                             ล้างข้อมูลเดิมทั้งหมด (WIPE & REPLACE)                                         '}</div>
                                        <div className="text-[9px] text-gray-400 font-bold">
                                            {locale === 'en' ? '                                             *ข้อมูลสินค้าเดิมในระบบจะถูกลบทิ้งทั้งหมดก่อนนำเข้าจากไฟล์ใหม่                                         ' : locale === 'zh' ? '                                             *ข้อมูลสินค้าเดิมในระบบจะถูกลบทิ้งทั้งหมดก่อนนำเข้าจากไฟล์ใหม่                                         ' : '                                             *ข้อมูลสินค้าเดิมในระบบจะถูกลบทิ้งทั้งหมดก่อนนำเข้าจากไฟล์ใหม่                                         '}</div>
                                    </div>
                                </label>
                            </div>

                            <button 
                                onClick={handleSync}
                                disabled={status === 'loading' || status === 'syncing'}
                                className={`w-full h-24 flex items-center justify-center gap-6 text-[14px] font-black uppercase tracking-[0.4em] transition-all shadow-2xl ${
                                    (status === 'loading' || status === 'syncing') ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-black text-white hover:bg-sage-950 hover:scale-[1.02]'
                                }`}
                            >
                                {(status === 'loading' || status === 'syncing') ? (
                                    <><Loader2 className="animate-spin" /> {locale === 'en' ? ' กำลังประมวลผล...' : locale === 'zh' ? ' กำลังประมวลผล...' : ' กำลังประมวลผล...'}</>
                                ) : (
                                    <><RefreshCcw size={20} /> {locale === 'en' ? ' ประสานข้อมูลทันที' : locale === 'zh' ? ' ประสานข้อมูลทันที' : ' ประสานข้อมูลทันที'}</>
                                )}
                            </button>

                            {status !== 'idle' && (
                                <div className={`p-6 flex items-start gap-4 animate-in zoom-in-95 duration-200 border-l-4 ${
                                    status === 'success' ? 'bg-emerald-50 text-emerald-700 border-emerald-500' : status === 'error' ? 'bg-red-50 text-red-700 border-red-500' : 'bg-gray-50 text-gray-400 border-gray-300'
                                }`}>
                                    {status === 'success' ? <CheckCircle2 className="shrink-0" /> : <AlertTriangle className="shrink-0" />}
                                    <div>
                                        <div className="text-[12px] font-black uppercase tracking-widest mb-1">{status === 'success' ? 'ดำเนินการสำเร็จ' : 'เกิดข้อผิดพลาด'}</div>
                                        <div className="text-[11px] font-bold opacity-80">{message}</div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* TERMINAL MINI */}
                        <div className="w-full md:w-1/2 bg-[#1A1A18] text-emerald-400 p-8 font-mono text-[10px] flex flex-col shadow-2xl min-h-[300px]">
                            <div className="flex items-center justify-between mb-4 opacity-40">
                                <span className="uppercase tracking-[0.3em] font-black">Sync Terminal v1.0</span>
                                <div className="flex gap-1">
                                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500/20"></div>
                                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
                                </div>
                            </div>
                            <div className="flex-1 overflow-y-auto space-y-2 no-scrollbar">
                                {logs.map((log, i) => (
                                    <div key={i} className="flex gap-4">
                                        <span className="opacity-20">{i + 1}</span>
                                        <span className={log.includes('❌') || log.includes('⚠️') ? 'text-amber-400' : ''}>{log}</span>
                                    </div>
                                ))}
                                {logs.length === 0 && <div className="opacity-20 italic">{locale === 'en' ? 'รอกำลังดำเนินการ...' : locale === 'zh' ? 'รอกำลังดำเนินการ...' : 'รอกำลังดำเนินการ...'}</div>}
                                {status === 'loading' && <div className="animate-pulse">_ Processing...</div>}
                            </div>
                        </div>
                    </div>
                </section>
            </div>

            {/* QUICK GUIDE */}
            <div className="bg-[#F9F9F7] p-10 rounded-none border border-gray-100">
                <h4 className="text-[11px] font-black uppercase tracking-[0.3em] text-[#1A1A18] mb-6 flex items-center gap-3">
                    <Info size={16} /> {locale === 'en' ? ' คู่มือการตั้งค่าแบบรวดเร็ว                 ' : locale === 'zh' ? ' คู่มือการตั้งค่าแบบรวดเร็ว                 ' : ' คู่มือการตั้งค่าแบบรวดเร็ว                 '}</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
                    <div className="space-y-2">
                        <div className="text-[10px] font-black text-gray-300">STEP A</div>
                        <div className="text-[11px] leading-relaxed opacity-70">{locale === 'en' ? 'ดาวน์โหลดแม่แบบจาก Step 1 ไปใส่ใน Google Sheets' : locale === 'zh' ? 'ดาวน์โหลดแม่แบบจาก Step 1 ไปใส่ใน Google Sheets' : 'ดาวน์โหลดแม่แบบจาก Step 1 ไปใส่ใน Google Sheets'}</div>
                    </div>
                    <div className="space-y-2">
                        <div className="text-[10px] font-black text-gray-300">STEP B</div>
                        <div className="text-[11px] leading-relaxed opacity-70">{locale === 'en' ? 'ในเมนู File &gt; Share เลือก Publish to web' : locale === 'zh' ? 'ในเมนู File &gt; Share เลือก Publish to web' : 'ในเมนู File &gt; Share เลือก Publish to web'}</div>
                    </div>
                    <div className="space-y-2">
                        <div className="text-[10px] font-black text-gray-300">STEP C</div>
                        <div className="text-[11px] leading-relaxed opacity-70">{locale === 'en' ? 'เลือกแท็บข้อมูล และเปลี่ยนรูปแบบเป็น ' : locale === 'zh' ? 'เลือกแท็บข้อมูล และเปลี่ยนรูปแบบเป็น ' : 'เลือกแท็บข้อมูล และเปลี่ยนรูปแบบเป็น '}<span className="font-black">CSV</span></div>
                    </div>
                    <div className="space-y-2">
                        <div className="text-[10px] font-black text-gray-300">STEP D</div>
                        <div className="text-[11px] leading-relaxed opacity-70">{locale === 'en' ? 'ก๊อปปี้ลิงก์ที่ได้มาใส่ในช่อง Step 2 และกดปุ่ม Step 3' : locale === 'zh' ? 'ก๊อปปี้ลิงก์ที่ได้มาใส่ในช่อง Step 2 และกดปุ่ม Step 3' : 'ก๊อปปี้ลิงก์ที่ได้มาใส่ในช่อง Step 2 และกดปุ่ม Step 3'}</div>
                    </div>
                </div>
            </div>
        </div>
    )
}

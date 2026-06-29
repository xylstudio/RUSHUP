'use client';
import React, { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { ImagePlus, Loader2, Plus, Save, Search, Trash2 } from 'lucide-react'
import { useAuth } from '@/lib/AuthContext'
import {
  buildDocumentCategoryLabel,
  type CatalogSizeMode,
  DOCUMENT_MAIN_CATEGORY_OPTIONS,
  getDocumentCategoryDefaults,
  getDocumentSubcategoryOptions,
  type DocumentCatalogMainCategory,
  type DocumentCatalogSubcategory,
} from '@/lib/documentItemCatalog'
import {
  type DocumentItemCatalogEntry,
  deleteDocumentItemCatalogEntry,
  getDocumentItemCatalog,
  saveDocumentItemCatalogEntry,
  supabase,
} from '@/lib/supabaseClient'
import { useI18n } from "@/lib/I18nContext";

type SizeVariantEditorState = {
  id?: string
  size_label: string
  custom_size_label: string
  use_custom_size_label: boolean
  shrub_size_style: 'height_spacing' | 'pot_inch'
  height_m: number
  spacing_m: number
  pot_diameter_inch: number
  trunk_diameter_inch: number
  tree_height_label: string
  unit: string
  material_price: number
  labor_price: number
}

type EditorState = {
  item_name: string
  english_name: string
  scientific_name: string
  main_category: DocumentCatalogMainCategory
  subcategory: DocumentCatalogSubcategory
  image_url: string
  variants: SizeVariantEditorState[]
}

type ItemGroup = {
  key: string
  item_name: string
  english_name: string
  scientific_name: string
  main_category: DocumentCatalogMainCategory
  subcategory: DocumentCatalogSubcategory
  image_url: string
  entries: DocumentItemCatalogEntry[]
  updated_at: string
}

const parseShrubSizeFromLabel = (label?: string): {
  shrub_size_style: 'height_spacing' | 'pot_inch'
  height_m: number
  spacing_m: number
  pot_diameter_inch: number
} => {
  const raw = String(label || '').trim()
  if (!raw) {
    return {
      shrub_size_style: 'height_spacing',
      height_m: 0,
      spacing_m: 0,
      pot_diameter_inch: 0,
    }
  }

  const normalized = raw.replace(/,/g, '.')
  const potMatch = normalized.match(/(?:กระถาง\s*)?([0-9]+(?:\.[0-9]+)?)\s*(?:นิ้ว|inch|inches|\")/i)
  const heightMatch = normalized.match(/H\.?\s*([0-9]+(?:\.[0-9]+)?)/i)
  const spacingMatch = normalized.match(/@\s*([0-9]+(?:\.[0-9]+)?)/i)

  if (potMatch) {
    return {
      shrub_size_style: 'pot_inch',
      height_m: 0,
      spacing_m: 0,
      pot_diameter_inch: Number(potMatch[1]) || 0,
    }
  }

  return {
    shrub_size_style: 'height_spacing',
    height_m: heightMatch ? Number(heightMatch[1]) || 0 : 0,
    spacing_m: spacingMatch ? Number(spacingMatch[1]) || 0 : 0,
    pot_diameter_inch: 0,
  }
}

const parseTreeSizeFromLabel = (label?: string): { trunk_diameter_inch: number; tree_height_label: string } => {
  const raw = String(label || '').trim()
  if (!raw) return { trunk_diameter_inch: 0, tree_height_label: '' }

  const normalized = raw.replace(/,/g, '.')
  const diameterMatch = normalized.match(/Ø\s*([0-9]+(?:\.[0-9]+)?)\s*"?/i)
  const heightMatch = normalized.match(/H\s*([0-9]+(?:\.[0-9]+)?(?:\s*-\s*[0-9]+(?:\.[0-9]+)?)?)/i)

  return {
    trunk_diameter_inch: diameterMatch ? Number(diameterMatch[1]) || 0 : 0,
    tree_height_label: heightMatch ? String(heightMatch[1]).replace(/\s+/g, '') : '',
  }
}

const formatNumericLabel = (value: number) => {
  if (!Number.isFinite(value) || value <= 0) return ''
  return Number(value.toFixed(2)).toString()
}

const buildVariantSizeLabel = (variant: SizeVariantEditorState, sizeMode: CatalogSizeMode) => {
  if (sizeMode === 'shrub') {
    const shrubSizeStyle = variant.shrub_size_style === 'pot_inch' ? 'pot_inch' : 'height_spacing'
    const potDiameter = Number(variant.pot_diameter_inch) || 0
    const height = Number(variant.height_m) || 0
    const spacing = Number(variant.spacing_m) || 0

    if (shrubSizeStyle === 'pot_inch') {
      if (potDiameter > 0) return `กระถาง ${formatNumericLabel(potDiameter)} นิ้ว`
      return ''
    }

    if (height > 0 && spacing > 0) return `H.${formatNumericLabel(height)} m. @ ${formatNumericLabel(spacing)} m.`
    if (height > 0) return `H.${formatNumericLabel(height)} m.`
    if (spacing > 0) return `@ ${formatNumericLabel(spacing)} m.`

    return ''
  }

  if (sizeMode === 'tree') {
    const diameter = Number(variant.trunk_diameter_inch) || 0
    const heightLabel = String(variant.tree_height_label || '').trim()

    if (diameter > 0 && heightLabel) return `Ø ${formatNumericLabel(diameter)}" H ${heightLabel} m.`
    if (diameter > 0) return `Ø ${formatNumericLabel(diameter)}"`
    if (heightLabel) return `H ${heightLabel} m.`

    return ''
  }

  return String(variant.size_label || '').trim()
}

const normalizeManualSizeOverride = (variant: SizeVariantEditorState) => {
  const customSizeLabel = String(variant.custom_size_label || '').trim()
  return {
    custom_size_label: customSizeLabel,
    use_custom_size_label: Boolean(variant.use_custom_size_label && customSizeLabel),
  }
}

const syncVariantWithSizeMode = (
  variant: SizeVariantEditorState,
  sizeMode: CatalogSizeMode,
  fallbackUnit: string = ''
): SizeVariantEditorState => {
  const next: SizeVariantEditorState = {
    ...variant,
    size_label: String(variant.size_label || '').trim(),
    custom_size_label: String(variant.custom_size_label || '').trim(),
    use_custom_size_label: Boolean(variant.use_custom_size_label),
    unit: String(variant.unit || '').trim() || fallbackUnit,
    material_price: Number(variant.material_price) || 0,
    labor_price: Number(variant.labor_price) || 0,
    shrub_size_style: variant.shrub_size_style === 'pot_inch' ? 'pot_inch' : 'height_spacing',
    height_m: Number(variant.height_m) || 0,
    spacing_m: Number(variant.spacing_m) || 0,
    pot_diameter_inch: Number(variant.pot_diameter_inch) || 0,
    trunk_diameter_inch: Number(variant.trunk_diameter_inch) || 0,
    tree_height_label: String(variant.tree_height_label || '').trim(),
  }

  const manualOverride = normalizeManualSizeOverride(next)
  next.custom_size_label = manualOverride.custom_size_label
  next.use_custom_size_label = manualOverride.use_custom_size_label

  if (sizeMode === 'shrub') {
    const parsed = parseShrubSizeFromLabel(next.size_label)
    next.shrub_size_style = next.shrub_size_style || parsed.shrub_size_style
    next.height_m = next.height_m || parsed.height_m
    next.spacing_m = next.spacing_m || parsed.spacing_m
    next.pot_diameter_inch = next.pot_diameter_inch || parsed.pot_diameter_inch
    next.trunk_diameter_inch = 0
    next.tree_height_label = ''

    if (next.shrub_size_style === 'pot_inch') {
      next.height_m = 0
      next.spacing_m = 0
    } else {
      next.pot_diameter_inch = 0
    }

    const generatedLabel = buildVariantSizeLabel(next, sizeMode)
    next.size_label = next.use_custom_size_label ? next.custom_size_label : generatedLabel
    if (!next.use_custom_size_label && next.size_label !== generatedLabel) {
      next.size_label = generatedLabel
    }
    return next
  }

  if (sizeMode === 'tree') {
    const parsed = parseTreeSizeFromLabel(next.size_label)
    next.trunk_diameter_inch = next.trunk_diameter_inch || parsed.trunk_diameter_inch
    next.tree_height_label = next.tree_height_label || parsed.tree_height_label
    next.height_m = 0
    next.spacing_m = 0
    const generatedLabel = buildVariantSizeLabel(next, sizeMode)
    next.size_label = next.use_custom_size_label ? next.custom_size_label : generatedLabel
    if (!next.use_custom_size_label && next.size_label !== generatedLabel) {
      next.size_label = generatedLabel
    }
    return next
  }

  next.height_m = 0
  next.spacing_m = 0
  next.pot_diameter_inch = 0
  next.shrub_size_style = 'height_spacing'
  next.trunk_diameter_inch = 0
  next.tree_height_label = ''
  next.custom_size_label = ''
  next.use_custom_size_label = false
  next.size_label = String(variant.size_label || '').trim()
  return next
}

const createEmptyVariant = (unit: string = '', sizeMode: CatalogSizeMode = 'other'): SizeVariantEditorState => ({
  size_label: '',
  custom_size_label: '',
  use_custom_size_label: false,
  shrub_size_style: 'height_spacing',
  height_m: 0,
  spacing_m: 0,
  pot_diameter_inch: 0,
  trunk_diameter_inch: 0,
  tree_height_label: '',
  unit,
  material_price: 0,
  labor_price: 0,
})

const createEmptyEditorState = (): EditorState => {
  const defaults = getDocumentCategoryDefaults('softscape', 'tree')
  return {
    item_name: '',
    english_name: '',
    scientific_name: '',
    main_category: defaults.mainCategory,
    subcategory: defaults.subcategory,
    image_url: '',
    variants: [createEmptyVariant(defaults.defaultUnit, defaults.sizeMode)],
  }
}

const buildItemGroupKey = (
  entry: Pick<DocumentItemCatalogEntry, 'item_name' | 'english_name' | 'scientific_name' | 'main_category' | 'subcategory'>
) => {
  const defaults = getDocumentCategoryDefaults(
    entry.main_category,
    entry.subcategory,
    entry.item_name,
    undefined,
    undefined
  )

  return [
    String(entry.item_name || '').trim().toLowerCase(),
    String(entry.english_name || '').trim().toLowerCase(),
    String(entry.scientific_name || '').trim().toLowerCase(),
    defaults.mainCategory,
    defaults.subcategory,
  ].join('|')
}

const mapGroupToEditor = (group: ItemGroup): EditorState => {
  const defaults = getDocumentCategoryDefaults(
    group.main_category,
    group.subcategory,
    group.item_name,
    group.entries[0]?.item_category,
    group.entries[0]?.size_mode
  )
  const sortedEntries = [...group.entries].sort((a, b) => {
    const sizeCompare = String(a.size_label || '').localeCompare(String(b.size_label || ''), 'th')
    if (sizeCompare !== 0) return sizeCompare
    return String(a.unit || '').localeCompare(String(b.unit || ''), 'th')
  })

  return {
    item_name: group.item_name || '',
    english_name: group.english_name || '',
    scientific_name: group.scientific_name || '',
    main_category: defaults.mainCategory,
    subcategory: defaults.subcategory,
    image_url: group.image_url || '',
    variants: sortedEntries.length > 0
      ? sortedEntries.map((entry) => {
          const syncedVariant = syncVariantWithSizeMode({
            id: entry.id,
            size_label: entry.size_label || '',
            custom_size_label: '',
            use_custom_size_label: false,
            shrub_size_style: 'height_spacing',
            height_m: 0,
            spacing_m: 0,
            pot_diameter_inch: 0,
            trunk_diameter_inch: 0,
            tree_height_label: '',
            unit: entry.unit || defaults.defaultUnit,
            material_price: Number(entry.material_price) || 0,
            labor_price: Number(entry.labor_price) || 0,
          }, defaults.sizeMode, defaults.defaultUnit)
          const generatedLabel = buildVariantSizeLabel(syncedVariant, defaults.sizeMode)
          const actualSizeLabel = String(entry.size_label || '').trim()
          if (defaults.sizeMode !== 'other' && actualSizeLabel && generatedLabel && actualSizeLabel !== generatedLabel) {
            return {
              ...syncedVariant,
              size_label: actualSizeLabel,
              custom_size_label: actualSizeLabel,
              use_custom_size_label: true,
            }
          }

          return syncedVariant
        })
      : [createEmptyVariant(defaults.defaultUnit, defaults.sizeMode)],
  }
}

const getReadableErrorMessage = (error: unknown, fallback: string) => {
  const message = String(
    (error as { message?: string; details?: string; hint?: string; error_description?: string } | null)?.message
    || (error as { details?: string } | null)?.details
    || (error as { hint?: string } | null)?.hint
    || (error as { error_description?: string } | null)?.error_description
    || ''
  ).trim()

  if (!message) return fallback
  if (message.includes('duplicate key') || message.includes('23505')) {
    return 'ขนาดหรือหน่วยซ้ำกับข้อมูลเดิม กรุณาตรวจสอบ size label และหน่วยของแต่ละขนาด'
  }

  return message
}

export default function AdminItemLibraryPage() {
    const { locale } = useI18n();
  const { profile } = useAuth()
  const [items, setItems] = useState<DocumentItemCatalogEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<string>('')
  const [query, setQuery] = useState('')
  const [filterMainCategory, setFilterMainCategory] = useState<'all' | DocumentCatalogMainCategory>('all')
  const [filterSubcategory, setFilterSubcategory] = useState<'all' | DocumentCatalogSubcategory>('all')
  const [editor, setEditor] = useState<EditorState>(createEmptyEditorState())
  const [editingGroupKey, setEditingGroupKey] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [uploadingImage, setUploadingImage] = useState(false)

  useEffect(() => {
    const run = async () => {
      if (!profile?.id || profile.role !== 'admin') return
      setLoading(true)
      const { data, error } = await getDocumentItemCatalog()
      if (error) {
        setError('โหลดรายการหลักไม่สำเร็จ')
      } else {
        setItems(Array.isArray(data) ? data : [])
      }
      setLoading(false)
    }

    void run()
  }, [profile?.id, profile?.role])

  const groupedItems = useMemo<ItemGroup[]>(() => {
    const groupMap = new Map<string, ItemGroup>()

    for (const entry of items) {
      const defaults = getDocumentCategoryDefaults(
        entry.main_category,
        entry.subcategory,
        entry.item_name,
        entry.item_category,
        entry.size_mode
      )
      const key = buildItemGroupKey({
        item_name: entry.item_name,
        english_name: entry.english_name,
        scientific_name: entry.scientific_name,
        main_category: defaults.mainCategory,
        subcategory: defaults.subcategory,
      })
      const existing = groupMap.get(key)

      if (!existing) {
        groupMap.set(key, {
          key,
          item_name: entry.item_name || '',
          english_name: entry.english_name || '',
          scientific_name: entry.scientific_name || '',
          main_category: defaults.mainCategory,
          subcategory: defaults.subcategory,
          image_url: entry.image_url || '',
          entries: [entry],
          updated_at: String(entry.updated_at || ''),
        })
        continue
      }

      existing.entries.push(entry)
      if (!existing.image_url && entry.image_url) {
        existing.image_url = entry.image_url
      }
      if (String(entry.updated_at || '') > existing.updated_at) {
        existing.updated_at = String(entry.updated_at || '')
      }
    }

    return Array.from(groupMap.values()).sort((a, b) => b.updated_at.localeCompare(a.updated_at))
  }, [items])

  const filteredItems = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()
    return groupedItems.filter((group) => {
      const matchesCategory = filterMainCategory === 'all' || group.main_category === filterMainCategory
      if (!matchesCategory) return false
      const matchesSubcategory = filterSubcategory === 'all' || group.subcategory === filterSubcategory
      if (!matchesSubcategory) return false
      if (!normalizedQuery) return true

      const haystack = [
        group.item_name,
        group.english_name,
        group.scientific_name,
        ...group.entries.map((entry) => entry.size_label),
      ]
        .map((value) => String(value || '').toLowerCase())
        .join(' ')

      return haystack.includes(normalizedQuery)
    })
  }, [filterMainCategory, filterSubcategory, groupedItems, query])

  const editorCategoryDefaults = useMemo(
    () => getDocumentCategoryDefaults(editor.main_category, editor.subcategory, editor.item_name),
    [editor.item_name, editor.main_category, editor.subcategory]
  )

  const handleMainCategoryChange = (mainCategory: DocumentCatalogMainCategory) => {
    const defaults = getDocumentCategoryDefaults(mainCategory)
    setEditor((prev) => ({
      ...prev,
      main_category: defaults.mainCategory,
      subcategory: defaults.subcategory,
      variants: prev.variants.map((variant) => syncVariantWithSizeMode(variant, defaults.sizeMode, defaults.defaultUnit)),
    }))
  }

  const handleSubcategoryChange = (subcategory: DocumentCatalogSubcategory) => {
    const defaults = getDocumentCategoryDefaults(editor.main_category, subcategory)
    setEditor((prev) => ({
      ...prev,
      subcategory: defaults.subcategory,
      variants: prev.variants.map((variant) => syncVariantWithSizeMode(variant, defaults.sizeMode, defaults.defaultUnit)),
    }))
  }

  const handleEdit = (group: ItemGroup) => {
    setEditor(mapGroupToEditor(group))
    setEditingGroupKey(group.key)
    setMessage('')
    setError('')
  }

  const handleReset = () => {
    setEditor(createEmptyEditorState())
    setEditingGroupKey('')
    setMessage('')
    setError('')
  }

  const handleVariantChange = (index: number, patch: Partial<SizeVariantEditorState>) => {
    const defaults = getDocumentCategoryDefaults(editor.main_category, editor.subcategory, editor.item_name)
    setEditor((prev) => ({
      ...prev,
      variants: prev.variants.map((variant, variantIndex) => {
        if (variantIndex !== index) return variant
        const nextVariant = { ...variant, ...patch }
        return syncVariantWithSizeMode(nextVariant, defaults.sizeMode, defaults.defaultUnit)
      }),
    }))
  }

  const handleAddVariant = () => {
    const defaults = getDocumentCategoryDefaults(editor.main_category, editor.subcategory)
    setEditor((prev) => ({
      ...prev,
      variants: [...prev.variants, createEmptyVariant(defaults.defaultUnit, defaults.sizeMode)],
    }))
  }

  const handleRemoveVariant = (index: number) => {
    setEditor((prev) => {
      if (prev.variants.length <= 1) {
        const defaults = getDocumentCategoryDefaults(prev.main_category, prev.subcategory)
        return { ...prev, variants: [createEmptyVariant(defaults.defaultUnit, defaults.sizeMode)] }
      }

      return {
        ...prev,
        variants: prev.variants.filter((_, variantIndex) => variantIndex !== index),
      }
    })
  }

  const handleSave = async () => {
    setSaving(true)
    setMessage('')
    setError('')

    const defaults = getDocumentCategoryDefaults(editor.main_category, editor.subcategory, editor.item_name)
    const normalizedVariants = editor.variants
      .map((variant) => syncVariantWithSizeMode(variant, defaults.sizeMode, defaults.defaultUnit))
      .filter((variant) => variant.size_label || variant.material_price > 0 || variant.labor_price > 0 || variant.unit)

    if (!editor.item_name.trim()) {
      setError('กรุณาระบุชื่อรายการ')
      setSaving(false)
      return
    }

    if (!normalizedVariants.length) {
      setError('กรุณาเพิ่มอย่างน้อย 1 ขนาด')
      setSaving(false)
      return
    }

    const duplicateVariantKeys = new Set<string>()
    const hasDuplicateVariant = normalizedVariants.some((variant) => {
      const key = `${variant.size_label.trim().toLowerCase()}|${variant.unit.trim().toLowerCase()}`
      if (duplicateVariantKeys.has(key)) return true
      duplicateVariantKeys.add(key)
      return false
    })

    if (hasDuplicateVariant) {
      setError('ขนาดซ้ำกันในรายการเดียวกัน กรุณาแก้ขนาดหรือหน่วยไม่ให้ซ้ำ')
      setSaving(false)
      return
    }

    const currentGroup = editingGroupKey
      ? groupedItems.find((group) => group.key === editingGroupKey) || null
      : null
    const removedVariantIds = (currentGroup?.entries || [])
      .map((entry) => entry.id)
      .filter((id) => !normalizedVariants.some((variant) => variant.id === id))

    for (const removedId of removedVariantIds) {
      const { error: deleteError } = await deleteDocumentItemCatalogEntry(removedId)
      if (deleteError) {
        setError(getReadableErrorMessage(deleteError, 'ลบขนาดเดิมที่ถูกถอดออกไม่สำเร็จ'))
        setSaving(false)
        return
      }
    }

    const savedEntries: DocumentItemCatalogEntry[] = []
    for (const variant of normalizedVariants) {
      const { data, error } = await saveDocumentItemCatalogEntry({
        id: variant.id,
        item_name: editor.item_name,
        english_name: editor.english_name,
        scientific_name: editor.scientific_name,
        main_category: editor.main_category,
        subcategory: editor.subcategory,
        size_label: variant.size_label,
        unit: variant.unit,
        material_price: variant.material_price,
        labor_price: variant.labor_price,
        image_url: editor.image_url.trim() || null,
      })

      if (error || !data) {
        setError(getReadableErrorMessage(error, 'บันทึกรายการไม่สำเร็จ'))
        setSaving(false)
        return
      }

      savedEntries.push(data)
    }

    const nextSavedGroupKey = buildItemGroupKey({
      item_name: editor.item_name,
      english_name: editor.english_name,
      scientific_name: editor.scientific_name,
      main_category: editor.main_category,
      subcategory: editor.subcategory,
    })
    const replacedEntryIds = new Set(
      items
        .filter((entry) => buildItemGroupKey(entry) === nextSavedGroupKey)
        .map((entry) => entry.id)
    )
    savedEntries.forEach((entry) => replacedEntryIds.add(entry.id))
    removedVariantIds.forEach((id) => replacedEntryIds.add(id))

    const savedGroup: ItemGroup = {
      key: nextSavedGroupKey,
      item_name: editor.item_name,
      english_name: editor.english_name,
      scientific_name: editor.scientific_name,
      main_category: editor.main_category,
      subcategory: editor.subcategory,
      image_url: editor.image_url,
      entries: savedEntries,
      updated_at: savedEntries.reduce((latest, entry) => String(entry.updated_at || '') > latest ? String(entry.updated_at || '') : latest, ''),
    }

    setItems((prev) => {
      const next = [...savedEntries, ...prev.filter((entry) => !replacedEntryIds.has(entry.id))]
      return next.sort((a, b) => String(b.updated_at || '').localeCompare(String(a.updated_at || '')))
    })
    setEditor(mapGroupToEditor(savedGroup))
    setEditingGroupKey(nextSavedGroupKey)
    setMessage(editingGroupKey ? 'อัปเดตรายการและทุกขนาดแล้ว' : 'สร้างรายการพร้อมหลายขนาดแล้ว')
    setSaving(false)
  }

  const handleUploadImage = async (file?: File | null) => {
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setError('อัปโหลดได้เฉพาะไฟล์รูปภาพ')
      setMessage('')
      return
    }

    setUploadingImage(true)
    setError('')
    setMessage('')

    const safeName = String(file.name || 'item-library-image').replace(/[^a-zA-Z0-9._-]/g, '_')
    const formData = new FormData()
    formData.append('file', file)
    formData.append('fileName', safeName)

    const {
      data: { session },
    } = await supabase.auth.getSession()

    const response = await fetch('/api/marketplace/upload-image', {
      method: 'POST',
      headers: session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : undefined,
      body: formData,
    })

    const responseJson = await response.json().catch(() => null)
    if (!response.ok) {
      setError(responseJson?.error || responseJson?.details || 'อัปโหลดรูปไม่สำเร็จ')
      setUploadingImage(false)
      return
    }

    const publicUrl = String(responseJson?.publicUrl || '').trim()
    if (!publicUrl) {
      setError('ระบบไม่ส่ง URL รูปกลับมา')
      setUploadingImage(false)
      return
    }

    setEditor((prev) => ({ ...prev, image_url: publicUrl }))
    setMessage('อัปโหลดรูปแล้ว')
    setUploadingImage(false)
  }

  const handleDelete = async (group: ItemGroup) => {
    setDeletingId(group.key)
    setMessage('')
    setError('')

    for (const entry of group.entries) {
      const { error } = await deleteDocumentItemCatalogEntry(entry.id)
      if (error) {
        setError('ลบรายการไม่สำเร็จ')
        setDeletingId('')
        return
      }
    }

    const groupIdSet = new Set(group.entries.map((entry) => entry.id))
    setItems((prev) => prev.filter((entry) => !groupIdSet.has(entry.id)))
    if (editingGroupKey === group.key) {
      setEditor(createEmptyEditorState())
      setEditingGroupKey('')
    }
    setDeletingId('')
    setMessage('ลบรายการและทุกขนาดแล้ว')
  }

  if (!profile || profile.role !== 'admin') return null

  return (
    <div className="min-h-screen bg-[#F7F7F2] text-[#111111]">
      <div className="border-b border-[#E5E5E5] bg-white">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#7A7A7A]">Admin Item Library</div>
            <h1 className="mt-2 text-2xl font-black uppercase tracking-[0.08em]">{locale === 'en' ? 'จัดการรายการหลักสำหรับใบเสนอราคา' : locale === 'zh' ? 'จัดการรายการหลักสำหรับใบเสนอราคา' : 'จัดการรายการหลักสำหรับใบเสนอราคา'}</h1>
            <p className="mt-2 max-w-3xl text-sm text-[#555555]">{locale === 'en' ? 'หนึ่งรายการสามารถเพิ่มได้หลายขนาดและหลายราคา โดย quotation จะดึงแต่ละขนาดไปใช้เป็นตัวเลือกแยกกันอัตโนมัติ' : locale === 'zh' ? 'หนึ่งรายการสามารถเพิ่มได้หลายขนาดและหลายราคา โดย quotation จะดึงแต่ละขนาดไปใช้เป็นตัวเลือกแยกกันอัตโนมัติ' : 'หนึ่งรายการสามารถเพิ่มได้หลายขนาดและหลายราคา โดย quotation จะดึงแต่ละขนาดไปใช้เป็นตัวเลือกแยกกันอัตโนมัติ'}</p>
          </div>
          <div className="flex gap-3">
            <Link href="/dashboard/admin/documents/create-manual" className="inline-flex items-center px-4 py-2.5 border border-[#E5E5E5] text-xs font-bold uppercase tracking-[0.12em] hover:bg-[#FAFAFA] transition-all">
              {locale === 'en' ? '               กลับไปใบเสนอราคา             ' : locale === 'zh' ? '               กลับไปใบเสนอราคา             ' : '               กลับไปใบเสนอราคา             '}</Link>
            <button onClick={handleReset} className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#111111] text-white text-xs font-bold uppercase tracking-[0.12em] transition-all">
              <Plus size={14} /> {locale === 'en' ? ' รายการใหม่             ' : locale === 'zh' ? ' รายการใหม่             ' : ' รายการใหม่             '}</button>
          </div>
        </div>
      </div>

      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[420px_minmax(0,1fr)] lg:px-8">
        <section className="border border-[#E5E5E5] bg-white p-5 sm:p-6 space-y-4 h-fit">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#9A9A9A]">Editor</div>
            <div className="mt-2 text-lg font-black">{editingGroupKey ? 'แก้ไขรายการและขนาด' : 'สร้างรายการใหม่'}</div>
            <div className="mt-1 text-xs text-[#666666]">{buildDocumentCategoryLabel(editor.main_category, editor.subcategory)}</div>
          </div>

          <div className="space-y-3">
            <input value={editor.item_name} onChange={(e) => setEditor((prev) => ({ ...prev, item_name: e.target.value }))} className="w-full border border-[#E5E5E5] px-3 py-2.5 text-sm font-semibold outline-none focus:border-[#111111]" placeholder={locale === 'en' ? 'ชื่อรายการ' : locale === 'zh' ? 'ชื่อรายการ' : 'ชื่อรายการ'} />
            <input value={editor.english_name} onChange={(e) => setEditor((prev) => ({ ...prev, english_name: e.target.value }))} className="w-full border border-[#E5E5E5] px-3 py-2.5 text-sm font-semibold outline-none focus:border-[#111111]" placeholder="English name" />
            <input value={editor.scientific_name} onChange={(e) => setEditor((prev) => ({ ...prev, scientific_name: e.target.value }))} className="w-full border border-[#E5E5E5] px-3 py-2.5 text-sm font-semibold outline-none focus:border-[#111111]" placeholder={locale === 'en' ? 'Scientific name' : locale === 'zh' ? '学名' : 'ชื่อวิทยาศาสตร์'} />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <select value={editor.main_category} onChange={(e) => handleMainCategoryChange(e.target.value as DocumentCatalogMainCategory)} className="w-full border border-[#E5E5E5] px-3 py-2.5 text-sm font-semibold outline-none focus:border-[#111111]">
              {DOCUMENT_MAIN_CATEGORY_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
            <select value={editor.subcategory} onChange={(e) => handleSubcategoryChange(e.target.value as DocumentCatalogSubcategory)} className="w-full border border-[#E5E5E5] px-3 py-2.5 text-sm font-semibold outline-none focus:border-[#111111]">
              {getDocumentSubcategoryOptions(editor.main_category).map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </div>

          <div className="border border-[#EAEAEA] bg-[#FAFAF7] px-4 py-3">
            <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#9A9A9A]">Size Mode</div>
            <div className="mt-1 text-sm font-black text-[#111111]">
              {editorCategoryDefaults.sizeMode === 'tree' ? 'ต้นไม้ / ปาล์ม: ใส่ Ø และ H' : editorCategoryDefaults.sizeMode === 'shrub' ? 'ไม้พุ่ม / ไม้คลุมดิน: ใส่ H และระยะปลูก @' : 'หมวดทั่วไป: ใส่ label ขนาดเอง'}
            </div>
            <div className="mt-1 text-xs text-[#666666]">
              {editorCategoryDefaults.sizeMode === 'tree'
                ? 'ระบบจะประกอบเป็น size label อัตโนมัติในรูปแบบ Ø ... H ...'
                : editorCategoryDefaults.sizeMode === 'shrub'
                  ? 'ระบบจะประกอบเป็น size label อัตโนมัติในรูปแบบ H.... @ ...'
                  : 'ใช้ช่องขนาดเดียวสำหรับวัสดุ งานบริการ หรือรายการทั่วไป'}
            </div>
          </div>

          <div className="space-y-3 border border-[#EAEAEA] bg-[#FAFAF7] p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#9A9A9A]">Sizes</div>
                <div className="mt-1 text-sm font-black">{locale === 'en' ? 'ขนาดและราคาของแต่ละ variant' : locale === 'zh' ? 'ขนาดและราคาของแต่ละ variant' : 'ขนาดและราคาของแต่ละ variant'}</div>
              </div>
              <button type="button" onClick={handleAddVariant} className="inline-flex items-center gap-2 border border-[#DADADA] bg-white px-3 py-2 text-[11px] font-bold uppercase tracking-[0.12em] text-[#222222] transition-all hover:border-[#111111]">
                <Plus size={12} /> {locale === 'en' ? ' เพิ่มขนาด               ' : locale === 'zh' ? ' เพิ่มขนาด               ' : ' เพิ่มขนาด               '}</button>
            </div>

            <div className="space-y-3">
              {editor.variants.map((variant, index) => (
                <div key={variant.id || `variant-${index}`} className="grid grid-cols-1 gap-3 border border-[#E5E5E5] bg-white p-3">
                  {editorCategoryDefaults.sizeMode === 'shrub' ? (
                    <div className="grid grid-cols-1 gap-3">
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-[220px_minmax(0,1fr)] sm:items-center">
                        <select
                          value={variant.shrub_size_style}
                          onChange={(e) => {
                            const nextStyle = e.target.value === 'pot_inch' ? 'pot_inch' : 'height_spacing'
                            handleVariantChange(index, nextStyle === 'pot_inch'
                              ? { shrub_size_style: nextStyle, height_m: 0, spacing_m: 0 }
                              : { shrub_size_style: nextStyle, pot_diameter_inch: 0 })
                          }}
                          className="w-full border border-[#E5E5E5] px-3 py-2.5 text-sm font-semibold outline-none focus:border-[#111111]"
                        >
                          <option value="height_spacing">{locale === 'en' ? 'ความสูง + ระยะปลูก' : locale === 'zh' ? 'ความสูง + ระยะปลูก' : 'ความสูง + ระยะปลูก'}</option>
                          <option value="pot_inch">{locale === 'en' ? 'ขนาดกระถาง (นิ้ว)' : locale === 'zh' ? 'ขนาดกระถาง (นิ้ว)' : 'ขนาดกระถาง (นิ้ว)'}</option>
                        </select>
                        <div className="text-xs font-semibold text-[#666666]">
                          {variant.shrub_size_style === 'pot_inch'
                            ? 'ตัวอย่าง: กระถาง 10 นิ้ว'
                            : 'ตัวอย่าง: H.0.80 m. @ 0.35 m.'}
                        </div>
                      </div>
                      <div className="flex flex-wrap items-start gap-3">
                        {variant.shrub_size_style === 'pot_inch' ? (
                          <input
                            type="number"
                            min={0}
                            step="0.1"
                            value={variant.pot_diameter_inch || ''}
                            onChange={(e) => handleVariantChange(index, { pot_diameter_inch: Number(e.target.value) || 0 })}
                            className="min-w-[180px] flex-1 border border-[#E5E5E5] px-3 py-2.5 text-sm font-semibold outline-none focus:border-[#111111]"
                            placeholder={locale === 'en' ? 'ขนาดกระถาง (นิ้ว)' : locale === 'zh' ? 'ขนาดกระถาง (นิ้ว)' : 'ขนาดกระถาง (นิ้ว)'}
                          />
                        ) : (
                          <>
                            <input
                              type="number"
                              min={0}
                              step="0.01"
                              value={variant.height_m || ''}
                              onChange={(e) => handleVariantChange(index, { height_m: Number(e.target.value) || 0 })}
                              className="min-w-[140px] flex-1 border border-[#E5E5E5] px-3 py-2.5 text-sm font-semibold outline-none focus:border-[#111111]"
                              placeholder={locale === 'en' ? 'ความสูง H (ม.)' : locale === 'zh' ? 'ความสูง H (ม.)' : 'ความสูง H (ม.)'}
                            />
                            <input
                              type="number"
                              min={0}
                              step="0.01"
                              value={variant.spacing_m || ''}
                              onChange={(e) => handleVariantChange(index, { spacing_m: Number(e.target.value) || 0 })}
                              className="min-w-[140px] flex-1 border border-[#E5E5E5] px-3 py-2.5 text-sm font-semibold outline-none focus:border-[#111111]"
                              placeholder={locale === 'en' ? 'ระยะปลูก @ (ม.)' : locale === 'zh' ? 'ระยะปลูก @ (ม.)' : 'ระยะปลูก @ (ม.)'}
                            />
                          </>
                        )}
                        <input value={variant.unit} onChange={(e) => handleVariantChange(index, { unit: e.target.value })} className="w-24 flex-none border border-[#E5E5E5] px-3 py-2.5 text-sm font-semibold outline-none focus:border-[#111111]" placeholder={locale === 'en' ? 'unit' : locale === 'zh' ? '单元' : 'หน่วย'} />
                        <input type="number" value={variant.material_price || ''} onChange={(e) => handleVariantChange(index, { material_price: Number(e.target.value) || 0 })} className="min-w-[140px] flex-1 border border-[#E5E5E5] px-3 py-2.5 text-sm font-semibold outline-none focus:border-[#111111]" placeholder={locale === 'en' ? 'ค่าวัสดุ' : locale === 'zh' ? 'ค่าวัสดุ' : 'ค่าวัสดุ'} />
                        <input type="number" value={variant.labor_price || ''} onChange={(e) => handleVariantChange(index, { labor_price: Number(e.target.value) || 0 })} className="min-w-[140px] flex-1 border border-[#E5E5E5] px-3 py-2.5 text-sm font-semibold outline-none focus:border-[#111111]" placeholder={locale === 'en' ? 'wage' : locale === 'zh' ? '工资' : 'ค่าแรง'} />
                        <button type="button" onClick={() => handleRemoveVariant(index)} className="inline-flex h-[42px] w-[42px] flex-none items-center justify-center border border-red-200 text-[11px] font-bold uppercase tracking-[0.12em] text-red-600 transition-all hover:bg-red-50">
                          <Trash2 size={12} />
                        </button>
                      </div>
                      <div className="grid grid-cols-1 gap-3">
                        <label className="inline-flex items-center gap-2 text-xs font-bold text-[#444444]">
                          <input
                            type="checkbox"
                            checked={variant.use_custom_size_label}
                            onChange={(e) => handleVariantChange(index, { use_custom_size_label: e.target.checked })}
                            className="h-4 w-4 border border-[#CFCFCF]"
                          />
                          {locale === 'en' ? '                           กำหนด size label เอง                         ' : locale === 'zh' ? '                           กำหนด size label เอง                         ' : '                           กำหนด size label เอง                         '}</label>
                        <input
                          value={variant.custom_size_label}
                          onChange={(e) => handleVariantChange(index, { custom_size_label: e.target.value, use_custom_size_label: true })}
                          disabled={!variant.use_custom_size_label}
                          className="w-full border border-[#E5E5E5] px-3 py-2.5 text-sm font-semibold outline-none focus:border-[#111111] disabled:cursor-not-allowed disabled:bg-[#F3F3F3] disabled:text-[#999999]"
                          placeholder={variant.shrub_size_style === 'pot_inch' ? 'override label เช่น กระถาง 10 นิ้ว' : 'override label เช่น H.0.80 m. @ 0.35 m.'}
                        />
                      </div>
                    </div>
                  ) : editorCategoryDefaults.sizeMode === 'tree' ? (
                    <div className="grid grid-cols-1 gap-3">
                      <div className="flex flex-wrap items-start gap-3">
                        <input
                          type="number"
                          min={0}
                          step="0.1"
                          value={variant.trunk_diameter_inch || ''}
                          onChange={(e) => handleVariantChange(index, { trunk_diameter_inch: Number(e.target.value) || 0 })}
                          className="min-w-[140px] flex-1 border border-[#E5E5E5] px-3 py-2.5 text-sm font-semibold outline-none focus:border-[#111111]"
                          placeholder={locale === 'en' ? 'เส้นผ่านศูนย์กลาง Ø (นิ้ว)' : locale === 'zh' ? 'เส้นผ่านศูนย์กลาง Ø (นิ้ว)' : 'เส้นผ่านศูนย์กลาง Ø (นิ้ว)'}
                        />
                        <input
                          value={variant.tree_height_label || ''}
                          onChange={(e) => handleVariantChange(index, { tree_height_label: e.target.value })}
                          className="min-w-[140px] flex-1 border border-[#E5E5E5] px-3 py-2.5 text-sm font-semibold outline-none focus:border-[#111111]"
                          placeholder={locale === 'en' ? 'ความสูง H เช่น 2.5-3' : locale === 'zh' ? 'ความสูง H เช่น 2.5-3' : 'ความสูง H เช่น 2.5-3'}
                        />
                        <input value={variant.unit} onChange={(e) => handleVariantChange(index, { unit: e.target.value })} className="w-24 flex-none border border-[#E5E5E5] px-3 py-2.5 text-sm font-semibold outline-none focus:border-[#111111]" placeholder={locale === 'en' ? 'unit' : locale === 'zh' ? '单元' : 'หน่วย'} />
                        <input type="number" value={variant.material_price || ''} onChange={(e) => handleVariantChange(index, { material_price: Number(e.target.value) || 0 })} className="min-w-[140px] flex-1 border border-[#E5E5E5] px-3 py-2.5 text-sm font-semibold outline-none focus:border-[#111111]" placeholder={locale === 'en' ? 'ค่าวัสดุ' : locale === 'zh' ? 'ค่าวัสดุ' : 'ค่าวัสดุ'} />
                        <input type="number" value={variant.labor_price || ''} onChange={(e) => handleVariantChange(index, { labor_price: Number(e.target.value) || 0 })} className="min-w-[140px] flex-1 border border-[#E5E5E5] px-3 py-2.5 text-sm font-semibold outline-none focus:border-[#111111]" placeholder={locale === 'en' ? 'wage' : locale === 'zh' ? '工资' : 'ค่าแรง'} />
                        <button type="button" onClick={() => handleRemoveVariant(index)} className="inline-flex h-[42px] w-[42px] flex-none items-center justify-center border border-red-200 text-[11px] font-bold uppercase tracking-[0.12em] text-red-600 transition-all hover:bg-red-50">
                          <Trash2 size={12} />
                        </button>
                      </div>
                      <div className="grid grid-cols-1 gap-3">
                        <label className="inline-flex items-center gap-2 text-xs font-bold text-[#444444]">
                          <input
                            type="checkbox"
                            checked={variant.use_custom_size_label}
                            onChange={(e) => handleVariantChange(index, { use_custom_size_label: e.target.checked })}
                            className="h-4 w-4 border border-[#CFCFCF]"
                          />
                          {locale === 'en' ? '                           กำหนด size label เอง                         ' : locale === 'zh' ? '                           กำหนด size label เอง                         ' : '                           กำหนด size label เอง                         '}</label>
                        <input
                          value={variant.custom_size_label}
                          onChange={(e) => handleVariantChange(index, { custom_size_label: e.target.value, use_custom_size_label: true })}
                          disabled={!variant.use_custom_size_label}
                          className="w-full border border-[#E5E5E5] px-3 py-2.5 text-sm font-semibold outline-none focus:border-[#111111] disabled:cursor-not-allowed disabled:bg-[#F3F3F3] disabled:text-[#999999]"
                          placeholder={locale === 'en' ? 'override label เช่น O 3 inch H 2.5-3 m.' : locale === 'zh' ? 'override label เช่น O 3 inch H 2.5-3 m.' : 'override label เช่น O 3 inch H 2.5-3 m.'}
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-wrap items-start gap-3">
                      <input value={variant.size_label} onChange={(e) => handleVariantChange(index, { size_label: e.target.value })} className="min-w-[180px] flex-[1_1_220px] border border-[#E5E5E5] px-3 py-2.5 text-sm font-semibold outline-none focus:border-[#111111]" placeholder={locale === 'en' ? 'ขนาด / Size label' : locale === 'zh' ? 'ขนาด / Size label' : 'ขนาด / Size label'} />
                      <input value={variant.unit} onChange={(e) => handleVariantChange(index, { unit: e.target.value })} className="w-24 flex-none border border-[#E5E5E5] px-3 py-2.5 text-sm font-semibold outline-none focus:border-[#111111]" placeholder={locale === 'en' ? 'unit' : locale === 'zh' ? '单元' : 'หน่วย'} />
                      <input type="number" value={variant.material_price || ''} onChange={(e) => handleVariantChange(index, { material_price: Number(e.target.value) || 0 })} className="min-w-[140px] flex-1 border border-[#E5E5E5] px-3 py-2.5 text-sm font-semibold outline-none focus:border-[#111111]" placeholder={locale === 'en' ? 'ค่าวัสดุ' : locale === 'zh' ? 'ค่าวัสดุ' : 'ค่าวัสดุ'} />
                      <input type="number" value={variant.labor_price || ''} onChange={(e) => handleVariantChange(index, { labor_price: Number(e.target.value) || 0 })} className="min-w-[140px] flex-1 border border-[#E5E5E5] px-3 py-2.5 text-sm font-semibold outline-none focus:border-[#111111]" placeholder={locale === 'en' ? 'wage' : locale === 'zh' ? '工资' : 'ค่าแรง'} />
                      <button type="button" onClick={() => handleRemoveVariant(index)} className="inline-flex h-[42px] w-[42px] flex-none items-center justify-center border border-red-200 text-[11px] font-bold uppercase tracking-[0.12em] text-red-600 transition-all hover:bg-red-50">
                        <Trash2 size={12} />
                      </button>
                    </div>
                  )}
                  <div className="border border-dashed border-[#E5E5E5] bg-[#FAFAFA] px-3 py-2 text-xs font-semibold text-[#555555]">
                    Preview size label: <span className="font-black text-[#111111]">{variant.size_label || 'ยังไม่ระบุ'}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <input value={editor.image_url} onChange={(e) => setEditor((prev) => ({ ...prev, image_url: e.target.value }))} className="w-full border border-[#E5E5E5] px-3 py-2.5 text-sm font-semibold outline-none focus:border-[#111111]" placeholder="Image URL" />
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
              <label className="flex cursor-pointer items-center justify-center gap-2 border border-dashed border-[#D6D6D6] bg-[#FAFAF7] px-4 py-4 text-xs font-bold uppercase tracking-[0.12em] text-[#444444] hover:border-[#111111] hover:bg-white transition-all">
                {uploadingImage ? <Loader2 size={14} className="animate-spin" /> : <ImagePlus size={14} />}
                {uploadingImage ? 'กำลังอัปโหลดรูป...' : (editor.image_url ? 'อัปโหลดรูปใหม่' : 'เลือกรูปจากเครื่อง')}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(event) => {
                    const file = event.target.files?.[0]
                    void handleUploadImage(file)
                    event.currentTarget.value = ''
                  }}
                />
              </label>
              <button
                type="button"
                onClick={() => setEditor((prev) => ({ ...prev, image_url: '' }))}
                disabled={!editor.image_url || uploadingImage}
                className="inline-flex items-center justify-center border border-[#E5E5E5] px-4 py-4 text-xs font-bold uppercase tracking-[0.12em] text-[#666666] transition-all hover:bg-[#FAFAFA] disabled:cursor-not-allowed disabled:opacity-40"
              >
                {locale === 'en' ? '                 ลบรูป               ' : locale === 'zh' ? '                 ลบรูป               ' : '                 ลบรูป               '}</button>
            </div>
            {editor.image_url ? (
              <div className="overflow-hidden border border-[#E5E5E5] bg-[#F3F3EE]">
                <img src={editor.image_url} alt={editor.item_name || 'item preview'} className="h-48 w-full object-cover" />
              </div>
            ) : null}
          </div>

          {message ? <div className="border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-700">{message}</div> : null}
          {error ? <div className="border border-red-200 bg-red-50 px-3 py-2 text-xs font-bold text-red-600">{error}</div> : null}

          <button onClick={() => void handleSave()} disabled={saving || uploadingImage || !editor.item_name.trim()} className="inline-flex w-full items-center justify-center gap-2 bg-[#0A7B4A] px-4 py-3 text-xs font-bold uppercase tracking-[0.12em] text-white transition-all disabled:opacity-50">
            <Save size={14} /> {saving ? 'กำลังบันทึก...' : uploadingImage ? 'รออัปโหลดรูป...' : (editingGroupKey ? 'อัปเดตรายการและขนาด' : 'บันทึกรายการพร้อมขนาด')}
          </button>
        </section>

        <section className="border border-[#E5E5E5] bg-white p-5 sm:p-6">
          <div className="flex flex-col gap-3 border-b border-[#EFEFEF] pb-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#9A9A9A]">Catalog</div>
              <div className="mt-2 text-lg font-black">{locale === 'en' ? 'รายการที่มีอยู่' : locale === 'zh' ? 'รายการที่มีอยู่' : 'รายการที่มีอยู่'}</div>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <label className="relative block">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8A8A8A]" />
                <input value={query} onChange={(e) => setQuery(e.target.value)} className="w-full border border-[#E5E5E5] py-2.5 pl-9 pr-3 text-sm font-semibold outline-none focus:border-[#111111] sm:w-72" placeholder={locale === 'en' ? 'ค้นหารายการหรือขนาด' : locale === 'zh' ? 'ค้นหารายการหรือขนาด' : 'ค้นหารายการหรือขนาด'} />
              </label>
              <select value={filterMainCategory} onChange={(e) => {
                const nextMainCategory = e.target.value as 'all' | DocumentCatalogMainCategory
                setFilterMainCategory(nextMainCategory)
                setFilterSubcategory('all')
              }} className="border border-[#E5E5E5] px-3 py-2.5 text-sm font-semibold outline-none focus:border-[#111111]">
                <option value="all">{locale === 'en' ? 'ทุกหมวดหลัก' : locale === 'zh' ? 'ทุกหมวดหลัก' : 'ทุกหมวดหลัก'}</option>
                {DOCUMENT_MAIN_CATEGORY_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
              <select value={filterSubcategory} onChange={(e) => setFilterSubcategory(e.target.value as 'all' | DocumentCatalogSubcategory)} className="border border-[#E5E5E5] px-3 py-2.5 text-sm font-semibold outline-none focus:border-[#111111]">
                <option value="all">{locale === 'en' ? 'ทุกชนิดย่อย' : locale === 'zh' ? 'ทุกชนิดย่อย' : 'ทุกชนิดย่อย'}</option>
                {(filterMainCategory === 'all'
                  ? DOCUMENT_MAIN_CATEGORY_OPTIONS.flatMap((option) => getDocumentSubcategoryOptions(option.value))
                  : getDocumentSubcategoryOptions(filterMainCategory)
                ).map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="mt-4 space-y-3">
            {loading ? (
              <div className="py-8 text-center text-sm font-semibold text-[#777777]">{locale === 'en' ? 'กำลังโหลดรายการ...' : locale === 'zh' ? 'กำลังโหลดรายการ...' : 'กำลังโหลดรายการ...'}</div>
            ) : filteredItems.length === 0 ? (
              <div className="py-8 text-center text-sm font-semibold text-[#777777]">{locale === 'en' ? 'ยังไม่มีรายการในหมวดนี้' : locale === 'zh' ? 'ยังไม่มีรายการในหมวดนี้' : 'ยังไม่มีรายการในหมวดนี้'}</div>
            ) : (
              filteredItems.map((group) => (
                <div key={group.key} className="grid grid-cols-1 gap-4 border border-[#EFEFEF] p-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-[88px_minmax(0,1fr)] sm:items-start">
                    <div className="h-[88px] overflow-hidden border border-[#EAEAEA] bg-[#F3F3EE]">
                      {group.image_url ? (
                        <img src={group.image_url} alt={group.item_name} className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full items-center justify-center text-[10px] font-bold uppercase tracking-[0.12em] text-[#999999]">No Image</div>
                      )}
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <div className="text-sm font-black text-[#111111]">{group.item_name}</div>
                        <span className="border border-[#E5E5E5] px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em] text-[#666666]">
                          {buildDocumentCategoryLabel(group.main_category, group.subcategory)}
                        </span>
                      </div>
                      <div className="mt-1 text-xs text-[#666666]">
                        {[group.english_name, group.scientific_name].filter(Boolean).join(' • ') || 'ไม่มีรายละเอียดเสริม'}
                      </div>
                      <div className="mt-3 space-y-2">
                        {group.entries
                          .slice()
                          .sort((a, b) => String(a.size_label || '').localeCompare(String(b.size_label || ''), 'th'))
                          .map((entry) => (
                            <div key={entry.id} className="flex flex-wrap items-center gap-2 text-xs font-bold text-[#444444]">
                              <span className="border border-[#E5E5E5] bg-[#FAFAFA] px-2 py-1 text-[11px] text-[#222222]">{entry.size_label || 'ไม่ระบุขนาด'}</span>
                              <span>{entry.unit || 'หน่วย'}</span>
                              <span>{locale === 'en' ? 'วัสดุ ' : locale === 'zh' ? 'วัสดุ ' : 'วัสดุ '}{Number(entry.material_price || 0).toLocaleString()}</span>
                              <span>{locale === 'en' ? 'แรง ' : locale === 'zh' ? 'แรง ' : 'แรง '}{Number(entry.labor_price || 0).toLocaleString()}</span>
                            </div>
                          ))}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 lg:justify-end">
                    <button onClick={() => handleEdit(group)} className="border border-[#E5E5E5] px-3 py-2 text-[11px] font-bold uppercase tracking-[0.12em] hover:bg-[#FAFAFA] transition-all">{locale === 'en' ? 'correct' : locale === 'zh' ? '正确的' : 'แก้ไข'}</button>
                    <button onClick={() => void handleDelete(group)} disabled={deletingId === group.key} className="inline-flex items-center gap-1 border border-red-200 px-3 py-2 text-[11px] font-bold uppercase tracking-[0.12em] text-red-600 hover:bg-red-50 transition-all disabled:opacity-50">
                      <Trash2 size={12} /> {locale === 'en' ? ' ลบ                     ' : locale === 'zh' ? ' ลบ                     ' : ' ลบ                     '}</button>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      </div>
    </div>
  )
}

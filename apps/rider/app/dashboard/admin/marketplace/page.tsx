'use client'

import { type DragEvent, useEffect, useMemo, useRef, useState } from 'react'
import { ArrowRight, Camera, Edit2, Leaf, Plus, Search, Settings, Sprout, TreePine, X } from 'lucide-react'
import {
  createMarketplacePlant,
  getAllMarketplacePlants,
  getPlantLibraryVariants,
  supabase,
  updateMarketplacePlant,
  upsertDocumentItemCatalog,
  type MarketplacePlant,
  type MarketplacePlantCategory,
  type MarketplacePlantGrowthRate,
  type MarketplacePlantMaintenanceLevel,
  type PlantLibraryVariant,
} from '@/lib/supabaseClient'
import { useI18n } from '@/lib/I18nContext'
import { appCopy, pickLocalizedText } from '@/lib/appLocale'
import { formatCurrencyByLocale, formatNumberByLocale } from '@/lib/localeFormat'

type PlantForm = {
  id?: string
  sku: string
  name: string
  common_name: string
  scientific_name: string
  plant_family: string
  category: MarketplacePlantCategory
  description: string
  size_label: string
  height_cm: string
  canopy_width_cm: string
  trunk_diameter_inch: string
  tree_height_label: string
  shrub_spacing_cm: string
  sunlight_requirement: string
  watering_requirement: string
  soil_requirement: string
  maintenance_level: MarketplacePlantMaintenanceLevel | ''
  growth_rate: MarketplacePlantGrowthRate | ''
  pet_friendly: boolean
  care_tips: string
  notes: string
  feature_tags: string
  price: number
  stock_quantity: number
  image_url: string
  is_active: boolean
}

type FormNotice = {
  type: 'error' | 'success'
  message: string
}

const categories: MarketplacePlantCategory[] = ['PALMS', 'TREES', 'SHRUBS', 'ALL']
const maintenanceOptions: MarketplacePlantMaintenanceLevel[] = ['low', 'medium', 'high']
const growthOptions: MarketplacePlantGrowthRate[] = ['slow', 'moderate', 'fast']

const detailedMarketplaceCopy = {
  th: {
    eyebrow: 'Plant Data Studio',
    title: 'Detailed Plant Records',
    subtitle: 'บันทึกข้อมูลต้นไม้และไม้พุ่มแบบละเอียด พร้อมข้อมูลดูแล ขนาดปลูก และการใช้งานต่อในเอกสาร',
    identity: 'ข้อมูลหลัก',
    dimensions: 'ขนาดและโครงสร้าง',
    treeFields: 'ข้อมูลเฉพาะต้นไม้',
    shrubFields: 'ข้อมูลเฉพาะไม้พุ่ม',
    care: 'การดูแล',
    commercial: 'ขายและสต็อก',
    additional: 'คำอธิบายและโน้ต',
    preview: 'ตัวอย่างข้อมูลที่จะถูกบันทึก',
    scientificName: 'ชื่อวิทยาศาสตร์',
    scientificNamePlaceholder: 'เช่น Ficus benjamina',
    family: 'วงศ์พืช',
    familyPlaceholder: 'เช่น Moraceae',
    description: 'คำอธิบายพืช/สินค้า',
    descriptionPlaceholder: 'บอกรูปทรง จุดเด่น หรือบทบาทในงานภูมิทัศน์',
    heightCm: 'ความสูงโดยประมาณ (ซม.)',
    canopyWidthCm: 'ความกว้างทรงพุ่ม (ซม.)',
    trunkDiameterInch: 'เส้นผ่านศูนย์กลางลำต้น (นิ้ว)',
    treeHeightLabel: 'ช่วงความสูงสำหรับเอกสาร (เมตร)',
    treeHeightLabelPlaceholder: 'เช่น 2.5-3',
    shrubSpacingCm: 'ระยะปลูกแนะนำ (ซม.)',
    sunlightRequirement: 'ความต้องการแสง',
    wateringRequirement: 'การให้น้ำ',
    soilRequirement: 'สภาพดิน',
    maintenanceLevel: 'ระดับการดูแล',
    growthRate: 'อัตราการเติบโต',
    petFriendly: 'ปลอดภัยต่อสัตว์เลี้ยง',
    careTips: 'คำแนะนำการดูแล',
    careTipsPlaceholder: 'เช่น ตัดแต่งหลังแตกยอดใหม่ และหลีกเลี่ยงน้ำขัง',
    internalNotes: 'หมายเหตุภายใน',
    internalNotesPlaceholder: 'ใช้บันทึกข้อควรระวังหรือเงื่อนไขการขาย',
    featureTags: 'แท็กจุดเด่น',
    featureTagsPlaceholder: 'เช่น ทนแดด, ฟอร์มสวย, ไม้มงคล',
    sizePreview: 'size_label ที่จะ sync ไปเอกสาร',
    syncHint: 'เมื่อบันทึก ระบบจะอัปเดต plant catalog สำหรับเอกสารให้อัตโนมัติ',
    low: 'ต่ำ',
    medium: 'กลาง',
    high: 'สูง',
    slow: 'ช้า',
    moderate: 'ปานกลาง',
    fast: 'เร็ว',
    emptyScientific: 'ยังไม่มีชื่อวิทยาศาสตร์',
    tagsEmpty: 'ยังไม่ได้ใส่แท็ก',
    treeCategory: 'ต้นไม้',
    shrubCategory: 'ไม้พุ่ม',
    palmCategory: 'ปาล์ม',
    allCategory: 'ทั่วไป',
    libraryTitle: 'รายการพืชในระบบ',
    librarySubtitle: 'ดึงข้อมูลพืชจากระบบกลางขึ้นมาทำรายการ marketplace ได้ แม้ยังไม่ได้เปิดขาย',
    importAction: 'ดึงขึ้นมาใช้',
    editAction: 'แก้รายการขาย',
    libraryOnly: 'มีในระบบ',
    marketplaceReady: 'มีใน marketplace แล้ว',
    saving: 'กำลังบันทึก...',
    catalogSyncWarning: 'บันทึกสินค้าแล้ว แต่ sync รายการเอกสารไม่สำเร็จ',
  },
  en: {
    eyebrow: 'Plant Data Studio',
    title: 'Detailed Plant Records',
    subtitle: 'Capture trees and shrubs with care notes, planting dimensions, and document-ready sizing in one place.',
    identity: 'Identity',
    dimensions: 'Dimensions & Structure',
    treeFields: 'Tree-specific data',
    shrubFields: 'Shrub-specific data',
    care: 'Care Profile',
    commercial: 'Commercial & Stock',
    additional: 'Description & Notes',
    preview: 'Saved Data Preview',
    scientificName: 'Scientific Name',
    scientificNamePlaceholder: 'e.g. Ficus benjamina',
    family: 'Plant Family',
    familyPlaceholder: 'e.g. Moraceae',
    description: 'Plant / Product Description',
    descriptionPlaceholder: 'Describe form, highlights, or landscape use.',
    heightCm: 'Approx. Height (cm)',
    canopyWidthCm: 'Canopy Width (cm)',
    trunkDiameterInch: 'Trunk Diameter (inch)',
    treeHeightLabel: 'Document Height Range (m)',
    treeHeightLabelPlaceholder: 'e.g. 2.5-3',
    shrubSpacingCm: 'Recommended Spacing (cm)',
    sunlightRequirement: 'Sunlight Requirement',
    wateringRequirement: 'Watering Requirement',
    soilRequirement: 'Soil Requirement',
    maintenanceLevel: 'Maintenance Level',
    growthRate: 'Growth Rate',
    petFriendly: 'Pet Friendly',
    careTips: 'Care Tips',
    careTipsPlaceholder: 'e.g. prune after new growth and avoid waterlogging.',
    internalNotes: 'Internal Notes',
    internalNotesPlaceholder: 'Use for handling notes or sales conditions.',
    featureTags: 'Feature Tags',
    featureTagsPlaceholder: 'e.g. sun tolerant, sculptural, auspicious',
    sizePreview: 'size_label to sync into documents',
    syncHint: 'Saving also updates the plant catalog used by document generation.',
    low: 'Low',
    medium: 'Medium',
    high: 'High',
    slow: 'Slow',
    moderate: 'Moderate',
    fast: 'Fast',
    emptyScientific: 'No scientific name yet',
    tagsEmpty: 'No tags yet',
    treeCategory: 'Tree',
    shrubCategory: 'Shrub',
    palmCategory: 'Palm',
    allCategory: 'General',
    libraryTitle: 'System Plant Library',
    librarySubtitle: 'Pull plant data from the shared system library into marketplace listings, even if not yet for sale.',
    importAction: 'Use in marketplace',
    editAction: 'Edit listing',
    libraryOnly: 'In system only',
    marketplaceReady: 'Already listed',
    saving: 'Saving...',
    catalogSyncWarning: 'Product saved, but document catalog sync failed.',
  },
  zh: {
    eyebrow: 'Plant Data Studio',
    title: 'Detailed Plant Records',
    subtitle: '集中录入树木和灌木的详细信息，并同步到文档与销售系统。',
    identity: '基础信息',
    dimensions: '尺寸与结构',
    treeFields: '乔木专用字段',
    shrubFields: '灌木专用字段',
    care: '养护信息',
    commercial: '销售与库存',
    additional: '描述与备注',
    preview: '保存预览',
    scientificName: '学名',
    scientificNamePlaceholder: '例如 Ficus benjamina',
    family: '植物科属',
    familyPlaceholder: '例如 Moraceae',
    description: '植物/商品描述',
    descriptionPlaceholder: '说明形态特点、亮点或景观用途。',
    heightCm: '大致高度（厘米）',
    canopyWidthCm: '冠幅（厘米）',
    trunkDiameterInch: '树干直径（英寸）',
    treeHeightLabel: '文档高度范围（米）',
    treeHeightLabelPlaceholder: '例如 2.5-3',
    shrubSpacingCm: '建议株距（厘米）',
    sunlightRequirement: '光照需求',
    wateringRequirement: '浇水需求',
    soilRequirement: '土壤条件',
    maintenanceLevel: '养护等级',
    growthRate: '生长速度',
    petFriendly: '对宠物友好',
    careTips: '养护建议',
    careTipsPlaceholder: '例如 新梢后修剪，并避免积水。',
    internalNotes: '内部备注',
    internalNotesPlaceholder: '用于记录处理注意事项或销售条件。',
    featureTags: '特征标签',
    featureTagsPlaceholder: '例如 耐晒、造型感强、吉祥植物',
    sizePreview: '同步到文档的 size_label',
    syncHint: '保存时会自动更新文档系统使用的植物目录。',
    low: '低',
    medium: '中',
    high: '高',
    slow: '慢',
    moderate: '中等',
    fast: '快',
    emptyScientific: '暂无学名',
    tagsEmpty: '暂无标签',
    treeCategory: '乔木',
    shrubCategory: '灌木',
    palmCategory: '棕榈',
    allCategory: '通用',
    libraryTitle: '系统植物库',
    librarySubtitle: '即使尚未上架销售，也可以将系统中的植物资料直接带入 marketplace。',
    importAction: '导入到 marketplace',
    editAction: '编辑销售项目',
    libraryOnly: '仅存在于系统',
    marketplaceReady: '已在 marketplace',
    saving: '保存中...',
    catalogSyncWarning: '商品已保存，但文档目录同步失败。',
  },
} as const

const emptyForm = (): PlantForm => ({
  sku: '',
  name: '',
  common_name: '',
  scientific_name: '',
  plant_family: '',
  category: 'TREES',
  description: '',
  size_label: '',
  height_cm: '',
  canopy_width_cm: '',
  trunk_diameter_inch: '',
  tree_height_label: '',
  shrub_spacing_cm: '',
  sunlight_requirement: '',
  watering_requirement: '',
  soil_requirement: '',
  maintenance_level: '',
  growth_rate: '',
  pet_friendly: false,
  care_tips: '',
  notes: '',
  feature_tags: '',
  price: 0,
  stock_quantity: 0,
  image_url: '',
  is_active: true,
})

const sanitizeFileName = (name: string) =>
  name
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .replace(/_+/g, '_')
    .slice(0, 120)

const toOptionalNumber = (value: string) => {
  const normalized = String(value || '').trim().replace(/,/g, '.')
  if (!normalized) return undefined
  const parsed = Number(normalized)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined
}

const formatNumericLabel = (value: number) => Number(value.toFixed(2)).toString()

const formatCentimetersAsMeters = (value?: number) => {
  if (!Number.isFinite(value) || !value || value <= 0) return ''
  return formatNumericLabel(value / 100)
}

const buildDerivedSizeLabel = (form: PlantForm) => {
  const manualLabel = String(form.size_label || '').trim()
  if (manualLabel) return manualLabel

  const heightCm = toOptionalNumber(form.height_cm)
  const canopyWidthCm = toOptionalNumber(form.canopy_width_cm)
  const trunkDiameter = toOptionalNumber(form.trunk_diameter_inch)
  const shrubSpacingCm = toOptionalNumber(form.shrub_spacing_cm)
  const treeHeightLabel = String(form.tree_height_label || '').trim() || (heightCm ? formatCentimetersAsMeters(heightCm) : '')

  if (form.category === 'TREES') {
    if (trunkDiameter && treeHeightLabel) return `Ø ${formatNumericLabel(trunkDiameter)}" H ${treeHeightLabel} m.`
    if (trunkDiameter) return `Ø ${formatNumericLabel(trunkDiameter)}"`
    if (treeHeightLabel) return `H ${treeHeightLabel} m.`
  }

  if (form.category === 'SHRUBS') {
    if (heightCm && shrubSpacingCm) return `H.${formatCentimetersAsMeters(heightCm)} m. @ ${formatCentimetersAsMeters(shrubSpacingCm)} m.`
    if (heightCm) return `H.${formatCentimetersAsMeters(heightCm)} m.`
    if (shrubSpacingCm) return `@ ${formatCentimetersAsMeters(shrubSpacingCm)} m.`
  }

  const segments = []
  if (heightCm) segments.push(`H.${formatCentimetersAsMeters(heightCm)} m.`)
  if (canopyWidthCm) segments.push(`W.${formatCentimetersAsMeters(canopyWidthCm)} m.`)
  return segments.join(' / ')
}

const deriveItemCategory = (category: MarketplacePlantCategory): 'tree' | 'palm' | 'shrub' | 'material' | 'other' => {
  if (category === 'TREES') return 'tree'
  if (category === 'PALMS') return 'palm'
  if (category === 'SHRUBS') return 'shrub'
  return 'other'
}

const stringFromOptionalNumber = (value?: number | null) => {
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed > 0 ? parsed.toString() : ''
}

export default function AdminMarketplacePage() {
  const { locale } = useI18n()
  const copy = appCopy.adminMarketplace
  const detailCopy = detailedMarketplaceCopy[locale as keyof typeof detailedMarketplaceCopy] || detailedMarketplaceCopy.en
  const [plants, setPlants] = useState<MarketplacePlant[]>([])
  const [libraryItems, setLibraryItems] = useState<PlantLibraryVariant[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [dragging, setDragging] = useState(false)
  const [error, setError] = useState('')
  const [query, setQuery] = useState('')
  const [form, setForm] = useState<PlantForm | null>(null)
  const [formNotice, setFormNotice] = useState<FormNotice | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const loadPlants = async () => {
    setLoading(true)
    const [{ data, error: loadError }, { data: libraryData, error: libraryError }] = await Promise.all([
      getAllMarketplacePlants(),
      getPlantLibraryVariants(),
    ])

    if (loadError) {
      setError(pickLocalizedText(locale, copy.loadFailed))
    } else {
      setPlants(data || [])
      setError('')
    }

    if (!libraryError) {
      setLibraryItems(libraryData || [])
    }

    setLoading(false)
  }

  useEffect(() => {
    void loadPlants()
  }, [locale])

  const filteredPlants = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()
    if (!normalizedQuery) return plants
    return plants.filter((item) =>
      (item.name || '').toLowerCase().includes(normalizedQuery) ||
      (item.common_name || '').toLowerCase().includes(normalizedQuery) ||
      (item.scientific_name || '').toLowerCase().includes(normalizedQuery) ||
      (item.plant_family || '').toLowerCase().includes(normalizedQuery) ||
      (item.sku || '').toLowerCase().includes(normalizedQuery)
    )
  }, [plants, query])

  const filteredLibraryItems = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()
    const base = libraryItems.filter((item) => item.item_name)
    if (!normalizedQuery) {
      return base.slice(0, 8)
    }

    return base.filter((item) =>
      (item.item_name || '').toLowerCase().includes(normalizedQuery) ||
      (item.english_name || '').toLowerCase().includes(normalizedQuery) ||
      (item.scientific_name || '').toLowerCase().includes(normalizedQuery) ||
      (item.plant_family || '').toLowerCase().includes(normalizedQuery) ||
      (item.size_label || '').toLowerCase().includes(normalizedQuery)
    ).slice(0, 12)
  }, [libraryItems, query])

  const openCreate = () => {
    setForm(emptyForm())
    setError('')
    setFormNotice(null)
  }

  const openEdit = (plant: MarketplacePlant) => {
    setForm({
      id: plant.id,
      sku: plant.sku || '',
      name: plant.name,
      common_name: plant.common_name || '',
      scientific_name: plant.scientific_name || '',
      plant_family: plant.plant_family || '',
      category: plant.category,
      description: plant.description || '',
      size_label: plant.size_label || '',
      height_cm: stringFromOptionalNumber(plant.height_cm),
      canopy_width_cm: stringFromOptionalNumber(plant.canopy_width_cm),
      trunk_diameter_inch: stringFromOptionalNumber(plant.trunk_diameter_inch),
      tree_height_label: plant.tree_height_label || '',
      shrub_spacing_cm: stringFromOptionalNumber(plant.shrub_spacing_cm),
      sunlight_requirement: plant.sunlight_requirement || '',
      watering_requirement: plant.watering_requirement || '',
      soil_requirement: plant.soil_requirement || '',
      maintenance_level: plant.maintenance_level || '',
      growth_rate: plant.growth_rate || '',
      pet_friendly: !!plant.pet_friendly,
      care_tips: plant.care_tips || '',
      notes: plant.notes || '',
      feature_tags: Array.isArray(plant.feature_tags) ? plant.feature_tags.join(', ') : '',
      price: plant.price || 0,
      stock_quantity: plant.stock_quantity || 0,
      image_url: plant.image_url || '',
      is_active: plant.is_active,
    })
    setError('')
    setFormNotice(null)
  }

  const openFromLibrary = (item: PlantLibraryVariant) => {
    const linkedPlant = item.marketplace_plant_id
      ? plants.find((plant) => plant.id === item.marketplace_plant_id)
      : null

    if (linkedPlant) {
      openEdit(linkedPlant)
      return
    }

    const derivedCategory: MarketplacePlantCategory = item.category === 'PALMS' || item.category === 'TREES' || item.category === 'SHRUBS'
      ? item.category
      : item.item_category === 'palm'
        ? 'PALMS'
      : item.size_mode === 'tree'
        ? 'TREES'
        : item.size_mode === 'shrub'
          ? 'SHRUBS'
          : 'ALL'

    setForm({
      ...emptyForm(),
      name: item.item_name || '',
      common_name: item.english_name || '',
      scientific_name: item.scientific_name || '',
      plant_family: item.plant_family || '',
      category: derivedCategory,
      description: item.description || '',
      size_label: item.size_label || '',
      height_cm: stringFromOptionalNumber(item.height_cm),
      canopy_width_cm: stringFromOptionalNumber(item.canopy_width_cm),
      trunk_diameter_inch: stringFromOptionalNumber(item.trunk_diameter_inch),
      tree_height_label: item.tree_height_label || '',
      shrub_spacing_cm: stringFromOptionalNumber(item.shrub_spacing_cm),
      sunlight_requirement: item.sunlight_requirement || '',
      watering_requirement: item.watering_requirement || '',
      soil_requirement: item.soil_requirement || '',
      maintenance_level: item.maintenance_level || '',
      growth_rate: item.growth_rate || '',
      pet_friendly: !!item.pet_friendly,
      care_tips: item.care_tips || '',
      notes: item.notes || '',
      feature_tags: Array.isArray(item.feature_tags) ? item.feature_tags.join(', ') : '',
      price: Number(item.marketplace_price) || Number(item.preferred_price) || 0,
      stock_quantity: Number(item.stock_quantity) || 0,
      image_url: item.image_url || '',
      is_active: !!item.marketplace_active,
    })
    setError('')
    setFormNotice(null)
  }

  const uploadImage = async (file: File) => {
    if (!form) return

    if (!file.type.startsWith('image/')) {
      const message = pickLocalizedText(locale, copy.imageOnly)
      setError(message)
      setFormNotice({ type: 'error', message })
      return
    }

    setUploading(true)
    setError('')

    const safeName = sanitizeFileName(file.name || 'plant-image')
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
      const uploadErrorMessage = responseJson?.error || responseJson?.details || pickLocalizedText(locale, copy.uploadFailed)
      setError(uploadErrorMessage)
      setFormNotice({ type: 'error', message: uploadErrorMessage })
      setUploading(false)
      return
    }

    const publicUrl = responseJson?.publicUrl || ''
    if (!publicUrl) {
      const message = pickLocalizedText(locale, copy.imageLinkFailed)
      setError(message)
      setFormNotice({ type: 'error', message })
      setUploading(false)
      return
    }

    setForm({ ...form, image_url: publicUrl })
    setFormNotice({ type: 'success', message: pickLocalizedText(locale, copy.uploadSuccess) })
    setUploading(false)
  }

  const onDropFile = async (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    setDragging(false)
    const file = event.dataTransfer.files?.[0]
    if (file) await uploadImage(file)
  }

  const toggleActive = async (plant: MarketplacePlant) => {
    const { error: updateError } = await updateMarketplacePlant(plant.id, { is_active: !plant.is_active })
    if (updateError) {
      setError(pickLocalizedText(locale, copy.toggleFailed))
      return
    }
    await loadPlants()
  }

  const closeForm = () => {
    setForm(null)
    setDragging(false)
    setFormNotice(null)
  }

  const categoryLabel = (category: MarketplacePlantCategory) => {
    if (category === 'TREES') return detailCopy.treeCategory
    if (category === 'SHRUBS') return detailCopy.shrubCategory
    if (category === 'PALMS') return detailCopy.palmCategory
    return detailCopy.allCategory
  }

  const maintenanceLabel = (value?: MarketplacePlantMaintenanceLevel | '') => {
    if (value === 'low') return detailCopy.low
    if (value === 'medium') return detailCopy.medium
    if (value === 'high') return detailCopy.high
    return '-'
  }

  const growthLabel = (value?: MarketplacePlantGrowthRate | '') => {
    if (value === 'slow') return detailCopy.slow
    if (value === 'moderate') return detailCopy.moderate
    if (value === 'fast') return detailCopy.fast
    return '-'
  }

  const savePlant = async () => {
    if (!form) return
    if (!form.name.trim()) {
      const message = pickLocalizedText(locale, copy.nameRequired)
      setError(message)
      setFormNotice({ type: 'error', message })
      return
    }

    setSaving(true)
    setError('')

    const derivedSizeLabel = buildDerivedSizeLabel(form)
    const featureTags = Array.from(new Set(
      form.feature_tags
        .split(',')
        .map((tag) => tag.trim())
        .filter(Boolean)
    ))

    const payload = {
      sku: form.sku.trim() || undefined,
      name: form.name.trim(),
      common_name: form.common_name.trim() || undefined,
      scientific_name: form.scientific_name.trim() || undefined,
      plant_family: form.plant_family.trim() || undefined,
      category: form.category,
      description: form.description.trim() || undefined,
      size_label: derivedSizeLabel || undefined,
      height_cm: toOptionalNumber(form.height_cm),
      canopy_width_cm: toOptionalNumber(form.canopy_width_cm),
      trunk_diameter_inch: toOptionalNumber(form.trunk_diameter_inch),
      tree_height_label: form.tree_height_label.trim() || undefined,
      shrub_spacing_cm: toOptionalNumber(form.shrub_spacing_cm),
      sunlight_requirement: form.sunlight_requirement.trim() || undefined,
      watering_requirement: form.watering_requirement.trim() || undefined,
      soil_requirement: form.soil_requirement.trim() || undefined,
      maintenance_level: form.maintenance_level || undefined,
      growth_rate: form.growth_rate || undefined,
      pet_friendly: form.pet_friendly,
      care_tips: form.care_tips.trim() || undefined,
      notes: form.notes.trim() || undefined,
      feature_tags: featureTags,
      price: Number(form.price) || 0,
      stock_quantity: Number(form.stock_quantity) || 0,
      image_url: form.image_url.trim() || undefined,
      is_active: form.is_active,
    }

    const result = form.id ? await updateMarketplacePlant(form.id, payload) : await createMarketplacePlant(payload)

    if (result.error) {
      const message = pickLocalizedText(locale, copy.saveFailed)
      setError(message)
      setFormNotice({ type: 'error', message })
      setSaving(false)
      return
    }

    const sizeMode = form.category === 'TREES' ? 'tree' : form.category === 'SHRUBS' ? 'shrub' : 'other'
    const itemCategory = deriveItemCategory(form.category)
    const { error: catalogError } = await upsertDocumentItemCatalog([
      {
        item_name: payload.name,
        english_name: payload.common_name,
        scientific_name: payload.scientific_name,
        size_label: payload.size_label,
        item_category: itemCategory,
        size_mode: sizeMode,
        unit: 'ต้น',
        material_price: payload.price,
        labor_price: 0,
        image_url: payload.image_url,
      },
    ])

    setForm(null)
    setFormNotice({
      type: 'success',
      message: catalogError ? detailCopy.catalogSyncWarning : pickLocalizedText(locale, copy.saveSuccess),
    })
    await loadPlants()
    setSaving(false)
  }

  const isTree = form?.category === 'TREES'
  const isShrub = form?.category === 'SHRUBS'
  const sizePreview = form ? buildDerivedSizeLabel(form) : ''
  const formTags = form?.feature_tags
    .split(',')
    .map((tag) => tag.trim())
    .filter(Boolean) || []

  return (
    <div className="min-h-screen bg-[#FAF9F6] px-4 py-6 text-[#1A1A1A] sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <header className="mb-10 border-b border-[#E8E6E1] pb-6">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-[10px] uppercase tracking-[0.35em] text-[#86857F]">{detailCopy.eyebrow}</p>
              <h1 className="mt-1 text-3xl font-light tracking-tight">{detailCopy.title}</h1>
              <p className="mt-1 max-w-3xl text-sm font-light text-[#6A6A64]">{detailCopy.subtitle}</p>
            </div>
            <button onClick={openCreate} className="inline-flex items-center gap-2 border border-[#1A1A1A] px-4 py-2.5 text-xs uppercase tracking-[0.2em] transition-colors hover:bg-[#1A1A1A] hover:text-white">
              <Plus size={15} strokeWidth={1.5} />
              {pickLocalizedText(locale, copy.addItem)}
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="relative min-w-[16rem] flex-1 border-b border-[#1A1A1A]/30 pb-1">
              <Search size={15} className="pointer-events-none absolute left-0 top-1/2 -translate-y-1/2 text-[#8E8D88]" />
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={pickLocalizedText(locale, copy.searchPlaceholder)} className="w-full bg-transparent py-1 pl-6 pr-2 text-sm font-light outline-none placeholder:text-[#B5B3AE]" />
            </div>
            <div className="inline-flex items-center gap-1 text-xs uppercase tracking-[0.2em] text-[#8E8D88]">
              <Settings size={14} strokeWidth={1.5} />
              {formatNumberByLocale(filteredPlants.length, locale)} {pickLocalizedText(locale, copy.items)}
            </div>
          </div>
        </header>

        {error ? <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}
        {formNotice && !form ? (
          <div className={`mb-6 rounded-xl border px-4 py-3 text-sm ${formNotice.type === 'error' ? 'border-red-200 bg-red-50 text-red-700' : 'border-emerald-200 bg-emerald-50 text-emerald-700'}`}>
            {formNotice.message}
          </div>
        ) : null}

        <section className="mb-6 border border-[#E8E6E1] bg-white">
          <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[#E8E6E1] px-5 py-4">
            <div>
              <h2 className="text-sm uppercase tracking-[0.22em] text-[#4E5A45]">{detailCopy.libraryTitle}</h2>
              <p className="mt-1 text-sm font-light text-[#6A6A64]">{detailCopy.librarySubtitle}</p>
            </div>
            <div className="text-xs uppercase tracking-[0.18em] text-[#8E8D88]">
              {formatNumberByLocale(filteredLibraryItems.length, locale)} {pickLocalizedText(locale, copy.items)}
            </div>
          </div>

          {filteredLibraryItems.length === 0 ? (
            <div className="px-5 py-5 text-sm text-[#6A6A64]">{pickLocalizedText(locale, copy.empty)}</div>
          ) : (
            <div className="grid gap-3 px-5 py-4 md:grid-cols-2 xl:grid-cols-3">
              {filteredLibraryItems.map((item) => (
                <article key={item.id} className="border border-[#E8E6E1] bg-[#FCFBF8] p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-base font-light text-[#1A1A1A]">{item.item_name}</h3>
                      <p className="text-xs text-[#7C7B76]">{item.scientific_name || item.english_name || detailCopy.emptyScientific}</p>
                    </div>
                    <span className={`inline-flex items-center px-2 py-1 text-[10px] uppercase tracking-[0.18em] ${item.marketplace_plant_id ? 'bg-[#1A1A1A] text-white' : 'bg-[#ECE9E2] text-[#5D5C57]'}`}>
                      {item.marketplace_plant_id ? detailCopy.marketplaceReady : detailCopy.libraryOnly}
                    </span>
                  </div>

                  <div className="mt-3 space-y-1 text-sm text-[#4E4D49]">
                    <p>{categoryLabel(item.category)}</p>
                    <p>{item.size_label || '-'}</p>
                    <p>{formatCurrencyByLocale(Number(item.preferred_price) || 0, locale)}</p>
                  </div>

                  <button
                    onClick={() => openFromLibrary(item)}
                    className="mt-4 inline-flex items-center gap-2 border border-[#1A1A1A] px-3 py-2 text-[11px] uppercase tracking-[0.18em] transition-colors hover:bg-[#1A1A1A] hover:text-white"
                  >
                    <ArrowRight size={14} strokeWidth={1.5} />
                    {item.marketplace_plant_id ? detailCopy.editAction : detailCopy.importAction}
                  </button>
                </article>
              ))}
            </div>
          )}
        </section>

        <section className="overflow-hidden border border-[#E8E6E1] bg-white">
          {loading ? (
            <div className="px-6 py-10 text-sm text-[#6A6A64]">{pickLocalizedText(locale, copy.loading)}</div>
          ) : filteredPlants.length === 0 ? (
            <div className="px-6 py-10 text-sm text-[#6A6A64]">{pickLocalizedText(locale, copy.empty)}</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[940px] border-collapse text-left">
                <thead>
                  <tr className="border-b-2 border-[#1A1A1A] text-[11px] uppercase tracking-[0.2em] text-[#8E8D88]">
                    <th className="px-4 py-4 font-normal">{pickLocalizedText(locale, copy.product)}</th>
                    <th className="px-4 py-4 font-normal">{pickLocalizedText(locale, copy.category)}</th>
                    <th className="px-4 py-4 font-normal">{detailCopy.dimensions}</th>
                    <th className="px-4 py-4 text-right font-normal">{pickLocalizedText(locale, copy.stock)}</th>
                    <th className="px-4 py-4 text-right font-normal">{pickLocalizedText(locale, copy.price)}</th>
                    <th className="px-4 py-4 text-right font-normal">{pickLocalizedText(locale, copy.status)}</th>
                    <th className="px-4 py-4 text-right font-normal">{pickLocalizedText(locale, copy.action)}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E8E6E1]">
                  {filteredPlants.map((plant) => (
                    <tr key={plant.id} className="transition-colors hover:bg-[#FAF9F6]">
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-4">
                          <div className="h-16 w-12 overflow-hidden bg-[#F0EFEA]">
                            {plant.image_url ? (
                              <img src={plant.image_url} alt={plant.name} className="h-full w-full object-cover" />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center text-[10px] text-[#A5A39E]">{pickLocalizedText(locale, copy.noImage)}</div>
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-[#1A1A1A]">{plant.name}</p>
                            <p className="truncate text-xs font-light italic text-[#70706B]">{plant.scientific_name || plant.common_name || detailCopy.emptyScientific}</p>
                            <p className="mt-1 text-[10px] uppercase tracking-[0.16em] text-[#9C9B95]">SKU {plant.sku || '-'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-sm font-light text-[#5B5A54]">{categoryLabel(plant.category)}</td>
                      <td className="px-4 py-4 text-sm font-light text-[#5B5A54]">
                        <div>{plant.size_label || '-'}</div>
                        <div className="mt-1 text-xs text-[#8E8D88]">{maintenanceLabel(plant.maintenance_level)} / {growthLabel(plant.growth_rate)}</div>
                      </td>
                      <td className="px-4 py-4 text-right text-sm font-light text-[#5B5A54]">{formatNumberByLocale(plant.stock_quantity || 0, locale)}</td>
                      <td className="px-4 py-4 text-right text-sm font-light text-[#5B5A54]">{formatCurrencyByLocale(Number(plant.price || 0), locale)}</td>
                      <td className="px-4 py-4 text-right">
                        <span className={`inline-block border px-2 py-1 text-[10px] uppercase tracking-[0.15em] ${plant.is_active ? 'border-emerald-700 text-emerald-700' : 'border-gray-400 text-gray-500'}`}>
                          {plant.is_active ? pickLocalizedText(locale, copy.active) : pickLocalizedText(locale, copy.inactive)}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-right">
                        <div className="inline-flex items-center gap-2">
                          <button onClick={() => openEdit(plant)} className="inline-flex items-center gap-1 border border-[#D8D6D0] px-2.5 py-1.5 text-[11px] uppercase tracking-[0.13em] text-[#4B4A45] transition-colors hover:border-[#1A1A1A] hover:text-[#1A1A1A]">
                            <Edit2 size={12} strokeWidth={1.5} />
                            {pickLocalizedText(locale, copy.edit)}
                          </button>
                          <button onClick={() => toggleActive(plant)} className="inline-flex items-center gap-1 border border-[#D8D6D0] px-2.5 py-1.5 text-[11px] uppercase tracking-[0.13em] text-[#4B4A45] transition-colors hover:border-[#1A1A1A] hover:text-[#1A1A1A]">
                            {plant.is_active ? pickLocalizedText(locale, copy.pause) : pickLocalizedText(locale, copy.publish)}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>

      {form && (
        <div className="fixed inset-0 z-50 bg-black/45 p-0 md:p-6">
          <div className="mx-auto flex h-full w-full max-w-6xl flex-col overflow-hidden bg-[#FAF9F6] shadow-2xl">
            <div className="sticky top-0 z-10 border-b border-[#E8E6E1] bg-[#FAF9F6] px-5 py-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.25em] text-[#8E8D88]">{form.id ? 'Edit Plant Record' : 'New Plant Record'}</p>
                  <h2 className="mt-1 text-xl font-light text-[#1A1A1A]">{form.id ? pickLocalizedText(locale, copy.editProduct) : pickLocalizedText(locale, copy.newProduct)}</h2>
                </div>
                <button onClick={closeForm} className="rounded-full border border-[#D8D6D0] p-2 text-[#66655F] transition-colors hover:border-[#1A1A1A] hover:text-[#1A1A1A]">
                  <X size={16} />
                </button>
              </div>
            </div>

            {formNotice ? (
              <div className={`mx-5 mt-4 rounded-lg border px-4 py-3 text-sm ${formNotice.type === 'error' ? 'border-red-200 bg-red-50 text-red-700' : 'border-emerald-200 bg-emerald-50 text-emerald-700'}`}>
                {formNotice.message}
              </div>
            ) : null}

            <div className="grid flex-1 gap-5 overflow-y-auto p-5 pb-28 xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.85fr)]">
              <div className="space-y-5">
                <section className="border border-[#E8E6E1] bg-white p-4">
                  <div className="mb-4 flex items-center gap-2 text-[#1A1A1A]">
                    <Leaf className="h-4 w-4" />
                    <h3 className="text-sm font-semibold">{detailCopy.identity}</h3>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="sm:col-span-2">
                      <label className="mb-1 block text-[10px] uppercase tracking-[0.2em] text-[#8E8D88]">{pickLocalizedText(locale, copy.productName)} *</label>
                      <input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder={pickLocalizedText(locale, copy.productNamePlaceholder)} className="w-full border border-[#E8E6E1] px-3 py-2.5 text-sm outline-none focus:border-[#1A1A1A]" />
                    </div>
                    <div>
                      <label className="mb-1 block text-[10px] uppercase tracking-[0.2em] text-[#8E8D88]">{pickLocalizedText(locale, copy.commonName)}</label>
                      <input value={form.common_name} onChange={(event) => setForm({ ...form, common_name: event.target.value })} placeholder={pickLocalizedText(locale, copy.commonNamePlaceholder)} className="w-full border border-[#E8E6E1] px-3 py-2.5 text-sm outline-none focus:border-[#1A1A1A]" />
                    </div>
                    <div>
                      <label className="mb-1 block text-[10px] uppercase tracking-[0.2em] text-[#8E8D88]">{detailCopy.scientificName}</label>
                      <input value={form.scientific_name} onChange={(event) => setForm({ ...form, scientific_name: event.target.value })} placeholder={detailCopy.scientificNamePlaceholder} className="w-full border border-[#E8E6E1] px-3 py-2.5 text-sm outline-none focus:border-[#1A1A1A]" />
                    </div>
                    <div>
                      <label className="mb-1 block text-[10px] uppercase tracking-[0.2em] text-[#8E8D88]">{detailCopy.family}</label>
                      <input value={form.plant_family} onChange={(event) => setForm({ ...form, plant_family: event.target.value })} placeholder={detailCopy.familyPlaceholder} className="w-full border border-[#E8E6E1] px-3 py-2.5 text-sm outline-none focus:border-[#1A1A1A]" />
                    </div>
                    <div>
                      <label className="mb-1 block text-[10px] uppercase tracking-[0.2em] text-[#8E8D88]">{pickLocalizedText(locale, copy.category)}</label>
                      <select value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value as MarketplacePlantCategory })} className="w-full border border-[#E8E6E1] px-3 py-2.5 text-sm outline-none focus:border-[#1A1A1A]">
                        {categories.map((category) => (
                          <option key={category} value={category}>{categoryLabel(category)}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="mb-1 block text-[10px] uppercase tracking-[0.2em] text-[#8E8D88]">SKU</label>
                      <input value={form.sku} onChange={(event) => setForm({ ...form, sku: event.target.value })} placeholder={pickLocalizedText(locale, copy.skuPlaceholder)} className="w-full border border-[#E8E6E1] px-3 py-2.5 text-sm outline-none focus:border-[#1A1A1A]" />
                    </div>
                  </div>
                </section>

                <section className="border border-[#E8E6E1] bg-white p-4">
                  <div className="mb-4 flex items-center gap-2 text-[#1A1A1A]">
                    {isTree ? <TreePine className="h-4 w-4" /> : <Sprout className="h-4 w-4" />}
                    <h3 className="text-sm font-semibold">{detailCopy.dimensions}</h3>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="mb-1 block text-[10px] uppercase tracking-[0.2em] text-[#8E8D88]">{pickLocalizedText(locale, copy.size)}</label>
                      <input value={form.size_label} onChange={(event) => setForm({ ...form, size_label: event.target.value })} placeholder={pickLocalizedText(locale, copy.sizePlaceholder)} className="w-full border border-[#E8E6E1] px-3 py-2.5 text-sm outline-none focus:border-[#1A1A1A]" />
                    </div>
                    <div>
                      <label className="mb-1 block text-[10px] uppercase tracking-[0.2em] text-[#8E8D88]">{detailCopy.heightCm}</label>
                      <input type="number" value={form.height_cm} onChange={(event) => setForm({ ...form, height_cm: event.target.value })} className="w-full border border-[#E8E6E1] px-3 py-2.5 text-sm outline-none focus:border-[#1A1A1A]" />
                    </div>
                    <div>
                      <label className="mb-1 block text-[10px] uppercase tracking-[0.2em] text-[#8E8D88]">{detailCopy.canopyWidthCm}</label>
                      <input type="number" value={form.canopy_width_cm} onChange={(event) => setForm({ ...form, canopy_width_cm: event.target.value })} className="w-full border border-[#E8E6E1] px-3 py-2.5 text-sm outline-none focus:border-[#1A1A1A]" />
                    </div>
                    {isTree ? (
                      <>
                        <div>
                          <label className="mb-1 block text-[10px] uppercase tracking-[0.2em] text-[#8E8D88]">{detailCopy.trunkDiameterInch}</label>
                          <input type="number" value={form.trunk_diameter_inch} onChange={(event) => setForm({ ...form, trunk_diameter_inch: event.target.value })} className="w-full border border-[#E8E6E1] px-3 py-2.5 text-sm outline-none focus:border-[#1A1A1A]" />
                        </div>
                        <div>
                          <label className="mb-1 block text-[10px] uppercase tracking-[0.2em] text-[#8E8D88]">{detailCopy.treeHeightLabel}</label>
                          <input value={form.tree_height_label} onChange={(event) => setForm({ ...form, tree_height_label: event.target.value })} placeholder={detailCopy.treeHeightLabelPlaceholder} className="w-full border border-[#E8E6E1] px-3 py-2.5 text-sm outline-none focus:border-[#1A1A1A]" />
                        </div>
                      </>
                    ) : null}
                    {isShrub ? (
                      <div>
                        <label className="mb-1 block text-[10px] uppercase tracking-[0.2em] text-[#8E8D88]">{detailCopy.shrubSpacingCm}</label>
                        <input type="number" value={form.shrub_spacing_cm} onChange={(event) => setForm({ ...form, shrub_spacing_cm: event.target.value })} className="w-full border border-[#E8E6E1] px-3 py-2.5 text-sm outline-none focus:border-[#1A1A1A]" />
                      </div>
                    ) : null}
                  </div>
                </section>

                <section className="border border-[#E8E6E1] bg-white p-4">
                  <div className="mb-4 flex items-center gap-2 text-[#1A1A1A]">
                    <Leaf className="h-4 w-4" />
                    <h3 className="text-sm font-semibold">{detailCopy.care}</h3>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="mb-1 block text-[10px] uppercase tracking-[0.2em] text-[#8E8D88]">{detailCopy.sunlightRequirement}</label>
                      <input value={form.sunlight_requirement} onChange={(event) => setForm({ ...form, sunlight_requirement: event.target.value })} className="w-full border border-[#E8E6E1] px-3 py-2.5 text-sm outline-none focus:border-[#1A1A1A]" />
                    </div>
                    <div>
                      <label className="mb-1 block text-[10px] uppercase tracking-[0.2em] text-[#8E8D88]">{detailCopy.wateringRequirement}</label>
                      <input value={form.watering_requirement} onChange={(event) => setForm({ ...form, watering_requirement: event.target.value })} className="w-full border border-[#E8E6E1] px-3 py-2.5 text-sm outline-none focus:border-[#1A1A1A]" />
                    </div>
                    <div>
                      <label className="mb-1 block text-[10px] uppercase tracking-[0.2em] text-[#8E8D88]">{detailCopy.soilRequirement}</label>
                      <input value={form.soil_requirement} onChange={(event) => setForm({ ...form, soil_requirement: event.target.value })} className="w-full border border-[#E8E6E1] px-3 py-2.5 text-sm outline-none focus:border-[#1A1A1A]" />
                    </div>
                    <div>
                      <label className="mb-1 block text-[10px] uppercase tracking-[0.2em] text-[#8E8D88]">{detailCopy.maintenanceLevel}</label>
                      <select value={form.maintenance_level} onChange={(event) => setForm({ ...form, maintenance_level: event.target.value as MarketplacePlantMaintenanceLevel | '' })} className="w-full border border-[#E8E6E1] px-3 py-2.5 text-sm outline-none focus:border-[#1A1A1A]">
                        <option value="">-</option>
                        {maintenanceOptions.map((level) => (
                          <option key={level} value={level}>{maintenanceLabel(level)}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="mb-1 block text-[10px] uppercase tracking-[0.2em] text-[#8E8D88]">{detailCopy.growthRate}</label>
                      <select value={form.growth_rate} onChange={(event) => setForm({ ...form, growth_rate: event.target.value as MarketplacePlantGrowthRate | '' })} className="w-full border border-[#E8E6E1] px-3 py-2.5 text-sm outline-none focus:border-[#1A1A1A]">
                        <option value="">-</option>
                        {growthOptions.map((level) => (
                          <option key={level} value={level}>{growthLabel(level)}</option>
                        ))}
                      </select>
                    </div>
                    <label className="inline-flex items-center gap-2 self-end text-sm text-[#4B4A45]">
                      <input type="checkbox" checked={form.pet_friendly} onChange={(event) => setForm({ ...form, pet_friendly: event.target.checked })} />
                      {detailCopy.petFriendly}
                    </label>
                    <div className="sm:col-span-2">
                      <label className="mb-1 block text-[10px] uppercase tracking-[0.2em] text-[#8E8D88]">{detailCopy.careTips}</label>
                      <textarea value={form.care_tips} onChange={(event) => setForm({ ...form, care_tips: event.target.value })} placeholder={detailCopy.careTipsPlaceholder} rows={3} className="w-full resize-y border border-[#E8E6E1] px-3 py-2.5 text-sm outline-none focus:border-[#1A1A1A]" />
                    </div>
                  </div>
                </section>

                <section className="border border-[#E8E6E1] bg-white p-4">
                  <div className="mb-4 flex items-center gap-2 text-[#1A1A1A]">
                    <Settings className="h-4 w-4" />
                    <h3 className="text-sm font-semibold">{detailCopy.commercial}</h3>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="mb-1 block text-[10px] uppercase tracking-[0.2em] text-[#8E8D88]">{pickLocalizedText(locale, copy.price)} (THB)</label>
                      <input type="number" value={form.price} onChange={(event) => setForm({ ...form, price: Number(event.target.value || 0) })} className="w-full border border-[#E8E6E1] px-3 py-2.5 text-sm outline-none focus:border-[#1A1A1A]" />
                    </div>
                    <div>
                      <label className="mb-1 block text-[10px] uppercase tracking-[0.2em] text-[#8E8D88]">{pickLocalizedText(locale, copy.stock)}</label>
                      <input type="number" value={form.stock_quantity} onChange={(event) => setForm({ ...form, stock_quantity: Number(event.target.value || 0) })} className="w-full border border-[#E8E6E1] px-3 py-2.5 text-sm outline-none focus:border-[#1A1A1A]" />
                    </div>
                    <label className="sm:col-span-2 inline-flex items-center gap-2 text-sm text-[#4B4A45]">
                      <input type="checkbox" checked={form.is_active} onChange={(event) => setForm({ ...form, is_active: event.target.checked })} />
                      {pickLocalizedText(locale, copy.sellActive)}
                    </label>
                  </div>
                </section>

                <section className="border border-[#E8E6E1] bg-white p-4">
                  <div className="mb-4 flex items-center gap-2 text-[#1A1A1A]">
                    <Camera className="h-4 w-4" />
                    <h3 className="text-sm font-semibold">{detailCopy.additional}</h3>
                  </div>
                  <div className="space-y-4">
                    <section>
                      <label className="mb-2 block text-[10px] uppercase tracking-[0.2em] text-[#8E8D88]">{pickLocalizedText(locale, copy.image)}</label>
                      <div className="flex flex-wrap gap-3">
                        <div
                          className={`flex h-28 w-28 items-center justify-center border-2 border-dashed ${dragging ? 'border-[#1A1A1A] bg-[#F2F1EC]' : 'border-[#D8D6D0] bg-[#FAF9F6]'}`}
                          onDragOver={(event) => {
                            event.preventDefault()
                            setDragging(true)
                          }}
                          onDragLeave={() => setDragging(false)}
                          onDrop={onDropFile}
                        >
                          <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(event) => {
                              const file = event.target.files?.[0]
                              if (file) void uploadImage(file)
                              event.currentTarget.value = ''
                            }}
                          />
                          <button type="button" onClick={() => fileInputRef.current?.click()} disabled={uploading} className="inline-flex h-full w-full flex-col items-center justify-center gap-2 text-xs text-[#6A6A64] disabled:opacity-60">
                            <Camera size={18} />
                            {uploading ? pickLocalizedText(locale, copy.uploading) : pickLocalizedText(locale, copy.addImage)}
                          </button>
                        </div>
                        <div className="h-28 w-28 overflow-hidden border border-[#E8E6E1] bg-[#F0EFEA]">
                          {form.image_url ? (
                            <img src={form.image_url} alt="preview" className="h-full w-full object-cover" />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center text-[10px] text-[#A5A39E]">{pickLocalizedText(locale, copy.noImage)}</div>
                          )}
                        </div>
                      </div>
                    </section>
                    <div>
                      <label className="mb-1 block text-[10px] uppercase tracking-[0.2em] text-[#8E8D88]">{detailCopy.description}</label>
                      <textarea value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} placeholder={detailCopy.descriptionPlaceholder} rows={3} className="w-full resize-y border border-[#E8E6E1] px-3 py-2.5 text-sm outline-none focus:border-[#1A1A1A]" />
                    </div>
                    <div>
                      <label className="mb-1 block text-[10px] uppercase tracking-[0.2em] text-[#8E8D88]">{detailCopy.featureTags}</label>
                      <input value={form.feature_tags} onChange={(event) => setForm({ ...form, feature_tags: event.target.value })} placeholder={detailCopy.featureTagsPlaceholder} className="w-full border border-[#E8E6E1] px-3 py-2.5 text-sm outline-none focus:border-[#1A1A1A]" />
                    </div>
                    <div>
                      <label className="mb-1 block text-[10px] uppercase tracking-[0.2em] text-[#8E8D88]">{detailCopy.internalNotes}</label>
                      <textarea value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} placeholder={detailCopy.internalNotesPlaceholder} rows={3} className="w-full resize-y border border-[#E8E6E1] px-3 py-2.5 text-sm outline-none focus:border-[#1A1A1A]" />
                    </div>
                  </div>
                </section>
              </div>

              <aside className="space-y-5">
                <section className="overflow-hidden border border-[#E8E6E1] bg-white">
                  <div className="aspect-[4/3] bg-[#F0EFEA]">
                    {form.image_url ? (
                      <img src={form.image_url} alt={form.name || 'preview'} className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full items-center justify-center text-xs uppercase tracking-[0.2em] text-[#9C9B95]">{pickLocalizedText(locale, copy.noImage)}</div>
                    )}
                  </div>
                  <div className="space-y-3 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <span className="rounded-full border border-[#D9D6CE] px-2.5 py-1 text-[10px] uppercase tracking-[0.18em] text-[#6A6A64]">{categoryLabel(form.category)}</span>
                      <span className={`rounded-full px-2.5 py-1 text-[10px] uppercase tracking-[0.18em] ${form.is_active ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>{form.is_active ? pickLocalizedText(locale, copy.active) : pickLocalizedText(locale, copy.inactive)}</span>
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold text-[#1A1A1A]">{form.name || pickLocalizedText(locale, copy.productName)}</h3>
                      <p className="mt-1 text-sm italic text-[#70706B]">{form.scientific_name || detailCopy.emptyScientific}</p>
                      <p className="mt-1 text-sm text-[#70706B]">{form.common_name || '-'}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-3 rounded-2xl bg-[#F7F5EF] p-3">
                      <div>
                        <p className="text-[10px] uppercase tracking-[0.18em] text-[#8E8D88]">{pickLocalizedText(locale, copy.price)}</p>
                        <p className="mt-1 text-lg font-semibold text-[#1F3A2C]">{formatCurrencyByLocale(Number(form.price || 0), locale)}</p>
                      </div>
                      <div>
                        <p className="text-[10px] uppercase tracking-[0.18em] text-[#8E8D88]">{pickLocalizedText(locale, copy.stock)}</p>
                        <p className="mt-1 text-lg font-semibold text-[#1A1A1A]">{formatNumberByLocale(form.stock_quantity || 0, locale)}</p>
                      </div>
                    </div>
                    <div className="rounded-2xl border border-[#E8E6E1] bg-[#FCFBF8] p-3">
                      <p className="text-[10px] uppercase tracking-[0.18em] text-[#8E8D88]">{detailCopy.sizePreview}</p>
                      <p className="mt-2 text-sm font-medium text-[#1A1A1A]">{sizePreview || '-'}</p>
                      <p className="mt-2 text-xs text-[#70706B]">{detailCopy.syncHint}</p>
                    </div>
                    <div className="grid gap-3 rounded-2xl bg-[#F7F5EF] p-3">
                      <div>
                        <p className="text-[10px] uppercase tracking-[0.18em] text-[#8E8D88]">{detailCopy.sunlightRequirement}</p>
                        <p className="mt-1 text-sm text-[#1A1A1A]">{form.sunlight_requirement || '-'}</p>
                      </div>
                      <div>
                        <p className="text-[10px] uppercase tracking-[0.18em] text-[#8E8D88]">{detailCopy.wateringRequirement}</p>
                        <p className="mt-1 text-sm text-[#1A1A1A]">{form.watering_requirement || '-'}</p>
                      </div>
                      <div>
                        <p className="text-[10px] uppercase tracking-[0.18em] text-[#8E8D88]">{detailCopy.soilRequirement}</p>
                        <p className="mt-1 text-sm text-[#1A1A1A]">{form.soil_requirement || '-'}</p>
                      </div>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-[0.18em] text-[#8E8D88]">{detailCopy.featureTags}</p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {formTags.length > 0 ? formTags.map((tag) => (
                          <span key={tag} className="rounded-full border border-[#D9D6CE] bg-white px-2.5 py-1 text-[11px] text-[#4B4A45]">{tag}</span>
                        )) : <span className="text-sm text-[#70706B]">{detailCopy.tagsEmpty}</span>}
                      </div>
                    </div>
                  </div>
                </section>
              </aside>
            </div>

            <div className="border-t border-[#E8E6E1] bg-[#FAF9F6] p-4">
              <div className="mx-auto flex max-w-6xl flex-col gap-2 sm:flex-row">
                <button type="button" onClick={savePlant} disabled={saving || uploading} className="inline-flex flex-1 items-center justify-center gap-2 bg-[#1A1A1A] px-4 py-3 text-xs uppercase tracking-[0.2em] text-white transition-colors hover:bg-black disabled:opacity-60">
                  {saving ? detailCopy.saving : uploading ? pickLocalizedText(locale, copy.uploading) : pickLocalizedText(locale, copy.saveProduct)}
                  {!saving && !uploading ? <ArrowRight size={14} strokeWidth={1.5} /> : null}
                </button>
                <button type="button" onClick={closeForm} className="border border-[#D8D6D0] px-4 py-3 text-xs uppercase tracking-[0.2em] text-[#4B4A45] transition-colors hover:border-[#1A1A1A] hover:text-[#1A1A1A]">
                  {pickLocalizedText(locale, copy.cancel)}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

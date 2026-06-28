export type DocumentCatalogMainCategory = 'softscape' | 'hardscape' | 'service' | 'other'

export type DocumentCatalogSubcategory =
  | 'tree'
  | 'palm'
  | 'shrub'
  | 'groundcover'
  | 'grass'
  | 'pathway'
  | 'stone'
  | 'decor'
  | 'structure'
  | 'planting'
  | 'maintenance'
  | 'installation'
  | 'general_service'
  | 'general'

export type CatalogSizeMode = 'tree' | 'shrub' | 'other'
export type CatalogItemCategory = 'tree' | 'palm' | 'shrub' | 'material' | 'other'

type DocumentCategoryOption = {
  value: DocumentCatalogSubcategory
  label: string
  itemCategory: CatalogItemCategory
  sizeMode: CatalogSizeMode
  defaultUnit: string
}

const DOCUMENT_CATEGORY_CONFIG: Record<DocumentCatalogMainCategory, DocumentCategoryOption[]> = {
  softscape: [
    { value: 'tree', label: 'ต้นไม้ใหญ่', itemCategory: 'tree', sizeMode: 'tree', defaultUnit: 'ต้น' },
    { value: 'palm', label: 'ปาล์ม', itemCategory: 'palm', sizeMode: 'tree', defaultUnit: 'ต้น' },
    { value: 'shrub', label: 'ไม้พุ่ม', itemCategory: 'shrub', sizeMode: 'shrub', defaultUnit: 'ต้น' },
    { value: 'groundcover', label: 'ไม้คลุมดิน', itemCategory: 'shrub', sizeMode: 'shrub', defaultUnit: 'ต้น' },
    { value: 'grass', label: 'สนามหญ้า', itemCategory: 'other', sizeMode: 'other', defaultUnit: 'ตร.ม.' },
  ],
  hardscape: [
    { value: 'pathway', label: 'ทางเดิน', itemCategory: 'material', sizeMode: 'other', defaultUnit: 'ตร.ม.' },
    { value: 'stone', label: 'หินและวัสดุปูพื้น', itemCategory: 'material', sizeMode: 'other', defaultUnit: 'ตร.ม.' },
    { value: 'decor', label: 'ของตกแต่งสวน', itemCategory: 'material', sizeMode: 'other', defaultUnit: 'รายการ' },
    { value: 'structure', label: 'โครงสร้างสวน', itemCategory: 'other', sizeMode: 'other', defaultUnit: 'รายการ' },
  ],
  service: [
    { value: 'planting', label: 'งานปลูก', itemCategory: 'other', sizeMode: 'other', defaultUnit: 'งาน' },
    { value: 'maintenance', label: 'งานดูแลรักษา', itemCategory: 'other', sizeMode: 'other', defaultUnit: 'งาน' },
    { value: 'installation', label: 'งานติดตั้ง', itemCategory: 'other', sizeMode: 'other', defaultUnit: 'งาน' },
    { value: 'general_service', label: 'บริการทั่วไป', itemCategory: 'other', sizeMode: 'other', defaultUnit: 'งาน' },
  ],
  other: [
    { value: 'general', label: 'อื่น ๆ', itemCategory: 'other', sizeMode: 'other', defaultUnit: 'รายการ' },
  ],
}

export const DOCUMENT_MAIN_CATEGORY_OPTIONS: Array<{ value: DocumentCatalogMainCategory; label: string }> = [
  { value: 'softscape', label: 'Softscape' },
  { value: 'hardscape', label: 'Hardscape' },
  { value: 'service', label: 'งานบริการ' },
  { value: 'other', label: 'อื่น ๆ' },
]

export const getDocumentSubcategoryOptions = (mainCategory: DocumentCatalogMainCategory): DocumentCategoryOption[] => {
  return DOCUMENT_CATEGORY_CONFIG[mainCategory] || DOCUMENT_CATEGORY_CONFIG.other
}

export const getDocumentSubcategoryConfig = (
  mainCategory: DocumentCatalogMainCategory,
  subcategory?: string | null
): DocumentCategoryOption => {
  const options = getDocumentSubcategoryOptions(mainCategory)
  const normalized = String(subcategory || '').trim().toLowerCase()
  return options.find((option) => option.value === normalized) || options[0]
}

export const normalizeDocumentMainCategory = (
  value?: string | null,
  fallbackName?: string | null,
  itemCategory?: string | null,
  sizeMode?: string | null
): DocumentCatalogMainCategory => {
  const normalized = String(value || '').trim().toLowerCase()
  if (normalized === 'softscape' || normalized === 'hardscape' || normalized === 'service' || normalized === 'other') {
    return normalized
  }

  const fallback = String(fallbackName || '').trim().toLowerCase()
  if (fallback.includes('softscape') || fallback.includes('ต้นไม้') || fallback.includes('ไม้พุ่ม') || fallback.includes('ปาล์ม')) {
    return 'softscape'
  }
  if (fallback.includes('hardscape') || fallback.includes('ทางเดิน') || fallback.includes('หิน') || fallback.includes('โครงสร้าง')) {
    return 'hardscape'
  }
  if (fallback.includes('service') || fallback.includes('บริการ') || fallback.includes('งานปลูก') || fallback.includes('งานดูแล')) {
    return 'service'
  }

  const normalizedItemCategory = String(itemCategory || '').trim().toLowerCase()
  const normalizedSizeMode = String(sizeMode || '').trim().toLowerCase()
  if (normalizedItemCategory === 'tree' || normalizedItemCategory === 'palm' || normalizedItemCategory === 'shrub' || normalizedSizeMode === 'tree' || normalizedSizeMode === 'shrub') {
    return 'softscape'
  }
  if (normalizedItemCategory === 'material') return 'hardscape'
  return 'other'
}

export const normalizeDocumentSubcategory = (
  value: string | null | undefined,
  mainCategory: DocumentCatalogMainCategory,
  fallbackName?: string | null,
  itemCategory?: string | null,
  sizeMode?: string | null
): DocumentCatalogSubcategory => {
  const normalized = String(value || '').trim().toLowerCase()
  const options = getDocumentSubcategoryOptions(mainCategory)
  const matched = options.find((option) => option.value === normalized)
  if (matched) return matched.value

  const fallback = String(fallbackName || '').trim().toLowerCase()
  const fallbackMatch = options.find((option) => fallback.includes(option.label.toLowerCase()) || fallback.includes(option.value))
  if (fallbackMatch) return fallbackMatch.value

  const normalizedItemCategory = String(itemCategory || '').trim().toLowerCase()
  const normalizedSizeMode = String(sizeMode || '').trim().toLowerCase()

  if (mainCategory === 'softscape') {
    if (normalizedItemCategory === 'palm') return 'palm'
    if (normalizedItemCategory === 'tree' || normalizedSizeMode === 'tree') return 'tree'
    if (normalizedItemCategory === 'shrub' || normalizedSizeMode === 'shrub') return 'shrub'
  }

  if (mainCategory === 'hardscape') {
    if (fallback.includes('ทางเดิน')) return 'pathway'
    if (fallback.includes('หิน')) return 'stone'
    if (fallback.includes('ตกแต่ง')) return 'decor'
    if (fallback.includes('โครงสร้าง')) return 'structure'
    if (normalizedItemCategory === 'material') return 'stone'
  }

  if (mainCategory === 'service') {
    if (fallback.includes('ปลูก')) return 'planting'
    if (fallback.includes('ดูแล')) return 'maintenance'
    if (fallback.includes('ติดตั้ง')) return 'installation'
    return 'general_service'
  }

  return options[0].value
}

export const buildDocumentCategoryLabel = (
  mainCategory: DocumentCatalogMainCategory,
  subcategory: DocumentCatalogSubcategory
) => {
  const mainLabel = DOCUMENT_MAIN_CATEGORY_OPTIONS.find((option) => option.value === mainCategory)?.label || 'อื่น ๆ'
  const subLabel = getDocumentSubcategoryConfig(mainCategory, subcategory).label
  return `${mainLabel} / ${subLabel}`
}

export const getDocumentCategoryDefaults = (
  mainCategory?: string | null,
  subcategory?: string | null,
  fallbackName?: string | null,
  itemCategory?: string | null,
  sizeMode?: string | null
) => {
  const normalizedMain = normalizeDocumentMainCategory(mainCategory, fallbackName, itemCategory, sizeMode)
  const normalizedSub = normalizeDocumentSubcategory(subcategory, normalizedMain, fallbackName, itemCategory, sizeMode)
  const config = getDocumentSubcategoryConfig(normalizedMain, normalizedSub)

  return {
    mainCategory: normalizedMain,
    subcategory: normalizedSub,
    label: buildDocumentCategoryLabel(normalizedMain, normalizedSub),
    itemCategory: config.itemCategory,
    sizeMode: config.sizeMode,
    defaultUnit: config.defaultUnit,
  }
}
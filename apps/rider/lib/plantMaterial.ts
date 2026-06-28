export type PlantMaterialSeed = {
  item_name?: string
  english_name?: string
  scientific_name?: string
  item_category?: 'tree' | 'palm' | 'shrub' | 'material' | 'other' | string
  plant_document_mode?: PlantDocumentMode | string | null
  size_label?: string
  size_mode?: 'tree' | 'shrub' | 'other' | string
  detail?: string
  spec?: string
  category_name?: string
  zone_name?: string
  unit?: string
  material_price?: number
  labor_price?: number
  image_url?: string | null
}

export type PlantDocumentCategory = 'tree' | 'shrub' | 'material'
export type PlantDocumentMode = PlantDocumentCategory | 'exclude' | 'auto'

export type PlantLayoutCardTuning = {
  cardHeight: number
  imageHeight: number
  cardPadding: number
  contentOffsetY: number
  titleFontSize: number
  subtitleFontSize: number
  metaFontSize: number
}

export type PlantLayoutGlobalSettings = PlantLayoutCardTuning & {
  pagePadding: number
  cardGap: number
  sectionGap: number
}

export type PlantLayoutSettings = {
  global: PlantLayoutGlobalSettings
  cards: Record<string, Partial<PlantLayoutCardTuning>>
  pages: Record<string, PlantLayoutPageSettings>
}

export type PlantLayoutPageSettings = {
  columns: number
  rows: number
}

export type PlantLayoutPageSection<T> = {
  label: string
  cards: T[]
}

export type PlantLayoutPage<T> = {
  index: number
  columns: number
  rows: number
  cards: T[]
  sections: Array<PlantLayoutPageSection<T>>
}

export const DEFAULT_PLANT_LAYOUT_PAGE_SETTINGS: PlantLayoutPageSettings = {
  columns: 3,
  rows: 2,
}

export const PLANT_LAYOUT_A4_WIDTH_PX = Math.round((210 / 25.4) * 96)
export const PLANT_LAYOUT_A4_HEIGHT_PX = Math.round((297 / 25.4) * 96)

export const DEFAULT_PLANT_LAYOUT_CARD_TUNING: PlantLayoutCardTuning = {
  cardHeight: 188,
  imageHeight: 96,
  cardPadding: 9,
  contentOffsetY: 0,
  titleFontSize: 10,
  subtitleFontSize: 7.5,
  metaFontSize: 8,
}

export const DEFAULT_PLANT_LAYOUT_SETTINGS: PlantLayoutSettings = {
  global: {
    pagePadding: 16,
    cardGap: 10,
    sectionGap: 10,
    ...DEFAULT_PLANT_LAYOUT_CARD_TUNING,
  },
  cards: {},
  pages: {},
}

const clampNumber = (value: unknown, min: number, max: number, fallback: number) => {
  const numeric = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(numeric)) return fallback
  return Math.min(max, Math.max(min, numeric))
}

const normalizePlantLayoutCardTuning = (raw: any, base: PlantLayoutCardTuning): PlantLayoutCardTuning => ({
  cardHeight: clampNumber(raw?.cardHeight, 120, 320, base.cardHeight),
  imageHeight: clampNumber(raw?.imageHeight, 48, 180, base.imageHeight),
  cardPadding: clampNumber(raw?.cardPadding, 4, 24, base.cardPadding),
  contentOffsetY: clampNumber(raw?.contentOffsetY, -24, 36, base.contentOffsetY),
  titleFontSize: clampNumber(raw?.titleFontSize, 8, 18, base.titleFontSize),
  subtitleFontSize: clampNumber(raw?.subtitleFontSize, 6, 14, base.subtitleFontSize),
  metaFontSize: clampNumber(raw?.metaFontSize, 6, 14, base.metaFontSize),
})

const normalizePlantLayoutPageSettings = (raw: any): PlantLayoutPageSettings => ({
  columns: clampNumber(raw?.columns, 1, 4, DEFAULT_PLANT_LAYOUT_PAGE_SETTINGS.columns),
  rows: clampNumber(raw?.rows, 1, 6, DEFAULT_PLANT_LAYOUT_PAGE_SETTINGS.rows),
})

export const normalizePlantLayoutSettings = (raw: any): PlantLayoutSettings => {
  const global = {
    pagePadding: clampNumber(raw?.global?.pagePadding, 8, 32, DEFAULT_PLANT_LAYOUT_SETTINGS.global.pagePadding),
    cardGap: clampNumber(raw?.global?.cardGap, 4, 24, DEFAULT_PLANT_LAYOUT_SETTINGS.global.cardGap),
    sectionGap: clampNumber(raw?.global?.sectionGap, 4, 24, DEFAULT_PLANT_LAYOUT_SETTINGS.global.sectionGap),
    ...normalizePlantLayoutCardTuning(raw?.global, DEFAULT_PLANT_LAYOUT_SETTINGS.global),
  }

  const cards = Object.fromEntries(
    Object.entries(raw?.cards || {}).flatMap(([key, value]) => {
      const normalizedKey = String(key || '').trim()
      if (!normalizedKey) return []
      return [[normalizedKey, normalizePlantLayoutCardTuning(value, global)]]
    })
  ) as Record<string, PlantLayoutCardTuning>

  const pages = Object.fromEntries(
    Object.entries(raw?.pages || {}).flatMap(([key, value]) => {
      const normalizedKey = String(key || '').trim()
      if (!normalizedKey) return []
      return [[normalizedKey, normalizePlantLayoutPageSettings(value)]]
    })
  ) as Record<string, PlantLayoutPageSettings>

  return { global, cards, pages }
}

export const resolvePlantLayoutCardTuning = (settings: PlantLayoutSettings | null | undefined, key: string): PlantLayoutCardTuning => {
  const normalized = settings ? normalizePlantLayoutSettings(settings) : DEFAULT_PLANT_LAYOUT_SETTINGS
  const override = normalized.cards[String(key || '').trim()]
  if (!override) {
    return {
      cardHeight: normalized.global.cardHeight,
      imageHeight: normalized.global.imageHeight,
      cardPadding: normalized.global.cardPadding,
      contentOffsetY: normalized.global.contentOffsetY,
      titleFontSize: normalized.global.titleFontSize,
      subtitleFontSize: normalized.global.subtitleFontSize,
      metaFontSize: normalized.global.metaFontSize,
    }
  }

  return {
    cardHeight: override.cardHeight ?? normalized.global.cardHeight,
    imageHeight: override.imageHeight ?? normalized.global.imageHeight,
    cardPadding: override.cardPadding ?? normalized.global.cardPadding,
    contentOffsetY: override.contentOffsetY ?? normalized.global.contentOffsetY,
    titleFontSize: override.titleFontSize ?? normalized.global.titleFontSize,
    subtitleFontSize: override.subtitleFontSize ?? normalized.global.subtitleFontSize,
    metaFontSize: override.metaFontSize ?? normalized.global.metaFontSize,
  }
}

export const resolvePlantLayoutPageSettings = (settings: PlantLayoutSettings | null | undefined, pageIndex: number): PlantLayoutPageSettings => {
  const normalized = settings ? normalizePlantLayoutSettings(settings) : DEFAULT_PLANT_LAYOUT_SETTINGS
  const pageKey = String(pageIndex)
  const override = normalized.pages[pageKey]
  if (!override) {
    return { ...DEFAULT_PLANT_LAYOUT_PAGE_SETTINGS }
  }
  return {
    columns: override.columns ?? DEFAULT_PLANT_LAYOUT_PAGE_SETTINGS.columns,
    rows: override.rows ?? DEFAULT_PLANT_LAYOUT_PAGE_SETTINGS.rows,
  }
}

const DEFAULT_PLANT_LAYOUT_PAGE_CONTENT_HEIGHT = PLANT_LAYOUT_A4_HEIGHT_PX - (DEFAULT_PLANT_LAYOUT_SETTINGS.global.pagePadding * 2)
const DEFAULT_PLANT_LAYOUT_SECTION_HEADER_HEIGHT = 24

export const estimatePlantLayoutContentHeight = (settings: PlantLayoutSettings | null | undefined) => {
  const normalized = settings ? normalizePlantLayoutSettings(settings) : DEFAULT_PLANT_LAYOUT_SETTINGS
  const paddingDelta = normalized.global.pagePadding - DEFAULT_PLANT_LAYOUT_SETTINGS.global.pagePadding
  return Math.max(520, DEFAULT_PLANT_LAYOUT_PAGE_CONTENT_HEIGHT - (paddingDelta * 2))
}

export function paginatePlantLayoutCards<T extends { key: string; categoryLabel: string }>(
  cards: T[],
  settings: PlantLayoutSettings | null | undefined,
  getCardHeight: (card: T) => number,
  columns: number = 3
): Array<PlantLayoutPage<T>> {
  if (!cards.length) return []

  const normalized = settings ? normalizePlantLayoutSettings(settings) : DEFAULT_PLANT_LAYOUT_SETTINGS
  const usesPageOverrides = Object.keys(normalized.pages || {}).length > 0
  const availableHeight = estimatePlantLayoutContentHeight(normalized)
  const pages: Array<PlantLayoutPage<T>> = []
  let currentSections: Array<PlantLayoutPageSection<T>> = []
  let currentHeight = 0
  let currentRowCount = 0
  let pageIndex = 0
  let currentColumns = usesPageOverrides ? resolvePlantLayoutPageSettings(normalized, pageIndex).columns : columns
  let currentRowsLimit = usesPageOverrides ? resolvePlantLayoutPageSettings(normalized, pageIndex).rows : Number.MAX_SAFE_INTEGER

  const pushPage = () => {
    const cardsOnPage = currentSections.flatMap((section) => section.cards)
    if (!cardsOnPage.length) return
    pages.push({
      index: pageIndex,
      columns: currentColumns,
      rows: usesPageOverrides ? currentRowsLimit : Math.max(1, Math.ceil(cardsOnPage.length / currentColumns)),
      cards: cardsOnPage,
      sections: currentSections.map((section) => ({
        label: section.label,
        cards: [...section.cards],
      })),
    })
    currentSections = []
    currentHeight = 0
    currentRowCount = 0
    pageIndex += 1

    if (usesPageOverrides) {
      const nextPageLayout = resolvePlantLayoutPageSettings(normalized, pageIndex)
      currentColumns = nextPageLayout.columns
      currentRowsLimit = nextPageLayout.rows
    }
  }

  const groupedSections = cards.reduce<Array<PlantLayoutPageSection<T>>>((result, card) => {
    const lastSection = result[result.length - 1]
    if (!lastSection || lastSection.label !== card.categoryLabel) {
      result.push({ label: card.categoryLabel, cards: [card] })
    } else {
      lastSection.cards.push(card)
    }
    return result
  }, [])

  groupedSections.forEach((section) => {
    let rowStart = 0

    while (rowStart < section.cards.length) {
      const rowCards = section.cards.slice(rowStart, rowStart + currentColumns)
      const rowHeight = rowCards.reduce((max, card) => Math.max(max, getCardHeight(card)), 0)
      const needsHeader = !currentSections.some((entry) => entry.label === section.label)
      const headerHeight = needsHeader ? DEFAULT_PLANT_LAYOUT_SECTION_HEADER_HEIGHT : 0
      const sectionSpacing = currentSections.length > 0 && needsHeader ? normalized.global.sectionGap : 0
      const rowSpacing = currentHeight > 0 && !needsHeader ? normalized.global.cardGap : 0
      const nextHeight = currentHeight + sectionSpacing + headerHeight + rowSpacing + rowHeight
      const exceedsRowLimit = currentRowCount >= currentRowsLimit

      if ((currentHeight > 0 && nextHeight > availableHeight) || (currentHeight > 0 && exceedsRowLimit)) {
        pushPage()
        continue
      }

      const targetSectionSpacing = currentSections.length > 0 && !currentSections.some((entry) => entry.label === section.label)
        ? normalized.global.sectionGap
        : 0
      const targetNeedsHeader = !currentSections.some((entry) => entry.label === section.label)
      const targetHeaderHeight = targetNeedsHeader ? DEFAULT_PLANT_LAYOUT_SECTION_HEADER_HEIGHT : 0
      const targetRowSpacing = currentHeight > 0 && !targetNeedsHeader ? normalized.global.cardGap : 0

      let targetSection = currentSections.find((entry) => entry.label === section.label)
      if (!targetSection) {
        targetSection = { label: section.label, cards: [] }
        currentSections.push(targetSection)
      }
      targetSection.cards.push(...rowCards)

      currentHeight += targetSectionSpacing + targetHeaderHeight + targetRowSpacing + rowHeight
      currentRowCount += 1
      rowStart += rowCards.length
    }
  })

  pushPage()
  return pages.length ? pages : [{ index: 0, columns, rows: 0, cards: [], sections: [] }]
}

const normalizeValue = (value?: string | null) =>
  (value || '')
    .normalize('NFKC')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()

export const normalizePlantDocumentMode = (value?: string | null): PlantDocumentMode => {
  const normalized = normalizeValue(value)

  if (normalized === 'tree' || normalized === 'shrub' || normalized === 'material' || normalized === 'exclude') {
    return normalized
  }

  return 'auto'
}

export const buildPlantSpeciesKey = (row: PlantMaterialSeed) =>
  [
    normalizeValue(row.item_name),
    normalizeValue(row.english_name),
    normalizeValue(row.scientific_name),
  ].join('|')

export const buildPlantVariantKey = (row: PlantMaterialSeed) =>
  [
    buildPlantSpeciesKey(row),
    normalizeValue(row.item_category || 'other'),
    normalizeValue(row.size_mode || 'other'),
    normalizeValue(row.size_label),
    normalizeValue(row.unit || 'หน่วย'),
  ].join('|')

export const buildPlantDocumentCardKey = (row: PlantMaterialSeed) =>
  [
    buildPlantSpeciesKey(row),
    normalizeValue(row.image_url || ''),
    normalizeValue(row.item_category || 'other'),
    normalizeValue(row.plant_document_mode || 'auto'),
    normalizeValue(row.size_mode || 'other'),
  ].join('|')

const SYSTEM_KEYWORDS = [
  'ระบบน้ำ',
  'ระบบไฟ',
  'ระบบระบายน้ำ',
  'ระบบบำบัด',
  'ระบบกรอง',
  'ระบบพ่นหมอก',
  'irrigation',
  'sprinkler',
  'drain',
  'drainage',
  'sewer',
  'plumbing',
  'lighting system',
  'electrical',
  'wiring',
  'conduit',
  'timer',
  'controller',
  'valve',
  'pump',
  'filter',
  'pipe',
  'pvc',
  'hdpe',
  'u-pvc',
  'upvc',
  'main line',
  'submain',
  'ท่อ',
  'ปั๊ม',
  'วาล์ว',
  'สายไฟ',
  'ไฟส่องสว่าง',
  'ตู้คอนโทรล',
]

const DECORATIVE_MATERIAL_KEYWORDS = [
  'วัสดุ',
  'วัสดุตกแต่ง',
  'วัสดุก่อสร้าง',
  'แผ่นทางเดิน',
  'ทางเดิน',
  'แผ่นปู',
  'หิน',
  'หินตกแต่ง',
  'หินกาบ',
  'หินกรวด',
  'กรวด',
  'กรวดล้าง',
  'กรวดแม่น้ำ',
  'หินเกล็ด',
  'ศิลา',
  'อิฐ',
  'บล็อกปู',
  'paver',
  'paving',
  'stepping stone',
  'stone',
  'gravel',
  'pebble',
  'rock',
  'mulch',
  'bark',
  'wood chip',
  'edging',
  'border stone',
  'decorative',
  'hardscape',
  'planter',
  'กระถาง',
  'โอ่ง',
]

const getPlantDocumentSourceText = (row: PlantMaterialSeed) =>
  [
    row.item_name,
    row.english_name,
    row.scientific_name,
    row.detail,
    row.spec,
    row.category_name,
    row.zone_name,
  ]
    .map((value) => normalizeValue(value))
    .filter(Boolean)
    .join(' | ')

export const isPlantDocumentSystemLike = (row: PlantMaterialSeed) => {
  const haystack = getPlantDocumentSourceText(row)
  return SYSTEM_KEYWORDS.some((keyword) => haystack.includes(keyword))
}

export const getPlantDocumentCategory = (row: PlantMaterialSeed): PlantDocumentCategory | null => {
  const explicitMode = normalizePlantDocumentMode(row.plant_document_mode)

  if (explicitMode === 'exclude') return null
  if (explicitMode === 'tree' || explicitMode === 'shrub' || explicitMode === 'material') return explicitMode

  if (isPlantDocumentSystemLike(row)) return null

  const itemCategory = normalizeValue(row.item_category || '')
  const sizeMode = normalizeValue(row.size_mode || '')
  const categoryName = normalizeValue(row.category_name || '')
  const haystack = getPlantDocumentSourceText(row)

  if (itemCategory === 'tree' || itemCategory === 'palm') return 'tree'
  if (itemCategory === 'shrub') return 'shrub'
  if (itemCategory === 'material') return 'material'

  if (categoryName.includes('ต้นไม้ใหญ่') || categoryName.includes('tree') || sizeMode === 'tree') return 'tree'
  if (categoryName.includes('ไม้พุ่ม') || categoryName.includes('shrub') || sizeMode === 'shrub') return 'shrub'

  if (categoryName.includes('วัสดุ') || categoryName.includes('hardscape')) return 'material'
  if (DECORATIVE_MATERIAL_KEYWORDS.some((keyword) => haystack.includes(keyword))) return 'material'

  return null
}

export const isPlantDocumentEligible = (row: PlantMaterialSeed) => getPlantDocumentCategory(row) !== null

export const getPlantDocumentCategoryLabel = (category: PlantDocumentCategory) => {
  if (category === 'tree') return 'ต้นไม้ใหญ่'
  if (category === 'shrub') return 'ไม้พุ่ม'
  return 'วัสดุก่อสร้างและตกแต่ง'
}

export function dedupePlantMaterials(rows: PlantMaterialSeed[]): PlantMaterialSeed[] {
  const variants = new Map<string, PlantMaterialSeed>()

  for (const row of rows) {
    const hasName =
      normalizeValue(row.item_name) ||
      normalizeValue(row.english_name) ||
      normalizeValue(row.scientific_name)

    if (!hasName) continue

    const key = buildPlantVariantKey(row)
    const previous = variants.get(key)

    if (!previous) {
      variants.set(key, {
        ...row,
        item_category: row.item_category || 'other',
        size_mode: (row.size_mode || 'other') as PlantMaterialSeed['size_mode'],
        unit: row.unit || 'หน่วย',
      })
      continue
    }

    variants.set(key, {
      ...previous,
      item_name: previous.item_name || row.item_name,
      english_name: previous.english_name || row.english_name,
      scientific_name: previous.scientific_name || row.scientific_name,
      item_category: previous.item_category || row.item_category || 'other',
      size_label: previous.size_label || row.size_label,
      size_mode: previous.size_mode || row.size_mode || 'other',
      unit: previous.unit || row.unit || 'หน่วย',
      material_price: Number(previous.material_price ?? row.material_price ?? 0),
      labor_price: Number(previous.labor_price ?? row.labor_price ?? 0),
      image_url: previous.image_url || row.image_url || null,
    })
  }

  return Array.from(variants.values())
}

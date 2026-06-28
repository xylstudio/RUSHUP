import { jsPDF } from 'jspdf'
import html2canvas from 'html2canvas'
import { getSystemSettings } from '@/lib/supabaseClient'
import { buildContractDocumentViewModel } from '@/lib/contractDocumentShared'
import { buildPlantDocumentCardKey, getPlantDocumentCategory, getPlantDocumentCategoryLabel, isPlantDocumentEligible, normalizePlantLayoutSettings, paginatePlantLayoutCards, resolvePlantLayoutCardTuning } from '@/lib/plantMaterial'

type AnyDoc = any

// Default Configurations (Fallback)
const DEFAULTS = {
    company_info: {
      name_th: 'บริษัท เอ็กซ์วายแอล แลนด์สเคป จำกัด', // Fallback
      name_en: 'XYLEM LANDSCAPE CO., LTD.',
      address: '158/13-14 หมู่บ้าน บ้านสวนพรีเมียร์ หมู่ที่ 6 ต.หนองจ๊อม อ.สันทราย จ.เชียงใหม่',
      tax_id: '0505567008779',
      phone: '02-xxx-xxxx',
      email: 'contact@xylem.co.th',
            logo_url: '',
            contract_company_name: 'บริษัท เอ็กซ์วายแอล สตูดิโอ จำกัด',
            contract_company_address: '158/13-14 หมู่บ้านบ้านสวนธาร หมู่ที่ 6 ซอย 1 ถนนเชียงใหม่-เชียงราย ตำบลเชิงดอย อำเภอดอยสะเก็ด จังหวัดเชียงใหม่ 50220',
            contract_company_tax_id: '0505568019024',
            contract_signer_name: 'นางสาวเจนจิรา วงค์โพธิสาร',
            contract_witness_name: 'นายศุภโชค บุรีคำ',
    },
    financial_info: {
      bank_name: 'ธนาคารกสิกรไทย',
      account_no: '180-3-31959-5',
      account_name: 'บจก. เอ็กซ์วายแอล แลนด์สเคป',
      branch: 'สาขาสันทราย',
      promptpay_id: '',
      bank_code: '',
      bank_icon: ''
    }
}

const BANK_ICON_BY_CODE: Record<string, string> = {
    kbank: '/bank-icons/kbank.png',
    scb: '/bank-icons/scb.png',
    ktb: '/bank-icons/KTB.png',
}

function inferBankIcon(bankName: string | null | undefined) {
    const name = String(bankName || '').toLowerCase()
    if (name.includes('กสิกร') || name.includes('kbank') || name.includes('kasikorn')) return '/bank-icons/kbank.png'
    if (name.includes('ไทยพาณิชย์') || name.includes('siam commercial') || name.includes('scb')) return '/bank-icons/scb.png'
    if (name.includes('กรุงไทย') || name.includes('krungthai') || name.includes('krung thai') || name.includes('ktb')) return '/bank-icons/KTB.png'
    return ''
}

function asTHB(amount: number | null | undefined) {
    const value = typeof amount === 'number' ? amount : 0
    return new Intl.NumberFormat('th-TH', {
        style: 'currency',
        currency: 'THB',
        maximumFractionDigits: 0,
    }).format(value)
}

function toThaiIntegerText(value: number): string {
    const digits = ['ศูนย์', 'หนึ่ง', 'สอง', 'สาม', 'สี่', 'ห้า', 'หก', 'เจ็ด', 'แปด', 'เก้า']
    const positions = ['', 'สิบ', 'ร้อย', 'พัน', 'หมื่น', 'แสน']

    if (value === 0) return digits[0]

    const renderChunk = (chunk: number): string => {
        const numbers = String(chunk).split('').map((char) => Number(char))
        let result = ''

        numbers.forEach((digit, index) => {
            if (digit === 0) return
            const pos = numbers.length - index - 1

            if (pos === 0 && digit === 1 && numbers.length > 1) {
                result += 'เอ็ด'
                return
            }

            if (pos === 1) {
                if (digit === 1) {
                    result += 'สิบ'
                    return
                }
                if (digit === 2) {
                    result += 'ยี่สิบ'
                    return
                }
            }

            result += `${digits[digit]}${positions[pos] || ''}`
        })

        return result
    }

    const parts: string[] = []
    let remaining = Math.floor(Math.abs(value))

    while (remaining > 0) {
        parts.unshift(renderChunk(remaining % 1_000_000))
        remaining = Math.floor(remaining / 1_000_000)
    }

    return parts
        .map((part, index) => (index < parts.length - 1 ? `${part}ล้าน` : part))
        .join('')
}

function asThaiBahtText(amount: number | null | undefined) {
    const value = typeof amount === 'number' ? amount : 0
    const integerPart = Math.floor(Math.abs(value))
    const satang = Math.round((Math.abs(value) - integerPart) * 100)
    const bahtText = `${toThaiIntegerText(integerPart)}บาท`

    if (satang === 0) return `${bahtText}ถ้วน`
    return `${bahtText}${toThaiIntegerText(satang)}สตางค์`
}

function asTHBOrBlank(amount: number | null | undefined) {
    const value = typeof amount === 'number' ? amount : 0
    if (!Number.isFinite(value) || value <= 0) return '&nbsp;'
    return asTHB(value)
}

function asDate(iso: string | null | undefined) {
    if (!iso) return '-'
    try {
        return new Date(iso).toLocaleDateString('th-TH')
    } catch {
        return iso
    }
}

function formatNumber(value: number | null | undefined) {
    const num = typeof value === 'number' ? value : 0
    if (!Number.isFinite(num)) return '0'
    if (Number.isInteger(num)) return num.toLocaleString('en-US')
    return num.toLocaleString('en-US', { maximumFractionDigits: 2 })
}

function parseManualPayload(doc: AnyDoc) {
    const raw = doc?.description
    if (!raw || typeof raw !== 'string') return null
    try {
        const parsed = JSON.parse(raw)
        return parsed?.kind === 'manual_document' ? parsed : null
    } catch {
        return null
    }
}

function paymentMethodLabel(value: string | null | undefined) {
    const key = String(value || '').toLowerCase()
    if (key === 'bank_transfer' || key === 'transfer') return 'โอนเงิน (Transfer)'
    if (key === 'credit_card') return 'บัตรเครดิต (Credit Card)'
    if (key === 'cash') return 'เงินสด (Cash)'
    if (key === 'cheque') return 'เช็ค (Cheque)'
    if (key === 'other') return 'อื่นๆ (Other)'
    return '-'
}

function getPlantCategoryTheme(label: string | null | undefined) {
    const text = String(label || '').toLowerCase()
    if (text.includes('ต้นไม้') || text.includes('tree')) {
        return {
            accent: '#047857',
            soft: '#d1fae5',
            border: '#a7f3d0',
            tag: 'TREE',
        }
    }
    if (text.includes('พุ่ม') || text.includes('shrub')) {
        return {
            accent: '#059669',
            soft: '#dcfce7',
            border: '#86efac',
            tag: 'SHRUB',
        }
    }
    return {
        accent: '#0f766e',
        soft: '#ccfbf1',
        border: '#99f6e4',
        tag: 'MATERIAL',
    }
}

function collectItems(doc: AnyDoc, manual: any) {
    if (Array.isArray(manual?.items) && manual.items.length) {
        return manual.items.map((it: any) => ({
            description: it.description || 'รายการ',
            quantity: Number(it.quantity) || 1,
            unit_price: Number(it.unit_price) || 0,
        }))
    }

    const rows: Array<{ description: string; quantity: number; unit_price: number }> = []
    const mainDescription = doc?.orders?.services?.service_name || 'ค่าบริการ'
    const mainPrice = doc?.orders?.calculated_price ?? doc?.orders?.base_price ?? doc?.orders?.total ?? 0
    rows.push({ description: mainDescription, quantity: 1, unit_price: Number(mainPrice) || 0 })

    for (const addon of doc?.orders?.order_additional_services || []) {
        rows.push({
            description: addon?.additional_services?.service_name || 'บริการเพิ่มเติม',
            quantity: Number(addon?.quantity) || 1,
            unit_price: Number(addon?.unit_price) || 0,
        })
    }

    return rows
}

function escapeHtml(text: string | null | undefined) {
    return String(text || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;')
}

function renderPdfContractTitle(title: string) {
    const safeTitle = escapeHtml(title)
    return `
        <svg xmlns="http://www.w3.org/2000/svg" width="720" height="34" viewBox="0 0 720 34" role="img" aria-label="${safeTitle}" style="display:block; width:min(100%, 720px); height:30px; margin:0 auto; overflow:visible;">
            <text x="360" y="24" text-anchor="middle" font-family="Sarabun, 'Noto Sans Thai', 'Segoe UI', Arial, sans-serif" font-size="22" font-weight="800" fill="#111827">${safeTitle}</text>
        </svg>
    `
}

function renderPdfPageHeader(title: string, dateText: string) {
    const safeTitle = escapeHtml(title)
    const safeDateText = escapeHtml(dateText)
    return `
        <div style="display:grid; grid-template-columns:minmax(0,1fr) auto; align-items:start; column-gap:16px; margin-bottom:16px;">
            <div style="font-size:11px; font-weight:800; color:#6b7280; white-space:nowrap; word-break:keep-all; overflow-wrap:normal; line-height:1.1;">${safeTitle}</div>
            <div style="font-size:10px; font-weight:700; letter-spacing:0.16em; color:#6b7280; white-space:nowrap; line-height:1.1; text-align:right;">${safeDateText}</div>
        </div>
    `
}

function renderPdfItemNameBlock(item: any, includeDetail: boolean = true) {
    const description = escapeHtml(item?.description || '-')
    const englishName = String(item?.englishName || item?.english_name || item?.english || '').trim()
    const scientificName = String(item?.scientificName || item?.scientific_name || item?.spec || '').trim()
    const detail = includeDetail ? renderItemDetailList(item?.detail) : ''

    return `${description}`
    + `${englishName ? `<div style='display:block; color:#334155; font-size:10px; margin-top:3px; line-height:1.34; font-weight:600;'>${escapeHtml(englishName)}</div>` : ''}`
    + `${scientificName ? `<div style='display:block; font-style:italic; color:#64748b; font-size:9.75px; margin-top:2px; line-height:1.3;'>${escapeHtml(scientificName)}</div>` : ''}`
        + `${detail}`
}

const PDF_FONT_STYLE_ID = 'xylem-pdf-sarabun-style'
const SARABUN_FONT_BASE = '/fonts/sarabun'

async function ensurePdfFontsLoaded() {
    if (typeof document === 'undefined') return

    if (!document.getElementById(PDF_FONT_STYLE_ID)) {
        const style = document.createElement('style')
        style.id = PDF_FONT_STYLE_ID
        style.textContent = `
                    @font-face {
                        font-family: 'Sarabun';
                        src: url('${SARABUN_FONT_BASE}/Sarabun-Regular.ttf') format('truetype');
                        font-style: normal;
                        font-weight: 400;
                        font-display: swap;
                    }
                    @font-face {
                        font-family: 'Sarabun';
                        src: url('${SARABUN_FONT_BASE}/Sarabun-Medium.ttf') format('truetype');
                        font-style: normal;
                        font-weight: 500;
                        font-display: swap;
                    }
                    @font-face {
                        font-family: 'Sarabun';
                        src: url('${SARABUN_FONT_BASE}/Sarabun-Bold.ttf') format('truetype');
                        font-style: normal;
                        font-weight: 700;
                        font-display: swap;
                    }
                    @font-face {
                        font-family: 'Sarabun';
                        src: url('${SARABUN_FONT_BASE}/Sarabun-ExtraBold.ttf') format('truetype');
                        font-style: normal;
                        font-weight: 800;
                        font-display: swap;
                    }
          @import url('https://fonts.googleapis.com/css2?family=Prompt:wght@400;500;600;700;800&display=swap');
          .premium-font,
          .premium-font * {
            font-family: 'Prompt', 'Noto Sans Thai', 'Sarabun', 'Segoe UI', Arial, sans-serif !important;
          }
        `
        document.head.appendChild(style)
    }

    const fontsApi = (document as any).fonts
    if (fontsApi?.load) {
        await Promise.allSettled([
            fontsApi.load("400 16px 'Sarabun'"),
            fontsApi.load("500 16px 'Sarabun'"),
            fontsApi.load("700 16px 'Sarabun'"),
            fontsApi.load("800 16px 'Sarabun'"),
        ])
    }

    if (fontsApi?.ready) {
        await fontsApi.ready
    }
}

function renderItemDetailList(detail: string | null | undefined) {
    const raw = String(detail || '').trim()
    if (!raw) return ''

    const normalized = raw
        .replace(/\r/g, '\n')
        .replace(/\s+[\-•*]\s+/g, '\n- ')

    let rows = normalized
        .split(/\n|;/)
        .map((line) => line.trim())
        .filter(Boolean)

    rows = rows
        .map((line) => line.replace(/^[\-•*]+\s*/, '').trim())
        .filter(Boolean)

    if (!rows.length) return ''

    return `<div style='display:block; margin-top:4px; color:#475569; font-size:9.5px; line-height:1.38;'>${rows
        .map((line) => `<div style='margin:0 0 2px 0;'>- ${escapeHtml(line)}</div>`)
        .join('')}</div>`
}

function splitCompanyAddress(address: string | null | undefined) {
    const full = String(address || '').trim()
    if (!full) return { line1: '-', line2: '' }

    const match = full.match(/\sอ\./)
    if (!match || typeof match.index !== 'number') {
        return { line1: full, line2: '' }
    }

    const splitIndex = match.index + 1
    return {
        line1: full.slice(0, splitIndex).trim(),
        line2: full.slice(splitIndex).trim(),
    }
}

const MM_PER_PX = 25.4 / 96
const PT_PER_PX = 72 / 96
const sarabunFontBinaryCache = new Map<string, string>()
const pdfImageDataCache = new Map<string, string | null>()

function pxToMm(value: number) {
    return value * MM_PER_PX
}

function pxToPt(value: number) {
    return value * PT_PER_PX
}

function ptToMm(value: number) {
    return value * 0.352778
}

function hexToRgb(hex: string) {
    const normalized = String(hex || '').replace('#', '').trim()
    const value = normalized.length === 3
        ? normalized.split('').map((char) => char + char).join('')
        : normalized.padEnd(6, '0').slice(0, 6)
    const numeric = Number.parseInt(value, 16)
    return {
        r: (numeric >> 16) & 255,
        g: (numeric >> 8) & 255,
        b: numeric & 255,
    }
}

function arrayBufferToBinaryString(buffer: ArrayBuffer) {
    const bytes = new Uint8Array(buffer)
    const chunkSize = 0x8000
    let binary = ''
    for (let index = 0; index < bytes.length; index += chunkSize) {
        const chunk = bytes.subarray(index, index + chunkSize)
        let chunkBinary = ''
        for (let chunkIndex = 0; chunkIndex < chunk.length; chunkIndex += 1) {
            chunkBinary += String.fromCharCode(chunk[chunkIndex])
        }
        binary += chunkBinary
    }
    return binary
}

async function fetchFontBinaryString(path: string) {
    if (sarabunFontBinaryCache.has(path)) {
        return sarabunFontBinaryCache.get(path) as string
    }
    const response = await fetch(path)
    if (!response.ok) {
        throw new Error(`Unable to load font: ${path}`)
    }
    const binary = arrayBufferToBinaryString(await response.arrayBuffer())
    sarabunFontBinaryCache.set(path, binary)
    return binary
}

async function ensureJsPdfSarabun(pdf: jsPDF) {
    const scopedPdf = pdf as any
    if (scopedPdf.__xylemSarabunReady) return

    const regularFile = 'Sarabun-Regular.ttf'
    const boldFile = 'Sarabun-Bold.ttf'
    const [regularBinary, boldBinary] = await Promise.all([
        fetchFontBinaryString(`${SARABUN_FONT_BASE}/${regularFile}`),
        fetchFontBinaryString(`${SARABUN_FONT_BASE}/${boldFile}`),
    ])

    pdf.addFileToVFS(regularFile, regularBinary)
    pdf.addFont(regularFile, 'Sarabun', 'normal')
    pdf.addFileToVFS(boldFile, boldBinary)
    pdf.addFont(boldFile, 'Sarabun', 'bold')
    scopedPdf.__xylemSarabunReady = true
}

function fitTextToWidth(pdf: jsPDF, text: string, maxWidth: number) {
    const normalized = String(text || '')
    if (!normalized) return ''
    if (pdf.getTextWidth(normalized) <= maxWidth) return normalized

    let trimmed = normalized
    while (trimmed.length > 0 && pdf.getTextWidth(`${trimmed}...`) > maxWidth) {
        trimmed = trimmed.slice(0, -1)
    }
    return trimmed ? `${trimmed}...` : '...'
}

function splitTextLines(pdf: jsPDF, text: string, maxWidth: number, maxLines: number) {
    const normalized = String(text || '').trim()
    if (!normalized) return [] as string[]
    const rawLines = pdf.splitTextToSize(normalized, Math.max(maxWidth, 1)) as string[]
    if (rawLines.length <= maxLines) return rawLines
    const trimmed = rawLines.slice(0, maxLines)
    trimmed[maxLines - 1] = fitTextToWidth(pdf, trimmed[maxLines - 1], maxWidth)
    return trimmed
}

function drawTextBlock(pdf: jsPDF, options: {
    text: string
    x: number
    y: number
    maxWidth: number
    fontSizePx: number
    lineHeight: number
    maxLines: number
    color?: string
    bold?: boolean
    align?: 'left' | 'right' | 'center'
    render?: boolean
}) {
    const {
        text,
        x,
        y,
        maxWidth,
        fontSizePx,
        lineHeight,
        maxLines,
        color = '#111111',
        bold = false,
        align = 'left',
        render = true,
    } = options

    pdf.setFont('Sarabun', bold ? 'bold' : 'normal')
    pdf.setFontSize(pxToPt(fontSizePx))
    const rgb = hexToRgb(color)
    pdf.setTextColor(rgb.r, rgb.g, rgb.b)

    const lines = splitTextLines(pdf, text, maxWidth, maxLines)
    if (!lines.length) {
        return { height: 0, lines: [] as string[] }
    }

    if (render) {
        pdf.text(lines, x, y, { baseline: 'top', maxWidth, align })
    }
    return {
        height: ptToMm(pxToPt(fontSizePx)) * lineHeight * lines.length,
        lines,
    }
}

function measurePlantPdfCardLayout(pdf: jsPDF, item: any, cardWidth: number, plantLayoutSettings: any) {
    const cardLayout = resolvePlantLayoutCardTuning(plantLayoutSettings, item.layoutKey || item.key || '')
    const baseCardHeight = pxToMm(cardLayout.cardHeight)
    const innerPadding = pxToMm(cardLayout.cardPadding)
    const imageWidth = cardWidth - (innerPadding * 2)
    const requestedImageHeight = pxToMm(cardLayout.imageHeight)
    const contentGapMm = pxToMm(6)
    const subtitleGapMm = pxToMm(4)
    const footerPaddingTopMm = pxToMm(6)
    const footerBottomGapMm = pxToMm(4)
    const footerValueGapMm = pxToMm(2)
    const contentOffsetMm = Math.max(0, pxToMm(cardLayout.contentOffsetY))
    const titleMaxWidth = cardWidth - (innerPadding * 2)
    const firstLine = Array.isArray(item.lines) && item.lines.length > 0
        ? item.lines[0]
        : { size: item.size || '-', qty: item.qty, unit: item.unit }
    const extraLineCount = Math.max(0, (Array.isArray(item.lines) ? item.lines.length : 1) - 1)
    const totalQtyText = `${item.qty || 0}${item.unit ? ` ${item.unit}` : ''}`.trim() || '-'
    const subtitleText = item.englishName || item.scientificName || item.detail || ''
    const footerMetaFontPx = Math.max(cardLayout.metaFontSize - 0.5, 6.5)

    const titleMetrics = drawTextBlock(pdf, {
        text: item.description || '-',
        x: 0,
        y: 0,
        maxWidth: titleMaxWidth,
        fontSizePx: cardLayout.titleFontSize,
        lineHeight: 1.42,
        maxLines: 2,
        color: '#111111',
        bold: true,
        render: false,
    })
    const subtitleMetrics = subtitleText
        ? drawTextBlock(pdf, {
            text: subtitleText,
            x: 0,
            y: 0,
            maxWidth: titleMaxWidth,
            fontSizePx: cardLayout.subtitleFontSize,
            lineHeight: 1.38,
            maxLines: 1,
            color: '#67675F',
            bold: false,
            render: false,
        })
        : { height: 0, lines: [] as string[] }
    const sizeLabelMetrics = drawTextBlock(pdf, {
        text: 'Size',
        x: 0,
        y: 0,
        maxWidth: imageWidth * 0.58,
        fontSizePx: Math.max(cardLayout.metaFontSize - 1, 6),
        lineHeight: 1.3,
        maxLines: 1,
        color: '#A3A39A',
        bold: true,
        render: false,
    })
    const sizeValueMetrics = drawTextBlock(pdf, {
        text: String(firstLine?.size || '-'),
        x: 0,
        y: 0,
        maxWidth: imageWidth * 0.58,
        fontSizePx: cardLayout.metaFontSize,
        lineHeight: 1.35,
        maxLines: 2,
        color: '#2B2B27',
        bold: true,
        render: false,
    })
    const qtyLabelMetrics = drawTextBlock(pdf, {
        text: 'Qty',
        x: 0,
        y: 0,
        maxWidth: imageWidth * 0.36,
        fontSizePx: Math.max(cardLayout.metaFontSize - 1, 6),
        lineHeight: 1.3,
        maxLines: 1,
        color: '#A3A39A',
        bold: true,
        render: false,
    })
    const qtyValueMetrics = drawTextBlock(pdf, {
        text: totalQtyText,
        x: 0,
        y: 0,
        maxWidth: imageWidth * 0.36,
        fontSizePx: cardLayout.metaFontSize + 1,
        lineHeight: 1.35,
        maxLines: 1,
        color: '#111111',
        bold: true,
        render: false,
    })
    const leftFooterHeight = sizeLabelMetrics.height + footerValueGapMm + sizeValueMetrics.height
    const rightFooterHeight = qtyLabelMetrics.height + footerValueGapMm + qtyValueMetrics.height
    const firstFooterRowHeight = Math.max(leftFooterHeight, rightFooterHeight)
    const footerLineMetrics = drawTextBlock(pdf, {
        text: extraLineCount > 0 ? `+${extraLineCount} size` : item.categoryLabel || '',
        x: 0,
        y: 0,
        maxWidth: imageWidth * 0.48,
        fontSizePx: footerMetaFontPx,
        lineHeight: 1.35,
        maxLines: 1,
        color: '#7B7B74',
        bold: false,
        render: false,
    })
    const scientificMetrics = drawTextBlock(pdf, {
        text: item.scientificName || '',
        x: imageWidth,
        y: 0,
        maxWidth: imageWidth * 0.48,
        fontSizePx: footerMetaFontPx,
        lineHeight: 1.35,
        maxLines: 1,
        color: '#7B7B74',
        bold: false,
        align: 'right',
        render: false,
    })
    const footerRowHeight = Math.max(footerLineMetrics.height, scientificMetrics.height)
    const footerContentHeight = footerPaddingTopMm + firstFooterRowHeight + footerBottomGapMm + footerRowHeight
    const requestedTextHeight = titleMetrics.height + (subtitleText ? subtitleGapMm + subtitleMetrics.height : 0)
    const effectiveCardHeight = Math.max(
        baseCardHeight,
        (innerPadding * 2) + requestedImageHeight + contentGapMm + contentOffsetMm + requestedTextHeight + footerContentHeight
    )

    return {
        cardLayout,
        effectiveCardHeight,
        innerPadding,
        imageWidth,
        requestedImageHeight,
        contentGapMm,
        subtitleGapMm,
        footerPaddingTopMm,
        footerBottomGapMm,
        footerMetaFontPx,
        titleMetrics,
        subtitleMetrics,
        sizeLabelMetrics,
        sizeValueMetrics,
        qtyLabelMetrics,
        qtyValueMetrics,
        firstFooterRowHeight,
        footerLineMetrics,
        scientificMetrics,
        footerContentHeight,
        firstLine,
        extraLineCount,
        totalQtyText,
        subtitleText,
    }
}

async function loadPdfImageData(url: string | null | undefined) {
    const key = String(url || '').trim()
    if (!key) return null
    if (pdfImageDataCache.has(key)) {
        return pdfImageDataCache.get(key) || null
    }

    try {
        const response = await fetch(key)
        if (!response.ok) throw new Error(`Unable to load image: ${key}`)
        const blob = await response.blob()
        const dataUrl = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader()
            reader.onloadend = () => resolve(reader.result as string)
            reader.onerror = () => reject(new Error(`Unable to read blob for image: ${key}`))
            reader.readAsDataURL(blob)
        })
        pdfImageDataCache.set(key, dataUrl)
        return dataUrl
    } catch (error) {
        console.warn('Failed to load PDF image', key, error)
        pdfImageDataCache.set(key, null)
        return null
    }
}

async function generatePlantMaterialPdf(params: {
    brandName: string
    code: string
    projectName: string
    plantLayoutSettings: any
    plantPages: Array<{ cards: any[]; columns?: number; rows?: number; sections?: Array<{ label: string; cards: any[] }> }>
}) {
    const { brandName, code, projectName, plantLayoutSettings, plantPages } = params
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
    await ensureJsPdfSarabun(pdf)

    const pageWidth = 210
    const pageHeight = 297

    for (let pageIndex = 0; pageIndex < plantPages.length; pageIndex += 1) {
        if (pageIndex > 0) pdf.addPage()

        const page = plantPages[pageIndex]
        const padding = pxToMm(plantLayoutSettings.global.pagePadding)
        const cardGap = pxToMm(plantLayoutSettings.global.cardGap)
        const sectionGap = pxToMm(plantLayoutSettings.global.sectionGap)
        let cursorY = padding

        pdf.setFillColor(255, 255, 255)
        pdf.rect(0, 0, pageWidth, pageHeight, 'F')

        drawTextBlock(pdf, {
            text: brandName,
            x: padding,
            y: cursorY,
            maxWidth: 70,
            fontSizePx: 11,
            lineHeight: 1.35,
            maxLines: 1,
            color: '#111111',
            bold: true,
        })
        drawTextBlock(pdf, {
            text: 'Plant Material Layout',
            x: padding,
            y: cursorY + 4.1,
            maxWidth: 70,
            fontSizePx: 8,
            lineHeight: 1.3,
            maxLines: 1,
            color: '#9A9A93',
            bold: true,
        })

        if (code) {
            drawTextBlock(pdf, {
                text: code,
                x: pageWidth - padding,
                y: cursorY,
                maxWidth: 52,
                fontSizePx: 7.5,
                lineHeight: 1.3,
                maxLines: 1,
                color: '#9A9A93',
                bold: true,
                align: 'right',
            })
        }
        if (projectName) {
            drawTextBlock(pdf, {
                text: projectName,
                x: pageWidth - padding,
                y: cursorY + 3.6,
                maxWidth: 52,
                fontSizePx: 7.5,
                lineHeight: 1.3,
                maxLines: 1,
                color: '#9A9A93',
                bold: true,
                align: 'right',
            })
        }

        const headerLineY = cursorY + 8.8
        pdf.setDrawColor(232, 229, 216)
        pdf.line(padding, headerLineY, pageWidth - padding, headerLineY)
        cursorY = headerLineY + 3.5

        const cards = Array.isArray(page?.cards) ? page.cards : []
        const pageSections = Array.isArray(page?.sections) && page.sections.length > 0
            ? page.sections
            : cards.reduce((sections: Array<{ label: string; cards: any[] }>, item: any) => {
                const label = String(item?.categoryLabel || 'รายการพืช')
                const lastSection = sections[sections.length - 1]
                if (!lastSection || lastSection.label !== label) {
                    sections.push({ label, cards: [item] })
                } else {
                    lastSection.cards.push(item)
                }
                return sections
            }, [])

        if (!pageSections.length) {
            drawTextBlock(pdf, {
                text: 'ไม่มีรายการพืชสำหรับเอกสารนี้',
                x: padding,
                y: cursorY + 8,
                maxWidth: pageWidth - (padding * 2),
                fontSizePx: 11,
                lineHeight: 1.4,
                maxLines: 1,
                color: '#6B7280',
                bold: false,
                align: 'center',
            })
            continue
        }

        for (let sectionIndex = 0; sectionIndex < pageSections.length; sectionIndex += 1) {
            const section = pageSections[sectionIndex]
            if (sectionIndex > 0) cursorY += sectionGap

            pdf.setFont('Sarabun', 'bold')
            pdf.setFontSize(pxToPt(11))
            pdf.setTextColor(17, 17, 17)
            pdf.text(section.label, padding, cursorY, { baseline: 'top' })
            const labelWidth = pdf.getTextWidth(section.label)
            pdf.setDrawColor(232, 229, 216)
            pdf.line(padding + labelWidth + 3, cursorY + 1.6, pageWidth - padding, cursorY + 1.6)
            cursorY += 4.2

            const availableWidth = pageWidth - (padding * 2)
            const pageColumns = Math.max(1, Number(page?.columns) || 3)
            const interCardGapWidth = cardGap * Math.max(0, pageColumns - 1)
            const cardWidth = (availableWidth - interCardGapWidth) / pageColumns
            for (let rowStart = 0; rowStart < section.cards.length; rowStart += pageColumns) {
                const rowCards = section.cards.slice(rowStart, rowStart + pageColumns)
                const rowHeights = rowCards.map((card: any) => measurePlantPdfCardLayout(pdf, card, cardWidth, plantLayoutSettings).effectiveCardHeight)
                const rowHeight = Math.max(...rowHeights, 10)

                for (let columnIndex = 0; columnIndex < rowCards.length; columnIndex += 1) {
                    const item = rowCards[columnIndex]
                    const measuredCard = measurePlantPdfCardLayout(pdf, item, cardWidth, plantLayoutSettings)
                    const cardLayout = measuredCard.cardLayout
                    const cardX = padding + ((cardWidth + cardGap) * columnIndex)
                    const cardY = cursorY
                    const cardHeight = measuredCard.effectiveCardHeight
                    const innerPadding = measuredCard.innerPadding
                    const imageX = cardX + innerPadding
                    const imageY = cardY + innerPadding
                    const imageWidth = measuredCard.imageWidth
                    const imageData = await loadPdfImageData(item.imageUrl)
                    const firstLine = measuredCard.firstLine
                    const extraLineCount = measuredCard.extraLineCount
                    const totalQtyText = measuredCard.totalQtyText
                    const subtitleText = measuredCard.subtitleText
                    const footerMetaFontPx = measuredCard.footerMetaFontPx
                    const titleMetrics = measuredCard.titleMetrics
                    const subtitleMetrics = measuredCard.subtitleMetrics
                    const sizeLabelMetrics = measuredCard.sizeLabelMetrics
                    const sizeValueMetrics = measuredCard.sizeValueMetrics
                    const qtyLabelMetrics = measuredCard.qtyLabelMetrics
                    const qtyValueMetrics = measuredCard.qtyValueMetrics
                    const firstFooterRowHeight = measuredCard.firstFooterRowHeight
                    const footerLineMetrics = measuredCard.footerLineMetrics
                    const scientificMetrics = measuredCard.scientificMetrics
                    const footerContentHeight = measuredCard.footerContentHeight
                    const imageHeight = measuredCard.requestedImageHeight
                    const textStartY = imageY + imageHeight + measuredCard.contentGapMm + pxToMm(cardLayout.contentOffsetY)
                    const subtitleY = textStartY + titleMetrics.height + (subtitleText ? measuredCard.subtitleGapMm : 0)
                    const dividerY = cardY + cardHeight - innerPadding - footerContentHeight
                    const sizeBlockTop = dividerY + measuredCard.footerPaddingTopMm
                    const qtyBlockTop = dividerY + measuredCard.footerPaddingTopMm
                    const footerRowY = sizeBlockTop + firstFooterRowHeight + measuredCard.footerBottomGapMm

                    pdf.setDrawColor(231, 228, 215)
                    pdf.setFillColor(255, 255, 255)
                    pdf.rect(cardX, cardY, cardWidth, cardHeight, 'FD')

                    pdf.setDrawColor(236, 233, 220)
                    pdf.setFillColor(246, 244, 236)
                    pdf.rect(imageX, imageY, imageWidth, Math.max(imageHeight, 0), 'FD')
                    if (imageData && imageHeight > 0) {
                        pdf.addImage(imageData, 'PNG', imageX, imageY, imageWidth, imageHeight)
                    } else {
                        drawTextBlock(pdf, {
                            text: 'No Image',
                            x: imageX,
                            y: imageY + Math.max(imageHeight / 2, 2) - 1.8,
                            maxWidth: imageWidth,
                            fontSizePx: 9,
                            lineHeight: 1.3,
                            maxLines: 1,
                            color: '#A3A39A',
                            bold: true,
                            align: 'center',
                        })
                    }

                    drawTextBlock(pdf, {
                        text: item.description || '-',
                        x: imageX,
                        y: textStartY,
                        maxWidth: imageWidth,
                        fontSizePx: cardLayout.titleFontSize,
                        lineHeight: 1.42,
                        maxLines: 2,
                        color: '#111111',
                        bold: true,
                    })

                    if (subtitleText) {
                        drawTextBlock(pdf, {
                            text: subtitleText,
                            x: imageX,
                            y: subtitleY,
                            maxWidth: imageWidth,
                            fontSizePx: cardLayout.subtitleFontSize,
                            lineHeight: 1.38,
                            maxLines: 1,
                            color: '#67675F',
                            bold: false,
                        })
                    }

                    pdf.setDrawColor(240, 236, 221)
                    pdf.line(imageX, dividerY, imageX + imageWidth, dividerY)

                    drawTextBlock(pdf, {
                        text: 'Size',
                        x: imageX,
                        y: sizeBlockTop,
                        maxWidth: imageWidth * 0.58,
                        fontSizePx: Math.max(cardLayout.metaFontSize - 1, 6),
                        lineHeight: 1.3,
                        maxLines: 1,
                        color: '#A3A39A',
                        bold: true,
                    })
                    drawTextBlock(pdf, {
                        text: String(firstLine?.size || '-'),
                        x: imageX,
                        y: sizeBlockTop + 2.8,
                        maxWidth: imageWidth * 0.58,
                        fontSizePx: cardLayout.metaFontSize,
                        lineHeight: 1.35,
                        maxLines: 2,
                        color: '#2B2B27',
                        bold: true,
                    })
                    drawTextBlock(pdf, {
                        text: 'Qty',
                        x: imageX + imageWidth,
                        y: qtyBlockTop,
                        maxWidth: imageWidth * 0.36,
                        fontSizePx: Math.max(cardLayout.metaFontSize - 1, 6),
                        lineHeight: 1.3,
                        maxLines: 1,
                        color: '#A3A39A',
                        bold: true,
                        align: 'right',
                    })
                    drawTextBlock(pdf, {
                        text: totalQtyText,
                        x: imageX + imageWidth,
                        y: qtyBlockTop + 2.8,
                        maxWidth: imageWidth * 0.36,
                        fontSizePx: cardLayout.metaFontSize + 1,
                        lineHeight: 1.35,
                        maxLines: 1,
                        color: '#111111',
                        bold: true,
                        align: 'right',
                    })

                    drawTextBlock(pdf, {
                        text: extraLineCount > 0 ? `+${extraLineCount} size` : item.categoryLabel || '',
                        x: imageX,
                        y: footerRowY,
                        maxWidth: imageWidth * 0.48,
                        fontSizePx: footerMetaFontPx,
                        lineHeight: 1.35,
                        maxLines: 1,
                        color: '#7B7B74',
                        bold: false,
                    })
                    drawTextBlock(pdf, {
                        text: item.scientificName || '',
                        x: imageX + imageWidth,
                        y: footerRowY,
                        maxWidth: imageWidth * 0.48,
                        fontSizePx: footerMetaFontPx,
                        lineHeight: 1.35,
                        maxLines: 1,
                        color: '#7B7B74',
                        bold: false,
                        align: 'right',
                    })
                }

                cursorY += rowHeight + cardGap
            }
        }
    }

    const blob = pdf.output('blob')
    const url = URL.createObjectURL(blob)
    return { url, blob }
}

export async function generateDocumentPdfUrl(doc: AnyDoc, options?: { isCopy?: boolean; includeCopy?: boolean }): Promise<{ url: string; blob: Blob }> {
    await ensurePdfFontsLoaded()
        // 1. Fetch System Settings from Supabase
        let companyInfo = { ...DEFAULTS.company_info }
        let financialInfo = { ...DEFAULTS.financial_info }
        try {
                const { data: settingsData } = await getSystemSettings()
                if (settingsData && settingsData.length > 0) {
                        settingsData.forEach((row: any) => {
                                if (row.key === 'company_info') companyInfo = { ...companyInfo, ...row.value }
                                if (row.key === 'financial_info') financialInfo = { ...financialInfo, ...row.value }
                        })
                }
        } catch (e) {
                console.warn('Failed to fetch system settings for PDF generation, using defaults', e)
        }

        const manual = parseManualPayload(doc)
        // --- Compose Data for PDF ---
        // Fallbacks for all fields
        const type = doc?.type || 'quotation'
        const isReceipt = type === 'receipt'
        const titleTh = type === 'quotation'
            ? 'ใบเสนอราคา'
            : type === 'invoice'
                ? 'ใบแจ้งหนี้'
                : type === 'receipt'
                    ? 'ใบเสร็จรับเงิน'
                    : type === 'plant_material'
                        ? 'เอกสารพืช (Plant Material)'
                        : type === 'contract'
                            ? 'สัญญา'
                            : 'เอกสาร'
        const titleEn = type === 'quotation'
            ? 'QUOTATION'
            : type === 'invoice'
                ? 'INVOICE'
                : type === 'receipt'
                    ? 'RECEIPT'
                    : type === 'plant_material'
                        ? 'PLANT MATERIAL'
                        : type === 'contract'
                            ? 'CONTRACT'
                            : ''
        const code = doc?.document_code || doc?.id?.slice?.(0, 8) || 'DOCUMENT'
        const createdAt = doc?.created_at || doc?.generated_at || new Date().toISOString()
        const company = {
                name: companyInfo.name_en || 'XYLEM LANDSCAPE',
                fullName: companyInfo.name_th || '',
                address: companyInfo.address || '',
                taxId: companyInfo.tax_id || '',
                phone: companyInfo.phone || '',
        }
        const companyAddressLines = splitCompanyAddress(company.address)
        const brandName = 'XYLEM LANDSCAPE'
        const orderProfile = doc?.orders?.profiles
        const orderHouse = doc?.orders?.houses
        const orderService = doc?.orders?.services
        const preferManualRecipient = type === 'plant_material'
        const customer = {
            name: preferManualRecipient
                ? manual?.recipient?.name || orderProfile?.display_name || orderProfile?.email || doc?.user_id || '-'
                : orderProfile?.display_name || orderProfile?.email || manual?.recipient?.name || doc?.user_id || '-',
            phone: preferManualRecipient
                ? manual?.recipient?.phone || orderProfile?.phone || '-'
                : orderProfile?.phone || manual?.recipient?.phone || '-',
            address: preferManualRecipient
                ? manual?.recipient?.address || orderHouse?.address || orderProfile?.address || '-'
                : orderHouse?.address || orderProfile?.address || manual?.recipient?.address || '-',
            taxId: preferManualRecipient
                ? manual?.recipient?.tax_id || manual?.recipient?.taxId || orderProfile?.tax_id || ''
                : orderProfile?.tax_id || manual?.recipient?.tax_id || manual?.recipient?.taxId || '',
            houseName: preferManualRecipient
                ? manual?.house_name || orderHouse?.name || orderHouse?.house_code || '-'
                : orderHouse?.name || orderHouse?.house_code || manual?.house_name || '-',
            project: preferManualRecipient
                ? manual?.project_name || orderService?.service_name || manual?.notes || '-'
                : manual?.project_name || orderService?.service_name || manual?.notes || '-',
        }
        const formatSizeDisplay = (row: any) => {
            const sizeMode = String(row?.size_mode || '').toLowerCase()
            const baseSize = typeof row?.size === 'string' && row.size.trim() ? row.size.trim() : ''
            const height = Number(row?.height_m) || 0
            const trunkDiameter = Number(row?.trunk_diameter_inch) || 0
            const treeHeightLabel = String(row?.tree_height_label || '').trim()
            const spacingX = Number(row?.spacing_x) || 0
            const spacingY = Number(row?.spacing_y) || 0
            const spacing = spacingX > 0 ? spacingX : spacingY
            const hasSpacing = spacingX > 0 && spacingY > 0

            if (sizeMode === 'tree') {
                if (trunkDiameter > 0 && treeHeightLabel) return `Ø ${Number(trunkDiameter.toFixed(2)).toString()}" H ${treeHeightLabel} m.`
                if (trunkDiameter > 0) return `Ø ${Number(trunkDiameter.toFixed(2)).toString()}"`
                if (treeHeightLabel) return `H ${treeHeightLabel} m.`
                return baseSize || '-'
            }

            if (sizeMode === 'other') {
                return baseSize || '-'
            }

            if (height > 0 && spacing > 0) {
                return `H.${height.toFixed(2)} m. @ ${spacing.toFixed(2)} m.`
            }
            if (height > 0) {
                return `H.${height.toFixed(2)} m.`
            }
            if (spacing > 0) {
                return `@ ${spacing.toFixed(2)} m.`
            }

            if (baseSize && hasSpacing) {
                return `${baseSize} | ${spacingX}x${spacingY} ม.`
            }
            if (hasSpacing) {
                return `${spacingX}x${spacingY} ม.`
            }
            return baseSize || '-'
        }
        // Items: support zones, categories, and items (grouped by zone)
        let zones: any[] = []
        if (Array.isArray(manual?.zones) && manual.zones.length > 0) {
            zones = manual.zones.map((z: any, zIdx: number) => ({
                name: z.name || `Zone ${zIdx + 1}`,
                categories: (z.categories || []).map((c: any) => ({
                    name: c.name || '',
                    laborPercentage: Number(c.labor_percentage) || 0,
                    items: (c.items || []).map((i: any, iIdx: number) => ({
                        id: i.id || String(iIdx + 1).padStart(2, '0'),
                        description: i.description || '-',
                        englishName: i.english_name || i.englishName || '',
                        detail: i.detail || i.details || '',
                        scientificName: i.spec || i.scientific_name || i.scientificName || '',
                        itemCategory: i.item_category || 'other',
                        plantDocumentMode: i.plant_document_mode || 'auto',
                        imageUrl: i.image_url || i.imageUrl || '',
                        sizeMode: i.size_mode || 'other',
                        size: formatSizeDisplay(i),
                        unit: i.unit || '-',
                        qty: Number(i.quantity) || 0,
                        materialPrice: Number(i.unit_price_material) || 0,
                        laborPrice: Number(i.unit_price_labor) || 0,
                    }))
                }))
            }))
        } else {
            // fallback: treat as single zone
            let items: any[] = []
            if (Array.isArray(manual?.items) && manual.items.length > 0) {
                items = manual.items.map((it: any, idx: number) => ({
                    id: it.id || String(idx + 1).padStart(2, '0'),
                    description: it.description || '-',
                    englishName: it.english_name || it.englishName || '',
                    detail: it.detail || it.details || '',
                    scientificName: it.spec || it.scientific_name || it.scientificName || '',
                    itemCategory: it.item_category || 'other',
                    plantDocumentMode: it.plant_document_mode || 'auto',
                    imageUrl: it.image_url || it.imageUrl || '',
                    sizeMode: it.size_mode || 'other',
                    size: formatSizeDisplay(it),
                    unit: it.unit || '-',
                    qty: Number(it.quantity) || 0,
                    materialPrice: Number(it.unit_price_material ?? it.unit_price) || 0,
                    laborPrice: Number(it.unit_price_labor) || 0,
                }))
            } else if (Array.isArray(doc?.items) && doc.items.length > 0) {
                items = doc.items.map((it: any, idx: number) => ({
                    id: it.id || String(idx + 1).padStart(2, '0'),
                    description: it.description || '-',
                    englishName: it.englishName || it.english_name || '',
                    detail: it.detail || it.details || '',
                    scientificName: it.scientificName || it.scientific_name || it.spec || '',
                    itemCategory: it.item_category || 'other',
                    plantDocumentMode: it.plant_document_mode || 'auto',
                    imageUrl: it.imageUrl || it.image_url || '',
                    sizeMode: it.size_mode || 'other',
                    size: it.size || '-',
                    unit: it.unit || '-',
                    qty: Number(it.qty) || 0,
                    materialPrice: Number(it.materialPrice) || 0,
                    laborPrice: Number(it.laborPrice) || 0,
                }))
            } else {
                items = collectItems(doc, manual).map((it: any, idx: number) => ({
                    id: String(idx + 1).padStart(2, '0'),
                    description: it.description || '-',
                    englishName: '',
                    detail: '',
                    scientificName: '',
                    itemCategory: 'other',
                    plantDocumentMode: 'auto',
                    imageUrl: '',
                    sizeMode: 'other',
                    size: '-',
                    unit: it.unit || '-',
                    qty: Number(it.quantity) || 0,
                    materialPrice: Number(it.unit_price) || 0,
                    laborPrice: 0,
                }))
            }
            zones = [{ name: '', categories: [{ name: '', items }] }]
        }

        if (type === 'plant_material') {
            zones = zones.map((zone: any, zIdx: number) => {
                const allItems = (zone.categories || []).flatMap((category: any) =>
                    (category.items || []).map((item: any) => ({
                        ...item,
                        category_name: category.name || '',
                        zone_name: zone.name || '',
                        scientific_name: item.scientificName || '',
                        english_name: item.englishName || '',
                        item_category: item.itemCategory || 'other',
                        plant_document_mode: item.plantDocumentMode || 'auto',
                        size_mode: item.sizeMode || 'other',
                    }))
                )

                const eligibleItems = allItems.filter((item: any) => isPlantDocumentEligible(item))
                const treeItems = eligibleItems.filter((item: any) => getPlantDocumentCategory(item) === 'tree')
                const shrubItems = eligibleItems.filter((item: any) => getPlantDocumentCategory(item) === 'shrub')
                const materialItems = eligibleItems.filter((item: any) => getPlantDocumentCategory(item) === 'material')

                const groupedCategories: any[] = []
                if (treeItems.length > 0) groupedCategories.push({ name: getPlantDocumentCategoryLabel('tree'), items: treeItems })
                if (shrubItems.length > 0) groupedCategories.push({ name: getPlantDocumentCategoryLabel('shrub'), items: shrubItems })
                if (materialItems.length > 0) groupedCategories.push({ name: getPlantDocumentCategoryLabel('material'), items: materialItems })

                return {
                    name: zone.name || `Zone ${zIdx + 1}`,
                    categories: groupedCategories.length > 0 ? groupedCategories : [{ name: getPlantDocumentCategoryLabel('tree'), items: [] }],
                }
            })
        }

        // Overhead & VAT config (from manual or system)
        const rawOverheadRate = typeof manual?.overhead_rate === 'number' ? manual.overhead_rate : 0
        const overheadRate = rawOverheadRate > 1 ? rawOverheadRate / 100 : rawOverheadRate
        const showOverhead = manual?.show_overhead !== false // default true
        const rawGlobalLaborRate = typeof manual?.global_labor_rate === 'number' ? manual.global_labor_rate : 0
        const globalLaborRate = rawGlobalLaborRate > 1 ? rawGlobalLaborRate / 100 : rawGlobalLaborRate
        const showGlobalLabor = manual?.show_global_labor === true
        const discountType = manual?.discount_type === 'percent' ? 'percent' : 'amount'
        const rawDiscountValue = typeof manual?.discount_value === 'number' ? manual.discount_value : NaN
        const rawDiscountAmount = typeof manual?.discount_amount === 'number' ? manual.discount_amount : 0
        const discountValue = Number.isFinite(rawDiscountValue)
            ? Math.max(rawDiscountValue, 0)
            : Number.isFinite(rawDiscountAmount)
                ? Math.max(rawDiscountAmount, 0)
                : 0
        const rawVatRate = typeof manual?.vat_rate === 'number' ? manual.vat_rate : 0
        const vatRate = rawVatRate > 1 ? rawVatRate / 100 : rawVatRate
        const showVat = manual?.show_vat === true // default false
        const rawWithholdingRate = typeof manual?.withholding_tax_rate === 'number' ? manual.withholding_tax_rate : 0
        const withholdingRate = rawWithholdingRate > 1 ? rawWithholdingRate / 100 : rawWithholdingRate
        const showWithholdingTax = manual?.show_withholding_tax === true && withholdingRate > 0
        const editableConditions = Array.isArray(manual?.conditions) ? manual.conditions : []
        const totalLabelText = typeof manual?.total_label === 'string' ? manual.total_label.trim() : ''
        const showTotalLabel = manual?.show_total_label === true && !!totalLabelText
        const showZones = manual?.show_zones === true || (Array.isArray(manual?.zones) && manual.zones.length > 1)
        const pageBreakPerCategory = manual?.page_break_per_category === true

        // Calculate per-zone and grand totals
        const zoneSummaries = zones.map(zone => {
            let zoneTotal = 0
            zone.categories.forEach((cat: any) => {
                let catMaterialTotal = 0
                cat.items.forEach((i: any) => {
                    catMaterialTotal += (i.qty * i.materialPrice)
                    // If laborPercentage is set, we use that for the whole category total calculation later
                    // instead of individual item labor prices to avoid double-counting.
                    const effectiveItemLabor = (Number(cat.laborPercentage) || 0) > 0 ? 0 : (i.qty * i.laborPrice)
                    zoneTotal += (i.qty * i.materialPrice) + effectiveItemLabor
                })
                const catLaborCost = catMaterialTotal * ((Number(cat.laborPercentage) || 0) / 100)
                zoneTotal += catLaborCost
            })
            return { name: zone.name, total: zoneTotal }
        })
        const subtotal = zoneSummaries.reduce((sum, z) => sum + z.total, 0)
        const overhead = showOverhead ? Math.round(subtotal * overheadRate) : 0
        const globalLabor = showGlobalLabor ? Math.round(subtotal * globalLaborRate) : 0
        const appliedDiscountAmount = discountType === 'percent'
            ? Math.min((subtotal + overhead + globalLabor) * (Math.min(discountValue, 100) / 100), subtotal + overhead + globalLabor)
            : Math.min(discountValue, subtotal + overhead + globalLabor)
        const discountedSubtotal = Math.max((subtotal + overhead + globalLabor) - appliedDiscountAmount, 0)
        const vat = showVat ? Math.round(discountedSubtotal * vatRate) : 0
        const beforeWithholdingTotal = discountedSubtotal + vat
        const withholdingTax = showWithholdingTax ? Math.round(beforeWithholdingTotal * withholdingRate) : 0
        const grandTotal = beforeWithholdingTotal - withholdingTax
        const manualTotalOverride = typeof manual?.total === 'number' && Number.isFinite(manual.total)
            ? Number(manual.total)
            : null
        const displayGrandTotal = manualTotalOverride !== null ? manualTotalOverride : grandTotal
        const currentInstallmentLabel = String(manual?.current_installment_label || '').trim()
        const currentInstallmentPercentRaw = Number(manual?.current_installment_percent)
        const currentInstallmentPercent = Number.isFinite(currentInstallmentPercentRaw) && currentInstallmentPercentRaw > 0
            ? currentInstallmentPercentRaw
            : (() => {
                if (!manual?.current_installment_id || !Array.isArray(manual?.installment_plan)) return 0
                const matched = manual.installment_plan.find((it: any) => String(it?.id) === String(manual.current_installment_id))
                const percent = Number(matched?.percent)
                return Number.isFinite(percent) && percent > 0 ? percent : 0
            })()
        const currentInstallmentScope = Array.isArray(manual?.installments)
            ? (() => {
                const matched = manual.installments.find((it: any) => String(it?.id) === String(manual?.current_installment_id || ''))
                return String(matched?.due_scope || '').trim()
            })()
            : ''
        const showInstallmentIndicator = type === 'invoice' && !!currentInstallmentLabel
        const receiptInstallmentPlan = Array.isArray(manual?.installments)
            ? manual.installments.map((it: any, idx: number) => ({
                id: String(it?.id || `inst-${idx + 1}`),
                label: String(it?.label || `งวดที่ ${idx + 1}`),
                amount: Number(it?.amount) || 0,
              }))
            : []
        const receiptAppliedInstallmentIds = Array.isArray(manual?.applied_installment_ids)
            ? manual.applied_installment_ids.map((id: any) => String(id || '').trim()).filter(Boolean)
            : []
        const receiptSelectedInstallments = receiptAppliedInstallmentIds.length > 0
            ? receiptInstallmentPlan.filter((it: any) => receiptAppliedInstallmentIds.includes(String(it.id)))
            : []
        const isReceiptInstallmentMode = type === 'receipt' && receiptSelectedInstallments.length > 0
        const receiptScopeText = isReceiptInstallmentMode ? 'รายงวด' : 'รวมทั้งใบแจ้งหนี้'
        const receiptInstallmentSummaryText = isReceiptInstallmentMode
            ? receiptSelectedInstallments.map((it: any) => `${it.label} (${asTHB(it.amount)})`).join(', ')
            : ''

        // Helper: Build rows with clear zone/category hierarchy
        type TableRowEntry = {
            html: string
            keepWithNext?: boolean
            kind?: 'zone' | 'category' | 'item' | 'zone_total' | 'empty' | 'zone_repeat'
            zoneName?: string
            categoryName?: string
        }

        const buildZoneHeaderRow = (zoneName: string): string => `
            <tr style="background:#f3f4f6;">
                <td colspan="8" style="border-bottom:1px solid #d1d5db; padding:10px 12px; font-size:11px; font-weight:700; color:#111827; line-height:1.4;">โซนพื้นที่: ${escapeHtml(zoneName)}</td>
            </tr>
        `

        const buildCategoryHeaderRow = (categoryName: string): string => `
            <tr style="background:#f9fafb;">
                <td colspan="8" style="border-bottom:1px solid #e5e7eb; padding:8px 12px; font-size:10.5px; font-weight:700; color:#4b5563; line-height:1.4;">หมวดหมู่: ${escapeHtml(categoryName)}</td>
            </tr>
        `

        function buildAllTableRows() {
            const allRows: TableRowEntry[] = []
            let itemIdx = 1

            if (!showZones) {
                zones.forEach((zone: any) => {
                    zone.categories.forEach((cat: any, cIdx: number) => {
                        const categoryLabel = cat.name || `Category ${cIdx + 1}`
                        allRows.push({
                            html: buildCategoryHeaderRow(categoryLabel),
                            keepWithNext: true,
                            kind: 'category',
                            categoryName: categoryLabel,
                        })

                        cat.items.forEach((item: any) => {
                            const isUsingCatLabor = (Number(cat.laborPercentage) || 0) > 0
                            const effectiveLaborPrice = isUsingCatLabor ? 0 : item.laborPrice
                            const lineTotal = (item.qty * item.materialPrice) + (item.qty * effectiveLaborPrice)
                            allRows.push({
                                html: `
                                <tr>
                                    <td style="border-bottom:1px solid #e5e7eb; padding:8px 5px; text-align:center; vertical-align:middle; font-size:10.5px; color:#6b7280;">${itemIdx++}</td>
                                    <td style="border-bottom:1px solid #e5e7eb; padding:8px 10px; vertical-align:top; font-size:11px; color:#111827; font-weight:500; white-space:normal; word-break:break-word; line-height:1.42;">
                                        ${renderPdfItemNameBlock(item)}
                                    </td>
                                    <td style="border-bottom:1px solid #e5e7eb; padding:8px 6px; text-align:center; vertical-align:middle; font-size:10px; color:#475569; white-space:normal; word-break:break-word; line-height:1.35;">${escapeHtml(item.size)}</td>
                                    <td style="border-bottom:1px solid #e5e7eb; padding:8px 6px; text-align:center; vertical-align:middle; font-size:10px; color:#475569;">${escapeHtml(item.unit)}</td>
                                    <td style="border-bottom:1px solid #e5e7eb; padding:8px 6px; text-align:center; vertical-align:middle; font-size:10.75px; color:#111827; font-weight:700;">${formatNumber(item.qty)}</td>
                                    <td style="border-bottom:1px solid #e5e7eb; padding:8px 6px; text-align:right; vertical-align:middle; font-size:10px; color:#334155; font-weight:600;">${asTHBOrBlank(item.materialPrice)}</td>
                                    <td style="border-bottom:1px solid #e5e7eb; padding:8px 6px; text-align:right; vertical-align:middle; font-size:10px; color:#334155; font-weight:600;">${isUsingCatLabor ? '-' : asTHBOrBlank(item.laborPrice)}</td>
                                    <td style="border-bottom:1px solid #e5e7eb; padding:8px 10px; text-align:right; vertical-align:middle; font-size:10.75px; color:#111827; font-weight:700;">${asTHBOrBlank(lineTotal)}</td>
                                </tr>
                                `,
                                kind: 'item',
                                categoryName: categoryLabel,
                            })
                        })

                        if ((Number(cat.laborPercentage) || 0) > 0) {
                            const catMaterialSubtotal = cat.items.reduce((sum: number, i: any) => sum + (i.qty * i.materialPrice), 0)
                            const laborCost = catMaterialSubtotal * (Number(cat.laborPercentage) / 100)
                            allRows.push({
                                html: `
                                <tr style="background:#fefce8;">
                                    <td style="border-bottom:1px solid #e5e7eb; padding:8px 5px;"></td>
                                    <td colspan="6" style="border-bottom:1px solid #e5e7eb; padding:8px 10px; font-size:10.5px; color:#111827; font-weight:700; text-align:right;">
                                        ค่าแรงหมวดหมู่${escapeHtml(categoryLabel)} ${cat.laborPercentage}% (คำนวณจากค่าวัสดุ ${asTHB(catMaterialSubtotal)})
                                    </td>
                                    <td style="border-bottom:1px solid #e5e7eb; padding:8px 10px; text-align:right; font-size:10.75px; color:#111827; font-weight:700;">${asTHB(laborCost)}</td>
                                </tr>
                                `,
                                kind: 'item',
                                categoryName: categoryLabel,
                            })
                        }
                    })
                })
            } else {
                zones.forEach((zone: any, zIdx: number) => {
                    const zoneLabel = zone.name || `Zone ${zIdx + 1}`
                    allRows.push({
                        html: buildZoneHeaderRow(zoneLabel),
                        keepWithNext: true,
                        kind: 'zone',
                        zoneName: zoneLabel,
                    })

                    zone.categories.forEach((cat: any, cIdx: number) => {
                        const categoryLabel = cat.name || `Category ${cIdx + 1}`
                        allRows.push({
                            html: buildCategoryHeaderRow(categoryLabel),
                            keepWithNext: true,
                            kind: 'category',
                            zoneName: zoneLabel,
                            categoryName: categoryLabel,
                        })

                        cat.items.forEach((item: any) => {
                            const isUsingCatLabor = (Number(cat.laborPercentage) || 0) > 0
                            const effectiveLaborPrice = isUsingCatLabor ? 0 : item.laborPrice
                            const lineTotal = (item.qty * item.materialPrice) + (item.qty * effectiveLaborPrice)
                            allRows.push({
                                html: `
                                <tr>
                                    <td style="border-bottom:1px solid #e5e7eb; padding:8px 5px; text-align:center; vertical-align:middle; font-size:10.5px; color:#6b7280;">${itemIdx++}</td>
                                    <td style="border-bottom:1px solid #e5e7eb; padding:8px 10px; vertical-align:top; font-size:11px; color:#111827; font-weight:500; white-space:normal; word-break:break-word; line-height:1.42;">
                                        ${renderPdfItemNameBlock(item)}
                                    </td>
                                    <td style="border-bottom:1px solid #e5e7eb; padding:8px 6px; text-align:center; vertical-align:middle; font-size:10px; color:#475569; white-space:normal; word-break:break-word; line-height:1.35;">${escapeHtml(item.size)}</td>
                                    <td style="border-bottom:1px solid #e5e7eb; padding:8px 6px; text-align:center; vertical-align:middle; font-size:10px; color:#475569;">${escapeHtml(item.unit)}</td>
                                    <td style="border-bottom:1px solid #e5e7eb; padding:8px 6px; text-align:center; vertical-align:middle; font-size:10.75px; color:#111827; font-weight:700;">${formatNumber(item.qty)}</td>
                                    <td style="border-bottom:1px solid #e5e7eb; padding:8px 6px; text-align:right; vertical-align:middle; font-size:10px; color:#334155; font-weight:600;">${asTHBOrBlank(item.materialPrice)}</td>
                                    <td style="border-bottom:1px solid #e5e7eb; padding:8px 6px; text-align:right; vertical-align:middle; font-size:10px; color:#334155; font-weight:600;">${isUsingCatLabor ? '-' : asTHBOrBlank(item.laborPrice)}</td>
                                    <td style="border-bottom:1px solid #e5e7eb; padding:8px 10px; text-align:right; vertical-align:middle; font-size:10.75px; color:#111827; font-weight:700;">${asTHBOrBlank(lineTotal)}</td>
                                </tr>
                                `,
                                kind: 'item',
                                zoneName: zoneLabel,
                                categoryName: categoryLabel,
                            })
                        })

                        if ((Number(cat.laborPercentage) || 0) > 0) {
                            const catMaterialSubtotal = cat.items.reduce((sum: number, i: any) => sum + (i.qty * i.materialPrice), 0)
                            const laborCost = catMaterialSubtotal * (Number(cat.laborPercentage) / 100)
                            allRows.push({
                                html: `
                                <tr style="background:#fefce8;">
                                    <td style="border-bottom:1px solid #e5e7eb; padding:8px 5px;"></td>
                                    <td colspan="6" style="border-bottom:1px solid #e5e7eb; padding:8px 10px; font-size:10.5px; color:#111827; font-weight:700; text-align:right;">
                                        ค่าแรงหมวดหมู่${escapeHtml(categoryLabel)} ${cat.laborPercentage}% (คำนวณจากค่าวัสดุ ${asTHB(catMaterialSubtotal)})
                                    </td>
                                    <td style="border-bottom:1px solid #e5e7eb; padding:8px 10px; text-align:right; font-size:10.75px; color:#111827; font-weight:700;">${asTHB(laborCost)}</td>
                                </tr>
                                `,
                                kind: 'item',
                                zoneName: zoneLabel,
                                categoryName: categoryLabel,
                            })
                        }
                    })

                    allRows.push({
                        html: `
                        <tr style="background:#f9fafb;">
                            <td colspan="7" style="border-bottom:1px solid #d1d5db; text-align:right; padding:9px 10px; font-size:10.5px; color:#4b5563; font-weight:700;">รวมโซน ${escapeHtml(zoneLabel)}</td>
                            <td style="border-bottom:1px solid #d1d5db; text-align:right; padding:9px 10px; font-size:11px; font-weight:700; color:#111827;">${asTHB(zoneSummaries[zIdx].total)}</td>
                        </tr>
                        `,
                        kind: 'zone_total',
                        zoneName: zoneLabel,
                    })
                })
            }

            if (!allRows.length) {
                allRows.push({
                    html: `
                    <tr>
                        <td colspan="8" style="border-bottom:1px solid #e5e7eb; text-align:center; padding:18px; font-size:11.5px; color:#6b7280;">ไม่มีรายการสำหรับเอกสารนี้</td>
                    </tr>
                    `,
                    kind: 'empty',
                })
            }

            return allRows
        }

        // Helper: Render all zone tables (15 item rows/page + repeat zone/category headers on continuation)
        function renderAllZoneTables() {
            const allRows = buildAllTableRows()
            if (!allRows.length) return [{ rows: [] as string[], continuedZone: '', continuedCategory: '' }]

            const maxItemsPerPage = 15
            const pages: Array<{ rows: string[]; continuedZone: string; continuedCategory: string }> = []
            let currentPageRows: TableRowEntry[] = []
            let currentMeta = { continuedZone: '', continuedCategory: '' }
            let currentItemCount = 0

            for (let i = 0; i < allRows.length; i++) {
                const rowEntry = allRows[i]
                const rowUsesItemSlot = rowEntry.kind === 'item' || rowEntry.kind === 'empty'
                const shouldBreak = currentPageRows.length > 0 && (
                    (rowUsesItemSlot && currentItemCount + 1 > maxItemsPerPage)
                    || (!rowUsesItemSlot && currentItemCount >= maxItemsPerPage)
                    || (pageBreakPerCategory && rowEntry.kind === 'category')
                )

                if (shouldBreak) {
                    const continuedZone = showZones && rowEntry.zoneName && rowEntry.kind !== 'zone' ? rowEntry.zoneName : ''
                    const continuedCategory = rowEntry.categoryName && rowEntry.kind !== 'category' ? rowEntry.categoryName : ''

                    pages.push({
                        rows: currentPageRows.map((r) => r.html),
                        continuedZone: currentMeta.continuedZone,
                        continuedCategory: currentMeta.continuedCategory,
                    })

                    currentPageRows = []
                    currentMeta = { continuedZone, continuedCategory }
                    currentItemCount = 0

                    if (continuedZone) {
                        currentPageRows.push({
                            html: buildZoneHeaderRow(continuedZone),
                            kind: 'zone_repeat',
                            zoneName: continuedZone,
                        })
                    }

                    if (continuedCategory) {
                        currentPageRows.push({
                            html: buildCategoryHeaderRow(continuedCategory),
                            kind: 'category',
                            categoryName: continuedCategory,
                        })
                    }
                }

                currentPageRows.push(rowEntry)
                if (rowUsesItemSlot) {
                    currentItemCount += 1
                }
            }

            if (currentPageRows.length > 0) {
                pages.push({
                    rows: currentPageRows.map((r) => r.html),
                    continuedZone: currentMeta.continuedZone,
                    continuedCategory: currentMeta.continuedCategory,
                })
            }

            return pages.length ? pages : [{ rows: [] as string[], continuedZone: '', continuedCategory: '' }]
        }

        // --- HTML Layout for PDF (multi-page if needed) ---
        const isPlantMaterial = type === 'plant_material'
        const isContract = type === 'contract'
        const pages = (isPlantMaterial || isContract) ? [] : renderAllZoneTables();
        // Only include selected conditions from payload
        const conditionsArr = editableConditions
            .map((c: any) => {
                if (typeof c === 'string') return { text: c, selected: true }
                return { text: c?.text || '', selected: c?.selected !== false }
            })
            .filter((c: any) => c.selected && String(c.text || '').trim())
            .map((c: any) => String(c.text))
        const safeConditionsArr = isReceipt ? [] : (conditionsArr.length ? conditionsArr : [])
        const paymentMethodText = paymentMethodLabel(manual?.payment_method)
        const paidAtText = asDate(manual?.paid_at || createdAt)
        const dueAtText = asDate(manual?.due_at)
        const configuredBankCode = String(financialInfo.bank_code || '').toLowerCase()
        const configuredBankIcon = String(financialInfo.bank_icon || '').trim()
        const normalizedConfiguredBankIcon = configuredBankIcon
            && !configuredBankIcon.startsWith('/')
            && !configuredBankIcon.startsWith('http://')
            && !configuredBankIcon.startsWith('https://')
            ? (BANK_ICON_BY_CODE[configuredBankIcon.toLowerCase()] || configuredBankIcon)
            : configuredBankIcon
        const bankIconSrc = normalizedConfiguredBankIcon || BANK_ICON_BY_CODE[configuredBankCode] || inferBankIcon(financialInfo.bank_name)
        const pdfBankIconSrc = bankIconSrc && typeof window !== 'undefined'
            ? new URL(bankIconSrc, window.location.origin).toString()
            : bankIconSrc
        const bankIconDataUrl = pdfBankIconSrc ? await loadPdfImageData(pdfBankIconSrc) : null
        const plantCards = isPlantMaterial
            ? zones.flatMap((zone: any, zIdx: number) =>
                (zone.categories || []).flatMap((category: any, cIdx: number) =>
                    (category.items || []).map((item: any) => ({
                        id: item.id || `${zIdx + 1}-${cIdx + 1}`,
                        description: item.description || '-',
                        englishName: item.englishName || '',
                        scientificName: item.scientificName || '',
                        detail: item.detail || '',
                        size: item.size || '-',
                        qty: Number(item.qty) || 0,
                        unit: item.unit || '-',
                        imageUrl: item.imageUrl || '',
                        plantDocumentMode: item.plantDocumentMode || 'auto',
                        sizeMode: String(item.sizeMode || '').toLowerCase(),
                        itemCategory: item.itemCategory || 'other',
                        category: category.name || 'รายการพืช',
                        zone: zone.name || '',
                    }))
                )
            )
            : []

        const preferredPlantLayoutOrder = Array.isArray(manual?.plant_layout_order)
            ? manual.plant_layout_order.map((key: any) => String(key || '').trim()).filter(Boolean)
            : []
        const plantLayoutSettings = normalizePlantLayoutSettings(manual?.plant_layout_settings)
        const groupedPlantCards = isPlantMaterial
            ? (() => {
                const grouped = new Map<string, any>()

                plantCards.forEach((card: any) => {
                    const groupKey = buildPlantDocumentCardKey({
                        item_name: card.description,
                        english_name: card.englishName,
                        scientific_name: card.scientificName,
                        image_url: card.imageUrl,
                        item_category: card.itemCategory,
                        plant_document_mode: card.plantDocumentMode,
                        size_mode: card.sizeMode,
                    })

                    const sizeKey = [
                        String(card.size || '-').trim().toLowerCase(),
                        String(card.unit || '-').trim().toLowerCase(),
                    ].join('|')

                    if (!grouped.has(groupKey)) {
                        grouped.set(groupKey, {
                            ...card,
                            lines: [],
                            _lineMap: new Map<string, { size: string; qty: number; unit: string }>(),
                        })
                    }

                    const group = grouped.get(groupKey)
                    const existingLine = group._lineMap.get(sizeKey)
                    if (existingLine) {
                        existingLine.qty += Number(card.qty) || 0
                    } else {
                        group._lineMap.set(sizeKey, {
                            size: card.size || '-',
                            qty: Number(card.qty) || 0,
                            unit: card.unit || '-',
                        })
                    }
                })

                return Array.from(grouped.values()).map((group: any) => {
                    const lines = Array.from(group._lineMap.values()) as Array<{ size: string; qty: number; unit: string }>
                    return {
                        ...group,
                        qty: lines.reduce((sum: number, line: any) => sum + (Number(line.qty) || 0), 0),
                        unit: lines.length === 1 ? lines[0].unit : '',
                        size: lines.length === 1 ? lines[0].size : '-',
                        lines,
                    }
                })
            })()
            : []
        const orderedPlantCards = isPlantMaterial
            ? (() => {
                const cards = groupedPlantCards
                    .map((card: any) => {
                        const category = getPlantDocumentCategory({
                            item_name: card.description,
                            english_name: card.englishName,
                            scientific_name: card.scientificName,
                            item_category: card.itemCategory,
                            plant_document_mode: card.plantDocumentMode,
                            size_mode: card.sizeMode,
                            category_name: card.category,
                            zone_name: card.zone,
                        })

                        if (!category) return null

                        return {
                            ...card,
                            key: buildPlantDocumentCardKey({
                                item_name: card.description,
                                english_name: card.englishName,
                                scientific_name: card.scientificName,
                                image_url: card.imageUrl,
                                item_category: card.itemCategory,
                                plant_document_mode: card.plantDocumentMode,
                                size_mode: card.sizeMode,
                            }),
                            category,
                            categoryLabel: getPlantDocumentCategoryLabel(category),
                            layoutKey: buildPlantDocumentCardKey({
                                item_name: card.description,
                                english_name: card.englishName,
                                scientific_name: card.scientificName,
                                image_url: card.imageUrl,
                                item_category: card.itemCategory,
                                plant_document_mode: card.plantDocumentMode,
                                size_mode: card.sizeMode,
                            }),
                        }
                    })
                    .filter((card: any) => !!card)

                const availableKeys = new Set(cards.map((card: any) => card.layoutKey))
                const normalizedOrder: string[] = []
                const seen = new Set<string>()

                preferredPlantLayoutOrder.forEach((key: string) => {
                    if (!availableKeys.has(key) || seen.has(key)) return
                    seen.add(key)
                    normalizedOrder.push(key)
                })

                cards.forEach((card: any) => {
                    if (seen.has(card.layoutKey)) return
                    seen.add(card.layoutKey)
                    normalizedOrder.push(card.layoutKey)
                })

                const orderIndex = new Map(normalizedOrder.map((key, index) => [key, index]))

                return [...cards].sort((left: any, right: any) => {
                    const leftIndex = orderIndex.get(left.layoutKey) ?? Number.MAX_SAFE_INTEGER
                    const rightIndex = orderIndex.get(right.layoutKey) ?? Number.MAX_SAFE_INTEGER
                    return leftIndex - rightIndex
                })
            })()
            : []

        const plantPages: Array<{ cards: any[] }> = isPlantMaterial
            ? (() => {
                if (!orderedPlantCards.length) {
                    return [{ cards: [] }]
                }

                const builtPages = paginatePlantLayoutCards(
                    orderedPlantCards,
                    plantLayoutSettings,
                    (card: any) => resolvePlantLayoutCardTuning(plantLayoutSettings, card.layoutKey || card.key || '').cardHeight
                ).map((page) => ({ cards: page.cards, columns: page.columns, rows: page.rows, sections: page.sections }))
                return builtPages.length ? builtPages : [{ cards: [] }]
            })()
            : []

        if (isPlantMaterial) {
            return generatePlantMaterialPdf({
                brandName,
                code,
                projectName: String(customer.project || '').trim(),
                plantLayoutSettings,
                plantPages,
            })
        }

        // ═══════════════════════════════════════════════
        // CONTRACT PDF — Professional Legal Document
        // ═══════════════════════════════════════════════
        const contractPageHtmls: string[] = []
        if (isContract) {
            const cType = String(manual?.contract_type || 'landscape_turnkey')
            const isAnnual = cType === 'annual_maintenance'
            const contractTitleTh = isAnnual ? 'สัญญาดูแลรักษาภูมิทัศน์' : 'สัญญารับจ้างเหมาจัดสวน'
            const contractTitleEn = isAnnual ? 'LANDSCAPE MAINTENANCE AGREEMENT' : 'LANDSCAPE CONSTRUCTION CONTRACT'
            const contractDate = asDate(createdAt)
            const sourceDocumentCode = String(manual?.source_document_code || '').trim() || String(doc?.source_document_code || '').trim() || '………………………………'
            const sourceDocumentDate = asDate(manual?.source_document_created_at)
            const dottedShort = '………………………………'
            const dottedMedium = '……………………………………………………'
            const dottedLong = '………………………………………………………………………………………………………………'
            const contractAmountText = asThaiBahtText(displayGrandTotal)
            const customerNameText = String(customer.name || '').trim() || dottedShort
            const customerTaxIdText = String(customer.taxId || '').trim() || dottedShort
            const customerAddressText = String(customer.address || '').trim() || dottedLong
            const projectLocationText = String(customer.address || '').trim() || dottedLong
            const contractDetails = manual?.contract_details && typeof manual.contract_details === 'object' ? manual.contract_details : {}
            const contractCompanyName = String(companyInfo.contract_company_name || '').trim() || company.fullName || DEFAULTS.company_info.contract_company_name
            const contractCompanyAddress = String(companyInfo.contract_company_address || '').trim() || company.address || DEFAULTS.company_info.contract_company_address
            const contractCompanyTaxId = String(companyInfo.contract_company_tax_id || '').trim() || company.taxId || DEFAULTS.company_info.contract_company_tax_id
            const contractCompanyAddressLines = splitCompanyAddress(contractCompanyAddress)
            const contractLandDeedNumber = String(contractDetails.land_deed_number || '').trim() || dottedShort
            const contractWorkStartDate = asDate(contractDetails.work_start_date)
            const contractWorkEndDate = asDate(contractDetails.work_end_date)
            const contractSigningLocation = String(contractDetails.signing_location || '').trim() || String(customer.address || '').trim() || dottedMedium
            const contractProjectLocation = String(contractDetails.project_location || '').trim() || projectLocationText
            const contractQuotationAttachmentPages = String(contractDetails.quotation_attachment_pages || '').trim() || '1'
            const contractInvoiceReferenceCode = String(contractDetails.invoice_reference_code || '').trim() || dottedMedium
            const contractInvoiceAttachmentPages = String(contractDetails.invoice_attachment_pages || '').trim() || dottedShort
            const employerSignerName = String(contractDetails.employer_signer_name || '').trim() || customerNameText
            const employerWitnessName = String(contractDetails.employer_witness_name || '').trim() || dottedShort
            const employerAttachmentPages = String(contractDetails.employer_id_attachment_pages || '').trim() || dottedShort
            const contractorAttachmentPages = String(contractDetails.contractor_id_attachment_pages || '').trim() || dottedShort
            const contractorSigner = String(contractDetails.contractor_signer_name || '').trim() || String(companyInfo.contract_signer_name || '').trim() || DEFAULTS.company_info.contract_signer_name
            const contractorWitness = String(contractDetails.contractor_witness_name || '').trim() || String(companyInfo.contract_witness_name || '').trim() || DEFAULTS.company_info.contract_witness_name
            const contractCompanyNameText = String(contractDetails.contractor_company_name || '').trim() || contractCompanyName
            const contractCompanyAddressText = String(contractDetails.contractor_company_address || '').trim() || contractCompanyAddress
            const contractCompanyTaxIdText = String(contractDetails.contractor_company_tax_id || '').trim() || contractCompanyTaxId
            const paymentBankText = `${String(financialInfo.bank_name || '').trim() || 'ธนาคารกสิกรไทย'} ${String(financialInfo.account_name || '').trim() || contractCompanyName} หมายเลขบัญชี ${String(financialInfo.account_no || '').trim() || dottedShort} สาขา${String(financialInfo.branch || '').trim() || dottedShort}`

            // Scope items from the quotation zones
            const scopeItems: { description: string; qty: number; unit: string }[] = []
            zones.forEach((zone: any) => {
                (zone.categories || []).forEach((cat: any) => {
                    (cat.items || []).forEach((item: any) => {
                        scopeItems.push({
                            description: item.description || '-',
                            qty: Number(item.qty) || 0,
                            unit: item.unit || '-',
                        })
                    })
                })
            })
            const hasScopeItems = scopeItems.length > 0
            const scopeItemsForContract = hasScopeItems ? scopeItems : []
            const contractScopeItemPageColumnLimit = isAnnual ? 14 : 14
            const contractScopeItemPageLimit = contractScopeItemPageColumnLimit * 2
            const splitScopeItemsForContractPages = <T,>(items: T[], firstLimit: number, continuationLimit: number): T[][] => {
                if (items.length === 0) {
                    return []
                }
                if (items.length <= firstLimit) {
                    return [items]
                }

                const chunks: T[][] = [items.slice(0, firstLimit)]
                for (let index = firstLimit; index < items.length; index += continuationLimit) {
                    chunks.push(items.slice(index, index + continuationLimit))
                }
                return chunks
            }
            const contractScopeItemChunks = splitScopeItemsForContractPages(
                scopeItemsForContract,
                contractScopeItemPageLimit,
                contractScopeItemPageLimit,
            )
            const totalScopeItemCount = scopeItems.length
            const scopeItemCategoryCount = zones.reduce((count: number, zone: any) => count + (Array.isArray(zone?.categories) ? zone.categories.length : 0), 0)
            const scopeItemZoneCount = zones.length
            const renderContractScopeTableRows = (
                items: { description: string; qty: number; unit: string }[],
                rowStartIndex = 0,
                palette: {
                    indexColor: string
                    textColor: string
                    unitColor: string
                    borderColor: string
                },
                options?: {
                    cellPaddingY?: number
                    cellPaddingX?: number
                    fontWeight?: number
                    lineHeight?: number
                },
            ) => items.map((item, index) => {
                const hasQuantity = Number(item.qty) > 0
                const cellPaddingY = options?.cellPaddingY ?? 3
                const cellPaddingX = options?.cellPaddingX ?? 4
                const fontWeight = options?.fontWeight ?? 500
                const lineHeight = options?.lineHeight ?? 1.24
                return `
                        <tr style="border-bottom:1px solid ${palette.borderColor};">
                            <td style="padding:${cellPaddingY}px ${cellPaddingX}px; text-align:center; vertical-align:top; color:${palette.indexColor}; font-weight:700; line-height:${lineHeight};">${rowStartIndex + index + 1}</td>
                            <td style="padding:${cellPaddingY}px ${cellPaddingX + 2}px; vertical-align:top; color:${palette.textColor}; font-weight:${fontWeight}; white-space:normal; word-break:break-word; overflow-wrap:anywhere; line-height:${lineHeight + 0.05};">${escapeHtml(item.description)}</td>
                            <td style="padding:${cellPaddingY}px ${cellPaddingX}px; text-align:center; vertical-align:top; color:${palette.textColor}; font-weight:700; line-height:${lineHeight};">${hasQuantity ? escapeHtml(formatNumber(item.qty)) : '-'}</td>
                            <td style="padding:${cellPaddingY}px ${cellPaddingX}px; text-align:center; vertical-align:top; color:${palette.unitColor}; white-space:normal; word-break:break-word; overflow-wrap:anywhere; line-height:${lineHeight};">${hasQuantity ? escapeHtml(item.unit) : '-'}</td>
                        </tr>
                `
            }).join('')
            const renderContractScopeTable = (
                items: { description: string; qty: number; unit: string }[],
                rowStartIndex: number,
                palette: {
                    indexColor: string
                    textColor: string
                    unitColor: string
                    borderColor: string
                },
                options?: {
                    fontSize?: string
                    headingColor?: string
                    headingBackground?: string
                    headingBorderTop?: string
                    headingBorderBottom?: string
                    sideLabel?: string
                    compact?: boolean
                },
            ) => `
                    <div style="display:flex; flex-direction:column; gap:6px; min-width:0;">
                        ${options?.sideLabel ? `<div style="font-size:10px; font-weight:700; letter-spacing:0.08em; text-transform:uppercase; color:${options.headingColor || palette.textColor};">${options.sideLabel}</div>` : ''}
                        <table style="width:100%; border-collapse:collapse; table-layout:fixed; font-size:${options?.fontSize || '10.4px'};">
                            <thead>
                                <tr style="background:${options?.headingBackground || '#f8fafc'}; border-top:${options?.headingBorderTop || `1px solid ${palette.borderColor}`}; border-bottom:${options?.headingBorderBottom || `1px solid ${palette.borderColor}`};">
                                    <th style="width:10%; padding:${options?.compact ? '6px 4px' : '8px 4px'}; text-align:center; font-weight:800; color:${options?.headingColor || palette.textColor};">#</th>
                                    <th style="width:54%; padding:${options?.compact ? '6px 6px' : '8px 8px'}; text-align:left; font-weight:800; color:${options?.headingColor || palette.textColor};">รายการ</th>
                                    <th style="width:18%; padding:${options?.compact ? '6px 4px' : '8px 4px'}; text-align:center; font-weight:800; color:${options?.headingColor || palette.textColor};">จำนวน</th>
                                    <th style="width:18%; padding:${options?.compact ? '6px 4px' : '8px 4px'}; text-align:center; font-weight:800; color:${options?.headingColor || palette.textColor};">หน่วย</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${renderContractScopeTableRows(items, rowStartIndex, palette, options?.compact ? {
                                    cellPaddingY: 4,
                                    cellPaddingX: 4,
                                    fontWeight: 500,
                                    lineHeight: 1.3,
                                } : undefined)}
                            </tbody>
                        </table>
                    </div>
            `
            // Installment plan from manual payload
            const installmentPlan: { label: string; amount: number; percent: number; due_at: string; due_scope: string }[] = []
            if (Array.isArray(manual?.installments) && manual.installments.length > 0) {
                manual.installments.forEach((inst: any) => {
                    installmentPlan.push({
                        label: inst.label || `งวดที่ ${installmentPlan.length + 1}`,
                        amount: Number(inst.amount) || 0,
                        percent: Number(inst.percent) || 0,
                        due_at: inst.due_at ? asDate(inst.due_at) : '-',
                        due_scope: String(inst.due_scope || '').trim(),
                    })
                })
            }

            const contractConditions = safeConditionsArr.length > 0 ? safeConditionsArr : [
                'ผู้รับจ้างจะดำเนินการตามขอบเขตงานที่ระบุในสัญญาฉบับนี้ให้เสร็จสมบูรณ์',
                'การเปลี่ยนแปลงขอบเขตงานจะต้องได้รับความเห็นชอบเป็นลายลักษณ์อักษรจากทั้งสองฝ่าย',
                'ผู้รับจ้างรับประกันคุณภาพงานภายหลังส่งมอบเป็นเวลา 30 วัน',
                isAnnual
                    ? 'ระยะเวลาสัญญาดูแลรักษา 12 เดือน นับจากวันที่เริ่มงาน'
                    : 'ระยะเวลาดำเนินการตามที่ตกลงกัน',
            ]

            const notesText = String(manual?.notes || '').trim()
            const contractView = buildContractDocumentViewModel({
                contractType: cType,
                referenceDocumentLabel: 'ใบแจ้งหนี้',
                referenceCode: sourceDocumentCode,
                projectLocation: contractProjectLocation || dottedLong,
                grandTotal: displayGrandTotal,
                grandTotalText: contractAmountText,
                bankText: paymentBankText,
                workStartDateDisplay: contractWorkStartDate !== '-' ? contractWorkStartDate : dottedShort,
                workEndDateDisplay: contractWorkEndDate !== '-' ? contractWorkEndDate : dottedShort,
                scopePreviewItemCount: totalScopeItemCount,
                scopeExtraCount: 0,
                scopeCategoryCount: scopeItemCategoryCount,
                scopeZoneCount: scopeItemZoneCount,
                selectedConditions: contractConditions,
                notes: notesText,
                installments: installmentPlan.map((inst) => ({
                    label: inst.label,
                    dueScope: inst.due_scope,
                    amount: inst.amount,
                    percent: inst.percent,
                })),
                customerNameDisplay: customerNameText,
                employerSignerDisplay: employerSignerName,
                companyName: contractCompanyNameText,
                contractorSignerName: contractorSigner,
                employerWitnessName: employerWitnessName,
                contractorWitnessName: contractorWitness,
            })

            if (!isAnnual) {
                contractPageHtmls.push(`
                <div style="width:794px; min-height:1123px; background:#fff; color:#111827; font-family:'Sarabun','Noto Sans Thai','Segoe UI',Arial,sans-serif; padding:32px 36px; box-sizing:border-box; display:flex; flex-direction:column; text-rendering:geometricPrecision; -webkit-font-smoothing:antialiased;">
                    <div style="border-top:3px solid #111827; padding-top:20px; flex:1; display:flex; flex-direction:column;">
                        <div style="text-align:center; margin-bottom:16px;">
                            ${renderPdfContractTitle(contractTitleTh)}
                            <div style="font-size:10px; font-weight:700; letter-spacing:0.18em; color:#6b7280; text-transform:uppercase; margin-top:6px;">${escapeHtml(contractTitleEn)}</div>
                        </div>

                        <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-bottom:16px; font-size:11px;">
                            <div style="border:1px solid #e5e7eb; background:#f8fafc; padding:12px 14px;">
                                <div style="font-size:10px; font-weight:800; letter-spacing:0.14em; text-transform:uppercase; color:#6b7280; margin-bottom:4px;">เลขที่สัญญา</div>
                                <div style="font-weight:800; color:#111827;">${escapeHtml(code || dottedShort)}</div>
                            </div>
                            <div style="border:1px solid #e5e7eb; background:#f8fafc; padding:12px 14px; text-align:right;">
                                <div style="font-size:10px; font-weight:800; letter-spacing:0.14em; text-transform:uppercase; color:#6b7280; margin-bottom:4px;">วันที่ทำสัญญา</div>
                                <div style="font-weight:800; color:#111827;">${escapeHtml(contractDate !== '-' ? contractDate : dottedShort)}</div>
                            </div>
                            <div style="border:1px solid #e5e7eb; background:#f8fafc; padding:12px 14px;">
                                <div style="font-size:10px; font-weight:800; letter-spacing:0.14em; text-transform:uppercase; color:#6b7280; margin-bottom:4px;">เอกสารอ้างอิง</div>
                                <div style="font-weight:800; color:#111827;">${escapeHtml(sourceDocumentCode)}</div>
                            </div>
                            <div style="border:1px solid #e5e7eb; background:#f8fafc; padding:12px 14px;">
                                <div style="font-size:10px; font-weight:800; letter-spacing:0.14em; text-transform:uppercase; color:#6b7280; margin-bottom:4px;">สถานที่ทำสัญญา</div>
                                <div style="font-weight:800; color:#111827;">${escapeHtml(contractSigningLocation)}</div>
                            </div>
                        </div>

                        <div style="font-size:11px; line-height:1.68; text-align:justify; color:#111827; margin-bottom:16px;">
                            สัญญาฉบับนี้จัดทำขึ้น ณ ${escapeHtml(contractSigningLocation)} ระหว่างคู่สัญญาทั้งสองฝ่าย ซึ่งได้ตรวจสอบรายละเอียดคู่สัญญา หน้างาน และเอกสารอ้างอิงแล้ว จึงตกลงผูกพันตามข้อความและเงื่อนไขดังต่อไปนี้
                        </div>

                        <div style="display:grid; grid-template-columns:1fr 1fr; gap:16px; margin-bottom:16px;">
                            <div style="border:1px solid #cbd5e1; overflow:hidden;">
                                <div style="background:#111827; color:#fff; padding:10px 14px; font-size:10px; font-weight:800; letter-spacing:0.16em; text-transform:uppercase;">ฝ่ายผู้ว่าจ้าง</div>
                                <div style="padding:12px 14px; display:flex; flex-direction:column; gap:6px; font-size:11px; line-height:1.55;">
                                    <div><span style="color:#6b7280;">ชื่อ / นิติบุคคล:</span> <span style="font-weight:800; color:#111827;">${escapeHtml(customerNameText)}</span></div>
                                    <div><span style="color:#6b7280;">เลขประจำตัว:</span> <span style="font-weight:700; color:#111827;">${escapeHtml(customerTaxIdText)}</span></div>
                                    <div><span style="color:#6b7280;">ที่อยู่:</span></div>
                                    <div style="font-weight:700; color:#111827; line-height:1.45;">${escapeHtml(customerAddressText)}</div>
                                    <div><span style="color:#6b7280;">ผู้ลงนาม:</span> <span style="font-weight:800; color:#111827;">${escapeHtml(employerSignerName)}</span></div>
                                </div>
                            </div>
                            <div style="border:1px solid #cbd5e1; overflow:hidden;">
                                <div style="background:#334155; color:#fff; padding:10px 14px; font-size:10px; font-weight:800; letter-spacing:0.16em; text-transform:uppercase;">ฝ่ายผู้รับจ้าง</div>
                                <div style="padding:12px 14px; display:flex; flex-direction:column; gap:6px; font-size:11px; line-height:1.55;">
                                    <div><span style="color:#6b7280;">ชื่อบริษัท:</span> <span style="font-weight:800; color:#111827;">${escapeHtml(contractCompanyNameText)}</span></div>
                                    <div><span style="color:#6b7280;">เลขทะเบียน:</span> <span style="font-weight:700; color:#111827;">${escapeHtml(contractCompanyTaxIdText)}</span></div>
                                    <div><span style="color:#6b7280;">ที่ตั้งสำนักงาน:</span></div>
                                    <div style="font-weight:700; color:#111827; line-height:1.45;">${escapeHtml(contractCompanyAddressText)}</div>
                                    <div><span style="color:#6b7280;">ผู้ลงนาม:</span> <span style="font-weight:800; color:#111827;">${escapeHtml(contractorSigner)}</span></div>
                                </div>
                            </div>
                        </div>

                        <div style="display:grid; grid-template-columns:1fr 1fr; gap:14px; margin-bottom:16px;">
                            <div style="border:1px solid #e5e7eb; background:#fcfcfd; padding:12px 14px; font-size:11px; line-height:1.55;">
                                <div style="font-size:10px; font-weight:800; letter-spacing:0.14em; text-transform:uppercase; color:#6b7280; margin-bottom:6px;">สรุปโครงการ</div>
                                <div><span style="color:#6b7280;">ประเภทสัญญา:</span> <span style="font-weight:800; color:#111827;">รับเหมางานจัดสวน</span></div>
                                <div><span style="color:#6b7280;">เลขที่โฉนด:</span> <span style="font-weight:700; color:#111827;">${escapeHtml(contractLandDeedNumber)}</span></div>
                                <div><span style="color:#6b7280;">สถานที่โครงการ:</span></div>
                                <div style="font-weight:700; color:#111827; line-height:1.45;">${escapeHtml(contractProjectLocation)}</div>
                            </div>
                            <div style="border:1px solid #e5e7eb; background:#fcfcfd; padding:12px 14px; font-size:11px; line-height:1.55;">
                                <div style="font-size:10px; font-weight:800; letter-spacing:0.14em; text-transform:uppercase; color:#6b7280; margin-bottom:6px;">ข้อมูลเอกสารอ้างอิง</div>
                                <div><span style="color:#6b7280;">เลขที่ใบแจ้งหนี้:</span> <span style="font-weight:800; color:#111827;">${escapeHtml(sourceDocumentCode)}</span></div>
                                <div><span style="color:#6b7280;">วันที่ใบแจ้งหนี้:</span> <span style="font-weight:700; color:#111827;">${escapeHtml(sourceDocumentDate !== '-' ? sourceDocumentDate : dottedShort)}</span></div>
                                <div><span style="color:#6b7280;">ระยะเวลาดำเนินการ:</span> <span style="font-weight:700; color:#111827;">${escapeHtml(contractWorkStartDate !== '-' ? contractWorkStartDate : dottedShort)} ถึง ${escapeHtml(contractWorkEndDate !== '-' ? contractWorkEndDate : dottedShort)}</span></div>
                                <div><span style="color:#6b7280;">วงเงินสัญญา:</span> <span style="font-weight:800; color:#111827;">${escapeHtml(formatNumber(displayGrandTotal))} บาท</span></div>
                            </div>
                        </div>

                        <div style="display:flex; flex-direction:column; gap:12px; font-size:10.85px; line-height:1.68; text-align:justify;">
                            <div>
                                <div style="font-weight:800; color:#111827; margin-bottom:4px;">${escapeHtml(contractView.clauseOneTitle)}</div>
                                <p style="margin:0;">${escapeHtml(contractView.clauseOneBody)}</p>
                            </div>
                            <div>
                                <div style="font-weight:800; color:#111827; margin-bottom:4px;">${escapeHtml(contractView.clauseTwoTitle)}</div>
                                <p style="margin:0;">${escapeHtml(contractView.clauseTwoBody)}</p>
                            </div>
                        </div>

                        <div style="margin-top:16px; border:1px solid #e5e7eb; background:#f8fafc; padding:12px 14px;">
                            <div style="font-weight:800; font-size:11px; color:#111827; margin-bottom:6px;">บัญชีรายการงานแนบท้ายสัญญา</div>
                            <div style="font-size:10.6px; line-height:1.6; color:#4b5563;">${escapeHtml(contractView.scopeSummaryText)}</div>
                        </div>
                    </div>

                    <div style="margin-top:16px; text-align:right; font-size:10px; font-weight:700; color:#9ca3af;">หน้า ##CURRENT_PAGE## / ##TOTAL_PAGES##</div>
                </div>
                `)

                contractPageHtmls.push(`
                <div style="width:794px; min-height:1123px; background:#fff; color:#111827; font-family:'Sarabun','Noto Sans Thai','Segoe UI',Arial,sans-serif; padding:32px 36px; box-sizing:border-box; display:flex; flex-direction:column; text-rendering:geometricPrecision; -webkit-font-smoothing:antialiased;">
                    <div style="border-top:3px solid #111827; padding-top:20px; flex:1; display:flex; flex-direction:column;">
                        ${renderPdfPageHeader(contractView.nonBreakingPreviewTitle, contractDate !== '-' ? contractDate : dottedShort)}

                        <div style="margin-bottom:16px;">
                            <div style="font-weight:800; font-size:11px; color:#111827; margin-bottom:8px;">เงื่อนไขการชำระเงิน</div>
                            <div style="display:flex; flex-direction:column; gap:10px;">
                                ${installmentPlan.length > 0 ? installmentPlan.map((inst, index) => `
                                  <div style="border:1px solid #e5e7eb; background:#fcfcfd; padding:12px 14px; font-size:10.8px;">
                                      <div style="display:flex; align-items:flex-start; justify-content:space-between; gap:16px;">
                                          <div style="min-width:0;">
                                              <div style="font-weight:800; color:#111827;">${escapeHtml(inst.label || `งวดที่ ${index + 1}`)}</div>
                                              <div style="color:#4b5563; margin-top:4px; line-height:1.5;">${escapeHtml(inst.due_scope || 'ชำระตามความคืบหน้างาน')}</div>
                                          </div>
                                          <div style="text-align:right; white-space:nowrap;">
                                              <div style="font-weight:800; color:#111827;">${escapeHtml(formatNumber(inst.amount))} บาท</div>
                                              <div style="color:#6b7280;">${inst.percent > 0 ? `${Number(inst.percent.toFixed(1))}%` : 'ตามจำนวนเงิน'}</div>
                                          </div>
                                      </div>
                                  </div>
                                `).join('') : `
                                  <div style="border:1px solid #e5e7eb; background:#fcfcfd; padding:12px 14px; font-size:10.8px; line-height:1.6; color:#374151;">
                                      ชำระเต็มจำนวน ${escapeHtml(formatNumber(displayGrandTotal))} บาท (${escapeHtml(contractAmountText)}) ผ่านบัญชี ${escapeHtml(paymentBankText)}
                                  </div>
                                `}
                            </div>
                        </div>

                        <div style="display:flex; flex-direction:column; gap:12px; font-size:10.75px; line-height:1.66; text-align:justify;">
                            <div>
                                <div style="font-weight:800; color:#111827; margin-bottom:4px;">${escapeHtml(contractView.clauseThreeTitle)}</div>
                                <p style="margin:0;">${escapeHtml(contractView.clauseThreeBody)}</p>
                            </div>
                            <div>
                                <div style="font-weight:800; color:#111827; margin-bottom:4px;">${escapeHtml(contractView.clauseFourTitle)}</div>
                                <p style="margin:0;">${escapeHtml(contractView.clauseFourBody)}</p>
                            </div>
                        </div>

                        <div style="margin-top:16px;">
                            <div style="font-weight:800; font-size:11px; color:#111827; margin-bottom:8px;">เงื่อนไขประกอบสัญญา</div>
                            <div style="display:flex; flex-direction:column; gap:8px; font-size:10.6px; line-height:1.7;">
                                ${contractView.previewConditions.map((condition: string, index: number) => `
                                    <div style="display:grid; grid-template-columns:18px minmax(0, 1fr); column-gap:8px; align-items:start;">
                                        <span style="font-weight:800; color:#111827; line-height:1.7;">${index + 1}.</span>
                                        <span style="color:#374151; white-space:normal; word-break:break-word; overflow-wrap:anywhere;">${escapeHtml(condition)}</span>
                                    </div>
                                `).join('')}
                            </div>
                        </div>

                        ${contractView.notesText ? `
                        <div style="margin-top:16px; border:1px solid #e5e7eb; background:#fcfcfd; padding:12px 14px;">
                            <div style="font-weight:800; font-size:11px; color:#111827; margin-bottom:6px;">หมายเหตุเพิ่มเติม</div>
                            <div style="font-size:10.6px; line-height:1.6; color:#374151; white-space:pre-line;">${escapeHtml(contractView.notesText)}</div>
                        </div>
                        ` : ''}

                        <div style="margin-top:20px; display:flex; flex-direction:column; gap:20px;">
                            <div style="display:grid; grid-template-columns:1fr 1fr; gap:40px; font-size:11px; line-height:1.6;">
                                <div style="text-align:center;">
                                    <div>${escapeHtml(contractView.signature.employerTitle)}</div>
                                    <div style="margin-top:40px;">( ${escapeHtml(contractView.signature.employerName)} )</div>
                                </div>
                                <div style="text-align:center;">
                                    <div>${escapeHtml(contractView.signature.contractorTitle)}</div>
                                    <div style="margin-top:40px;">( ${escapeHtml(contractView.signature.contractorName)} )</div>
                                </div>
                            </div>

                            <div style="display:grid; grid-template-columns:1fr 1fr; gap:40px; font-size:11px; line-height:1.6;">
                                <div style="text-align:center;">
                                    <div>${escapeHtml(contractView.signature.employerWitnessTitle)}</div>
                                    <div style="margin-top:40px;">( ${escapeHtml(contractView.signature.employerWitnessName)} )</div>
                                </div>
                                <div style="text-align:center;">
                                    <div>${escapeHtml(contractView.signature.contractorWitnessTitle)}</div>
                                    <div style="margin-top:40px;">( ${escapeHtml(contractView.signature.contractorWitnessName)} )</div>
                                </div>
                            </div>

                            ${contractView.showAttachmentRegistry ? `<div style="border-top:1px solid #d8dbe8; padding-top:16px; font-size:10.7px; line-height:1.6;">
                                <div style="font-size:16px; font-weight:800; color:#111827; margin-bottom:10px;">บัญชีเอกสารท้ายสัญญา</div>
                                <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px 24px; color:#111827;">
                                    <div>ใบเสนอราคาเลขที่ ${escapeHtml(sourceDocumentCode)} จำนวน ${escapeHtml(contractQuotationAttachmentPages)} แผ่น</div>
                                    <div>ใบแจ้งหนี้เลขที่ ${escapeHtml(contractInvoiceReferenceCode)} จำนวน ${escapeHtml(contractInvoiceAttachmentPages)} แผ่น</div>
                                    <div>ผู้ลงนามฝ่ายผู้ว่าจ้าง ${escapeHtml(employerSignerName)}</div>
                                    <div>ผู้ลงนามฝ่ายผู้รับจ้าง ${escapeHtml(contractorSigner)}</div>
                                    <div>สำเนาบัตรประชาชนผู้ว่าจ้าง ${escapeHtml(employerSignerName)} จำนวน ${escapeHtml(employerAttachmentPages)} แผ่น</div>
                                    <div>สำเนาบัตรประชาชนผู้รับจ้าง ${escapeHtml(contractorSigner)} จำนวน ${escapeHtml(contractorAttachmentPages)} แผ่น</div>
                                </div>
                            </div>` : ''}
                        </div>
                    </div>

                    <div style="margin-top:16px; text-align:right; font-size:10px; font-weight:700; color:#9ca3af;">หน้า ##CURRENT_PAGE## / ##TOTAL_PAGES##</div>
                </div>
                `)
            } else {

            contractPageHtmls.push(`
            <div style="width:794px; min-height:1123px; background:#fff; color:#111827; font-family:'Sarabun','Noto Sans Thai','Segoe UI',Arial,sans-serif; padding:32px 36px; box-sizing:border-box; display:flex; flex-direction:column; text-rendering:geometricPrecision; -webkit-font-smoothing:antialiased;">
                <div style="border-top:3px solid #111827; padding-top:20px; flex:1; display:flex; flex-direction:column;">
                    <div style="text-align:center; margin-bottom:16px;">
                        ${renderPdfContractTitle(contractTitleTh)}
                        <div style="font-size:10px; font-weight:700; letter-spacing:0.18em; color:#6b7280; text-transform:uppercase; margin-top:6px;">${escapeHtml(contractTitleEn)}</div>
                    </div>

                    <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-bottom:16px; font-size:11px;">
                        <div style="border:1px solid #e5e7eb; background:#f8fafc; padding:12px 14px;">
                            <div style="font-size:10px; font-weight:800; letter-spacing:0.14em; text-transform:uppercase; color:#6b7280; margin-bottom:4px;">เลขที่สัญญา</div>
                            <div style="font-weight:800; color:#111827;">${escapeHtml(code || dottedShort)}</div>
                        </div>
                        <div style="border:1px solid #e5e7eb; background:#f8fafc; padding:12px 14px; text-align:right;">
                            <div style="font-size:10px; font-weight:800; letter-spacing:0.14em; text-transform:uppercase; color:#6b7280; margin-bottom:4px;">วันที่ทำสัญญา</div>
                            <div style="font-weight:800; color:#111827;">${escapeHtml(contractDate !== '-' ? contractDate : dottedShort)}</div>
                        </div>
                        <div style="border:1px solid #e5e7eb; background:#f8fafc; padding:12px 14px;">
                            <div style="font-size:10px; font-weight:800; letter-spacing:0.14em; text-transform:uppercase; color:#6b7280; margin-bottom:4px;">เอกสารอ้างอิง</div>
                            <div style="font-weight:800; color:#111827;">${escapeHtml(sourceDocumentCode)}</div>
                        </div>
                        <div style="border:1px solid #e5e7eb; background:#f8fafc; padding:12px 14px;">
                            <div style="font-size:10px; font-weight:800; letter-spacing:0.14em; text-transform:uppercase; color:#6b7280; margin-bottom:4px;">สถานที่ทำสัญญา</div>
                            <div style="font-weight:800; color:#111827;">${escapeHtml(contractSigningLocation)}</div>
                        </div>
                    </div>

                    <div style="font-size:11px; line-height:1.68; text-align:justify; color:#111827; margin-bottom:16px;">
                        สัญญาฉบับนี้จัดทำขึ้น ณ ${escapeHtml(contractSigningLocation)} ระหว่างคู่สัญญาทั้งสองฝ่าย ซึ่งได้ตรวจสอบรายละเอียดคู่สัญญา หน้างาน และเอกสารอ้างอิงแล้ว จึงตกลงผูกพันตามข้อความและเงื่อนไขดังต่อไปนี้
                    </div>

                    <div style="display:grid; grid-template-columns:1fr 1fr; gap:16px; margin-bottom:16px;">
                        <div style="border:1px solid #cbd5e1; overflow:hidden;">
                            <div style="background:#111827; color:#fff; padding:10px 14px; font-size:10px; font-weight:800; letter-spacing:0.16em; text-transform:uppercase;">ฝ่ายผู้ว่าจ้าง</div>
                            <div style="padding:12px 14px; display:flex; flex-direction:column; gap:6px; font-size:11px; line-height:1.55;">
                                <div><span style="color:#6b7280;">ชื่อ / นิติบุคคล:</span> <span style="font-weight:800; color:#111827;">${escapeHtml(customerNameText)}</span></div>
                                <div><span style="color:#6b7280;">เลขประจำตัว:</span> <span style="font-weight:700; color:#111827;">${escapeHtml(customerTaxIdText)}</span></div>
                                <div><span style="color:#6b7280;">ที่อยู่:</span></div>
                                <div style="font-weight:700; color:#111827; line-height:1.45;">${escapeHtml(customerAddressText)}</div>
                                <div><span style="color:#6b7280;">ผู้ลงนาม:</span> <span style="font-weight:800; color:#111827;">${escapeHtml(employerSignerName)}</span></div>
                            </div>
                        </div>
                        <div style="border:1px solid #cbd5e1; overflow:hidden;">
                            <div style="background:#334155; color:#fff; padding:10px 14px; font-size:10px; font-weight:800; letter-spacing:0.16em; text-transform:uppercase;">ฝ่ายผู้รับจ้าง</div>
                            <div style="padding:12px 14px; display:flex; flex-direction:column; gap:6px; font-size:11px; line-height:1.55;">
                                <div><span style="color:#6b7280;">ชื่อบริษัท:</span> <span style="font-weight:800; color:#111827;">${escapeHtml(contractCompanyNameText)}</span></div>
                                <div><span style="color:#6b7280;">เลขทะเบียน:</span> <span style="font-weight:700; color:#111827;">${escapeHtml(contractCompanyTaxIdText)}</span></div>
                                <div><span style="color:#6b7280;">ที่ตั้งสำนักงาน:</span></div>
                                <div style="font-weight:700; color:#111827; line-height:1.45;">${escapeHtml(contractCompanyAddressText)}</div>
                                <div><span style="color:#6b7280;">ผู้ลงนาม:</span> <span style="font-weight:800; color:#111827;">${escapeHtml(contractorSigner)}</span></div>
                            </div>
                        </div>
                    </div>

                    <div style="display:grid; grid-template-columns:1fr 1fr; gap:14px; margin-bottom:16px;">
                        <div style="border:1px solid #e5e7eb; background:#fcfcfd; padding:12px 14px; font-size:11px; line-height:1.55;">
                            <div style="font-size:10px; font-weight:800; letter-spacing:0.14em; text-transform:uppercase; color:#6b7280; margin-bottom:6px;">สรุปโครงการ</div>
                            <div><span style="color:#6b7280;">ประเภทสัญญา:</span> <span style="font-weight:800; color:#111827;">ดูแลสวนรายปี</span></div>
                            <div><span style="color:#6b7280;">เลขที่โฉนด:</span> <span style="font-weight:700; color:#111827;">${escapeHtml(contractLandDeedNumber)}</span></div>
                            <div><span style="color:#6b7280;">สถานที่โครงการ:</span></div>
                            <div style="font-weight:700; color:#111827; line-height:1.45;">${escapeHtml(contractProjectLocation)}</div>
                        </div>
                        <div style="border:1px solid #e5e7eb; background:#fcfcfd; padding:12px 14px; font-size:11px; line-height:1.55;">
                            <div style="font-size:10px; font-weight:800; letter-spacing:0.14em; text-transform:uppercase; color:#6b7280; margin-bottom:6px;">ข้อมูลเอกสารอ้างอิง</div>
                            <div><span style="color:#6b7280;">เลขที่ใบแจ้งหนี้:</span> <span style="font-weight:800; color:#111827;">${escapeHtml(sourceDocumentCode)}</span></div>
                            <div><span style="color:#6b7280;">วันที่ใบแจ้งหนี้:</span> <span style="font-weight:700; color:#111827;">${escapeHtml(sourceDocumentDate !== '-' ? sourceDocumentDate : dottedShort)}</span></div>
                            <div><span style="color:#6b7280;">ระยะเวลาดำเนินการ:</span> <span style="font-weight:700; color:#111827;">${escapeHtml(contractWorkStartDate !== '-' ? contractWorkStartDate : dottedShort)} ถึง ${escapeHtml(contractWorkEndDate !== '-' ? contractWorkEndDate : dottedShort)}</span></div>
                            <div><span style="color:#6b7280;">วงเงินสัญญา:</span> <span style="font-weight:800; color:#111827;">${escapeHtml(formatNumber(displayGrandTotal))} บาท</span></div>
                        </div>
                    </div>

                    <div style="display:flex; flex-direction:column; gap:12px; font-size:10.85px; line-height:1.68; text-align:justify;">
                        <div>
                            <div style="font-weight:800; color:#111827; margin-bottom:4px;">${escapeHtml(contractView.clauseOneTitle)}</div>
                            <p style="margin:0;">${escapeHtml(contractView.clauseOneBody)}</p>
                        </div>
                        <div>
                            <div style="font-weight:800; color:#111827; margin-bottom:4px;">${escapeHtml(contractView.clauseTwoTitle)}</div>
                            <p style="margin:0;">${escapeHtml(contractView.clauseTwoBody)}</p>
                        </div>
                    </div>

                    <div style="margin-top:16px; border:1px solid #e5e7eb; background:#f8fafc; padding:12px 14px;">
                        <div style="font-weight:800; font-size:11px; color:#111827; margin-bottom:6px;">บัญชีรายการงานแนบท้ายสัญญา</div>
                        <div style="font-size:10.6px; line-height:1.6; color:#4b5563;">${escapeHtml(contractView.scopeSummaryText)}</div>
                    </div>
                </div>

                <div style="margin-top:16px; text-align:right; font-size:10px; font-weight:700; color:#9ca3af;">หน้า ##CURRENT_PAGE## / ##TOTAL_PAGES##</div>
            </div>
            `)

            contractPageHtmls.push(`
            <div style="width:794px; min-height:1123px; background:#fff; color:#111827; font-family:'Sarabun','Noto Sans Thai','Segoe UI',Arial,sans-serif; padding:32px 36px; box-sizing:border-box; display:flex; flex-direction:column; text-rendering:geometricPrecision; -webkit-font-smoothing:antialiased;">
                <div style="border-top:3px solid #111827; padding-top:20px; flex:1; display:flex; flex-direction:column;">
                    ${renderPdfPageHeader(contractView.nonBreakingPreviewTitle, contractDate !== '-' ? contractDate : dottedShort)}

                    <div style="margin-bottom:16px;">
                        <div style="font-weight:800; font-size:11px; color:#111827; margin-bottom:8px;">เงื่อนไขการชำระเงิน</div>
                        <div style="display:flex; flex-direction:column; gap:10px;">
                            ${installmentPlan.length > 0 ? installmentPlan.map((inst, index) => `
                              <div style="border:1px solid #e5e7eb; background:#fcfcfd; padding:12px 14px; font-size:10.8px;">
                                  <div style="display:flex; align-items:flex-start; justify-content:space-between; gap:16px;">
                                      <div style="min-width:0;">
                                          <div style="font-weight:800; color:#111827;">${escapeHtml(inst.label || `งวดที่ ${index + 1}`)}</div>
                                          <div style="color:#4b5563; margin-top:4px; line-height:1.5;">${escapeHtml(inst.due_scope || 'ชำระตามรอบบริการที่ตกลง')}</div>
                                      </div>
                                      <div style="text-align:right; white-space:nowrap;">
                                          <div style="font-weight:800; color:#111827;">${escapeHtml(formatNumber(inst.amount))} บาท</div>
                                          <div style="color:#6b7280;">${inst.percent > 0 ? `${Number(inst.percent.toFixed(1))}%` : 'ตามจำนวนเงิน'}</div>
                                      </div>
                                  </div>
                              </div>
                            `).join('') : `
                              <div style="border:1px solid #e5e7eb; background:#fcfcfd; padding:12px 14px; font-size:10.8px; line-height:1.6; color:#374151;">
                                  ชำระเต็มจำนวน ${escapeHtml(formatNumber(displayGrandTotal))} บาท (${escapeHtml(contractAmountText)}) ผ่านบัญชี ${escapeHtml(paymentBankText)}
                              </div>
                            `}
                        </div>
                    </div>

                    <div style="display:flex; flex-direction:column; gap:12px; font-size:10.75px; line-height:1.66; text-align:justify;">
                        <div>
                            <div style="font-weight:800; color:#111827; margin-bottom:4px;">${escapeHtml(contractView.clauseThreeTitle)}</div>
                            <p style="margin:0;">${escapeHtml(contractView.clauseThreeBody)}</p>
                        </div>
                        <div>
                            <div style="font-weight:800; color:#111827; margin-bottom:4px;">${escapeHtml(contractView.clauseFourTitle)}</div>
                            <p style="margin:0;">${escapeHtml(contractView.clauseFourBody)}</p>
                        </div>
                    </div>

                    <div style="margin-top:16px;">
                        <div style="font-weight:800; font-size:11px; color:#111827; margin-bottom:8px;">เงื่อนไขประกอบสัญญา</div>
                        <div style="display:flex; flex-direction:column; gap:8px; font-size:10.6px; line-height:1.7;">
                            ${contractView.previewConditions.map((condition: string, index: number) => `
                                <div style="display:grid; grid-template-columns:18px minmax(0, 1fr); column-gap:8px; align-items:start;">
                                    <span style="font-weight:800; color:#111827; line-height:1.7;">${index + 1}.</span>
                                    <span style="color:#374151; white-space:normal; word-break:break-word; overflow-wrap:anywhere;">${escapeHtml(condition)}</span>
                                </div>
                            `).join('')}
                        </div>
                    </div>

                    ${contractView.notesText ? `
                    <div style="margin-top:16px; border:1px solid #e5e7eb; background:#fcfcfd; padding:12px 14px;">
                        <div style="font-weight:800; font-size:11px; color:#111827; margin-bottom:6px;">หมายเหตุเพิ่มเติม</div>
                        <div style="font-size:10.6px; line-height:1.6; color:#374151; white-space:pre-line;">${escapeHtml(contractView.notesText)}</div>
                    </div>
                    ` : ''}

                    <div style="margin-top:20px; display:flex; flex-direction:column; gap:20px;">
                        <div style="display:grid; grid-template-columns:1fr 1fr; gap:40px; font-size:11px; line-height:1.6;">
                            <div style="text-align:center;">
                                <div>${escapeHtml(contractView.signature.employerTitle)}</div>
                                <div style="margin-top:40px;">( ${escapeHtml(contractView.signature.employerName)} )</div>
                            </div>
                            <div style="text-align:center;">
                                <div>${escapeHtml(contractView.signature.contractorTitle)}</div>
                                <div style="margin-top:40px;">( ${escapeHtml(contractView.signature.contractorName)} )</div>
                            </div>
                        </div>

                        <div style="display:grid; grid-template-columns:1fr 1fr; gap:40px; font-size:11px; line-height:1.6;">
                            <div style="text-align:center;">
                                <div>${escapeHtml(contractView.signature.employerWitnessTitle)}</div>
                                <div style="margin-top:40px;">( ${escapeHtml(contractView.signature.employerWitnessName)} )</div>
                            </div>
                            <div style="text-align:center;">
                                <div>${escapeHtml(contractView.signature.contractorWitnessTitle)}</div>
                                <div style="margin-top:40px;">( ${escapeHtml(contractView.signature.contractorWitnessName)} )</div>
                            </div>
                        </div>
                    </div>
                </div>

                <div style="margin-top:16px; text-align:right; font-size:10px; font-weight:700; color:#9ca3af;">หน้า ##CURRENT_PAGE## / ##TOTAL_PAGES##</div>
            </div>
            `)

            }

            // Replace page count placeholders
            const totalContractPages = contractPageHtmls.length
            for (let i = 0; i < contractPageHtmls.length; i++) {
                contractPageHtmls[i] = contractPageHtmls[i]
                    .replace(/##CURRENT_PAGE##/g, String(i + 1))
                    .replace(/##TOTAL_PAGES##/g, String(totalContractPages))
            }
        }

        const sets = options?.includeCopy ? [false, true] : [!!options?.isCopy];
        const pageHtmls: string[] = [];

        for (const isCopy of sets) {
            const currentLabel = isCopy ? 'สำเนา / COPY' : 'ตัวจริง / ORIGINAL';
            const setPageHtmls = (isContract ? contractPageHtmls : isPlantMaterial ? plantPages : pages).map((page: any, pageIdx: number) => {
                if (isContract) {
                    // Inject label into contract HTML (it's already a complete string)
                    // We look for the title section to insert the label
                    return page.replace(
                        /<div style="text-align:center; margin-bottom:16px;">/,
                        `<div style="text-align:center; margin-bottom:16px;">
                            <div style="position:absolute; top:32px; right:36px; font-size:14px; font-weight:800; color:#111827; letter-spacing:0.05em; white-space:nowrap;">[ ${currentLabel} ]</div>`
                    );
                }
            if (isPlantMaterial) {
                const cards = Array.isArray(page?.cards) ? page.cards : []
                const pageSections = cards.reduce((sections: Array<{ label: string; cards: any[] }>, item: any) => {
                    const label = String(item?.categoryLabel || 'รายการพืช')
                    const lastSection = sections[sections.length - 1]
                    if (!lastSection || lastSection.label !== label) {
                        sections.push({ label, cards: [item] })
                    } else {
                        lastSection.cards.push(item)
                    }
                    return sections
                }, [])

                return `
                <div style="width:794px; min-height:1123px; background:#ffffff; color:#111111; font-family:'Sarabun','Noto Sans Thai','Segoe UI',Arial,sans-serif; padding:${plantLayoutSettings.global.pagePadding}px; box-sizing:border-box; display:flex; flex-direction:column; line-height:1.35; text-rendering:geometricPrecision; -webkit-font-smoothing:antialiased;">
                    <div style="display:flex; align-items:flex-end; justify-content:space-between; margin-bottom:10px; padding-bottom:6px; border-bottom:1px solid #e8e5d8; gap:12px; flex-shrink:0;">
                        <div>
                            <div style="font-size:11px; font-weight:800; letter-spacing:0.16em; color:#111111; line-height:1.3; text-transform:uppercase;">${escapeHtml(brandName)}</div>
                            <div style="font-size:8px; font-weight:700; letter-spacing:0.12em; color:#9a9a93; line-height:1.3; margin-top:1px; text-transform:uppercase;">Plant Material Layout</div>
                        </div>
                        ${(code || customer.project)
                            ? `<div style="text-align:right; min-width:0;">
                                <div style="font-size:8px; font-weight:800; color:#111827; margin-bottom:4px; letter-spacing:0.05em; white-space:nowrap;">[ ${currentLabel} ]</div>
                                ${code ? `<div style="font-size:7.5px; font-weight:700; color:#9a9a93; letter-spacing:0.1em; line-height:1.3;">${escapeHtml(code)}</div>` : ''}
                                ${customer.project ? `<div style="font-size:7.5px; font-weight:700; color:#9a9a93; letter-spacing:0.1em; line-height:1.3; max-width:160px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${escapeHtml(customer.project)}</div>` : ''}
                            </div>`
                            : `<div style="text-align:right; min-width:0;">
                                <div style="font-size:8px; font-weight:800; color:#111827; margin-bottom:4px; letter-spacing:0.05em; white-space:nowrap;">[ ${currentLabel} ]</div>
                               </div>`}
                    </div>
                    <div style="flex-grow:1;">
                        ${cards.length
                            ? `${pageSections.map((section: { label: string; cards: any[] }, sectionIdx: number) => `
                                <div style="${sectionIdx > 0 ? `margin-top:${plantLayoutSettings.global.sectionGap}px;` : ''}">
                                    <div style="display:flex; align-items:center; gap:8px; margin-bottom:8px;">
                                        <div style="font-size:11px; font-weight:800; color:#111111; white-space:nowrap;">${escapeHtml(section.label)}</div>
                                        <div style="height:1px; flex:1; background:#e8e5d8;"></div>
                                    </div>
                                    <div style="display:grid; grid-template-columns:repeat(3, minmax(0, 1fr)); gap:${plantLayoutSettings.global.cardGap}px; align-content:start;">
                                ${section.cards.map((item: any) => {
                                    const cardLayout = resolvePlantLayoutCardTuning(plantLayoutSettings, item.layoutKey || item.key || '')
                                    const cardLines = Array.isArray(item.lines) && item.lines.length > 0
                                        ? item.lines
                                        : [{ size: item.size, qty: item.qty, unit: item.unit }]
                                    const firstLine = cardLines[0] || { size: '-', qty: item.qty, unit: item.unit }
                                    const extraLineCount = Math.max(0, cardLines.length - 1)
                                    const totalQtyText = `${item.qty || 0}${item.unit ? ` ${escapeHtml(item.unit)}` : ''}`
                                    const subtitleText = item.englishName || item.scientificName || item.detail || '\u00a0'
                                    const printContentOffsetY = Math.max(0, Number(cardLayout.contentOffsetY) || 0)
                                    const titleLineHeight = 1.42
                                    const subtitleLineHeight = 1.38
                                    const metaLineHeight = 1.35
                                    const titleMaxHeight = Math.ceil(cardLayout.titleFontSize * titleLineHeight * 2) + 4
                                    const sizeMaxHeight = Math.ceil(cardLayout.metaFontSize * metaLineHeight * 2) + 4
                                    const subtitleMinHeight = Math.ceil(cardLayout.subtitleFontSize * subtitleLineHeight) + 3
                                    return `
                                    <div style="border:1px solid #e7e4d7; background:#ffffff; display:flex; flex-direction:column; padding:${cardLayout.cardPadding}px; min-height:${cardLayout.cardHeight}px; box-sizing:border-box;">
                                        <div style="position:relative; height:${cardLayout.imageHeight}px; background:#f6f4ec; border:1px solid #ece9dc; display:flex; align-items:center; justify-content:center; overflow:hidden; margin-bottom:6px;">
                                            ${item.imageUrl
                                                ? `<img src="${escapeHtml(item.imageUrl)}" alt="${escapeHtml(item.description)}" style="width:100%; height:100%; object-fit:cover; object-position:center;" />`
                                                : `<div style="display:flex; height:100%; width:100%; align-items:center; justify-content:center; font-size:9px; color:#a3a39a; font-weight:700; letter-spacing:0.16em; text-transform:uppercase; text-align:center; line-height:1.3; padding:4px;">No Image</div>`}
                                        </div>

                                        <div style="display:flex; flex-direction:column; min-width:0; min-height:0; flex:1; padding-top:${printContentOffsetY}px;">
                                            <div style="display:block; font-size:${cardLayout.titleFontSize}px; font-weight:800; color:#111111; line-height:${titleLineHeight}; margin-bottom:0; max-height:${titleMaxHeight}px; overflow:hidden; word-break:break-word; padding-bottom:4px;">${escapeHtml(item.description)}</div>
                                            <div style="display:block; font-size:${cardLayout.subtitleFontSize}px; color:#67675f; line-height:${subtitleLineHeight}; margin-top:4px; margin-bottom:0; min-height:${subtitleMinHeight}px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; padding-bottom:3px;">${escapeHtml(subtitleText)}</div>

                                            <div style="margin-top:auto; padding-top:6px; border-top:1px solid #f0ecdd; display:grid; grid-template-columns:minmax(0,1fr) auto; gap:8px; align-items:end;">
                                                    <div>
                                                        <div style="font-size:${Math.max(cardLayout.metaFontSize - 1, 6)}px; color:#a3a39a; font-weight:700; text-transform:uppercase; letter-spacing:0.14em; margin-bottom:2px;">Size</div>
                                                        <div style="display:block; font-size:${cardLayout.metaFontSize}px; color:#2b2b27; font-weight:700; line-height:${metaLineHeight}; max-height:${sizeMaxHeight}px; overflow:hidden; word-break:break-word; padding-bottom:3px;">${escapeHtml(firstLine.size || '-')}</div>
                                                    </div>
                                                    <div style="text-align:right;">
                                                        <div style="font-size:${Math.max(cardLayout.metaFontSize - 1, 6)}px; color:#a3a39a; font-weight:700; text-transform:uppercase; letter-spacing:0.14em; margin-bottom:2px;">Qty</div>
                                                        <div style="display:block; font-size:${cardLayout.metaFontSize + 1}px; color:#111111; font-weight:800; white-space:nowrap; line-height:${metaLineHeight}; padding-bottom:3px;">${escapeHtml(totalQtyText || '-')}</div>
                                                    </div>
                                            </div>
                                            <div style="margin-top:4px; display:flex; justify-content:space-between; gap:8px; font-size:${Math.max(cardLayout.metaFontSize - 0.5, 6.5)}px; color:#7b7b74; line-height:${metaLineHeight}; overflow:hidden; padding-bottom:2px;">
                                                <span style="white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${escapeHtml(extraLineCount > 0 ? `+${extraLineCount} size` : item.categoryLabel || '')}</span>
                                                <span style="white-space:nowrap; overflow:hidden; text-overflow:ellipsis; text-align:right;">${escapeHtml(item.scientificName || '\u00a0')}</span>
                                            </div>
                                        </div>
                                    </div>
                                `}).join('')}
                                    </div>
                                </div>
                            `).join('')}`
                            : `<div style="border:1px solid #e5e7eb; border-radius:4px; text-align:center; padding:24px; font-size:11px; color:#6b7280;">ไม่มีรายการพืชสำหรับเอกสารนี้</div>`}
                    </div>
                </div>
            `
            }

            const rows = page.rows
            const continuationParts = [page.continuedZone ? `โซน: ${page.continuedZone}` : '', page.continuedCategory ? `หมวด: ${page.continuedCategory}` : ''].filter(Boolean)
            const continuationText = continuationParts.join(' / ')

            return `
            <div style="width:794px; min-height:1123px; background:#fff; color:#111111; font-family:'Sarabun','Noto Sans Thai','Segoe UI',Arial,sans-serif; padding:30px 30px; box-sizing:border-box; display:flex; flex-direction:column; line-height:1.4; text-rendering:geometricPrecision; -webkit-font-smoothing:antialiased;">
                <!-- Header (repeat every page) -->
                <div style="display:flex; justify-content:space-between; align-items:flex-start; border-top:2px solid #111827; border-bottom:1px solid #d1d5db; padding:14px 0 18px 0; margin-bottom:14px; gap:20px;">
                    <div style="display:flex; flex-direction:column; gap:8px;">
                        <div style="font-size:24px; font-weight:700; letter-spacing:0.015em; color:#111827; line-height:1.15; text-transform:uppercase; white-space:nowrap; max-width:520px;">${escapeHtml(brandName)}</div>
                        <div style="font-size:10px; color:#6b7280; font-weight:600; letter-spacing:0.12em; white-space:nowrap;">LANDSCAPE DESIGN & CONSTRUCTION</div>
                        <div style="font-size:11.5px; color:#111827; font-weight:600; margin-top:4px; white-space:nowrap; max-width:520px;">${escapeHtml(company.fullName)}</div>
                        <div style="font-size:10px; color:#6b7280; margin-top:0; white-space:normal; line-height:1.35; max-width:520px;">${escapeHtml(companyAddressLines.line1)}${companyAddressLines.line2 ? `<br/>${escapeHtml(companyAddressLines.line2)}` : ''}</div>
                        <div style="font-size:11px; color:#6b7280; margin-top:2px; white-space:normal; line-height:1.4; max-width:520px;">Tax ID: <span style='font-family:monospace;'>${escapeHtml(company.taxId)}</span> | Tel: ${escapeHtml(company.phone)}</div>
                    </div>
                    <div style="text-align:right;">
                        <div style="font-size:14px; font-weight:800; color:#111827; margin-bottom:8px; letter-spacing:0.05em; white-space:nowrap;">[ ${currentLabel} ]</div>
                        <div style="font-size:20px; font-weight:700; color:#111827; margin-bottom:2px; letter-spacing:0.05em; white-space:nowrap;">${titleTh}</div>
                        <div style="font-size:10px; color:#6b7280; font-weight:600; letter-spacing:0.16em; margin-bottom:12px; white-space:nowrap;">${titleEn}</div>
                        <div style="font-size:12px; color:#111827; font-weight:600; margin-bottom:2px; white-space:nowrap;">เลขที่ (No.): <span style='font-family:monospace;'>${escapeHtml(code)}</span></div>
                        <div style="font-size:12px; color:#111827; font-weight:600; white-space:nowrap;">วันที่ (Date): <span style='font-family:monospace;'>${asDate(createdAt)}</span></div>
                        ${type === 'invoice' && dueAtText !== '-' ? `<div style="font-size:12px; color:#111827; font-weight:600; margin-top:2px; white-space:nowrap;">กำหนดชำระ (Due Date): <span style='font-family:monospace;'>${escapeHtml(dueAtText)}</span></div>` : ''}
                    </div>
                </div>
                <!-- Client & Project Section (repeat every page) -->
                <div style="display:flex; border:1px solid #9ca3af; margin-bottom:12px;">
                    <div style="flex:1; padding:14px 14px; border-right:1px solid #9ca3af; display:flex; flex-direction:column; gap:4px;">
                        <div style="font-size:10px; color:#9ca3af; font-weight:700; letter-spacing:0.2em; margin-bottom:4px; white-space:nowrap; text-transform:uppercase;">Customer / Billed To</div>
                        ${customer.name ? `<div style="font-size:13px; color:#111827; font-weight:700; white-space:pre-wrap; line-height:1.4; word-break:break-word;">${escapeHtml(customer.name)}</div>` : ''}
                        ${customer.address ? `<div style="font-size:11px; color:#6b7280; white-space:pre-wrap; line-height:1.4; word-break:break-word;">${escapeHtml(customer.address)}</div>` : ''}
                        ${String(customer.taxId || '').trim()
                            ? `<div style="font-size:10px; color:#6b7280; white-space:normal; line-height:1.4; word-break:break-word;">เลขประจำตัวผู้เสียภาษี: <span style='font-family:monospace;'>${escapeHtml(String(customer.taxId || '').trim())}</span></div>`
                            : ''}
                    </div>
                    <div style="flex:1; padding:14px 14px; display:flex; flex-direction:column; gap:4px;">
                        <div style="font-size:10px; color:#9ca3af; font-weight:700; letter-spacing:0.2em; margin-bottom:4px; white-space:nowrap; text-transform:uppercase;">Project Reference</div>
                        ${customer.project ? `<div style="font-size:13px; color:#111827; font-weight:700; white-space:pre-wrap; line-height:1.4; word-break:break-word;">${escapeHtml(customer.project)}</div>` : ''}
                        ${customer.houseName ? `<div style="font-size:10px; color:#6b7280; white-space:normal; line-height:1.4; word-break:break-word;">บ้าน/สถานที่: ${escapeHtml(customer.houseName)}</div>` : ''}
                        <div style="font-size:10px; color:#6b7280; white-space:normal; line-height:1.4; word-break:break-word;">${isReceipt ? 'ผู้รับเงิน' : 'ผู้เสนอราคา'}: ทีมงาน ${escapeHtml(brandName)}</div>
                    </div>
                </div>
                ${pageIdx > 0 && continuationText ? `<div style="margin-bottom:8px; font-size:10px; color:#6b7280; font-weight:700; letter-spacing:0.02em;">ต่อเนื่องจากหน้าเดิม: ${escapeHtml(continuationText)}</div>` : ''}
                <!-- Items Table (repeat every page) -->
                <div style="flex-grow:1;">
                    <table style="width:100%; border-collapse:collapse; margin-top:0; font-size:10.5px; table-layout:fixed;">
                        <colgroup>
                            <col style="width:5%" />
                            <col style="width:31%" />
                            <col style="width:14%" />
                            <col style="width:8%" />
                            <col style="width:7%" />
                            <col style="width:11%" />
                            <col style="width:11%" />
                            <col style="width:13%" />
                        </colgroup>
                        <thead>
                            <tr style="background:#f3f4f6; color:#111827; font-size:8.8px; text-transform:uppercase; letter-spacing:0.12em; border-top:1px solid #111827; border-bottom:1px solid #9ca3af;">
                                <th style="border-bottom:1px solid #9ca3af; padding:8px 5px; text-align:center; vertical-align:middle; white-space:nowrap;">#</th>
                                <th style="border-bottom:1px solid #9ca3af; padding:8px 8px; text-align:left; vertical-align:middle; white-space:nowrap;">Description</th>
                                <th style="border-bottom:1px solid #9ca3af; padding:8px 6px; text-align:center; vertical-align:middle; white-space:nowrap;">Size</th>
                                <th style="border-bottom:1px solid #9ca3af; padding:8px 6px; text-align:center; vertical-align:middle; white-space:nowrap;">Unit</th>
                                <th style="border-bottom:1px solid #9ca3af; padding:8px 6px; text-align:center; vertical-align:middle; white-space:nowrap;">Qty</th>
                                <th style="border-bottom:1px solid #9ca3af; padding:8px 6px; text-align:right; vertical-align:middle; white-space:nowrap;">Material</th>
                                <th style="border-bottom:1px solid #9ca3af; padding:8px 6px; text-align:right; vertical-align:middle; white-space:nowrap;">Labor</th>
                                <th style="border-bottom:1px solid #9ca3af; padding:8px 8px; text-align:right; vertical-align:middle; white-space:nowrap;">Amount</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${rows.join('')}
                        </tbody>
                    </table>
                </div>
                <!-- Summary Footer Section (only on last page) -->
                ${pageIdx === pages.length - 1 ? `
                <div style="display:flex; gap:34px; align-items:flex-end; padding:18px 8px 0 8px; border-top:1px solid #e5e7eb; margin-top:8px;">
                    <!-- Payment & Conditions (Left Side) -->
                    <div style="flex:1; display:flex; flex-direction:column; gap:24px;">
                        <!-- Payment Box -->
                        <div style="border:1px solid #e5e7eb; background:#fafafa; padding:18px 16px; border-radius:2px;">
                            <div style="display:flex; align-items:center; gap:8px; margin-bottom:12px;">
                                <span style="font-size:11px; color:#64748b; font-weight:600; white-space:nowrap;">รายละเอียดการชำระเงิน</span>
                            </div>
                            <div style="display:grid; grid-template-columns:1fr; gap:8px;">
                                ${isReceipt
                                    ? `
                                <div style="display:grid; grid-template-columns:90px minmax(0,1fr); align-items:start; column-gap:8px; row-gap:2px;">
                                    <span style="font-size:10px; color:#64748b; font-weight:500; white-space:nowrap; padding-top:2px;">ลูกค้าชำระด้วย</span>
                                    <span style="font-size:12px; color:#0f172a; font-weight:700; white-space:normal; line-height:1.4; word-break:break-word; min-width:0;">${escapeHtml(paymentMethodText)}</span>
                                </div>
                                <div style="display:grid; grid-template-columns:90px minmax(0,1fr); align-items:start; column-gap:8px; row-gap:2px;">
                                    <span style="font-size:10px; color:#64748b; font-weight:500; white-space:nowrap; padding-top:2px;">รูปแบบใบเสร็จ</span>
                                    <span style="font-size:12px; color:#0f172a; font-weight:700; white-space:normal; line-height:1.4; word-break:break-word; min-width:0;">${escapeHtml(receiptScopeText)}</span>
                                </div>
                                ${isReceiptInstallmentMode ? `
                                <div style="display:grid; grid-template-columns:90px minmax(0,1fr); align-items:start; column-gap:8px; row-gap:2px;">
                                    <span style="font-size:10px; color:#64748b; font-weight:500; white-space:nowrap; padding-top:2px;">งวดที่อ้างอิง</span>
                                    <span style="font-size:12px; color:#0f172a; font-weight:700; white-space:normal; line-height:1.4; word-break:break-word; min-width:0;">${escapeHtml(receiptInstallmentSummaryText)}</span>
                                </div>
                                ` : ''}
                                <div style="display:grid; grid-template-columns:90px minmax(0,1fr); align-items:start; column-gap:8px; row-gap:2px;">
                                    <span style="font-size:10px; color:#64748b; font-weight:500; white-space:nowrap; padding-top:2px;">วันที่รับชำระ</span>
                                    <span style="font-size:12px; color:#0f172a; font-weight:700; white-space:nowrap; line-height:1.4; min-width:0;">${escapeHtml(paidAtText)}</span>
                                </div>
                                `
                                    : `
                                <div style="display:flex; align-items:center; gap:8px;">
                                    <span style="width:60px; font-size:10px; color:#64748b; font-weight:500; white-space:nowrap;">ธนาคาร</span>
                                    <div style="display:flex; align-items:center; gap:8px; min-width:0; flex:1;">
                                        ${bankIconDataUrl ? `<img src="${escapeHtml(bankIconDataUrl)}" alt="bank icon" style="display:block; width:22px; height:22px; object-fit:cover; border-radius:11px; border:1px solid #e2e8f0; background:#ffffff; flex:0 0 auto;" />` : ''}
                                        <span style="font-size:11px; color:#0f172a; font-weight:700; white-space:nowrap; line-height:1.3;">${escapeHtml(financialInfo.bank_name)} <span style='font-weight:400; color:#64748b; white-space:nowrap;'>(${escapeHtml(financialInfo.branch)})</span></span>
                                    </div>
                                </div>
                                <div style="display:flex; align-items:baseline; gap:8px;">
                                    <span style="font-size:10px; color:#64748b; font-weight:500; white-space:nowrap;">เลขบัญชี</span>
                                    <span style="font-size:15px; color:#0f172a; font-weight:700; letter-spacing:0.04em; white-space:nowrap;">${escapeHtml(financialInfo.account_no)}</span>
                                </div>
                                <div style="display:flex; align-items:baseline; gap:8px;">
                                    <span style="font-size:10px; color:#64748b; font-weight:500; white-space:nowrap;">ชื่อบัญชี</span>
                                    <span style="font-size:11px; color:#0f172a; font-weight:700; white-space:nowrap; line-height:1.35;">${escapeHtml(financialInfo.account_name)}</span>
                                </div>
                                `}
                            </div>
                        </div>
                        <!-- Conditions -->
                        <div style="padding-left:4px; ${isReceipt ? 'display:none;' : ''}">
                            <div style="font-size:11px; color:#0f172a; font-weight:600; margin-bottom:6px; white-space:nowrap;">เงื่อนไขการเสนอราคา (CONDITIONS)</div>
                            ${safeConditionsArr.length
                                ? `<ul style="font-size:10px; color:#64748b; font-weight:400; line-height:1.7; margin:0; padding-left:18px;">${safeConditionsArr.map((c: any) => `<li style="white-space:normal; line-height:1.45;">• ${escapeHtml(c)}</li>`).join('')}</ul>`
                                : `<div style="font-size:10px; color:#94a3b8; font-weight:500;">-</div>`}
                        </div>
                    </div>
                    <!-- Totals & Signatures (Right Side) -->
                    <div style="width:300px; display:flex; flex-direction:column; justify-content:flex-end; gap:24px;">
                        <div style="margin-bottom:24px;">
                            <div style="display:flex; justify-content:space-between; align-items:center; font-size:12px; color:#64748b; font-weight:500; margin-bottom:4px; white-space:nowrap;">
                                <span>Total (ราคารวม)</span>
                                <span style="color:#0f172a; font-weight:700; white-space:nowrap;">${asTHB(subtotal)}</span>
                            </div>
                            ${showOverhead ? `<div style="display:flex; justify-content:space-between; align-items:center; font-size:12px; color:#64748b; font-weight:500; margin-bottom:4px; white-space:nowrap;"><span>ค่าดำเนินการ (Overhead ${Math.round(overheadRate*100)}%)</span><span style="color:#0f172a; font-weight:700; white-space:nowrap;">${asTHB(overhead)}</span></div>` : ''}
                            ${showGlobalLabor ? `<div style="display:flex; justify-content:space-between; align-items:center; font-size:12px; color:#64748b; font-weight:500; margin-bottom:4px; white-space:nowrap;"><span>ค่าแรงรวม (Labor ${Math.round(globalLaborRate*100)}%)</span><span style="color:#0f172a; font-weight:700; white-space:nowrap;">${asTHB(globalLabor)}</span></div>` : ''}
                            ${appliedDiscountAmount > 0 ? `<div style="display:flex; justify-content:space-between; align-items:center; font-size:12px; color:#64748b; font-weight:500; margin-bottom:4px; white-space:nowrap;"><span>ส่วนลด (Discount)${discountType === 'percent' ? ` ${Number(Math.min(discountValue, 100).toFixed(2)).toString()}%` : ''}</span><span style="color:#0f172a; font-weight:700; white-space:nowrap;">- ${asTHB(appliedDiscountAmount)}</span></div>` : ''}
                            ${showVat ? `<div style="display:flex; justify-content:space-between; align-items:center; font-size:12px; color:#64748b; font-weight:500; margin-bottom:4px; white-space:nowrap;"><span>VAT (${Math.round(vatRate*100)}%)</span><span style="color:#0f172a; font-weight:700; white-space:nowrap;">${asTHB(vat)}</span></div>` : ''}
                            ${showTotalLabel ? `<div style="display:flex; justify-content:space-between; align-items:center; font-size:12px; color:#64748b; font-weight:600; margin-bottom:4px; white-space:nowrap;"><span>${escapeHtml(totalLabelText)}</span><span style="color:#0f172a; font-weight:700; white-space:nowrap;">${asTHB(beforeWithholdingTotal)}</span></div>` : ''}
                            ${showWithholdingTax ? `<div style="display:flex; justify-content:space-between; align-items:center; font-size:12px; color:#64748b; font-weight:500; margin-bottom:4px; white-space:nowrap;"><span>หัก ณ ที่จ่าย (${Math.round(withholdingRate*100)}%)</span><span style="color:#0f172a; font-weight:700; white-space:nowrap;">- ${asTHB(withholdingTax)}</span></div>` : ''}
                            ${showInstallmentIndicator ? `<div style="display:flex; justify-content:space-between; align-items:center; font-size:12px; color:#0f172a; font-weight:700; margin-bottom:4px; white-space:nowrap;"><span>งวดที่ต้องชำระ</span><span style="color:#0f172a; font-weight:800; white-space:nowrap;">${asTHB(displayGrandTotal)}</span></div><div style="font-size:10px; color:#64748b; margin-bottom:6px; white-space:normal;">${escapeHtml(currentInstallmentLabel)}${currentInstallmentPercent > 0 ? ` (คิดเป็น ${Number(currentInstallmentPercent.toFixed(2)).toString()}%)` : ''}${currentInstallmentScope ? `<div style="margin-top:3px; color:#475569; font-weight:600;">${escapeHtml(currentInstallmentScope)}</div>` : ''}</div>` : ''}
                            <div style="display:flex; justify-content:space-between; align-items:end; border-top:2px solid #111827; margin-top:12px; padding-top:10px; white-space:nowrap;">
                                <span style="font-size:16px; font-weight:800; color:#111827; letter-spacing:0.06em; white-space:nowrap;">GRAND TOTAL</span>
                                <span style="font-size:26px; font-weight:800; color:#111827; line-height:1; padding-bottom:2px; white-space:nowrap;">${asTHB(displayGrandTotal)}</span>
                            </div>
                        </div>
                        <!-- Signatures -->
                        <div style="display:grid; grid-template-columns:1fr 1fr; gap:16px; text-align:center; margin-top:auto;">
                            <div>
                                <div style="font-size:11px; font-weight:700; color:#0f172a; margin-bottom:24px; white-space:nowrap;">${escapeHtml(brandName)}</div>
                                <div style="border-top:1px solid #cbd5e1; padding-top:12px; font-size:11px; font-weight:600; color:#64748b; white-space:nowrap;">${isReceipt ? 'ผู้รับเงิน' : 'ผู้เสนอราคา'}</div>
                                <div style="font-size:10px; color:#cbd5e1; margin-top:4px; font-family:monospace; white-space:nowrap;">${asDate(createdAt)}</div>
                            </div>
                            <div>
                                <div style="font-size:11px; color:transparent; margin-bottom:24px; white-space:nowrap;">-</div>
                                <div style="border-top:1px solid #cbd5e1; padding-top:12px; font-size:11px; font-weight:600; color:#64748b; white-space:nowrap;">${isReceipt ? 'ผู้จ่ายเงิน' : 'ผู้อนุมัติ'}</div>
                                <div style="font-size:10px; color:#cbd5e1; margin-top:4px; font-family:monospace; white-space:nowrap;">.... / .... / ........</div>
                            </div>
                        </div>
                    </div>
                </div>
                ` : ''}
                <div style="text-align:right; font-size:10px; color:#9ca3af; margin-top:10px; white-space:nowrap;">Page ${pageIdx + 1}/${pages.length}</div>
            </div>
        `
        })
            pageHtmls.push(...setPageHtmls);
        }

        // --- Render all pages to PDF ---
        const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
        const renderScale = Math.min(3, Math.max(2, typeof window !== 'undefined' ? window.devicePixelRatio || 2 : 2))
        if (typeof document !== 'undefined' && (document as any).fonts?.ready) {
            await (document as any).fonts.ready
        }
        for (let i = 0; i < pageHtmls.length; i++) {
            const stage = document.createElement('div');
            stage.style.position = 'fixed';
            stage.style.left = '0';
            stage.style.top = '0';
            stage.style.zIndex = '-1';
            stage.style.pointerEvents = 'none';
            stage.style.width = '794px';
            stage.style.background = '#fff';
            stage.className = 'premium-font';
            stage.innerHTML = pageHtmls[i];
            document.body.appendChild(stage);
            await new Promise((resolve) => requestAnimationFrame(() => resolve(null)))
            const target = stage.firstElementChild as HTMLElement;
            const canvas = await html2canvas(target, {
                scale: renderScale,
                backgroundColor: '#ffffff',
                foreignObjectRendering: true,
                useCORS: true,
                imageTimeout: 0,
                windowWidth: 794,
                width: 794,
            });
            const imgData = canvas.toDataURL('image/jpeg', 0.85);
            if (i > 0) pdf.addPage();
            pdf.addImage(imgData, 'JPEG', 0, 0, 210, 297, undefined, 'FAST');
            stage.remove();
        }
        const blob = pdf.output('blob');
        const url = URL.createObjectURL(blob);
        return { url, blob };
}

export function downloadFile(url: string, filename: string) {
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
}

export async function shareFile(file: File | Blob, filename?: string) {
    if (typeof navigator !== 'undefined' && navigator.share) {
        const f = file instanceof File ? file : new File([file], filename || 'document.pdf', { type: file.type })
        if (navigator.canShare && navigator.canShare({ files: [f] })) {
            try {
                await navigator.share({
                    files: [f],
                    title: f.name,
                })
            } catch (error) {
                console.error('Error sharing file:', error)
            }
        }
    } else {
        console.warn('Web Share API not supported')
    }
}

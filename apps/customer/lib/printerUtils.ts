import { PrinterSocket } from 'custom-printer-plugin';
import { Capacitor } from '@capacitor/core'

// =====================================================
// INTERFACES
// =====================================================

export interface PrintItem {
  name: string
  quantity: number
  price?: number
  subtotal?: number
  modifiers?: string[]
  selected_modifiers?: Array<{
    name?: string
    value?: string
    price?: number
    group_name?: string
    label?: string
    display_name?: string
  }>
}

export interface PrintOrderData {
  orderNumber: string
  date: string
  orderSource?: string
  staffName?: string
  customerName?: string
  tableNumber?: string
  queueNumber?: string
  items: PrintItem[]
  subtotal?: number
  discount?: number
  tax?: number
  total?: number
  paymentMethod?: string
  receivedAmount?: number
  changeAmount?: number
  orderType?: string
  deliveryPlatform?: string
  referenceName?: string
  deliveryFee?: number
  comment?: string
  pickupTime?: string
}

export interface PrintShopData {
  name: string
  branch?: string
  taxId?: string
  address?: string
  phone?: string
  receiptHeader?: string
  receiptFooter?: string
  receiptFontSize?: 'normal' | 'large'
  kitchenFontSize?: 'normal' | 'large' | 'huge'
  kitchenShowType?: boolean
  receipt_story_mode?: boolean
  receipt_stories?: Array<{ title: string, content: string }>
  receiptPaymentQrImage?: string
}

export interface PrintZReportData {
  shiftId: string
  openedAt: string
  closedAt: string
  staffName: string
  startCash?: number
  orderCount?: number
  cashOrderCount?: number
  nonCashOrderCount?: number
  cashSales?: number
  transferSales?: number
  cardSales?: number
  otherSales?: number
  discountTotal?: number
  payInTotal?: number
  payOutTotal?: number
  expectedCash: number
  actualCash: number
  difference: number
  paymentBreakdown?: Array<{ label: string; amount: number; count?: number }>
  orderTypeBreakdown?: Array<{ label: string; count: number }>
  transactionBreakdown?: Array<{ label: string; amount: number }>
  notes?: string
}

// =====================================================
// THAI TIS-620 ENCODER
// Thai Unicode U+0E01–U+0E5B → TIS-620 byte = codepoint - 0x0E00 + 0xA0
// No external library needed — pure math
// =====================================================

export const toThaiBytes = (text: string, encoding: string = 'ku42'): number[] => {
  const bytes: number[] = []
  for (let i = 0; i < text.length; i++) {
    const cp = text.charCodeAt(i)
    if (cp < 0x80) {
      bytes.push(cp)
    } else if (cp >= 0x0E01 && cp <= 0x0E5B) {
      const tis620 = cp - 0x0E00 + 0xA0
      if (encoding === 'ku42') {
        // Map TIS-620 to KU42 (CP27 on Xprinter)
        if (tis620 >= 0xD0 && tis620 <= 0xDA) {
          bytes.push(tis620 - 0xD0 + 0x8C)
        } else if (tis620 >= 0xE7 && tis620 <= 0xED) {
          bytes.push(tis620 - 0xE7 + 0x97)
        } else {
          bytes.push(tis620)
        }
      } else {
        // Standard TIS-620 / CP874
        bytes.push(tis620)
      }
    } else {
      bytes.push(0x3F) // ?
    }
  }
  return bytes
}

const padRight = (str: string, width: number) =>
  str.length >= width ? str.slice(0, width) : str + ' '.repeat(width - str.length)

const padLeft = (str: string, width: number) =>
  str.length >= width ? str.slice(-width) : ' '.repeat(width - str.length) + str

const formatCurrency = (val: number) =>
  new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(val)

const formatOrderTypeLabel = (orderType?: string) => {
  if (!orderType) return '-'
  if (orderType === 'dine-in' || orderType === 'dine_in') return 'ทานที่ร้าน (Dine-In)'
  if (orderType === 'takeaway') return 'สั่งกลับบ้าน (Takeaway)'
  if (orderType === 'delivery') return 'เดลิเวอรี่ (Delivery)'
  return orderType.replace(/_/g, ' ').toUpperCase()
}

const formatModifierLabel = (modifier: any) => {
  if (!modifier) return ''
  const name = modifier.display_name || modifier.label || modifier.group_name || modifier.name || 'Option'
  const value = modifier.value || modifier.selected_value || modifier.option_value || modifier.option_name || ''
  if ((modifier.is_note || name === 'หมายเหตุ') && value) return `หมายเหตุ: ${value}`
  if (value && value !== name) return `${name}: ${value}`
  if (modifier.price && Number(modifier.price) !== 0) return `${name} (+${formatCurrency(Number(modifier.price))})`
  return name
}

const getPrintedModifierLines = (item: PrintItem) => {
  if (Array.isArray(item.selected_modifiers) && item.selected_modifiers.length > 0) {
    return item.selected_modifiers.map(formatModifierLabel).filter(Boolean)
  }
  return (item.modifiers || []).filter(Boolean)
}

const formatDeliveryPlatformLabel = (platform?: string) => {
  if (!platform) return '-'
  return platform.replace(/_/g, ' ').toUpperCase()
}

const extractPickupTime = (comment?: string, pickupTime?: string) => {
  const explicit = String(pickupTime || '').trim()
  if (explicit) return explicit
  const raw = String(comment || '')
  const pickupMatch = raw.match(/(?:เวลารับ|pickup\s*time)\s*:\s*([^\n]+)/i)
  return pickupMatch?.[1]?.trim() || ''
}

const extractOrderNote = (comment?: string) => {
  const raw = String(comment || '').trim()
  if (!raw) return ''
  return raw
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => !/^(?:เวลารับ|pickup\s*time)\s*:/i.test(line))
    .join('\n')
}

const centerText = (text: string, width: number) => {
  const value = String(text ?? '')
  if (value.length >= width) return value.slice(0, width)
  const totalPadding = width - value.length
  const left = Math.floor(totalPadding / 2)
  const right = totalPadding - left
  return `${' '.repeat(left)}${value}${' '.repeat(right)}`
}

const appendCenteredBox = (b: ESCPOSBuilder, lines: string[]) => {
  const innerWidth = 46
  b.line(`+${'-'.repeat(innerWidth)}+`)
  lines.forEach((line) => {
    b.line(`|${centerText(line, innerWidth)}|`)
  })
  b.line(`+${'-'.repeat(innerWidth)}+`)
}

const appendDeliveryDetails = (b: ESCPOSBuilder, order: PrintOrderData, boxed = true) => {
  if (!order.deliveryPlatform && !order.referenceName) return

  b.align('center').bold(true).line('ข้อมูลเดลิเวอรี่').bold(false)
  if (boxed) {
    b.bold(true).size(1, 2)
    appendCenteredBox(b, [
      `ค่าย: ${formatDeliveryPlatformLabel(order.deliveryPlatform)}`,
      `เลข: ${order.referenceName || '-'}`,
      ...(order.deliveryFee && Number(order.deliveryFee) > 0 ? [`ค่าส่ง: ${formatCurrency(Number(order.deliveryFee))}`] : []),
    ])
    b.size(1, 1).bold(false)
  } else {
    b.align('left')
    b.bold(true).size(1, 2).line(`ค่าย: ${formatDeliveryPlatformLabel(order.deliveryPlatform)}`)
    if (order.referenceName) b.line(`เลข: ${order.referenceName}`)
    if (order.deliveryFee && Number(order.deliveryFee) > 0) b.line(`ค่าส่ง: ${formatCurrency(Number(order.deliveryFee))}`)
    b.size(1, 1).bold(false)
  }
}

const appendOrderNotes = (b: ESCPOSBuilder, order: PrintOrderData) => {
  const pickupTime = extractPickupTime(order.comment, order.pickupTime)
  const orderNote = extractOrderNote(order.comment)
  if (!pickupTime && !orderNote) return

  b.align('left').lf()
  b.bold(true).line('ข้อมูลเพิ่มเติม').bold(false)
  if (pickupTime) b.line(`เวลารับ: ${pickupTime}`)
  if (orderNote) orderNote.split('\n').forEach((line) => b.line(line))
  b.lf()
}

const appendReceiptStory = (b: ESCPOSBuilder, shop: PrintShopData) => {
  if (!shop.receipt_story_mode || !shop.receipt_stories || shop.receipt_stories.length === 0) return
  const story = shop.receipt_stories[Math.floor(Math.random() * shop.receipt_stories.length)]
  b.lf()
  b.align('center').bold(true).line('~*~*~*~*~*~*~*~*~').lf()
  b.line(story.title).bold(false)
  story.content.split('\n').forEach((l) => b.line(l))
  b.lf()
}

// =====================================================
// RAW ESC/POS BUILDER
// Does NOT use receipt-printer-encoder — avoids 1C 2E (FS .) interference
// =====================================================

class ESCPOSBuilder {
  private bytes: number[] = []
  private cols: number
  private encoding: string

  constructor(cols = 48, encoding = 'ku42') {
    this.cols = cols
    this.encoding = encoding
  }

  /** Initialize printer and switch to Thai mode */
  init(): this {
    this.bytes.push(0x1B, 0x40)          // ESC @ - Initialize
    this.bytes.push(0x1C, 0x2E)          // FS .  - Cancel Chinese mode (exit GBK)
    
    // Set character code table
    const codepage = this.encoding === 'ku42' ? 0x1B : 0x1A;
    this.bytes.push(0x1B, 0x74, codepage) // ESC t 
    return this
  }

  align(a: 'left' | 'center' | 'right'): this {
    const n = a === 'center' ? 1 : a === 'right' ? 2 : 0
    this.bytes.push(0x1B, 0x61, n)       // ESC a n
    return this
  }

  bold(on: boolean): this {
    this.bytes.push(0x1B, 0x45, on ? 1 : 0) // ESC E n
    return this
  }

  /** w,h: 1=normal 2=double */
  size(w: 1 | 2, h: 1 | 2): this {
    const n = ((w - 1) << 4) | (h - 1)
    this.bytes.push(0x1D, 0x21, n)       // GS ! n
    return this
  }

  invert(on: boolean): this {
    this.bytes.push(0x1D, 0x42, on ? 1 : 0) // GS B n
    return this
  }

  text(str: string): this {
    this.bytes.push(...toThaiBytes(str, this.encoding))
    return this
  }

  line(str: string): this {
    return this.text(str).lf()
  }

  lf(): this {
    this.bytes.push(0x0A)
    return this
  }

  dash(): this {
    return this.line('-'.repeat(this.cols))
  }

  /** Two-column row: left aligned + right aligned */
  row(left: string, right: string, leftWidth?: number): this {
    const lw = leftWidth ?? Math.floor(this.cols * 0.65)
    const rw = this.cols - lw
    return this.line(padRight(left, lw) + padLeft(right, rw))
  }

  /** Feed 3 lines + partial cut */
  cut(): this {
    this.bytes.push(0x0A, 0x0A, 0x0A)
    this.bytes.push(0x1D, 0x56, 0x41, 0x03) // GS V A 3
    return this
  }

  /** Append raw bytes (e.g. drawer pulse) */
  rawBytes(bytes: number[]): this {
    this.bytes.push(...bytes)
    return this
  }

  hex(): string {
    return this.bytes.map(b => b.toString(16).padStart(2, '0')).join('')
  }
}

const normalizePaymentMethod = (method?: string) => String(method || '').trim().toLowerCase()

const shouldPrintReceiptPaymentQr = (order: PrintOrderData, shop: PrintShopData) => {
  if (!shop.receiptPaymentQrImage) return false
  const source = normalizePaymentMethod(order.orderSource)
  const paymentMethod = normalizePaymentMethod(order.paymentMethod)
  return source === 'liff' && order.orderType === 'delivery' && ['cod', 'cash_on_delivery', 'cash-on-delivery'].includes(paymentMethod)
}

const loadImageElement = (src: string): Promise<HTMLImageElement> => {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || typeof Image === 'undefined') {
      reject(new Error('Image loading is not available'))
      return
    }

    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('Failed to load image'))
    img.src = src
  })
}

const imageSrcToCanvas = async (src: string, targetWidth = 220): Promise<HTMLCanvasElement | null> => {
  try {
    const img = await loadImageElement(src)
    const naturalWidth = img.naturalWidth || img.width || targetWidth
    const naturalHeight = img.naturalHeight || img.height || targetWidth
    const scale = naturalWidth > targetWidth ? targetWidth / naturalWidth : 1
    const width = Math.max(1, Math.round(naturalWidth * scale))
    const height = Math.max(1, Math.round(naturalHeight * scale))
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d', { willReadFrequently: true })
    if (!ctx) return null
    ctx.fillStyle = '#FFFFFF'
    ctx.fillRect(0, 0, width, height)
    ctx.drawImage(img, 0, 0, width, height)
    return canvas
  } catch (error) {
    console.warn('QR image load failed:', error)
    return null
  }
}

const canvasToRasterBytes = (canvas: HTMLCanvasElement): number[] => {
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  if (!ctx) return []

  const width = canvas.width
  const height = canvas.height
  const imgData = ctx.getImageData(0, 0, width, height).data
  const bytesWidth = Math.ceil(width / 8)
  const out: number[] = [
    0x1D, 0x76, 0x30, 0x00,
    bytesWidth % 256, Math.floor(bytesWidth / 256),
    height % 256, Math.floor(height / 256),
  ]

  for (let y = 0; y < height; y++) {
    for (let xByte = 0; xByte < bytesWidth; xByte++) {
      let b = 0
      for (let bit = 0; bit < 8; bit++) {
        const x = xByte * 8 + bit
        if (x < width) {
          const i = (y * width + x) * 4
          const r = imgData[i]
          const g = imgData[i + 1]
          const bVal = imgData[i + 2]
          const a = imgData[i + 3]
          const lum = (r * 299 + g * 587 + bVal * 114) / 1000
          if (lum < 160 && a > 32) b |= (1 << (7 - bit))
        }
      }
      out.push(b)
    }
  }

  out.push(0x0A, 0x0A, 0x0A)
  return out
}

const appendReceiptPaymentQr = async (b: ESCPOSBuilder, order: PrintOrderData, shop: PrintShopData) => {
  if (!shouldPrintReceiptPaymentQr(order, shop)) return
  b.lf().align('center').bold(true).line('สแกน QR ชำระเงิน').bold(false)
  const canvas = await imageSrcToCanvas(shop.receiptPaymentQrImage as string, 220)
  if (!canvas) {
    b.line('(ไม่พบรูป QR)')
    return
  }
  const qrBytes = canvasToRasterBytes(canvas)
  if (qrBytes.length > 0) {
    b.rawBytes(qrBytes)
  }
}

// =====================================================
// TCP TRANSPORT
// =====================================================

const sendToPrinter = async (ip: string, hexData: string): Promise<boolean | string> => {
  try {
    if (Capacitor.isNativePlatform()) {
      await PrinterSocket.send({ ipAddress: ip, port: 9100, data: hexData })
      return true
    } else {
      const response = await fetch('/api/printer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ip, port: 9100, data: hexData }),
      })
      if (!response.ok) throw new Error('API Print failed')
      return true
    }
  } catch (error: any) {
    console.error('Printer Connection Error:', error)
    return error.message || JSON.stringify(error) || 'Unknown TCP error'
  }
}

// =====================================================
// GRAPHIC MODE (Wongnai Style)
// Convert HTML5 Canvas to ESC/POS Raster Bit-Image (GS v 0)
// =====================================================

export const printCanvasViaEscPos = async (ip: string, canvas: HTMLCanvasElement): Promise<boolean | string> => {
  try {
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return false;

    const width = canvas.width;
    const height = canvas.height;
    const imgData = ctx.getImageData(0, 0, width, height).data;

    const bytesWidth = Math.ceil(width / 8);
    
    // Allocate exact size for Uint8Array (header + body + footer)
    // Header: 2 + 2 + 4 + 2 + 2 = 12 bytes
    // Body: bytesWidth * height
    // Footer: 3 + 4 = 7 bytes
    const bufferSize = 12 + (bytesWidth * height) + 7;
    const buffer = new Uint8Array(bufferSize);
    
    let offset = 0;
    // Init & Cancel Chinese
    buffer[offset++] = 0x1B; buffer[offset++] = 0x40;
    buffer[offset++] = 0x1C; buffer[offset++] = 0x2E;
    
    // Raster Bit-Image (GS v 0)
    buffer[offset++] = 0x1D; buffer[offset++] = 0x76; buffer[offset++] = 0x30; buffer[offset++] = 0x00;
    buffer[offset++] = bytesWidth % 256; buffer[offset++] = Math.floor(bytesWidth / 256);
    buffer[offset++] = height % 256; buffer[offset++] = Math.floor(height / 256);

    for (let y = 0; y < height; y++) {
      for (let xByte = 0; xByte < bytesWidth; xByte++) {
        let b = 0;
        for (let bit = 0; bit < 8; bit++) {
          const x = xByte * 8 + bit;
          if (x < width) {
            const i = (y * width + x) * 4;
            const r = imgData[i];
            const g = imgData[i + 1];
            const bVal = imgData[i + 2];
            const a = imgData[i + 3];
            
            // Fast integer luminosity
            const lum = (r * 299 + g * 587 + bVal * 114) / 1000;
            if (lum < 128 && a > 128) {
              b |= (1 << (7 - bit));
            }
          }
        }
        buffer[offset++] = b;
      }
    }

    // Cut
    buffer[offset++] = 0x0A; buffer[offset++] = 0x0A; buffer[offset++] = 0x0A;
    buffer[offset++] = 0x1D; buffer[offset++] = 0x56; buffer[offset++] = 0x41; buffer[offset++] = 0x03;

    // Fast hex conversion using lookup table
    const hexLookup = new Array(256);
    for (let i = 0; i < 256; i++) {
      hexLookup[i] = i.toString(16).padStart(2, '0');
    }
    
    const hexArr = new Array(bufferSize);
    for (let i = 0; i < bufferSize; i++) {
      hexArr[i] = hexLookup[buffer[i]];
    }
    const hex = hexArr.join('');

    return await sendToPrinter(ip, hex);
  } catch (error: any) {
    console.error('Graphic Print Error:', error);
    return error.message || 'Unknown Graphic Error';
  }
}

// =====================================================
// OPEN CASH DRAWER — raw pulse, no encoder
// =====================================================

export const printOpenDrawer = async (ip: string, model = 'xprinter-xp-n160ii') => {
  try {
    const drawerBytes = [
      0x1B, 0x70, 0x00, 0x19, 0xFA, // Pin 2: 50ms on / 500ms off
      0x1B, 0x70, 0x01, 0x19, 0xFA, // Pin 5: backup
    ]
    const hex = drawerBytes.map(b => b.toString(16).padStart(2, '0')).join('')
    return await sendToPrinter(ip, hex)
  } catch (error) {
    console.error('Drawer Error:', error)
    return false
  }
}

// =====================================================
// TEST CONNECTION
// =====================================================

export const testPrinterConnection = async (ip: string, model = 'xprinter-xp-n160ii', encoding = 'ku42') => {
  try {
    const b = new ESCPOSBuilder(48, encoding || 'cp874')
    b.init()
     .align('center').bold(true).line('PRINTER TEST SUCCESS').bold(false)
     .align('left').lf()
     .line(`IP: ${ip}`)
     .line(`Model: ${model}`)
     .lf()
     .line('Thai: สวัสดี ยินดีต้อนรับ')
     .cut()
    return await sendToPrinter(ip, b.hex())
  } catch (error: any) {
    console.error('Printer Test Error:', error)
    return error.message || 'Unknown Error'
  }
}

/**
 * Print a CODEPAGE SWEEP — all codepages 0x00 to 0x1F in one receipt
 * Look for the line that shows correct Thai: สวัสดี
 * That codepage number is the correct setting for this printer
 */
export const findThaiCodepage = async (ip: string): Promise<boolean | string> => {
  try {
    return true
  } catch (error: any) {
    return false
  }
}

// =====================================================
// CUSTOMER RECEIPT
// =====================================================

export const printCustomerReceipt = async (
  ip: string,
  order: PrintOrderData,
  shop: PrintShopData,
  model = 'xprinter-xp-n160ii',
  encoding = 'ku42',
  openDrawer = false
) => {
  try {
    const b = new ESCPOSBuilder(48, encoding || 'cp874')
    b.init()

    // Header
    b.align('center')
    if (shop.receiptHeader) {
      shop.receiptHeader.split('\n').forEach(l => b.line(l))
      b.lf()
    }

    b.bold(true).size(2, 2).line(shop.name || 'XYL STUDIO').size(1, 1).bold(false)

    if (shop.branch) b.line(`สาขา: ${shop.branch}`)
    if (shop.taxId) b.line(`TAX ID: ${shop.taxId}`)
    if (shop.address) shop.address.split('\n').forEach(l => b.line(l))
    if (shop.phone) b.line(`โทร: ${shop.phone}`)

    b.dash()

    // Order info
    b.align('left')
    b.size(1, 2).line(`วันที่: ${order.date.split(',')[0] || order.date}`).size(1, 1)
    b.align('left')
    if (order.tableNumber) b.size(1, 2).line(`โต๊ะ: ${order.tableNumber}`).size(1, 1)
    if (order.customerName) b.size(1, 2).line(`ลูกค้า: ${order.customerName}`).size(1, 1)
    if (order.orderType) b.size(1, 2).line(`ประเภท: ${formatOrderTypeLabel(order.orderType)}`).size(1, 1)
    appendDeliveryDetails(b, order, false)

    b.dash()

    // Items
    order.items.forEach(item => {
      const name = `${item.quantity}x ${item.name}`
      const price = item.subtotal !== undefined ? formatCurrency(item.subtotal) : ''
      b.bold(true).size(1, 2).row(name, price, 34).size(1, 1).bold(false)
      getPrintedModifierLines(item).forEach(mod => b.size(1, 2).line(`   - ${mod}`).size(1, 1))
    })

    b.dash()

    // Totals
    if (order.discount && order.discount > 0)
      b.size(1, 2).row('ส่วนลด', `-${formatCurrency(order.discount)}`, 30).size(1, 1)
    if (order.tax && order.tax > 0)
      b.size(1, 2).row('ภาษี', formatCurrency(order.tax), 30).size(1, 1)
    if (order.deliveryFee && Number(order.deliveryFee) > 0)
      b.size(1, 2).row('ค่าส่ง', formatCurrency(Number(order.deliveryFee)), 30).size(1, 1)

    b.bold(true).size(1, 2).row('ยอดรวม', formatCurrency(order.total || 0), 30).size(1, 1).bold(false)

    if (order.receivedAmount && order.receivedAmount > 0) {
      b.size(1, 2).row(`รับเงิน (${order.paymentMethod || 'CASH'})`, formatCurrency(order.receivedAmount), 30).size(1, 1)
      b.bold(true).size(1, 2).row('เงินทอน', formatCurrency(order.changeAmount || 0), 30).size(1, 1).bold(false)
    }

    b.dash().align('center')

    if (shop.receiptFooter) {
      shop.receiptFooter.split('\n').forEach(l => b.line(l))
      b.lf()
    } else {
      b.line('Thank you').lf().line('Powered by XYL STUDIO').lf()
    }
    appendReceiptStory(b, shop)
    await appendReceiptPaymentQr(b, order, shop)

    b.cut()

    // Drawer pulse appended after cut (raw bytes)
    if (openDrawer) {
      b.rawBytes([0x1B, 0x70, 0x00, 0x19, 0xFA, 0x1B, 0x70, 0x01, 0x19, 0xFA])
    }

    return await sendToPrinter(ip, b.hex())
  } catch (error) {
    console.error('Customer Receipt Print Error:', error)
    return false
  }
}

// =====================================================
// KITCHEN TICKET
// =====================================================

export const printKitchenTicket = async (
  ip: string,
  order: PrintOrderData,
  shop: PrintShopData,
  model = 'xprinter-xp-n160ii',
  encoding = 'cp874'
) => {
  try {
    const b = new ESCPOSBuilder(48, encoding || 'cp874')
    b.init()

    b.align('center').bold(true).size(2, 2).line('ใบสั่งอาหาร').size(1, 1).bold(false).lf()

    if (shop.kitchenShowType !== false) {
      b.align('center').bold(true).size(2, 2).invert(true).line(` ${formatOrderTypeLabel(order.orderType)} `).invert(false).size(1, 1).bold(false).lf()
    }

    b.align('left')
    const timeOnly = order.date.split(',')[1]?.trim() || order.date
    b.bold(true)
    b.align('right').line(`เวลา: ${timeOnly}`)
    b.align('center')
    if (order.orderType === 'delivery') {
      b.bold(true).line('ข้อมูลเดลิเวอรี่').size(2, 2)
        .line(formatDeliveryPlatformLabel(order.deliveryPlatform))
        .line(order.referenceName || '-')
        .size(1, 1).bold(false).lf()
    } else if (order.orderType === 'dine-in' || order.orderType === 'dine_in') {
      b.bold(true).line('โต๊ะ').size(2, 2).line(order.tableNumber || '-').size(1, 1).bold(false).lf()
    } else {
      b.bold(true).line('TAKEAWAY').size(2, 2).line(`คิว: ${order.queueNumber || '-'}`).size(1, 1).bold(false).lf()
    }
    if (order.orderType !== 'delivery') b.align('center').size(1, 2).line(`เลขบิลระบบ: ${order.orderNumber}`).size(1, 1)
    b.align('left')
    if (order.orderType) b.line(`ประเภท: ${formatOrderTypeLabel(order.orderType)}`)
    b.bold(false).dash()
    appendOrderNotes(b, order)

    order.items.forEach(item => {
      const name = `${item.quantity}x ${item.name}`
      if (shop.kitchenFontSize === 'huge' || shop.kitchenFontSize === 'large') {
        b.bold(true).size(2, 2).line(name).size(1, 1).bold(false)
      } else {
        b.bold(true).size(1, 2).line(name).size(1, 1).bold(false)
      }
      getPrintedModifierLines(item).forEach(mod => b.size(1, 2).line(`   - ${mod}`).size(1, 1))
      b.lf()
    })

    b.dash().lf().align('center').line('--- END ---').cut()

    return await sendToPrinter(ip, b.hex())
  } catch (error) {
    console.error('Kitchen Ticket Print Error:', error)
    return false
  }
}

// =====================================================
// Z-REPORT
// =====================================================

export const printZReport = async (
  ip: string,
  report: PrintZReportData,
  shop: PrintShopData,
  model = 'xprinter-xp-n160ii',
  encoding = 'ku42'
) => {
  try {
    const b = new ESCPOSBuilder(48, encoding || 'cp874')
    b.init()

    b.align('center').bold(true).size(2, 2).line('DAILY DRAWER SUMMARY').size(1, 1)
      .line('Z-REPORT / END OF SHIFT').bold(false).lf()

    if (shop.name) b.line(shop.name)
    if (shop.branch) b.line(`สาขา: ${shop.branch}`)

    b.align('left').lf()
    b.bold(true).line('SHIFT INFO / ข้อมูลกะ').bold(false)
    b.line(`Shift ID  : ${report.shiftId.slice(0, 8)}`)
    b.line(`Staff     : ${report.staffName}`)
    b.line(`Opened At : ${report.openedAt}`)
    b.line(`Closed At : ${report.closedAt}`)
    b.line(`Start Cash: ${formatCurrency(report.startCash || 0)}`)
    b.line(`Orders    : ${report.orderCount ?? 0}`)
    b.line(`Cash Ord. : ${report.cashOrderCount ?? 0}`)
    b.line(`Non-Cash  : ${report.nonCashOrderCount ?? 0}`)

    b.dash()
    b.bold(true).line('DRAWER SUMMARY / สรุปลิ้นชัก').bold(false)
    b.row('Expected Cash', formatCurrency(report.expectedCash), 34)
    b.row('Actual Cash', formatCurrency(report.actualCash), 34)

    const diffLabel = report.difference < 0 ? 'เงินขาด' : report.difference > 0 ? 'เงินเกิน' : 'ยอดต่าง'
    b.bold(true).row(diffLabel, formatCurrency(report.difference), 34).bold(false)
    if (typeof report.payInTotal === 'number' || typeof report.payOutTotal === 'number') {
      b.row('Pay In', formatCurrency(report.payInTotal || 0), 34)
      b.row('Pay Out', formatCurrency(report.payOutTotal || 0), 34)
    }

    b.dash()
    b.bold(true).line('SALES SUMMARY / สรุปรายรับ').bold(false)
    b.row('Cash Sales', formatCurrency(report.cashSales || 0), 34)
    b.row('Transfer Sales', formatCurrency(report.transferSales || 0), 34)
    b.row('Card Sales', formatCurrency(report.cardSales || 0), 34)
    if ((report.otherSales || 0) > 0) b.row('Other Sales', formatCurrency(report.otherSales || 0), 34)
    b.bold(true).row('TOTAL SALES', formatCurrency((report.cashSales || 0) + (report.transferSales || 0) + (report.cardSales || 0) + (report.otherSales || 0)), 34).bold(false)

    if (report.discountTotal !== undefined) {
      b.dash()
      b.bold(true).line('DISCOUNT SUMMARY / ส่วนลดรวม').bold(false)
      b.row('Discount Total', formatCurrency(report.discountTotal || 0), 34)
    }

    if (report.paymentBreakdown?.length) {
      b.dash()
      b.bold(true).line('PAYMENT BREAKDOWN / ชำระตามช่องทาง').bold(false)
      report.paymentBreakdown
        .filter((row) => row.amount > 0)
        .forEach((row) => b.row(row.label, formatCurrency(row.amount), 34))
    }

    if (report.orderTypeBreakdown?.length) {
      b.dash()
      b.bold(true).line('ORDER TYPE / ประเภทออเดอร์').bold(false)
      report.orderTypeBreakdown
        .filter((row) => row.count > 0)
        .forEach((row) => b.row(row.label, `${row.count}`, 34))
    }

    if (report.transactionBreakdown?.length) {
      b.dash()
      b.bold(true).line('SHIFT CASH FLOW / เงินสดระหว่างกะ').bold(false)
      report.transactionBreakdown
        .filter((row) => row.amount > 0)
        .forEach((row) => b.row(row.label, formatCurrency(row.amount), 34))
    }

    if (report.notes) {
      b.dash()
      b.bold(true).line('หมายเหตุ').bold(false)
      report.notes.split('\n').forEach((line) => b.line(line))
    }

    b.dash().lf().align('center').bold(true).size(2, 2).line('--- END OF DAILY SUMMARY ---').size(1, 1).bold(false).cut()

    return await sendToPrinter(ip, b.hex())
  } catch (error) {
    console.error('Z-Report Print Error:', error)
    return false
  }
}

// =====================================================
// PRE-RECEIPT / BILL
// =====================================================

export const printPreReceipt = async (
  ip: string,
  cart: any[],
  cartSubtotal: number,
  cartDiscount: number,
  taxAmount: number,
  cartTotal: number,
  shop: PrintShopData,
  tableNumber?: string,
  orderType: string = 'dine_in',
  deliveryPlatform?: string,
  referenceName?: string,
  model = 'xprinter-xp-n160ii',
  encoding = 'cp874'
) => {
  try {
    const b = new ESCPOSBuilder(48, encoding || 'cp874')
    b.init()

    b.align('center')
    const isLarge = shop.receiptFontSize === 'large'
    if (isLarge) {
      b.bold(true).size(2, 2).line(shop.name || 'XYL STUDIO').size(1, 1).bold(false)
    } else {
      b.bold(true).line(shop.name || 'XYL STUDIO').bold(false)
    }

    b.lf().bold(true).line('BILL / ใบแจงยอด').bold(false).lf()
    b.align('left')
    b.row(`วันที่: ${new Date().toLocaleDateString()}`, tableNumber ? `โตะ: ${tableNumber}` : '', 30)
    b.line(`ประเภท: ${formatOrderTypeLabel(orderType)}`)
    if (orderType === 'delivery') {
      b.align('center')
      appendCenteredBox(b, [
        `ค่าย: ${formatDeliveryPlatformLabel(deliveryPlatform)}`,
        `เลข: ${referenceName || '-'}`,
      ])
      b.align('left')
    }
    b.dash()

    cart.forEach(item => {
      const qty = item.quantity || 1
      const name = `${qty}x ${item.name}`
      const price = formatCurrency((item.subtotal ?? ((item.sale_price || item.price || 0) * qty)))
      if (isLarge) {
        b.size(1, 2).row(name, price, 34).size(1, 1)
      } else {
        b.row(name, price, 34)
      }
      getPrintedModifierLines(item).forEach((mod) => b.line(`   - ${mod}`))
    })

    b.dash()
    if (cartDiscount > 0) b.row('ส่วนลด', `-${formatCurrency(cartDiscount)}`, 30)
    if (taxAmount > 0) b.row('ภาษี', formatCurrency(taxAmount), 30)
    b.bold(true).row('ยอดรวม (Total)', formatCurrency(cartTotal), 30).bold(false)

    b.lf().align('center')
    if (shop.receiptFooter) {
      shop.receiptFooter.split('\n').forEach(l => b.line(l))
    } else {
      b.line('Please review your order')
    }
    b.cut()

    return await sendToPrinter(ip, b.hex())
  } catch (error) {
    console.error('Pre-Receipt Print Error:', error)
    return false
  }
}

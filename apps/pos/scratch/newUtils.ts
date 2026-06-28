import ReceiptPrinterEncoder from '@point-of-sale/receipt-printer-encoder'
import { PrinterSocket } from 'custom-printer-plugin';

export interface PrintItem {
  name: string
  quantity: number
  price?: number
  subtotal?: number
  modifiers?: string[]
}

export interface PrintOrderData {
  orderNumber: string
  date: string
  staffName?: string
  customerName?: string
  tableNumber?: string
  queueNumber?: string
  items: PrintItem[]
  subtotal: number
  discount: number
  tax: number
  total: number
  paymentMethod?: string
  receivedAmount?: number
  changeAmount?: number
  orderType?: string
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
}

const sendToPrinter = async (ip: string, hexData: string): Promise<boolean | string> => {
  try {
    await PrinterSocket.send({ ipAddress: ip, port: 9100, data: hexData })
    return true
  } catch (error: any) {
    console.error('Printer Connection Error:', error)
    return error.message || JSON.stringify(error) || 'Unknown TCP error'
  }
}

/**
 * Open Cash Drawer immediately
 */
export const printOpenDrawer = async (ip: string, model: string = 'xprinter-xp-n160ii') => {
  try {
    const encoder = new ReceiptPrinterEncoder({ printerModel: model as any, columns: 48, codepageMapping: { 'cp874': 0xff, 'tis620': 0xff } })
    // Pulse both pins (0 and 1) for 100ms each, directly using raw bytes to prevent any framework interference
    const printData = encoder.raw([0x1B, 0x70, 0x00, 0x32, 0x32, 0x1B, 0x70, 0x01, 0x32, 0x32]).encode()
    let hex = ''
    printData.forEach((b: any) => hex += b.toString(16).padStart(2, '0'))
    return await sendToPrinter(ip, hex)
  } catch (error) {
    console.error('Drawer Error:', error)
    return false
  }
}

/**
 * Test Connection by printing a small slip
 */
export const testPrinterConnection = async (ip: string, model: string = 'xprinter-xp-n160ii', encoding: string = 'cp874'): Promise<boolean | string> => {
  try {
    const encoder = new ReceiptPrinterEncoder({ printerModel: model as any, columns: 48, codepageMapping: { 'cp874': 0xff, 'tis620': 0xff } })
    const printData = encoder
      .initialize()
      .codepage(encoding as any)
      .align('center')
      .bold(true)
      .line('PRINTER TEST SUCCESS')
      .bold(false)
      .newline()
      .line(`IP: ${ip}`)
      .line(`Model: ${model}`)
      .newline()
      .newline()
      .newline()
      .cut()
      .encode()

    let hex = ''
    printData.forEach((b: any) => hex += b.toString(16).padStart(2, '0'))
    
    return await sendToPrinter(ip, hex)
  } catch (error: any) {
    console.error('Printer Test Error:', error)
    return error.message || JSON.stringify(error) || 'Unknown Error'
  }
}

/**
 * Format currency nicely
 */
const formatCurrency = (val: number) => {
  return new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(val)
}

/**
 * Print a Customer Receipt (ใบเสร็จรับเงิน)
 */
export const printCustomerReceipt = async (ip: string, order: PrintOrderData, shop: PrintShopData, model: string = 'xprinter-xp-n160ii', encoding: string = 'cp874', openDrawer: boolean = false) => {
  try {
    const encoder = new ReceiptPrinterEncoder({ printerModel: model as any, columns: 48, codepageMapping: { 'cp874': 0xff, 'tis620': 0xff } })
    let result = encoder.initialize().codepage(encoding as any)

    // Header
    result = result.align('center')
    
    if (shop.receiptHeader) {
      const headerLines = shop.receiptHeader.split('\n')
      headerLines.forEach(line => result = result.line(line))
      result = result.newline()
    }

    const isLarge = shop.receiptFontSize === 'large'
    
    if (isLarge) {
        result = result.bold(true).size(2, 2).line(shop.name || 'XYLEM LANDSCAPE').size(1, 1).bold(false)
    } else {
        result = result.bold(true).line(shop.name || 'XYLEM LANDSCAPE').bold(false)
    }

    if (shop.branch) result = result.line(`สาขา: ${shop.branch}`)
    if (shop.taxId) result = result.line(`TAX ID: ${shop.taxId}`)
    if (shop.address) {
        const addressLines = shop.address.split('\n')
        addressLines.forEach(line => result = result.line(line))
    }
    if (shop.phone) result = result.line(`โทร: ${shop.phone}`)
    
    result = result.line('-'.repeat(48))

    // Order Info Table
    const infoRows: [string, string][] = []
    infoRows.push([`วันที่: ${order.date.split(',')[0] || order.date}`, `คิว: ${order.queueNumber || '-'}`])
    infoRows.push([`พนักงาน: ${order.staffName || '-'}`, `เลขที่: ${order.orderNumber}`])
    if (order.tableNumber) infoRows.push([`โต๊ะ: ${order.tableNumber}`, ''])
    if (order.customerName) infoRows.push([`ลูกค้า: ${order.customerName}`, ''])

    infoRows.forEach(row => {
      result = result.table(
        [{ width: 30, align: 'left' }, { width: 18, align: 'right' }],
        [row]
      )
    })
    
    result = result.line('-'.repeat(48))

    // Items
    order.items.forEach(item => {
      const itemName = `${item.quantity}x ${item.name}`
      const itemPrice = item.subtotal !== undefined ? formatCurrency(item.subtotal) : ''
      
      if (isLarge) {
          result = result.size(1, 2).table([{ width: 34, align: 'left' }, { width: 14, align: 'right' }], [[itemName, itemPrice]]).size(1, 1)
      } else {
          result = result.table([{ width: 34, align: 'left' }, { width: 14, align: 'right' }], [[itemName, itemPrice]])
      }
      
      if (item.modifiers && item.modifiers.length > 0) {
        item.modifiers.forEach(mod => {
            result = result.table([{ width: 4, align: 'left'}, { width: 44, align: 'left' }], [['', `- ${mod}`]])
        })
      }
    })

    result = result.line('-'.repeat(48))

    // Totals
    if (order.discount > 0) {
        result = result.table([{ width: 30, align: 'left' }, { width: 18, align: 'right' }], [['ส่วนลด', `-${formatCurrency(order.discount)}`]])
    }
    if (order.tax > 0) {
        result = result.table([{ width: 30, align: 'left' }, { width: 18, align: 'right' }], [['ภาษี', formatCurrency(order.tax)]])
    }
    
    result = result.bold(true).table([{ width: 30, align: 'left' }, { width: 18, align: 'right' }], [['ยอดรวม (Total)', formatCurrency(order.total)]]).bold(false)
    
    if (order.receivedAmount !== undefined && order.receivedAmount > 0) {
        result = result.table([{ width: 30, align: 'left' }, { width: 18, align: 'right' }], [[`รับเงิน (${order.paymentMethod || 'CASH'})`, formatCurrency(order.receivedAmount)]])
        result = result.table([{ width: 30, align: 'left' }, { width: 18, align: 'right' }], [['เงินทอน', formatCurrency(order.changeAmount || 0)]])
    }

    result = result.line('-'.repeat(48))
    result = result.align('center')
    
    if (shop.receiptFooter) {
      const footerLines = shop.receiptFooter.split('\n')
      footerLines.forEach(line => result = result.line(line))
      result = result.newline()
    } else {
      result = result.line('Thank you').newline()
      result = result.line('Powered by XYL STUDIO')
    }

    // Cut paper and pulse drawer
    if (openDrawer) {
        result = result.raw([0x1B, 0x70, 0x00, 0x32, 0x32, 0x1B, 0x70, 0x01, 0x32, 0x32])
    }
    const printData = result.newline().newline().newline().cut().encode()
    let hex = ''
    printData.forEach((b: any) => hex += b.toString(16).padStart(2, '0'))
    
    return await sendToPrinter(ip, hex)
  } catch (error) {
    console.error('Customer Receipt Print Error:', error)
    return false
  }
}

/**
 * Print a Kitchen/Staff Ticket (ใบออเดอร์ครัว)
 */
export const printKitchenTicket = async (ip: string, order: PrintOrderData, shop: PrintShopData, model: string = 'xprinter-xp-n160ii', encoding: string = 'cp874') => {
  try {
    const encoder = new ReceiptPrinterEncoder({ printerModel: model as any, columns: 48, codepageMapping: { 'cp874': 0xff, 'tis620': 0xff } })
    let result = encoder.initialize().codepage(encoding as any)

    // Header
    result = result.align('center').bold(true).size(2, 2).line('ใบสั่งอาหาร').size(1, 1).bold(false).newline()
    
    // Order Type (if allowed)
    let typeLabel = ''
    if (order.orderType === 'dine-in') typeLabel = 'ทานที่ร้าน (Dine-In)'
    else if (order.orderType === 'takeaway') typeLabel = 'สั่งกลับบ้าน (Takeaway)'
    else if (order.orderType === 'delivery') typeLabel = 'เดลิเวอรี่ (Delivery)'
    else typeLabel = 'ออเดอร์ (Order)'

    if (shop.kitchenShowType !== false) {
      // Inverted colors for high visibility
      result = result.align('center').bold(true).size(2, 2).invert(true).line(` ${typeLabel} `).invert(false).size(1, 1).bold(false).newline()
    }

    result = result.align('left')
    
    const infoRows: [string, string][] = []
    const timeOnly = order.date.split(',')[1]?.trim() || order.date.split(' ')[1] || order.date
    infoRows.push([`โต๊ะ: ${order.tableNumber || '-'}`, `เวลา: ${timeOnly}`])
    infoRows.push([`คิว: ${order.queueNumber || '-'}`, `เลขที่: ${order.orderNumber}`])
    
    result = result.bold(true)
    infoRows.forEach(row => {
      result = result.table(
        [{ width: 30, align: 'left' }, { width: 18, align: 'right' }],
        [row]
      )
    })
    result = result.bold(false)
    
    result = result.line('-'.repeat(48))

    // Items (Big text for kitchen readability)
    order.items.forEach(item => {
      const itemName = `${item.quantity}x ${item.name}`
      
      if (shop.kitchenFontSize === 'huge') {
          result = result.bold(true).size(2, 2).line(itemName).size(1, 1).bold(false)
      } else if (shop.kitchenFontSize === 'large') {
          result = result.bold(true).size(1, 2).line(itemName).size(1, 1).bold(false)
      } else {
          result = result.bold(true).line(itemName).bold(false)
      }
      
      if (item.modifiers && item.modifiers.length > 0) {
        item.modifiers.forEach(mod => {
            // Modifiers are normal text size to differentiate from main items
            result = result.table([{ width: 6, align: 'left'}, { width: 42, align: 'left' }], [['', `- ${mod}`]])
        })
      }
      result = result.newline()
    })

    result = result.line('-'.repeat(48)).newline()
    result = result.align('center').line('--- END ---')

    // Cut paper
    const printData = result.newline().newline().newline().cut().encode()
    let hex = ''
    printData.forEach((b: any) => hex += b.toString(16).padStart(2, '0'))
    
    return await sendToPrinter(ip, hex)
  } catch (error) {
    console.error('Kitchen Ticket Print Error:', error)
    return false
  }
}

export interface PrintZReportData {
  shiftId: string
  openedAt: string
  closedAt: string
  staffName: string
  expectedCash: number
  actualCash: number
  difference: number
  cashSales: number
  otherSales?: number
}

/**
 * Print a Z-Report (ใบสรุปยอดปิดกะ)
 */
export const printZReport = async (ip: string, report: PrintZReportData, shop: PrintShopData, model: string = 'xprinter-xp-n160ii') => {
  try {
    const encoder = new ReceiptPrinterEncoder({ printerModel: model as any, columns: 48, codepageMapping: { 'cp874': 0xff, 'tis620': 0xff } })
    let result = encoder.initialize().codepage('cp874')

    // Header
    result = result.align('center').bold(true).size(2, 2).line('Z-REPORT').size(1, 1).line('END OF SHIFT SUMMARY').bold(false).newline()
    
    if (shop.name) result = result.line(shop.name)
    if (shop.branch) result = result.line(`สาขา: ${shop.branch}`)
    
    result = result.align('left').newline()
    result = result.line(`Shift ID  : ${report.shiftId.slice(0, 8)}`)
    result = result.line(`Staff     : ${report.staffName}`)
    result = result.line(`Opened At : ${report.openedAt}`)
    result = result.line(`Closed At : ${report.closedAt}`)
    
    result = result.line('-'.repeat(48))
    
    // Cash summary
    result = result.bold(true).line('CASH DRAWER SUMMARY').bold(false)
    result = result.table([{ width: 34, align: 'left' }, { width: 14, align: 'right' }], [['Expected Cash In Drawer', formatCurrency(report.expectedCash)]])
    result = result.table([{ width: 34, align: 'left' }, { width: 14, align: 'right' }], [['Actual Cash Counted', formatCurrency(report.actualCash)]])
    
    const diffLabel = report.difference < 0 ? 'SHORTAGE' : (report.difference > 0 ? 'OVERAGE' : 'DIFFERENCE')
    result = result.bold(true).table([{ width: 34, align: 'left' }, { width: 14, align: 'right' }], [[diffLabel, formatCurrency(report.difference)]]).bold(false)
    
    result = result.line('-'.repeat(48))
    
    // Sales summary
    result = result.bold(true).line('SALES SUMMARY').bold(false)
    result = result.table([{ width: 34, align: 'left' }, { width: 14, align: 'right' }], [['Cash Sales', formatCurrency(report.cashSales)]])
    if (report.otherSales !== undefined) {
       result = result.table([{ width: 34, align: 'left' }, { width: 14, align: 'right' }], [['Other Sales', formatCurrency(report.otherSales)]])
       result = result.bold(true).table([{ width: 34, align: 'left' }, { width: 14, align: 'right' }], [['TOTAL SALES', formatCurrency(report.cashSales + report.otherSales)]]).bold(false)
    }

    result = result.line('-'.repeat(48)).newline()
    result = result.align('center').line('--- END OF Z-REPORT ---')

    const printData = result.newline().newline().newline().cut().encode()
    let hex = ''
    printData.forEach((b: any) => hex += b.toString(16).padStart(2, '0'))
    
    return await sendToPrinter(ip, hex)
  } catch (error) {
    console.error('Z-Report Print Error:', error)
    return false
  }
}

/**
 * Print Pre-Receipt / Bill (before checkout)
 */
export const printPreReceipt = async (ip: string, cart: any[], cartSubtotal: number, cartDiscount: number, taxAmount: number, cartTotal: number, shop: PrintShopData, tableNumber?: string, model: string = 'xprinter-xp-n160ii', encoding: string = 'cp874') => {
  try {
    const encoder = new ReceiptPrinterEncoder({ printerModel: model as any, columns: 48, codepageMapping: { 'cp874': 0xff, 'tis620': 0xff } })
    let result = encoder.initialize().codepage(encoding as any)

    result = result.align('center')
    const isLarge = shop.receiptFontSize === 'large'
    
    if (isLarge) {
        result = result.bold(true).size(2, 2).line(shop.name || 'XYLEM LANDSCAPE').size(1, 1).bold(false)
    } else {
        result = result.bold(true).line(shop.name || 'XYLEM LANDSCAPE').bold(false)
    }
    
    result = result.newline()
    result = result.bold(true).line('BILL / ใบแจ้งยอด').bold(false).newline()

    result = result.align('left')
    result = result.table([{ width: 30, align: 'left' }, { width: 18, align: 'right' }], [[`วันที่: ${new Date().toLocaleDateString()}`, tableNumber ? `โต๊ะ: ${tableNumber}` : '']])
    
    result = result.line('-'.repeat(48))

    cart.forEach(item => {
      const quantity = item.quantity || 1
      const itemName = `${quantity}x ${item.name}`
      const itemSubtotal = (item.sale_price || item.price) * quantity
      const itemPriceStr = formatCurrency(itemSubtotal)
      
      if (isLarge) {
          result = result.size(1, 2).table([{ width: 34, align: 'left' }, { width: 14, align: 'right' }], [[itemName, itemPriceStr]]).size(1, 1)
      } else {
          result = result.table([{ width: 34, align: 'left' }, { width: 14, align: 'right' }], [[itemName, itemPriceStr]])
      }
      
      if (item.selected_modifiers && item.selected_modifiers.length > 0) {
        item.selected_modifiers.forEach((mod: any) => {
            result = result.table([{ width: 4, align: 'left'}, { width: 44, align: 'left' }], [['', `- ${mod.name}`]])
        })
      }
    })

    result = result.line('-'.repeat(48))
    
    if (cartDiscount > 0) {
        result = result.table([{ width: 30, align: 'left' }, { width: 18, align: 'right' }], [['ส่วนลด', `-${formatCurrency(cartDiscount)}`]])
    }
    if (taxAmount > 0) {
        result = result.table([{ width: 30, align: 'left' }, { width: 18, align: 'right' }], [['ภาษี', formatCurrency(taxAmount)]])
    }
    
    result = result.bold(true).table([{ width: 30, align: 'left' }, { width: 18, align: 'right' }], [['ยอดรวม (Total)', formatCurrency(cartTotal)]]).bold(false)
    
    result = result.newline()
    result = result.align('center')
    
    if (shop.receiptFooter) {
      const footerLines = shop.receiptFooter.split('\n')
      footerLines.forEach(line => result = result.line(line))
      result = result.newline()
    } else {
      result = result.line('Please review your order').newline()
    }

    const printData = result.newline().newline().newline().cut().encode()
    let hex = ''
    printData.forEach((b: any) => hex += b.toString(16).padStart(2, '0'))
    
    return await sendToPrinter(ip, hex)
  } catch (error) {
    console.error('Pre-Receipt Print Error:', error)
    return false
  }
}

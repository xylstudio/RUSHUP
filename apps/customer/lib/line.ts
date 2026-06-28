import { createCustomerOrderActionToken } from '@/lib/server/lineActionToken'

export async function sendLineNotification(to: string, message: string) {
  return await sendLinePushMessages(to, [{ type: 'text', text: message }]);
}

export async function sendLinePushMessages(to: string, messages: any[], notificationDisabled: boolean = false) {
  return await sendLineMessage('push', { to, messages, notificationDisabled })
}

export async function replyLineMessages(replyToken: string, messages: any[]) {
  return await sendLineMessage('reply', { replyToken, messages })
}

export async function sendInventoryAuditFlex(to: string, data: { 
  staffName: string, 
  totalItems: number, 
  totalDiscrepancies: number,
  discrepancies: any[]
}) {
  const { staffName, totalItems, totalDiscrepancies, discrepancies } = data;
  
  const itemRows = discrepancies.slice(0, 5).map(item => ({
    type: "box",
    layout: "horizontal",
    contents: [
      { type: "text", text: item.item_name, size: "xs", color: "#8C8A81", flex: 4, wrap: true },
      { type: "text", text: `${item.discrepancy > 0 ? '+' : ''}${item.discrepancy}`, size: "xs", color: item.discrepancy > 0 ? "#10B981" : "#EF4444", align: "end", weight: "bold", flex: 2 }
    ]
  }));

  const flexMessage: any = {
    type: "flex",
    altText: `📋 รายงานการนับสต็อก: โดย ${staffName}`,
    contents: {
      type: "bubble",
      body: {
        type: "box",
        layout: "vertical",
        spacing: "md",
        contents: [
          { type: "text", text: "INVENTORY AUDIT", weight: "bold", color: "#A3A3A3", size: "xs" },
          { type: "text", text: "สรุปการนับสต็อกเรียบร้อย", weight: "bold", size: "lg", color: "#1A1A18" },
          { type: "separator", margin: "lg" },
          { 
            type: "box", 
            layout: "vertical", 
            margin: "lg",
            spacing: "sm",
            contents: [
              {
                type: "box",
                layout: "horizontal",
                contents: [
                  { type: "text", text: "ผู้นับ:", size: "xs", color: "#A3A3A3", flex: 2 },
                  { type: "text", text: staffName, size: "xs", color: "#1A1A18", weight: "bold", flex: 5 }
                ]
              },
              {
                type: "box",
                layout: "horizontal",
                contents: [
                  { type: "text", text: "รายการทั้งหมด:", size: "xs", color: "#A3A3A3", flex: 2 },
                  { type: "text", text: `${totalItems} รายการ`, size: "xs", color: "#1A1A18", weight: "bold", flex: 5 }
                ]
              },
              {
                type: "box",
                layout: "horizontal",
                contents: [
                  { type: "text", text: "พบส่วนต่าง:", size: "xs", color: "#A3A3A3", flex: 2 },
                  { type: "text", text: `${totalDiscrepancies} รายการ`, size: "xs", color: totalDiscrepancies > 0 ? "#EF4444" : "#10B981", weight: "bold", flex: 5 }
                ]
              }
            ]
          },
          ...(itemRows.length > 0 ? [
            { type: "separator", margin: "lg" },
            { type: "text", text: "รายการที่มีส่วนต่าง (บางส่วน):", size: "xxs", color: "#A3A3A3", margin: "md" },
            { type: "box", layout: "vertical", spacing: "xs", margin: "sm", contents: itemRows }
          ] : []),
          {
            type: "box",
            layout: "vertical",
            margin: "xl",
            backgroundColor: "#FAFAF8",
            paddingAll: "md",
            contents: [
              { type: "text", text: "ข้อมูลสต็อกในระบบได้ถูกอัปเดตตามยอดนับจริงเรียบร้อยแล้ว กรุณาตรวจสอบรายละเอียดเพิ่มเติมในระบบหลังบ้าน", size: "xs", color: "#70706B", wrap: true }
            ]
          }
        ]
      },
      footer: {
        type: "box",
        layout: "vertical",
        spacing: "sm",
        contents: [
          {
            type: "button",
            action: { 
              type: "uri", 
              label: "📦 ดูรายละเอียดสต็อก", 
              uri: `${process.env.NEXT_PUBLIC_APP_URL || 'https://xylem-landscape.vercel.app'}/dashboard/admin/inventory` 
            },
            style: "primary",
            color: "#1A1A18",
            height: "sm"
          }
        ]
      }
    }
  };

  return await sendLinePushMessages(to, [flexMessage]);
}

export async function sendLineFlexNotification(to: string, data: { status: string, orderNumber: string, items?: any[], totalAmount?: number, deliveryFee?: number, orderId: string, silent?: boolean }) {
  const { status, orderNumber, items = [], totalAmount = 0, deliveryFee = 0, orderId, silent = false } = data;
  
  const s = status.toLowerCase().trim();
  const liffIdRaw = process.env.NEXT_PUBLIC_LIFF_ID || "2009322178-2dtfXAvi";
  const liffId = liffIdRaw.replace(/[^a-zA-Z0-9-]/g, '');
  const liffTrackUrl = `https://liff.line.me/${liffId}?trackId=${encodeURIComponent(orderId)}`;
  const liffRatingUrl = `https://liff.line.me/${liffId}?trackId=${encodeURIComponent(orderId)}&action=rate`;
  
  const statusLabels: any = {
    "pending": "รับคำสั่งซื้อแล้ว",
    "paid": "รับออเดอร์แล้ว",
    "accepted": "รับออเดอร์แล้ว",
    "preparing": "กำลังเตรียมออเดอร์",
    "shipping": "กำลังไปส่ง",
    "out_for_delivery": "กำลังไปส่ง",
    "completed": "ส่งเรียบร้อยแล้ว",
    "delivered": "ส่งเรียบร้อยแล้ว",
    "cancelled": "ยกเลิกแล้ว"
  };

  const statusText = statusLabels[s] || "ออเดอร์สถานะ: " + s;
  const showRating = s === "completed" || s === "delivered";

  const itemRows: any[] = items.slice(0, 3).map(item => ({
    type: "box",
    layout: "horizontal",
    contents: [
      { type: "text", text: `${item.name} x ${item.quantity}`, size: "xs", color: "#8C8A81", flex: 4 },
      { type: "text", text: `฿${(item.sale_price * item.quantity).toLocaleString()}`, size: "xs", color: "#1A1A18", align: "end", weight: "bold", flex: 2 }
    ]
  }));

  const hideItems = ["preparing", "shipping", "out_for_delivery"].includes(s);

  const flexMessage: any = {
    type: "flex",
    altText: `${statusText}: ออเดอร์ #${orderNumber.replace('#', '')}`,
    contents: {
      type: "bubble",
      body: {
        type: "box",
        layout: "vertical",
        spacing: "md",
        contents: [
          { type: "text", text: "XYL STUDIO", weight: "bold", color: "#1A1A18", size: "sm" },
          { type: "text", text: statusText, weight: "bold", size: "lg", color: "#10B981", wrap: true },
          { type: "separator", margin: "xl" },
          { type: "text", text: `ออเดอร์เลขที่ ${orderNumber}`, weight: "bold", size: "md" },
          ...(!hideItems && itemRows.length > 0 ? [{ type: "box", layout: "vertical", spacing: "xs", contents: itemRows }] : []),
          ...(!hideItems && deliveryFee > 0 ? [
            {
              type: "box",
              layout: "horizontal",
              margin: "md",
              contents: [
                { type: "text", text: "ค่าจัดส่ง", size: "xs", color: "#8C8A81", flex: 4 },
                { type: "text", text: `฿${deliveryFee.toLocaleString()}`, size: "xs", color: "#1A1A18", align: "end", weight: "bold", flex: 2 }
              ]
            }
          ] : []),
          { 
            type: "box", 
            layout: "horizontal", 
            margin: "md",
            contents: [
              { type: "text", text: "ยอดรวมทั้งหมด", size: "sm", weight: "bold" },
              { type: "text", text: `฿${totalAmount.toLocaleString()}`, align: "end", weight: "bold", size: "md", color: "#10B981" }
            ] 
          }
        ]
      },
      footer: {
        type: "box",
        layout: "vertical",
        spacing: "sm",
        contents: [
          {
            type: "button",
            action: { 
              type: "uri", 
              label: "📄 ติดตามออเดอร์", 
              uri: liffTrackUrl 
            },
            style: "primary",
            color: "#1A1A18",
            height: "sm"
          },
          ...(showRating ? [{
            type: "button",
            action: { 
              type: "uri", 
              label: "⭐ ให้คะแนนความพึงพอใจ", 
              uri: liffRatingUrl
            },
            style: "secondary",
            height: "sm",
            color: "#10B981"
          }] : [])
        ]
      }
    }
  };

  return await sendLinePushMessages(to, [flexMessage], silent);
}

export async function sendServiceAppointmentFlex(to: string, data: { 
  customerName: string, 
  serviceName: string, 
  scheduledDate: string, 
  orderId: string, 
  customerId?: string,
  houseId?: string | null,
  type: 'appointment' | 'reschedule' | 'reminder',
  sessionNumber?: number,
  totalSessions?: number,
  houseName?: string | null,
  customLabel?: string | null,
  appBaseUrl?: string | null
}) {
  const { customerName, serviceName, scheduledDate, orderId, customerId, houseId, type, sessionNumber, totalSessions, houseName, customLabel, appBaseUrl: customAppUrl } = data;
  const liffIdRaw = process.env.NEXT_PUBLIC_LIFF_ID || "2009322178-2dtfXAvi";
  const liffId = liffIdRaw.replace(/[^a-zA-Z0-9-]/g, '');
  const appUrl = (customAppUrl || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000').replace(/\/$/, '');

  const typeLabels = {
    appointment: "ยืนยันนัดหมายบริการ",
    reschedule: "มีการเลื่อนนัดหมาย",
    reminder: "เตือนความจำนัดหมาย"
  };

  const statusText = customLabel || typeLabels[type] || "นัดหมายบริการ";
  const accentColor = type === 'reschedule' ? "#F59E0B" : "#10B981";
  
  const sessionText = sessionNumber 
    ? (totalSessions ? ` (รอบที่ ${sessionNumber}/${totalSessions})` : ` (รอบที่ ${sessionNumber})`) 
    : "";
  const rescheduleUrl = (() => {
    if (customerId) {
      const token = createCustomerOrderActionToken({
        orderId,
        customerId,
        mode: 'reschedule',
      })
      if (token) {
        return `${appUrl}/api/line/actions/customer-order?token=${encodeURIComponent(token)}`
      }
    }
    return `${appUrl}/reschedule/${encodeURIComponent(orderId)}`
  })()

  const flexMessage: any = {
    type: "flex",
    altText: `แจ้งวันเข้าบริการดูแลสวน: ${serviceName}${sessionText}`,
    contents: {
      type: "bubble",
      body: {
        type: "box",
        layout: "vertical",
        spacing: "md",
        contents: [
          { type: "text", text: "XYLEM LANDSCAPE", weight: "bold", color: "#A3A3A3", size: "xs" },
          { type: "text", text: "แจ้งวันเข้าบริการดูแลสวน", weight: "bold", size: "lg", color: "#1A1A18" },
          { type: "text", text: `${statusText}${sessionText}`, weight: "bold", size: "sm", color: accentColor, margin: "none", wrap: true },
          { type: "separator", margin: "lg" },
          { 
            type: "box", 
            layout: "vertical", 
            margin: "lg",
            spacing: "sm",
            contents: [
              { type: "text", text: "สถานที่", size: "xs", color: "#A3A3A3", weight: "bold" },
              { type: "text", text: houseName || "ไม่ระบุชื่อบ้าน", weight: "bold", size: "sm", color: "#1A1A18" },
              { type: "text", text: "รายละเอียดบริการ", size: "xs", color: "#A3A3A3", weight: "bold", margin: "md" },
              { type: "text", text: serviceName, weight: "bold", size: "md", color: "#1A1A18" },
              { type: "text", text: `วันที่นัดหมาย: ${scheduledDate}`, size: "sm", color: "#1A1A18", margin: "md" }
            ]
          },
          {
            type: "box",
            layout: "vertical",
            margin: "xl",
            backgroundColor: "#FAFAF8",
            paddingAll: "md",
            contents: [
              { type: "text", text: "ทีมงาน Xylem จะเข้าดูแลสวนให้ตามวันและเวลาที่นัดหมายครับ หากมีข้อสงสัยสามารถติดต่อผ่านช่องทางนี้ได้ทันที", size: "xs", color: "#70706B", wrap: true }
            ]
          }
        ]
      },
      footer: {
        type: "box",
        layout: "vertical",
        spacing: "sm",
        contents: [
          {
            type: "button",
            action: { 
              type: "uri",
              label: "📅 เลื่อนนัด",
              uri: rescheduleUrl
            },
            style: "primary",
            color: "#1A1A18",
            height: "sm"
          }
        ]
      }
    }
  };

  return await sendLinePushMessages(to, [flexMessage]);
}

export async function sendInventoryAlertFlex(to: string, data: { items: any[] }) {
  const { items } = data;
  
  // Limit to 15 items to prevent message size from being too large for LINE
  const displayItems = items.slice(0, 15);
  
  const itemRows = displayItems.map(item => ({
    type: "box",
    layout: "vertical",
    margin: "md",
    spacing: "none",
    contents: [
      {
        type: "text",
        text: String(item.name || 'ไม่ระบุชื่อ'),
        size: "sm",
        weight: "bold",
        color: "#1A1A18",
        wrap: true
      },
      {
        type: "box",
        layout: "horizontal",
        contents: [
          {
            type: "text",
            text: `คงเหลือ: ${String(item.remaining)} ${String(item.unit || '')}`,
            size: "xs",
            color: "#EF4444",
            flex: 1
          },
          {
            type: "text",
            text: `จุดสั่งซื้อ: ${String(item.min)}`,
            size: "xs",
            color: "#8C8A81",
            align: "end",
            flex: 1
          }
        ]
      }
    ]
  }));

  const flexMessage: any = {
    type: "flex",
    altText: `🚨 แจ้งเตือน: มีสินค้า ${items.length} รายการที่ต้องสั่งเพิ่ม`,
    contents: {
      type: "bubble",
      header: {
        type: "box",
        layout: "vertical",
        backgroundColor: "#EF4444",
        paddingAll: "lg",
        contents: [
          {
            type: "text",
            text: "LOW STOCK ALERT",
            color: "#FFFFFF",
            weight: "bold",
            size: "xs"
          },
          {
            type: "text",
            text: "แจ้งเตือนสต็อกต่ำ",
            color: "#FFFFFF",
            weight: "bold",
            size: "xl",
            margin: "sm"
          }
        ]
      },
      body: {
        type: "box",
        layout: "vertical",
        spacing: "md",
        contents: [
          {
            type: "text",
            text: `พบสินค้า ${items.length} รายการ ที่ยอดนับล่าสุดต่ำกว่าจุดสั่งซื้อที่กำหนดไว้:`,
            size: "xs",
            color: "#8C8A81",
            wrap: true
          },
          { type: "separator", margin: "md" },
          {
            type: "box",
            layout: "vertical",
            contents: itemRows
          },
          ...(items.length > 15 ? [{
            type: "text",
            text: `... และอีก ${items.length - 15} รายการ`,
            size: "xxs",
            color: "#A3A3A3",
            margin: "sm",
            align: "center"
          }] : []),
          { type: "separator", margin: "xl" },
          {
            type: "text",
            text: "กรุณาเข้าตรวจสอบที่ระบบหลังบ้านเพื่อดำเนินการสั่งซื้อสินค้าเข้าคลังครับ",
            size: "xxs",
            color: "#A3A3A3",
            wrap: true,
            margin: "md"
          },
          {
            type: "button",
            action: { 
              type: "uri", 
              label: "🛒 ดูรายการที่ต้องซื้อทั้งหมด", 
              uri: `${process.env.NEXT_PUBLIC_APP_URL || 'https://xylem-landscape.vercel.app'}/dashboard/admin/inventory/restock` 
            },
            style: "primary",
            color: "#EF4444",
            height: "sm",
            margin: "lg"
          }
        ]
      }
    }
  };

  return await sendLinePushMessages(to, [flexMessage]);
}

async function sendLineMessage(mode: 'push' | 'reply', payload: { to?: string; replyToken?: string; messages: any[], notificationDisabled?: boolean }) {
  const accessToken = process.env.LINE_CHANNEL_ACCESS_TOKEN;
  if (!accessToken) throw new Error('LINE_CHANNEL_ACCESS_TOKEN is missing');

  const endpoint = mode === 'reply'
    ? 'https://api.line.me/v2/bot/message/reply'
    : 'https://api.line.me/v2/bot/message/push'

  const body: any = mode === 'reply'
    ? { replyToken: payload.replyToken, messages: payload.messages }
    : { to: payload.to, messages: payload.messages }

  if (payload.notificationDisabled) {
    body.notificationDisabled = true;
  }

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorBody = await response.json();
    console.error('LINE API Error:', errorBody);
    throw new Error(`LINE API: ${response.status} - ${JSON.stringify(errorBody)}`);
  }
  
  return true;
}

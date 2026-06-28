const fs = require('fs');
const path = 'c:\\Users\\localadmin\\Desktop\\xylproject-pr-copilot-swe-agent-3\\xylem-landscape\\lib\\server\\lineMessaging.ts';
let content = fs.readFileSync(path, 'utf8');

const marker = 'export const buildCustomerBatchReportCarouselFlexMessage';
const index = content.indexOf(marker);

if (index !== -1) {
    content = content.substring(0, index);
}

const func = `
export const buildCustomerBatchReportCarouselFlexMessage = (args: {
  title?: string | null
  message?: string | null
  batchReports: {
    staffName: string
    reports: {
      orderId: string
      orderCode?: string | null
      houseName: string
      serviceName: string
      workDone: string
      completedAt: string
      visitCountText?: string | null
      beforePhotos?: string[] | null
      afterPhotos?: string[] | null
    }[]
  }
  customerId: string
  appBaseUrl?: string | null
}): LineFlexMessage => {
  const baseUrl = resolveAppBaseUrl(args.appBaseUrl)
  const staffName = (args.batchReports.staffName || 'ทีมงาน Xylem').trim()
  const title = args.title?.trim() || 'สรุปรายงานการดูแลสวนวันนี้'
  
  const houseCount = args.batchReports.reports.length
  // Safety: Limit Alt Text length to 400 chars
  const altText = \`รายงานการดูแลสวน (\${houseCount} หลัง)\`

  // LINE Carousel Limit is 12 bubbles
  const targetReports = args.batchReports.reports.slice(0, 12);

  const bubbles = targetReports.map((report) => {
    const reportToken = createCustomerOrderActionToken({
      orderId: report.orderId,
      customerId: args.customerId,
      mode: 'detail',
    })
    const detailUrl = reportToken 
      ? \`\${baseUrl}/api/line/actions/customer-order?token=\${encodeURIComponent(reportToken)}\`
      : \`\${baseUrl}/dashboard/customer/orders/\${report.orderId}\`

    const beforePhoto = normalizeLineImageUrl(report.beforePhotos?.[0])
    const afterPhoto = normalizeLineImageUrl(report.afterPhotos?.[0])
    const visitCount = report.visitCountText || ''

    return {
      type: 'bubble',
      size: 'mega',
      styles: {
        header: { backgroundColor: '#FFFFFF' },
        body: { backgroundColor: '#FFFFFF' },
        footer: { separator: false }
      },
      header: {
        type: 'box',
        layout: 'vertical',
        paddingTop: '20px',
        paddingBottom: '0px',
        paddingStart: '20px',
        paddingEnd: '20px',
        contents: [
          { type: 'text', text: 'XYLEM LANDSCAPE', color: '#A3A39C', size: 'xxs', weight: 'bold' },
          {
            type: 'box',
            layout: 'horizontal',
            margin: 'sm',
            alignItems: 'center',
            contents: [
              {
                type: 'text',
                text: report.houseName,
                weight: 'bold',
                size: 'xl',
                color: '#123524',
                flex: 4,
                wrap: true,
              },
              ...(visitCount ? [{
                type: 'box',
                layout: 'vertical',
                flex: 2,
                contents: [
                  { type: 'text', text: 'SESSION', size: 'xxs', color: '#10B981', weight: 'bold', align: 'end' },
                  { type: 'text', text: visitCount, size: 'xs', color: '#10B981', weight: 'bold', align: 'end' },
                ]
              }] : [])
            ]
          },
          {
            type: 'text',
            text: \`#\${report.orderCode || report.orderId.slice(0, 8)} • \${report.serviceName}\`,
            size: 'xs',
            color: '#A3A39C',
            margin: 'xs',
          },
          { type: 'box', layout: 'vertical', margin: 'lg', height: '1px', backgroundColor: '#F1F1EB', contents: [] },
        ]
      },
      body: {
        type: 'box',
        layout: 'vertical',
        spacing: 'lg',
        paddingStart: '20px',
        paddingEnd: '20px',
        paddingBottom: '20px',
        contents: [
          {
            type: 'box',
            layout: 'vertical',
            spacing: 'sm',
            contents: [
              {
                type: 'box',
                layout: 'horizontal',
                contents: [
                  { type: 'text', text: 'ผู้ดูแล', size: 'xs', color: '#A3A39C', flex: 1 },
                  { type: 'text', text: staffName, size: 'sm', weight: 'bold', color: '#123524', flex: 3, align: 'end' },
                ],
              },
            ],
          },
          ...(beforePhoto || afterPhoto ? [{
            type: 'box',
            layout: 'horizontal',
            spacing: 'md',
            contents: [
              ...(beforePhoto ? [{
                type: 'box',
                layout: 'vertical',
                flex: 1,
                contents: [
                  { type: 'image', url: beforePhoto, size: 'full', aspectRatio: '1:1', aspectMode: 'cover', cornerRadius: 'md' },
                  { type: 'text', text: 'ก่อนทำ', size: 'xxs', color: '#A3A39C', align: 'center', margin: 'xs' }
                ]
              }] : []),
              ...(afterPhoto ? [{
                type: 'box',
                layout: 'vertical',
                flex: 1,
                contents: [
                  { type: 'image', url: afterPhoto, size: 'full', aspectRatio: '1:1', aspectMode: 'cover', cornerRadius: 'md' },
                  { type: 'text', text: 'หลังทำ', size: 'xxs', color: '#10B981', align: 'center', margin: 'xs', weight: 'bold' }
                ]
              }] : [])
            ]
          }] : []),
          {
            type: 'box',
            layout: 'vertical',
            spacing: 'sm',
            contents: [
              { type: 'text', text: '• รายการที่ดำเนินการ', size: 'xs', weight: 'bold', color: '#123524' },
              {
                type: 'box',
                layout: 'vertical',
                spacing: 'xs',
                contents: formatToListContents(report.workDone || 'ไม่มีรายละเอียดการดำเนินงาน', '•')
              }
            ]
          },
        ]
      },
      footer: {
        type: 'box',
        layout: 'vertical',
        spacing: 'sm',
        paddingAll: '20px',
        contents: [
          {
            type: 'button',
            style: 'primary',
            color: '#123524',
            action: {
              type: 'uri',
              label: 'ดูรายละเอียดรายงาน',
              uri: detailUrl,
            },
          },
        ]
      }
    }
  })

  return {
    type: 'flex',
    altText,
    contents: {
      type: 'carousel',
      contents: bubbles
    }
  }
}
`;

fs.writeFileSync(path, content.trim() + '\n' + func.trim() + '\n', { encoding: 'utf8' });
console.log('Successfully applied safety fixes to batch report carousel');

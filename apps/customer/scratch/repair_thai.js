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
  const altText = \`รายงานการดูแลสวน (\${houseCount} หลัง): \${args.batchReports.reports.map(r => r.houseName).join(', ')}\`

  const bubbles = args.batchReports.reports.map((report) => {
    const reportToken = createCustomerOrderActionToken({
      orderId: report.orderId,
      customerId: args.customerId,
      mode: 'detail',
    })
    const detailUrl = reportToken 
      ? \`\${baseUrl}/api/line/actions/customer-order?token=\${encodeURIComponent(reportToken)}\`
      : \`\${baseUrl}/dashboard/customer/orders/\${report.orderId}\`

    const beforePhoto = report.beforePhotos?.[0]
    const afterPhoto = report.afterPhotos?.[0]

    return {
      type: 'bubble',
      size: 'mega',
      styles: {
        header: { backgroundColor: '#123524' },
        body: { backgroundColor: '#FFFFFF' },
      },
      header: {
        type: 'box',
        layout: 'vertical',
        paddingAll: '20px',
        contents: [
          { type: 'text', text: 'XYLEM LANDSCAPE', color: '#A3A39C', size: 'xxs', weight: 'bold', letterSpacing: '0.2em' },
          { type: 'text', text: report.houseName, weight: 'bold', size: 'xl', color: '#FFFFFF', margin: 'sm', wrap: true },
          { type: 'text', text: \`#\${report.orderCode || report.orderId.slice(0, 8)} • \${report.serviceName}\`, size: 'xxs', color: '#A3A39C', margin: 'xs', weight: 'bold' }
        ]
      },
      body: {
        type: 'box',
        layout: 'vertical',
        spacing: 'md',
        paddingAll: '20px',
        contents: [
          {
            type: 'box',
            layout: 'horizontal',
            spacing: 'sm',
            contents: [
              {
                type: 'box',
                layout: 'vertical',
                flex: 1,
                contents: [
                  { type: 'image', url: beforePhoto || 'https://xylem-landscape.vercel.app/images/placeholder-garden.jpg', size: 'full', aspectMode: 'cover', aspectRatio: '1:1', cornerRadius: 'md' },
                  { type: 'text', text: 'BEFORE', size: 'xxs', weight: 'bold', color: '#A3A39C', margin: 'xs', align: 'center' }
                ]
              },
              {
                type: 'box',
                layout: 'vertical',
                flex: 1,
                contents: [
                  { type: 'image', url: afterPhoto || 'https://xylem-landscape.vercel.app/images/placeholder-garden.jpg', size: 'full', aspectMode: 'cover', aspectRatio: '1:1', cornerRadius: 'md' },
                  { type: 'text', text: 'AFTER', size: 'xxs', weight: 'bold', color: '#10B981', margin: 'xs', align: 'center' }
                ]
              }
            ]
          },
          {
            type: 'box',
            layout: 'horizontal',
            margin: 'md',
            contents: [
              { type: 'text', text: 'ความคืบหน้า', size: 'xxs', color: '#A3A39C', flex: 1 },
              { type: 'text', text: report.visitCountText || '-', size: 'xs', weight: 'bold', color: '#10B981', flex: 2, align: 'end' }
            ]
          },
          { type: 'box', layout: 'vertical', margin: 'md', height: '1px', backgroundColor: '#F1F1EB', contents: [] },
          {
            type: 'text',
            text: report.workDone || '-',
            size: 'xs',
            color: '#4B5563',
            margin: 'md',
            wrap: true,
            maxLines: 4,
            lineSpacing: '2px'
          },
          {
            type: 'button',
            height: 'sm',
            style: 'primary',
            color: '#123524',
            margin: 'lg',
            action: { type: 'uri', label: 'ดูรายละเอียดเต็ม →', uri: detailUrl }
          }
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
console.log('Successfully repaired Thai encoding in lineMessaging.ts');

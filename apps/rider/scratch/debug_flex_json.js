const fs = require('fs');
const path = 'c:\\Users\\localadmin\\Desktop\\xylproject-pr-copilot-swe-agent-3\\xylem-landscape\\lib\\server\\lineMessaging.ts';

// We'll read the file and evaluate the function locally
let content = fs.readFileSync(path, 'utf8');

// Mock dependencies
const resolveAppBaseUrl = (url) => url || 'https://xylem-landscape.vercel.app';
const normalizeLineImageUrl = (url) => url || 'https://xylem-landscape.vercel.app/images/placeholder-garden.jpg';
const createCustomerOrderActionToken = () => 'mock-token';
const formatToListContents = (text, icon) => [{ type: 'text', text: text || 'mock' }];

// Extracted function logic for testing
const buildMock = (args) => {
  const baseUrl = resolveAppBaseUrl(args.appBaseUrl)
  const staffName = (args.batchReports.staffName || 'ทีมงาน Xylem').trim()
  const title = args.title?.trim() || 'สรุปรายงานการดูแลสวนวันนี้'
  
  const houseCount = args.batchReports.reports.length
  const altText = `รายงานการดูแลสวน (${houseCount} หลัง): ${args.batchReports.reports.map(r => r.houseName).join(', ')}`

  const bubbles = args.batchReports.reports.map((report) => {
    const detailUrl = `${baseUrl}/mock-detail`
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
            text: `#${report.orderCode || report.orderId.slice(0, 8)} • ${report.serviceName}`,
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
                  { type: 'text', text: 'ก่อนทำ (Before)', size: 'xxs', color: '#A3A39C', align: 'center', margin: 'xs' }
                ]
              }] : []),
              ...(afterPhoto ? [{
                type: 'box',
                layout: 'vertical',
                flex: 1,
                contents: [
                  { type: 'image', url: afterPhoto, size: 'full', aspectRatio: '1:1', aspectMode: 'cover', cornerRadius: 'md' },
                  { type: 'text', text: 'หลังทำ (After)', size: 'xxs', color: '#10B981', align: 'center', margin: 'xs', weight: 'bold' }
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
              label: 'ดูรายละเอียดรายงาน →',
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

// Test with mock data
const testData = {
  batchReports: {
    staffName: 'Test Staff',
    reports: [
      { orderId: '1', houseName: 'House 1', serviceName: 'Service 1', workDone: 'Task 1\nTask 2', visitCountText: '1/24' }
    ]
  }
};

try {
  const result = buildMock(testData);
  console.log('SUCCESS: JSON generated correctly');
  fs.writeFileSync('c:\\Users\\localadmin\\Desktop\\xylproject-pr-copilot-swe-agent-3\\xylem-landscape\\scratch\\mock_flex_output.json', JSON.stringify(result, null, 2));
} catch (e) {
  console.error('FAILED: JSON generation error', e);
}

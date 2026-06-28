require('dotenv').config({ path: '.env.local' });

const LINE_TOKEN = process.env.LINE_MESSAGING_API_TOKEN || process.env.LINE_CHANNEL_ACCESS_TOKEN;
const TARGET = 'U209e02af853ff077b5e284ece3f13d29'; // Biw

// Simulate the updated Flex Message
const houseName = 'บ้านทดสอบ สุขุมวิท 71';
const staffName = 'ทีมงาน Xylem';
const visitCount = '3/12';
const isRecurring = true;
const serviceTypeLabel = 'รายเดือน';
const detailUrl = 'https://xylem-landscape.vercel.app';
const rescheduleUrl = 'https://xylem-landscape.vercel.app';
const hasNextVisit = true;

// Replicate formatToListContents
function formatToListContents(text, icon) {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  if (lines.length === 0) return [{ type: 'text', text: '-', size: 'sm', color: '#333333' }];
  return lines.map(line => ({
    type: 'box',
    layout: 'horizontal',
    spacing: 'sm',
    contents: [
      { type: 'text', text: icon, size: 'sm', flex: 0 },
      { type: 'text', text: line, size: 'sm', color: '#333333', wrap: true, flex: 1 }
    ]
  }));
}

const PLACEHOLDER = 'กำลังดำเนินการลงรายงาน...';
const rawWork = 'ตัดหญ้า\nตัดแต่งกิ่งไม้\nกำจัดวัชพืช';
const cleanWork = rawWork === PLACEHOLDER ? '' : rawWork;

const flexMessage = {
  type: 'flex',
  altText: `รายงานการดูแลสวน: ${houseName}`,
  contents: {
    type: 'bubble',
    size: 'mega',
    styles: {
      header: { backgroundColor: '#FFFFFF' },
      body: { backgroundColor: '#FFFFFF' },
      footer: { separator: false },
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
            { type: 'text', text: houseName, weight: 'bold', size: 'xl', color: '#123524', flex: 4, wrap: true },
            ...(isRecurring ? [{
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
        { type: 'text', text: `สรุปรายงานการเข้าดูแล ${serviceTypeLabel}`, size: 'xs', color: '#A3A39C', margin: 'xs' },
        { type: 'box', layout: 'vertical', margin: 'lg', height: '1px', backgroundColor: '#F1F1EB', contents: [] },
      ],
    },
    body: {
      type: 'box',
      layout: 'vertical',
      spacing: 'lg',
      paddingStart: '20px',
      paddingEnd: '20px',
      paddingBottom: '20px',
      contents: [
        // Staff & location
        {
          type: 'box',
          layout: 'vertical',
          spacing: 'sm',
          contents: [
            {
              type: 'box',
              layout: 'horizontal',
              contents: [
                { type: 'text', text: 'สถานที่', size: 'xs', color: '#A3A39C', flex: 1 },
                { type: 'text', text: houseName, size: 'sm', weight: 'bold', color: '#123524', flex: 3, align: 'end', wrap: true },
              ],
            },
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
        // Zones
        {
          type: 'box',
          layout: 'vertical',
          spacing: 'lg',
          contents: [
            {
              type: 'box',
              layout: 'vertical',
              spacing: 'sm',
              contents: [
                { type: 'text', text: '📍 สวนหน้าบ้าน', size: 'sm', weight: 'bold', color: '#1A3626' },
                {
                  type: 'box',
                  layout: 'horizontal',
                  spacing: 'md',
                  contents: [
                    {
                      type: 'box', layout: 'vertical', flex: 1,
                      contents: [
                        { type: 'image', url: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400', size: 'full', aspectRatio: '1:1', aspectMode: 'cover' },
                        { type: 'text', text: 'ก่อนทำ (Before)', size: 'xxs', color: '#A3A39C', align: 'center', margin: 'xs' }
                      ]
                    },
                    {
                      type: 'box', layout: 'vertical', flex: 1,
                      contents: [
                        { type: 'image', url: 'https://images.unsplash.com/photo-1585320806297-9794b3e4eeae?w=400', size: 'full', aspectRatio: '1:1', aspectMode: 'cover' },
                        { type: 'text', text: 'หลังทำ (After)', size: 'xxs', color: '#10B981', align: 'center', margin: 'xs', weight: 'bold' }
                      ]
                    }
                  ]
                },
                { type: 'text', text: 'ตัดหญ้า ปรับแต่งต้นไม้', size: 'xs', color: '#4B5563', wrap: true, margin: 'sm' }
              ]
            }
          ]
        },
        // Work Done with ✅
        {
          type: 'box',
          layout: 'vertical',
          spacing: 'sm',
          contents: [
            { type: 'text', text: '✅ รายการที่ดำเนินการ', size: 'xs', weight: 'bold', color: '#123524' },
            {
              type: 'box',
              layout: 'vertical',
              spacing: 'xs',
              contents: formatToListContents(cleanWork || 'ไม่มีรายละเอียดการดำเนินงาน', '✅')
            }
          ]
        },
        // Problems with ⚠️
        {
          type: 'box',
          layout: 'vertical',
          spacing: 'sm',
          contents: [
            { type: 'text', text: '⚠️ ปัญหาที่พบ', size: 'xs', weight: 'bold', color: '#C2410C' },
            {
              type: 'box',
              layout: 'vertical',
              spacing: 'xs',
              contents: formatToListContents('พบวัชพืชขึ้นมาก\nต้นไม้ขาดน้ำ', '⚠️')
            }
          ]
        },
        // Next Visit
        {
          type: 'box',
          layout: 'vertical',
          margin: 'lg',
          paddingAll: '12px',
          backgroundColor: '#F3F4F6',
          contents: [
            { type: 'text', text: 'นัดหมายครั้งถัดไป', size: 'xs', weight: 'bold', color: '#123524' },
            {
              type: 'box',
              layout: 'horizontal',
              margin: 'sm',
              contents: [
                { type: 'text', text: '📅 วันที่', size: 'xs', color: '#4B5563', flex: 1 },
                { type: 'text', text: '4 มิถุนายน 2569', size: 'xs', color: '#111111', weight: 'bold', align: 'end', flex: 2 }
              ]
            },
            {
              type: 'box',
              layout: 'horizontal',
              contents: [
                { type: 'text', text: '⏰ เวลา', size: 'xs', color: '#4B5563', flex: 1 },
                { type: 'text', text: '09:00 - 12:00', size: 'xs', color: '#111111', weight: 'bold', align: 'end', flex: 2 }
              ]
            }
          ]
        },
      ],
    },
    footer: {
      type: 'box',
      layout: 'vertical',
      spacing: 'sm',
      paddingAll: '20px',
      contents: [
        {
          type: 'button',
          action: { type: 'uri', label: '📋 ดูรายงานฉบับเต็ม', uri: detailUrl },
          style: 'primary',
          color: '#111111',
          height: 'sm',
        },
        ...(hasNextVisit ? [{
          type: 'button',
          action: { type: 'uri', label: '📅 เลื่อนนัดหมาย', uri: rescheduleUrl },
          style: 'secondary',
          height: 'sm',
        }] : []),
        {
          type: 'text',
          text: 'ขอบคุณที่ไว้วางใจ Xylem Landscape ครับ',
          size: 'xxs',
          color: '#A3A39C',
          align: 'center',
          margin: 'md',
        }
      ],
    },
  },
};

async function main() {
  console.log('📤 Sending updated Flex Message...');
  const resp = await fetch('https://api.line.me/v2/bot/message/push', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${LINE_TOKEN}` },
    body: JSON.stringify({ to: TARGET, messages: [flexMessage] }),
  });
  const text = await resp.text();
  if (resp.ok) {
    console.log('✅ SUCCESS!', text);
  } else {
    console.log('❌ FAILED', resp.status, text);
  }
}

main();

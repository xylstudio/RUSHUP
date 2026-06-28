const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const LINE_TOKEN = process.env.LINE_MESSAGING_API_TOKEN || process.env.LINE_CHANNEL_ACCESS_TOKEN;

const supabase = createClient(supabaseUrl, supabaseKey);

// ทดสอบส่ง Flex Message ตาม schema ที่แก้ไขแล้ว
async function testFlexMessage() {
  const TARGET_LINE_USER_ID = 'U209e02af853ff077b5e284ece3f13d29'; // Biw
  
  const flexMessage = {
    type: 'flex',
    altText: 'ทดสอบรายงานการดูแลสวน: บ้านทดสอบ',
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
            contents: [
              { type: 'text', text: 'Landscape Journal', weight: 'bold', size: 'xl', color: '#123524', flex: 4 },
              {
                type: 'box',
                layout: 'vertical',
                flex: 2,
                contents: [
                  { type: 'text', text: 'SESSION', size: 'xxs', color: '#10B981', weight: 'bold', align: 'end' },
                  { type: 'text', text: '1/12', size: 'xs', color: '#10B981', weight: 'bold', align: 'end' },
                ]
              }
            ]
          },
          { type: 'text', text: 'สรุปรายงานการเข้าดูแล รายเดือน', size: 'xs', color: '#A3A39C', margin: 'xs' },
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
                  { type: 'text', text: 'บ้านทดสอบ', size: 'sm', weight: 'bold', color: '#123524', flex: 3, align: 'end' },
                ],
              },
              {
                type: 'box',
                layout: 'horizontal',
                contents: [
                  { type: 'text', text: 'ผู้ดูแล', size: 'xs', color: '#A3A39C', flex: 1 },
                  { type: 'text', text: 'ทีมงาน Xylem', size: 'sm', weight: 'bold', color: '#123524', flex: 3, align: 'end' },
                ],
              },
            ],
          },
          // Zone section
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
                        type: 'box',
                        layout: 'vertical',
                        flex: 1,
                        contents: [
                          { type: 'image', url: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400', size: 'full', aspectRatio: '1:1', aspectMode: 'cover' },
                          { type: 'text', text: 'ก่อนทำ (Before)', size: 'xxs', color: '#A3A39C', align: 'center', margin: 'xs' }
                        ]
                      },
                      {
                        type: 'box',
                        layout: 'vertical',
                        flex: 1,
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
          // Work Done
          {
            type: 'box',
            layout: 'vertical',
            spacing: 'sm',
            contents: [
              { type: 'text', text: 'รายการที่ดำเนินการ', size: 'xs', weight: 'bold', color: '#123524' },
              {
                type: 'box',
                layout: 'vertical',
                spacing: 'xs',
                contents: [
                  { type: 'box', layout: 'horizontal', spacing: 'sm', contents: [{ type: 'text', text: '🍃', size: 'sm', flex: 0 }, { type: 'text', text: 'ตัดหญ้า', size: 'sm', color: '#333333', wrap: true, flex: 1 }] },
                  { type: 'box', layout: 'horizontal', spacing: 'sm', contents: [{ type: 'text', text: '🍃', size: 'sm', flex: 0 }, { type: 'text', text: 'ตัดแต่งกิ่งไม้', size: 'sm', color: '#333333', wrap: true, flex: 1 }] },
                ]
              }
            ]
          },
          // Next visit
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
                  { type: 'text', text: '21 มิถุนายน 2569', size: 'xs', color: '#111111', weight: 'bold', align: 'end', flex: 2 }
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
            action: { type: 'uri', label: 'ดูวารสารรายงานฉบับเต็ม', uri: 'https://xylem-landscape.vercel.app' },
            style: 'primary',
            color: '#111111',
            height: 'sm',
          },
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

  console.log('📤 Sending Flex Message to LINE...');
  console.log('Token:', LINE_TOKEN ? `${LINE_TOKEN.slice(0,10)}...` : '❌ NOT SET');
  console.log('Target:', TARGET_LINE_USER_ID);

  const response = await fetch('https://api.line.me/v2/bot/message/push', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${LINE_TOKEN}`,
    },
    body: JSON.stringify({
      to: TARGET_LINE_USER_ID,
      messages: [flexMessage],
    }),
  });

  const responseText = await response.text();
  
  if (response.ok) {
    console.log('✅ SUCCESS! Flex Message sent!');
    console.log('Response:', responseText);
  } else {
    console.log('❌ FAILED!', response.status, response.statusText);
    console.log('Error:', responseText);
  }
}

testFlexMessage();

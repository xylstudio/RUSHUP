const fs = require('fs');

function normalizeLineImageUrl(value) {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== 'https:') return null;
    return parsed.toString();
  } catch {
    return null;
  }
}

function buildCustomerReportFlexMessage(args) {
  const houseName = (args.lineReport.houseName || 'บ้านของคุณ').trim()
  const staffName = (args.lineReport.staffName || 'ทีมงาน Xylem').trim()
  const isRecurring = !!args.lineReport.visitCountText;
  const visitCount = args.lineReport.visitCountText || '';
  const serviceTypeLabel = 'บริการดูแลสวน';
  const detailUrl = "http://example.com";

  let legacyBeforeUrl = normalizeLineImageUrl(args.lineReport.beforePhotos?.[0])
  let legacyAfterUrl = normalizeLineImageUrl(args.lineReport.afterPhotos?.[0])

  if (!legacyBeforeUrl || !legacyAfterUrl) {
    const anyBefore = (args.lineReport.zones || []).flatMap((z) => z.before_photos || z.beforePhotos || []).find(Boolean)
    const anyAfter = (args.lineReport.zones || []).flatMap((z) => z.after_photos || z.afterPhotos || []).find(Boolean)
    legacyBeforeUrl = legacyBeforeUrl || normalizeLineImageUrl(anyBefore)
    legacyAfterUrl = legacyAfterUrl || normalizeLineImageUrl(anyAfter)
  }

  const hasZones = Array.isArray(args.lineReport.zones) && args.lineReport.zones.length > 0;

  return {
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
        contents: [
          {
            type: 'text',
            text: 'XYLEM LANDSCAPE',
            color: '#A3A39C',
            size: 'xxs',
            weight: 'bold',
          },
          {
            type: 'box',
            layout: 'horizontal',
            margin: 'sm',
            contents: [
              {
                type: 'text',
                text: 'Landscape Journal',
                weight: 'bold',
                size: 'xl',
                color: '#123524',
                flex: 4,
              },
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
          {
            type: 'text',
            text: `สรุปรายงานการเข้าดูแล ${serviceTypeLabel}`,
            size: 'xs',
            color: '#A3A39C',
            margin: 'xs',
          },
          {
            type: 'box',
            layout: 'vertical',
            margin: 'lg',
            height: '1px',
            backgroundColor: '#F1F1EB',
            contents: [],
          },
        ],
      },
      body: {
        type: 'box',
        layout: 'vertical',
        spacing: 'lg',
        paddingTop: '0px',
        contents: [
          // Property & Staff
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
                  { type: 'text', text: houseName, size: 'sm', weight: 'bold', color: '#123524', flex: 3, align: 'end' },
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
          
          // Zonal Reports or Legacy Before/After Comparison
          ...(hasZones ? [{
            type: 'box',
            layout: 'vertical',
            spacing: 'lg',
            contents: args.lineReport.zones.slice(0, 5).map((zone, idx) => {
              const zBeforeUrl = normalizeLineImageUrl(zone.before_photos?.[0] || zone.beforePhotos?.[0]);
              const zAfterUrl = normalizeLineImageUrl(zone.after_photos?.[0] || zone.afterPhotos?.[0] || zone.photos?.[0]);
              const zName = zone.name || `โซนที่ ${idx + 1}`;
              const zWork = zone.work_done || zone.workDone || '';

              return {
                type: 'box',
                layout: 'vertical',
                spacing: 'sm',
                contents: [
                  { type: 'text', text: `📍 ${zName}`, size: 'sm', weight: 'bold', color: '#1A3626' },
                  ...(zBeforeUrl || zAfterUrl ? [{
                    type: 'box',
                    layout: 'horizontal',
                    spacing: 'md',
                    contents: [
                      ...(zBeforeUrl ? [{
                        type: 'box',
                        layout: 'vertical',
                        flex: 1,
                        contents: [
                          { type: 'image', url: zBeforeUrl, size: 'full', aspectRatio: '1:1', aspectMode: 'cover', cornerRadius: 'md' },
                          { type: 'text', text: 'ก่อนทำ (Before)', size: '10px', color: '#A3A39C', align: 'center', margin: 'xs' }
                        ]
                      }] : []),
                      ...(zAfterUrl ? [{
                        type: 'box',
                        layout: 'vertical',
                        flex: 1,
                        contents: [
                          { type: 'image', url: zAfterUrl, size: 'full', aspectRatio: '1:1', aspectMode: 'cover', cornerRadius: 'md' },
                          { type: 'text', text: 'หลังทำ (After)', size: '10px', color: '#10B981', align: 'center', margin: 'xs', weight: 'bold' }
                        ]
                      }] : [])
                    ]
                  }] : []),
                  ...(zWork ? [{
                    type: 'text',
                    text: zWork,
                    size: 'xs',
                    color: '#4B5563',
                    wrap: true,
                    margin: 'sm'
                  }] : []),
                ]
              };
            })
          }] : (legacyBeforeUrl || legacyAfterUrl ? [{
            type: 'box',
            layout: 'horizontal',
            spacing: 'md',
            contents: [
              ...(legacyBeforeUrl ? [{
                type: 'box',
                layout: 'vertical',
                flex: 1,
                contents: [
                  { type: 'image', url: legacyBeforeUrl, size: 'full', aspectRatio: '1:1', aspectMode: 'cover', cornerRadius: 'md' },
                  { type: 'text', text: 'ก่อนทำ (Before)', size: '10px', color: '#A3A39C', align: 'center', margin: 'xs' }
                ]
              }] : []),
              ...(legacyAfterUrl ? [{
                type: 'box',
                layout: 'vertical',
                flex: 1,
                contents: [
                  { type: 'image', url: legacyAfterUrl, size: 'full', aspectRatio: '1:1', aspectMode: 'cover', cornerRadius: 'md' },
                  { type: 'text', text: 'หลังทำ (After)', size: '10px', color: '#10B981', align: 'center', margin: 'xs', weight: 'bold' }
                ]
              }] : [])
            ]
          }] : [])),
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
            action: {
              type: 'uri',
              label: 'ดูวารสารรายงานฉบับเต็ม',
              uri: detailUrl,
            },
            style: 'primary',
            color: '#111111',
            height: 'sm',
          },
          {
            type: 'text',
            text: 'ขอบคุณที่ไว้วางใจ Xylem Landscape ครับ',
            size: '10px',
            color: '#A3A39C',
            align: 'center',
            margin: 'md',
          }
        ],
      },
    },
  }
}

const res = buildCustomerReportFlexMessage({
  lineReport: {
    zones: [
      { name: 'Zone 1', work_done: 'A', before_photos: ['https://example.com/1'], after_photos: ['https://example.com/2'] }
    ]
  }
});
console.log(JSON.stringify(res, null, 2));

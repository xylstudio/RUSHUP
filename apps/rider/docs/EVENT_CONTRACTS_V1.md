# Event Contracts v1

เอกสารนี้เป็นสัญญา event กลางสำหรับเชื่อมโยง Customer, Staff, Admin และ Analytics ให้ทำงานจากข้อมูลเดียวกัน

## Event List (v1)

## `customer_reports_viewed`
- Source: `app/dashboard/customer/reports/page.tsx`
- Trigger: โหลดหน้า report ลูกค้าสำเร็จ
- Payload:
  - `reportCount: number`
  - `hasUpcomingVisit: boolean`

## `admin_reports_viewed`
- Source: `app/dashboard/admin/reports/page.tsx`
- Trigger: โหลดหน้า report แอดมินสำเร็จ
- Payload:
  - `reportCount: number`
  - `orderCount: number`

## `admin_reports_csv_exported`
- Source: `app/dashboard/admin/reports/page.tsx`
- Trigger: ผู้ใช้กด Export CSV
- Payload:
  - `source: 'work_reports' | 'telemetry_trend' | 'telemetry_trend_json'`
  - `reportCount?: number` (กรณี export รายงานงานหน้างาน)
  - `trendDays?: 7 | 30` (กรณี export telemetry)
  - `rowCount?: number` (กรณี export telemetry)
  - `startDate: string | null`
  - `endDate: string | null`

## `work_report_submitted`
- Source: `app/dashboard/staff/tasks/[taskId]/page.tsx`
- Trigger: พนักงานบันทึกรายงานสำเร็จ
- Payload:
  - `orderId: string`
  - `assignmentId: string`
  - `hasNextVisit: boolean`
  - `beforePhotoCount: number`
  - `afterPhotoCount: number`

---

## Runtime Transport (v1)
- Utility: `lib/analytics/events.ts`
- ส่งผ่าน `window.dispatchEvent(new CustomEvent('xylem:product-event', ...))`
- ยิงเข้า API: `POST /api/analytics/events`
- เก็บลงตาราง: `product_events`
- ใน `development` จะ log console เพื่อ debug

---

## Next Step (v2)
- ส่ง event ไป analytics provider ภายนอก (เช่น PostHog/Segment)
- เพิ่ม correlation id (`order_id`, `customer_id`, `staff_id`) แบบมาตรฐาน
- เพิ่ม dashboard funnel: staff submit -> customer view -> renewal action

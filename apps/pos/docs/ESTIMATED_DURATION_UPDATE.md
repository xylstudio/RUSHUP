# การเพิ่มฟีเจอร์ Estimated Duration (ระยะเวลาดำเนินงาน)

## สรุปการอัปเดต

เพิ่มฟีเจอร์ให้ admin สามารถเปิด/ปิดการแสดงระยะเวลาดำเนินงานของแต่ละบริการได้เองตามความเหมาะสม

## การปรับปรุง Admin Side

### 1. Interface และ State Management
- เพิ่มฟิลด์ `has_estimated_duration: boolean` ใน `ServiceFormData`
- ปรับ initial state ให้มีค่า default เป็น `false`
- ปรับ `handleInputChange` ให้รองรับ boolean type

### 2. UI Components
- เพิ่ม toggle switch สำหรับเปิด/ปิดฟีเจอร์ estimated duration
- แสดง duration input เฉพาะเมื่อ toggle เปิดใช้งาน
- เปลี่ยนหน่วยจาก "ชั่วโมง" เป็น "วัน" ให้เหมาะสมกับงานจริง
- เพิ่มคำอธิบายและ tooltip ที่ชัดเจน

### 3. Category Auto-Setting
ปรับ `SERVICE_CATEGORIES` ให้แต่ละหมวดหมู่มี default setting:

| หมวดหมู่ | Default Has Duration | Default Duration (วัน) |
|----------|---------------------|----------------------|
| จัดสวน (landscaping) | ✅ เปิด | 7 วัน |
| บำรุงรักษา (maintenance) | ❌ ปิด | - |
| ออกแบบ (design) | ✅ เปิด | 14 วัน |
| ก่อสร้าง (construction) | ✅ เปิด | 30 วัน |
| ทำความสะอาด (cleaning) | ❌ ปิด | - |
| บำบัดต้นไม้ (treatment) | ✅ เปิด | 5 วัน |

### 4. Validation และ Summary
- ปรับ validation ให้ตรวจสอบ duration เฉพาะเมื่อเปิดใช้งาน
- แสดง duration ใน summary เฉพาะเมื่อเปิดใช้งาน
- บันทึก `has_estimated_duration` ลงฐานข้อมูล

## การปรับปรุง Customer Side

### 1. Interface Update
- เพิ่มฟิลด์ `has_estimated_duration?: boolean` ใน `Service` interface

### 2. Service List Display
- แสดง estimated duration ใน service card เฉพาะเมื่อ admin เปิดใช้งาน
- ใช้ ClockIcon และจัดรูปแบบให้สวยงาม

### 3. Service Details Page
- แสดง duration ในส่วน service details ด้วย border และ icon
- เพิ่มคำอธิบายเสริม "*ระยะเวลาโดยประมาณ อาจแตกต่างไปตามสภาพพื้นที่จริง"

### 4. Order Summary
- รวม estimated duration ในหน้า summary (ขั้นตอนที่ 4)
- แสดงเฉพาะเมื่อมีข้อมูลและเปิดใช้งาน

## Database Schema Update

```sql
-- เพิ่มฟิลด์ has_estimated_duration
ALTER TABLE services 
ADD COLUMN has_estimated_duration BOOLEAN DEFAULT FALSE;

-- เปลี่ยน estimated_duration ให้เป็น nullable
ALTER TABLE services 
ALTER COLUMN estimated_duration DROP NOT NULL;

-- อัปเดตข้อมูลเดิมตามหมวดหมู่
UPDATE services 
SET has_estimated_duration = TRUE, 
    estimated_duration = CASE 
        WHEN category = 'design' THEN 14
        WHEN category = 'construction' THEN 30
        WHEN category = 'landscaping' THEN 7
        WHEN category = 'treatment' THEN 5
        ELSE NULL
    END
WHERE category IN ('design', 'construction', 'landscaping', 'treatment');
```

## UX/UI Philosophy

### 1. Minimal Design
- ใช้ toggle switch แทนปุ่มหรือ checkbox ซับซ้อน
- แสดง/ซ่อนฟิลด์อย่างราบรื่น
- สีและ icon สอดคล้องกับ design system

### 2. Smart Defaults
- Auto-set ตามประเภทบริการ (admin สามารถ override ได้)
- บริการประจำ (maintenance, cleaning) ปิดใช้งาน default
- บริการรายครั้ง (design, construction) เปิดใช้งาน default

### 3. Clear Information Hierarchy
- แสดงข้อมูลที่สำคัญเฉพาะเมื่อจำเป็น
- ใช้คำอธิบายเสริมที่เข้าใจง่าย
- จัดกลุ่มข้อมูลอย่างมีลอจิก

## การทดสอบที่แนะนำ

### Admin Testing
1. สร้างบริการใหม่แต่ละหมวดหมู่ ตรวจสอบ auto-setting
2. ทดสอบเปิด/ปิด toggle และการแสดงผล
3. ทดสอบ validation เมื่อเปิดใช้งานแต่ไม่กรอก duration
4. ตรวจสอบ summary และการบันทึกข้อมูล

### Customer Testing
1. ตรวจสอบการแสดงผลใน service list
2. ทดสอบ service details เมื่อมี/ไม่มี estimated duration
3. ตรวจสอบ order summary
4. ทดสอบกับบริการหลายประเภท

## ไฟล์ที่ได้รับการอัปเดต

### Backend/Database
- `add-estimated-duration-toggle.sql` - Schema migration

### Admin Interface
- `app/dashboard/admin/services/create/page.tsx` - Service creation form

### Customer Interface  
- `app/dashboard/customer/services/page.tsx` - Service selection flow

## ขั้นตอนถัดไป

1. **รัน migration** - ปรับปรุงฐานข้อมูลด้วย SQL file ที่สร้างไว้
2. **ทดสอบ end-to-end** - สร้างบริการใหม่และลองจองผ่าน customer
3. **ปรับปรุงบริการเดิม** - อัปเดตบริการที่มีอยู่ให้สอดคล้องกับ schema ใหม่
4. **เอกสารคู่มือ** - อัปเดต user manual สำหรับ admin

---

**หมายเหตุ:** ฟีเจอร์นี้ช่วยให้ admin มีความยืดหยุ่นในการแสดงข้อมูลให้ลูกค้า ไม่บังคับให้ทุกบริการต้องมีระยะเวลาดำเนินงาน เพราะบางบริการ (เช่น บำรุงรักษาประจำ) ไม่จำเป็นต้องแสดงข้อมูลนี้

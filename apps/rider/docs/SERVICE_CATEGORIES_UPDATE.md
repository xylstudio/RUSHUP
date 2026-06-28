# การปรับปรุงหมวดหมู่บริการ

## สรุปการเปลี่ยนแปลง

### หมวดหมู่บริการใหม่ (5 หมวดหลัก)

1. **ออกแบบสวน** (`design`)
   - ไอคอน: PaintBrushIcon 
   - สี: Purple
   - Billing Type เริ่มต้น: One-time
   - Estimated Duration เริ่มต้น: 14 วัน

2. **ดูแลสวน** (`maintenance`)
   - ไอคอน: ScissorsIcon
   - สี: Green 
   - Billing Type เริ่มต้น: Recurring
   - Estimated Duration เริ่มต้น: ปิดใช้งาน (4 ชั่วโมง)

3. **จัดสวนปูหญ้า** (`landscaping`)
   - ไอคอน: SparklesIcon
   - สี: Emerald
   - Billing Type เริ่มต้น: One-time  
   - Estimated Duration เริ่มต้น: 7 วัน

4. **ระบบน้ำ** (`irrigation`)
   - ไอคอน: BeakerIcon
   - สี: Blue
   - Billing Type เริ่มต้น: Both
   - Estimated Duration เริ่มต้น: 5 วัน

5. **ทำความสะอาดบ้าน** (`cleaning`)
   - ไอคอน: HomeIcon
   - สี: Orange
   - Billing Type เริ่มต้น: Both
   - Estimated Duration เริ่มต้น: ปิดใช้งาน (3 ชั่วโมง)

### หมวดหมู่ที่ถูกรวมหรือปรับปรุง

- `construction` (ก่อสร้าง) → รวมเข้ากับ `landscaping` (จัดสวนปูหญ้า)
- `treatment` (บำบัดต้นไม้) → รวมเข้ากับ `maintenance` (ดูแลสวน)
- ปรับชื่อหมวดหมู่ให้สื่อความหมายชัดเจนขึ้น

### ผลกระทบต่อระบบ

1. **UI/UX**
   - หมวดหมู่กระชับขึ้น ง่ายต่อการเลือก
   - สีและไอคอนสอดคล้องกับประเภทบริการ
   - ลำดับการแสดงผลเป็นไปตามลำดับการทำงานจริง

2. **Default Settings**
   - แต่ละหมวดหมู่มีการตั้งค่าเริ่มต้นที่เหมาะสม
   - Admin สามารถปรับแต่งได้ตามต้องการ

3. **Database**
   - บริการเดิมที่มี category เก่ายังคงทำงานได้
   - Admin ควรปรับ category ของบริการเดิมให้สอดคล้อง

## ไฟล์ที่ได้รับการปรับปรุง

- `app/dashboard/customer/services/page.tsx` - หน้าเลือกบริการของลูกค้า
- `app/dashboard/admin/services/create/page.tsx` - หน้าสร้างบริการของ admin

## คำแนะนำ

1. ปรับ category ของบริการเดิมในฐานข้อมูลให้สอดคล้องกับหมวดหมู่ใหม่
2. อัปเดตเอกสารคู่มือการใช้งานให้ admin
3. ทดสอบการทำงานของบริการในแต่ละหมวดหมู่ใหม่

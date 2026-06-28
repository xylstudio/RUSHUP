# Xylem Landscape - Admin Service Creation Page

## Overview
หน้าสร้างบริการใหม่สำหรับผู้จัดการระบบ Xylem Landscape ที่ออกแบบมาให้ใช้งานง่าย ครอบคลุมข้อมูลที่จำเป็น และมีความปลอดภัยสูง

## Features

### ✨ User Experience
- **Single-page form**: แบบฟอร์มแบบหน้าเดียว ไม่ซับซ้อน
- **Step-by-step sections**: แบ่งเป็น 4 ขั้นตอนชัดเจน
- **Real-time validation**: ตรวจสอบข้อมูลแบบทันที
- **Visual feedback**: แสดงสถานะการทำงานด้วยสี icon และ animation
- **Responsive design**: รองรับทุกขนาดหน้าจอ

### 🔧 Functionality
- **Service creation**: สร้างบริการใหม่พร้อมรายละเอียดครบถ้วน
- **Category selection**: เลือกหมวดหมู่บริการพร้อมไอคอน
- **Flexible pricing**: รองรับการคิดราคาหลายแบบ (พื้นที่/เวลา/จำนวน/โครงการ)
- **Add-ons support**: เพิ่มตัวเลือกเสริมได้หลายรายการ
- **Image upload**: อัพโหลดรูปภาพบริการ
- **Form validation**: ตรวจสอบข้อมูลครบถ้วนและถูกต้อง

### 🛡️ Security & Data
- **Supabase integration**: เชื่อมต่อฐานข้อมูลปลอดภัย
- **RLS policies**: ใช้ Row Level Security
- **File upload**: อัพโหลดไฟล์ผ่าน Supabase Storage
- **Error handling**: จัดการข้อผิดพลาดแบบครอบคลุม

## File Structure

```
app/dashboard/admin/services/add/
├── page.tsx         # Original complex version
└── page_new.tsx     # New simplified version ⭐

components/
└── Sidebar.tsx      # Updated with service management menu

lib/
├── supabaseClient.ts
├── database.types.ts
└── AuthContext.tsx

SQL Files:
├── supabase-schema.sql
└── update-services-schema.sql  # New database updates
```

## Database Schema Updates

### Services Table
```sql
-- New columns added:
- service_name: TEXT (replacing name)
- category: TEXT (service category)
- base_price: NUMERIC (replacing price)
- pricing_type: TEXT (area_based/time_based/quantity_based/fixed_project)
- estimated_duration: INTEGER (hours)
- service_image: TEXT (image URL)
- is_active: BOOLEAN (active status)
```

### Service Add-ons Table
```sql
-- New table for service add-ons:
- id: UUID PRIMARY KEY
- service_id: UUID (foreign key)
- name: TEXT (add-on name)
- description: TEXT (add-on description)
- price: NUMERIC (additional price)
- created_at, updated_at: TIMESTAMP
```

## How to Use

### For Developers

1. **Database Setup**:
   ```sql
   -- Run in Supabase SQL Editor
   -- 1. First run the main schema: supabase-schema.sql
   -- 2. Then run the updates: update-services-schema.sql
   ```

2. **Storage Setup**:
   ```javascript
   // Create service-images bucket in Supabase Storage
   // Set it as public for image access
   ```

3. **File Usage**:
   ```typescript
   // Use the new simplified version
   // Route: /dashboard/admin/services/add
   // File: page_new.tsx
   ```

   4. **Service Planning Hardening (สำคัญก่อนขึ้นโปรดักชัน)**
      ```sql
      -- Run in Supabase SQL Editor
      -- Apply integrity constraints and triggers to prevent overlaps/conflicts
      -- File in repo: add-service-planning-constraints.sql
      ```
      - บังคับช่วงพื้นที่ของราคา (price_templates) ห้ามซ้อนกันต่อบริการ
      - ตรวจซ้อนเวลานัดหมายของบ้านและพนักงาน (orders, job_assignments)
      - จำกัดคำขอวัดพื้นที่บ้านละ 1 รายการที่ยัง active
      - ตรวจ zip_code ของบ้านต้องอยู่ใน coverage ของสาขา

### For Admins

1. **Access**: เข้าใหม่ส่วนผู้จัดการ → เมนู "จัดการบริการ"
2. **Quick Action**: คลิกปุ่ม "สร้างบริการใหม่" ในแถบด้านข้าง
3. **Form Completion**:
   - **Step 1**: กรอกข้อมูลพื้นฐาน (ชื่อ, รายละเอียด, หมวดหมู่, ระยะเวลา)
   - **Step 2**: ตั้งราคาและเลือกประเภทการคิดราคา  
   - **Step 3**: เพิ่มตัวเลือกเสริม (ไม่บังคับ)
   - **Step 4**: อัพโหลดรูปภาพ (ไม่บังคับ)
4. **Submit**: คลิก "สร้างบริการ" เพื่อบันทึก

5. **Manage Pricing Templates**:
   - เมนู: จัดการบริการ → "เทมเพลตราคา"
   - เส้นทาง: /dashboard/admin/services/pricing
   - คุณสมบัติ: สร้าง/แก้ไขช่วงพื้นที่, ราคาพื้นฐาน, ราคาต่อตร.ม., พร้อมตรวจเตือนช่วงซ้อนในหน้าแบบเรียลไทม์ (ระบบฐานข้อมูลจะกันซ้อนอีกชั้น)

## Form Validation Rules

### Required Fields
- ชื่อบริการ (อย่างน้อย 3 ตัวอักษร)
- รายละเอียดบริการ (อย่างน้อย 10 ตัวอักษร)
- หมวดหมู่บริการ
- ราคาพื้นฐาน (0-100,000 บาท)
- ประเภทการคิดราคา
- ระยะเวลาโดยประมาณ (1-24 ชั่วโมง)

### Optional Fields
- ตัวเลือกเพิ่มเติม
- รูปภาพบริการ (รองรับ JPG, PNG ขนาดไม่เกิน 5MB)

### Add-ons Validation
- หากมีชื่อต้องมีรายละเอียด
- ราคาต้องไม่เป็นค่าลบ

## Service Categories

1. **ดูแลสวน** (garden_care) - 🌟
2. **ดูแลสนามหญ้า** (lawn_care) - 🎨
3. **ดูแลสระว่ายน้ำ** (pool_maintenance) - 🧪
4. **ตัดแต่งต้นไม้** (tree_trimming) - ✂️
5. **ซ่อมแซมทั่วไป** (general_maintenance) - 🔧
6. **งานก่อสร้าง** (construction) - 🏪

## Pricing Types

1. **คิดตามพื้นที่** (area_based) - ตร.ม.
2. **คิดตามเวลา** (time_based) - ชั่วโมง
3. **คิดตามจำนวน** (quantity_based) - ต้น/ชิ้น
4. **ราคาเหมาโครงการ** (fixed_project) - โครงการ

## Error Handling

### Common Errors
- **Database connection**: ตรวจสอบการเชื่อมต่อ Supabase
- **Image upload**: ตรวจสอบขนาดไฟล์และรูปแบบ
- **Validation**: แสดงข้อความแนะนำชัดเจน
- **Network**: จัดการ timeout และ connection issues

### Success Flow
1. แสดงหน้าจอยืนยันความสำเร็จ
2. Auto-redirect ไปยังหน้ารายการบริการ
3. บันทึก log การสร้างบริการ

## Performance Optimization

- **Form state management**: ใช้ useState อย่างมีประสิทธิภาพ
- **Image preview**: แสดงข้อมูลไฟล์ก่อนอัพโหลด
- **Validation debouncing**: ลดการตรวจสอบซ้ำ
- **Loading states**: แสดงสถานะการทำงาน

## Future Enhancements

### Planned Features
- [ ] Drag & drop image upload
- [ ] Service templates
- [ ] Bulk add-on import
- [ ] Preview mode before saving
- [ ] Service duplication
- [ ] Advanced pricing calculator

### Technical Improvements
- [ ] Form auto-save
- [ ] Progressive image upload
- [ ] Advanced validation rules
- [ ] Integration with inventory system
- [ ] Automated testing

## Support

For technical issues or feature requests:
- Check database schema is up to date
- Verify Supabase configuration
- Ensure proper RLS policies are applied
- Test image upload permissions

---

**Last Updated**: December 2024  
**Version**: 2.0  
**Status**: Production Ready ✅

# 📝 Admin Service Creation Guide

## 🎯 Overview
หน้าสร้างบริการใหม่ที่ใช้แนวคิด **Minimal UX/UI** และระบบ **Area-based Packages** ที่ยืดหยุ่นและครอบคลุม

## 🚀 Features

### ✨ Minimal UX/UI Design
- **4-Step Wizard**: ข้อมูลพื้นฐาน → หมวดหมู่ → แพ็กเกจ → ยืนยัน
- **Clean Interface**: UI เรียบง่าย โฟกัสที่เนื้อหาสำคัญ
- **Progressive Disclosure**: แสดงข้อมูลทีละขั้นตอน ไม่ให้ user overwhelm
- **Real-time Preview**: ดู preview การคำนวณราคาแบบ real-time

### 📦 Area-based Package System
- **Flexible Packages**: สร้างแพ็กเกจตามขนาดพื้นที่ได้ไม่จำกัด
- **Smart Pricing**: ราคาพื้นฐาน + ราคาต่อ ตร.ม.
- **Auto Package Selection**: ระบบเลือกแพ็กเกจอัตโนมัติตามพื้นที่ที่ระบุ
- **Price Calculation**: คำนวณราคาแบบ transparent

## 🛠️ How to Use

### การเข้าถึง
```
/dashboard/admin/services → ปุ่ม "สร้างบริการใหม่"
/dashboard/admin/services/create
```

### Step 1: ข้อมูลพื้นฐาน
- ชื่อบริการ (required)
- รหัสบริการ (auto-generated, editable)
- คำอธิบายบริการ (required)
- ราคาเริ่มต้น (required)
- ระยะเวลาดำเนินงาน (required)

### Step 2: หมวดหมู่บริการ
เลือกหมวดหมู่จาก 6 ตัวเลือก:
- 🎨 จัดสวน (landscaping)
- 🔧 บำรุงรักษา (maintenance)
- 🎨 ออกแบบ (design)
- 🏗️ ก่อสร้าง (construction)
- ✨ ทำความสะอาด (cleaning)
- 🧪 บำบัดต้นไม้ (treatment)

### Step 3: กำหนดแพ็กเกจราคา
- **Default Packages**: เริ่มต้นด้วย 4 แพ็กเกจมาตรฐาน
- **Add/Remove**: เพิ่ม/ลดแพ็กเกจได้ตามต้องการ
- **Package Fields**:
  - ชื่อแพ็กเกจ
  - พื้นที่ขั้นต่ำ (ตร.ม.)
  - พื้นที่สูงสุด (ตร.ม.) - เว้นว่างได้สำหรับ unlimited
  - ราคาต่อ ตร.ม.
  - ราคาพื้นฐาน
- **Real-time Preview**: ดูตัวอย่างการคำนวณราคา

### Step 4: ยืนยันการสร้าง
- สรุปข้อมูลทั้งหมด
- ยืนยันก่อนบันทึก
- เชื่อมต่อฐานข้อมูล Supabase

## 📊 Data Structure

### Services Table
```sql
{
  id: string,
  service_name: string,
  description: string,
  category: string,
  base_price: number,
  estimated_duration: number,
  service_code: string,
  created_at: timestamp
}
```

### Price Templates Table
```sql
{
  id: string,
  service_id: string (FK),
  template_name: string,
  area_min: number,
  area_max: number | null,
  price_per_unit: number,
  base_price: number,
  description: string | null
}
```

## 🎨 Design Principles

### 1. **Minimal First**
- เฉพาะข้อมูลที่จำเป็น
- ไม่มีฟิลด์หรือฟีเจอร์ที่ซับซ้อนเกินไป
- Progressive disclosure

### 2. **Area-centric Approach**
- พื้นที่เป็นตัวแปรหลักในการกำหนดราคา
- แพ็กเกจถูก auto-select ตามพื้นที่
- ราคาโปร่งใส คำนวณได้ชัดเจน

### 3. **Flexible Package System**
- สามารถกำหนดแพ็กเกจได้ไม่จำกัด
- รองรับ unlimited area (area_max = null)
- Preview system สำหรับทดสอบ

### 4. **Consistent UX Pattern**
- Step wizard pattern เหมือนกับหน้า customer service selection
- Validation แบบ real-time
- Error handling ที่ชัดเจน

## 🔄 Integration with Customer Flow

หน้าสร้างบริการนี้ออกแบบให้สอดคล้องกับ customer service selection flow:

### Customer Side Flow
1. เลือกบ้าน
2. เลือกบริการ  
3. **ใส่ขนาดพื้นที่ → ระบบเลือกแพ็กเกจให้อัตโนมัติ**
4. ชำระเงิน

### Admin Side Creation
1. ข้อมูลพื้นฐาน
2. หมวดหมู่
3. **สร้างแพ็กเกจตามขนาดพื้นที่**
4. ยืนยัน

## 📱 Responsive Design
- Mobile-first approach
- Grid system ปรับตาม screen size
- Touch-friendly buttons
- Readable typography

## 🚦 Validation Rules

### Required Fields
- ชื่อบริการ
- คำอธิบายบริการ  
- ราคาเริ่มต้น > 0
- ระยะเวลาดำเนินงาน > 0
- หมวดหมู่บริการ
- อย่างน้อย 1 แพ็กเกจ

### Package Validation
- ชื่อแพ็กเกจไม่ว่าง
- ราคาต่อ ตร.ม. > 0
- ราคาพื้นฐาน > 0
- พื้นที่ขั้นต่ำ >= 0

## 🔮 Future Enhancements

### Short-term
- [ ] Import/Export packages from templates
- [ ] Duplicate existing service
- [ ] Bulk edit packages
- [ ] Service categories management

### Long-term  
- [ ] Advanced pricing rules (discounts, seasonal rates)
- [ ] Multi-language support
- [ ] Service dependencies
- [ ] Integration with scheduling system

## 🎯 Key Benefits

1. **Consistency**: UX pattern เดียวกันกับ customer flow
2. **Flexibility**: รองรับบริการหลากหลายประเภท
3. **Scalability**: เพิ่มแพ็กเกจ/บริการได้ไม่จำกัด
4. **Transparency**: ราคาชัดเจน คำนวณได้
5. **User-friendly**: Admin ใช้งานง่าย ไม่ซับซ้อน

---

**สร้างโดย**: AI Assistant  
**วันที่**: $(date)  
**เวอร์ชัน**: 1.0  
**แนวคิด**: Minimal UX/UI, Area-based Packages

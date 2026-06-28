# Google Maps Setup Guide

## การตั้งค่า Google Maps API สำหรับระบบเลือกตำแหน่งบ้าน

### ขั้นตอนการตั้งค่า Google Cloud Console

1. **เปิด Google Cloud Console**
   - ไปที่ [Google Cloud Console](https://console.cloud.google.com/)
   - สร้าง Project ใหม่หรือเลือก Project ที่มีอยู่

2. **เปิดใช้งาน APIs**
   - ไปที่ "APIs & Services" > "Library"
   - ค้นหาและเปิดใช้งาน APIs ต่อไปนี้:
     - **Maps JavaScript API** (สำหรับแสดงแผนที่)
     - **Geocoding API** (สำหรับแปลงที่อยู่เป็นพิกัด)
     - **Places API** (สำหรับค้นหาสถานที่)

3. **สร้าง API Key**
   - ไปที่ "APIs & Services" > "Credentials"
   - คลิก "Create Credentials" > "API Key"
   - คัดลอก API Key ที่สร้างขึ้น

4. **กำหนดข้อจำกัดความปลอดภัย**
   - คลิกที่ API Key ที่สร้างขึ้น
   - ใน "Application restrictions" เลือก "HTTP referrers (web sites)"
   - เพิ่ม referrers:
     - `http://localhost:3000/*` (สำหรับ development)
     - `https://yourdomain.com/*` (สำหรับ production)
   - ใน "API restrictions" เลือก "Restrict key" และเลือก APIs ที่เปิดใช้งานด้านบน

5. **อัปเดตไฟล์ .env.local**
   ```bash
   NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_actual_api_key_here
   ```

### ฟีเจอร์ที่เพิ่มเข้ามา

1. **Google Maps Location Picker**
   - Modal ที่แสดง Google Maps
   - ผู้ใช้สามารถคลิกเลือกตำแหน่งบนแผนที่
   - แสดงพิกัด (latitude, longitude) และที่อยู่

2. **Address Search**
   - ค้นหาที่อยู่ด้วยข้อความ
   - แสดงผลตำแหน่งบนแผนที่
   - Reverse Geocoding เพื่อแปลงพิกัดเป็นที่อยู่

3. **Database Integration**
   - เก็บพิกัด latitude, longitude ในฐานข้อมูล
   - เพิ่ม index สำหรับการค้นหาตำแหน่งใกล้เคียง

### การใช้งาน

1. เข้าไปที่หน้าเพิ่มบ้าน (`/dashboard/customer/houses/add`)
2. กรอกข้อมูลพื้นฐาน
3. ในช่อง "ที่อยู่" คลิกปุ่ม "เลือกตำแหน่งจาก Google Maps"
4. ใน Modal ที่เปิดขึ้น:
   - ใช้ช่องค้นหาเพื่อหาที่อยู่
   - หรือคลิกโดยตรงบนแผนที่
   - ตรวจสอบที่อยู่และพิกัดที่แสดง
   - คลิก "ยืนยันตำแหน่ง"

### หมายเหตุ

- หาก Google Maps API Key ไม่ได้ตั้งค่า ระบบจะแสดงข้อความแจ้งเตือน
- ระบบยังคงทำงานได้ปกติแม้ไม่มี Google Maps (ผู้ใช้สามารถกรอกที่อยู่ด้วยข้อความได้)
- พิกัดจะถูกบันทึกในฐานข้อมูลเพื่อใช้สำหรับฟีเจอร์อื่น ๆ ในอนาคต (เช่น การค้นหาบ้านใกล้เคียง)

### ต้นทุน

- Google Maps APIs มีโควต้าฟรี 200$ ต่อเดือน
- สำหรับการใช้งานทั่วไป ควรเพียงพอสำหรับเว็บไซต์ขนาดเล็กถึงกลาง
- ตรวจสอบการใช้งานที่ Google Cloud Console เป็นประจำ

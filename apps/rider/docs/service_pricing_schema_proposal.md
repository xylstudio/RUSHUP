# Service Pricing Schema Proposal (2025)

## 1. ตาราง `services`
- id (PK)
- service_name (string)
- base_price (number, nullable) // ราคาพื้นฐาน (ใช้กับทุกแบบ)
- description (string, nullable)
- created_at, updated_at

## 2. ตาราง `service_price_templates`
- id (PK)
- service_id (FK)
- package_name (string) // เช่น "รายเดือน", "รายปี", "แพ็กเกจเล็ก"
- price_type (enum: fixed, per_sqm, daily, monthly, yearly, hybrid)
- price_fixed (number, nullable) // ราคาคงที่
- price_per_sqm (number, nullable) // ราคาต่อตร.ม.
- price_daily (number, nullable)
- price_monthly (number, nullable)
- price_yearly (number, nullable)
- min_area (number, nullable)
- max_area (number, nullable)
- is_default (boolean) // ใช้เป็น default package หรือไม่
- description (string, nullable)

## 3. ตัวอย่างข้อมูล
| package_name | price_type | price_fixed | price_per_sqm | price_daily | price_monthly | price_yearly | min_area | max_area |
|--------------|-----------|-------------|---------------|-------------|---------------|--------------|----------|----------|
| รายวัน       | daily     | null        | null          | 100         | null          | null         | null     | null     |
| รายเดือน     | monthly   | null        | null          | null        | 2000          | null         | null     | null     |
| รายปี        | yearly    | null        | null          | null        | null          | 20000        | null     | null     |
| แพ็กเกจเล็ก  | per_sqm   | 500         | 20            | null        | null          | null         | 0        | 50       |
| แพ็กเกจใหญ่  | fixed     | 1500        | null          | null        | null          | null         | null     | null     |
| Hybrid       | hybrid    | 1000        | 10            | null        | 1000          | null         | 0        | 999      |

## 4. หมายเหตุ
- 1 บริการมีได้หลาย package/price template
- รองรับการขยายประเภทในอนาคต
- สามารถแสดงราคาทุกแบบในหน้าเดียว

---

**ถ้าตกลง ผมจะเริ่มแก้ไขโค้ดและฐานข้อมูลตาม schema นี้**

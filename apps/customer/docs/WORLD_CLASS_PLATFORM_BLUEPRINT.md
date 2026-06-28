# Xylem World-Class Platform Blueprint

## 1) เป้าหมายระดับโลก (Target State)

สร้างแพลตฟอร์มดูแลสวนแบบ End-to-End ที่ลูกค้าเห็นความคืบหน้าแบบเรียลไทม์ ทีมภาคสนามทำงานคล่อง ฝ่ายปฏิบัติการควบคุมคุณภาพได้ และฝ่ายบริหารวัดผลเชิงธุรกิจได้จากข้อมูลเดียวกันทั้งระบบ

### North Star Outcomes
- ลูกค้า: เห็นผลลัพธ์งานชัดเจน เข้าใจสุขภาพสวนได้ทันที และเชื่อมั่นต่อเนื่องระยะยาว
- พนักงาน: ลดงานซ้ำซ้อน กรอกข้อมูลครั้งเดียว ใช้ซ้ำได้ทุกหน้าที่เกี่ยวข้อง
- แอดมิน: บริหารงานเป็นระบบ มองเห็นคอขวด รู้ว่าต้องแก้จุดไหนก่อน
- ธุรกิจ: เพิ่มการต่อสัญญารายปี ลดต้นทุนปฏิบัติการ เพิ่มรายได้ต่อครัวเรือน

---

## 2) Capability Map ที่ต้องมีครบ

## A. Customer Experience Layer
- Garden Command Center: สุขภาพสวน, แนวโน้ม, นัดหมาย, งานที่ทำล่าสุด
- Report Hub: รายเดือน/รายรอบ, รูปก่อน-หลัง, คำแนะนำเชิงปฏิบัติ
- Service Continuity: ต่ออายุแพ็กเกจ, ขอปรับแผนการดูแล, แจ้งปัญหา
- Notification Intelligence: แจ้งเตือนที่มีบริบท (เช่น ต้องรดน้ำเพิ่ม, นัดหมายพรุ่งนี้)

## B. Staff Execution OS
- Task Workspace เดียว: checklist, รูปก่อน-หลัง, สภาพพืช, ปัญหา, next visit
- Smart Forms: auto-fill จากรอบก่อน, template ตามประเภทสวน
- Offline-first: บันทึกหน้างานแม้สัญญาณไม่ดี แล้ว sync อัตโนมัติ
- Quality Guardrails: บังคับฟิลด์สำคัญก่อนปิดงาน

## C. Admin Operations Control Tower
- Dispatch & Capacity: วางแผนพนักงาน, route, SLA
- Exception Management: เคสเสี่ยง, งานล่าช้า, ลูกค้าร้องเรียน
- Service Quality Dashboard: score รายทีม/รายลูกค้า/รายพื้นที่
- Renewal & Churn Radar: ใครมีโอกาสไม่ต่อสัญญา พร้อม action แนะนำ

## D. Commerce + Contract + Document Engine
- Contract lifecycle ครบ: quote -> invoice -> receipt -> renewal
- Recurring billing orchestration สำหรับลูกค้ารายปี
- Unified document timeline ติด order/customer เดียวกัน
- Payment and compliance logs แบบตรวจสอบย้อนหลังได้

## E. Intelligence & Automation
- Health Scoring Engine (สวน): คะแนนสุขภาพจาก work reports + trend
- Next Best Action: แนะนำงานรอบหน้าอัตโนมัติ
- Auto-summarization รายเดือนจากงานหน้างานทั้งหมด
- Customer sentiment + issue prediction

## F. Platform Foundation
- Unified identity/role (customer/staff/admin)
- Event-driven integration (ทุกการเปลี่ยนสถานะมี event)
- Observability ครบ: logs/metrics/traces + product analytics
- Security baseline: RLS, audit trail, least privilege, encryption

---

## 3) Integration Architecture (เชื่อมโยงสมบูรณ์)

## Canonical Entities (Single Source of Truth)
- Customer
- Property (house/site)
- Contract/Plan
- Order/Visit
- Job Assignment
- Work Report
- Document (quotation/invoice/receipt/contract)
- Payment
- Notification

## Event Contracts (แนะนำให้ใช้)
- order.created
- assignment.scheduled
- assignment.started
- work_report.submitted
- work_report.approved
- next_visit.planned
- document.issued
- payment.completed
- contract.renewal_due

## Data Flow หลัก
1. Staff submit work_report -> trigger health_score recalculation
2. health_score update -> customer dashboard + admin risk panel refresh
3. next_visit.planned -> customer calendar + staff queue auto-update
4. document/payment events -> contract state + renewal engine update

---

## 4) UX System ที่ควรยกระดับให้เป็นมาตรฐานเดียว

- Design tokens กลาง: spacing, radius, typography scale, interaction states
- Reusable dashboard primitives: hero, stat cards, timeline cards, section shells
- Content hierarchy มาตรฐาน: What happened -> Why it matters -> What next
- Progressive disclosure: มือใหม่เห็นง่าย, ผู้ใช้ขั้นสูงเจาะลึกได้
- Accessibility: contrast, keyboard nav, readable labels, touch targets

---

## 5) KPI Tree ระดับผู้บริหารถึงทีมปฏิบัติการ

## Business
- Annual renewal rate
- Revenue per customer
- Cost per completed visit

## Service Quality
- On-time visit rate (SLA)
- First-time quality pass rate
- Repeat issue rate ต่อ property

## Customer Experience
- Report view engagement
- Notification action rate
- Complaint to resolution time

## Staff Productivity
- Jobs completed per day
- Report completion quality score
- Rework rate

---

## 6) Roadmap เชิงปฏิบัติ (12 เดือน)

## Phase 1: Foundation (0-6 สัปดาห์)
- จัด canonical data model + event map
- มาตรฐาน UX components กลาง
- customer report hub รุ่นใหม่ (อ่านง่าย + รายรอบ)
- admin operations baseline dashboard

## Phase 2: Integration (6-12 สัปดาห์)
- workflow automation ระหว่าง staff -> customer -> admin
- recurring/annual contract state machine
- notification orchestration ตาม event
- audit trail เต็มระบบ

## Phase 3: Intelligence (3-6 เดือน)
- health scoring + trend analytics
- renewal risk model
- next-best-action recommendations
- monthly auto-summary generation

## Phase 4: Scale (6-12 เดือน)
- offline-first field app hardening
- performance/SLO hardening
- multi-branch operations standardization
- partner API/enterprise integration

---

## 7) Immediate Execution Plan (เริ่มพรุ่งนี้ได้เลย)

## Sprint 1
- สรุป event contract และ mapping table ของทุกหน้า
- ติด product analytics events ที่ critical paths
- ปรับ customer report ให้มี monthly snapshot + action block

## Sprint 2
- สร้าง admin exception inbox (งานเสี่ยง/เลย SLA)
- เพิ่ม quality score ของ work report
- สร้าง automated follow-up notification

## Sprint 3
- ต่อ recurring billing state กับ contract lifecycle
- เพิ่ม renewal pipeline dashboard
- เพิ่ม service playbooks ตามประเภทสวน

## Sprint 4
- เริ่ม health score v1
- เริ่ม recommendation engine v1
- readiness review ก่อน rollout ใหญ่

---

## 8) Definition of Done ระดับระบบ

- ทุก flow สำคัญมี owner, metric, alert, fallback
- ข้อมูลวิ่งข้ามโมดูลแบบไม่มี manual re-entry
- ลูกค้าเห็นผลลัพธ์ที่เข้าใจง่ายใน < 30 วินาที
- ทีมปฏิบัติการตรวจเจอความเสี่ยงก่อนลูกค้าร้องเรียน
- ผู้บริหารเห็น KPI ตั้งแต่ระดับองค์กรจนถึงรายทีม

const fs = require('fs');
const path = 'app/dashboard/admin/orders/create/page.tsx';
let content = fs.readFileSync(path, 'utf8');

const replacements = [
  { old: "'รอดำเนินการ'", new: "locale === 'en' ? 'Pending' : locale === 'zh' ? '待处理' : 'รอดำเนินการ'" },
  { old: "'ยืนยันแล้ว'", new: "locale === 'en' ? 'Confirmed' : locale === 'zh' ? '已确认' : 'ยืนยันแล้ว'" },
  { old: "'กำลังดำเนินการ'", new: "locale === 'en' ? 'In Progress' : locale === 'zh' ? '进行中' : 'กำลังดำเนินการ'" },
  { old: "'เสร็จสิ้น'", new: "locale === 'en' ? 'Completed' : locale === 'zh' ? '已完成' : 'เสร็จสิ้น'" },
  { old: "'ยกเลิก'", new: "locale === 'en' ? 'Cancelled' : locale === 'zh' ? '已取消' : 'ยกเลิก'" },
  { old: "'บริการ'", new: "locale === 'en' ? 'Service' : locale === 'zh' ? '服务' : 'บริการ'" },
  { old: ">สร้างออเดอร์แทนลูกค้า<", new: ">{locale === 'en' ? 'Create Order on Behalf of Customer' : locale === 'zh' ? '代客户创建订单' : 'สร้างออเดอร์แทนลูกค้า'}<" },
  { old: ">เลือกข้อมูลลูกค้า บ้าน บริการ และเงื่อนไขราคา จากนั้นสร้างออเดอร์ได้ทันที<", new: ">{locale === 'en' ? 'Select customer, property, service, and pricing terms to quickly create an order.' : locale === 'zh' ? '选择客户、房产、服务和定价条款，以快速创建订单。' : 'เลือกข้อมูลลูกค้า บ้าน บริการ และเงื่อนไขราคา จากนั้นสร้างออเดอร์ได้ทันที'}<" },
  { old: ">กลับหน้าคำสั่งงาน<", new: ">{locale === 'en' ? 'Back to Orders' : locale === 'zh' ? '返回订单列表' : 'กลับหน้าคำสั่งงาน'}<" },
  { old: ">1. ข้อมูลลูกค้าและสถานที่<", new: ">{locale === 'en' ? '1. Customer and Location' : locale === 'zh' ? '1. 客户和地点' : '1. ข้อมูลลูกค้าและสถานที่'}<" },
  { old: ">เลือกลูกค้า<", new: ">{locale === 'en' ? 'Select Customer' : locale === 'zh' ? '选择客户' : 'เลือกลูกค้า'}<" },
  { old: ">เลือกสถานที่/บ้าน<", new: ">{locale === 'en' ? 'Select Property' : locale === 'zh' ? '选择房产' : 'เลือกสถานที่/บ้าน'}<" },
  { old: ">2. ข้อมูลบริการและการตั้งราคา<", new: ">{locale === 'en' ? '2. Service and Pricing' : locale === 'zh' ? '2. 服务和定价' : '2. ข้อมูลบริการและการตั้งราคา'}<" },
  { old: ">เลือกบริการ<", new: ">{locale === 'en' ? 'Select Service' : locale === 'zh' ? '选择服务' : 'เลือกบริการ'}<" },
  { old: ">วันที่นัดหมาย<", new: ">{locale === 'en' ? 'Appointment Date' : locale === 'zh' ? '预约日期' : 'วันที่นัดหมาย'}<" },
  { old: ">สถานะเริ่มต้น<", new: ">{locale === 'en' ? 'Initial Status' : locale === 'zh' ? '初始状态' : 'สถานะเริ่มต้น'}<" },
  { old: ">3. รายละเอียดเพิ่มเติม<", new: ">{locale === 'en' ? '3. Additional Details' : locale === 'zh' ? '3. 附加详情' : '3. รายละเอียดเพิ่มเติม'}<" },
  { old: ">หมายเหตุภายใน<", new: ">{locale === 'en' ? 'Internal Notes' : locale === 'zh' ? '内部备注' : 'หมายเหตุภายใน'}<" },
  { old: ">คำแนะนำพิเศษ<", new: ">{locale === 'en' ? 'Special Instructions' : locale === 'zh' ? '特别指示' : 'คำแนะนำพิเศษ'}<" },
  { old: ">สร้างออเดอร์<", new: ">{locale === 'en' ? 'Create Order' : locale === 'zh' ? '创建订单' : 'สร้างออเดอร์'}<" },
  { old: "'กรุณากรอกข้อมูลลูกค้า สถานที่ และบริการ'", new: "locale === 'en' ? 'Please fill in customer, location, and service' : locale === 'zh' ? '请填写客户、地点和服务' : 'กรุณากรอกข้อมูลลูกค้า สถานที่ และบริการ'" }
];

for (const rep of replacements) {
  content = content.split(rep.old).join(rep.new);
}

if (!content.includes('const { locale } = useI18n()')) {
  content = content.replace('export default function AdminCreateOrder() {', 'export default function AdminCreateOrder() {\n  const { locale } = useI18n();');
  if (!content.includes("import { useI18n } from '@/lib/I18nContext'")) {
    content = "import { useI18n } from '@/lib/I18nContext';\n" + content;
  }
}

fs.writeFileSync(path, content);
console.log('Done orders create page replacements!');

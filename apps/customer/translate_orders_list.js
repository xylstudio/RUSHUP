const fs = require('fs');
const path = 'app/dashboard/admin/orders/page.tsx';
let content = fs.readFileSync(path, 'utf8');

const replacements = [
  { old: "'รอดำเนินการ'", new: "locale === 'en' ? 'Pending' : locale === 'zh' ? '待处理' : 'รอดำเนินการ'" },
  { old: "'ยืนยันแล้ว'", new: "locale === 'en' ? 'Confirmed' : locale === 'zh' ? '已确认' : 'ยืนยันแล้ว'" },
  { old: "'กำลังดำเนินการ'", new: "locale === 'en' ? 'In Progress' : locale === 'zh' ? '进行中' : 'กำลังดำเนินการ'" },
  { old: "'เสร็จสิ้น'", new: "locale === 'en' ? 'Completed' : locale === 'zh' ? '已完成' : 'เสร็จสิ้น'" },
  { old: "'ยกเลิก'", new: "locale === 'en' ? 'Cancelled' : locale === 'zh' ? '已取消' : 'ยกเลิก'" },
  { old: ">นัดต่อเนื่อง<", new: ">{locale === 'en' ? 'Follow-up' : locale === 'zh' ? '复访' : 'นัดต่อเนื่อง'}<" },
  { old: ">ต่อจาก ", new: ">{locale === 'en' ? 'From ' : locale === 'zh' ? '来源 ' : 'ต่อจาก '}" },
  { old: "'ลบออเดอร์นี้และข้อมูลทั้งหมดที่เกี่ยวข้อง (เช่น payment_intents, job_assignments) คุณแน่ใจหรือไม่?'", new: "locale === 'en' ? 'Delete this order and all related data? Are you sure?' : locale === 'zh' ? '删除此订单及所有相关数据？确定吗？' : 'ลบออเดอร์นี้และข้อมูลทั้งหมดที่เกี่ยวข้อง (เช่น payment_intents, job_assignments) คุณแน่ใจหรือไม่?'" },
  { old: "'ลบออเดอร์เรียบร้อยแล้ว'", new: "locale === 'en' ? 'Order deleted successfully.' : locale === 'zh' ? '订单已成功删除。' : 'ลบออเดอร์เรียบร้อยแล้ว'" },
  { old: "'เกิดข้อผิดพลาด: '", new: "locale === 'en' ? 'Error: ' : locale === 'zh' ? '错误：' : 'เกิดข้อผิดพลาด: '" },
  { old: "title=\"ลบ\"", new: "title={locale === 'en' ? 'Delete' : locale === 'zh' ? '删除' : 'ลบ'}" },
  { old: "'บริการ'", new: "locale === 'en' ? 'Service' : locale === 'zh' ? '服务' : 'บริการ'" },
  { old: ">ไม่มีงานดูแลต่อเนื่องในกลุ่มนี้<", new: ">{locale === 'en' ? 'No follow-up jobs' : locale === 'zh' ? '无复访任务' : 'ไม่มีงานดูแลต่อเนื่องในกลุ่มนี้'}<" }
];

for (const rep of replacements) {
  content = content.split(rep.old).join(rep.new);
}

if (!content.includes('const { locale } = useI18n()')) {
  content = content.replace('export default function AdminOrdersPage() {', 'export default function AdminOrdersPage() {\n  const { locale } = useI18n();');
  if (!content.includes("import { useI18n } from '@/lib/I18nContext'")) {
    content = "import { useI18n } from '@/lib/I18nContext';\n" + content;
  }
}

fs.writeFileSync(path, content);
console.log('Done orders page replacements!');

const fs = require('fs');
const path = 'app/dashboard/admin/job-assignment/page.tsx';
let content = fs.readFileSync(path, 'utf8');

const replacements = [
  { old: "'รอดำเนินการ'", new: "locale === 'en' ? 'Pending' : locale === 'zh' ? '待处理' : 'รอดำเนินการ'" },
  { old: "'ยืนยันแล้ว'", new: "locale === 'en' ? 'Confirmed' : locale === 'zh' ? '已确认' : 'ยืนยันแล้ว'" },
  { old: "'กำลังดำเนินการ'", new: "locale === 'en' ? 'In Progress' : locale === 'zh' ? '进行中' : 'กำลังดำเนินการ'" },
  { old: "'เสร็จสิ้น'", new: "locale === 'en' ? 'Completed' : locale === 'zh' ? '已完成' : 'เสร็จสิ้น'" },
  { old: "'ยกเลิก'", new: "locale === 'en' ? 'Cancelled' : locale === 'zh' ? '已取消' : 'ยกเลิก'" },
  { old: "'มอบหมายแล้ว'", new: "locale === 'en' ? 'Assigned' : locale === 'zh' ? '已分配' : 'มอบหมายแล้ว'" },
  { old: "'รับงานแล้ว'", new: "locale === 'en' ? 'Accepted' : locale === 'zh' ? '已接受' : 'รับงานแล้ว'" },
  { old: "'กำลังทำงาน'", new: "locale === 'en' ? 'Working' : locale === 'zh' ? '工作中' : 'กำลังทำงาน'" },
  { old: "'เสร็จแล้ว'", new: "locale === 'en' ? 'Done' : locale === 'zh' ? '已完成' : 'เสร็จแล้ว'" },
  { old: "'บริการ'", new: "locale === 'en' ? 'Service' : locale === 'zh' ? '服务' : 'บริการ'" },
  { old: "'มอบหมายงานแล้ว'", new: "locale === 'en' ? 'Assigned successfully' : locale === 'zh' ? '分配成功' : 'มอบหมายงานแล้ว'" },
  { old: "'คุณไม่มีสิทธิ์เข้าถึงหน้านี้'", new: "locale === 'en' ? 'Access Denied' : locale === 'zh' ? '无权访问' : 'คุณไม่มีสิทธิ์เข้าถึงหน้านี้'" },
  { old: ">มอบหมายงาน<", new: ">{locale === 'en' ? 'Assign Job' : locale === 'zh' ? '分配任务' : 'มอบหมายงาน'}<" },
  { old: ">รีเฟรช<", new: ">{locale === 'en' ? 'Refresh' : locale === 'zh' ? '刷新' : 'รีเฟรช'}<" },
  { old: "'กำลังโหลด...'", new: "locale === 'en' ? 'Loading...' : locale === 'zh' ? '加载中...' : 'กำลังโหลด...'" },
  { old: "'ไม่มีงานที่รอมอบหมาย'", new: "locale === 'en' ? 'No pending jobs' : locale === 'zh' ? '没有待分配任务' : 'ไม่มีงานที่รอมอบหมาย'" },
  { old: "'ยังไม่มีงานที่มอบหมายแล้ว'", new: "locale === 'en' ? 'No assigned jobs yet' : locale === 'zh' ? '尚无已分配任务' : 'ยังไม่มีงานที่มอบหมายแล้ว'" },
  { old: ">งานใหม่<", new: ">{locale === 'en' ? 'New Jobs' : locale === 'zh' ? '新任务' : 'งานใหม่'}<" },
  { old: ">งานดูแลต่อเนื่อง<", new: ">{locale === 'en' ? 'Follow-up Jobs' : locale === 'zh' ? '复访任务' : 'งานดูแลต่อเนื่อง'}<" },
  { old: ">เลือกพนักงาน<", new: ">{locale === 'en' ? 'Select Staff' : locale === 'zh' ? '选择员工' : 'เลือกพนักงาน'}<" },
  { old: ">หมายเหตุ (ไม่บังคับ)<", new: ">{locale === 'en' ? 'Notes (Optional)' : locale === 'zh' ? '备注（可选）' : 'หมายเหตุ (ไม่บังคับ)'}<" },
  { old: ">ยกเลิก<", new: ">{locale === 'en' ? 'Cancel' : locale === 'zh' ? '取消' : 'ยกเลิก'}<" }
];

for (const rep of replacements) {
  content = content.split(rep.old).join(rep.new);
}

if (!content.includes('const { locale } = useI18n()')) {
  content = content.replace('export default function AdminJobAssignment() {', 'export default function AdminJobAssignment() {\n  const { locale } = useI18n();');
  if (!content.includes("import { useI18n } from '@/lib/I18nContext'")) {
    content = "import { useI18n } from '@/lib/I18nContext';\n" + content;
  }
}

fs.writeFileSync(path, content);
console.log('Done job-assignment replacements!');

const fs = require('fs');
const path = 'app/dashboard/staff/page.tsx';
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
  { old: ">นัดต่อเนื่อง<", new: ">{locale === 'en' ? 'Follow-up' : locale === 'zh' ? '复访' : 'นัดต่อเนื่อง'}<" },
  { old: ">ต่อจาก ", new: ">{locale === 'en' ? 'From ' : locale === 'zh' ? '来源 ' : 'ต่อจาก '}" }
];

for (const rep of replacements) {
  content = content.split(rep.old).join(rep.new);
}

fs.writeFileSync(path, content);
console.log('Done staff page replacements!');

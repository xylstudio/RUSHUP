const fs = require('fs');

const files = [
  'components/pos/POSCustomerSelect.tsx',
  'components/pos/POSMenuManager.tsx',
  'components/pos/POSRecipeManager.tsx'
];

for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');
  
  // Replace the heavily corrupted strings with standard strings
  // We can just use a regex to match the button contents and replace them
  
  // POSCustomerSelect
  content = content.replace(/<UserPlus size=\{18\} \/> \{locale === 'en' \? ' ลงทะเบียนสมาชิกใหม่[\s\S]*?\}<\/button>/g, "<UserPlus size={18} /> {locale === 'en' ? 'Register new member' : locale === 'zh' ? '注册新会员' : 'ลงทะเบียนสมาชิกใหม่'}</button>");
  content = content.replace(/<Layers size=\{14\} \/> \{locale === 'en' \? ' จัดการฐานข้อมูลสมาชิกทั้งหมด[\s\S]*?\}<\/button>/g, "<Layers size={14} /> {locale === 'en' ? 'Manage all member databases' : locale === 'zh' ? '管理所有会员数据库' : 'จัดการฐานข้อมูลสมาชิกทั้งหมด'}</button>");
  content = content.replace(/\{locale === 'en' \? '                                     \{locale[\s\S]*?\}<\/button>/g, "{locale === 'en' ? 'Cancel' : locale === 'zh' ? '取消' : 'ยกเลิก'}</button>");
  
  // POSMenuManager
  content = content.replace(/<Settings size=\{12\} \/> \{locale === 'en' \? ' ปรับแต่งตาราง[\s\S]*?\}<\/button>/g, "<Settings size={12} /> {locale === 'en' ? 'Customize table' : locale === 'zh' ? '自定义表格' : 'ปรับแต่งตาราง'}</button>");

  // POSRecipeManager
  content = content.replace(/\{locale === 'en' \? '                   \{locale === 'en'[\s\S]*?food recipes menu[\s\S]*?\}<\/button>/g, "{locale === 'en' ? 'Menu Recipes' : locale === 'zh' ? '食物食谱菜单' : 'สูตรอาหารเมนู'}</button>");
  content = content.replace(/\{locale === 'en' \? '                   \{locale === 'en'[\s\S]*?Optional formula[\s\S]*?\}<\/button>/g, "{locale === 'en' ? 'Optional formula' : locale === 'zh' ? '可选配方' : 'สูตรตัวเลือกเสริม'}</button>");
  content = content.replace(/<FileText size=\{14\} \/> \{locale === 'en' \? ' ส่งออก CSV[\s\S]*?\}<\/button>/g, "<FileText size={14} /> {locale === 'en' ? 'Export CSV' : locale === 'zh' ? '导出 CSV' : 'ส่งออก CSV'}</button>");

  fs.writeFileSync(file, content, 'utf8');
  console.log('Fixed', file);
}

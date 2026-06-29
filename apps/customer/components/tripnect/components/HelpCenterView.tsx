import { Search, MessageCircle, Mail, Phone, ChevronRight, HelpCircle } from 'lucide-react';
import { useState } from 'react';

export function HelpCenterView() {
  const [searchQuery, setSearchQuery] = useState('');

  const quickLinks = [
    { icon: MessageCircle, label: 'แชทสด', desc: 'ตอบกลับทันที', color: 'bg-blue-500' },
    { icon: Mail, label: 'อีเมล', desc: 'ภายใน 24 ชม.', color: 'bg-orange-500' },
    { icon: Phone, label: 'โทรศัพท์', desc: '02-123-4567', color: 'bg-green-500' }
  ];

  const faqCategories = [
    {
      title: 'การเริ่มต้นใช้งาน',
      questions: [
        'จะสร้างบัญชีได้อย่างไร?',
        'วิธีวางแผนทริปแรก',
        'การเชื่อมต่อกับเพื่อน'
      ]
    },
    {
      title: 'การจองและชำระเงิน',
      questions: [
        'วิธีจองที่พัก',
        'นโยบายการยกเลิก',
        'วิธีการชำระเงิน'
      ]
    },
    {
      title: 'Tripnect Plus',
      questions: [
        'ประโยชน์ของ Plus',
        'วิธีสมัครและยกเลิก',
        'ราคาและแผนต่างๆ'
      ]
    }
  ];

  return (
    <div className="min-h-screen bg-white pb-20">
      {/* Header */}
      <div className="bg-gradient-to-br from-orange-400 to-orange-500 px-4 py-8 text-white">
        <h1 className="text-2xl font-bold mb-4">ช่วยเหลือ</h1>
        
        {/* Search */}
        <div className="relative">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="ค้นหาคำถาม..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-white rounded-xl text-slate-900 placeholder:text-slate-400 text-sm"
          />
        </div>
      </div>

      {/* Quick Contact */}
      <div className="px-4 -mt-4 mb-6">
        <div className="bg-white rounded-xl shadow-lg p-4">
          <h2 className="text-sm font-semibold mb-3">ติดต่อเรา</h2>
          <div className="grid grid-cols-3 gap-2">
            {quickLinks.map((link, idx) => (
              <button
                key={idx}
                className="flex flex-col items-center gap-2 p-3 bg-slate-50 rounded-lg active:bg-slate-100"
              >
                <div className={`w-10 h-10 ${link.color} rounded-full flex items-center justify-center`}>
                  <link.icon size={20} className="text-white" strokeWidth={1.5} />
                </div>
                <div className="text-center">
                  <div className="text-xs font-semibold">{link.label}</div>
                  <div className="text-[10px] text-slate-500">{link.desc}</div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* FAQ */}
      <div className="px-4 space-y-4">
        <h2 className="text-sm font-semibold">คำถามที่พบบ่อย</h2>
        
        {faqCategories.map((category, catIdx) => (
          <div key={catIdx} className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            <div className="px-4 py-3 bg-slate-50 border-b border-slate-200">
              <h3 className="text-sm font-semibold">{category.title}</h3>
            </div>
            <div className="divide-y divide-slate-200">
              {category.questions.map((question, qIdx) => (
                <button
                  key={qIdx}
                  className="w-full px-4 py-3 flex items-center justify-between gap-3 text-left active:bg-slate-50"
                >
                  <span className="text-sm text-slate-700">{question}</span>
                  <ChevronRight size={16} className="text-slate-400 flex-shrink-0" />
                </button>
              ))}
            </div>
          </div>
        ))}

        {/* Still Need Help */}
        <div className="bg-slate-50 rounded-xl p-6 text-center border border-slate-200">
          <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <HelpCircle size={24} className="text-orange-500" />
          </div>
          <h3 className="font-semibold mb-1">ยังต้องการความช่วยเหลือ?</h3>
          <p className="text-sm text-slate-600 mb-4">ทีมเราพร้อมช่วยเหลือคุณ</p>
          <button className="px-6 py-2.5 bg-slate-900 text-white text-sm font-semibold rounded-lg">
            ติดต่อฝ่ายสนับสนุน
          </button>
        </div>
      </div>
    </div>
  );
}

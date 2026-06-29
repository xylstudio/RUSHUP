import { Crown, Check, Sparkles, Zap, Shield, Globe, Star, TrendingUp, X } from 'lucide-react';
import { useState } from 'react';

export function RUSHUPPlusView() {
  const [selectedPlan, setSelectedPlan] = useState<'monthly' | 'yearly'>('yearly');

  const features = [
    { icon: Crown, title: 'ไม่มีโฆษณา', desc: 'ใช้งานแบบไม่มีสิ่งรบกวน' },
    { icon: Zap, title: 'AI Trip Planner', desc: 'วางแผนทริปอัจฉริยะ' },
    { icon: Shield, title: 'ประกันการเดินทาง', desc: 'คุ้มครองทุกทริป' },
    { icon: Globe, title: 'Passport ไม่จำกัด', desc: 'บันทึกทริปได้ไม่อั้น' },
    { icon: Star, title: 'ส่วนลด 25%', desc: 'จากพาร์ทเนอร์ทั้งหมด' },
    { icon: TrendingUp, title: 'สถิติการเดินทาง', desc: 'วิเคราะห์ข้อมูลของคุณ' }
  ];

  const plans = {
    monthly: { price: 199, original: 299, period: '/เดือน' },
    yearly: { price: 1990, original: 3588, period: '/ปี', save: '฿1,598' }
  };

  return (
    <div className="min-h-screen bg-white pb-20">
      {/* Hero */}
      <div className="bg-gradient-to-br from-orange-400 to-orange-500 px-6 py-12 text-white text-center">
        <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-3xl mx-auto mb-4 flex items-center justify-center">
          <Crown size={32} strokeWidth={1.5} />
        </div>
        <h1 className="text-2xl font-bold mb-2">RUSHUP Plus</h1>
        <p className="text-white/90 text-sm">ปลดล็อกประสบการณ์เต็มรูปแบบ</p>
      </div>

      {/* Plan Selector */}
      <div className="px-4 -mt-8 mb-6">
        <div className="bg-white rounded-2xl shadow-xl p-5">
          {/* Toggle */}
          <div className="flex gap-2 mb-5">
            <button
              onClick={() => setSelectedPlan('monthly')}
              className={`flex-1 py-3 rounded-xl text-sm font-semibold transition-all ${
                selectedPlan === 'monthly'
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-600'
              }`}
            >
              รายเดือน
            </button>
            <button
              onClick={() => setSelectedPlan('yearly')}
              className={`flex-1 py-3 rounded-xl text-sm font-semibold transition-all relative ${
                selectedPlan === 'yearly'
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-600'
              }`}
            >
              รายปี
              <span className="absolute -top-2 -right-2 bg-orange-500 text-white text-[10px] px-2 py-0.5 rounded-full font-bold">
                ประหยัด 45%
              </span>
            </button>
          </div>

          {/* Price */}
          <div className="text-center mb-5">
            <div className="flex items-center justify-center gap-2 mb-1">
              <span className="text-slate-400 line-through">฿{plans[selectedPlan].original}</span>
              {selectedPlan === 'yearly' && (
                <span className="text-xs bg-orange-100 text-orange-600 px-2 py-0.5 rounded-full font-semibold">
                  ประหยัด {plans.yearly.save}
                </span>
              )}
            </div>
            <div>
              <span className="text-4xl font-bold">฿{plans[selectedPlan].price}</span>
              <span className="text-slate-500 text-lg">{plans[selectedPlan].period}</span>
            </div>
            {selectedPlan === 'yearly' && (
              <p className="text-xs text-slate-500 mt-1">เพียงเดือนละ ฿165.83</p>
            )}
          </div>

          {/* CTA */}
          <button className="w-full py-4 bg-gradient-to-r from-orange-500 to-orange-400 text-white font-bold rounded-xl mb-3">
            ทดลองใช้ฟรี 7 วัน
          </button>
          <p className="text-center text-xs text-slate-500">
            ยกเลิกได้ทุกเมื่อ • ไม่มีค่าใช้จ่ายระหว่างทดลอง
          </p>
        </div>
      </div>

      {/* Features */}
      <div className="px-4">
        <h2 className="font-bold text-lg mb-4">ฟีเจอร์ทั้งหมด</h2>
        <div className="space-y-3">
          {features.map((feature, idx) => (
            <div key={idx} className="flex items-start gap-3 p-4 bg-slate-50 rounded-xl">
              <div className="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center flex-shrink-0">
                <feature.icon size={20} className="text-orange-600" strokeWidth={1.5} />
              </div>
              <div className="flex-1 pt-1">
                <h3 className="font-semibold text-sm mb-0.5">{feature.title}</h3>
                <p className="text-xs text-slate-600">{feature.desc}</p>
              </div>
              <Check size={18} className="text-orange-500 mt-2" strokeWidth={2.5} />
            </div>
          ))}
        </div>

        {/* Testimonial */}
        <div className="mt-6 p-5 bg-slate-50 rounded-xl">
          <div className="flex gap-0.5 mb-2">
            {[...Array(5)].map((_, i) => (
              <Star key={i} size={14} className="text-orange-400 fill-orange-400" />
            ))}
          </div>
          <p className="text-sm text-slate-700 mb-2">
            "Plus ช่วยให้การวางแผนทริปง่ายขึ้นมาก คุ้มค่าทุกบาทเลย!"
          </p>
          <p className="text-xs text-slate-500">— สมชาย ผ., ผู้ใช้งาน Plus</p>
        </div>
      </div>
    </div>
  );
}

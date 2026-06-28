'use client';
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  ChevronLeft, 
  Star, 
  History, 
  Gift, 
  TrendingUp, 
  Award,
  ChevronRight,
  User,
  Clock,
  QrCode,
  CheckCircle2,
  XCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { createClient } from '@/utils/supabase/client';
import { useLiff } from '@/components/liff/LiffProvider';
import XYLLoader from '@/components/loaders/XYLLoader';
import { useI18n } from "@/lib/I18nContext";

export default function LiffMemberPage() {
    const { locale } = useI18n();
  const router = useRouter();
  const supabase = createClient();
  const { lineProfile, loading: liffLoading, hasSeenLoader } = useLiff();
  
  const [memberInfo, setMemberInfo] = useState<any>(null);
  const [pointsHistory, setPointsHistory] = useState<any[]>([]);
  const [rewards, setRewards] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'history' | 'rewards'>('rewards');
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    const userId = lineProfile?.userId || localStorage.getItem('xylem_line_user_id');
    if (!userId) return;

    try {
      setLoading(true);
      
      // 1. Fetch Member Info
      const { data: member } = await supabase
        .from('pos_members')
        .select('*')
        .eq('line_user_id', userId)
        .maybeSingle();
      
      if (member) setMemberInfo(member);

      // 2. Fetch Points History
      const { data: history } = await supabase
        .from('pos_points_history')
        .select('*')
        .eq('member_id', userId)
        .order('created_at', { ascending: false });
      
      if (history) setPointsHistory(history);

      // 3. Fetch Rewards
      const { data: rewardsData } = await supabase
        .from('pos_rewards')
        .select('*')
        .eq('is_active', true)
        .order('points_required', { ascending: true });
      
      if (rewardsData) setRewards(rewardsData);

    } catch (err) {
      console.error('Error fetching member data:', err);
    } finally {
      setLoading(false);
    }
  };
  
  useEffect(() => {
    if (!liffLoading) fetchData();
  }, [lineProfile, liffLoading]);

  if (liffLoading && !hasSeenLoader) return <XYLLoader tagline={locale === 'en' ? 'กำลังตรวจสอบสิทธิประโยชน์ของคุณ...' : locale === 'zh' ? 'กำลังตรวจสอบสิทธิประโยชน์ของคุณ...' : 'กำลังตรวจสอบสิทธิประโยชน์ของคุณ...'} />;

  return (
    <div className="min-h-screen bg-[#fcfcf9] pb-24">
      {/* 🏛️ Boutique Header */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-100 flex items-center px-4 py-4">
        <button onClick={() => router.back()} className="p-2 -ml-2 text-gray-400">
          <ChevronLeft size={24} />
        </button>
        <div className="ml-2">
          <h1 className="text-sm font-black uppercase tracking-[0.2em] text-[#1A1A18]">{locale === 'en' ? 'คะแนนสะสม' : locale === 'zh' ? 'คะแนนสะสม' : 'คะแนนสะสม'}</h1>
        </div>
      </header>

      <main className="px-6 py-8 space-y-10">
        
        {/* 🎫 Profile Card (Neumorphic) */}
        <section className="relative">
          <div className="bg-white border border-gray-100 p-8 shadow-sm relative overflow-hidden">
            <div className="absolute top-0 right-0 p-10 opacity-[0.03] -rotate-12 translate-x-1/4 -translate-y-1/4">
               <Award size={180} />
            </div>
            
            <div className="flex items-center gap-6 mb-10">
              <div className="w-16 h-16 bg-gray-50 border-2 border-white shadow-md overflow-hidden flex-shrink-0">
                {lineProfile?.pictureUrl ? (
                  <img src={lineProfile.pictureUrl} alt={lineProfile.displayName} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-300">
                    <User size={32} />
                  </div>
                )}
              </div>
              <div>
                <h2 className="text-lg font-black uppercase tracking-tighter text-black leading-none mb-2">
                  {lineProfile?.displayName || 'XYL Member'}
                </h2>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 bg-[#1A1A18] text-white text-[7px] font-black uppercase tracking-[0.2em]">
                    {memberInfo?.tier || 'Bronze'} Tier
                  </span>
                  <span className="text-[8px] font-bold text-gray-300 uppercase tracking-widest leading-none">XYL Studio Identity</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-10 border-t border-gray-50">
               <div>
                 <p className="text-[8px] font-black uppercase text-gray-400 tracking-widest mb-1">Available Points</p>
                 <div className="flex items-baseline gap-2">
                   <span className="text-4xl font-black tracking-tighter text-emerald-600">{memberInfo?.points || 0}</span>
                   <span className="text-[8px] font-black uppercase text-emerald-600/50">PTS</span>
                 </div>
               </div>
               <div className="flex flex-col justify-end items-end text-right">
                  <p className="text-[8px] font-black uppercase text-gray-400 tracking-widest mb-1">{locale === 'en' ? 'สะสมทั้งหมด' : locale === 'zh' ? 'สะสมทั้งหมด' : 'สะสมทั้งหมด'}</p>
                  <p className="text-xs font-black text-black uppercase tracking-tighter">
                    {memberInfo?.total_spent?.toLocaleString() || 0} THB
                  </p>
               </div>
            </div>
          </div>
        </section>

        {/* 🔄 Tabs Section */}
        <section className="space-y-8">
           <div className="flex border-b border-gray-100">
              <button 
                onClick={() => setActiveTab('rewards')}
                className={`flex-1 py-4 text-[10px] font-black uppercase tracking-[0.2em] transition-all relative ${activeTab === 'rewards' ? 'text-black' : 'text-gray-300'}`}
              >
                Available Rewards
                {activeTab === 'rewards' && <motion.div layoutId="tab-active" className="absolute bottom-0 left-0 right-0 h-0.5 bg-black" />}
              </button>
              <button 
                onClick={() => setActiveTab('history')}
                className={`flex-1 py-4 text-[10px] font-black uppercase tracking-[0.2em] transition-all relative ${activeTab === 'history' ? 'text-black' : 'text-gray-300'}`}
              >
                Points History
                {activeTab === 'history' && <motion.div layoutId="tab-active" className="absolute bottom-0 left-0 right-0 h-0.5 bg-black" />}
              </button>
           </div>

           <AnimatePresence mode="wait">
             {activeTab === 'rewards' ? (
               <motion.div 
                 key="rewards"
                 initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                 className="grid grid-cols-1 gap-4"
               >
                 {rewards.length > 0 ? rewards.map((reward) => (
                   <div key={reward.id} className="bg-white border border-gray-100 p-5 flex gap-5 items-center group">
                      <div className="w-16 h-16 bg-gray-50 flex-shrink-0 flex items-center justify-center p-2">
                        {reward.image_url ? (
                          <img src={reward.image_url} alt={reward.title} className="w-full h-full object-contain" />
                        ) : (
                          <Gift size={24} className="text-gray-200" />
                        )}
                      </div>
                      <div className="flex-1">
                        <h4 className="text-[11px] font-black text-black uppercase tracking-tight">{reward.title}</h4>
                        <p className="text-[9px] font-bold text-gray-400 mt-0.5 line-clamp-1">{reward.description}</p>
                        <div className="flex items-center gap-1.5 mt-2">
                           <Star size={10} fill="#10b981" stroke="none" />
                           <span className="text-[10px] font-black text-emerald-600">{reward.points_required} PTS</span>
                        </div>
                      </div>
                      <button 
                         disabled={(memberInfo?.points || 0) < reward.points_required}
                        className={`px-4 py-2 text-[8px] font-black uppercase tracking-widest transition-all ${
                          (memberInfo?.points || 0) >= reward.points_required 
                          ? 'bg-black text-white active:scale-95' 
                          : 'bg-gray-100 text-gray-300 cursor-not-allowed'
                        }`}
                      >
                        Redeem
                      </button>
                   </div>
                 )) : (
                   <div className="py-20 text-center opacity-30">
                      <Gift className="mx-auto mb-4" size={32} />
                      <p className="text-[10px] font-black uppercase tracking-widest">No rewards available yet</p>
                   </div>
                 )}
               </motion.div>
             ) : (
               <motion.div 
                 key="history"
                 initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                 className="space-y-4"
               >
                 {pointsHistory.length > 0 ? pointsHistory.map((item) => (
                   <div key={item.id} className="bg-white border border-gray-50 p-5 flex justify-between items-center">
                     <div className="flex gap-4 items-center">
                        <div className={`w-10 h-10 flex items-center justify-center ${item.type === 'earn' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
                           {item.type === 'earn' ? <TrendingUp size={16} /> : <Gift size={16} />}
                        </div>
                        <div>
                          <h4 className="text-[10px] font-black uppercase tracking-tight text-gray-900">
                             {item.description || (item.type === 'earn' ? 'Earned Points' : 'Redeemed Reward')}
                          </h4>
                          <p className="text-[8px] font-bold text-gray-400 mt-1 uppercase flex items-center gap-1">
                             <Clock size={8} /> {new Date(item.created_at).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' })}
                          </p>
                        </div>
                     </div>
                     <span className={`text-xs font-black ${item.type === 'earn' ? 'text-emerald-600' : 'text-amber-600'}`}>
                        {item.type === 'earn' ? '+' : '-'}{item.points}
                     </span>
                   </div>
                 )) : (
                   <div className="py-20 text-center opacity-30">
                      <History className="mx-auto mb-4" size={32} />
                      <p className="text-[10px] font-black uppercase tracking-widest">No points history found</p>
                   </div>
                 )}
               </motion.div>
             )}
           </AnimatePresence>
        </section>
      </main>

      {/* 🧭 Tier Progress Footnote */}
      <footer className="px-8 py-12 text-center">
         <div className="inline-flex items-center gap-3 bg-emerald-50/50 px-6 py-3 rounded-none border border-emerald-100/50">
            <Award size={12} className="text-emerald-500" />
            <p className="text-[9px] font-bold text-emerald-700 uppercase tracking-tight">
               {locale === 'en' ? '                สั่งเพิ่มอีก ' : locale === 'zh' ? '                สั่งเพิ่มอีก ' : '                สั่งเพิ่มอีก '}<span className="font-black">{locale === 'en' ? '฿1,200' : locale === 'zh' ? '฿1,200' : '฿1,200'}</span> {locale === 'en' ? ' เพื่อเลื่อนระดับเป็น ' : locale === 'zh' ? ' เพื่อเลื่อนระดับเป็น ' : ' เพื่อเลื่อนระดับเป็น '}<span className="font-black">Silver Tier</span>
            </p>
         </div>
         <p className="mt-12 text-[7px] font-black uppercase tracking-[0.4em] text-gray-300">XYL STUDIO LOYALTY PROGRAM</p>
      </footer>
    </div>
  );
}

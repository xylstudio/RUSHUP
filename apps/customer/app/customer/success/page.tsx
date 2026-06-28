'use client';
import React, { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { CheckCircle, ArrowRight, ShoppingBag, Clock, MapPin } from 'lucide-react';
import Link from 'next/link';
import XYLLoader from '@/components/loaders/XYLLoader';
import { useI18n } from "@/lib/I18nContext";

function SuccessContent() {
    const { locale } = useI18n();
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('session_id');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 1500);
    return () => clearTimeout(timer);
  }, []);

  if (loading) return <XYLLoader tagline={locale === 'en' ? 'กำลังยืนยันคำสั่งซื้อ...' : locale === 'zh' ? 'กำลังยืนยันคำสั่งซื้อ...' : 'กำลังยืนยันคำสั่งซื้อ...'} />;

  return (
    <div className="min-h-screen bg-[#fcfcf9] text-[#1A1A18] font-sans p-6 sm:p-12 flex flex-col items-center justify-center text-center space-y-12">
      <div className="space-y-4">
        <div className="w-24 h-24 bg-[#1A1A18] text-white rounded-full flex items-center justify-center mx-auto shadow-2xl animate-in zoom-in duration-500">
          <CheckCircle size={48} />
        </div>
        <h1 className="text-4xl font-serif-luxury tracking-tighter leading-none border-none">PAYMENT SUCCESS</h1>
        <p className="text-[10px] font-black uppercase tracking-[0.4em] text-gray-400">Order confirmed & paid via Stripe</p>
      </div>

      <div className="w-full max-w-md bg-white border border-gray-50 p-10 space-y-8 shadow-sm">
        <div className="flex justify-between items-center text-left">
          <div className="space-y-1">
            <span className="text-[10px] font-black uppercase tracking-widest text-gray-300">Estimated Time</span>
            <div className="flex items-center gap-2 text-sm font-black">
              <Clock size={16} /> 20-35 MINS
            </div>
          </div>
          <div className="text-right space-y-1">
            <span className="text-[10px] font-black uppercase tracking-widest text-gray-300">Queue Status</span>
            <div className="text-sm font-black text-green-500">PREPARING</div>
          </div>
        </div>

        <div className="h-[1px] bg-gray-50"></div>

        <div className="space-y-4 text-left">
             <div className="flex items-center gap-3">
                <ShoppingBag size={18} className="text-[#1A1A18]" />
                <span className="text-[11px] font-black uppercase tracking-widest">Receive Receipt via LINE</span>
             </div>
             <p className="text-[13px] font-bold text-gray-400 leading-relaxed">
                {locale === 'en' ? '                 ระบบได้ส่งรายละเอียดออเดอร์และใบเสร็จรับเงินให้คุณผ่านทาง LINE เรียบร้อยแล้วครับ พนักงานของเรากำลังเร่งจัดเตรียมอาหารให้คุณอย่างเร็วที่สุด              ' : locale === 'zh' ? '                 ระบบได้ส่งรายละเอียดออเดอร์และใบเสร็จรับเงินให้คุณผ่านทาง LINE เรียบร้อยแล้วครับ พนักงานของเรากำลังเร่งจัดเตรียมอาหารให้คุณอย่างเร็วที่สุด              ' : '                 ระบบได้ส่งรายละเอียดออเดอร์และใบเสร็จรับเงินให้คุณผ่านทาง LINE เรียบร้อยแล้วครับ พนักงานของเรากำลังเร่งจัดเตรียมอาหารให้คุณอย่างเร็วที่สุด              '}</p>
        </div>
      </div>

      <div className="space-y-6 w-full max-w-md">
        <Link 
            href="/liff/menu"
            className="w-full h-16 bg-[#1A1A18] text-white flex items-center justify-center gap-4 hover:bg-black transition-all group"
        >
            <span className="text-[12px] font-black uppercase tracking-[0.4em]">ORDER MORE</span>
            <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
        </Link>
        <p className="text-[8px] text-gray-300 uppercase tracking-widest">Thank you for choosing Xylem Landscape POS</p>
      </div>
    </div>
  );
}

export default function LiffSuccessPage() {
  return (
    <Suspense fallback={
        <div className="min-h-screen bg-[#fcfcf9] flex flex-col items-center justify-center p-6 text-center space-y-6">
            <div className="w-8 h-8 border-4 border-gray-100 border-t-[#1A1A18] rounded-none animate-spin"></div>
        </div>
    }>
        <SuccessContent />
    </Suspense>
  );
}

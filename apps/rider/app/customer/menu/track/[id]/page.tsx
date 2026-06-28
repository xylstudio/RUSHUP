'use client';
import { useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useI18n } from "@/lib/I18nContext";

export default function DirectTrackRedirect() {
    const { locale } = useI18n();
  const router = useRouter();
  const params = useParams();
  const id = params?.id;

  useEffect(() => {
    if (id) {
      // 🚀 Instant internal redirect to the real tracking endpoint
      router.replace(`/liff/track/${id}`);
    } else {
      router.replace('/liff/menu');
    }
  }, [id, router]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-white">
      <div className="w-8 h-8 border-4 border-emerald-100 border-t-emerald-600 rounded-none animate-spin mb-4" />
      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">{locale === 'en' ? 'Logging in to track orders...' : locale === 'zh' ? '正在登录以跟踪订单...' : 'กำลังเข้าสู่ระบบติดตามออเดอร์...'}</p>
    </div>
  );
}

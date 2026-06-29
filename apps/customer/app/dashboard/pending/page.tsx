'use client';
import { useAuth } from '../../../lib/AuthContext';
import { CheckBadgeIcon, ClockIcon } from '@heroicons/react/24/outline';
import Link from 'next/link';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useRouter } from 'next/navigation';

export default function PendingApprovalPage() {
  const { profile } = useAuth();
  const supabase = createClientComponentClient();
  const router = useRouter();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  return (
    <div className="min-h-screen bg-stone-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-[32px] p-8 shadow-xl text-center">
        <div className="w-20 h-20 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <ClockIcon className="h-10 w-10 text-orange-500" />
        </div>
        
        <h1 className="text-2xl font-bold text-stone-900 mb-2">บัญชีของคุณอยู่ระหว่างการตรวจสอบ</h1>
        <p className="text-stone-500 mb-8">
          สวัสดีคุณ {profile?.display_name}! ทีมงานกำลังตรวจสอบข้อมูลการสมัครเป็น {profile?.role === 'staff' ? 'ไรเดอร์' : 'ร้านค้า'} ของคุณ กรุณารอการอนุมัติภายใน 1-2 วันทำการ
        </p>
        
        <div className="space-y-4">
          <Link 
            href="/dashboard/customer" 
            className="block w-full py-4 px-6 bg-stone-100 text-stone-700 font-bold rounded-2xl hover:bg-stone-200 transition-colors"
          >
            กลับสู่หน้าผู้ใช้งานทั่วไป
          </Link>
          
          <button 
            onClick={handleLogout}
            className="block w-full py-4 px-6 bg-transparent text-red-500 font-bold rounded-2xl border border-red-100 hover:bg-red-50 transition-colors"
          >
            ออกจากระบบ
          </button>
        </div>
      </div>
    </div>
  );
}

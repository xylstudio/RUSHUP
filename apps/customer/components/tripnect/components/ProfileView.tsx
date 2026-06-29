'use client';
import { Settings, ChevronRight, MapPin, CreditCard, ShoppingBag, Store, Bike, LogOut, Shield, HelpCircle, Moon, Sun, User } from 'lucide-react';
import { CURRENT_USER } from '../data';
import { useState } from 'react';
import { motion } from 'framer-motion';
import { useTheme } from '../contexts/ThemeContext';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

export function ProfileView() {
  const { theme, toggleTheme } = useTheme();
  const supabase = createClientComponentClient();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  
  const viewingUser = CURRENT_USER;

  const handleLogout = async () => {
    setIsLoggingOut(true);
    await supabase.auth.signOut();
    window.location.href = '/login';
  };

  const handleNavigation = (path: string) => {
    window.location.href = path;
  };

  if (!viewingUser) {
    return <div className="min-h-screen bg-white dark:bg-stone-950 flex items-center justify-center">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-stone-50 dark:bg-stone-950 pb-24 transition-colors">
      {/* Header Profile Section */}
      <div className="bg-white dark:bg-stone-900 px-5 pt-8 pb-8 rounded-b-[32px] shadow-sm border-b border-stone-100 dark:border-stone-800 transition-colors relative">
        <div className="absolute top-6 right-6 flex items-center gap-3">
          {/* Dark Mode Toggle */}
          <motion.button 
            onClick={toggleTheme}
            whileTap={{ scale: 0.9 }}
            className="w-10 h-10 rounded-full bg-stone-50 dark:bg-stone-800 flex items-center justify-center hover:bg-stone-100 dark:hover:bg-stone-700 transition-colors shadow-sm"
          >
            {theme === 'dark' ? (
              <Sun size={20} className="text-orange-500" strokeWidth={2.5} />
            ) : (
              <Moon size={20} className="text-stone-600" strokeWidth={2.5} />
            )}
          </motion.button>
        </div>

        <div className="flex flex-col items-center mt-4">
          <div className="relative mb-4">
            <div className="w-24 h-24 rounded-full overflow-hidden bg-stone-100 dark:bg-stone-800 border-4 border-white dark:border-stone-800 shadow-md">
              <img 
                src={viewingUser.avatarUrl} 
                alt={viewingUser.fullName}
                className="w-full h-full object-cover"
              />
            </div>
            <div className="absolute bottom-0 right-0 bg-green-500 w-5 h-5 rounded-full border-2 border-white dark:border-stone-900"></div>
          </div>
          
          <h2 className="text-[22px] font-black text-stone-900 dark:text-stone-100 mb-1">{viewingUser.fullName}</h2>
          <p className="text-[14px] text-stone-500 dark:text-stone-400 font-medium">@{viewingUser.username}</p>
          
          <div className="mt-4 inline-flex items-center gap-1.5 px-4 py-1.5 bg-orange-50 dark:bg-orange-500/10 text-orange-600 dark:text-orange-400 rounded-full text-[13px] font-semibold border border-orange-100 dark:border-orange-500/20">
            <User size={14} strokeWidth={2.5} />
            สมาชิกระดับทั่วไป
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="px-5 py-6 space-y-6">
        
        {/* Quick Actions */}
        <div className="grid grid-cols-3 gap-3">
          <button onClick={() => handleNavigation('/dashboard/customer/orders')} className="bg-white dark:bg-stone-900 p-4 rounded-[20px] flex flex-col items-center justify-center gap-2 shadow-sm border border-stone-100 dark:border-stone-800 hover:border-orange-500 transition-all group">
            <div className="w-12 h-12 rounded-full bg-orange-50 dark:bg-orange-500/10 flex items-center justify-center group-hover:scale-110 transition-transform">
              <ShoppingBag size={22} className="text-orange-500" strokeWidth={2} />
            </div>
            <span className="text-[13px] font-semibold text-stone-700 dark:text-stone-300">ออเดอร์ของฉัน</span>
          </button>
          
          <button onClick={() => handleNavigation('/dashboard/customer/wallet')} className="bg-white dark:bg-stone-900 p-4 rounded-[20px] flex flex-col items-center justify-center gap-2 shadow-sm border border-stone-100 dark:border-stone-800 hover:border-orange-500 transition-all group">
            <div className="w-12 h-12 rounded-full bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center group-hover:scale-110 transition-transform">
              <CreditCard size={22} className="text-blue-500" strokeWidth={2} />
            </div>
            <span className="text-[13px] font-semibold text-stone-700 dark:text-stone-300">การชำระเงิน</span>
          </button>

          <button onClick={() => handleNavigation('/dashboard/customer/profile')} className="bg-white dark:bg-stone-900 p-4 rounded-[20px] flex flex-col items-center justify-center gap-2 shadow-sm border border-stone-100 dark:border-stone-800 hover:border-orange-500 transition-all group">
            <div className="w-12 h-12 rounded-full bg-purple-50 dark:bg-purple-500/10 flex items-center justify-center group-hover:scale-110 transition-transform">
              <MapPin size={22} className="text-purple-500" strokeWidth={2} />
            </div>
            <span className="text-[13px] font-semibold text-stone-700 dark:text-stone-300">ที่อยู่จัดส่ง</span>
          </button>
        </div>

        {/* Partnership Section (Crucial for Platform) */}
        <div>
          <h3 className="text-[15px] font-bold text-stone-900 dark:text-stone-100 mb-3 ml-2">ร่วมเป็นพาร์ทเนอร์กับเรา</h3>
          <div className="bg-white dark:bg-stone-900 rounded-[24px] overflow-hidden shadow-sm border border-stone-100 dark:border-stone-800">
            <button onClick={() => handleNavigation('/dashboard/merchant/orders')} className="w-full flex items-center p-5 hover:bg-stone-50 dark:hover:bg-stone-800/50 transition-colors border-b border-stone-100 dark:border-stone-800 group">
              <div className="w-10 h-10 rounded-full bg-orange-100 dark:bg-orange-500/20 flex items-center justify-center mr-4">
                <Store size={20} className="text-orange-600 dark:text-orange-400" strokeWidth={2} />
              </div>
              <div className="flex-1 text-left">
                <div className="text-[16px] font-bold text-stone-900 dark:text-stone-100">ระบบร้านค้า (Merchant)</div>
                <div className="text-[13px] text-stone-500 dark:text-stone-400 mt-0.5">จัดการร้านค้าและรับออเดอร์</div>
              </div>
              <ChevronRight size={20} className="text-stone-300 group-hover:text-orange-500 transition-colors" />
            </button>

            <button onClick={() => handleNavigation('/dashboard/staff')} className="w-full flex items-center p-5 hover:bg-stone-50 dark:hover:bg-stone-800/50 transition-colors group">
              <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-500/20 flex items-center justify-center mr-4">
                <Bike size={20} className="text-green-600 dark:text-green-400" strokeWidth={2} />
              </div>
              <div className="flex-1 text-left">
                <div className="text-[16px] font-bold text-stone-900 dark:text-stone-100">ระบบไรเดอร์ (Rider)</div>
                <div className="text-[13px] text-stone-500 dark:text-stone-400 mt-0.5">รับงานส่งอาหาร สร้างรายได้</div>
              </div>
              <ChevronRight size={20} className="text-stone-300 group-hover:text-green-500 transition-colors" />
            </button>
          </div>
        </div>

        {/* General Settings */}
        <div>
          <h3 className="text-[15px] font-bold text-stone-900 dark:text-stone-100 mb-3 ml-2">ตั้งค่าและสนับสนุน</h3>
          <div className="bg-white dark:bg-stone-900 rounded-[24px] overflow-hidden shadow-sm border border-stone-100 dark:border-stone-800">
            <button onClick={() => handleNavigation('/dashboard/customer/profile')} className="w-full flex items-center p-5 hover:bg-stone-50 dark:hover:bg-stone-800/50 transition-colors border-b border-stone-100 dark:border-stone-800 group">
              <Settings size={22} className="text-stone-400 mr-4" strokeWidth={2} />
              <div className="flex-1 text-[16px] font-bold text-stone-800 dark:text-stone-200 text-left">ตั้งค่าบัญชี</div>
              <ChevronRight size={20} className="text-stone-300 group-hover:text-stone-500 transition-colors" />
            </button>

            <button onClick={() => handleNavigation('/dashboard/customer/reports')} className="w-full flex items-center p-5 hover:bg-stone-50 dark:hover:bg-stone-800/50 transition-colors border-b border-stone-100 dark:border-stone-800 group">
              <HelpCircle size={22} className="text-stone-400 mr-4" strokeWidth={2} />
              <div className="flex-1 text-[16px] font-bold text-stone-800 dark:text-stone-200 text-left">ศูนย์ช่วยเหลือ</div>
              <ChevronRight size={20} className="text-stone-300 group-hover:text-stone-500 transition-colors" />
            </button>

            <button onClick={() => handleNavigation('/privacy')} className="w-full flex items-center p-5 hover:bg-stone-50 dark:hover:bg-stone-800/50 transition-colors group">
              <Shield size={22} className="text-stone-400 mr-4" strokeWidth={2} />
              <div className="flex-1 text-[16px] font-bold text-stone-800 dark:text-stone-200 text-left">นโยบายความเป็นส่วนตัว</div>
              <ChevronRight size={20} className="text-stone-300 group-hover:text-stone-500 transition-colors" />
            </button>
          </div>
        </div>

        {/* Logout Button */}
        <motion.button 
          whileTap={{ scale: 0.98 }}
          onClick={handleLogout}
          disabled={isLoggingOut}
          className="w-full h-14 bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 text-[16px] font-bold rounded-[20px] transition-all flex items-center justify-center gap-2 hover:bg-red-100 dark:hover:bg-red-500/20 border border-red-100 dark:border-red-500/20 mt-4 disabled:opacity-50"
        >
          <LogOut size={20} strokeWidth={2.5} />
          {isLoggingOut ? 'กำลังออกจากระบบ...' : 'ออกจากระบบ'}
        </motion.button>

        <div className="text-center pb-8 mt-6">
          <p className="text-[12px] text-stone-400 font-medium">RUSHUP Platform v1.0.0</p>
        </div>
      </div>
    </div>
  );
}

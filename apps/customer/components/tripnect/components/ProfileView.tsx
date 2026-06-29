import { MapPin, Settings, Camera, ChevronRight, Briefcase, Sun, Moon, User, ShoppingBag, Truck, CreditCard, ChevronDown } from 'lucide-react';
import { useState, useRef, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../../../lib/AuthContext';
import { updateProfileAvatar, supabase } from '../../../lib/supabaseClient';
import { formatCurrencyByLocale, formatDateByLocale } from '../../../lib/localeFormat';
import { useI18n } from '../../../lib/I18nContext';

interface ProfileViewProps {
  orders?: any[];
}

export function ProfileView({ orders = [] }: ProfileViewProps) {
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const { theme, toggleTheme } = useTheme();
  const { profile, user, loading } = useAuth();
  const { locale } = useI18n();
  
  const viewingUser = useMemo(() => {
    if (profile) {
      return {
        id: profile.id,
        fullName: profile.first_name ? `${profile.first_name} ${profile.last_name || ''}`.trim() : 'ลูกค้า',
        username: profile.first_name ? profile.first_name.toLowerCase() : 'customer',
        avatarUrl: profile.avatar_url || null,
        phone: profile.phone || '',
      };
    }
    if (user) {
      return {
        id: user.id,
        fullName: user.email?.split('@')[0] || 'ลูกค้าใหม่',
        username: user.email?.split('@')[0] || 'customer',
        avatarUrl: null,
        phone: '',
      };
    }
    return null;
  }, [profile, user]);

  const handleAvatarClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !profile?.id) return;
    
    try {
      setIsUploading(true);
      const res = await fetch('/api/upload/presign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename: file.name, contentType: file.type }),
      });
      if (!res.ok) throw new Error('Failed to get upload URL');
      const { presignedUrl, finalUrl } = await res.json();
      
      const uploadRes = await fetch(presignedUrl, {
        method: 'PUT',
        headers: { 'Content-Type': file.type },
        body: file,
      });
      if (!uploadRes.ok) throw new Error('Failed to upload file');
      
      await updateProfileAvatar(profile.id, finalUrl);
      window.location.reload();
    } catch (error) {
      console.error('Error uploading avatar:', error);
      alert('ไม่สามารถอัปโหลดรูปภาพได้ กรุณาลองใหม่อีกครั้ง');
    } finally {
      setIsUploading(false);
    }
  };
  
  const stats = useMemo(() => {
    const totalOrders = orders.length;
    const completedOrders = orders.filter(o => o.status === 'completed' || o.status === 'delivered').length;
    return {
      orders: totalOrders,
      completed: completedOrders,
      points: Math.floor(totalOrders * 10),
    };
  }, [orders]);

  if (loading) {
    return <div className="min-h-screen bg-stone-50 dark:bg-stone-900 flex items-center justify-center text-stone-500">กำลังโหลด...</div>;
  }

  if (!viewingUser) {
    return <div className="min-h-screen bg-stone-50 dark:bg-stone-900 flex items-center justify-center text-stone-500">ไม่พบข้อมูลโปรไฟล์ กรุณาเข้าสู่ระบบใหม่อีกครั้ง</div>;
  }

  return (
    <div className="min-h-screen bg-stone-50 dark:bg-stone-900 pb-24 transition-colors font-sans">
      
      {/* Top Header */}
      <div className="flex items-center justify-between px-5 py-4 bg-stone-50 dark:bg-stone-900 sticky top-0 z-20">
        <h1 className="text-2xl font-bold text-stone-900 dark:text-white tracking-tight">โปรไฟล์</h1>
        <button 
          onClick={toggleTheme}
          className="w-10 h-10 rounded-full bg-white dark:bg-stone-800 shadow-sm flex items-center justify-center text-stone-600 dark:text-stone-300 hover:scale-105 transition-transform"
        >
          {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
        </button>
      </div>

      {/* User Info Card */}
      <div className="px-5 mb-6">
        <div className="bg-white dark:bg-stone-800 rounded-[24px] p-6 shadow-sm border border-stone-100 dark:border-stone-700/50">
          <div className="flex items-center gap-5">
            <div className="relative shrink-0">
              <div className="w-20 h-20 rounded-full overflow-hidden bg-stone-100 dark:bg-stone-700 flex items-center justify-center">
                {viewingUser.avatarUrl ? (
                  <img src={viewingUser.avatarUrl} alt={viewingUser.fullName} className="w-full h-full object-cover" />
                ) : (
                  <User size={32} className="text-stone-400 dark:text-stone-500" />
                )}
              </div>
              <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" className="hidden" />
              <button 
                onClick={handleAvatarClick}
                disabled={isUploading}
                className="absolute bottom-0 right-0 w-8 h-8 bg-stone-900 dark:bg-stone-100 rounded-full flex items-center justify-center border-2 border-white dark:border-stone-800 hover:scale-105 transition-transform"
              >
                <Camera size={14} className="text-white dark:text-stone-900" />
              </button>
            </div>
            
            <div className="flex-1">
              <h2 className="text-xl font-bold text-stone-900 dark:text-white mb-1">{viewingUser.fullName}</h2>
              <p className="text-sm text-stone-500 dark:text-stone-400 font-medium">{viewingUser.phone || 'ยังไม่ได้เพิ่มเบอร์โทรศัพท์'}</p>
              <div className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 bg-amber-50 dark:bg-amber-500/10 rounded-md">
                <span className="text-[11px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wide">Gold Member</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="px-5 mb-6 grid grid-cols-2 gap-3">
        <div className="bg-white dark:bg-stone-800 rounded-[20px] p-5 shadow-sm border border-stone-100 dark:border-stone-700/50">
           <div className="w-10 h-10 rounded-full bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center mb-3">
              <ShoppingBag size={20} className="text-blue-600 dark:text-blue-400" />
           </div>
           <div className="text-2xl font-black text-stone-900 dark:text-white mb-1">{stats.orders}</div>
           <div className="text-xs font-semibold text-stone-500 dark:text-stone-400">ออเดอร์ทั้งหมด</div>
        </div>
        <div className="bg-white dark:bg-stone-800 rounded-[20px] p-5 shadow-sm border border-stone-100 dark:border-stone-700/50">
           <div className="w-10 h-10 rounded-full bg-orange-50 dark:bg-orange-500/10 flex items-center justify-center mb-3">
              <CreditCard size={20} className="text-orange-600 dark:text-orange-400" />
           </div>
           <div className="text-2xl font-black text-stone-900 dark:text-white mb-1">{stats.points}</div>
           <div className="text-xs font-semibold text-stone-500 dark:text-stone-400">พอยต์สะสม</div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="px-5 mb-8">
        <div className="bg-stone-900 dark:bg-stone-100 rounded-[20px] p-1 flex items-center">
           <button 
             onClick={() => window.location.href = '/dashboard/merchant/orders'}
             className="flex-1 bg-transparent py-3.5 flex items-center justify-center gap-2 text-white dark:text-stone-900 font-bold"
           >
              <Briefcase size={18} />
              เข้าสู่ระบบร้านค้า (POS)
           </button>
        </div>
        <div className="grid grid-cols-2 gap-3 mt-3">
           <button className="bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 py-3 rounded-[16px] text-sm font-semibold text-stone-700 dark:text-stone-300 flex items-center justify-center gap-2">
              <MapPin size={16} /> ที่อยู่จัดส่ง
           </button>
           <button className="bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 py-3 rounded-[16px] text-sm font-semibold text-stone-700 dark:text-stone-300 flex items-center justify-center gap-2">
              <Settings size={16} /> ตั้งค่าบัญชี
           </button>
        </div>
      </div>

      {/* Recent Orders List */}
      <div className="px-5">
        <h3 className="text-lg font-bold text-stone-900 dark:text-white mb-4">ประวัติการสั่งซื้อล่าสุด</h3>
        
        <div className="space-y-3">
          {orders.length > 0 ? (
            orders.slice(0, 5).map((order, idx) => (
              <div key={idx} className="bg-white dark:bg-stone-800 rounded-[20px] p-4 shadow-sm border border-stone-100 dark:border-stone-700/50 flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-stone-50 dark:bg-stone-900 flex items-center justify-center shrink-0">
                   <ShoppingBag size={20} className="text-stone-400 dark:text-stone-500" />
                </div>
                <div className="flex-1">
                   <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-stone-900 dark:text-white">Order #{order.id.slice(0, 5)}</span>
                      <span className="text-sm font-bold text-stone-900 dark:text-white">
                         {formatCurrencyByLocale(order.totalAmount || 0, locale)}
                      </span>
                   </div>
                   <div className="flex items-center justify-between">
                      <span className="text-xs text-stone-500 dark:text-stone-400">
                         {order.createdAt ? formatDateByLocale(order.createdAt, locale) : 'วันนี้'}
                      </span>
                      <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md ${
                        order.status === 'completed' ? 'bg-green-50 text-green-600 dark:bg-green-500/10 dark:text-green-400' :
                        'bg-orange-50 text-orange-600 dark:bg-orange-500/10 dark:text-orange-400'
                      }`}>
                         {order.status || 'pending'}
                      </span>
                   </div>
                </div>
              </div>
            ))
          ) : (
            <div className="py-12 bg-white dark:bg-stone-800 rounded-[24px] border border-stone-100 dark:border-stone-700/50 flex flex-col items-center justify-center text-center px-6">
               <div className="w-16 h-16 rounded-full bg-stone-50 dark:bg-stone-900 flex items-center justify-center mb-4">
                  <ShoppingBag size={28} className="text-stone-300 dark:text-stone-600" />
               </div>
               <h4 className="text-base font-bold text-stone-900 dark:text-white mb-1">ยังไม่มีออเดอร์</h4>
               <p className="text-sm text-stone-500 dark:text-stone-400">เมื่อคุณสั่งซื้อสินค้า รายการออเดอร์จะแสดงที่นี่</p>
            </div>
          )}
        </div>
      </div>
      
    </div>
  );
}

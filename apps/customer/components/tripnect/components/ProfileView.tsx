import { MapPin, Settings, Camera, ChevronRight, Globe, Image, Edit2, Bookmark, Heart, MessageCircle, Map as MapIcon, Award, Briefcase, Sun, Moon, User, ShoppingBag, Grid3x3, Tag, Truck, Plus } from 'lucide-react';
import { useState, useRef, useMemo, useEffect } from 'react';
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
  const [activeTab, setActiveTab] = useState<'orders' | 'saved'>('orders');
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

  const isOwnProfile = true;

  const handleAvatarClick = () => {
    if (isOwnProfile && fileInputRef.current) {
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
      points: Math.floor(totalOrders * 10), // mock points calculation
    };
  }, [orders]);

  if (loading) {
    return <div className="min-h-screen bg-white dark:bg-stone-950 flex items-center justify-center text-stone-500">กำลังโหลด...</div>;
  }

  if (!viewingUser) {
    return <div className="min-h-screen bg-white dark:bg-stone-950 flex items-center justify-center text-stone-500">ไม่พบข้อมูลโปรไฟล์ กรุณาเข้าสู่ระบบใหม่อีกครั้ง</div>;
  }

  return (
    <div className="min-h-screen bg-white dark:bg-stone-950 pb-24 transition-colors font-sans">
      {/* Top Navigation */}
      <div className="flex items-center justify-between px-5 py-4 bg-white dark:bg-stone-950 sticky top-0 z-20">
        <h1 className="text-xl font-bold text-stone-900 dark:text-stone-100">{viewingUser.username}</h1>
        <div className="flex items-center gap-4">
          <motion.button onClick={toggleTheme} whileTap={{ scale: 0.9 }}>
            {theme === 'dark' ? <Sun size={24} className="text-stone-100" /> : <Moon size={24} className="text-stone-900" />}
          </motion.button>
          <button onClick={() => window.location.href = '/dashboard/merchant/orders'}>
             <Briefcase size={24} className="text-stone-900 dark:text-stone-100" />
          </button>
        </div>
      </div>

      {/* Header Info */}
      <div className="px-5 pt-2 pb-6">
        <div className="flex items-center gap-6 mb-4">
          <div className="relative shrink-0">
            <div className="w-20 h-20 rounded-full overflow-hidden bg-stone-100 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 flex items-center justify-center">
              {viewingUser.avatarUrl ? (
                <img src={viewingUser.avatarUrl} alt={viewingUser.fullName} className="w-full h-full object-cover" />
              ) : (
                <User size={32} className="text-stone-400" />
              )}
            </div>
            {isOwnProfile && (
              <>
                <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" className="hidden" />
                <button 
                  onClick={handleAvatarClick}
                  disabled={isUploading}
                  className="absolute bottom-0 right-0 w-7 h-7 bg-blue-500 rounded-full flex items-center justify-center border-2 border-white dark:border-stone-950"
                >
                  <Plus size={16} className="text-white" strokeWidth={3} />
                </button>
              </>
            )}
          </div>

          <div className="flex-1 flex justify-around text-center">
            <div>
              <div className="text-lg font-bold text-stone-900 dark:text-stone-100">{stats.orders}</div>
              <div className="text-xs text-stone-900 dark:text-stone-100">ออเดอร์</div>
            </div>
            <div>
              <div className="text-lg font-bold text-stone-900 dark:text-stone-100">{stats.completed}</div>
              <div className="text-xs text-stone-900 dark:text-stone-100">สำเร็จแล้ว</div>
            </div>
            <div>
              <div className="text-lg font-bold text-stone-900 dark:text-stone-100">{stats.points}</div>
              <div className="text-xs text-stone-900 dark:text-stone-100">พอยต์</div>
            </div>
          </div>
        </div>

        <div className="mb-4">
          <h2 className="font-semibold text-sm text-stone-900 dark:text-stone-100">{viewingUser.fullName}</h2>
          <p className="text-sm text-stone-600 dark:text-stone-400 mt-1 whitespace-pre-wrap">
            ลูกค้าระดับ Gold Member 🌟
            {viewingUser.phone && `\nติดต่อ: ${viewingUser.phone}`}
          </p>
        </div>

        <div className="flex gap-2">
          <button className="flex-1 h-8 bg-stone-100 dark:bg-stone-800 text-stone-900 dark:text-stone-100 text-sm font-semibold rounded-lg">
            แก้ไขโปรไฟล์
          </button>
          <button className="flex-1 h-8 bg-stone-100 dark:bg-stone-800 text-stone-900 dark:text-stone-100 text-sm font-semibold rounded-lg">
            แชร์โปรไฟล์
          </button>
          <button className="w-8 h-8 bg-stone-100 dark:bg-stone-800 text-stone-900 dark:text-stone-100 flex items-center justify-center rounded-lg">
            <User size={16} />
          </button>
        </div>
      </div>

      {/* Story Highlights (Settings/Features) */}
      <div className="px-5 mb-6 overflow-x-auto no-scrollbar">
        <div className="flex gap-4 min-w-max">
          {[
            { id: 'pos', name: 'ระบบ POS', icon: Briefcase, action: () => window.location.href = '/dashboard/merchant/orders' },
            { id: 'address', name: 'ที่อยู่', icon: MapPin },
            { id: 'settings', name: 'ตั้งค่า', icon: Settings },
          ].map(highlight => (
            <div key={highlight.id} className="flex flex-col items-center gap-1 cursor-pointer" onClick={highlight.action}>
              <div className="w-16 h-16 rounded-full border border-stone-200 dark:border-stone-800 flex items-center justify-center bg-stone-50 dark:bg-stone-900">
                <highlight.icon size={24} className="text-stone-900 dark:text-stone-100" strokeWidth={1.5} />
              </div>
              <span className="text-xs text-stone-900 dark:text-stone-100">{highlight.name}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Grid Tabs */}
      <div className="flex border-t border-stone-200 dark:border-stone-800">
        <button 
          onClick={() => setActiveTab('orders')}
          className={`flex-1 flex justify-center py-3 border-b-2 ${activeTab === 'orders' ? 'border-stone-900 dark:border-stone-100 text-stone-900 dark:text-stone-100' : 'border-transparent text-stone-400'}`}
        >
          <Grid3x3 size={24} strokeWidth={1.5} />
        </button>
        <button 
          onClick={() => setActiveTab('saved')}
          className={`flex-1 flex justify-center py-3 border-b-2 ${activeTab === 'saved' ? 'border-stone-900 dark:border-stone-100 text-stone-900 dark:text-stone-100' : 'border-transparent text-stone-400'}`}
        >
          <Tag size={24} strokeWidth={1.5} />
        </button>
      </div>

      {/* Grid Content */}
      <div className="grid grid-cols-3 gap-[1px] bg-stone-200 dark:bg-stone-800">
        {activeTab === 'orders' && orders.length > 0 ? (
          orders.map((order, idx) => (
            <div key={idx} className="aspect-square bg-stone-100 dark:bg-stone-900 relative group overflow-hidden flex items-center justify-center">
               <div className="absolute inset-0 bg-stone-900/50 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <span className="text-white font-bold text-xs">{formatCurrencyByLocale(order.totalAmount || 0, locale)}</span>
                  <span className="text-white text-[10px] uppercase">{order.status}</span>
               </div>
               <div className="text-stone-400 dark:text-stone-600 flex flex-col items-center">
                  <ShoppingBag size={24} strokeWidth={1} />
                  <span className="text-[10px] mt-1 font-mono">#{order.id.slice(0, 4)}</span>
               </div>
            </div>
          ))
        ) : activeTab === 'orders' ? (
          <div className="col-span-3 py-16 text-center text-stone-500">ไม่มีออเดอร์</div>
        ) : (
          <div className="col-span-3 py-16 text-center text-stone-500">ไม่มีรายการที่ถูกใจ</div>
        )}
      </div>
    </div>
  );
}

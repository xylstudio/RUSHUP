import { MapPin, Settings, Camera, ChevronRight, Globe, Plane, Calendar, Star, Users, Share2, UserPlus, Grid3x3, FileText, Image, Edit2, Trophy, Target, TrendingUp, Plus, X, Heart, MessageCircle, Map as MapIcon, Home, Briefcase, GraduationCap, MoreHorizontal, Edit, Search, PenSquare, Video, Mail, Shield, Clock, ChevronDown, Award, Compass, Mountain, Flag, Stamp, Navigation, Zap, Flame, Bookmark, Eye, Send, ArrowRight, Lock, CheckCircle, Circle, Moon, Sun } from 'lucide-react';
import { CURRENT_USER, POSTS } from '../data';
import { useState, useRef, useMemo } from 'react';
import { ImageWithFallback } from './figma/ImageWithFallback';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../../../lib/AuthContext';
import { updateProfileAvatar } from '../../../lib/supabaseClient';

interface TravelBadge {
  id: number;
  name: string;
  description: string;
  icon: string;
  unlocked: boolean;
  date?: string;
}

const TRAVEL_BADGES: TravelBadge[] = [
  { id: 1, name: 'นักเดินทาง', description: 'ท่องเที่ยว 10 อำเภอ', icon: '🎖️', unlocked: true, date: 'ม.ค. 2026' },
  { id: 2, name: 'นักสำรวจภูเขา', description: 'ไปอำเภอภูเขาครบ 5 อำเภอ', icon: '⛰️', unlocked: true, date: 'ธ.ค. 2025' },
  { id: 3, name: 'City Explorer', description: 'สำรวจเมืองเชียงใหม่ครบ', icon: '🏙️', unlocked: true, date: 'พ.ย. 2025' },
  { id: 4, name: 'มาสเตอร์อาหารเหนือ', description: 'รีวิวร้านอาหารเหนือ 30 ร้าน', icon: '🍜', unlocked: true, date: 'ต.ค. 2025' },
  { id: 5, name: 'นักล่าน้ำตก', description: 'ไปน้ำตก 10 แห่ง (7/10)', icon: '💧', unlocked: false },
  { id: 6, name: 'ช่างภาพเชียงใหม่', description: 'โพสต์รูป 100 รูป (67/100)', icon: '📸', unlocked: false },
];

const TRIP_HIGHLIGHTS = [
  {
    id: 1,
    name: 'ดอยสุเทพ-ดอยปุย',
    description: 'วัดพระธาตุดอยสุเทพ • วิวเมือง • บ้านม้ง',
    images: [
      'https://images.unsplash.com/photo-1598971639058-fab3c3109a00?w=800',
      'https://images.unsplash.com/photo-1563784462041-5f97ac9523dd?w=800',
      'https://images.unsplash.com/photo-1570168007204-dfb528c6958f?w=800',
    ],
    location: 'อ.เมืองเชียงใหม่',
    district: 'เมืองเชียงใหม่',
    date: '15-17 ม.ค. 2026',
    days: 3,
    likes: 234,
    comments: 45,
    saves: 67,
    isPublic: true
  },
  {
    id: 2,
    name: 'ดอยอินทนนท์',
    description: 'ยอดดอยสูงสุด • นาขั้นบันได • น้ำตก',
    images: [
      'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800',
      'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=800',
      'https://images.unsplash.com/photo-1552465011-b4e21bf6e79a?w=800',
    ],
    location: 'อ.จอมทอง',
    district: 'จอมทอง',
    date: '20-22 ธ.ค. 2025',
    days: 3,
    likes: 187,
    comments: 32,
    saves: 43,
    isPublic: true
  },
  {
    id: 3,
    name: 'ไร่ชา-หมู่บ้านจีน',
    description: 'สันติชล • บ้านรักไทย • ชาอู่หลง',
    images: [
      'https://images.unsplash.com/photo-1587404395658-6de68e7aeeb5?w=800',
      'https://images.unsplash.com/photo-1563784462041-5f97ac9523dd?w=800',
      'https://images.unsplash.com/photo-1570168007204-dfb528c6958f?w=800',
    ],
    location: 'อ.แม่แตง',
    district: 'แม่แตง',
    date: '1-3 พ.ย. 2025',
    days: 3,
    likes: 321,
    comments: 67,
    saves: 89,
    isPublic: true
  },
];

const CHIANG_MAI_DISTRICTS = [
  { name: 'เมืองเชียงใหม่', zone: 'เมือง', visited: true },
  { name: 'สันทราย', zone: 'เมือง', visited: true },
  { name: 'สารภี', zone: 'เมือง', visited: true },
  { name: 'หางดง', zone: 'เมือง', visited: true },
  { name: 'สันกำแพง', zone: 'เมือง', visited: true },
  { name: 'แม่ริม', zone: 'ภูเขา', visited: true },
  { name: 'แม่แตง', zone: 'ภูเขา', visited: true },
  { name: 'แม่อาย', zone: 'ภูเขา', visited: true },
  { name: 'ฝาง', zone: 'ภูเขา', visited: true },
  { name: 'เชียงดาว', zone: 'ภูเขา', visited: true },
  { name: 'ไชยปราการ', zone: 'ภูเขา', visited: false },
  { name: 'เวียงแหง', zone: 'ภูเขา', visited: false },
  { name: 'สะเมิง', zone: 'ภูเขา', visited: true },
  { name: 'กัลยาณิวัฒนา', zone: 'ภูเขา', visited: false },
  { name: 'แม่แจ่ม', zone: 'ภูเขา', visited: false },
  { name: 'จอมทอง', zone: 'ภูเขา', visited: true },
  { name: 'ดอยเต่า', zone: 'ภูเขา', visited: true },
  { name: 'ฮอด', zone: 'ภูเขา', visited: true },
  { name: 'สันป่าตอง', zone: 'ชนบท', visited: true },
  { name: 'ดอยสะเก็ด', zone: 'ชนบท', visited: true },
  { name: 'พร้าว', zone: 'ชนบท', visited: false },
  { name: 'แม่ออน', zone: 'ชนบท', visited: true },
  { name: 'แม่วาง', zone: 'ชนบท', visited: false },
  { name: 'อมก๋อย', zone: 'ชนบท', visited: false },
  { name: 'เทพวิ', zone: 'ชนบท', visited: false },
];

const visitedDistricts = CHIANG_MAI_DISTRICTS.filter(d => d.visited);
const totalDistricts = CHIANG_MAI_DISTRICTS.length;

export function ProfileView() {
  const [activeTab, setActiveTab] = useState<'trips' | 'map' | 'badges' | 'bucket'>('trips');
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const { theme, toggleTheme } = useTheme();
  const { profile, user, loading } = useAuth();
  
  // Maps DB profile to component expected structure, fallback to auth user if profile is missing
  const viewingUser = useMemo(() => {
    if (profile) {
      return {
        id: profile.id,
        fullName: profile.first_name ? `${profile.first_name} ${profile.last_name || ''}`.trim() : 'นักเดินทางไร้นาม',
        username: profile.first_name ? profile.first_name.toLowerCase() : 'traveler',
        avatarUrl: profile.avatar_url || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=800',
      };
    }
    if (user) {
      return {
        id: user.id,
        fullName: user.email?.split('@')[0] || 'นักเดินทางใหม่',
        username: user.email?.split('@')[0] || 'traveler',
        avatarUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=800',
      };
    }
    return null;
  }, [profile, user]);

  const isOwnProfile = true;
  
  const userPosts = POSTS?.filter(post => post?.user?.username === CURRENT_USER?.username) || [];

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
      
      // 1. Get presigned URL
      const res = await fetch('/api/upload/presign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename: file.name, contentType: file.type }),
      });
      
      if (!res.ok) throw new Error('Failed to get upload URL');
      const { presignedUrl, finalUrl } = await res.json();
      
      // 2. Upload to Cloudflare R2
      const uploadRes = await fetch(presignedUrl, {
        method: 'PUT',
        headers: { 'Content-Type': file.type },
        body: file,
      });
      
      if (!uploadRes.ok) throw new Error('Failed to upload file to Cloudflare');
      
      // 3. Update Supabase Profile
      await updateProfileAvatar(profile.id, finalUrl);
      
      // Force reload to see changes (in a real app, you might update context state instead)
      window.location.reload();
      
    } catch (error) {
      console.error('Error uploading avatar:', error);
      alert('ไม่สามารถอัปโหลดรูปภาพได้ กรุณาลองใหม่อีกครั้ง');
    } finally {
      setIsUploading(false);
    }
  };
  
  const travelStats = {
    districts: visitedDistricts.length,
    totalDistricts: totalDistricts,
    trips: 12,
    kilometers: 2847,
    photos: 342,
    followers: 1247,
    following: 892,
    streak: 15,
    level: 12
  };

  const zoneStats = {
    เมือง: CHIANG_MAI_DISTRICTS.filter(d => d.zone === 'เมือง'),
    ภูเขา: CHIANG_MAI_DISTRICTS.filter(d => d.zone === 'ภูเขา'),
    ชนบท: CHIANG_MAI_DISTRICTS.filter(d => d.zone === 'ชนบท'),
  };

  if (loading) {
    return <div className="min-h-screen bg-white dark:bg-stone-950 flex items-center justify-center text-stone-500">กำลังโหลดข้อมูลโปรไฟล์...</div>;
  }

  if (!viewingUser) {
    return <div className="min-h-screen bg-white dark:bg-stone-950 flex items-center justify-center text-stone-500">ไม่พบข้อมูลโปรไฟล์ กรุณาเข้าสู่ระบบใหม่อีกครั้ง</div>;
  }

  return (
    <div className="min-h-screen bg-white dark:bg-stone-950 pb-24 transition-colors">
      {/* Header */}
      <div className="bg-white dark:bg-stone-950 px-5 pt-6 pb-5 border-b border-stone-100 dark:border-stone-800 transition-colors">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h1 className="text-[20px] font-black text-stone-900 dark:text-stone-100">โปรไฟล์</h1>
            <p className="text-[13px] text-orange-500 font-semibold">Chiang Mai Explorer</p>
          </div>
          <div className="flex items-center gap-2">
            {/* Dark Mode Toggle */}
            <motion.button 
              onClick={toggleTheme}
              whileTap={{ scale: 0.9 }}
              className="w-10 h-10 rounded-[12px] bg-stone-50 dark:bg-stone-900 flex items-center justify-center hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
            >
              {theme === 'dark' ? (
                <Sun size={18} className="text-orange-500" strokeWidth={2.5} />
              ) : (
                <Moon size={18} className="text-stone-600" strokeWidth={2.5} />
              )}
            </motion.button>
            <button className="w-10 h-10 rounded-[12px] bg-stone-50 dark:bg-stone-900 flex items-center justify-center hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors">
              <Settings size={18} className="text-stone-600 dark:text-stone-400" strokeWidth={2.5} />
            </button>
          </div>
        </div>

        <div className="flex items-start gap-4 mb-5">
          <div className="relative">
            <div className="w-[92px] h-[92px] rounded-[20px] overflow-hidden bg-stone-100 dark:bg-stone-800 border-2 border-stone-200 dark:border-stone-700">
              <img 
                src={viewingUser.avatarUrl} 
                alt={viewingUser.fullName}
                className="w-full h-full object-cover"
              />
            </div>
            <div className="absolute -top-2 -right-2 px-2.5 py-1 bg-orange-500 rounded-full border-[3px] border-white dark:border-stone-950 shadow-lg">
              <span className="text-[11px] font-black text-white">Lv.{travelStats.level}</span>
            </div>
            {isOwnProfile && (
              <>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleFileChange} 
                  accept="image/*" 
                  className="hidden" 
                />
                <button 
                  onClick={handleAvatarClick}
                  disabled={isUploading}
                  className={`absolute -bottom-2 -right-2 w-9 h-9 bg-stone-900 dark:bg-orange-500 rounded-full flex items-center justify-center hover:bg-stone-800 dark:hover:bg-orange-600 transition-colors shadow-lg border-[3px] border-white dark:border-stone-950 ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <Camera size={14} className="text-white" strokeWidth={2.5} />
                </button>
              </>
            )}
          </div>

          <div className="flex-1 pt-2">
            <h2 className="text-[22px] font-black text-stone-900 dark:text-stone-100 mb-1 leading-tight">{viewingUser.fullName}</h2>
            <p className="text-[15px] text-stone-500 dark:text-stone-400 font-semibold mb-4">@{viewingUser.username}</p>

            <div className="flex items-center gap-5">
              <button className="hover:opacity-70 transition-opacity">
                <div className="text-[18px] font-black text-stone-900 dark:text-stone-100">{travelStats.followers.toLocaleString()}</div>
                <div className="text-[13px] text-stone-500 dark:text-stone-400 font-semibold">ผู้ติดตาม</div>
              </button>
              <button className="hover:opacity-70 transition-opacity">
                <div className="text-[18px] font-black text-stone-900 dark:text-stone-100">{travelStats.following.toLocaleString()}</div>
                <div className="text-[13px] text-stone-500 dark:text-stone-400 font-semibold">กำลังติดตาม</div>
              </button>
            </div>
          </div>
        </div>

        <p className="text-[15px] text-stone-700 dark:text-stone-300 leading-relaxed mb-5 font-normal">
          สำรวจเชียงใหม่ทุกมุม ทุกอำเภอ 🏔️ Local Expert
        </p>

        <div className="flex gap-3">
          <motion.button 
            whileTap={{ scale: 0.97 }}
            className="flex-1 h-12 bg-stone-100 dark:bg-stone-800 text-stone-900 dark:text-stone-100 text-[15px] font-bold rounded-[14px] transition-all hover:bg-stone-200 dark:hover:bg-stone-700 flex items-center justify-center gap-2"
          >
            <Edit2 size={16} strokeWidth={2.5} />
            แก้ไขโปรไฟล์
          </motion.button>
        </div>
        
        <div className="mt-3">
          <motion.button 
            onClick={() => window.location.href = '/dashboard/merchant/orders'}
            whileTap={{ scale: 0.97 }}
            className="w-full h-12 bg-orange-500 text-white text-[15px] font-bold rounded-[14px] transition-all shadow-md hover:bg-orange-600 hover:shadow-lg flex items-center justify-center gap-2"
          >
            <Briefcase size={18} strokeWidth={3} />
            สมัครเปิดร้านค้า / เข้าสู่ระบบร้านค้า (POS)
          </motion.button>
        </div>
      </div>

      {/* Stats */}
      <div className="px-5 py-6 bg-stone-50 dark:bg-stone-900/50 transition-colors">
        <h3 className="text-[15px] font-bold text-stone-900 dark:text-stone-100 mb-1">สถิติการเดินทางในเชียงใหม่</h3>
        <p className="text-[13px] text-stone-500 dark:text-stone-400 font-normal mb-4">ติดตามการสะสมอำเภอที่ไปแล้ว</p>
        
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="bg-white dark:bg-stone-900 rounded-[16px] border border-stone-200 dark:border-stone-800 p-5 text-center transition-colors">
            <div className="text-[11px] font-bold text-stone-500 dark:text-stone-400 uppercase tracking-wide mb-2">อำเภอที่ไปแล้ว</div>
            <div className="flex items-end justify-center gap-1 mb-2">
              <div className="text-[36px] font-black text-orange-500 leading-none">{travelStats.districts}</div>
              <div className="text-[18px] font-bold text-stone-400 leading-none pb-1">/{travelStats.totalDistricts}</div>
            </div>
            <div className="w-full h-2 bg-stone-100 dark:bg-stone-800 rounded-full overflow-hidden">
              <div 
                className="h-full bg-orange-500 rounded-full"
                style={{ width: `${(travelStats.districts / travelStats.totalDistricts) * 100}%` }}
              ></div>
            </div>
            <div className="text-[12px] text-stone-500 dark:text-stone-400 font-semibold mt-2">
              {Math.round((travelStats.districts / travelStats.totalDistricts) * 100)}% ของเชียงใหม่
            </div>
          </div>

          <div className="bg-white dark:bg-stone-900 rounded-[16px] border border-stone-200 dark:border-stone-800 p-5 text-center transition-colors">
            <div className="text-[11px] font-bold text-stone-500 dark:text-stone-400 uppercase tracking-wide mb-2">ทริปปีนี้</div>
            <div className="flex items-end justify-center gap-1 mb-2">
              <div className="text-[36px] font-black text-orange-500 leading-none">{travelStats.trips}</div>
              <div className="text-[18px] font-bold text-stone-400 leading-none pb-1">ทริป</div>
            </div>
            <div className="flex items-center justify-center gap-1.5 text-stone-600 dark:text-stone-400">
              <MapPin size={14} strokeWidth={2.5} />
              <span className="text-[12px] font-semibold">เฉลี่ย 1 ทริปต่อเดือน</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white dark:bg-stone-900 rounded-[14px] border border-stone-200 dark:border-stone-800 p-4 text-center transition-colors">
            <div className="w-10 h-10 rounded-full bg-orange-50 dark:bg-orange-500/20 flex items-center justify-center mx-auto mb-2">
              <Mountain size={18} className="text-orange-500" strokeWidth={2.5} />
            </div>
            <div className="text-[20px] font-black text-stone-900 dark:text-stone-100 mb-1">{zoneStats.ภูเขา.filter(d => d.visited).length}</div>
            <div className="text-[11px] font-semibold text-stone-500 dark:text-stone-400">อำเภอภูเขา</div>
          </div>

          <div className="bg-white dark:bg-stone-900 rounded-[14px] border border-stone-200 dark:border-stone-800 p-4 text-center transition-colors">
            <div className="w-10 h-10 rounded-full bg-orange-50 dark:bg-orange-500/20 flex items-center justify-center mx-auto mb-2">
              <Camera size={18} className="text-orange-500" strokeWidth={2.5} />
            </div>
            <div className="text-[20px] font-black text-stone-900 dark:text-stone-100 mb-1">{travelStats.photos}</div>
            <div className="text-[11px] font-semibold text-stone-500 dark:text-stone-400">รูปภาพ</div>
          </div>

          <div className="bg-white dark:bg-stone-900 rounded-[14px] border border-stone-200 dark:border-stone-800 p-4 text-center transition-colors">
            <div className="w-10 h-10 rounded-full bg-orange-50 dark:bg-orange-500/20 flex items-center justify-center mx-auto mb-2">
              <Navigation size={18} className="text-orange-500" strokeWidth={2.5} />
            </div>
            <div className="text-[20px] font-black text-stone-900 dark:text-stone-100 mb-1">{(travelStats.kilometers / 1000).toFixed(1)}K</div>
            <div className="text-[11px] font-semibold text-stone-500 dark:text-stone-400">กิโลเมตร</div>
          </div>
        </div>

        <div className="mt-3 bg-gradient-to-r from-orange-500 to-orange-600 rounded-[16px] p-4 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
              <Flame size={24} className="text-white" strokeWidth={2.5} />
            </div>
            <div>
              <div className="text-[13px] font-semibold opacity-90">Travel Streak</div>
              <div className="text-[18px] font-black">{travelStats.streak} วันติดต่อกัน 🔥</div>
            </div>
          </div>
          <ChevronRight size={20} strokeWidth={2.5} className="opacity-60" />
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white dark:bg-stone-950 sticky top-0 z-10 border-b-2 border-stone-100 dark:border-stone-800 transition-colors">
        <div className="flex px-5">
          {[
            { key: 'trips', label: 'ทริปของฉัน', icon: MapIcon },
            { key: 'map', label: 'แผนที่', icon: Globe },
            { key: 'badges', label: 'ตรา', icon: Award },
            { key: 'bucket', label: 'อยากไป', icon: Bookmark },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={`flex-1 py-4 text-[13px] font-bold border-b-[3px] -mb-[2px] transition-all flex flex-col items-center justify-center gap-1 ${
                activeTab === tab.key 
                  ? 'border-orange-500 text-orange-500' 
                  : 'border-transparent text-stone-400 hover:text-stone-600 dark:hover:text-stone-300'
              }`}
            >
              <tab.icon size={20} strokeWidth={2.5} />
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Content - จะเพิ่ม dark mode ให้ content ทั้งหมดในข้อความต่อไป */}
      <div className="px-5 py-6">
        {activeTab === 'trips' && (
          <div className="space-y-5">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-[17px] font-bold text-stone-900 dark:text-stone-100">ทริปล่าสุด</h3>
              <button className="text-[13px] font-semibold text-orange-500 hover:text-orange-600 flex items-center gap-1">
                ดูทั้งหมด
                <ChevronRight size={14} strokeWidth={2.5} />
              </button>
            </div>

            {TRIP_HIGHLIGHTS.map((trip, idx) => (
              <motion.div 
                key={trip.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.1 }}
                className="bg-white dark:bg-stone-900 rounded-[20px] border-2 border-stone-200 dark:border-stone-800 overflow-hidden hover:border-orange-500 transition-all"
              >
                <div className="grid grid-cols-3 gap-1.5 p-3">
                  {trip.images.map((img, imgIdx) => (
                    <div key={imgIdx} className={`rounded-[14px] overflow-hidden aspect-square bg-stone-100 dark:bg-stone-800 ${imgIdx === 0 ? 'col-span-2 row-span-2' : ''}`}>
                      <img src={img} alt="" className="w-full h-full object-cover" />
                    </div>
                  ))}
                </div>

                <div className="px-5 pb-5">
                  <div className="mb-4 pb-4 border-b border-stone-100 dark:border-stone-800">
                    <h3 className="text-[18px] font-black text-stone-900 dark:text-stone-100 mb-2">{trip.name}</h3>
                    <p className="text-[13px] text-stone-600 dark:text-stone-400 font-normal mb-3 leading-relaxed">{trip.description}</p>
                    
                    <div className="flex flex-wrap gap-2">
                      <div className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-50 dark:bg-orange-500/20 rounded-[10px] border border-orange-200 dark:border-orange-500/30">
                        <MapPin size={13} className="text-orange-600 dark:text-orange-400" strokeWidth={2.5} />
                        <span className="text-[13px] font-semibold text-orange-700 dark:text-orange-400">{trip.location}</span>
                      </div>
                      <div className="flex items-center gap-1.5 px-3 py-1.5 bg-stone-50 dark:bg-stone-800 rounded-[10px]">
                        <Calendar size={13} className="text-stone-600 dark:text-stone-400" strokeWidth={2.5} />
                        <span className="text-[13px] font-semibold text-stone-700 dark:text-stone-300">{trip.days} วัน</span>
                      </div>
                      {trip.isPublic && (
                        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-green-50 dark:bg-green-500/20 rounded-[10px]">
                          <Globe size={13} className="text-green-600 dark:text-green-400" strokeWidth={2.5} />
                          <span className="text-[13px] font-semibold text-green-700 dark:text-green-400">สาธารณะ</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-6 text-[15px] font-semibold">
                    <button className="flex items-center gap-2 text-stone-600 dark:text-stone-400 hover:text-orange-500 transition-colors">
                      <Heart size={18} strokeWidth={2.5} />
                      <span>{trip.likes}</span>
                    </button>
                    <button className="flex items-center gap-2 text-stone-600 dark:text-stone-400 hover:text-orange-500 transition-colors">
                      <MessageCircle size={18} strokeWidth={2.5} />
                      <span>{trip.comments}</span>
                    </button>
                    <button className="flex items-center gap-2 text-stone-600 dark:text-stone-400 hover:text-orange-500 transition-colors ml-auto">
                      <Bookmark size={18} strokeWidth={2.5} />
                      <span>{trip.saves}</span>
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

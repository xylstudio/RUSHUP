import { Home, Compass, Wallet, Mail, Search, Sparkles, X, Image, Video, MapPinned, Bike, UtensilsCrossed, BedDouble, CarFront, User, Star, Settings, LogOut, HelpCircle, FileText, Globe, Plus } from 'lucide-react';
import React from 'react';
import { useAuth } from '../../../lib/AuthContext';
import { clsx } from 'clsx';
import { motion } from 'framer-motion';
import { TripnectLogo } from './Logo';

// --- Mobile Sidebar Component (Unchanged) ---
export function MobileSidebar({ onClose, onOpenPassport, onNavigate }: { onClose: () => void; onOpenPassport?: () => void; onNavigate?: (tab: string) => void }) {
    const { profile } = useAuth();
    const avatarUrl = profile?.avatar_url || null;
    const fullName = profile ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim() : 'นักเดินทางไร้นาม';
    const username = profile?.first_name ? profile.first_name.toLowerCase() : 'traveler';

    const menuItems = [
        { icon: User, label: 'ข้อมูลส่วนตัว', href: '#', action: 'profile' },
        { icon: Globe, label: 'Tripnect Passport', href: '#', highlight: true, action: 'passport' },
        { icon: Star, label: 'Tripnect Plus', href: '#', action: 'plus' },
        { icon: Sparkles, label: 'รีวิวที่บันทึกไว้', href: '#', action: 'saved' },
        { icon: FileText, label: 'รายการที่สร้าง', href: '#', action: 'myposts' },
    ];

    const footerItems = [
        { icon: Settings, label: 'การตั้งค่าและความเป็นส่วนตัว', action: 'settings' },
        { icon: HelpCircle, label: 'ศูนย์ช่วยเหลือ', action: 'help' },
    ];

    const handleItemClick = (item: any) => {
        if (item.action === 'passport' && onOpenPassport) {
            onClose();
            setTimeout(() => onOpenPassport(), 300);
        } else if (onNavigate) {
            onClose();
            setTimeout(() => onNavigate(item.action), 300);
        }
    };

    return (
        <div className="w-full h-full bg-white flex flex-col pt-[calc(3rem+env(safe-area-inset-top)+1rem)] pb-6 px-2 overflow-y-auto">
            {/* 1. User Header */}
            <div className="px-6 pb-6 mb-2">
                <div className="flex justify-between items-start mb-4">
                    <div className="relative">
                         {avatarUrl ? (
                           <img src={avatarUrl} className="relative w-14 h-14 rounded-full shadow-sm object-cover border border-slate-100" alt="User Avatar"/>
                         ) : (
                           <div className="w-14 h-14 rounded-full bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-400">
                             <User size={24} strokeWidth={1.8} />
                           </div>
                         )}
                    </div>
                    <button onClick={onClose} className="p-2 bg-white rounded-full text-slate-400 hover:text-slate-900 border border-slate-50"><X size={20} /></button>
                </div>
                <div className="flex flex-col">
                    <span className="font-bold text-2xl text-slate-900 tracking-tight">{fullName}</span>
                    <span className="text-slate-400 text-sm font-medium">@{username}</span>
                </div>
                <div className="flex gap-4 mt-5 text-sm">
                    <div className="flex flex-col"><span className="font-bold text-slate-900 text-lg">1.2k</span><span className="text-slate-400 text-xs">กำลังติดตาม</span></div>
                    <div className="flex flex-col"><span className="font-bold text-slate-900 text-lg">892</span><span className="text-slate-400 text-xs">ผู้ติดตาม</span></div>
                </div>
            </div>

            {/* 2. Main Menu */}
            <div className="flex-1 px-2 space-y-1">
                {menuItems.map((item, idx) => (
                    <button key={idx} onClick={() => handleItemClick(item)} className="w-full px-4 py-3.5 flex items-center gap-4 rounded-xl hover:bg-slate-50 transition-all group">
                        <item.icon size={20} className={clsx("transition-colors", item.highlight ? "text-orange-500" : "text-slate-400 group-hover:text-slate-900")} strokeWidth={1.5}/>
                        <span className={clsx("text-[14px] font-medium transition-colors", item.highlight ? "text-orange-500" : "text-slate-600 group-hover:text-slate-900")}>{item.label}</span>
                    </button>
                ))}
            </div>

            {/* 3. Footer */}
            <div className="px-6 mt-4">
                <div className="h-px bg-slate-100 w-full mb-4" />
                <div className="space-y-1">
                    {footerItems.map((item, idx) => (
                        <button key={idx} onClick={() => handleItemClick(item)} className="w-full py-2.5 flex items-center gap-3 text-slate-400 hover:text-slate-800 transition-colors">
                            <item.icon size={18} strokeWidth={1.5} />
                            <span className="font-medium text-sm">{item.label}</span>
                        </button>
                    ))}
                </div>
            </div>

            {/* 4. Logout */}
            <div className="mt-6 px-4">
                <button className="w-full py-3 rounded-xl border border-slate-100 flex items-center justify-center gap-2 text-slate-500 font-medium hover:bg-red-50 hover:text-red-500 hover:border-red-100 transition-colors">
                    <LogOut size={18} />
                    ออกจากระบบ
                </button>
            </div>
        </div>
    );
}

// --- Main MobileNav Component ---
interface MobileNavProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  showTripPlanner?: boolean;
  setShowTripPlanner?: (show: boolean) => void;
  showFoodDelivery?: boolean;
  setShowFoodDelivery?: (show: boolean) => void;
  showRideModal?: boolean;
  setShowRideModal?: (show: boolean) => void;
  showHotelModal?: boolean;
  setShowHotelModal?: (show: boolean) => void;
  showCarRentalModal?: boolean;
  setShowCarRentalModal?: (show: boolean) => void;
  showMagicRandomizer?: boolean; 
  isMenuOpen?: boolean;
  setIsMenuOpen?: React.Dispatch<React.SetStateAction<boolean>>;
  plusButtonHandlers?: any;
  isPlusPressing?: boolean;
  activeContext?: string | null;
  onCreatePostClick?: () => void;
}

export function MobileNav({ 
    activeTab, 
    onTabChange,
    setShowTripPlanner,
    setShowFoodDelivery,
    setShowRideModal,
    setShowHotelModal,
    setShowCarRentalModal,
    isMenuOpen = false,
    setIsMenuOpen,
    plusButtonHandlers,
    isPlusPressing = false,
    activeContext,
    onCreatePostClick
}: MobileNavProps) {
  
  const getIconProps = (tabName: string) => {
    const isActive = !isMenuOpen && activeTab === tabName;
    return {
      className: clsx(
        "w-[24px] h-[24px] transition-all duration-300", 
        isActive ? "text-orange-500" : "text-stone-300 hover:text-stone-400"
      ),
      strokeWidth: isActive ? 2 : 1.5,
    };
  };

  const handleTabClick = (tab: string) => {
    if (isMenuOpen && setIsMenuOpen) setIsMenuOpen(false); 
    onTabChange(tab);
  };

  return (
    <>
      {/* ================= Plus Menu Overlay (Clean White) ================= */}
      <div className={clsx("fixed inset-0 z-[210] flex flex-col justify-end transition-all duration-300 ease-in-out", isMenuOpen ? "visible" : "invisible pointer-events-none delay-300")}>
        <div onClick={() => setIsMenuOpen && setIsMenuOpen(false)} className={clsx("absolute inset-0 bg-slate-900/20 backdrop-blur-[2px] transition-opacity duration-300", isMenuOpen ? "opacity-100" : "opacity-0")} />
        <motion.div 
          className={clsx("relative bg-white w-full rounded-t-[28px] pt-4 pb-24 px-5 shadow-2xl transition-transform duration-500 cubic-bezier(0.32, 0.72, 0, 1) cursor-grab active:cursor-grabbing", isMenuOpen ? "translate-y-0" : "translate-y-full")}
          drag="y"
          dragConstraints={{ top: 0, bottom: 0 }}
          dragElastic={{ top: 0, bottom: 0.3 }}
          dragTransition={{ power: 0.1, timeConstant: 200, bounceStiffness: 400, bounceDamping: 30 }}
          onDragEnd={(e, info) => {
            if (info.offset.y > 150 && setIsMenuOpen) {
              setIsMenuOpen(false);
            }
          }}
        >
            <div className="w-10 h-1 bg-slate-100 rounded-full mx-auto mb-6" />
            
            <div className="flex justify-evenly items-start mb-6">
                <button onClick={() => { if(setIsMenuOpen && onCreatePostClick) { setIsMenuOpen(false); onCreatePostClick(); } }} className="flex flex-col items-center gap-1.5 group w-16">
                    <div className="w-12 h-12 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center group-active:scale-95 transition-transform duration-200">
                        <Image className="w-5 h-5 text-slate-900" strokeWidth={1.5} />
                    </div>
                    <span className="text-[10px] text-slate-500 font-medium">โพสต์</span>
                </button>
                <button className="flex flex-col items-center gap-1.5 group w-16">
                    <div className="w-12 h-12 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center group-active:scale-95 transition-transform duration-200">
                        <Video className="w-5 h-5 text-slate-900" strokeWidth={1.5} />
                    </div>
                    <span className="text-[10px] text-slate-500 font-medium">รีล</span>
                </button>
                <button onClick={() => { if(setIsMenuOpen && setShowTripPlanner) { setIsMenuOpen(false); setShowTripPlanner(true); } }} className="flex flex-col items-center gap-1.5 group w-16">
                    <div className="w-12 h-12 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center group-active:scale-95 transition-transform duration-200">
                        <MapPinned className="w-5 h-5 text-slate-900" strokeWidth={1.5} />
                    </div>
                    <span className="text-[10px] text-slate-500 font-medium">วางแผน</span>
                </button>
            </div>
            
            <div className="w-full h-[1px] bg-slate-50 mb-4" />
            
            <div className="grid grid-cols-4 gap-1">
                <button onClick={() => { if(setIsMenuOpen && setShowRideModal) { setIsMenuOpen(false); setShowRideModal(true); } }} className="flex flex-col items-center gap-1.5 group p-1.5 rounded-xl hover:bg-slate-50"><div className="group-active:scale-95 transition-transform duration-200"><Bike className="w-5 h-5 text-slate-400 group-hover:text-slate-900 transition-colors" strokeWidth={1.5} /></div><span className="text-[10px] text-slate-400 font-medium">เรียกรถ</span></button>
                <button onClick={() => { if(setIsMenuOpen && setShowFoodDelivery) { setIsMenuOpen(false); setShowFoodDelivery(true); } }} className="flex flex-col items-center gap-1.5 group p-1.5 rounded-xl hover:bg-slate-50"><div className="group-active:scale-95 transition-transform duration-200"><UtensilsCrossed className="w-5 h-5 text-slate-400 group-hover:text-slate-900 transition-colors" strokeWidth={1.5} /></div><span className="text-[10px] text-slate-400 font-medium">สั่งอาหาร</span></button>
                <button onClick={() => { if(setIsMenuOpen && setShowHotelModal) { setIsMenuOpen(false); setShowHotelModal(true); } }} className="flex flex-col items-center gap-1.5 group p-1.5 rounded-xl hover:bg-slate-50"><div className="group-active:scale-95 transition-transform duration-200"><BedDouble className="w-5 h-5 text-slate-400 group-hover:text-slate-900 transition-colors" strokeWidth={1.5} /></div><span className="text-[10px] text-slate-400 font-medium">ที่พัก</span></button>
                <button onClick={() => { if(setIsMenuOpen && setShowCarRentalModal) { setIsMenuOpen(false); setShowCarRentalModal(true); } }} className="flex flex-col items-center gap-1.5 group p-1.5 rounded-xl hover:bg-slate-50"><div className="group-active:scale-95 transition-transform duration-200"><CarFront className="w-5 h-5 text-slate-400 group-hover:text-slate-900 transition-colors" strokeWidth={1.5} /></div><span className="text-[10px] text-slate-400 font-medium">เช่รถ</span></button>
            </div>
        </motion.div>
      </div>

      {/* ================= Bottom Nav Bar (Compact & Small) ================= */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-stone-100 flex justify-between items-end px-2 z-[220] md:hidden pb-[max(4px,env(safe-area-inset-bottom))] shadow-[0_-2px_10px_rgba(0,0,0,0.02)] h-[58px]">
        
        {/* Tab 1: Home */}
        <div className="flex-1 flex justify-center pb-1">
            <button 
                onClick={() => handleTabClick('home')} 
                className="flex flex-col items-center gap-0.5 min-w-[50px] group"
            >
                <div className={clsx(
                    "p-1 transition-all duration-300",
                    activeTab === 'home' && !isMenuOpen && !activeContext ? "text-orange-500 scale-110" : "text-stone-400 group-hover:text-stone-600"
                )}>
                    <Home size={24} strokeWidth={activeTab === 'home' && !isMenuOpen && !activeContext ? 1.8 : 1.5} />
                </div>
                <span className={clsx(
                    "text-[9px] font-medium transition-colors leading-none",
                    activeTab === 'home' && !isMenuOpen && !activeContext ? "text-orange-500" : "text-stone-400"
                )}>
                    หน้าแรก
                </span>
            </button>
        </div>
        
        {/* Tab 2: Mail */}
        <div className="flex-1 flex justify-center pb-1">
            <button 
                onClick={() => handleTabClick('mail')} 
                className="flex flex-col items-center gap-0.5 min-w-[50px] group"
            >
                <div className={clsx(
                    "p-1 transition-all duration-300",
                    activeTab === 'mail' && !isMenuOpen && !activeContext ? "text-orange-500 scale-110" : "text-stone-400 group-hover:text-stone-600"
                )}>
                    <Mail size={24} strokeWidth={activeTab === 'mail' && !isMenuOpen && !activeContext ? 1.8 : 1.5} />
                </div>
                <span className={clsx(
                    "text-[9px] font-medium transition-colors leading-none",
                    activeTab === 'mail' && !isMenuOpen && !activeContext ? "text-orange-500" : "text-stone-400"
                )}>
                    ข้อความ
                </span>
            </button>
        </div>

        {/* ================= CENTER BUTTON (Modern Squircle Redesign) ================= */}
        <div className="flex-1 flex justify-center relative z-20 pb-2">
            <button 
                {...plusButtonHandlers}
                className="group flex flex-col items-center justify-center -mt-6 relative select-none touch-none"
            >
                {/* Long Press Loading Ring - Removed as per request */}


                <div className="w-[44px] h-[44px] rounded-2xl flex items-center justify-center border-[4px] border-white relative z-10 overflow-hidden bg-orange-400 transition-transform group-active:scale-95 pointer-events-none isolate transform-gpu shadow-sm" style={{ WebkitMaskImage: '-webkit-radial-gradient(white, black)' }}>
                    {/* Vertical Fill Animation */}
                    <motion.div 
                        className="absolute bottom-0 left-0 w-full bg-orange-600"
                        initial={{ height: "0%" }}
                        animate={{ 
                            height: activeContext ? "100%" : isPlusPressing ? "100%" : "0%" 
                        }}
                        transition={{ 
                            duration: isPlusPressing ? 0.6 : 0.2,
                            ease: "linear" 
                        }}
                    />

                    {/* Icon */}
                    <div className="relative z-10 pointer-events-none">
                        {isMenuOpen ? (
                            <X size={20} className="text-white" strokeWidth={2.5} />
                        ) : activeContext === 'trip' ? (
                            <MapPinned size={22} className="text-white" strokeWidth={2} />
                        ) : activeContext === 'food' ? (
                            <UtensilsCrossed size={22} className="text-white" strokeWidth={2} />
                        ) : activeContext === 'ride' ? (
                            <Bike size={22} className="text-white" strokeWidth={2} />
                        ) : activeContext === 'hotel' ? (
                            <BedDouble size={22} className="text-white" strokeWidth={2} />
                        ) : activeContext === 'car' ? (
                            <CarFront size={22} className="text-white" strokeWidth={2} />
                        ) : activeContext === 'quest' ? (
                            <Sparkles size={22} className="text-white" strokeWidth={2} />
                        ) : (
                            <Plus size={22} className="text-white" strokeWidth={2} />
                        )}
                    </div>
                </div>
            </button>
        </div>

        {/* Tab 3: Wallet */}
        <div className="flex-1 flex justify-center pb-1">
            <button 
                onClick={() => handleTabClick('wallet')} 
                className="flex flex-col items-center gap-0.5 min-w-[50px] group"
            >
                <div className={clsx(
                    "p-1 transition-all duration-300",
                    activeTab === 'wallet' && !isMenuOpen && !activeContext ? "text-orange-500 scale-110" : "text-stone-400 group-hover:text-stone-600"
                )}>
                    <Wallet size={24} strokeWidth={activeTab === 'wallet' && !isMenuOpen && !activeContext ? 1.8 : 1.5} />
                </div>
                <span className={clsx(
                    "text-[9px] font-medium transition-colors leading-none",
                    activeTab === 'wallet' && !isMenuOpen && !activeContext ? "text-orange-500" : "text-stone-400"
                )}>
                    กระเป๋า
                </span>
            </button>
        </div>
        
        {/* Tab 4: Profile */}
        <div className="flex-1 flex justify-center pb-1">
            <button 
                onClick={() => handleTabClick('profile')} 
                className="flex flex-col items-center gap-0.5 min-w-[50px] group"
            >
                <div className={clsx(
                    "p-1 transition-all duration-300",
                    activeTab === 'profile' && !isMenuOpen && !activeContext ? "text-orange-500 scale-110" : "text-stone-400 group-hover:text-stone-600"
                )}>
                    <User size={24} strokeWidth={activeTab === 'profile' && !isMenuOpen && !activeContext ? 1.8 : 1.5} />
                </div>
                <span className={clsx(
                    "text-[9px] font-medium transition-colors leading-none",
                    activeTab === 'profile' && !isMenuOpen && !activeContext ? "text-orange-500" : "text-stone-400"
                )}>
                    โปรไฟล์
                </span>
            </button>
        </div>
      </div>
    </>
  );
}
import { Home, Search, Compass, MessageCircle, Heart, PlusSquare, User, Menu, Film, MapPin } from 'lucide-react';
import { clsx } from 'clsx';
import { useAuth } from '../../../lib/AuthContext';

interface SidebarProps {
  className?: string;
  onCreateClick?: () => void;
}

export function Sidebar({ className, onCreateClick }: SidebarProps) {
  const { profile } = useAuth();
  const avatarUrl = profile?.avatar_url || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=800';

  const navItems = [
    { icon: Home, label: 'หน้าหลัก', active: true },
    { icon: Search, label: 'ค้นหา' },
    { icon: Compass, label: 'สำรวจ' },
    { icon: Film, label: 'วิดีโอ' },
    { icon: MessageCircle, label: 'ข้อความ' },
    { icon: Heart, label: 'การแจ้งเตือน' },
    { icon: PlusSquare, label: 'สร้าง', action: 'create' },
    { 
      icon: null, 
      label: 'โปรไฟล์', 
      customIcon: profile?.avatar_url ? (
        <img 
          src={profile.avatar_url} 
          alt="โปรไฟล์" 
          className="w-6 h-6 rounded-full object-cover border border-gray-200"
        />
      ) : (
        <User className="w-6 h-6 text-stone-400 dark:text-stone-500" />
      )
    },
  ];

  return (
    <div className={clsx("flex flex-col h-full border-r border-stone-100 bg-white p-3 pt-8 pb-5 fixed w-64 hidden md:flex z-50", className)}>
      <div className="mb-10 px-6">
        <h1 className="font-sans text-3xl font-bold tracking-tighter text-black hidden xl:block">
           RUSHUP<span className="text-orange-600">.</span>
        </h1>
        <div className="xl:hidden p-2 flex justify-center">
             <span className="text-black text-xl font-bold">T<span className="text-orange-600">.</span></span>
        </div>
      </div>
      
      <nav className="flex-1 space-y-1">
        {navItems.map((item) => (
          <a
            key={item.label}
            href="#"
            onClick={(e) => {
              e.preventDefault();
              if (item.action === 'create' && onCreateClick) {
                onCreateClick();
              }
            }}
            className={clsx(
              "flex items-center p-3 rounded-xl transition-all duration-200 group",
              item.active 
                ? "bg-stone-100 text-black font-bold" 
                : "text-stone-500 hover:bg-stone-50 font-medium hover:text-stone-900"
            )}
          >
            <div className="transition-transform duration-200 group-hover:scale-105">
              {item.customIcon ? item.customIcon : (
                <item.icon className={clsx("w-6 h-6", item.active ? "stroke-[2.5px]" : "stroke-2")} />
              )}
            </div>
            <span className={clsx("ml-4 text-base hidden xl:block")}>
              {item.label}
            </span>
          </a>
        ))}
      </nav>

      <div className="mt-auto px-3">
        <a href="#" className="flex items-center p-3 rounded-xl hover:bg-stone-50 transition-colors group text-stone-500 font-medium hover:text-stone-900">
          <Menu className="w-6 h-6" />
          <span className="ml-4 text-base hidden xl:block">เพิ่มเติม</span>
        </a>
      </div>
    </div>
  );
}


import { Home, Search, Compass, MessageCircle, Heart, PlusSquare, User, Menu, Film, MapPin } from 'lucide-react';
import { clsx } from 'clsx';
import { CURRENT_USER } from '../data';

interface SidebarProps {
  className?: string;
}

export function Sidebar({ className }: SidebarProps) {
  const navItems = [
    { icon: Home, label: 'หน้าหลัก', active: true },
    { icon: Search, label: 'ค้นหา' },
    { icon: Compass, label: 'สำรวจ' },
    { icon: Film, label: 'วิดีโอ' },
    { icon: MessageCircle, label: 'ข้อความ' },
    { icon: Heart, label: 'การแจ้งเตือน' },
    { icon: PlusSquare, label: 'สร้าง' },
    { 
      icon: null, 
      label: 'โปรไฟล์', 
      customIcon: (
        <img 
          src={CURRENT_USER.avatarUrl} 
          alt="โปรไฟล์" 
          className="w-6 h-6 rounded-full object-cover border border-gray-200"
        />
      )
    },
  ];

  return (
    <div className={clsx("flex flex-col h-full border-r border-stone-100 bg-white p-3 pt-8 pb-5 fixed w-64 hidden md:flex z-50", className)}>
      <div className="mb-10 px-6">
        <h1 className="font-sans text-3xl font-bold tracking-tighter text-black hidden xl:block">
           Tripnect<span className="text-orange-600">.</span>
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

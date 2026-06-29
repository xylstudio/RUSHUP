import { useState, useRef, useEffect } from 'react';
import { clsx } from 'clsx';
import { Search, UserPlus, Bell, ChevronRight, Pin, Volume2, VolumeX, SlidersHorizontal } from 'lucide-react';
import { CURRENT_USER } from '../data';
import { ChatRoomView } from './ChatRoomView';
import { TabCustomizer, TabConfig } from './TabCustomizer';
import { SwipeableChat, LongPressMenu } from './SwipeableChat';
import { AnimatePresence } from 'framer-motion';

// Mock Data
type ChatCategory = 'all' | 'friends' | 'groups' | 'official' | 'driver' | 'hotel' | 'restaurant';

interface Chat {
    id: number;
    name: string;
    message: string;
    time: string;
    unread: number;
    avatar: string;
    verified: boolean;
    category: ChatCategory;
    pinned?: boolean;
    muted?: boolean;
    isGroup?: boolean;
}

const CHATS: Chat[] = [
  // Pinned
  {
    id: 1,
    name: 'ทริปเชียงใหม่ 2025',
    message: 'อ้อม: พรุ่งนี้เจอกันที่ไหนดี',
    time: '14:23',
    unread: 5,
    avatar: 'https://images.unsplash.com/photo-1598971639058-fab3c3109a00?w=100&h=100&fit=crop',
    verified: false,
    category: 'groups',
    pinned: true,
    isGroup: true
  },
  {
    id: 2,
    name: 'Tripnect Support',
    message: 'ขอบคุณที่ใช้บริการค่ะ 🙏',
    time: '12:30',
    unread: 0,
    avatar: 'https://images.unsplash.com/photo-1599305445671-ac291c95aaa9?w=100&h=100&fit=crop',
    verified: true,
    category: 'official',
    pinned: true
  },
  
  // Drivers
  {
    id: 3,
    name: 'พี่สมชาย - แม่ริม',
    message: 'ผมจอดรออยู่หน้าล็อบบี้แล้วครับ',
    time: '11:45',
    unread: 1,
    avatar: 'https://images.unsplash.com/photo-1633332755192-727a05c4013d?w=100&h=100&fit=crop',
    verified: true,
    category: 'driver'
  },
  {
    id: 4,
    name: 'พี่วิชัย - สันกำแพง',
    message: 'ได้เลยครับ รับไปดอยสุเทพเช้า 8 โมง',
    time: 'เมื่อวาน',
    unread: 0,
    avatar: 'https://images.unsplash.com/photo-1566492031773-4f4e44671857?w=100&h=100&fit=crop',
    verified: true,
    category: 'driver'
  },
  {
    id: 5,
    name: 'คุณประสิทธิ์ - หางดง',
    message: 'รถตู้ 9 ที่นั่งพร้อมแล้วครับ',
    time: 'จันทร์',
    unread: 0,
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop',
    verified: true,
    category: 'driver'
  },
  
  // Hotels
  {
    id: 6,
    name: 'Nimman Maya Hotel',
    message: 'ยืนยันการจองห้อง Superior Room',
    time: '10:15',
    unread: 2,
    avatar: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=100&h=100&fit=crop',
    verified: true,
    category: 'hotel'
  },
  {
    id: 7,
    name: 'Doi Saket Resort',
    message: 'เช็คอินได้ตั้งแต่ 14:00 นะคะ',
    time: 'เมื่อวาน',
    unread: 0,
    avatar: 'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?w=100&h=100&fit=crop',
    verified: true,
    category: 'hotel',
    muted: true
  },
  {
    id: 8,
    name: 'San Kamphaeng Villa',
    message: 'ขอบคุณที่พักกับเราค่ะ ⭐️',
    time: 'อังคาร',
    unread: 0,
    avatar: 'https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?w=100&h=100&fit=crop',
    verified: true,
    category: 'hotel'
  },
  
  // Restaurants
  {
    id: 9,
    name: 'ร้านข้าวซอยแม่สาย',
    message: 'โต๊ะของคุณพร้อมแล้วค่ะ',
    time: '09:30',
    unread: 1,
    avatar: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=100&h=100&fit=crop',
    verified: true,
    category: 'restaurant'
  },
  {
    id: 10,
    name: 'ร้านสวนดอก สันทราย',
    message: 'ขอบคุณสำหรับรีวิว 5 ดาวนะคะ',
    time: 'เมื่อวาน',
    unread: 0,
    avatar: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=100&h=100&fit=crop',
    verified: true,
    category: 'restaurant'
  },
  {
    id: 11,
    name: 'The Chef แม่แตง',
    message: 'จองโต๊ะวันศุกร์ เวลา 19:00 น.',
    time: 'พุธ',
    unread: 0,
    avatar: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=100&h=100&fit=crop',
    verified: true,
    category: 'restaurant'
  },
  
  // Friends
  {
    id: 12,
    name: 'Lisa Guide',
    message: 'ส่งรูปให้ดูแล้วนะคะ',
    time: '08:15',
    unread: 2,
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop',
    verified: false,
    category: 'friends'
  },
  {
    id: 13,
    name: 'Alex',
    message: 'ส่งไฟล์รูปให้แล้วนะครับ',
    time: '15 มี.ค.',
    unread: 0,
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop',
    verified: false,
    category: 'friends'
  },
  {
    id: 14,
    name: 'Kittipong',
    message: 'กำลังไปรับที่จุดนัดพบครับ',
    time: '10 มี.ค.',
    unread: 0,
    avatar: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=100&h=100&fit=crop',
    verified: false,
    category: 'friends'
  },
  
  // More Groups
  {
    id: 15,
    name: 'กลุ่มคนรักการเดินทาง',
    message: 'มี: ใครอยากไปญี่ปุ่นบ้าง',
    time: 'อาทิตย์',
    unread: 0,
    avatar: 'https://images.unsplash.com/photo-1478131143081-80f7f84ca84d?w=100&h=100&fit=crop',
    verified: false,
    category: 'groups',
    isGroup: true
  },
];

const DEFAULT_TABS: TabConfig[] = [
  { id: 'all', label: 'ทั้งหมด', enabled: true, order: 0, locked: true },
  { id: 'friends', label: 'เพื่อน', enabled: true, order: 1 },
  { id: 'groups', label: 'กลุ่ม', enabled: true, order: 2 },
  { id: 'official', label: 'บัญชีทางการ', enabled: true, order: 3 },
  { id: 'driver', label: 'คนขับรถ', enabled: true, order: 4 },
  { id: 'hotel', label: 'โรงแรม', enabled: true, order: 5 },
  { id: 'restaurant', label: 'ร้านอาหาร', enabled: true, order: 6 },
];

interface MailViewProps {
  onOpenSidebar: () => void;
  onSearchClick?: () => void;
  onChatRoomChange?: (isInChatRoom: boolean) => void;
}

export function MailView({ onOpenSidebar, onSearchClick, onChatRoomChange }: MailViewProps) {
  const [activeTab, setActiveTab] = useState<ChatCategory>('all');
  const [selectedChat, setSelectedChat] = useState<Chat | null>(null);
  const [tabConfigs, setTabConfigs] = useState<TabConfig[]>(DEFAULT_TABS);
  const [isCustomizerOpen, setIsCustomizerOpen] = useState(false);
  const [chats, setChats] = useState<Chat[]>(CHATS);
  const [longPressChat, setLongPressChat] = useState<Chat | null>(null);
  const [lockedChatId, setLockedChatId] = useState<number | null>(null);
  const [lockedAction, setLockedAction] = useState<'left' | 'right' | null>(null);

  // Get visible and sorted tabs
  const visibleTabs = tabConfigs
    .filter(tab => tab.enabled)
    .sort((a, b) => a.order - b.order);

  const filteredChats = activeTab === 'all' 
    ? chats 
    : chats.filter(chat => chat.category === activeTab);

  // Chat Actions
  const handleDelete = (chatId: number) => {
    setChats(prevChats => prevChats.filter(c => c.id !== chatId));
  };

  const handleArchive = (chatId: number) => {
    // For now, just remove from list (could move to archive tab)
    setChats(prevChats => prevChats.filter(c => c.id !== chatId));
  };

  const handlePin = (chatId: number) => {
    setChats(prevChats => 
      prevChats.map(c => 
        c.id === chatId ? { ...c, pinned: !c.pinned } : c
      )
    );
  };

  const handleMute = (chatId: number) => {
    setChats(prevChats => 
      prevChats.map(c => 
        c.id === chatId ? { ...c, muted: !c.muted } : c
      )
    );
  };

  const handleLockChange = (chatId: number | null, action: 'left' | 'right' | null) => {
    setLockedChatId(chatId);
    setLockedAction(action);
  };

  // Sort: pinned first, then by time
  const sortedChats = [...filteredChats].sort((a, b) => {
    if (a.pinned && !b.pinned) return -1;
    if (!a.pinned && b.pinned) return 1;
    return 0;
  });

  // Notify parent when chat room state changes
  useEffect(() => {
    onChatRoomChange?.(selectedChat !== null);
  }, [selectedChat, onChatRoomChange]);

  // If chat room is open, show it
  if (selectedChat) {
    return (
      <ChatRoomView
        chatId={selectedChat.id}
        chatName={selectedChat.name}
        chatAvatar={selectedChat.avatar}
        isVerified={selectedChat.verified}
        onBack={() => setSelectedChat(null)}
      />
    );
  }

  return (
    <div className="w-full min-h-screen bg-white flex flex-col">
      
      {/* === LINE-Style Header === */}
      <div className="sticky top-0 z-40 bg-white border-b border-slate-100">
        {/* Top Bar */}
        <div className="flex items-center justify-between px-4 h-14">
          {/* Left: Title */}
          <button 
            onClick={onOpenSidebar}
            className="flex items-center gap-2 active:opacity-70 transition-opacity"
          >
            <img 
              src={CURRENT_USER.avatarUrl} 
              alt="Profile" 
              className="w-8 h-8 rounded-full object-cover border border-slate-200"
            />
            <h1 className="text-[17px] font-bold text-slate-900">ข้อความ</h1>
          </button>

          {/* Right: Icons */}
          <div className="flex items-center gap-1">
            <button 
              onClick={onSearchClick}
              className="w-9 h-9 flex items-center justify-center text-slate-600 hover:text-slate-900 hover:bg-slate-50 rounded-full transition-colors active:scale-95"
            >
              <Search size={20} strokeWidth={2} />
            </button>
            <button className="w-9 h-9 flex items-center justify-center text-slate-600 hover:text-slate-900 hover:bg-slate-50 rounded-full transition-colors active:scale-95">
              <UserPlus size={20} strokeWidth={2} />
            </button>
            <button className="w-9 h-9 flex items-center justify-center text-slate-600 hover:text-slate-900 hover:bg-slate-50 rounded-full transition-colors active:scale-95 relative">
              <Bell size={20} strokeWidth={2} />
              {/* Notification Badge */}
              <div className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full border border-white" />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-100 overflow-x-auto scrollbar-hide">
          {visibleTabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as ChatCategory)}
                className={clsx(
                  "flex-1 min-w-[80px] py-3 text-[14px] font-medium transition-colors relative flex-shrink-0",
                  isActive 
                    ? "text-orange-500" 
                    : "text-slate-500 hover:text-slate-700"
                )}
              >
                {tab.label}
                {isActive && (
                  <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-orange-500" />
                )}
              </button>
            );
          })}
          
          {/* Manage Tabs Button - Hidden behind tabs */}
          <button
            onClick={() => setIsCustomizerOpen(true)}
            className="flex-shrink-0 min-w-[100px] py-3 px-4 text-[14px] font-medium text-orange-500 hover:text-orange-600 hover:bg-orange-50 transition-colors flex items-center justify-center gap-2"
          >
            <SlidersHorizontal size={16} strokeWidth={2} />
            <span>จัดการ</span>
          </button>
        </div>
      </div>

      {/* === Chat List === */}
      <div className="flex-1 overflow-y-auto">
        {sortedChats.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 px-6">
            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-3">
              <Search size={28} className="text-slate-300" />
            </div>
            <p className="text-slate-400 text-sm">ไม่มีแชทในหมวดนี้</p>
          </div>
        ) : (
          <div>
            {sortedChats.map((chat) => (
              <SwipeableChat
                key={chat.id}
                chat={chat}
                onClick={() => setSelectedChat(chat)}
                onDelete={handleDelete}
                onArchive={handleArchive}
                onPin={handlePin}
                onMute={handleMute}
                onLongPress={setLongPressChat}
                lockedChatId={lockedChatId}
                lockedAction={lockedAction}
                onLockChange={handleLockChange}
              />
            ))}
          </div>
        )}
      </div>

      {/* Long Press Menu */}
      <AnimatePresence>
        {longPressChat && (
          <LongPressMenu
            chat={longPressChat}
            isOpen={!!longPressChat}
            onClose={() => setLongPressChat(null)}
            onMute={handleMute}
            onOpenChat={() => setSelectedChat(longPressChat)}
          />
        )}
      </AnimatePresence>

      {/* Tab Customizer Modal */}
      <TabCustomizer
        isOpen={isCustomizerOpen}
        onClose={() => setIsCustomizerOpen(false)}
        tabs={tabConfigs}
        onSave={(newTabs) => {
          setTabConfigs(newTabs);
          // If current tab is hidden, switch to 'all'
          const currentTabStillVisible = newTabs.find(t => t.id === activeTab && t.enabled);
          if (!currentTabStillVisible) {
            setActiveTab('all');
          }
        }}
      />
    </div>
  );
}
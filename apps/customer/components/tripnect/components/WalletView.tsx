import { useState, useEffect, useRef } from 'react';
import { clsx } from 'clsx';
import { 
  Plus, 
  ArrowUpRight, 
  ArrowDown,
  ScanLine, 
  History, 
  Coffee, 
  Car, 
  Plane, 
  ShoppingBag,
  CreditCard,
  Users,
  Receipt,
  Calculator,
  QrCode
} from 'lucide-react';

// Mock Data
const TRANSACTIONS = [
  {
    id: 1,
    title: 'สตาร์บัคส์',
    subtitle: 'ส่วนตัว',
    date: '08:30',
    amount: -145.00,
    type: 'expense',
    category: 'food',
    source: 'personal'
  },
  {
    id: 2,
    title: 'กองกลางทริปหัวหิน',
    subtitle: 'หาร 4 คน',
    date: 'เมื่อวาน',
    amount: -1200.00,
    type: 'expense',
    category: 'travel',
    source: 'shared'
  },
  {
    id: 3,
    title: 'เติมเงินเข้า',
    subtitle: 'K-Bank',
    date: '14 ม.ค.',
    amount: +5000.00,
    type: 'income',
    category: 'topup',
    source: 'personal'
  },
  {
    id: 4,
    title: 'แม็คโคร',
    subtitle: 'ของใช้กองกลาง',
    date: '10 ม.ค.',
    amount: -2560.00,
    type: 'expense',
    category: 'shopping',
    source: 'shared'
  },
  {
    id: 5,
    title: 'ค่าทางด่วน',
    subtitle: 'จ่ายเอง',
    date: '09 ม.ค.',
    amount: -105.00,
    type: 'expense',
    category: 'transport',
    source: 'personal'
  },
  {
    id: 6,
    title: 'ซีฟู้ดบุฟเฟต์',
    subtitle: 'เลี้ยงวันเกิด',
    date: '09 ม.ค.',
    amount: -3990.00,
    type: 'expense',
    category: 'food',
    source: 'shared'
  }
];

// Personal Wallet Actions
const PERSONAL_ACTIONS = [
  { icon: ScanLine, label: 'สแกนจ่าย' },
  { icon: ArrowUpRight, label: 'โอนเงิน' },
  { icon: ArrowDown, label: 'ถอนเงิน' },
  { icon: History, label: 'ประวัติ' },
];

// Shared Wallet Actions (Smart Bill Splitter)
const SHARED_ACTIONS = [
  { icon: Receipt, label: 'เพิ่มบิล' },
  { icon: Calculator, label: 'เคลียร์ยอด' },
  { icon: QrCode, label: 'เรียกเก็บ' },
  { icon: Users, label: 'จัดการคน' },
];

const MEMBERS = [
  'https://images.unsplash.com/photo-1599305445671-ac291c95aaa9?w=100&h=100&fit=crop',
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop',
];

export function WalletView() {
  const [activeCardIndex, setActiveCardIndex] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Detect which card is currently snapped
  const handleScroll = () => {
    if (!scrollRef.current) return;
    const scrollLeft = scrollRef.current.scrollLeft;
    const width = scrollRef.current.offsetWidth;
    // Calculate index based on scroll position (approx)
    const index = Math.round(scrollLeft / (width * 0.8)); // 0.8 factor due to card width ratio
    setActiveCardIndex(index > 2 ? 2 : index); // Cap at max cards
  };

  // Filter transactions based on active card
  const filteredTransactions = TRANSACTIONS.filter(tx => {
    if (activeCardIndex === 0) return tx.source === 'personal';
    if (activeCardIndex === 1) return tx.source === 'shared';
    return false;
  });

  const currentActions = activeCardIndex === 1 ? SHARED_ACTIONS : PERSONAL_ACTIONS;
  const isSharedMode = activeCardIndex === 1;

  return (
    <div className="w-full min-h-screen bg-white pb-32 animate-fade-in font-sans">
      
      {/* Top Padding */}
      <div className={clsx("transition-all duration-500 pt-[60px] md:pt-8")}>
        
        {/* === Cards Carousel === */}
        <div 
            ref={scrollRef}
            onScroll={handleScroll}
            className="flex gap-4 overflow-x-auto pb-8 px-4 snap-x snap-mandatory hide-scrollbar pt-2"
        >
            
            {/* Card 1: Personal */}
            <div className="min-w-[92%] snap-center aspect-[1.8/1] rounded-[24px] bg-gradient-to-tr from-orange-500 to-rose-500 p-7 flex flex-col justify-between relative overflow-hidden shadow-orange-200 shadow-xl">
                <div className="flex items-center gap-3 relative z-10">
                     <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-sm">
                        <CreditCard className="w-4 h-4 text-white" />
                     </div>
                     <span className="text-[15px] font-medium text-white tracking-wide">Tripnect Pay</span>
                </div>
                
                <div className="flex justify-between items-end relative z-10">
                    <h2 className="text-[36px] font-bold tracking-tight leading-none text-white">฿12,450</h2>
                    <button className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center hover:bg-white/30 active:scale-95 transition-all shadow-sm">
                        <Plus className="w-6 h-6 text-white" />
                    </button>
                </div>
            </div>

            {/* Card 2: Shared Trip (Bill Splitter) */}
            <div className="min-w-[92%] snap-center aspect-[1.8/1] rounded-[24px] bg-[#1a1a1a] p-7 flex flex-col justify-between relative overflow-hidden border border-stone-800 shadow-xl">
                {/* Background Pattern */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/10 rounded-bl-full pointer-events-none" />
                
                <div className="flex items-center justify-between relative z-10">
                     <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-orange-500/20 flex items-center justify-center">
                            <Users className="w-4 h-4 text-orange-500" />
                        </div>
                        <span className="text-[15px] font-medium text-stone-200 tracking-wide">ทริปหัวหิน</span>
                     </div>
                     {/* Debt Indicator */}
                     <div className="px-2 py-1 rounded-md bg-red-500/20 border border-red-500/30 text-red-400 text-[10px] font-bold">
                        ติดลบ ฿350
                     </div>
                </div>

                <div className="flex justify-between items-end relative z-10">
                    <div>
                        <span className="text-stone-400 text-xs mb-1 block">ยอดคงเหลือรวม</span>
                        <h2 className="text-[36px] font-bold tracking-tight leading-none text-white">฿1,800</h2>
                    </div>
                    
                    <div className="flex -space-x-2.5">
                        {MEMBERS.map((src, i) => (
                            <img key={i} src={src} className="w-8 h-8 rounded-full border-[2px] border-[#1a1a1a] object-cover bg-stone-800" />
                        ))}
                         <button className="w-8 h-8 rounded-full bg-stone-800 border-[2px] border-[#1a1a1a] flex items-center justify-center text-stone-400 hover:text-white hover:bg-stone-700 transition-colors">
                            <Plus className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </div>
            
            {/* Add New (Ghost Card) */}
             <div className="min-w-[92%] snap-center aspect-[1.8/1] rounded-[24px] flex flex-col items-center justify-center p-6 relative group cursor-pointer">
                <div className="absolute inset-0 border-2 border-dashed border-stone-200 rounded-[24px] bg-stone-50/40 group-hover:border-stone-300 transition-colors" />
                
                <div className="relative z-10 flex flex-col items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-white shadow-sm flex items-center justify-center text-stone-400 group-hover:scale-110 transition-transform">
                        <Plus className="w-6 h-6" />
                    </div>
                    <span className="text-[14px] font-medium text-stone-500">เปิดทริปใหม่</span>
                </div>
            </div>
        </div>

        {/* === Contextual Actions === */}
        <div className="flex justify-around items-start px-2 mb-8 animate-fade-in-up" key={activeCardIndex}>
            {currentActions.map((action, index) => (
                <button key={index} className="flex flex-col items-center gap-2.5 group w-1/4">
                    <div className={clsx(
                        "w-14 h-14 rounded-[20px] border flex items-center justify-center transition-all shadow-sm",
                        isSharedMode 
                            ? "bg-[#1a1a1a] border-stone-800 text-stone-400 group-hover:text-orange-400 group-hover:border-orange-500/50"
                            : "bg-stone-50 border-stone-100 text-stone-500 group-hover:border-orange-200 group-hover:text-orange-600"
                    )}>
                        <action.icon className="w-6 h-6" strokeWidth={1.5} />
                    </div>
                    <span className="text-[12px] font-medium transition-colors text-stone-500 group-hover:text-stone-800">
                        {action.label}
                    </span>
                </button>
            ))}
        </div>

        {/* === Filtered Transaction List === */}
        <div className="flex flex-col px-6 min-h-[300px]">
            <h3 className="text-[13px] font-bold text-stone-400 mb-4 uppercase tracking-wider flex items-center justify-between">
                {isSharedMode ? 'รายการหารล่าสุด' : 'รายการล่าสุด'}
                {isSharedMode && <span className="text-orange-500 text-[10px] bg-orange-50 px-2 py-0.5 rounded-full">ค้างจ่าย 2 รายการ</span>}
            </h3>
            
            {filteredTransactions.length > 0 ? (
                filteredTransactions.map((tx) => (
                    <div key={tx.id} className="flex items-center gap-4 py-4 border-b border-stone-50 last:border-none group cursor-pointer hover:bg-stone-50/50 -mx-2 px-2 rounded-xl transition-colors animate-fade-in">
                        <div className={clsx(
                            "w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 transition-colors",
                            tx.source === 'shared' 
                                ? "bg-stone-100 text-stone-600" 
                                : "bg-orange-50 text-orange-500"
                        )}>
                            {getCategoryIcon(tx.category)}
                        </div>

                        <div className="flex-1 min-w-0">
                            <div className="flex justify-between items-center mb-1">
                                <h4 className="text-[15px] font-medium text-stone-900 truncate">
                                    {tx.title}
                                </h4>
                                <span className={clsx(
                                    "text-[15px] font-semibold whitespace-nowrap",
                                    tx.type === 'income' ? "text-emerald-600" : "text-stone-900"
                                )}>
                                    {tx.type === 'income' ? '+' : ''}{Math.abs(tx.amount).toLocaleString()}
                                </span>
                            </div>
                            <div className="flex justify-between items-center text-[12px] text-stone-400">
                                 <span>{tx.subtitle}</span>
                                 <span>{tx.date}</span>
                            </div>
                        </div>
                    </div>
                ))
            ) : (
                <div className="py-10 text-center text-stone-400 text-sm">
                    ไม่มีรายการในหน้านี้
                </div>
            )}
        </div>
      </div>
    </div>
  );
}

function getCategoryIcon(category: string) {
    switch (category) {
        case 'food': return <Coffee className="w-5 h-5" />;
        case 'transport': return <Car className="w-5 h-5" />;
        case 'travel': return <Plane className="w-5 h-5" />; 
        case 'shopping': return <ShoppingBag className="w-5 h-5" />;
        case 'topup': return <ArrowUpRight className="w-5 h-5" />;
        default: return <Plus className="w-5 h-5" />;
    }
}

import { motion, AnimatePresence } from 'framer-motion';
import { X, Search, Calendar, User, MapPin, ArrowLeft, Star, Bed, Filter, Heart, ChevronDown } from 'lucide-react';
import { useState, useEffect } from 'react';
import { ImageWithFallback } from './figma/ImageWithFallback';

interface HotelModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function HotelModal({ isOpen, onClose }: HotelModalProps) {
  const [step, setStep] = useState<'search' | 'list'>('search');

  useEffect(() => {
    if (isOpen) setStep('search');
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSearch = () => {
      setStep('list');
  };

  const recentSearches = [
      { city: 'กรุงเทพฯ', dates: '17-18 ม.ค.', guests: 'ผู้ใหญ่ 2' },
      { city: 'พัทยา', dates: '24-25 ม.ค.', guests: 'ผู้ใหญ่ 2, เด็ก 1' },
      { city: 'เชียงใหม่', dates: '10-12 ก.พ.', guests: 'ผู้ใหญ่ 2' },
  ];

  const popularDestinations = [
      { name: 'กรุงเทพฯ', image: 'https://images.unsplash.com/photo-1583417319070-4a69db38a482?auto=format&fit=crop&q=80&w=200', hotels: '2,400+ ที่พัก' },
      { name: 'ภูเก็ต', image: 'https://images.unsplash.com/photo-1589394815804-964ed0be2eb5?auto=format&fit=crop&q=80&w=200', hotels: '1,800+ ที่พัก' },
      { name: 'โตเกียว', image: 'https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?auto=format&fit=crop&q=80&w=200', hotels: '1,200+ ที่พัก' },
      { name: 'สิงคโปร์', image: 'https://images.unsplash.com/photo-1565967511849-76a60a516170?auto=format&fit=crop&q=80&w=200', hotels: '800+ ที่พัก' },
  ];

  const hotelList = [
      { 
          id: 1, 
          name: 'The Standard, Bangkok Mahanakhon', 
          rating: 4.8, 
          reviews: 1240,
          location: 'สีลม, กรุงเทพฯ',
          price: 7500,
          originalPrice: 9800,
          image: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&q=80&w=600',
          tags: ['หรูหรา', 'วิวเมือง', 'สระว่ายน้ำ']
      },
      { 
          id: 2, 
          name: 'Grande Centre Point Terminal 21', 
          rating: 4.6, 
          reviews: 3500,
          location: 'สุขุมวิท, กรุงเทพฯ',
          price: 4200,
          originalPrice: 5500,
          image: 'https://images.unsplash.com/photo-1582719508461-905c673771fd?auto=format&fit=crop&q=80&w=600',
          tags: ['ช้อปปิ้ง', 'ติด BTS']
      },
      { 
          id: 3, 
          name: 'Mandarin Oriental Bangkok', 
          rating: 4.9, 
          reviews: 890,
          location: 'ริมแม่น้ำ, กรุงเทพฯ',
          price: 18500,
          originalPrice: 22000,
          image: 'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&q=80&w=600',
          tags: ['ริมแม่น้ำ', 'ประวัติศาสตร์', 'สปา']
      },
      { 
        id: 4, 
        name: 'Kimpton Maa-Lai Bangkok', 
        rating: 4.7, 
        reviews: 1100,
        location: 'ปทุมวัน, กรุงเทพฯ',
        price: 8200,
        originalPrice: 10500,
        image: 'https://images.unsplash.com/photo-1571896349842-68c894913d3b?auto=format&fit=crop&q=80&w=600',
        tags: ['สัตว์เลี้ยงเข้าได้', 'พื้นที่สีเขียว']
    },
  ];

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: '0%' }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        className="fixed inset-0 z-[50] flex flex-col bg-stone-50 overflow-hidden pb-[88px]"
      >
        {/* --- Header --- */}
        <div className="bg-white px-4 pt-[calc(3rem+env(safe-area-inset-top))] pb-4 flex items-center justify-between sticky top-0 z-30 shadow-sm">
            {step === 'list' ? (
                <button onClick={() => setStep('search')} className="w-10 h-10 -ml-2 flex items-center justify-center text-slate-800 active:scale-95 transition-transform">
                    <ArrowLeft size={24} strokeWidth={2} />
                </button>
            ) : (
                <button onClick={onClose} className="w-10 h-10 -ml-2 flex items-center justify-center text-slate-800 active:scale-95 transition-transform">
                    <X size={24} strokeWidth={2} />
                </button>
            )}
            
            <span className="text-lg font-bold text-slate-900">
                {step === 'search' ? 'จองที่พัก' : 'กรุงเทพมหานคร'}
            </span>

            <div className="w-10 h-10" /> {/* Spacer */}
        </div>

        {/* --- Content --- */}
        <div className="flex-1 overflow-y-auto">
            {step === 'search' ? (
                /* --- STEP 1: Search Form (Trip.com Style) --- */
                <div className="p-4 pb-32 animate-in fade-in slide-in-from-bottom-4 duration-300">
                    {/* Main Search Card */}
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5 mb-6">
                        
                        {/* Destination */}
                        <div className="border-b border-slate-100 pb-4 mb-4">
                            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1.5 block">ปลายทาง</label>
                            <div className="flex items-center gap-3">
                                <Search className="text-slate-900" size={20} strokeWidth={2.5} />
                                <input 
                                    type="text" 
                                    placeholder="คุณอยากไปพักที่ไหน?" 
                                    className="w-full text-lg font-bold text-slate-900 placeholder:text-slate-300 outline-none"
                                    defaultValue="กรุงเทพฯ, ไทย"
                                />
                            </div>
                        </div>

                        {/* Dates */}
                        <div className="flex gap-4 border-b border-slate-100 pb-4 mb-4">
                            <div className="flex-1">
                                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1.5 block">เช็คอิน</label>
                                <span className="text-base font-bold text-slate-900 block">ส. 17 ม.ค.</span>
                            </div>
                            <div className="w-[1px] bg-slate-100" />
                            <div className="flex-1">
                                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1.5 block">เช็คเอาท์</label>
                                <span className="text-base font-bold text-slate-900 block">อา. 18 ม.ค.</span>
                            </div>
                        </div>

                        {/* Guests */}
                        <div className="mb-6">
                            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1.5 block">ห้องพักและผู้เข้าพัก</label>
                            <div className="flex items-center gap-3">
                                <User className="text-slate-900" size={20} strokeWidth={2.5} />
                                <span className="text-lg font-bold text-slate-900">1 ห้อง, ผู้ใหญ่ 2 ท่าน</span>
                            </div>
                        </div>

                        {/* Search Button */}
                        <button 
                            onClick={handleSearch}
                            className="w-full h-12 bg-orange-500 hover:bg-orange-600 active:scale-[0.98] text-white rounded-xl flex items-center justify-center gap-2 font-bold text-base shadow-lg shadow-orange-200 transition-all"
                        >
                            ค้นหาที่พัก
                        </button>
                    </div>

                    {/* Recent Searches */}
                    <div className="mb-8">
                        <div className="flex items-center justify-between mb-3 px-1">
                            <h3 className="text-sm font-bold text-slate-900">การค้นหาล่าสุด</h3>
                            <button className="text-xs font-medium text-orange-600">ล้าง</button>
                        </div>
                        <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2">
                            {recentSearches.map((item, i) => (
                                <button key={i} onClick={handleSearch} className="flex-shrink-0 bg-white border border-slate-100 rounded-xl p-3 min-w-[140px] text-left hover:border-orange-200 transition-colors">
                                    <span className="block text-sm font-bold text-slate-900 mb-0.5">{item.city}</span>
                                    <span className="block text-xs text-slate-500">{item.dates}</span>
                                    <span className="block text-xs text-slate-400">{item.guests}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Popular Destinations */}
                    <div>
                        <h3 className="text-sm font-bold text-slate-900 mb-3 px-1">จุดหมายยอดนิยม</h3>
                        <div className="grid grid-cols-2 gap-3">
                            {popularDestinations.map((place, i) => (
                                <div key={i} onClick={handleSearch} className="relative aspect-[4/3] rounded-xl overflow-hidden cursor-pointer group">
                                    <ImageWithFallback src={place.image} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                                    <div className="absolute bottom-3 left-3 text-white">
                                        <span className="block text-sm font-bold shadow-black drop-shadow-sm">{place.name}</span>
                                        <span className="block text-[10px] opacity-80">{place.hotels}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            ) : (
                /* --- STEP 2: Hotel List --- */
                <div className="bg-stone-50 min-h-full animate-in slide-in-from-right duration-300">
                    {/* Filters Bar */}
                    <div className="bg-white px-4 py-3 border-b border-slate-100 flex gap-2 overflow-x-auto no-scrollbar sticky top-0 z-20">
                         <button className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-50 text-orange-600 rounded-full text-xs font-bold whitespace-nowrap border border-orange-100">
                            <Filter size={14} /> ตัวกรอง
                         </button>
                         <button className="px-3 py-1.5 bg-white text-slate-600 border border-slate-200 rounded-full text-xs font-medium whitespace-nowrap">ราคา</button>
                         <button className="px-3 py-1.5 bg-white text-slate-600 border border-slate-200 rounded-full text-xs font-medium whitespace-nowrap">ดาว</button>
                         <button className="px-3 py-1.5 bg-white text-slate-600 border border-slate-200 rounded-full text-xs font-medium whitespace-nowrap">ทำเล</button>
                    </div>

                    {/* List */}
                    <div className="p-4 space-y-4 pb-32">
                        {hotelList.map((hotel) => (
                            <div key={hotel.id} className="bg-white rounded-xl overflow-hidden shadow-sm border border-slate-100 flex flex-col">
                                {/* Image */}
                                <div className="relative h-48 w-full">
                                    <ImageWithFallback src={hotel.image} className="w-full h-full object-cover" />
                                    <button className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/20 backdrop-blur-sm flex items-center justify-center text-white hover:bg-black/40 transition-colors">
                                        <Heart size={16} />
                                    </button>
                                    <div className="absolute bottom-3 left-3 bg-white/90 backdrop-blur px-2 py-1 rounded text-[10px] font-bold text-slate-900 flex items-center gap-1">
                                        <Star size={10} className="fill-orange-400 text-orange-400" />
                                        {hotel.rating} ดีเยี่ยม
                                    </div>
                                </div>

                                {/* Content */}
                                <div className="p-3">
                                    <div className="flex justify-between items-start mb-1">
                                        <h3 className="text-base font-bold text-slate-900 line-clamp-2 leading-tight flex-1 mr-2">{hotel.name}</h3>
                                    </div>
                                    
                                    <div className="flex items-center gap-1 text-slate-500 mb-3">
                                        <MapPin size={12} />
                                        <span className="text-xs">{hotel.location}</span>
                                    </div>

                                    {/* Tags */}
                                    <div className="flex gap-1.5 mb-3 flex-wrap">
                                        {hotel.tags.map(tag => (
                                            <span key={tag} className="text-[10px] px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded-md font-medium">{tag}</span>
                                        ))}
                                    </div>

                                    {/* Price Footer */}
                                    <div className="flex items-end justify-between mt-auto pt-2 border-t border-slate-50">
                                        <div className="text-[10px] text-green-600 font-bold bg-green-50 px-1.5 py-0.5 rounded">
                                            ยกเลิกฟรี
                                        </div>
                                        <div className="text-right">
                                            <span className="text-xs text-slate-400 line-through mr-1">฿{hotel.originalPrice.toLocaleString()}</span>
                                            <span className="text-lg font-bold text-orange-600">฿{hotel.price.toLocaleString()}</span>
                                            <span className="block text-[10px] text-slate-400">ต่อคืน, รวมภาษีแล้ว</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
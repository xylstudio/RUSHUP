import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, MapPin, Navigation, Clock, Bike, Car, Users,
  Home, Building2, Search, ChevronRight, Zap, Star, ArrowRight
} from 'lucide-react';
import { ImageWithFallback } from './figma/ImageWithFallback';

interface RideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// Types
interface Location {
  name: string;
  address: string;
  distance?: string;
  type: 'saved' | 'recent';
}

interface RideOption {
  id: string;
  name: string;
  icon: any;
  time: string;
  price: number;
  capacity: string;
  discount?: string;
  popular?: boolean;
  rating?: number;
}

// Mock data
const SAVED_LOCATIONS: Location[] = [
  { name: 'บ้าน', address: 'นิมมานเหมินทร์ ซอย 5', type: 'saved' },
  { name: 'ที่ทำงาน', address: 'เซ็นทรัลเฟสติวัล เชียงใหม่', type: 'saved' },
];

const RECENT_LOCATIONS: Location[] = [
  { name: 'ท่าแพ', address: 'ถนนท่าแพ ประตูท่าแพ', distance: '2.3 km', type: 'recent' },
  { name: 'ถนนคนเดินวันอาทิตย์', address: 'ถนนราชดำเนิน', distance: '3.1 km', type: 'recent' },
  { name: 'ดอยสุเทพ', address: 'วัดพระธาตุดอยสุเทพ', distance: '8.5 km', type: 'recent' },
  { name: 'นิมมาน', address: 'ถนนนิมมานเหมินทร์', distance: '1.8 km', type: 'recent' },
  { name: 'เซ็นทรัลเฟสติวัล', address: 'ห้างสรรพสินค้า', distance: '4.2 km', type: 'recent' },
  { name: 'ตลาดวโรรส', address: 'ตลาดดอกไม้สด', distance: '2.9 km', type: 'recent' },
];

const RIDE_OPTIONS: RideOption[] = [
  { 
    id: 'bike', 
    name: 'มอเตอร์ไซค์',
    icon: Bike, 
    time: '3 นาที', 
    price: 45,
    capacity: '1 ที่นั่ง',
    discount: 'ลด 20%',
    popular: true,
    rating: 4.9
  },
  { 
    id: 'car', 
    name: 'รถยนต์',
    icon: Car, 
    time: '5 นาที', 
    price: 85,
    capacity: '4 ที่นั่ง',
    rating: 4.8
  },
  { 
    id: 'van', 
    name: 'รถตู้',
    icon: Users, 
    time: '8 นาที', 
    price: 150,
    capacity: '6-8 ที่นั่ง',
    rating: 4.7
  },
];

export function RideModal({ isOpen, onClose }: RideModalProps) {
  const [view, setView] = useState<'home' | 'booking'>('home');
  const [pickup] = useState('ตำแหน่งปัจจุบัน');
  const [dropoff, setDropoff] = useState('');
  const [selectedRide, setSelectedRide] = useState<string>('bike');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (isOpen) {
      setView('home');
      setDropoff('');
      setSearchQuery('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSelectLocation = (location: Location) => {
    setDropoff(location.name);
    setView('booking');
  };

  const handleBack = () => {
    if (view === 'booking') {
      setView('home');
      setDropoff('');
    } else {
      onClose();
    }
  };

  const selectedRideData = RIDE_OPTIONS.find(r => r.id === selectedRide);
  const filteredLocations = [...SAVED_LOCATIONS, ...RECENT_LOCATIONS].filter(loc =>
    loc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    loc.address.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // HOME VIEW - Search & Select Destination
  const HomeView = () => (
    <div className="flex flex-col h-full bg-stone-50 pb-[100px]">
      {/* Header */}
      <div className="bg-white px-4 pt-[calc(3rem+env(safe-area-inset-top))] pb-4 sticky top-0 z-30 shadow-sm border-b border-stone-100">
        <div className="flex items-center justify-between mb-4">
          <button 
            onClick={onClose} 
            className="w-10 h-10 -ml-2 flex items-center justify-center text-stone-800 active:scale-95 transition-transform hover:bg-stone-50 rounded-full"
          >
            <X size={22} strokeWidth={2.5} />
          </button>
          <h1 className="text-xl font-bold text-stone-900">เรียกรถ</h1>
          <div className="w-10" />
        </div>

        {/* Search Bar */}
        <div className="flex items-center gap-3 px-4 py-3 bg-stone-100 rounded-[20px]">
          <Search size={20} className="text-stone-400" strokeWidth={2} />
          <input
            type="text"
            placeholder="คุณจะไปไหน?"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 bg-transparent text-[15px] text-stone-900 placeholder:text-stone-400 outline-none"
          />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {/* Current Location */}
        <div className="px-4 pt-4 pb-2">
          <div className="flex items-center gap-3 p-3 bg-white rounded-xl border border-stone-200">
            <div className="w-10 h-10 bg-orange-50 rounded-full flex items-center justify-center shrink-0">
              <Navigation size={18} className="text-orange-500" strokeWidth={2.5} />
            </div>
            <div className="flex-1">
              <div className="text-[11px] font-bold text-stone-400 uppercase tracking-wider mb-0.5">จุดรับ</div>
              <div className="text-[15px] font-semibold text-stone-900">{pickup}</div>
            </div>
          </div>
        </div>

        {/* Saved Places */}
        {SAVED_LOCATIONS.length > 0 && (
          <div className="px-4 pt-4 pb-2">
            <h3 className="text-[11px] font-bold text-stone-400 uppercase tracking-[0.1em] mb-3 px-1">
              สถานที่บันทึกไว้
            </h3>
            <div className="space-y-2">
              {SAVED_LOCATIONS.map((loc, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSelectLocation(loc)}
                  className="w-full flex items-center gap-3 p-3 bg-white hover:bg-stone-50 rounded-xl transition-colors border border-transparent hover:border-orange-100 group"
                >
                  <div className="w-10 h-10 bg-stone-100 group-hover:bg-orange-50 rounded-xl flex items-center justify-center shrink-0 transition-colors">
                    {loc.name === 'บ้าน' ? (
                      <Home size={18} className="text-stone-600 group-hover:text-orange-500 transition-colors" strokeWidth={2} />
                    ) : (
                      <Building2 size={18} className="text-stone-600 group-hover:text-orange-500 transition-colors" strokeWidth={2} />
                    )}
                  </div>
                  <div className="flex-1 text-left">
                    <div className="text-[15px] font-semibold text-stone-900">{loc.name}</div>
                    <div className="text-[13px] text-stone-500">{loc.address}</div>
                  </div>
                  <ChevronRight size={18} className="text-stone-300 group-hover:text-orange-500 transition-colors" />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Recent Places */}
        <div className="px-4 pt-4 pb-6">
          <h3 className="text-[11px] font-bold text-stone-400 uppercase tracking-[0.1em] mb-3 px-1">
            สถานที่ล่าสุด
          </h3>
          <div className="space-y-2">
            {RECENT_LOCATIONS.map((loc, idx) => (
              <button
                key={idx}
                onClick={() => handleSelectLocation(loc)}
                className="w-full flex items-center gap-3 p-3 bg-white hover:bg-stone-50 rounded-xl transition-colors border border-transparent hover:border-orange-100 group"
              >
                <div className="w-10 h-10 bg-stone-50 rounded-xl flex items-center justify-center shrink-0">
                  <MapPin size={18} className="text-stone-500 group-hover:text-orange-500 transition-colors" strokeWidth={2} />
                </div>
                <div className="flex-1 text-left">
                  <div className="text-[15px] font-semibold text-stone-900">{loc.name}</div>
                  <div className="text-[13px] text-stone-500">{loc.address}</div>
                </div>
                {loc.distance && (
                  <div className="text-[13px] text-stone-400 font-medium">{loc.distance}</div>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  // BOOKING VIEW - Select Ride Type
  const BookingView = () => (
    <div className="flex flex-col h-full bg-stone-50 pb-[100px]">
      {/* Header */}
      <div className="bg-white px-4 pt-[calc(3rem+env(safe-area-inset-top))] pb-4 sticky top-0 z-30 shadow-sm border-b border-stone-100">
        <div className="flex items-center justify-between mb-4">
          <button 
            onClick={handleBack} 
            className="w-10 h-10 -ml-2 flex items-center justify-center text-stone-800 active:scale-95 transition-transform hover:bg-stone-50 rounded-full"
          >
            <X size={22} strokeWidth={2.5} />
          </button>
          <h1 className="text-xl font-bold text-stone-900">จองรถ</h1>
          <div className="w-10" />
        </div>

        {/* Trip Summary */}
        <div className="bg-stone-100 rounded-[20px] p-4 space-y-2">
          <div className="flex items-center gap-3">
            <div className="w-2.5 h-2.5 rounded-full bg-orange-500 shrink-0" />
            <div className="flex-1">
              <div className="text-[11px] font-bold text-stone-400 uppercase tracking-wider mb-0.5">จุดรับ</div>
              <div className="text-[14px] font-semibold text-stone-900">{pickup}</div>
            </div>
          </div>
          <div className="h-px bg-stone-200 ml-5" />
          <div className="flex items-center gap-3">
            <MapPin size={16} className="text-orange-500 shrink-0" strokeWidth={2.5} />
            <div className="flex-1">
              <div className="text-[11px] font-bold text-stone-400 uppercase tracking-wider mb-0.5">จุดหมาย</div>
              <div className="text-[14px] font-semibold text-stone-900">{dropoff}</div>
            </div>
            <button
              onClick={() => setView('home')}
              className="text-[13px] font-bold text-orange-500 hover:text-orange-600"
            >
              เปลี่ยน
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {/* Mini Map Preview */}
        <div className="mx-4 mt-4 rounded-2xl overflow-hidden h-48 relative">
          <ImageWithFallback 
            src="https://images.unsplash.com/photo-1524661135-423995f22d0b?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxtYXAlMjBjaXR5JTIwc3RyZWV0JTIwdG9wJTIwdmlld3xlbnwxfHx8fDE3Njg3MTcyOTF8MA&ixlib=rb-4.1.0&q=80&w=1080"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
          
          {/* Distance & Time Badge */}
          <div className="absolute bottom-3 left-3 flex gap-2">
            <div className="px-3 py-1.5 bg-white/90 backdrop-blur-sm rounded-full flex items-center gap-1.5">
              <Clock size={14} className="text-stone-600" />
              <span className="text-[13px] font-bold text-stone-900">12 นาที</span>
            </div>
            <div className="px-3 py-1.5 bg-white/90 backdrop-blur-sm rounded-full">
              <span className="text-[13px] font-bold text-stone-900">3.4 km</span>
            </div>
          </div>
        </div>

        {/* Ride Options */}
        <div className="px-4 pt-6 pb-4">
          <h3 className="text-[11px] font-bold text-stone-400 uppercase tracking-[0.1em] mb-3 px-1">
            เลือกประเภทรถ
          </h3>
          <div className="space-y-3">
            {RIDE_OPTIONS.map((option) => {
              const isSelected = selectedRide === option.id;
              return (
                <button
                  key={option.id}
                  onClick={() => setSelectedRide(option.id)}
                  className={`w-full flex items-center gap-4 p-4 rounded-[20px] border-2 transition-all group ${
                    isSelected
                      ? 'bg-orange-50 border-orange-500'
                      : 'bg-white border-stone-200 hover:border-stone-300'
                  }`}
                >
                  {/* Icon */}
                  <div className={`w-14 h-14 rounded-[16px] flex items-center justify-center shrink-0 transition-colors ${
                    isSelected ? 'bg-orange-500' : 'bg-stone-100 group-hover:bg-stone-200'
                  }`}>
                    <option.icon 
                      size={26} 
                      className={isSelected ? 'text-white' : 'text-stone-600'}
                      strokeWidth={2}
                    />
                  </div>

                  {/* Info */}
                  <div className="flex-1 text-left">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[16px] font-bold text-stone-900">{option.name}</span>
                      {option.popular && (
                        <span className="px-2 py-0.5 bg-orange-500 text-white text-[10px] font-bold uppercase tracking-wider rounded-full">
                          ยอดนิยม
                        </span>
                      )}
                      {option.discount && (
                        <span className="px-2 py-0.5 bg-green-500 text-white text-[10px] font-bold rounded-full">
                          {option.discount}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-[13px] text-stone-500 mb-1">
                      <span className="flex items-center gap-1">
                        <Clock size={12} />
                        {option.time}
                      </span>
                      <span>•</span>
                      <span>{option.capacity}</span>
                      {option.rating && (
                        <>
                          <span>•</span>
                          <span className="flex items-center gap-1">
                            <Star size={12} className="text-amber-400 fill-amber-400" />
                            {option.rating}
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Price */}
                  <div className="text-right">
                    <div className="text-[20px] font-bold text-stone-900">฿{option.price}</div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Promo Card */}
        <div className="px-4 pb-6">
          <button className="w-full flex items-center justify-between p-4 bg-gradient-to-r from-orange-50 to-amber-50 rounded-[20px] border border-orange-200 hover:border-orange-300 transition-colors group">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shrink-0">
                <Zap size={20} className="text-orange-500" />
              </div>
              <div className="text-left">
                <div className="text-[15px] font-semibold text-stone-900">ใช้โค้ดส่วนลด</div>
                <div className="text-[13px] text-orange-600">ประหยัดได้สูงสุด ฿50</div>
              </div>
            </div>
            <ChevronRight size={20} className="text-stone-400 group-hover:text-orange-500 transition-colors" />
          </button>
        </div>
      </div>

      {/* Booking Button - Fixed Bottom */}
      <div className="fixed bottom-[80px] left-0 right-0 px-4 pb-4 bg-white border-t border-stone-100 z-20">
        <button 
          className="w-full h-14 bg-stone-900 hover:bg-stone-800 text-white rounded-full font-semibold text-[15px] transition-all active:scale-[0.98] flex items-center justify-center gap-2"
        >
          <span>จองเลย</span>
          {selectedRideData && (
            <>
              <span>•</span>
              <span>฿{selectedRideData.price}</span>
            </>
          )}
          <ArrowRight size={20} className="ml-1" />
        </button>
      </div>
    </div>
  );

  return (
    <AnimatePresence>
      <motion.div
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', damping: 30, stiffness: 300 }}
        className="fixed inset-0 z-[100] bg-white"
      >
        {view === 'home' ? <HomeView /> : <BookingView />}
      </motion.div>
    </AnimatePresence>
  );
}
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Menu, MapPin, Search, Calendar, User, 
  Car, Users, Map, Clock, DollarSign
} from 'lucide-react';

// Types
interface Location {
  name: string;
  address: string;
  district: string;
}

// Mock data - Chiang Mai popular locations
const POPULAR_LOCATIONS: Location[] = [
  { name: 'ศูนย์บุญธรรม ตาดิง เสลิง เฉลิมราช 60 ปี', address: '91, Sam Ran Rat, Chiang Mai, ทางหลวงหมายเลข...', district: 'เมืองเชียงใหม่' },
  { name: 'เซ็นทรัล เฟสติวัล เชียงใหม่', address: 'ทางหลวงหมายเลข 11, ฟ้าฮ่าม, เมืองเชียงใหม่, เชี...', district: 'เมืองเชียงใหม่' },
  { name: 'เทสโก้ โลตัส ค้าเที่ยง', address: 'ทางหลวงหมายเลข 11, ปางปู, เมืองเชียงใหม่, เชีย...', district: 'เมืองเชียงใหม่' },
];

const SERVICE_OPTIONS = [
  { id: 'schedule', title: 'จองรถ', subtitle: 'ล่วงหน้า', icon: Calendar, color: 'from-blue-400 to-blue-500', emoji: '📅' },
  { id: 'family', title: 'เรียกรถให้', subtitle: 'ครอบครัว', icon: User, color: 'from-amber-400 to-amber-500', emoji: '👨‍👩‍👧' },
  { id: 'economy', title: 'รถยนต์แบบ', subtitle: 'ประหยัด', icon: Car, color: 'from-cyan-400 to-cyan-500', emoji: '🚗' },
  { id: 'driver', title: 'เช่าสดพร้อม', subtitle: 'คนขับ', icon: Users, color: 'from-orange-400 to-orange-500', emoji: '🧑‍✈️' },
];

export function RideBookingView({ onClose }: { onClose?: () => void }) {
  const [searchQuery, setSearchQuery] = useState('');

  return (
    <div className="fixed inset-0 bg-gradient-to-b from-orange-50 to-white z-[250] flex flex-col">
      {/* Header - Same as Home */}
      <div className="w-full bg-white z-30 flex flex-col transition-all duration-300 shadow-sm">
        <div className="grid grid-cols-3 items-center px-4 h-[60px] flex-shrink-0 relative z-20">
          {/* Menu Icon */}
          <div className="flex justify-start">
            <button onClick={onClose} className="relative group active:scale-95 transition-transform">
              <Menu size={24} className="text-stone-900" strokeWidth={2} />
            </button>
          </div>

          {/* Logo */}
          <div className="flex justify-center items-center h-full flex-1">
            <h1 className="font-sans text-xl font-black tracking-tighter text-slate-900">
              Tripnect<span className="text-orange-500">.</span>
            </h1>
          </div>

          {/* Search Icon */}
          <div className="flex justify-end">
            <button className="w-10 h-10 flex items-center justify-center text-slate-800 hover:text-orange-500 transition-colors rounded-full hover:bg-orange-50">
              <Search className="w-5 h-5" strokeWidth={2} />
            </button>
          </div>
        </div>
      </div>

      {/* Banner Section */}
      <div className="bg-gradient-to-r from-orange-400 to-orange-500 pt-4 pb-4 px-4">
        <div className="bg-white/95 backdrop-blur-sm rounded-2xl p-4 shadow-lg flex items-center justify-between">
          <div>
            <h2 className="text-orange-600 font-bold text-lg">Tripnect Saver</h2>
            <p className="text-gray-600 text-sm">ราคาใหม่! ถูกกว่าวิส</p>
          </div>
          <div className="relative w-24 h-24 bg-gradient-to-br from-orange-100 to-orange-200 rounded-xl flex items-center justify-center">
            <span className="text-5xl">🏍️</span>
          </div>
        </div>
      </div>

      {/* Main Content - Bottom Sheet */}
      <div className="relative z-20 flex-1 flex flex-col justify-end pointer-events-none">
        <motion.div 
          initial={{ y: 100 }}
          animate={{ y: 0 }}
          className="bg-white rounded-t-3xl shadow-2xl pointer-events-auto cursor-grab active:cursor-grabbing"
          drag="y"
          dragConstraints={{ top: 0, bottom: 0 }}
          dragElastic={{ top: 0, bottom: 0.3 }}
          dragTransition={{ power: 0.1, timeConstant: 200, bounceStiffness: 400, bounceDamping: 30 }}
          onDragEnd={(e, info) => {
            if (info.offset.y > 150 && onClose) {
              onClose();
            }
          }}
        >
          {/* Handle Bar */}
          <div className="flex justify-center pt-2 pb-1">
            <div className="w-10 h-1 bg-slate-300 rounded-full"></div>
          </div>

          <div className="px-4 pb-safe max-h-[70vh] overflow-y-auto">
            {/* Search Bar */}
            <div className="mt-4 mb-6">
              <div className="flex items-center gap-3 bg-gray-50 rounded-xl p-3 border border-gray-200">
                <MapPin size={24} className="text-orange-500" />
                <input
                  type="text"
                  placeholder="ไปที่ไหน?"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="flex-1 bg-transparent text-gray-700 placeholder:text-gray-400 outline-none"
                />
                <button className="flex items-center gap-2 px-3 py-1.5 bg-white rounded-lg border border-gray-200">
                  <Clock size={18} className="text-gray-600" />
                  <span className="text-sm text-gray-700">ภายหลัง</span>
                </button>
              </div>
            </div>

            {/* Popular Locations */}
            <div className="mb-6">
              {POPULAR_LOCATIONS.map((location, idx) => (
                <button
                  key={idx}
                  className="w-full flex items-start gap-3 p-3 hover:bg-gray-50 rounded-xl transition-colors"
                >
                  <div className="mt-1">
                    <MapPin size={20} className="text-gray-600" />
                  </div>
                  <div className="flex-1 text-left">
                    <div className="font-semibold text-gray-900">{location.name}</div>
                    <div className="text-sm text-gray-500 line-clamp-1">{location.address}</div>
                  </div>
                </button>
              ))}
            </div>

            {/* Wallet Promo Card */}
            <div className="mb-6">
              <div className="bg-gradient-to-br from-cyan-50 to-blue-50 rounded-2xl p-5 border border-cyan-200">
                <h3 className="font-bold text-gray-900 mb-2">
                  หากทั้งวอล์วาสตกเครื่อง เรา<br />ช่วยคุณได้
                </h3>
                <button className="mt-3 px-5 py-2 bg-white rounded-xl font-semibold text-gray-900 shadow-sm hover:shadow transition-shadow">
                  ซิงค์บัญชี
                </button>
              </div>
            </div>

            {/* Service Options */}
            <div className="mb-6">
              <h3 className="font-bold text-gray-900 mb-4">ตอบทุกโจทย์การเดินทางของคุณ</h3>
              <div className="grid grid-cols-2 gap-3">
                {SERVICE_OPTIONS.map((option) => (
                  <button
                    key={option.id}
                    className={`relative overflow-hidden bg-gradient-to-br ${option.color} rounded-2xl p-4 text-left group hover:scale-[1.02] transition-transform`}
                  >
                    <div className="relative z-10">
                      <div className="font-semibold text-white mb-1">{option.title}</div>
                      <div className="text-sm text-white/90">{option.subtitle}</div>
                    </div>
                    <div className="absolute bottom-2 right-2 text-4xl opacity-50">
                      {option.emoji}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Bottom Spacing */}
            <div className="h-8"></div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
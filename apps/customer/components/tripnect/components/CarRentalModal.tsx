import { motion, AnimatePresence } from 'framer-motion';
import { X, ArrowLeft, MapPin, Calendar, Clock, Car, Fuel, Gauge, Briefcase, Users, CheckCircle2, ChevronDown, Filter } from 'lucide-react';
import { useState, useEffect } from 'react';
import { ImageWithFallback } from './figma/ImageWithFallback';

interface CarRentalModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CarRentalModal({ isOpen, onClose }: CarRentalModalProps) {
  const [step, setStep] = useState<'search' | 'list'>('search');
  const [returnDifferentLoc, setReturnDifferentLoc] = useState(false);

  useEffect(() => {
    if (isOpen) setStep('search');
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSearch = () => {
      setStep('list');
  };

  const carTypes = [
      { name: 'อีโคโนมี', image: 'https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?auto=format&fit=crop&q=80&w=300', price: 'เริ่ม ฿800' },
      { name: 'เอสยูวี', image: 'https://images.unsplash.com/photo-1503376763036-066120622c74?auto=format&fit=crop&q=80&w=300', price: 'เริ่ม ฿1,500' },
      { name: 'พรีเมียม', image: 'https://images.unsplash.com/photo-1563720223185-11003d516935?auto=format&fit=crop&q=80&w=300', price: 'เริ่ม ฿5,000' },
  ];

  const carList = [
      {
          id: 1,
          name: 'Toyota Yaris Ativ',
          type: 'อีโคโนมี',
          seats: 5,
          luggage: 2,
          transmission: 'ออโต้',
          price: 850,
          image: 'https://images.unsplash.com/photo-1623869675785-50d42125f4fa?auto=format&fit=crop&q=80&w=600',
          provider: 'Hertz'
      },
      {
          id: 2,
          name: 'Honda Civic',
          type: 'ซีดาน',
          seats: 5,
          luggage: 3,
          transmission: 'ออโต้',
          price: 1200,
          image: 'https://images.unsplash.com/photo-1609529669235-c07e4e1bd6e9?auto=format&fit=crop&q=80&w=600',
          provider: 'Avis'
      },
      {
          id: 3,
          name: 'Toyota Fortuner',
          type: 'เอสยูวี',
          seats: 7,
          luggage: 4,
          transmission: 'ออโต้',
          price: 2100,
          image: 'https://images.unsplash.com/photo-1503376763036-066120622c74?auto=format&fit=crop&q=80&w=600',
          provider: 'Budget'
      },
      {
        id: 4,
        name: 'BMW 5 Series',
        type: 'พรีเมียม',
        seats: 5,
        luggage: 3,
        transmission: 'ออโต้',
        price: 5500,
        image: 'https://images.unsplash.com/photo-1555215695-3004980adade?auto=format&fit=crop&q=80&w=600',
        provider: 'Sixt'
    }
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
                {step === 'search' ? 'เช่ารถ' : 'รถว่างพร้อมเช่า'}
            </span>

            <div className="w-10 h-10" />
        </div>

        {/* --- Content --- */}
        <div className="flex-1 overflow-y-auto">
            {step === 'search' ? (
                /* --- STEP 1: Search Form --- */
                <div className="p-4 pb-32 animate-in fade-in slide-in-from-bottom-4 duration-300">
                    
                    {/* Main Search Card */}
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5 mb-6">
                        
                        {/* Toggle Return Location */}
                        <div className="flex items-center gap-4 mb-6 border-b border-slate-50 pb-4">
                            <label className="flex items-center gap-2 cursor-pointer">
                                <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${!returnDifferentLoc ? 'border-orange-500' : 'border-slate-300'}`}>
                                    {!returnDifferentLoc && <div className="w-2 h-2 rounded-full bg-orange-500" />}
                                </div>
                                <span className={`text-sm font-medium ${!returnDifferentLoc ? 'text-slate-900' : 'text-slate-500'}`} onClick={() => setReturnDifferentLoc(false)}>คืนรถที่เดิม</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                                <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${returnDifferentLoc ? 'border-orange-500' : 'border-slate-300'}`}>
                                    {returnDifferentLoc && <div className="w-2 h-2 rounded-full bg-orange-500" />}
                                </div>
                                <span className={`text-sm font-medium ${returnDifferentLoc ? 'text-slate-900' : 'text-slate-500'}`} onClick={() => setReturnDifferentLoc(true)}>คืนรถต่างสาขา</span>
                            </label>
                        </div>

                        {/* Pick-up Location */}
                        <div className="mb-5 relative">
                            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2 block">จุดรับรถ</label>
                            <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100 focus-within:border-orange-200 focus-within:bg-orange-50/10 transition-colors">
                                <MapPin className="text-orange-500" size={20} />
                                <input 
                                    type="text" 
                                    className="bg-transparent w-full text-slate-900 font-semibold placeholder:text-slate-400 outline-none"
                                    placeholder="เมือง, สนามบิน หรือสถานีรถไฟ"
                                    defaultValue="สนามบินสุวรรณภูมิ (BKK)"
                                />
                            </div>
                        </div>

                        {returnDifferentLoc && (
                            <div className="mb-5 relative animate-in fade-in slide-in-from-top-2">
                                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2 block">จุดคืนรถ</label>
                                <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
                                    <MapPin className="text-slate-400" size={20} />
                                    <input 
                                        type="text" 
                                        className="bg-transparent w-full text-slate-900 font-semibold placeholder:text-slate-400 outline-none"
                                        placeholder="ระบุจุดคืนรถ"
                                    />
                                </div>
                            </div>
                        )}

                        {/* Dates */}
                        <div className="grid grid-cols-2 gap-3 mb-6">
                            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                                <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">วันรับรถ</label>
                                <div className="flex items-center gap-2 mb-1">
                                    <span className="text-sm font-bold text-slate-900">ส. 17 ม.ค.</span>
                                </div>
                                <div className="flex items-center gap-1.5 text-slate-500">
                                    <Clock size={12} />
                                    <span className="text-xs">10:00 น.</span>
                                </div>
                            </div>
                            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                                <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">วันคืนรถ</label>
                                <div className="flex items-center gap-2 mb-1">
                                    <span className="text-sm font-bold text-slate-900">อ. 20 ม.ค.</span>
                                </div>
                                <div className="flex items-center gap-1.5 text-slate-500">
                                    <Clock size={12} />
                                    <span className="text-xs">10:00 น.</span>
                                </div>
                            </div>
                        </div>

                        {/* Search Button */}
                        <button 
                            onClick={handleSearch}
                            className="w-full h-12 bg-orange-500 hover:bg-orange-600 active:scale-[0.98] text-white rounded-xl flex items-center justify-center gap-2 font-bold text-base shadow-lg shadow-orange-200 transition-all"
                        >
                            ค้นหารถ
                        </button>
                    </div>

                    {/* Popular Car Types */}
                    <div>
                        <h3 className="text-sm font-bold text-slate-900 mb-3 px-1">ประเภทรถยอดนิยม</h3>
                        <div className="flex gap-3 overflow-x-auto no-scrollbar pb-4">
                            {carTypes.map((car, i) => (
                                <div key={i} onClick={handleSearch} className="min-w-[140px] bg-white rounded-xl p-3 border border-slate-100 shadow-sm flex flex-col items-center text-center active:scale-95 transition-transform">
                                    <div className="w-full h-20 mb-2 rounded-lg overflow-hidden">
                                        <ImageWithFallback src={car.image} className="w-full h-full object-cover" />
                                    </div>
                                    <span className="text-sm font-bold text-slate-900">{car.name}</span>
                                    <span className="text-xs text-slate-400">{car.price}/วัน</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            ) : (
                /* --- STEP 2: Car List --- */
                <div className="bg-stone-50 min-h-full animate-in slide-in-from-right duration-300">
                     {/* Filters Bar */}
                     <div className="bg-white px-4 py-3 border-b border-slate-100 flex gap-2 overflow-x-auto no-scrollbar sticky top-0 z-20">
                         <button className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-50 text-orange-600 rounded-full text-xs font-bold whitespace-nowrap border border-orange-100">
                            <Filter size={14} /> ตัวกรอง
                         </button>
                         <button className="px-3 py-1.5 bg-white text-slate-600 border border-slate-200 rounded-full text-xs font-medium whitespace-nowrap">ราคา (ต่ำ-สูง)</button>
                         <button className="px-3 py-1.5 bg-white text-slate-600 border border-slate-200 rounded-full text-xs font-medium whitespace-nowrap">ประเภทรถ</button>
                    </div>

                    <div className="p-4 space-y-4 pb-32">
                        {carList.map((car) => (
                            <div key={car.id} className="bg-white rounded-xl overflow-hidden shadow-sm border border-slate-100">
                                <div className="p-4">
                                    <div className="flex justify-between items-start mb-4">
                                        <div>
                                            <span className="text-xs font-bold text-slate-400 uppercase tracking-wide">{car.type}</span>
                                            <h3 className="text-lg font-bold text-slate-900">{car.name}</h3>
                                            <div className="flex items-center gap-1 mt-1">
                                                <div className="w-4 h-4 rounded-full bg-slate-100 flex items-center justify-center">
                                                    <CheckCircle2 size={10} className="text-green-500" />
                                                </div>
                                                <span className="text-xs text-slate-500">{car.provider}</span>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <span className="block text-lg font-bold text-orange-500">฿{car.price}</span>
                                            <span className="text-[10px] text-slate-400">ต่อวัน</span>
                                        </div>
                                    </div>

                                    {/* Car Image */}
                                    <div className="relative h-32 w-full mb-4 rounded-lg overflow-hidden bg-slate-50">
                                        <ImageWithFallback src={car.image} className="w-full h-full object-cover mix-blend-multiply" />
                                    </div>

                                    {/* Specs Grid */}
                                    <div className="grid grid-cols-3 gap-2 mb-4">
                                        <div className="flex flex-col items-center justify-center p-2 bg-slate-50 rounded-lg">
                                            <Users size={16} className="text-slate-400 mb-1" />
                                            <span className="text-[10px] font-medium text-slate-600">{car.seats} ที่นั่ง</span>
                                        </div>
                                        <div className="flex flex-col items-center justify-center p-2 bg-slate-50 rounded-lg">
                                            <Briefcase size={16} className="text-slate-400 mb-1" />
                                            <span className="text-[10px] font-medium text-slate-600">{car.luggage} กระเป๋า</span>
                                        </div>
                                        <div className="flex flex-col items-center justify-center p-2 bg-slate-50 rounded-lg">
                                            <Gauge size={16} className="text-slate-400 mb-1" />
                                            <span className="text-[10px] font-medium text-slate-600">{car.transmission}</span>
                                        </div>
                                    </div>

                                    <button className="w-full py-2.5 rounded-lg border border-orange-500 text-orange-600 font-bold text-sm hover:bg-orange-50 transition-colors">
                                        ดูข้อเสนอ
                                    </button>
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
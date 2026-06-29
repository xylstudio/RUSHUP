import { motion, AnimatePresence } from 'framer-motion';
import { 
    X, Star, MapPin, Check, 
    Wifi, Car, Utensils, Wind, 
    Heart, Share2, BedDouble, Bath, 
    ShieldCheck, ChevronRight,
    Medal, User as UserIcon
} from 'lucide-react';
import { PostData } from '../data';
import { ImageWithFallback } from './figma/ImageWithFallback';
import { useState, useEffect, useRef } from 'react';

interface BookingModalProps {
  post: PostData | null;
  onClose: () => void;
}

export function BookingModal({ post, onClose }: BookingModalProps) {
  const [step, setStep] = useState<'details' | 'confirm' | 'success'>('details');
  const [isLiked, setIsLiked] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isScrolled, setIsScrolled] = useState(false);

  // Handle Scroll for Sticky Header Effect
  const handleScroll = () => {
      if (scrollRef.current) {
          setIsScrolled(scrollRef.current.scrollTop > 200);
      }
  };

  useEffect(() => {
      if (post) setStep('details');
  }, [post]);
  
  if (!post) return null;

  // Mock Data Generators
  const PRICE_PER_NIGHT = post.price || 1200;
  
  const TITLE = post.caption.length > 50 
    ? post.caption.substring(0, 45) + "..." 
    : post.caption;

  const AMENITIES = [
    { icon: Wifi, label: 'Fast Wifi' },
    { icon: Utensils, label: 'Kitchen' },
    { icon: Car, label: 'Free Parking' },
    { icon: BedDouble, label: 'King Bed' },
    { icon: Wind, label: 'AC' },
    { icon: Bath, label: 'Hot Tub' },
  ];

  const handleBooking = async () => {
      setStep('confirm');
      try {
        const payload = {
          items: [{ id: post?.id, sale_price: post?.price, quantity: 1 }],
          orderType: 'delivery',
          deliveryAddress: 'Home Address',
          deliveryFee: 50,
          customerName: 'Customer',
          phoneNumber: '0812345678',
          branchId: post?.user?.id === 'admin' ? null : post?.user?.id
        };
        const res = await fetch('/api/checkout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        if (!res.ok) {
            const data = await res.json();
            throw new Error(data.error || 'Checkout failed');
        }
        setStep('success');
      } catch (err: any) {
        console.error(err);
        setStep('details');
        alert('Checkout Failed: ' + err.message);
        return;
      }
      setTimeout(() => {
          onClose();
      }, 3000);
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: '0%' }}
        exit={{ y: '100%' }}
        transition={{ type: "spring", damping: 30, stiffness: 300 }}
        className="fixed inset-0 z-[200] bg-white flex flex-col font-sans"
      >
        
        {/* --- 1. SMART HEADER --- */}
        <div 
            className={`absolute top-0 left-0 right-0 z-40 transition-all duration-300 pt-[env(safe-area-inset-top)] ${
                isScrolled ? 'bg-white shadow-sm py-3' : 'bg-transparent py-4'
            }`}
        >
            <div className="px-4 flex justify-between items-center">
                <button 
                    onClick={onClose}
                    className={`w-9 h-9 rounded-full flex items-center justify-center transition-all ${
                        isScrolled 
                        ? 'bg-transparent text-black hover:bg-stone-100' 
                        : 'bg-white text-black shadow-md hover:scale-105'
                    }`}
                >
                    <X size={20} strokeWidth={2} />
                </button>

                <div className={`text-sm font-bold text-black transition-opacity duration-300 ${isScrolled ? 'opacity-100' : 'opacity-0'}`}>
                    Overview
                </div>

                <div className="flex gap-3">
                    <button className={`w-9 h-9 rounded-full flex items-center justify-center transition-all ${
                        isScrolled 
                        ? 'bg-transparent text-black hover:bg-stone-100' 
                        : 'bg-white text-black shadow-md hover:scale-105'
                    }`}>
                        <Share2 size={18} strokeWidth={2} />
                    </button>
                    <button 
                        onClick={() => setIsLiked(!isLiked)}
                        className={`w-9 h-9 rounded-full flex items-center justify-center transition-all ${
                            isScrolled 
                            ? 'bg-transparent hover:bg-stone-100' 
                            : 'bg-white shadow-md hover:scale-105'
                        } ${isLiked ? 'text-orange-500' : 'text-black'}`}
                    >
                        <Heart size={18} strokeWidth={2} fill={isLiked ? "currentColor" : "none"} />
                    </button>
                </div>
            </div>
        </div>

        {/* --- 2. MAIN CONTENT --- */}
        <div 
            ref={scrollRef}
            onScroll={handleScroll}
            className="flex-1 overflow-y-auto no-scrollbar pb-32 bg-white"
        >
            {/* HERO IMAGE */}
            <div className="w-full h-[35vh] min-h-[300px] relative">
                 <ImageWithFallback src={post.imageUrl} className="w-full h-full object-cover" />
                 <div className="absolute inset-0 bg-black/10" />
            </div>

            <div className="px-5 pt-6">
                
                {/* TITLE SECTION */}
                <div className="mb-6">
                    <h1 className="text-2xl font-bold text-black leading-snug mb-2">
                        {TITLE}
                    </h1>
                    <div className="flex items-center gap-1.5 text-sm font-medium text-stone-800">
                         <span>Entire villa</span>
                         <span className="text-stone-300">•</span>
                         <span>{post.location || 'Santorini'}</span>
                    </div>
                    <div className="mt-2 flex items-center gap-1 text-sm text-stone-500">
                         <span>2 guests</span>
                         <span className="text-stone-300">•</span>
                         <span>1 bedroom</span>
                         <span className="text-stone-300">•</span>
                         <span>1 bed</span>
                         <span className="text-stone-300">•</span>
                         <span>1 bath</span>
                    </div>
                </div>

                {/* RATINGS & BADGE - Black borders, Orange accent */}
                <div className="p-4 rounded-xl border border-stone-100 flex items-center justify-between mb-6 shadow-sm">
                     <div className="text-center flex-1 border-r border-stone-100">
                         <div className="font-bold text-lg text-black">4.98</div>
                         <div className="flex justify-center gap-0.5 mt-0.5">
                             {[1,2,3,4,5].map(i => (
                                 <Star key={i} size={10} className="fill-black text-black" />
                             ))}
                         </div>
                     </div>
                     <div className="text-center flex-1 px-2 relative">
                         <div className="font-bold text-lg text-black">Guest</div>
                         <div className="text-[10px] font-bold text-stone-500 uppercase tracking-wide">Favorite</div>
                         <div className="absolute -top-6 left-1/2 -translate-x-1/2">
                              <Medal size={24} className="text-orange-500 fill-orange-50" />
                         </div>
                     </div>
                     <div className="text-center flex-1 border-l border-stone-100">
                         <div className="font-bold text-lg text-black">128</div>
                         <div className="text-[10px] font-bold text-stone-500 uppercase tracking-wide underline decoration-stone-300">Reviews</div>
                     </div>
                </div>

                {/* HOST ROW */}
                <div className="py-6 border-t border-stone-100 flex items-center justify-between">
                     <div className="flex gap-4 items-center">
                         <div className="w-12 h-12 rounded-full overflow-hidden border border-stone-100 relative">
                             <ImageWithFallback src={post.user.avatarUrl} className="w-full h-full object-cover" />
                             <div className="absolute bottom-0 right-0 w-4 h-4 bg-orange-500 rounded-full border-2 border-white flex items-center justify-center text-white">
                                 <ShieldCheck size={8} strokeWidth={3} />
                             </div>
                         </div>
                         <div>
                             <h3 className="font-bold text-base text-black">Hosted by {post.user.username}</h3>
                             <p className="text-sm text-stone-500">Superhost · 5 years hosting</p>
                         </div>
                     </div>
                </div>

                {/* HIGHLIGHTS */}
                <div className="py-6 border-t border-stone-100 space-y-5">
                    <div className="flex gap-4">
                        <UserIcon size={24} className="text-black shrink-0" strokeWidth={1.5} />
                        <div>
                            <h4 className="font-bold text-black text-sm">Self check-in</h4>
                            <p className="text-sm text-stone-500 leading-snug">Check yourself in with the keypad.</p>
                        </div>
                    </div>
                    <div className="flex gap-4">
                        <MapPin size={24} className="text-black shrink-0" strokeWidth={1.5} />
                        <div>
                            <h4 className="font-bold text-black text-sm">Great location</h4>
                            <p className="text-sm text-stone-500 leading-snug">100% of recent guests gave the location a 5-star rating.</p>
                        </div>
                    </div>
                </div>

                {/* DESCRIPTION */}
                <div className="py-6 border-t border-stone-100">
                    <h3 className="font-bold text-lg text-black mb-3">About this place</h3>
                    <p className="text-stone-600 leading-7 text-sm">
                        {post.caption} <br/><br/>
                        Relax in this calm, stylish space. Whether you are looking for a romantic getaway or a remote work sanctuary, this villa offers high-speed wifi and stunning views.
                    </p>
                    <button className="flex items-center gap-1 font-bold underline text-black mt-3 text-sm">
                        Show more <ChevronRight size={14} />
                    </button>
                </div>

                {/* AMENITIES */}
                <div className="py-6 border-t border-stone-100">
                    <h3 className="font-bold text-lg text-black mb-4">What this place offers</h3>
                    <div className="grid grid-cols-1 gap-4">
                        {AMENITIES.map((item, idx) => (
                            <div key={idx} className="flex items-center gap-4 text-stone-700">
                                <item.icon size={22} strokeWidth={1.5} />
                                <span className="text-sm">{item.label}</span>
                            </div>
                        ))}
                    </div>
                    <button className="w-full py-3 rounded-lg border border-black text-black font-bold text-sm mt-6 hover:bg-stone-50 transition-colors">
                        Show all 32 amenities
                    </button>
                </div>

                {/* LOCATION */}
                <div className="py-6 border-t border-stone-100">
                    <h3 className="font-bold text-lg text-black mb-4">Where you'll be</h3>
                    <div className="w-full h-56 rounded-xl bg-stone-100 overflow-hidden relative">
                        <ImageWithFallback src="https://images.unsplash.com/photo-1524661135-423995f22d0b?auto=format&fit=crop&q=80&w=600" className="w-full h-full object-cover" />
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
                             <div className="w-12 h-12 rounded-full bg-orange-500 text-white flex items-center justify-center shadow-lg ring-4 ring-white">
                                 <MapPin size={22} fill="currentColor" />
                             </div>
                        </div>
                    </div>
                    <h4 className="font-bold text-black mt-4 text-sm">{post.location || 'Santorini, Greece'}</h4>
                    <p className="text-sm text-stone-500 mt-1">
                        Very safe neighborhood, walking distance to the beach and local markets.
                    </p>
                </div>

                {/* DATE PICKER PREVIEW */}
                <div className="py-6 border-t border-stone-100 mb-8">
                     <h3 className="font-bold text-lg text-black mb-1">5 nights in {post.location?.split(',')[0]}</h3>
                     <p className="text-sm text-stone-500 mb-4">Jan 12, 2026 - Jan 17, 2026</p>
                     <div className="w-full p-4 rounded-xl bg-stone-50 border border-stone-100 flex items-center justify-between">
                         <div className="flex gap-4 overflow-hidden">
                             {[12, 13, 14, 15, 16, 17].map(d => (
                                 <div key={d} className={`flex flex-col items-center justify-center w-10 h-10 rounded-full text-xs font-bold ${d === 12 || d === 17 ? 'bg-black text-white' : 'text-stone-400'}`}>
                                     {d}
                                 </div>
                             ))}
                         </div>
                     </div>
                </div>

            </div>
        </div>

        {/* --- 3. BOTTOM BAR (Fixed Footer) --- */}
        <div className="bg-white border-t border-stone-100 p-4 pb-8 shadow-[0_-5px_20px_rgba(0,0,0,0.05)] z-50">
             <div className="max-w-xl mx-auto flex items-center justify-between gap-4">
                 <div className="flex flex-col">
                     <div className="flex items-baseline gap-1">
                         <span className="text-lg font-bold text-black">฿{PRICE_PER_NIGHT.toLocaleString()}</span>
                         <span className="text-sm text-stone-500">night</span>
                     </div>
                     <span className="text-xs font-bold underline text-black decoration-stone-300">
                         Jan 12 - 17
                     </span>
                 </div>

                 <button 
                    onClick={handleBooking}
                    className={`h-14 px-8 rounded-2xl font-bold text-base transition-all active:scale-95 min-w-[160px] shadow-lg ${
                        step === 'success'
                        ? 'bg-green-600 text-white' // Success can remain Green or make it Orange, keeping Green for "Success" state is usually good UX, but let's stick to Orange/Black theme or success green.
                        : 'bg-orange-600 text-white hover:bg-orange-700 shadow-orange-200'
                    }`}
                >
                    {step === 'details' && 'Reserve'}
                    {step === 'confirm' && (
                        <div className="flex items-center gap-2">
                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            <span>Processing</span>
                        </div>
                    )}
                    {step === 'success' && (
                        <div className="flex items-center gap-2">
                             <span>Booked!</span>
                             <Check size={18} strokeWidth={3} />
                        </div>
                    )}
                </button>
             </div>
        </div>

      </motion.div>
    </AnimatePresence>
  );
}
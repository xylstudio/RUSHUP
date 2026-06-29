import { useState, useEffect, useMemo } from 'react';
import { clsx } from 'clsx';
import { 
  X, Search, Star, Clock, MapPin, 
  UtensilsCrossed, Flame, Coffee, Salad, Pizza,
  ChevronLeft, Plus, Minus, ShoppingBag, CreditCard,
  Bike, CheckCircle2, ChevronRight, Heart, Share2, MoreHorizontal, ChevronDown
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { MagicRandomizer } from './MagicRandomizer';
import { ImageWithFallback } from './figma/ImageWithFallback';

// --- Types ---
interface MenuItem {
    id: string;
    name: string;
    description: string;
    price: number;
    image: string;
    category: string;
    popular?: boolean;
}

interface Restaurant {
    id: string;
    name: string;
    rating: number;
    reviews: number;
    time: string;
    deliveryFee: number;
    category: string;
    image: string;
    coverImage: string;
    tags: string[];
    promo?: string;
    distance: string;
    menu: MenuItem[];
}

interface CartItem extends MenuItem {
    cartId: string;
    quantity: number;
    options?: string[]; // Simplified options
}

// --- Mock Data ---
const CATEGORIES = [
  { id: 'all', label: 'ทั้งหมด', icon: UtensilsCrossed },
  { id: 'thai', label: 'อาหารไทย', icon: Flame },
  { id: 'cafe', label: 'คาเฟ่', icon: Coffee },
  { id: 'healthy', label: 'สุขภาพ', icon: Salad },
  { id: 'fastfood', label: 'ฟาสต์ฟู้ด', icon: Pizza },
];

const MOCK_MENU: MenuItem[] = [
    {
        id: 'm1',
        name: 'ข้าวซอยไก่ (สูตรดั้งเดิม)',
        description: 'เส้นบะหมี่นุ่มในน้ำแกงกะหรี่รสเข้มข้น เสิร์ฟพร้อมน่องไก่ชิ้นโต ผักดอง และหอมแดง',
        price: 80,
        image: 'https://images.unsplash.com/photo-1675150303909-1bb94e33132f?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxraGFvJTIwc29pJTIwdGhhaSUyMGZvb2QlMjBub29kbGUlMjBjdXJyeXxlbnwxfHx8fDE3Njg3MTI4Njh8MA&ixlib=rb-4.1.0&q=80&w=1080',
        category: 'Signature',
        popular: true
    },
    {
        id: 'm2',
        name: 'ปีกไก่ทอดน้ำปลา',
        description: 'ปีกไก่หมักน้ำปลาแท้ ทอดจนเหลืองกรอบ ทานคู่กับน้ำจิ้มแจ่วรสเด็ด',
        price: 120,
        image: 'https://images.unsplash.com/photo-1693642025671-0f7a47a16c90?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx0aGFpJTIwZnJpZWQlMjBjaGlja2VuJTIwd2luZ3N8ZW58MXx8fHwxNzY4NzEyODY4fDA&ixlib=rb-4.1.0&q=80&w=1080',
        category: 'Appetizer'
    },
    {
        id: 'm3',
        name: 'ข้าวเหนียวมะม่วง',
        description: 'ข้าวเหนียวมูนกะทิหอมหวาน เสิร์ฟพร้อมมะม่วงน้ำดอกไม้สุกหวานฉ่ำ',
        price: 90,
        image: 'https://images.unsplash.com/photo-1582801205465-c0d029e85a1c?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxtYW5nbyUyMHN0aWNreSUyMHJpY2UlMjBkZXNzZXJ0fGVufDF8fHx8MTc2ODcxMjg2OHww&ixlib=rb-4.1.0&q=80&w=1080',
        category: 'Dessert',
        popular: true
    },
    {
        id: 'm4',
        name: 'ชาไทยเย็น',
        description: 'ชาไทยรสเข้มข้น หอมมันด้วยนมสด ท็อปด้วยฟองนมนุ่มๆ',
        price: 55,
        image: 'https://images.unsplash.com/photo-1644131872948-de9f2373fc75?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx0aGFpJTIwbWlsayUyMHRlYSUyMGljZSUyMGdsYXNzfGVufDF8fHx8MTc2ODcxMjg2OHww&ixlib=rb-4.1.0&q=80&w=1080',
        category: 'Drinks'
    }
];

const RESTAURANTS: Restaurant[] = [
  {
    id: '1',
    name: 'ข้าวซอยแม่สาย',
    rating: 4.8,
    reviews: 1250,
    time: '15-25 min',
    deliveryFee: 15,
    category: 'thai',
    image: 'https://images.unsplash.com/photo-1559314809-0d155014e29e?auto=format&fit=crop&w=600&q=80',
    coverImage: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=1200&q=80',
    tags: ['อาหารเหนือ', 'มิชลินไกด์'],
    promo: 'ส่งฟรี',
    distance: '1.2 km',
    menu: MOCK_MENU
  },
  {
    id: '2',
    name: 'Graph Coffee Co.',
    rating: 4.9,
    reviews: 890,
    time: '20-30 min',
    deliveryFee: 10,
    category: 'cafe',
    image: 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?auto=format&fit=crop&w=600&q=80',
    coverImage: 'https://images.unsplash.com/photo-1497935586351-b67a49e012bf?auto=format&fit=crop&w=1200&q=80',
    tags: ['Specialty Coffee', 'ของหวาน'],
    promo: 'ลด 20%',
    distance: '2.5 km',
    menu: MOCK_MENU // Reusing menu for demo
  },
  {
    id: '3',
    name: 'Salad Concept',
    rating: 4.7,
    reviews: 500,
    time: '30-45 min',
    deliveryFee: 20,
    category: 'healthy',
    image: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=600&q=80',
    coverImage: 'https://images.unsplash.com/photo-1490645935967-10de6ba17061?auto=format&fit=crop&w=1200&q=80',
    tags: ['สลัด', 'คลีน'],
    distance: '3.0 km',
    menu: MOCK_MENU
  },
];

interface FoodDeliveryModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialSearchQuery?: string;
  services?: any[];
}

export function FoodDeliveryModal({ isOpen, onClose, initialSearchQuery = '', services = [] }: FoodDeliveryModalProps) {
  // Map RUSHUP services to Restaurants
  const dynamicRestaurants = useMemo(() => {
    if (!services || services.length === 0) return RESTAURANTS;
    
    // Group services into a single "RUSHUP Kitchen" restaurant for now, or map each service to a menu item
    const menuItems = services.map(s => ({
        id: s.id,
        name: s.name,
        description: s.description || '',
        price: s.price || 0,
        image: s.image_url || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&q=80&w=600',
        category: 'All',
        popular: true
    }));

    return [{
        id: 'rushup',
        name: 'RUSHUP Kitchen',
        rating: 4.9,
        reviews: 999,
        time: '15-20 min',
        deliveryFee: 15,
        category: 'all',
        image: 'https://images.unsplash.com/photo-1550547660-d9450f859349?auto=format&fit=crop&w=600&q=80',
        coverImage: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=1200&q=80',
        tags: ['อาหาร', 'เครื่องดื่ม'],
        distance: '0 km',
        menu: menuItems
    }];
  }, [services]);

  const [view, setView] = useState<'HOME' | 'RESTAURANT' | 'CART' | 'TRACKING'>('HOME');
  const [selectedRestaurant, setSelectedRestaurant] = useState<Restaurant | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');

  // Reset state when closed or opened with query
  useEffect(() => {
    if (isOpen) {
        if (initialSearchQuery) {
            setSearchQuery(initialSearchQuery);
        }
    } else {
        const timer = setTimeout(() => {
            setView('HOME');
            setSelectedRestaurant(null);
            setSearchQuery(''); // Clear search on close
        }, 300);
        return () => clearTimeout(timer);
    }
  }, [isOpen, initialSearchQuery]);
  
  if (!isOpen) return null;

  // --- Actions ---
  const addToCart = (item: MenuItem) => {
    setCart(prev => {
        const existing = prev.find(i => i.id === item.id);
        if (existing) {
            return prev.map(i => i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i);
        }
        return [...prev, { ...item, quantity: 1, cartId: Math.random().toString() }];
    });
  };

  const removeFromCart = (itemId: string) => {
      setCart(prev => prev.filter(i => i.id !== itemId));
  };

  const updateQuantity = (itemId: string, delta: number) => {
      setCart(prev => prev.map(i => {
          if (i.id === itemId) {
              const newQty = i.quantity + delta;
              return newQty > 0 ? { ...i, quantity: newQty } : i;
          }
          return i;
      }));
  };

  const cartTotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  // --- Views ---

  // 1. HOME VIEW
  const HomeView = () => {
    const filtered = dynamicRestaurants.filter(r => 
        (activeCategory === 'all' || r.category === activeCategory) &&
        r.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="flex flex-col h-full bg-stone-50 pb-[100px]">
             {/* --- UNIFIED HEADER --- */}
             <div className="bg-white px-4 pt-[calc(3rem+env(safe-area-inset-top))] pb-4 flex items-center justify-between sticky top-0 z-30 shadow-sm border-b border-stone-100">
                <button onClick={onClose} className="w-10 h-10 -ml-2 flex items-center justify-center text-stone-800 active:scale-95 transition-transform hover:bg-stone-50 rounded-full">
                    <X size={24} strokeWidth={2} />
                </button>
                <span className="text-lg font-bold text-stone-900">สั่งอาหาร</span>
                <div className="w-10 h-10 flex items-center justify-center">
                    {cartCount > 0 && (
                        <div onClick={() => setView('CART')} className="relative cursor-pointer">
                            <ShoppingBag size={24} className="text-stone-800" />
                            <span className="absolute -top-1 -right-1 w-4 h-4 bg-orange-500 rounded-full text-[10px] text-white flex items-center justify-center font-bold">{cartCount}</span>
                        </div>
                    )}
                </div>
            </div>

            <div className="flex-1 overflow-y-auto pb-32 scrollbar-hide">
                 {/* Address & Search Section */}
                 <div className="bg-white p-4 mb-4 rounded-b-3xl shadow-sm border-b border-stone-100">
                     <div className="flex items-center gap-2 mb-4">
                        <MapPin className="w-5 h-5 text-orange-600" />
                        <div className="flex flex-col">
                            <span className="text-[10px] font-bold text-stone-400 uppercase tracking-widest leading-none mb-1">จัดส่งที่</span>
                            <span className="text-stone-900 font-bold text-sm leading-none">คอนโดของคุณ (สุขุมวิท 55)</span>
                        </div>
                        <ChevronDown size={16} className="text-stone-400 ml-auto" />
                     </div>

                    {/* Search */}
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 w-5 h-5" />
                        <input 
                            type="text" 
                            placeholder="หิวอะไรวันนี้? ค้นหาร้านเลย..." 
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full bg-stone-100 h-12 rounded-xl pl-10 pr-4 outline-none text-stone-800 placeholder:text-stone-400 font-medium focus:ring-2 focus:ring-orange-200 transition-all"
                        />
                    </div>
                 </div>
                 {/* Categories */}
                 <div className="px-4 py-6">
                    <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide -mx-4 px-4">
                        {CATEGORIES.map((cat) => (
                            <button 
                                key={cat.id}
                                onClick={() => setActiveCategory(cat.id)}
                                className={clsx("flex flex-col items-center gap-2 min-w-[72px] transition-all", activeCategory === cat.id ? "scale-105" : "opacity-70 hover:opacity-100")}
                            >
                                <div className={clsx("w-16 h-16 rounded-2xl flex items-center justify-center shadow-sm transition-colors", activeCategory === cat.id ? "bg-orange-500 text-white shadow-orange-200" : "bg-white text-stone-400")}>
                                    <cat.icon className="w-8 h-8" strokeWidth={1.5} />
                                </div>
                                <span className={clsx("text-xs font-medium", activeCategory === cat.id ? "text-stone-900" : "text-stone-500")}>{cat.label}</span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Promo Banner */}
                <div className="px-4 mb-8">
                     <div className="w-full h-40 bg-gradient-to-r from-orange-500 to-pink-500 rounded-2xl relative overflow-hidden flex items-center shadow-lg shadow-orange-100 cursor-pointer hover:scale-[1.01] transition-transform">
                         <div className="p-6 relative z-10 text-white">
                             <span className="px-2 py-1 bg-white/20 backdrop-blur-md rounded text-[10px] font-bold uppercase tracking-widest mb-2 inline-block">Flash Sale</span>
                             <h2 className="text-2xl font-bold leading-tight mb-1">ลดสูงสุด 50%</h2>
                             <p className="text-white/80 text-sm mb-3">เที่ยงนี้กินอะไรดี? เรามีคำตอบ</p>
                             <div className="px-4 py-2 bg-white text-orange-600 rounded-full text-xs font-bold w-fit">สั่งเลย</div>
                         </div>
                         <ImageWithFallback src="https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?auto=format&fit=crop&w=600&q=80" className="absolute right-0 top-0 h-full w-1/2 object-cover opacity-80 mix-blend-overlay" />
                     </div>
                </div>

                {/* Restaurant List */}
                <div className="px-4 pb-4">
                    <h3 className="text-lg font-bold text-stone-800 mb-4">ร้านแนะนำใกล้คุณ</h3>
                    <div className="flex flex-col gap-6">
                        {filtered.map((res, idx) => (
                            <motion.div 
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: idx * 0.1 }}
                                key={res.id}
                                onClick={() => { setSelectedRestaurant(res); setView('RESTAURANT'); }}
                                className="group cursor-pointer bg-white rounded-2xl p-3 shadow-sm hover:shadow-md transition-all border border-transparent hover:border-orange-100"
                            >
                                <div className="flex gap-4">
                                    <div className="w-24 h-24 flex-shrink-0 rounded-xl overflow-hidden relative">
                                        <ImageWithFallback src={res.image} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                                        {res.promo && (
                                            <div className="absolute top-0 left-0 bg-red-500 text-white text-[10px] font-bold px-2 py-1 rounded-br-lg">{res.promo}</div>
                                        )}
                                    </div>
                                    <div className="flex-1 py-1">
                                        <div className="flex justify-between items-start mb-1">
                                            <h4 className="font-bold text-stone-900 text-lg leading-tight group-hover:text-orange-600 transition-colors">{res.name}</h4>
                                            <div className="flex items-center gap-1 bg-stone-50 px-1.5 py-0.5 rounded-md">
                                                <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
                                                <span className="text-xs font-bold text-stone-700">{res.rating}</span>
                                            </div>
                                        </div>
                                        <p className="text-xs text-stone-400 mb-2 line-clamp-1">{res.tags.join(' • ')}</p>
                                        <div className="flex items-center gap-3 mt-auto">
                                            <div className="flex items-center gap-1 text-xs text-stone-500 font-medium">
                                                <Clock className="w-3.5 h-3.5 text-stone-300" /> {res.time}
                                            </div>
                                            <div className="flex items-center gap-1 text-xs text-stone-500 font-medium">
                                                <Bike className="w-3.5 h-3.5 text-stone-300" /> ฿{res.deliveryFee}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Floating Cart Bar (if items in cart) */}
            <AnimatePresence>
                {cart.length > 0 && (
                    <motion.div 
                        initial={{ y: 100, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: 100, opacity: 0 }}
                        onClick={() => setView('CART')}
                        className="fixed bottom-24 left-4 right-4 z-[200] bg-gradient-to-r from-orange-600 to-orange-500 text-white p-4 rounded-2xl shadow-xl shadow-orange-200 cursor-pointer flex items-center justify-between"
                    >
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center font-bold text-lg">
                                {cartCount}
                            </div>
                            <div className="flex flex-col">
                                <span className="text-xs font-medium text-white/80">รวมทั้งหมด</span>
                                <span className="font-bold text-lg">฿{cartTotal}</span>
                            </div>
                        </div>
                        <div className="flex items-center gap-2 font-bold text-sm bg-white/20 px-4 py-2 rounded-xl">
                            ดูตะกร้า <ChevronRight size={16} />
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
  };

  // 2. RESTAURANT VIEW
  const RestaurantView = ({ restaurant }: { restaurant: Restaurant }) => {
    return (
        <div className="flex flex-col h-full bg-white animate-in slide-in-from-right duration-300">
             {/* Header Image */}
             <div className="relative h-60 shrink-0">
                 <ImageWithFallback src={restaurant.coverImage} className="w-full h-full object-cover" />
                 <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                 
                 {/* Top Nav */}
                 <div className="absolute top-0 left-0 right-0 p-4 flex justify-between items-start pt-[calc(3rem+env(safe-area-inset-top))]">
                     <button onClick={() => setView('HOME')} className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center text-white hover:bg-white/30 transition-colors">
                         <ChevronLeft size={24} />
                     </button>
                     <div className="flex gap-2">
                         <button className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center text-white hover:bg-white/30 transition-colors">
                             <Share2 size={20} />
                         </button>
                         <button className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center text-white hover:bg-white/30 transition-colors">
                             <Heart size={20} />
                         </button>
                     </div>
                 </div>

                 {/* Info Overlay */}
                 <div className="absolute bottom-0 left-0 right-0 p-4 text-white">
                     <h1 className="text-3xl font-bold mb-2 shadow-black drop-shadow-md">{restaurant.name}</h1>
                     <div className="flex items-center gap-3 text-sm font-medium">
                         <div className="flex items-center gap-1 bg-green-500 px-1.5 py-0.5 rounded text-white text-xs font-bold">
                             <Star size={10} className="fill-white" /> {restaurant.rating}
                         </div>
                         <span className="opacity-90">{restaurant.reviews} รีวิว</span>
                         <span className="opacity-60">•</span>
                         <span className="opacity-90">{restaurant.category}</span>
                         <span className="opacity-60">•</span>
                         <span className="opacity-90">{restaurant.distance}</span>
                     </div>
                 </div>
             </div>

             {/* Content */}
             <motion.div 
                className="flex-1 overflow-y-auto bg-stone-50 rounded-t-3xl -mt-4 relative z-10 pb-32 cursor-grab active:cursor-grabbing"
                drag="y"
                dragConstraints={{ top: 0, bottom: 0 }}
                dragElastic={{ top: 0, bottom: 0.3 }}
                dragTransition={{ power: 0.1, timeConstant: 200, bounceStiffness: 400, bounceDamping: 30 }}
                onDragEnd={(e, info) => {
                  if (info.offset.y > 150) {
                    onClose();
                  }
                }}
              >
                  <div className="p-2 pt-3 flex justify-center mb-2">
                      <div className="w-12 h-1 bg-stone-300 rounded-full opacity-50" />
                  </div>

                 {/* Delivery Info */}
                 <div className="px-4 mb-6">
                     <div className="bg-white rounded-xl p-4 shadow-sm border border-stone-100 flex items-center justify-between">
                         <div className="flex items-center gap-3">
                             <div className="w-10 h-10 rounded-full bg-orange-50 flex items-center justify-center text-orange-600">
                                 <Clock size={20} />
                             </div>
                             <div>
                                 <span className="block text-sm font-bold text-stone-800">ส่งใน {restaurant.time}</span>
                                 <span className="block text-xs text-stone-500">ค่าส่ง ฿{restaurant.deliveryFee}</span>
                             </div>
                         </div>
                         <div className="h-8 w-[1px] bg-stone-100" />
                         <div className="text-right">
                             <span className="block text-xs font-bold text-green-600 bg-green-50 px-2 py-1 rounded-lg">โปรโมชั่นลด 20%</span>
                         </div>
                     </div>
                 </div>

                 {/* Menu Section */}
                 <div className="px-4">
                     <h3 className="text-lg font-bold text-stone-800 mb-4">เมนูแนะนำ</h3>
                     <div className="space-y-4">
                         {restaurant.menu.map(item => {
                             const inCart = cart.find(c => c.id === item.id);
                             return (
                                 <div key={item.id} className="bg-white p-3 rounded-xl shadow-sm border border-transparent hover:border-orange-100 flex gap-3 group">
                                     <div className="w-24 h-24 rounded-lg overflow-hidden bg-stone-100 shrink-0">
                                         <ImageWithFallback src={item.image} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                                     </div>
                                     <div className="flex-1 min-w-0 flex flex-col">
                                         <h4 className="font-bold text-stone-900 leading-tight mb-1">{item.name}</h4>
                                         <p className="text-xs text-stone-400 line-clamp-2 mb-auto">{item.description}</p>
                                         <div className="flex items-center justify-between mt-2">
                                             <span className="font-bold text-lg text-stone-800">฿{item.price}</span>
                                             {inCart ? (
                                                 <div className="flex items-center gap-3 bg-stone-50 rounded-lg p-1">
                                                     <button onClick={() => updateQuantity(item.id, -1)} className="w-7 h-7 flex items-center justify-center bg-white rounded-md shadow-sm text-stone-600 hover:text-orange-600 disabled:opacity-50">
                                                         <Minus size={14} />
                                                     </button>
                                                     <span className="font-bold text-sm text-stone-900 w-4 text-center">{inCart.quantity}</span>
                                                     <button onClick={() => addToCart(item)} className="w-7 h-7 flex items-center justify-center bg-orange-500 rounded-md shadow-sm text-white hover:bg-orange-600">
                                                         <Plus size={14} />
                                                     </button>
                                                 </div>
                                             ) : (
                                                 <button onClick={() => addToCart(item)} className="w-8 h-8 rounded-lg bg-stone-100 flex items-center justify-center text-orange-600 hover:bg-orange-500 hover:text-white transition-colors">
                                                     <Plus size={18} />
                                                 </button>
                                             )}
                                         </div>
                                     </div>
                                 </div>
                             );
                         })}
                     </div>
                 </div>
             </motion.div>

             {/* Floating Cart Bar (Same as Home) */}
             <AnimatePresence>
                {cart.length > 0 && (
                    <motion.div 
                        initial={{ y: 100, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: 100, opacity: 0 }}
                        onClick={() => setView('CART')}
                        className="fixed bottom-24 left-4 right-4 z-[200] bg-gradient-to-r from-orange-600 to-orange-500 text-white p-4 rounded-2xl shadow-xl shadow-orange-200 cursor-pointer flex items-center justify-between"
                    >
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center font-bold text-lg">
                                {cartCount}
                            </div>
                            <div className="flex flex-col">
                                <span className="text-xs font-medium text-white/80">รวมทั้งหมด</span>
                                <span className="font-bold text-lg">฿{cartTotal}</span>
                            </div>
                        </div>
                        <div className="flex items-center gap-2 font-bold text-sm bg-white/20 px-4 py-2 rounded-xl">
                            ดูตะกร้า <ChevronRight size={16} />
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
  };

  // 3. CART VIEW
  const CartView = () => {
      const fee = selectedRestaurant?.deliveryFee || 0;
      const total = cartTotal + fee;

      return (
          <div className="flex flex-col h-full bg-stone-50 animate-in slide-in-from-right duration-300">
              {/* Header */}
              <div className="bg-white px-4 py-4 pt-[calc(1rem+env(safe-area-inset-top))] flex items-center gap-4 sticky top-0 z-20 shadow-sm">
                  <button onClick={() => setView('RESTAURANT')} className="w-10 h-10 rounded-full hover:bg-stone-50 flex items-center justify-center -ml-2">
                      <ChevronLeft size={24} className="text-stone-800" />
                  </button>
                  <div>
                      <h2 className="text-lg font-bold text-stone-900 leading-none">สรุปรายการสั่งซื้อ</h2>
                      <span className="text-xs text-stone-500">{selectedRestaurant?.name}</span>
                  </div>
              </div>

              {/* Scrollable */}
              <div className="flex-1 overflow-y-auto pb-32 p-4">
                  {/* Map / Address */}
                  <div className="bg-white rounded-xl p-4 shadow-sm border border-stone-100 mb-4 flex items-start gap-3">
                      <div className="w-10 h-10 rounded-full bg-orange-50 flex items-center justify-center shrink-0">
                          <MapPin size={20} className="text-orange-600" />
                      </div>
                      <div className="flex-1">
                          <div className="flex justify-between items-start mb-1">
                              <span className="font-bold text-stone-800 text-sm">ส่งที่: คอนโดของคุณ</span>
                              <span className="text-orange-500 text-xs font-bold cursor-pointer">แก้ไข</span>
                          </div>
                          <p className="text-xs text-stone-400">123 ถนนสุขุมวิท, แขวงคลองเตยเหนือ, เขตวัฒนา, กรุงเทพฯ</p>
                      </div>
                  </div>

                  {/* Items */}
                  <div className="bg-white rounded-xl p-4 shadow-sm border border-stone-100 mb-4 space-y-4">
                      {cart.map((item, i) => (
                          <div key={i} className="flex gap-3">
                              <div className="w-16 h-16 rounded-lg bg-stone-100 overflow-hidden shrink-0">
                                  <ImageWithFallback src={item.image} className="w-full h-full object-cover" />
                              </div>
                              <div className="flex-1 min-w-0">
                                  <div className="flex justify-between items-start">
                                      <h4 className="font-bold text-stone-900 text-sm line-clamp-1">{item.name}</h4>
                                      <span className="font-bold text-stone-900 text-sm">฿{item.price * item.quantity}</span>
                                  </div>
                                  <p className="text-xs text-stone-400 mb-2">ปกติ</p>
                                  <div className="flex items-center gap-3">
                                      <button onClick={() => removeFromCart(item.id)} className="text-xs text-red-500 font-medium">ลบรายการ</button>
                                      <div className="flex items-center gap-2 ml-auto">
                                          <button onClick={() => updateQuantity(item.id, -1)} className="w-6 h-6 rounded-md bg-stone-100 flex items-center justify-center text-stone-600 hover:bg-stone-200">
                                              <Minus size={12} />
                                          </button>
                                          <span className="text-sm font-bold w-4 text-center">{item.quantity}</span>
                                          <button onClick={() => updateQuantity(item.id, 1)} className="w-6 h-6 rounded-md bg-stone-100 flex items-center justify-center text-stone-600 hover:bg-stone-200">
                                              <Plus size={12} />
                                          </button>
                                      </div>
                                  </div>
                              </div>
                          </div>
                      ))}
                  </div>

                  {/* Payment */}
                  <div className="bg-white rounded-xl p-4 shadow-sm border border-stone-100 mb-4">
                      <div className="flex items-center justify-between mb-4">
                          <span className="text-sm font-bold text-stone-800">วิธีการชำระเงิน</span>
                          <span className="text-orange-500 text-xs font-bold cursor-pointer">เปลี่ยน</span>
                      </div>
                      <div className="flex items-center gap-3">
                          <div className="w-10 h-6 bg-blue-600 rounded flex items-center justify-center text-white text-[10px] font-bold tracking-widest">VISA</div>
                          <span className="text-sm text-stone-600 font-medium">•••• 4242</span>
                      </div>
                  </div>

                  {/* Summary */}
                  <div className="bg-white rounded-xl p-4 shadow-sm border border-stone-100 mb-4 space-y-2">
                      <div className="flex justify-between text-sm text-stone-500">
                          <span>ค่าอาหาร</span>
                          <span>฿{cartTotal}</span>
                      </div>
                      <div className="flex justify-between text-sm text-stone-500">
                          <span>ค่าส่ง</span>
                          <span>฿{fee}</span>
                      </div>
                      <div className="h-[1px] bg-stone-100 my-2" />
                      <div className="flex justify-between text-lg font-bold text-stone-900">
                          <span>ยอดรวม</span>
                          <span>฿{total}</span>
                      </div>
                  </div>
              </div>

              {/* Bottom Action */}
              <div className="fixed bottom-0 left-0 right-0 bg-white p-4 pb-10 border-t border-stone-100 z-30">
                  <button 
                    onClick={() => setView('TRACKING')}
                    className="w-full h-14 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-2xl font-bold text-lg shadow-lg shadow-orange-200 active:scale-[0.98] transition-transform flex items-center justify-center gap-2 mb-20 md:mb-0"
                  >
                      <span>สั่งเลย</span>
                      <span className="bg-white/20 px-2 py-0.5 rounded text-sm">฿{total}</span>
                  </button>
              </div>
          </div>
      );
  };

  // 4. TRACKING VIEW
  const TrackingView = () => (
      <div className="flex flex-col h-full bg-white animate-in zoom-in-95 duration-500">
          <div className="relative flex-1 bg-stone-100">
              <ImageWithFallback 
                src="https://images.unsplash.com/photo-1524661135-423995f22d0b?auto=format&fit=crop&w=800&q=80" 
                className="w-full h-full object-cover opacity-50 grayscale" 
              />
              <div className="absolute inset-0 bg-orange-500/10 mix-blend-multiply" />
              
              {/* Map Markers (Mock) */}
              <div className="absolute top-1/4 left-1/2 -translate-x-1/2 flex flex-col items-center">
                  <div className="w-12 h-12 bg-white rounded-full p-1 shadow-lg animate-bounce">
                      <ImageWithFallback src={selectedRestaurant?.image || ''} className="w-full h-full rounded-full object-cover" />
                  </div>
                  <div className="bg-white px-2 py-1 rounded-md shadow-sm mt-2 text-[10px] font-bold">ร้านค้า</div>
              </div>
              
              <div className="absolute bottom-1/3 left-1/2 -translate-x-1/2 flex flex-col items-center">
                  <div className="w-12 h-12 bg-orange-500 rounded-full p-2.5 shadow-lg border-4 border-white">
                      <Bike className="w-full h-full text-white" />
                  </div>
              </div>
          </div>

          <div className="bg-white rounded-t-3xl shadow-[0_-10px_40px_rgba(0,0,0,0.1)] -mt-6 relative z-10 px-6 pt-8 pb-32">
              <div className="flex items-center justify-between mb-6">
                  <div>
                      <h2 className="text-2xl font-bold text-stone-900 mb-1">กำลังจัดเตรียมอาหาร</h2>
                      <p className="text-stone-400 text-sm">คาดว่าจะถึงใน 15-20 นาที</p>
                  </div>
                  <div className="w-12 h-12 rounded-full bg-stone-100 flex items-center justify-center">
                      <Clock className="text-orange-500 animate-pulse" />
                  </div>
              </div>

              {/* Steps */}
              <div className="space-y-6 relative">
                  <div className="absolute left-[11px] top-2 bottom-2 w-0.5 bg-stone-100" />
                  
                  <div className="flex gap-4 relative">
                      <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center shrink-0 border-2 border-white shadow-sm z-10">
                          <CheckCircle2 size={14} className="text-white" />
                      </div>
                      <div>
                          <h4 className="font-bold text-stone-900 text-sm">รับออเดอร์แล้ว</h4>
                          <p className="text-xs text-stone-400">ร้านค้าได้รับออเดอร์ของคุณแล้ว</p>
                      </div>
                  </div>

                  <div className="flex gap-4 relative">
                      <div className="w-6 h-6 rounded-full bg-orange-500 flex items-center justify-center shrink-0 border-2 border-white shadow-sm z-10 animate-pulse">
                          <UtensilsCrossed size={14} className="text-white" />
                      </div>
                      <div>
                          <h4 className="font-bold text-stone-900 text-sm">กำลังปรุงอาหาร</h4>
                          <p className="text-xs text-stone-400">เชฟกำลังปรุงอาหารจานพิเศษเพื่อคุณ</p>
                      </div>
                  </div>

                  <div className="flex gap-4 relative opacity-40">
                      <div className="w-6 h-6 rounded-full bg-stone-200 flex items-center justify-center shrink-0 border-2 border-white shadow-sm z-10">
                          <Bike size={14} className="text-stone-500" />
                      </div>
                      <div>
                          <h4 className="font-bold text-stone-900 text-sm">ไรเดอร์กำลังไปรับ</h4>
                          <p className="text-xs text-stone-400">พี่ไรเดอร์จะไปถึงร้านใน 5 นาที</p>
                      </div>
                  </div>
              </div>

              <button onClick={() => setView('HOME')} className="w-full mt-8 py-3 rounded-xl border border-stone-200 text-stone-500 font-bold hover:bg-stone-50 transition-colors">
                  กลับหน้าหลัก
              </button>
          </div>
      </div>
  );

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div 
        initial={{ y: '100%' }}
        animate={{ y: '0%' }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        className="fixed inset-0 z-[100] flex flex-col bg-slate-50 overflow-hidden"
      >
          {view === 'HOME' && <HomeView key="home" />}
          {view === 'RESTAURANT' && selectedRestaurant && <RestaurantView key="res" restaurant={selectedRestaurant} />}
          {view === 'CART' && <CartView key="cart" />}
          {view === 'TRACKING' && <TrackingView key="track" />}
      </motion.div>
    </AnimatePresence>
  );
}
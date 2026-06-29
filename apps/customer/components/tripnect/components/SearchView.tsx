import { useState, useRef, useEffect } from 'react';
import { 
    Search, Map, Tent, Umbrella, Coffee, 
    Camera, Mountain, Building2, MapPin, 
    Star, Heart, SlidersHorizontal, Ticket,
    Palmtree, Waves, Castle, ArrowUpRight, Sparkles, X, TrendingUp, Clock, ArrowLeft
} from 'lucide-react';
import Masonry, { ResponsiveMasonry } from "react-responsive-masonry";
import { ImageWithFallback } from './figma/ImageWithFallback';

// --- Types & Data ---
interface ExploreItem {
    id: number;
    image: string;
    title: string;
    location: string;
    rating: number;
    category: string;
    type: 'stay' | 'place' | 'food';
}

const CATEGORIES = [
  { id: 'all', label: 'สำหรับคุณ', icon: Star },
  { id: 'nature', label: 'ธรรมชาติ', icon: Mountain },
  { id: 'cafe', label: 'คาเฟ่', icon: Coffee },
  { id: 'camping', label: 'แคมป์ปิ้ง', icon: Tent },
  { id: 'photo', label: 'จุดถ่ายรูป', icon: Camera },
  { id: 'city', label: 'เมืองเก่า', icon: Building2 },
];

const EXPLORE_ITEMS: ExploreItem[] = [
  {
    id: 1,
    image: "https://images.unsplash.com/photo-1598971639058-fab3c3109a00?auto=format&fit=crop&q=80&w=600",
    title: "วัดพระธาตุดอยสุเทพ",
    location: "เมืองเชียงใหม่",
    rating: 4.9,
    category: 'photo',
    type: 'place'
  },
  {
    id: 2,
    image: "https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?auto=format&fit=crop&q=80&w=600",
    title: "รีสอร์ทแม่ริม",
    location: "แม่ริม",
    rating: 4.8,
    category: 'nature',
    type: 'stay'
  },
  {
    id: 3,
    image: "https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?auto=format&fit=crop&q=80&w=600",
    title: "คาเฟ่นิมมาน",
    location: "เมืองเชียงใหม่",
    rating: 4.7,
    category: 'cafe',
    type: 'food'
  },
  {
    id: 4,
    image: "https://images.unsplash.com/photo-1478131143081-80f7f84ca84d?auto=format&fit=crop&q=80&w=600",
    title: "Camping ดอยอ่างขาง",
    location: "ฝาง",
    rating: 4.9,
    category: 'camping',
    type: 'place'
  },
  {
    id: 5,
    image: "https://images.unsplash.com/photo-1533929736458-ca588d08c8be?auto=format&fit=crop&q=80&w=600",
    title: "ร้านชาญี่ปุ่นสไตล์ล้านนา",
    location: "สันกำแพง",
    rating: 4.85,
    category: 'cafe',
    type: 'food'
  },
  {
    id: 6,
    image: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?auto=format&fit=crop&q=80&w=600",
    title: "ดอยอินทนนท์",
    location: "จอมทอง",
    rating: 5.0,
    category: 'nature',
    type: 'place'
  },
  {
    id: 7,
    image: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&q=80&w=600",
    title: "ตลาดต้นพยอม",
    location: "เมืองเชียงใหม่",
    rating: 4.6,
    category: 'cafe',
    type: 'food'
  },
  {
    id: 8,
    image: "https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?auto=format&fit=crop&q=80&w=600",
    title: "รีสอร์ทดอยสะเก็ด",
    location: "ดอยสะเก็ด",
    rating: 4.7,
    category: 'nature',
    type: 'stay'
  },
  {
    id: 9,
    image: "https://images.unsplash.com/photo-1598971639058-fab3c3109a00?auto=format&fit=crop&q=80&w=600",
    title: "วัดเจดีย์หลวง",
    location: "เมืองเชียงใหม่",
    rating: 4.8,
    category: 'photo',
    type: 'place'
  },
  {
    id: 10,
    image: "https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?auto=format&fit=crop&q=80&w=600",
    title: "Artisan Coffee Roasters",
    location: "สันทราย",
    rating: 4.9,
    category: 'cafe',
    type: 'food'
  },
  {
    id: 11,
    image: "https://images.unsplash.com/photo-1478131143081-80f7f84ca84d?auto=format&fit=crop&q=80&w=600",
    title: "ปาช้างแม่แตง",
    location: "แม่แตง",
    rating: 4.6,
    category: 'nature',
    type: 'place'
  },
  {
    id: 12,
    image: "https://images.unsplash.com/photo-1598971639058-fab3c3109a00?auto=format&fit=crop&q=80&w=600",
    title: "วัดพระสิงห์",
    location: "เมืองเชียงใหม่",
    rating: 4.7,
    category: 'city',
    type: 'place'
  },
  {
    id: 13,
    image: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?auto=format&fit=crop&q=80&w=600",
    title: "ดอยเชียงดาว",
    location: "เชียงดาว",
    rating: 4.9,
    category: 'nature',
    type: 'place'
  },
  {
    id: 14,
    image: "https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?auto=format&fit=crop&q=80&w=600",
    title: "คาเฟ่ในสวนแม่ริม",
    location: "แม่ริม",
    rating: 4.8,
    category: 'cafe',
    type: 'food'
  },
  {
    id: 15,
    image: "https://images.unsplash.com/photo-1478131143081-80f7f84ca84d?auto=format&fit=crop&q=80&w=600",
    title: "บ้านแพรก แม่กำปอง",
    location: "แม่ออน",
    rating: 4.7,
    category: 'camping',
    type: 'stay'
  },
  {
    id: 16,
    image: "https://images.unsplash.com/photo-1598971639058-fab3c3109a00?auto=format&fit=crop&q=80&w=600",
    title: "แกรนด์แคนยอน",
    location: "หางดง",
    rating: 4.5,
    category: 'photo',
    type: 'place'
  },
  {
    id: 17,
    image: "https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?auto=format&fit=crop&q=80&w=600",
    title: "Mon Cham",
    location: "แม่ริม",
    rating: 4.8,
    category: 'nature',
    type: 'place'
  },
  {
    id: 18,
    image: "https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?auto=format&fit=crop&q=80&w=600",
    title: "คาเฟ่ข้าวคั่ว",
    location: "เมืองเชียงใหม่",
    rating: 4.6,
    category: 'cafe',
    type: 'food'
  }
];

// Trending Searches
const TRENDING_SEARCHES = [
  { query: 'ดอยสุเทพ', count: '15.2K', trend: '+28%' },
  { query: 'นิมมาน', count: '12.8K', trend: '+22%' },
  { query: 'คาเฟ่แม่ริม', count: '9.4K', trend: '+35%' },
  { query: 'ดอยอินทนนท์', count: '8.1K', trend: '+18%' },
  { query: 'ปางช้าง', count: '6.5K', trend: '+15%' },
];

// --- Typewriter Hook ---
const useTypewriter = (phrases: string[], typingSpeed = 50, deletingSpeed = 30, pauseTime = 1500) => {
  const [text, setText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [loopNum, setLoopNum] = useState(0);

  useEffect(() => {
    const i = loopNum % phrases.length;
    const fullText = phrases[i];

    const handleTyping = () => {
      setText(isDeleting 
        ? fullText.substring(0, text.length - 1) 
        : fullText.substring(0, text.length + 1)
      );

      if (!isDeleting && text === fullText) {
        setTimeout(() => setIsDeleting(true), pauseTime);
      } else if (isDeleting && text === '') {
        setIsDeleting(false);
        setLoopNum(loopNum + 1);
      }
    };

    const timer = setTimeout(handleTyping, isDeleting ? deletingSpeed : typingSpeed);
    return () => clearTimeout(timer);
  }, [text, isDeleting, loopNum, phrases, typingSpeed, deletingSpeed, pauseTime]);

  return text;
};

export function SearchView({ onClose }: { onClose?: () => void }) {
  const [activeCategory, setActiveCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  const phrases = [
    "ค้นหาคาเฟ่ในเชียงใหม่...",
    "ที่พักแม่ริม...",
    "ดอยสุเทพ...",
    "ตลาดต้นพยอม..."
  ];

  const typewriterText = useTypewriter(phrases);

  // Load recent searches from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('tripnect_recent_searches');
    if (saved) {
      try {
        setRecentSearches(JSON.parse(saved));
      } catch (e) {
        setRecentSearches([]);
      }
    }
  }, []);

  // Save search to history
  const saveSearchToHistory = (query: string) => {
    if (!query.trim()) return;
    
    const updated = [query, ...recentSearches.filter(s => s !== query)].slice(0, 10);
    setRecentSearches(updated);
    localStorage.setItem('tripnect_recent_searches', JSON.stringify(updated));
  };

  // Clear all recent searches
  const clearRecentSearches = () => {
    setRecentSearches([]);
    localStorage.removeItem('tripnect_recent_searches');
  };

  // Handle search submission
  const handleSearch = (query: string) => {
    setSearchQuery(query);
    saveSearchToHistory(query);
  };

  const filteredItems = activeCategory === 'all'
    ? EXPLORE_ITEMS
    : EXPLORE_ITEMS.filter(item => item.category === activeCategory);

  const searchResults = searchQuery.trim() 
    ? EXPLORE_ITEMS.filter(item => 
        item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.location.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : filteredItems;

  const showEmptyState = !searchQuery && activeCategory === 'all';

  return (
    <div className="min-h-screen bg-white">
      {/* Search Bar with Back Button - Sticky */}
      <div className="sticky top-0 z-20 bg-white border-b border-slate-100">
        <div className="px-4 py-3 flex items-center gap-3">
          {/* Back Button */}
          {onClose && (
            <button 
              onClick={onClose}
              className="flex items-center justify-center text-slate-700 hover:text-slate-900 transition-colors flex-shrink-0"
            >
              <ArrowLeft size={20} strokeWidth={2.5} />
            </button>
          )}
          
          {/* Search Input */}
          <div className="relative h-[44px] flex-1">
            <div className="absolute inset-0 bg-gradient-to-r from-orange-400 via-red-400 to-red-500 rounded-full animate-pulse opacity-20" />
            <div className="absolute inset-[1px] bg-white rounded-full flex items-center overflow-hidden border border-orange-100">
              <div className="pl-4 flex items-center pointer-events-none z-10">
                <Sparkles className="h-4 w-4 text-orange-500" />
              </div>
              {searchQuery === "" && !isSearchFocused && (
                <div className="absolute inset-y-0 left-0 right-0 pl-11 pr-10 flex items-center pointer-events-none z-0 overflow-hidden">
                  <div className="flex items-center w-full">
                    <span className="text-sm font-medium text-slate-400 truncate block max-w-full">{typewriterText}</span>
                    <span className="w-[1.5px] h-4 bg-orange-500 ml-0.5 animate-pulse flex-shrink-0" />
                  </div>
                </div>
              )}
              <input 
                ref={inputRef}
                type="text" 
                value={searchQuery} 
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => setIsSearchFocused(true)}
                onBlur={() => setIsSearchFocused(false)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && searchQuery.trim()) {
                    handleSearch(searchQuery);
                    inputRef.current?.blur();
                  }
                }}
                className="block w-full pl-3 pr-10 h-full bg-transparent border-none text-sm text-slate-900 focus:ring-0 focus:outline-none placeholder-transparent z-10" 
                placeholder=""
              />
              {searchQuery && (
                <button 
                  onClick={() => setSearchQuery('')}
                  className="pr-3 z-10"
                >
                  <X className="h-4 w-4 text-slate-400 hover:text-slate-600" />
                </button>
              )}
              {!searchQuery && (
                <div className="pr-3 flex items-center pointer-events-none z-10">
                  <Search className="h-4 w-4 text-orange-400" />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Categories - Only show when not searching */}
        {!searchQuery && (
          <div className="flex border-b border-slate-100 overflow-x-auto scrollbar-hide">
            {CATEGORIES.map((cat) => {
              const isActive = activeCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategory(cat.id)}
                  className={`flex-1 min-w-[80px] py-3 text-[14px] font-medium transition-colors relative flex-shrink-0 ${
                    isActive
                      ? 'text-orange-500'
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  {cat.label}
                  {isActive && (
                    <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-orange-500" />
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="pb-20">
        {/* Show history/trending when not searching */}
        {showEmptyState ? (
          <div className="px-4 pt-4">
            {/* Recent Searches */}
            {recentSearches.length > 0 && (
              <div className="mb-6">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Clock size={16} className="text-slate-400" />
                    <h3 className="text-sm font-semibold text-slate-700">ประวัติการค้นหา</h3>
                  </div>
                  <button 
                    onClick={clearRecentSearches}
                    className="text-xs font-semibold text-orange-500 hover:text-orange-600"
                  >
                    ล้างทั้งหมด
                  </button>
                </div>
                <div className="space-y-1">
                  {recentSearches.map((term, i) => (
                    <button
                      key={i}
                      onClick={() => handleSearch(term)}
                      className="w-full flex items-center gap-3 py-2.5 group"
                    >
                      <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-orange-50 group-hover:text-orange-500 transition-colors">
                        <Search size={14} strokeWidth={2} />
                      </div>
                      <span className="flex-1 text-left text-sm font-medium text-slate-600 group-hover:text-slate-900">{term}</span>
                      <X 
                        size={14} 
                        className="text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={(e) => {
                          e.stopPropagation();
                          const updated = recentSearches.filter(s => s !== term);
                          setRecentSearches(updated);
                          localStorage.setItem('tripnect_recent_searches', JSON.stringify(updated));
                        }}
                      />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Trending Searches */}
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-3">
                <TrendingUp size={16} className="text-orange-500" />
                <h3 className="text-sm font-semibold text-slate-700">ค้นหาที่กำลังฮิตตอนนี้</h3>
              </div>
              <div className="space-y-2">
                {TRENDING_SEARCHES.map((item, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSearch(item.query)}
                    className="w-full flex items-center gap-3 py-3 px-3 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors group"
                  >
                    <div className="flex items-center justify-center w-6 h-6 rounded-full bg-orange-100 text-orange-600 text-xs font-bold">
                      {idx + 1}
                    </div>
                    <div className="flex-1 text-left">
                      <div className="text-sm font-semibold text-slate-900 group-hover:text-orange-600 transition-colors">
                        {item.query}
                      </div>
                      <div className="text-xs text-slate-500">
                        {item.count} การค้นหา
                      </div>
                    </div>
                    <div className="flex items-center gap-1 text-xs font-semibold text-green-600">
                      <TrendingUp size={12} />
                      {item.trend}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Recommended Tags */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Sparkles size={14} className="text-orange-500" />
                <h3 className="text-sm font-semibold text-slate-700">แนะนำสำหรับคุณ</h3>
              </div>
              <div className="flex flex-wrap gap-2">
                {['🏔️ ดอยสุเทพ', '☕ คาเฟ่นิมมาน', '🏕️ แม่กำปอง', '🐘 ปางช้าง', '🌸 ดอยอินทนนท์', '🏛️ วัดเก่า'].map((tag, i) => (
                  <button
                    key={i}
                    onClick={() => handleSearch(tag.replace(/^[^\w\u0E00-\u0E7F]+/, '').trim())}
                    className="px-4 py-2 rounded-full bg-slate-50 border border-slate-100 text-sm font-medium text-slate-600 hover:bg-white hover:text-orange-600 hover:border-orange-200 transition-colors"
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          /* Search Results */
          <div className="p-4">
            {searchResults.length > 0 ? (
              <>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-sm font-semibold text-slate-700">
                    {searchQuery ? `ผลลัพธ์สำหรับ "${searchQuery}"` : `แนะนำสำหรับคุณ`}
                  </h2>
                  <span className="text-xs text-slate-400">{searchResults.length} รายการ</span>
                </div>

                <ResponsiveMasonry columnsCountBreakPoints={{ 350: 2, 750: 2, 900: 3 }}>
                  <Masonry gutter="12px">
                    {searchResults.map((item) => (
                      <button
                        key={item.id}
                        className="w-full rounded-xl overflow-hidden bg-white border border-slate-100 hover:border-orange-200 hover:shadow-md transition-all group"
                      >
                        <div className="relative overflow-hidden">
                          <ImageWithFallback
                            src={item.image}
                            alt={item.title}
                            className="w-full h-auto object-cover"
                          />
                          <div className="absolute top-2 right-2 w-8 h-8 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <Heart size={16} className="text-slate-600" strokeWidth={2} />
                          </div>
                        </div>
                        <div className="p-3">
                          <h3 className="font-semibold text-sm text-slate-900 mb-1 text-left">{item.title}</h3>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1 text-xs text-slate-500">
                              <MapPin size={11} />
                              <span className="truncate">{item.location}</span>
                            </div>
                            <div className="flex items-center gap-1 text-xs font-semibold text-slate-700">
                              <Star size={11} className="fill-orange-400 text-orange-400" />
                              <span>{item.rating}</span>
                            </div>
                          </div>
                        </div>
                      </button>
                    ))}
                  </Masonry>
                </ResponsiveMasonry>
              </>
            ) : (
              <div className="text-center py-16 px-6">
                <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Search size={28} className="text-slate-400" />
                </div>
                <h3 className="font-semibold mb-1">ไม่พบผลลัพธ์</h3>
                <p className="text-sm text-slate-500 mb-4">ลองค้นหาด้วยคำอื่น</p>
                <button
                  onClick={() => setSearchQuery('')}
                  className="text-sm font-semibold text-orange-500 hover:text-orange-600"
                >
                  ล้างคำค้นหา
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
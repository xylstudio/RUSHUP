import { useState, useRef, useEffect } from 'react';
import { clsx } from 'clsx';
import { UtensilsCrossed, BedDouble, MapPinned, Navigation, Heart, Share2, Hand, Sparkles } from 'lucide-react';

// --- Mock Data ---
const PLACES = {
  food: [
    { id: 1, name: 'เจ๊โอว ข้าวต้มเป็ด', loc: 'บรรทัดทอง', img: 'https://images.unsplash.com/photo-1563245372-f21724e3856d?w=800&q=80' },
    { id: 2, name: 'Tichuca Rooftop', loc: 'เอกมัย', img: 'https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?w=800&q=80' },
    { id: 3, name: 'Mont Nom Sod', loc: 'เสาชิงช้า', img: 'https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=800&q=80' },
    { id: 4, name: 'Pad Thai Thipsamai', loc: 'ประตูผี', img: 'https://images.unsplash.com/photo-1559314809-0d155014e29e?w=800&q=80' },
    { id: 5, name: 'Somsak Pu Ob', loc: 'ลาดหญ้า', img: 'https://images.unsplash.com/photo-1565557623262-b51c2513a641?w=800&q=80' },
  ],
  hotel: [
    { id: 1, name: 'Sala Rattanakosin', loc: 'ท่าเตียน', img: 'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=800&q=80' },
    { id: 2, name: 'The Standard', loc: 'มหานคร', img: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800&q=80' },
    { id: 3, name: 'Capella Bangkok', loc: 'เจริญกรุง', img: 'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?w=800&q=80' },
    { id: 4, name: 'Bangkok Publishing', loc: 'หลานหลวง', img: 'https://images.unsplash.com/photo-1505691938895-1758d7feb511?w=800&q=80' },
  ],
  trip: [
    { id: 1, name: 'สวนเบญจกิติ', loc: 'คลองเตย', img: 'https://images.unsplash.com/photo-1596707328638-a28a1c97f478?w=800&q=80' },
    { id: 2, name: 'หอศิลป์ BACC', loc: 'ปทุมวัน', img: 'https://images.unsplash.com/photo-1558591710-4b4a1ae0f04d?w=800&q=80' },
    { id: 3, name: 'ตลาดน้อย', loc: 'เจริญกรุง', img: 'https://images.unsplash.com/photo-1533667107775-f20173295ce8?w=800&q=80' },
    { id: 4, name: 'Sea Life Ocean', loc: 'สยาม', img: 'https://images.unsplash.com/photo-1581486047321-4d37553b34b1?w=800&q=80' },
  ]
};

type Category = 'food' | 'hotel' | 'trip';

export function MatchView() {
  const [category, setCategory] = useState<Category>('food');
  const [currentIdx, setCurrentIdx] = useState(0);
  const [isSpinning, setIsSpinning] = useState(false);
  const [result, setResult] = useState<any>(null);
  
  // Gesture State
  const [dragX, setDragX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  
  // Logic Refs
  const startXRef = useRef(0);
  const startTimeRef = useRef(0);
  const velocityRef = useRef(0);

  const currentData = PLACES[category] || PLACES['food'];
  
  // --- Animation Effect ---
  useEffect(() => {
    if (!isSpinning) return;

    let timeoutId: number;
    let speed = Math.max(15, 80 - (velocityRef.current * 40));
    let steps = 0;
    const maxSteps = 35 + Math.floor(velocityRef.current * 15);

    const tick = () => {
      setCurrentIdx(prev => (prev + 1) % currentData.length);
      steps++;

      // Speed Curve
      if (steps > 10) {
        if (steps < maxSteps - 12) {
          speed *= 1.1; 
        } else {
          speed *= 1.25;
        }
      }

      if (speed > 500) {
        // Stop
        setIsSpinning(false);
        setResult(true); // Just flag that we are done, UI will use currentIdx
      } else {
        timeoutId = window.setTimeout(tick, speed);
      }
    };

    timeoutId = window.setTimeout(tick, speed);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [isSpinning, currentData.length]); // Dependency ensures clean restart

  // --- Handlers ---

  const handleCategoryChange = (cat: Category) => {
    if (isSpinning) return;
    setCategory(cat);
    setCurrentIdx(0);
    setResult(null);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (isSpinning) return;
    // Basic check for touch existence
    if (!e.touches || e.touches.length === 0) return;
    
    e.stopPropagation(); // Prevent bubbling issues
    setIsDragging(true);
    startXRef.current = e.touches[0].clientX;
    startTimeRef.current = Date.now();
    setResult(null); 
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging || isSpinning) return;
    if (!e.touches || e.touches.length === 0) return;

    e.stopPropagation();
    const currentX = e.touches[0].clientX;
    const deltaX = currentX - startXRef.current;
    setDragX(deltaX * 0.7); 
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!isDragging) return;
    e.stopPropagation();
    setIsDragging(false);

    const endTime = Date.now();
    const duration = endTime - startTimeRef.current;
    const distance = Math.abs(dragX);
    const velocity = distance / (duration || 1);

    if (velocity > 0.4 || distance > 80) { 
      velocityRef.current = velocity; // Store for effect
      setIsSpinning(true); // Trigger Effect
      setDragX(0);
      setResult(null);
    } else {
      setDragX(0); // Snap back
    }
  };

  const activeItem = currentData[currentIdx] || currentData[0];
  if (!activeItem) return null;

  // Simple rotation calculation without complex physics
  const rotation = dragX * 0.05;

  return (
    <div className="fixed inset-0 bg-white font-sans overflow-hidden flex flex-col items-center touch-none">
      
      {/* Spacer */}
      <div className="h-[55px] flex-shrink-0 w-full" />

      {/* Main Container */}
      <div className="flex-1 w-full max-w-md flex flex-col px-6 pb-6 pt-2 gap-6">
        
        {/* Category Pills */}
        <div className="w-full flex justify-center z-20">
            <div className="flex gap-2">
            {(['food', 'hotel', 'trip'] as const).map((cat) => (
                <button 
                key={cat}
                onClick={() => handleCategoryChange(cat)}
                className={clsx(
                    "px-4 py-2 rounded-full text-sm font-medium transition-all duration-300 flex items-center gap-2 border",
                    category === cat
                    ? "bg-stone-900 text-white border-stone-900 shadow-md transform scale-105" 
                    : "bg-white text-stone-400 border-transparent hover:bg-stone-50"
                )}
                >
                {cat === 'food' && <UtensilsCrossed className="w-4 h-4" />}
                {cat === 'hotel' && <BedDouble className="w-4 h-4" />}
                {cat === 'trip' && <MapPinned className="w-4 h-4" />}
                <span>{cat === 'food' ? 'กิน' : cat === 'hotel' ? 'นอน' : 'เที่ยว'}</span>
                </button>
            ))}
            </div>
        </div>

        {/* Card Area - REMOVED Perspective to fix crashes */}
        <div className="flex-1 relative flex items-center justify-center">
            <div 
                className="relative w-full aspect-[3/4] max-h-[55vh] z-10 group"
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
            >
                {/* Shadow Layer */}
                <div className="absolute top-4 left-4 right-4 bottom-[-10px] bg-stone-100 rounded-[32px] -z-10 transition-transform duration-500 ease-out" 
                     style={{ transform: result ? 'translateY(5px) scale(0.95)' : 'none' }}
                />

                {/* Card */}
                <div 
                    style={{
                        transform: `translateX(${dragX}px) rotate(${rotation}deg)`,
                        transition: isDragging ? 'none' : 'transform 0.6s cubic-bezier(0.2, 0.8, 0.2, 1)'
                    }}
                    className={clsx(
                        "w-full h-full rounded-[32px] overflow-hidden relative shadow-2xl bg-white select-none",
                        isSpinning && "scale-[1.02]"
                    )}
                >
                    <img 
                        src={activeItem.img} 
                        className={clsx(
                            "w-full h-full object-cover transition-all duration-300",
                            isSpinning && "blur-[2px] opacity-90"
                        )}
                        draggable="false"
                        alt={activeItem.name}
                    />
                    
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/10 pointer-events-none" />

                    {/* Hint Animation */}
                    {!isSpinning && !result && (
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20 pointer-events-none flex flex-col items-center justify-center gap-3 opacity-90 animate-pulse">
                            <div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/40 shadow-lg">
                                <Hand className="w-8 h-8 text-white rotate-12 ml-1" strokeWidth={2} />
                            </div>
                            <span className="text-white font-bold text-xs tracking-[0.2em] uppercase drop-shadow-md">
                                ปัดเพื่อสุ่ม
                            </span>
                        </div>
                    )}

                    {/* Info */}
                    <div className="absolute bottom-0 left-0 right-0 p-8 text-white flex flex-col items-center text-center pointer-events-none">
                        {!isSpinning && (
                           <div className="animate-fade-in-up">
                                <h2 className="text-3xl font-bold tracking-tight mb-2 drop-shadow-lg leading-tight">
                                    {activeItem.name}
                                </h2>
                                <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/20 backdrop-blur-md rounded-full text-xs font-medium border border-white/10 shadow-sm">
                                    <MapPinned className="w-3 h-3" /> {activeItem.loc}
                                </div>
                           </div>
                        )}
                    </div>
                    
                    {/* Result Badge */}
                    {result && !isSpinning && (
                        <div className="absolute top-4 right-4">
                            <div className="bg-orange-500 text-white text-[10px] font-bold px-2 py-1 rounded-full shadow-lg flex items-center gap-1 animate-scale-in">
                                <Sparkles className="w-3 h-3" /> MATCHED
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>

        {/* Action Buttons */}
        <div className="h-[80px] w-full flex items-center justify-center">
            <div className={clsx(
                "flex items-center gap-4 transition-all duration-500 transform",
                !isSpinning && result ? "translate-y-0 opacity-100 scale-100" : "translate-y-10 opacity-0 scale-90 pointer-events-none"
            )}>
                 <button 
                    onClick={() => { velocityRef.current = 0.5; setIsSpinning(true); setResult(null); }} 
                    className="w-14 h-14 rounded-full bg-white border border-stone-100 shadow-sm flex items-center justify-center text-stone-400 hover:text-stone-900 active:bg-stone-50 transition-colors"
                 >
                    <Share2 className="w-6 h-6" />
                 </button>

                 <button className="h-14 px-8 rounded-full bg-orange-500 text-white font-bold text-lg shadow-orange-200 shadow-xl flex items-center gap-3 hover:bg-orange-600 active:scale-95 transition-all">
                    <Navigation className="w-5 h-5 fill-current" /> 
                    <span>ไปที่นี่</span>
                 </button>

                 <button className="w-14 h-14 rounded-full bg-white border border-stone-100 shadow-sm flex items-center justify-center text-stone-400 hover:text-rose-500 active:bg-rose-50 transition-colors">
                    <Heart className="w-6 h-6" />
                 </button>
            </div>
        </div>

      </div>
    </div>
  );
}

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Utensils, Plane, X, Zap, ChevronRight, RefreshCw, ArrowRight } from 'lucide-react';
import { clsx } from 'clsx';

// --- Types ---
export type RandomizerActionType = 'search_food' | 'plan_trip' | 'explore_place';

export interface RandomizerResult {
    type: RandomizerActionType;
    query: string;
}

interface RandomizerData {
    id: string;
    text: string;
    sub: string;
    icon: any;
    items: { text: string; query: string }[];
    action: RandomizerActionType;
}

const CATEGORIES: RandomizerData[] = [
    {
        id: 'food',
        text: 'Food',
        sub: 'กินไรดี',
        icon: Utensils,
        action: 'search_food',
        items: [
            { text: 'ข้าวซอย', query: 'ข้าวซอย' },
            { text: 'หมูกระทะ', query: 'หมูกระทะ' },
            { text: 'ส้มตำ', query: 'ส้มตำ' },
            { text: 'Sushi', query: 'Sushi' },
            { text: 'Pizza', query: 'Pizza' },
            { text: 'Burger', query: 'Burger' },
            { text: 'Ramen', query: 'Ramen' },
            { text: 'Dim Sum', query: 'Dim Sum' },
        ]
    },
    {
        id: 'trip',
        text: 'Trip',
        sub: 'ไปไหนดี',
        icon: Plane,
        action: 'plan_trip',
        items: [
            { text: 'Chiang Mai', query: 'เชียงใหม่' },
            { text: 'Phuket', query: 'ภูเก็ต' },
            { text: 'Hua Hin', query: 'หัวหิน' },
            { text: 'Nan', query: 'น่าน' },
            { text: 'Khao Yai', query: 'เขาใหญ่' },
            { text: 'Krabi', query: 'Krabi' },
            { text: 'Japan', query: 'Japan' },
            { text: 'Taiwan', query: 'Taiwan' },
        ]
    },
    {
        id: 'quest',
        text: 'Quest',
        sub: 'ทำไรดี',
        icon: Zap,
        action: 'explore_place',
        items: [
            { text: 'Cafe Hopping', query: 'Cafe' },
            { text: 'City Park', query: 'Park' },
            { text: 'Temple', query: 'Temple' },
            { text: 'Cinema', query: 'Cinema' },
            { text: 'Rooftop Bar', query: 'Rooftop' },
            { text: 'Spa & Massage', query: 'Spa' },
            { text: 'Art Gallery', query: 'Art Gallery' },
        ]
    }
];

interface MagicRandomizerProps {
  isOpen: boolean;
  onClose: () => void;
  initialCategory?: 'food' | 'trip' | 'quest' | null;
  onResultAction: (result: RandomizerResult) => void;
}

export function MagicRandomizer({ isOpen, onClose, initialCategory = null, onResultAction }: MagicRandomizerProps) {
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [rollingText, setRollingText] = useState<string>('');
  const [isRolling, setIsRolling] = useState(false);
  const [result, setResult] = useState<{ text: string; query: string } | null>(null);

  useEffect(() => {
    if (isOpen) {
        if (initialCategory) {
            handleSpin(initialCategory);
        } else {
            setActiveCategory(null);
            setResult(null);
            setIsRolling(false);
        }
    }
  }, [isOpen, initialCategory]);

  const handleSpin = (catId: string) => {
      setActiveCategory(catId);
      setIsRolling(true);
      setResult(null);

      const category = CATEGORIES.find(c => c.id === catId);
      if (!category) return;

      let count = 0;
      let speed = 50;
      const maxCount = 20;
      
      const tick = () => {
          const randomItem = category.items[Math.floor(Math.random() * category.items.length)];
          setRollingText(randomItem.text);
          count++;

          if (count < maxCount) {
              speed += count * 1.5; // Exponential slow down
              setTimeout(tick, speed);
          } else {
              setIsRolling(false);
              setResult(randomItem);
          }
      };

      tick();
  };

  const confirmResult = () => {
      const category = CATEGORIES.find(c => c.id === activeCategory);
      if (category && result) {
          onResultAction({
              type: category.action,
              query: result.query
          });
      }
  };

  const reset = () => {
      setActiveCategory(null);
      setResult(null);
      setIsRolling(false);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
            {/* Backdrop */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={onClose}
                className="fixed inset-0 bg-stone-900/20 backdrop-blur-[2px] z-[250]"
            />

            {/* Bottom Sheet */}
            <motion.div
                initial={{ y: '100%' }}
                animate={{ y: '0%' }}
                exit={{ y: '100%' }}
                transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                className="fixed bottom-0 left-0 right-0 z-[260] bg-white rounded-t-[32px] overflow-hidden shadow-[0_-10px_60px_rgba(0,0,0,0.05)] pb-safe cursor-grab active:cursor-grabbing"
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
                {/* Drag Handle */}
                <div className="w-full flex justify-center pt-3 pb-1">
                    <div className="w-10 h-1 bg-stone-100 rounded-full" />
                </div>

                <div className="p-6 pb-8 min-h-[300px] flex flex-col relative">
                    
                    {/* Header */}
                    {!activeCategory && (
                        <div className="flex justify-between items-center mb-8">
                            <span className="text-xs font-bold text-stone-300 uppercase tracking-[0.2em]">Randomizer</span>
                            <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-stone-50 text-stone-300 hover:text-stone-900 transition-colors">
                                <X size={18} />
                            </button>
                        </div>
                    )}

                    {/* CONTENT AREA */}
                    <div className="flex-1 flex flex-col justify-center">
                        
                        {!activeCategory ? (
                            /* 1. SELECTION GRID (Minimalist) */
                            <div className="grid grid-cols-3 gap-4">
                                {CATEGORIES.map((cat) => (
                                    <motion.button
                                        key={cat.id}
                                        whileTap={{ scale: 0.97 }}
                                        onClick={() => handleSpin(cat.id)}
                                        className="flex flex-col items-center justify-center gap-4 py-8 rounded-2xl bg-stone-50 hover:bg-stone-100 transition-colors group"
                                    >
                                        <cat.icon size={28} strokeWidth={1} className="text-stone-400 group-hover:text-stone-900 transition-colors" />
                                        <div className="flex flex-col items-center gap-1">
                                            <span className="font-semibold text-stone-900 text-sm">{cat.text}</span>
                                            <span className="text-[10px] text-stone-400">{cat.sub}</span>
                                        </div>
                                    </motion.button>
                                ))}
                            </div>
                        ) : (
                            /* 2. ROLLING / RESULT VIEW (Clean) */
                            <div className="flex flex-col items-center w-full h-full justify-center -mt-6">
                                
                                {/* Result Display */}
                                <div className="h-24 flex items-center justify-center w-full mb-8">
                                    <AnimatePresence mode="wait">
                                        {isRolling ? (
                                            <motion.div 
                                                key={rollingText}
                                                initial={{ opacity: 0, y: 10, filter: 'blur(4px)' }}
                                                animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                                                exit={{ opacity: 0, y: -10 }}
                                                className="text-4xl md:text-5xl font-light text-stone-900 tracking-tight text-center"
                                            >
                                                {rollingText}
                                            </motion.div>
                                        ) : result ? (
                                             <motion.div 
                                                initial={{ scale: 0.9, opacity: 0 }}
                                                animate={{ scale: 1, opacity: 1 }}
                                                className="flex flex-col items-center gap-2"
                                            >
                                                <div className="text-4xl md:text-5xl font-medium text-stone-900 tracking-tight text-center">
                                                    {result.text}
                                                </div>
                                                <div className="text-xs font-bold text-orange-500 uppercase tracking-widest mt-2">
                                                    Excellent Choice
                                                </div>
                                            </motion.div>
                                        ) : null}
                                    </AnimatePresence>
                                </div>

                                {/* Actions */}
                                {!isRolling && result && (
                                    <motion.div 
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        className="flex flex-col gap-3 w-full max-w-[280px]"
                                    >
                                        <button 
                                            onClick={confirmResult}
                                            className="w-full h-14 rounded-full bg-stone-900 text-white font-medium text-lg shadow-xl shadow-stone-200 active:scale-95 transition-transform flex items-center justify-center gap-2 hover:bg-black"
                                        >
                                            Let's Go
                                        </button>
                                        <div className="flex justify-center gap-6 mt-2">
                                            <button 
                                                onClick={() => handleSpin(activeCategory!)}
                                                className="text-xs font-bold text-stone-400 hover:text-stone-900 uppercase tracking-widest transition-colors"
                                            >
                                                Spin Again
                                            </button>
                                            <span className="text-stone-200">|</span>
                                            <button 
                                                onClick={reset}
                                                className="text-xs font-bold text-stone-400 hover:text-stone-900 uppercase tracking-widest transition-colors"
                                            >
                                                Change Category
                                            </button>
                                        </div>
                                    </motion.div>
                                )}
                                
                                {isRolling && (
                                    <div className="w-8 h-8 border-2 border-stone-100 border-t-stone-900 rounded-full animate-spin" />
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
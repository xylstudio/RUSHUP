import { Search, ChevronLeft, Sparkles, Menu } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { clsx } from 'clsx';
import { CURRENT_USER } from '../data';

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

interface MobileHeaderProps {
  title?: string;
  onOpenSidebar: () => void;
  isHome?: boolean;
  homeTab?: 'foryou' | 'following';
  onHomeTabChange?: (tab: 'foryou' | 'following') => void;
  onSearchClick?: () => void; // NEW: Callback for search button
}

export function MobileHeader({ 
  title = "RUSHUP", 
  onOpenSidebar,
  isHome = false,
  homeTab = 'foryou', 
  onHomeTabChange,
  onSearchClick // NEW
}: MobileHeaderProps) {
  const [inputValue, setInputValue] = useState("");
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  
  const phrases = [
    "ค้นหาที่พักริมทะเล...",
    "ทริปดำน้ำสุดพิเศษ...",
    "รถเช่าราคาประหยัด...",
    "RUSHUP ครบ จบ ทุกเรื่องเที่ยว..."
  ];
  
  const typewriterText = useTypewriter(phrases);

  const toggleSearch = () => {
      setIsSearchOpen(!isSearchOpen);
      if (!isSearchOpen) setTimeout(() => inputRef.current?.focus(), 300);
  };

  return (
    <>
        <div className="w-full bg-white dark:bg-stone-950 z-30 md:hidden flex flex-col transition-all duration-300">
            <div className="grid grid-cols-3 items-center px-4 h-[60px] flex-shrink-0 relative z-20">
                
                {/* Avatar (Energetic) */}
                <div className="flex justify-start">
                    <button onClick={onOpenSidebar} className="relative group active:scale-95 transition-transform">
                        <Menu size={24} className="text-stone-900 dark:text-stone-100" strokeWidth={2} />
                    </button>
                </div>

                {/* Title or Home Tabs */}
                <div className="flex justify-center items-center h-full flex-1">
                    <h1 className="font-sans text-xl font-black tracking-tighter text-slate-900 dark:text-stone-100">
                        RUSHUP<span className="text-orange-500">.</span>
                    </h1>
                </div>

                {/* Search Icon */}
                <div className="flex justify-end">
                    <button onClick={onSearchClick ? onSearchClick : toggleSearch} className="w-10 h-10 flex items-center justify-center text-slate-800 dark:text-stone-300 hover:text-orange-500 transition-colors rounded-full hover:bg-orange-50 dark:hover:bg-orange-500/20">
                        <Search className="w-5 h-5" strokeWidth={2} />
                    </button>
                </div>
            </div>
        </div>

        {/* Search Overlay - Energetic Gradient */}
        <div className={clsx("fixed inset-0 z-[60] bg-[#FFFBFB] dark:bg-stone-950 transition-transform duration-300 ease-out flex flex-col", isSearchOpen ? "translate-x-0" : "translate-x-full")}>
            <div className="flex items-center gap-2 px-4 h-[64px] border-b border-stone-100 dark:border-stone-800 flex-shrink-0">
                <button onClick={() => setIsSearchOpen(false)} className="w-10 h-10 flex items-center justify-center -ml-2 text-slate-500 dark:text-stone-400 hover:text-slate-800 dark:hover:text-stone-200"><ChevronLeft className="w-6 h-6" /></button>
                <div className="flex-1 relative h-[42px]">
                    <div className="absolute inset-0 bg-gradient-to-r from-orange-400 via-red-400 to-red-500 rounded-full animate-pulse opacity-20" />
                    <div className="absolute inset-[1px] bg-white dark:bg-stone-900 rounded-full flex items-center overflow-hidden border border-orange-100 dark:border-orange-500/30">
                        <div className="pl-3 flex items-center pointer-events-none z-10"><Search className="h-4 w-4 text-orange-400" /></div>
                        {inputValue === "" && (
                        <div className="absolute inset-y-0 left-0 right-0 pl-10 pr-10 flex items-center pointer-events-none z-0 overflow-hidden">
                            <div className="flex items-center w-full">
                                <span className="text-sm font-medium text-slate-400 dark:text-stone-500 truncate block max-w-full">{typewriterText}</span>
                                <span className="w-[1.5px] h-4 bg-orange-500 ml-0.5 animate-pulse flex-shrink-0" />
                            </div>
                        </div>
                        )}
                        <input ref={inputRef} type="text" value={inputValue} onChange={(e) => setInputValue(e.target.value)} className="block w-full pl-3 pr-10 h-full bg-transparent border-none text-sm text-slate-900 dark:text-stone-100 focus:ring-0 focus:outline-none placeholder-transparent z-10" placeholder="" />
                        <div className="pr-3 flex items-center pointer-events-none z-10"><Sparkles className="h-4 w-4 text-orange-500" /></div>
                    </div>
                </div>
            </div>
            <div className="flex-1 overflow-y-auto bg-white dark:bg-stone-950">
                {inputValue ? (
                    <div className="p-8 text-center">
                         <div className="w-16 h-16 bg-orange-50 dark:bg-orange-500/20 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
                             <Search className="w-8 h-8 text-orange-400" />
                         </div>
                         <p className="text-slate-500 dark:text-stone-400 font-medium">กำลังค้นหา "{inputValue}"...</p>
                    </div>
                ) : (
                    <>
                        <div className="px-5 py-4">
                            <div className="flex items-center justify-between mb-3">
                                <h3 className="text-[11px] font-bold text-slate-400 dark:text-stone-500 uppercase tracking-widest">ค้นหาล่าสุด</h3>
                                <button className="text-[11px] font-bold text-orange-500 hover:text-orange-600">ล้างทั้งหมด</button>
                            </div>
                            <div className="space-y-1">
                                {['เชียงใหม่', 'คาเฟ่สยาม', 'ที่พักพัทยา'].map((term, i) => (
                                    <button key={i} onClick={() => setInputValue(term)} className="w-full flex items-center gap-3 py-2.5 group">
                                        <div className="w-8 h-8 rounded-full bg-slate-50 dark:bg-stone-900 flex items-center justify-center text-slate-400 dark:text-stone-500 group-hover:bg-orange-50 dark:group-hover:bg-orange-500/20 group-hover:text-orange-500 transition-colors">
                                            <Search size={14} strokeWidth={2.5} />
                                        </div>
                                        <span className="text-sm font-medium text-slate-600 dark:text-stone-400 group-hover:text-slate-900 dark:group-hover:text-stone-100">{term}</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="px-5 py-2">
                            <h3 className="text-[11px] font-bold text-slate-400 dark:text-stone-500 uppercase tracking-widest mb-4 flex items-center gap-1.5">
                                <Sparkles size={12} className="text-orange-500" />
                                แนะนำสำหรับคุณ
                            </h3>
                            <div className="flex flex-wrap gap-2">
                                {['🇯🇵 ญี่ปุ่น', '🏝️ เกาะล้าน', '🏕️ Camping', '📸 คาเฟ่', '🍜 Street Food', '🌲 เขาใหญ่'].map((tag, i) => (
                                    <button key={i} onClick={() => setInputValue(tag.replace(/^[^\w\u0E00-\u0E7F]+/, '').trim())} className="px-4 py-2 rounded-full bg-slate-50 dark:bg-stone-900 border border-slate-100 dark:border-stone-800 text-sm font-medium text-slate-600 dark:text-stone-400 hover:bg-white dark:hover:bg-stone-800 hover:text-orange-600 hover:border-orange-200 dark:hover:border-orange-500/30 hover:shadow-sm transition-all active:scale-95">
                                        {tag}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>
    </>
  );
}
import { useState, useEffect } from 'react';
import { clsx } from 'clsx';
import { 
  X, ArrowRight, Check, ChevronLeft
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// --- Mock Data ---
const DESTINATIONS = [
  { id: 1, name: 'เชียงใหม่', available: true },
  { id: 2, name: 'ภูเก็ต', available: false },
  { id: 3, name: 'หัวหิน', available: false },
  { id: 4, name: 'เขาใหญ่', available: false },
];

const FRIENDS = [
  { id: 'f1', name: 'คุณ', avatar: 'https://images.unsplash.com/photo-1599566150163-29194dcaad36?w=100&h=100&fit=crop' },
  { id: 'f2', name: 'บอส', avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&h=100&fit=crop' },
  { id: 'f3', name: 'แพรว', avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop' },
  { id: 'f4', name: 'เจมส์', avatar: 'https://images.unsplash.com/photo-1527980965255-d3b416303d12?w=100&h=100&fit=crop' },
];

const VIBES = [
  { id: 'chill', label: 'ชิลล์' },
  { id: 'party', label: 'ปาร์ตี้' },
  { id: 'eat', label: 'สายกิน' },
  { id: 'adventure', label: 'ลุยๆ' },
];

const TIMEFRAMES = [
    { id: 'today', label: 'วันนี้' },
    { id: 'tomorrow', label: 'พรุ่งนี้' },
    { id: 'custom', label: 'เลือกวันอื่น...' },
];

// --- Components ---

// Simplified to avoid breaking Thai vowels
const TypewriterText = ({ text }: { text: string }) => {
    const [displayed, setDisplayed] = useState('');
    
    useEffect(() => {
      setDisplayed('');
      let i = 0;
      const timer = setInterval(() => {
        if (i < text.length) {
          setDisplayed(prev => text.slice(0, i + 1));
          i++;
        } else {
          clearInterval(timer);
        }
      }, 50);
      return () => clearInterval(timer);
    }, [text]);
  
    return <span>{displayed}<span className="animate-pulse text-orange-500 ml-1">|</span></span>;
  };

export interface TripPlannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialDestination?: string;
}

export function TripPlannerModal({ isOpen, onClose, initialDestination }: TripPlannerModalProps) {
  const [step, setStep] = useState(1);
  const [direction, setDirection] = useState(1);
  
  const [formData, setFormData] = useState({
    destination: '',
    dateStart: '',
    dateEnd: '',
    squad: ['f1'] as string[],
    vibe: '',
    budget: 0
  });

  // Reset on close or when initialDestination changes
  useEffect(() => {
    if (isOpen) {
        if (initialDestination) {
            setFormData(prev => ({ ...prev, destination: initialDestination }));
            setStep(2); // Skip to step 2 if destination provided
        } else {
            setStep(1);
            setFormData({
                destination: '',
                dateStart: '',
                dateEnd: '',
                squad: ['f1'],
                vibe: '',
                budget: 0
            });
        }
    }
  }, [isOpen, initialDestination]);

  const handleNext = (skipSteps = 0) => {
    setDirection(1);
    setStep(prev => prev + 1 + skipSteps);
  };

  const handleBack = () => {
    if (step === 1) {
        onClose();
    } else {
        setDirection(-1);
        setStep(prev => prev - 1);
    }
  };

  const toggleFriend = (id: string) => {
    setFormData(prev => ({
        ...prev,
        squad: prev.squad.includes(id) 
            ? prev.squad.filter(fid => fid !== id)
            : [...prev.squad, id]
    }));
  };

  const getToday = () => new Date().toISOString().split('T')[0];
  const getTomorrow = () => {
      const d = new Date();
      d.setDate(d.getDate() + 1);
      return d.toISOString().split('T')[0];
  };

  // --- Render Steps ---
  
  // 1. Destination
  const renderDestination = () => (
    <div className="flex flex-col gap-0 w-full">
        {DESTINATIONS.map((dest, idx) => (
            <motion.button
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.1 }}
                key={dest.id}
                disabled={!dest.available}
                onClick={() => {
                    if (dest.available) {
                        setFormData(prev => ({ ...prev, destination: dest.name }));
                        handleNext();
                    }
                }}
                className={clsx(
                    "w-full py-3 border-b text-left transition-all flex items-center justify-between group pl-1",
                    dest.available 
                        ? "border-stone-100 hover:border-orange-500 text-stone-300 hover:text-stone-900" 
                        : "border-transparent text-stone-100 cursor-not-allowed hidden" 
                )}
            >
                <span className="text-2xl font-light tracking-tight">{dest.name}</span>
                {dest.available && (
                    <ArrowRight size={20} className="opacity-0 group-hover:opacity-100 text-orange-500 transition-all duration-300 transform -translate-x-2 group-hover:translate-x-0" />
                )}
            </motion.button>
        ))}
    </div>
  );

  // 2. Timeframe Selection
  const renderTimeframe = () => (
      <div className="flex flex-col gap-0 w-full">
          {TIMEFRAMES.map((t, idx) => (
              <motion.button
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.1 }}
                  key={t.id}
                  onClick={() => {
                      if (t.id === 'today') {
                          setFormData(prev => ({ ...prev, dateStart: getToday(), dateEnd: '' }));
                          handleNext(1); 
                      } else if (t.id === 'tomorrow') {
                          setFormData(prev => ({ ...prev, dateStart: getTomorrow(), dateEnd: '' }));
                          handleNext(1); 
                      } else {
                          setFormData(prev => ({ ...prev, dateStart: '', dateEnd: '' }));
                          handleNext(); 
                      }
                  }}
                  className="w-full py-3 border-b border-stone-100 hover:border-orange-500 text-left transition-all flex items-center justify-between group pl-1"
              >
                  <span className="text-xl font-light text-stone-400 group-hover:text-stone-900 transition-colors">{t.label}</span>
                  <ArrowRight size={18} className="opacity-0 group-hover:opacity-100 text-orange-500 transition-all duration-300 transform -translate-x-2 group-hover:translate-x-0" />
              </motion.button>
          ))}
      </div>
  );

  // 3. Date Picker
  const renderDate = () => (
    <div className="flex flex-col items-center gap-8 w-full">
         <div className="w-full space-y-6">
            {/* Start Date */}
            <div className="flex flex-col gap-1 group">
                <span className="text-[10px] font-bold text-orange-500 uppercase tracking-widest">เดินทาง</span>
                <input 
                    type="date" 
                    className="w-full text-3xl font-light bg-transparent border-b border-stone-200 py-2 outline-none text-stone-900 focus:border-orange-500 transition-all"
                    onChange={(e) => setFormData(prev => ({ ...prev, dateStart: e.target.value }))}
                    value={formData.dateStart}
                />
            </div>
            
            {/* End Date */}
            <div className="flex flex-col gap-1 group">
                <span className="text-[10px] font-bold text-orange-500 uppercase tracking-widest">กลับ</span>
                <input 
                    type="date"
                    className="w-full text-3xl font-light bg-transparent border-b border-stone-200 py-2 outline-none text-stone-900 focus:border-orange-500 transition-all"
                    onChange={(e) => setFormData(prev => ({ ...prev, dateEnd: e.target.value }))}
                    value={formData.dateEnd}
                />
            </div>
         </div>
         
         <button 
            disabled={!formData.dateStart || !formData.dateEnd}
            onClick={() => handleNext()}
            className="w-16 h-16 rounded-full bg-stone-900 text-white flex items-center justify-center disabled:opacity-0 disabled:translate-y-4 transition-all hover:scale-110 shadow-xl mt-4"
         >
            <ArrowRight size={24} />
         </button>
    </div>
  );

  // 4. Squad
  const renderSquad = () => (
      <div className="flex flex-col items-center gap-8 w-full">
          <div className="flex flex-wrap justify-center gap-4">
            {FRIENDS.map((friend, idx) => {
                const isSelected = formData.squad.includes(friend.id);
                return (
                    <motion.button 
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: idx * 0.05 }}
                        key={friend.id}
                        onClick={() => toggleFriend(friend.id)}
                        className="flex flex-col items-center gap-2 group"
                    >
                        <div className={clsx(
                            "w-16 h-16 rounded-full overflow-hidden transition-all duration-300 relative",
                            isSelected 
                                ? "ring-2 ring-orange-500 ring-offset-2 ring-offset-white scale-110" 
                                : "opacity-40 grayscale group-hover:opacity-100 group-hover:grayscale-0"
                        )}>
                            <img src={friend.avatar} className="w-full h-full object-cover" />
                        </div>
                        <span className={clsx(
                            "text-xs font-bold tracking-wide uppercase",
                            isSelected ? "text-stone-900" : "text-transparent group-hover:text-stone-300"
                        )}>{friend.name}</span>
                    </motion.button>
                )
            })}
          </div>

          <button 
            onClick={() => handleNext()}
            className="w-16 h-16 rounded-full bg-stone-900 text-white flex items-center justify-center transition-all hover:scale-110 shadow-xl mt-4"
         >
            <ArrowRight size={24} />
         </button>
      </div>
  );

  // 5. Vibe
  const renderVibe = () => (
      <div className="flex flex-col items-center w-full">
          <div className="flex flex-wrap gap-3 justify-center">
            {VIBES.map((v, idx) => {
                const isActive = formData.vibe === v.id;
                return (
                    <motion.button
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.05 }}
                        key={v.id}
                        onClick={() => {
                            setFormData(prev => ({ ...prev, vibe: v.id }));
                            handleNext();
                        }}
                        className={clsx(
                            "px-5 py-2 rounded-full border transition-all text-base",
                            isActive 
                                ? "bg-stone-900 border-stone-900 text-white" 
                                : "bg-transparent border-stone-200 text-stone-400 hover:border-stone-900 hover:text-stone-900"
                        )}
                    >
                        {v.label}
                    </motion.button>
                )
            })}
          </div>
      </div>
  );

  // 6. Budget
  const renderBudget = () => (
      <div className="flex flex-col items-center gap-12 w-full">
           {/* Amount Display */}
           <div className="flex flex-col items-center gap-1">
               <span className="text-orange-500 font-bold text-[10px] uppercase tracking-[0.2em] mb-2">งบต่อคน / คืน</span>
               <div className="flex items-center gap-2 text-stone-900">
                   <span className="text-2xl font-light text-stone-300">฿</span>
                   <span className="text-6xl font-light tracking-tighter">{formData.budget.toLocaleString()}</span>
               </div>
           </div>

           {/* Slider */}
           <div className="w-full px-2">
               <input 
                   type="range"
                   min="0"
                   max="10000"
                   step="100"
                   value={formData.budget}
                   onChange={(e) => setFormData(prev => ({ ...prev, budget: Number(e.target.value) }))}
                   className="w-full h-1 bg-stone-200 rounded-full appearance-none cursor-pointer accent-stone-900 hover:accent-orange-500 transition-all"
               />
               <div className="flex justify-between mt-3 text-[10px] font-bold text-stone-300 uppercase tracking-widest">
                   <span>ประหยัด</span>
                   <span>หรูหรา</span>
               </div>
           </div>

           <button 
                onClick={() => handleNext()}
                className="w-16 h-16 rounded-full bg-orange-500 text-white flex items-center justify-center transition-all hover:scale-110 shadow-xl shadow-orange-100 mt-4"
            >
                <Check size={24} />
            </button>
      </div>
  );
  
  // 7. Final
  const renderFinal = () => (
      <div className="flex flex-col items-center text-center gap-6 w-full">
           <motion.div 
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 200, damping: 20 }}
                className="w-24 h-24 flex items-center justify-center text-green-500 mb-2"
            >
               <Check className="w-24 h-24" strokeWidth={1.5} />
           </motion.div>
           <div>
                <h3 className="text-3xl font-light text-stone-900 mb-2">เรียบร้อย!</h3>
                <p className="text-stone-400 font-light text-base leading-relaxed">
                    เราส่งคำเชิญให้เพื่อนของคุณแล้ว<br/>เตรียมเก็บกระเป๋าได้เลย
                </p>
           </div>
           <button onClick={onClose} className="mt-6 px-8 py-3 bg-stone-900 rounded-full text-white font-bold text-[10px] uppercase tracking-widest hover:bg-stone-800 transition-colors">
               กลับสู่หน้าหลัก
           </button>
      </div>
  );

  // Step Titles - Correct Thai Language & Formatting
  const getStepContent = (stepIdx: number) => {
      switch(stepIdx) {
          case 1: return { title: "ไปไหนดี", subtitle: "จุดหมายในฝันของคุณ" };
          case 2: return { title: "เริ่มวันไหน", subtitle: "เลือกวันออกเดินทาง" };
          case 3: return { title: "ระบุวัน", subtitle: "กำหนดวันไปและกลับ" };
          case 4: return { title: "กับใคร", subtitle: "เลือกแก๊งค์เพื่อนร่วมทริป" };
          case 5: return { title: "มู้ดไหน", subtitle: "ส��ตล์การท่องเที่ยว" };
          case 6: return { title: "งบเท่าไหร่", subtitle: "กำหนดงบประมาณเบื้องต้น" };
          case 7: return { title: "เรียบร้อย", subtitle: "ทุกอย่างพร้อมแล้ว!" };
          default: return { title: "", subtitle: "" };
      }
  };

  const { title, subtitle } = getStepContent(step);
  const totalSteps = 7;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div 
            initial={{ y: '100%' }}
            animate={{ y: '0%' }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed inset-0 z-[50] flex flex-col bg-white overflow-hidden h-[100dvh] w-screen"
        >
            {/* --- UNIFIED HEADER (Minimal - Fixed Height) --- */}
            <div className="bg-white px-4 pt-[calc(2rem+env(safe-area-inset-top))] pb-2 flex items-center justify-between sticky top-0 z-30 h-20 shrink-0">
                <button onClick={handleBack} className="w-10 h-10 -ml-2 flex items-center justify-center text-stone-800 active:scale-95 transition-transform hover:bg-stone-50 rounded-full">
                    {step === 1 ? <X size={24} strokeWidth={1.5} /> : <ChevronLeft size={24} strokeWidth={1.5} />}
                </button>
                <div className="flex gap-1">
                     {Array.from({ length: totalSteps }).map((_, i) => (
                         <div key={i} className={clsx("w-1.5 h-1.5 rounded-full transition-colors", i + 1 <= step ? "bg-orange-500" : "bg-stone-100")} />
                     ))}
                </div>
                <div className="w-10 h-10" />
            </div>

            {/* Main Content Area - LOCKED ONE PAGE - VERTICALLY CENTERED */}
            <div className="flex-1 w-full max-w-sm mx-auto px-6 flex flex-col justify-center items-center relative overflow-hidden">
                <AnimatePresence mode="wait" custom={direction}>
                    <motion.div
                        key={step}
                        custom={direction}
                        initial={{ opacity: 0, x: direction * 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: direction * -20 }}
                        transition={{ duration: 0.4, ease: "circOut" }}
                        className="flex flex-col w-full"
                    >
                        {/* Title Section (Typewriter) */}
                        {step < 7 && (
                            <div className="mb-8 pl-2 border-l-2 border-orange-500/50">
                                <h2 className="text-3xl md:text-4xl font-bold text-stone-900 leading-tight mb-1 h-[1.2em]">
                                    <TypewriterText text={title} />
                                </h2>
                                <p className="text-stone-400 font-light text-base">
                                    {subtitle}
                                </p>
                            </div>
                        )}

                        {/* Interactive Area */}
                        <div className="w-full">
                             {step === 1 && renderDestination()}
                            {step === 2 && renderTimeframe()} 
                            {step === 3 && renderDate()}
                            {step === 4 && renderSquad()}
                            {step === 5 && renderVibe()}
                            {step === 6 && renderBudget()}
                            {step === 7 && renderFinal()}
                        </div>

                    </motion.div>
                </AnimatePresence>
                
                {/* Bottom Spacer for Balance */}
                <div className="h-[10vh] shrink-0" />
            </div>

        </motion.div>
      )}
    </AnimatePresence>
  );
}

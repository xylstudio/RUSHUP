import { motion, AnimatePresence } from 'framer-motion';
import { X, MapPin, Trophy, Plane, Calendar } from 'lucide-react';
import { useAuth } from '../../../lib/AuthContext';

interface PassportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// Mock Stamps Data
const STAMPS = [
  { id: 1, name: 'Bangkok', date: '10 Jan 25', icon: '🏯', color: 'text-orange-500', unlocked: true },
  { id: 2, name: 'Chiang Mai', date: '15 Dec 24', icon: '⛰️', color: 'text-green-600', unlocked: true },
  { id: 3, name: 'Phuket', date: '02 Nov 24', icon: '🏖️', color: 'text-blue-500', unlocked: true },
  { id: 4, name: 'Japan', date: 'Pending', icon: '🌸', color: 'text-pink-400', unlocked: false },
  { id: 5, name: 'Singapore', date: 'Pending', icon: '🦁', color: 'text-red-500', unlocked: false },
  { id: 6, name: 'Vietnam', date: 'Pending', icon: '🇻🇳', color: 'text-yellow-600', unlocked: false },
  { id: 7, name: 'Korea', date: 'Pending', icon: '🎎', color: 'text-indigo-500', unlocked: false },
  { id: 8, name: 'Taiwan', date: 'Pending', icon: '🧋', color: 'text-amber-600', unlocked: false },
];

export function PassportModal({ isOpen, onClose }: PassportModalProps) {
  const { profile } = useAuth();
  const avatarUrl = profile?.avatar_url || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=800';
  const fullName = profile ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim() : 'นักเดินทางไร้นาม';
  const userId = profile?.id || 'Unknown';

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
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[200]"
          />

          {/* Modal Container */}
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 50 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 50 }}
            className="fixed inset-0 z-[210] flex items-center justify-center p-4 pointer-events-none"
          >
            {/* Passport Book */}
            <div className="w-full max-w-sm bg-[#1a1a1a] rounded-[24px] overflow-hidden shadow-2xl pointer-events-auto border border-stone-800 relative flex flex-col max-h-[85vh]">
              
              {/* Gold Accent Lines */}
              <div className="absolute top-0 left-8 bottom-0 w-[2px] bg-gradient-to-b from-yellow-600/20 via-yellow-500/50 to-yellow-600/20 z-0" />
              <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-yellow-500/10 to-transparent rounded-bl-full pointer-events-none" />

              {/* Header */}
              <div className="relative z-10 p-6 pb-2 text-center border-b border-white/10">
                <button 
                  onClick={onClose}
                  className="absolute right-4 top-4 text-stone-500 hover:text-white transition-colors"
                >
                  <X size={24} />
                </button>

                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-yellow-600 to-yellow-800 shadow-lg mb-4 border-2 border-yellow-400/30">
                  <Plane className="text-white w-8 h-8" />
                </div>
                
                <h2 className="text-2xl font-serif font-bold text-yellow-500 tracking-wider mb-1">TRIPNECT</h2>
                <p className="text-[10px] text-yellow-500/60 uppercase tracking-[0.2em] font-medium">Official Digital Passport</p>
              </div>

              {/* Scrollable Content */}
              <div className="flex-1 overflow-y-auto p-6 relative z-10 hide-scrollbar">
                
                {/* User Bio Section */}
                <div className="flex gap-4 items-center mb-8 bg-white/5 p-4 rounded-xl border border-white/5">
                   <img 
                      src={avatarUrl} 
                      className="w-16 h-16 rounded-lg object-cover border-2 border-white/10 grayscale-[30%]"
                   />
                   <div className="flex flex-col">
                      <span className="text-stone-400 text-xs uppercase tracking-wider mb-1">Holder Name</span>
                      <span className="text-white font-mono text-lg">{fullName}</span>
                      <span className="text-stone-500 text-xs font-mono mt-1">ID: {userId}</span>
                   </div>
                </div>

                {/* Stats Row */}
                <div className="grid grid-cols-3 gap-2 mb-8">
                   <div className="bg-white/5 p-3 rounded-lg text-center">
                      <MapPin className="w-5 h-5 text-yellow-500 mx-auto mb-2" />
                      <div className="text-xl font-bold text-white leading-none mb-1">12</div>
                      <div className="text-[10px] text-stone-500 uppercase">Cities</div>
                   </div>
                   <div className="bg-white/5 p-3 rounded-lg text-center">
                      <Trophy className="w-5 h-5 text-orange-500 mx-auto mb-2" />
                      <div className="text-xl font-bold text-white leading-none mb-1">5</div>
                      <div className="text-[10px] text-stone-500 uppercase">Badges</div>
                   </div>
                   <div className="bg-white/5 p-3 rounded-lg text-center">
                      <Calendar className="w-5 h-5 text-blue-500 mx-auto mb-2" />
                      <div className="text-xl font-bold text-white leading-none mb-1">2Y</div>
                      <div className="text-[10px] text-stone-500 uppercase">Member</div>
                   </div>
                </div>

                {/* Stamps Grid */}
                <h3 className="text-stone-400 text-xs uppercase tracking-widest mb-4 font-bold">Immigration Stamps</h3>
                <div className="grid grid-cols-2 gap-4">
                   {STAMPS.map((stamp) => (
                      <div 
                        key={stamp.id}
                        className={`aspect-square rounded-xl border-2 flex flex-col items-center justify-center p-2 relative overflow-hidden group transition-all duration-300
                          ${stamp.unlocked 
                            ? 'bg-white/5 border-yellow-500/30' 
                            : 'bg-transparent border-dashed border-stone-800 opacity-50'}
                        `}
                      >
                         {/* Circle Stamp Effect */}
                         {stamp.unlocked && (
                            <div className="absolute inset-0 border-[3px] border-white/10 rounded-full m-[-10px] opacity-20 pointer-events-none" />
                         )}

                         <div className={`text-4xl mb-2 filter drop-shadow-lg ${!stamp.unlocked && 'grayscale opacity-30'}`}>
                            {stamp.icon}
                         </div>
                         <span className={`text-sm font-bold font-serif ${stamp.unlocked ? 'text-stone-200' : 'text-stone-600'}`}>
                            {stamp.name}
                         </span>
                         {stamp.unlocked && (
                            <span className="text-[10px] text-yellow-500/60 mt-1 font-mono tracking-tighter">
                               {stamp.date.toUpperCase()}
                            </span>
                         )}
                      </div>
                   ))}
                </div>
              </div>

              {/* Footer */}
              <div className="p-4 border-t border-white/5 bg-black/20 text-center">
                 <p className="text-[10px] text-stone-600 font-mono">Tripnect Authority • Valid Worldwide</p>
              </div>

            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

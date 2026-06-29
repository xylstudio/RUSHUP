import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Check } from 'lucide-react';
import { PostData } from '../data';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  post: PostData;
  onShare?: (chatIds: number[], post: PostData) => void;
}

interface Friend {
  id: number;
  name: string;
  avatar: string;
}

const FRIENDS: Friend[] = [
  { id: 1, name: 'อ้อม', avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop' },
  { id: 2, name: 'แจ็ค', avatar: 'https://images.unsplash.com/photo-1599566150163-29194dcaad36?w=100&h=100&fit=crop' },
  { id: 3, name: 'เบสท์', avatar: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=100&h=100&fit=crop' },
  { id: 4, name: 'มิกซ์', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop' },
  { id: 5, name: 'เก๋', avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop' },
  { id: 6, name: 'พี่โอ๊ค', avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop' }
];

export function ShareModal({ isOpen, onClose, post, onShare }: ShareModalProps) {
  const [copiedLink, setCopiedLink] = useState(false);
  const [selectedFriends, setSelectedFriends] = useState<number[]>([]);

  // Lock body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      document.body.style.touchAction = 'none';
    } else {
      document.body.style.overflow = '';
      document.body.style.touchAction = '';
    }

    return () => {
      document.body.style.overflow = '';
      document.body.style.touchAction = '';
    };
  }, [isOpen]);

  // Reset selections when modal closes
  useEffect(() => {
    if (!isOpen) {
      setSelectedFriends([]);
    }
  }, [isOpen]);

  const handleShare = (platform: string) => {
    if (navigator.vibrate) navigator.vibrate(30);
    console.log(`Sharing to ${platform}:`, post.id);
    setTimeout(() => onClose(), 150);
  };

  const toggleFriendSelection = (friendId: number) => {
    if (navigator.vibrate) navigator.vibrate(30);
    
    setSelectedFriends(prev => {
      if (prev.includes(friendId)) {
        return prev.filter(id => id !== friendId);
      } else {
        return [...prev, friendId];
      }
    });
  };

  const handleSendToFriends = () => {
    if (selectedFriends.length === 0) return;
    
    if (navigator.vibrate) navigator.vibrate(40);
    onShare?.(selectedFriends, post);
    
    setTimeout(() => {
      onClose();
    }, 150);
  };

  const handleCopyLink = () => {
    const postUrl = `https://tripnect.app/post/${post.id}`;
    navigator.clipboard.writeText(postUrl);
    setCopiedLink(true);
    if (navigator.vibrate) navigator.vibrate(30);
    
    setTimeout(() => {
      setCopiedLink(false);
      onClose();
    }, 800);
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
            transition={{ duration: 0.2, ease: [0.32, 0.72, 0, 1] }}
            onClick={onClose}
            className="fixed inset-0 bg-black/40 backdrop-blur-[2px] z-[200]"
          />

          {/* Modal - Compact Size */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ 
              type: 'spring', 
              damping: 35, 
              stiffness: 400,
              mass: 0.8
            }}
            className="fixed bottom-0 left-0 right-0 z-[201] bg-white rounded-t-[24px] overflow-hidden shadow-2xl pb-safe"
          >
            
            {/* Drag indicator */}
            <div className="pt-2.5 pb-1 flex justify-center">
              <div className="w-10 h-1 bg-stone-300 rounded-full" />
            </div>

            {/* Header - Compact */}
            <div className="flex items-center justify-between px-5 pt-1 pb-3">
              <h2 className="text-[15px] font-bold text-stone-900">แชร์</h2>
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-full bg-stone-100 flex items-center justify-center hover:bg-stone-200 active:scale-95 transition-all"
              >
                <X size={18} className="text-stone-600" />
              </button>
            </div>

            {/* Quick Share - Smaller Icons */}
            <div className="px-5 pb-4">
              <div className="flex items-center gap-4">
                
                {/* LINE */}
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={() => handleShare('line')}
                  className="flex flex-col items-center gap-1"
                >
                  <div className="w-12 h-12 rounded-full bg-[#00B900] flex items-center justify-center shadow-md shadow-[#00B900]/15">
                    <svg viewBox="0 0 24 24" fill="white" className="w-5 h-5">
                      <path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63h2.386c.346 0 .627.285.627.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63.346 0 .628.285.628.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.282.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314"/>
                    </svg>
                  </div>
                  <span className="text-[10px] font-semibold text-stone-700">LINE</span>
                </motion.button>

                {/* Facebook */}
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={() => handleShare('facebook')}
                  className="flex flex-col items-center gap-1"
                >
                  <div className="w-12 h-12 rounded-full bg-[#1877F2] flex items-center justify-center shadow-md shadow-[#1877F2]/15">
                    <svg viewBox="0 0 24 24" fill="white" className="w-5 h-5">
                      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                    </svg>
                  </div>
                  <span className="text-[10px] font-semibold text-stone-700">Facebook</span>
                </motion.button>

                {/* Instagram */}
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={() => handleShare('instagram')}
                  className="flex flex-col items-center gap-1"
                >
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-600 via-pink-600 to-orange-500 flex items-center justify-center shadow-md shadow-pink-500/15">
                    <svg viewBox="0 0 24 24" fill="white" className="w-[18px] h-[18px]">
                      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                    </svg>
                  </div>
                  <span className="text-[10px] font-semibold text-stone-700">Instagram</span>
                </motion.button>

                {/* Copy Link */}
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={handleCopyLink}
                  className="flex flex-col items-center gap-1"
                >
                  <motion.div 
                    animate={{
                      backgroundColor: copiedLink ? '#22c55e' : '#f5f5f4',
                      scale: copiedLink ? [1, 1.08, 1] : 1
                    }}
                    transition={{ duration: 0.3 }}
                    className="w-12 h-12 rounded-full flex items-center justify-center shadow-md"
                  >
                    <AnimatePresence mode="wait">
                      {copiedLink ? (
                        <motion.svg
                          key="check"
                          initial={{ scale: 0, rotate: -180 }}
                          animate={{ scale: 1, rotate: 0 }}
                          exit={{ scale: 0, rotate: 180 }}
                          transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                          viewBox="0 0 24 24" 
                          fill="none" 
                          stroke="white" 
                          strokeWidth="2.5"
                          className="w-5 h-5"
                        >
                          <polyline points="20 6 9 17 4 12"/>
                        </motion.svg>
                      ) : (
                        <motion.svg
                          key="link"
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          exit={{ scale: 0 }}
                          viewBox="0 0 24 24" 
                          fill="none" 
                          stroke="currentColor" 
                          strokeWidth="2"
                          className="w-[18px] h-[18px] text-stone-700"
                        >
                          <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
                          <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
                        </motion.svg>
                      )}
                    </AnimatePresence>
                  </motion.div>
                  <motion.span 
                    animate={{ color: copiedLink ? '#22c55e' : '#44403c' }}
                    className="text-[10px] font-semibold"
                  >
                    {copiedLink ? 'คัดลอกแล้ว!' : 'คัดลอก'}
                  </motion.span>
                </motion.button>

              </div>
            </div>

            {/* Divider */}
            <div className="h-[1px] bg-stone-100 mx-5 mb-3" />

            {/* Friends List with Checkboxes */}
            <div className="px-5 pb-3 max-h-[240px] overflow-y-auto overscroll-contain scrollbar-hide">
              <h3 className="text-[12px] font-bold text-stone-900 mb-2">ส่งให้เพื่อน</h3>
              
              <div className="space-y-0.5">
                {FRIENDS.map((friend, index) => {
                  const isSelected = selectedFriends.includes(friend.id);
                  
                  return (
                    <motion.button
                      key={friend.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ 
                        delay: index * 0.03,
                        type: 'spring',
                        stiffness: 400,
                        damping: 25
                      }}
                      whileTap={{ scale: 0.97 }}
                      onClick={() => toggleFriendSelection(friend.id)}
                      className={`w-full flex items-center gap-2.5 p-2 rounded-xl transition-all ${
                        isSelected 
                          ? 'bg-orange-50 border border-orange-200' 
                          : 'hover:bg-stone-50 active:bg-stone-100'
                      }`}
                    >
                      {/* Avatar with Checkmark Overlay */}
                      <div className="relative flex-shrink-0">
                        <img
                          src={friend.avatar}
                          alt={friend.name}
                          className={`w-10 h-10 rounded-full object-cover transition-all ${
                            isSelected ? 'ring-2 ring-orange-500' : ''
                          }`}
                        />
                        
                        {/* Checkmark */}
                        <AnimatePresence>
                          {isSelected && (
                            <motion.div
                              initial={{ scale: 0, opacity: 0 }}
                              animate={{ scale: 1, opacity: 1 }}
                              exit={{ scale: 0, opacity: 0 }}
                              transition={{ type: 'spring', stiffness: 500, damping: 25 }}
                              className="absolute -bottom-0.5 -right-0.5 w-5 h-5 bg-orange-500 rounded-full flex items-center justify-center border-2 border-white shadow-md"
                            >
                              <Check size={12} className="text-white" strokeWidth={3} />
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                      
                      <span className={`text-[13px] font-semibold transition-colors ${
                        isSelected ? 'text-orange-600' : 'text-stone-900'
                      }`}>
                        {friend.name}
                      </span>
                    </motion.button>
                  );
                })}
              </div>
            </div>

            {/* Send Button - Sticky at bottom */}
            <AnimatePresence>
              {selectedFriends.length > 0 && (
                <motion.div
                  initial={{ y: 100, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: 100, opacity: 0 }}
                  transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                  className="sticky bottom-0 px-5 py-3 bg-white border-t border-stone-100"
                >
                  <motion.button
                    whileTap={{ scale: 0.97 }}
                    onClick={handleSendToFriends}
                    className="w-full h-11 bg-orange-500 hover:bg-orange-600 text-white rounded-xl font-bold text-[14px] flex items-center justify-center gap-2 shadow-lg shadow-orange-500/20 transition-colors"
                  >
                    <span>ส่ง ({selectedFriends.length})</span>
                  </motion.button>
                </motion.div>
              )}
            </AnimatePresence>

          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

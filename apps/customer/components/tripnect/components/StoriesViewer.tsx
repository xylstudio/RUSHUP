import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, PanInfo } from 'framer-motion';
import { X, Send, MoreVertical } from 'lucide-react';
import { Story } from '../storiesData';

interface StoriesViewerProps {
  isOpen: boolean;
  onClose: () => void;
  stories: Story[];
  initialStoryIndex: number;
}

export function StoriesViewer({ isOpen, onClose, stories, initialStoryIndex }: StoriesViewerProps) {
  const [currentStoryIndex, setCurrentStoryIndex] = useState(initialStoryIndex);
  const [currentSegmentIndex, setCurrentSegmentIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [replyText, setReplyText] = useState('');
  
  const progressInterval = useRef<NodeJS.Timeout | null>(null);
  const touchStartX = useRef(0);

  const currentStory = stories[currentStoryIndex];
  const currentSegment = currentStory?.segments[currentSegmentIndex];
  const duration = (currentSegment?.duration || 5) * 1000; // Convert to ms

  // Lock body scroll
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

  // Progress timer
  useEffect(() => {
    if (!isOpen || isPaused) return;

    setProgress(0);
    const startTime = Date.now();

    progressInterval.current = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const newProgress = (elapsed / duration) * 100;

      if (newProgress >= 100) {
        goToNextSegment();
      } else {
        setProgress(newProgress);
      }
    }, 16); // ~60fps

    return () => {
      if (progressInterval.current) {
        clearInterval(progressInterval.current);
      }
    };
  }, [isOpen, currentStoryIndex, currentSegmentIndex, isPaused]);

  const goToNextSegment = () => {
    if (currentSegmentIndex < currentStory.segments.length - 1) {
      setCurrentSegmentIndex(prev => prev + 1);
      setProgress(0);
    } else {
      goToNextStory();
    }
  };

  const goToPreviousSegment = () => {
    if (currentSegmentIndex > 0) {
      setCurrentSegmentIndex(prev => prev - 1);
      setProgress(0);
    } else if (currentStoryIndex > 0) {
      setCurrentStoryIndex(prev => prev - 1);
      const prevStory = stories[currentStoryIndex - 1];
      setCurrentSegmentIndex(prevStory.segments.length - 1);
      setProgress(0);
    }
  };

  const goToNextStory = () => {
    if (currentStoryIndex < stories.length - 1) {
      setCurrentStoryIndex(prev => prev + 1);
      setCurrentSegmentIndex(0);
      setProgress(0);
    } else {
      onClose();
    }
  };

  const handleTap = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const width = rect.width;

    if (x < width / 3) {
      goToPreviousSegment();
    } else if (x > (width * 2) / 3) {
      goToNextSegment();
    }
  };

  const handleDragEnd = (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    const threshold = 100;

    if (info.offset.x > threshold) {
      // Swipe right - previous story
      if (currentStoryIndex > 0) {
        setCurrentStoryIndex(prev => prev - 1);
        setCurrentSegmentIndex(0);
        setProgress(0);
      }
    } else if (info.offset.x < -threshold) {
      // Swipe left - next story
      goToNextStory();
    }
  };

  const handleSendReply = () => {
    if (!replyText.trim()) return;
    
    if (navigator.vibrate) navigator.vibrate(30);
    console.log(`Reply to ${currentStory.username}:`, replyText);
    setReplyText('');
  };

  if (!isOpen || !currentStory) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-stone-950 z-[500] flex flex-col"
        >
          {/* ===== HEADER SECTION ===== */}
          <div className="relative flex-shrink-0 bg-gradient-to-b from-stone-900/95 to-transparent backdrop-blur-sm z-20">
            {/* Progress Bars */}
            <div className="px-3 pt-3 pb-2 flex gap-1.5">
              {currentStory.segments.map((segment, index) => (
                <div
                  key={segment.id}
                  className="flex-1 h-[3px] bg-white/20 rounded-full overflow-hidden"
                >
                  <motion.div
                    className="h-full bg-gradient-to-r from-orange-400 to-orange-500"
                    initial={{ width: '0%' }}
                    animate={{
                      width:
                        index < currentSegmentIndex
                          ? '100%'
                          : index === currentSegmentIndex
                          ? `${progress}%`
                          : '0%',
                    }}
                    transition={{ duration: 0.016, ease: 'linear' }}
                  />
                </div>
              ))}
            </div>

            {/* User Info & Controls */}
            <div className="px-4 pb-3 flex items-center justify-between">
              <div className="flex items-center gap-2.5 flex-1 min-w-0">
                {/* Avatar with Orange Ring */}
                <div className="relative flex-shrink-0">
                  <div className="w-10 h-10 p-[2px] rounded-full bg-gradient-to-tr from-orange-500 to-orange-400">
                    <img
                      src={currentStory.avatarUrl}
                      alt={currentStory.username}
                      className="w-full h-full rounded-full object-cover border-2 border-stone-900"
                    />
                  </div>
                </div>

                {/* User Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-white font-bold text-[14px] tracking-tight truncate">
                    {currentStory.username}
                  </p>
                  <p className="text-white/60 text-[11px] font-medium">
                    {currentSegment.timestamp}
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-1.5 flex-shrink-0">
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  className="w-9 h-9 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center hover:bg-white/20 transition-colors"
                >
                  <MoreVertical size={18} className="text-white" />
                </motion.button>

                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={onClose}
                  className="w-9 h-9 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center hover:bg-white/20 transition-colors"
                >
                  <X size={20} className="text-white" />
                </motion.button>
              </div>
            </div>
          </div>

          {/* ===== CONTENT SECTION ===== */}
          <motion.div
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.2}
            onDragEnd={handleDragEnd}
            onClick={handleTap}
            onMouseDown={() => setIsPaused(true)}
            onMouseUp={() => setIsPaused(false)}
            onTouchStart={() => setIsPaused(true)}
            onTouchEnd={() => setIsPaused(false)}
            className="flex-1 relative flex items-center justify-center bg-stone-950 cursor-pointer overflow-hidden"
          >
            <AnimatePresence mode="wait">
              <motion.img
                key={`${currentStoryIndex}-${currentSegmentIndex}`}
                src={currentSegment.imageUrl}
                alt="Story"
                initial={{ opacity: 0, scale: 1.05 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.3 }}
                className="w-full h-full object-contain"
              />
            </AnimatePresence>

            {/* Bottom Gradient for Reply Input */}
            <div className="absolute bottom-0 left-0 right-0 h-40 bg-gradient-to-t from-stone-900/95 to-transparent pointer-events-none" />

            {/* Tap Zones Indicator */}
            {isPaused && (
              <div className="absolute inset-0 flex pointer-events-none z-[1]">
                <div className="flex-1 flex items-center justify-start pl-8">
                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="w-8 h-8 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                      <path d="M15 18l-6-6 6-6" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </motion.div>
                </div>
                <div className="flex-1" />
                <div className="flex-1 flex items-center justify-end pr-8">
                  <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="w-8 h-8 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                      <path d="M9 18l6-6-6-6" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </motion.div>
                </div>
              </div>
            )}
          </motion.div>

          {/* ===== REPLY INPUT SECTION ===== */}
          <div className="relative flex-shrink-0 bg-gradient-to-t from-stone-900/95 to-transparent backdrop-blur-sm z-20 px-4 pb-5 pt-2">
            <div className="flex items-center gap-2.5">
              <div className="flex-1 relative">
                <input
                  type="text"
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSendReply()}
                  placeholder={`ส่งข้อความถึง ${currentStory.username}`}
                  className="w-full h-12 pl-5 pr-4 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-white placeholder-white/50 text-[13px] font-medium focus:outline-none focus:ring-2 focus:ring-orange-500/40 focus:border-orange-500/40 transition-all"
                />
              </div>
              
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={handleSendReply}
                disabled={!replyText.trim()}
                className={`w-12 h-12 rounded-full flex items-center justify-center transition-all flex-shrink-0 ${
                  replyText.trim()
                    ? 'bg-gradient-to-tr from-orange-500 to-orange-400 shadow-lg shadow-orange-500/30'
                    : 'bg-white/10 backdrop-blur-md border border-white/20'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                <Send size={18} className={replyText.trim() ? 'text-white' : 'text-white/60'} />
              </motion.button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

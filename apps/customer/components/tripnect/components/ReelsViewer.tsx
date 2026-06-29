import { useRef, useState, useEffect } from 'react';
import { PostData } from '../data';
import { Heart, MessageCircle, Bookmark, Share2, Volume2, VolumeX, Music, MoreVertical, Check } from 'lucide-react';
import { motion, AnimatePresence, useMotionValue, PanInfo } from 'framer-motion';
import { CommentsModal } from './CommentsModal';
import { ShareModal } from './ShareModal';

interface ReelsViewerProps {
  posts: PostData[];
  initialIndex: number;
  onClose: () => void;
}

export function ReelsViewer({ posts, initialIndex, onClose }: ReelsViewerProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [viewMode, setViewMode] = useState<'following' | 'foryou'>('foryou');
  const containerRef = useRef<HTMLDivElement>(null);
  const y = useMotionValue(0);
  const isDragging = useRef(false);

  const currentPost = posts[currentIndex];

  // Lock body scroll
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

  // Navigate to previous video
  const goPrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
      if (navigator.vibrate) navigator.vibrate(20);
    }
  };

  // Navigate to next video
  const goNext = () => {
    if (currentIndex < posts.length - 1) {
      setCurrentIndex(currentIndex + 1);
      if (navigator.vibrate) navigator.vibrate(20);
    }
  };

  // Handle drag end for swipe
  const handleDragEnd = (_: any, info: PanInfo) => {
    isDragging.current = false;
    const threshold = 100;
    const velocity = info.velocity.y;

    // Swipe up = next video
    if (info.offset.y < -threshold || velocity < -500) {
      goNext();
    }
    // Swipe down = previous video
    else if (info.offset.y > threshold || velocity > 500) {
      goPrevious();
    }
  };

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key="reels-viewer"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] bg-black"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        {/* Swipeable Container */}
        <motion.div
          ref={containerRef}
          drag="y"
          dragConstraints={{ top: 0, bottom: 0 }}
          dragElastic={0.2}
          onDragStart={() => { isDragging.current = true; }}
          onDragEnd={handleDragEnd}
          style={{ y }}
          className="absolute inset-0"
        >
          {/* Current Video */}
          <AnimatePresence mode="wait">
            <motion.div
              key={currentPost.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.3 }}
              className="absolute inset-0"
            >
              <VideoPlayer
                post={currentPost}
                isActive={true}
                onClose={onClose}
                viewMode={viewMode}
                onViewModeChange={setViewMode}
              />
            </motion.div>
          </AnimatePresence>

          {/* Scroll Indicators */}
          {/* Removed - not needed */}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

// Single Video Player Component
interface VideoPlayerProps {
  post: PostData;
  isActive: boolean;
  onClose: () => void;
  viewMode: 'following' | 'foryou';
  onViewModeChange: (mode: 'following' | 'foryou') => void;
}

function VideoPlayer({ post, isActive, onClose, viewMode, onViewModeChange }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const [progress, setProgress] = useState(0);
  const [isLiked, setIsLiked] = useState(false);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [isDraggingProgress, setIsDraggingProgress] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [isCommentsOpen, setIsCommentsOpen] = useState(false);
  const [isShareOpen, setIsShareOpen] = useState(false);

  // Auto-play when active
  useEffect(() => {
    if (isActive && videoRef.current) {
      const playVideo = async () => {
        try {
          await videoRef.current?.play();
          setIsPlaying(true);
        } catch (err) {
          setIsPlaying(false);
        }
      };
      playVideo();
    } else if (!isActive && videoRef.current) {
      videoRef.current.pause();
      setIsPlaying(false);
    }
  }, [isActive, post.id]);

  // Auto-hide controls
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (showControls && isPlaying) {
      timer = setTimeout(() => {
        setShowControls(false);
      }, 3000);
    }
    return () => clearTimeout(timer);
  }, [showControls, isPlaying]);

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play().catch(() => {});
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      const percent = (videoRef.current.currentTime / videoRef.current.duration) * 100;
      setProgress(percent);
    }
  };

  const handleLike = () => {
    setIsLiked(!isLiked);
    if (navigator.vibrate) navigator.vibrate(30);
  };

  const handleBookmark = () => {
    setIsBookmarked(!isBookmarked);
    if (navigator.vibrate) navigator.vibrate(30);
  };

  const handleTap = () => {
    setShowControls(true);
  };

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (videoRef.current) {
      const rect = e.currentTarget.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const percentage = x / rect.width;
      videoRef.current.currentTime = percentage * videoRef.current.duration;
      if (navigator.vibrate) navigator.vibrate(10);
    }
  };

  const handleProgressMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    setIsDraggingProgress(true);
    handleProgressClick(e);
    
    const handleMouseMove = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const progressBar = target.closest('[data-progress-bar]') as HTMLDivElement;
      if (progressBar && videoRef.current) {
        const rect = progressBar.getBoundingClientRect();
        const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
        const percentage = x / rect.width;
        videoRef.current.currentTime = percentage * videoRef.current.duration;
      }
    };

    const handleMouseUp = () => {
      setIsDraggingProgress(false);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const handleProgressTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    setIsDraggingProgress(true);
    const touch = e.touches[0];
    if (videoRef.current) {
      const rect = e.currentTarget.getBoundingClientRect();
      const x = Math.max(0, Math.min(touch.clientX - rect.left, rect.width));
      const percentage = x / rect.width;
      videoRef.current.currentTime = percentage * videoRef.current.duration;
      if (navigator.vibrate) navigator.vibrate(10);
    }

    const handleTouchMove = (e: TouchEvent) => {
      e.preventDefault(); // Prevent scrolling
      const target = e.target as HTMLElement;
      const progressBar = target.closest('[data-progress-bar]') as HTMLDivElement;
      if (progressBar && videoRef.current && e.touches[0]) {
        const rect = progressBar.getBoundingClientRect();
        const x = Math.max(0, Math.min(e.touches[0].clientX - rect.left, rect.width));
        const percentage = x / rect.width;
        videoRef.current.currentTime = percentage * videoRef.current.duration;
      }
    };

    const handleTouchEnd = () => {
      setIsDraggingProgress(false);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
    };

    document.addEventListener('touchmove', handleTouchMove, { passive: false });
    document.addEventListener('touchend', handleTouchEnd);
  };

  // Format time helper
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="absolute inset-0 bg-black" onClick={handleTap}>
      <video
        ref={videoRef}
        src={post.videoUrl}
        className="w-full h-full object-cover"
        loop
        playsInline
        onDoubleClick={handleLike}
        onTimeUpdate={handleTimeUpdate}
      />

      {/* Top Bar */}
      <AnimatePresence>
        {showControls && (
          <motion.div
            initial={{ y: -50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -50, opacity: 0 }}
            className="absolute top-0 left-0 right-0 z-50 pointer-events-auto"
          >
            <div className="flex items-end justify-between px-3 pt-[calc(0.5rem+env(safe-area-inset-top))] pb-2">
              {/* Tab Switcher */}
              <div className="flex items-center gap-6 flex-1 justify-center pr-10">
                <button
                  onClick={() => onViewModeChange('following')}
                  className="relative pb-0.5"
                >
                  <span className={`text-[16px] font-semibold transition-all ${
                    viewMode === 'following' ? 'text-white' : 'text-white/40'
                  }`}>
                    กำลังติดตาม
                  </span>
                  {viewMode === 'following' && (
                    <motion.div
                      layoutId="tab-line"
                      className="absolute -bottom-0.5 left-0 right-0 h-[2px] bg-white rounded-full"
                      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                    />
                  )}
                </button>

                <button
                  onClick={() => onViewModeChange('foryou')}
                  className="relative pb-0.5"
                >
                  <span className={`text-[16px] font-semibold transition-all ${
                    viewMode === 'foryou' ? 'text-white' : 'text-white/40'
                  }`}>
                    สำหรับคุณ
                  </span>
                  {viewMode === 'foryou' && (
                    <motion.div
                      layoutId="tab-line"
                      className="absolute -bottom-0.5 left-0 right-0 h-[2px] bg-white rounded-full"
                      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                    />
                  )}
                </button>
              </div>

              {/* Close Button */}
              <button
                onClick={onClose}
                className="absolute top-[calc(0.5rem+env(safe-area-inset-top))] right-2 p-1.5 hover:bg-white/10 active:bg-white/20 rounded-full transition-colors"
              >
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" className="text-white">
                  <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
            </div>

            {/* Progress Bar - Removed from here */}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Right Side Actions */}
      <div className="absolute bottom-24 right-2 flex flex-col items-center gap-4 z-40 pointer-events-auto">
        {/* Profile Picture */}
        <button className="relative" onClick={(e) => e.stopPropagation()}>
          <div className="w-11 h-11 rounded-full border-[2.5px] border-white overflow-hidden bg-stone-900 shadow-lg">
            <img 
              src={post.user.avatarUrl} 
              alt={post.user.username} 
              className="w-full h-full object-cover"
            />
          </div>
          <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-5 h-5 bg-orange-500 rounded-full flex items-center justify-center shadow-lg">
            <span className="text-white text-base font-black leading-none">+</span>
          </div>
        </button>

        {/* Like */}
        <button 
          onClick={(e) => { e.stopPropagation(); handleLike(); }}
          className="flex flex-col items-center gap-0.5"
        >
          <motion.div 
            whileTap={{ scale: 0.8 }}
            animate={isLiked ? { scale: [1, 1.3, 1] } : {}}
            transition={{ duration: 0.3 }}
          >
            <Heart 
              className={`w-[30px] h-[30px] transition-all ${
                isLiked 
                  ? 'text-red-500 fill-red-500' 
                  : 'text-white'
              }`}
              strokeWidth={2.5}
              style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.4))' }}
            />
          </motion.div>
          <span className="text-white text-[11px] font-bold" style={{ textShadow: '0 1px 3px rgba(0,0,0,0.5)' }}>
            {isLiked ? (post.likes + 1 >= 1000 ? `${((post.likes + 1) / 1000).toFixed(1)}k` : post.likes + 1) : (post.likes >= 1000 ? `${(post.likes / 1000).toFixed(1)}k` : post.likes)}
          </span>
        </button>
        
        {/* Comment */}
        <button 
          onClick={(e) => { e.stopPropagation(); setIsCommentsOpen(true); }}
          className="flex flex-col items-center gap-0.5"
        >
          <motion.div whileTap={{ scale: 0.8 }}>
            <MessageCircle 
              className="w-[30px] h-[30px] text-white" 
              strokeWidth={2.5}
              style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.4))' }}
            />
          </motion.div>
          <span className="text-white text-[11px] font-bold" style={{ textShadow: '0 1px 3px rgba(0,0,0,0.5)' }}>
            {post.comments >= 1000 ? `${(post.comments / 1000).toFixed(1)}k` : post.comments}
          </span>
        </button>

        {/* Bookmark */}
        <button 
          onClick={(e) => { e.stopPropagation(); handleBookmark(); }}
          className="flex flex-col items-center gap-0.5"
        >
          <motion.div 
            whileTap={{ scale: 0.8 }}
            animate={isBookmarked ? { scale: [1, 1.3, 1] } : {}}
            transition={{ duration: 0.3 }}
          >
            <Bookmark 
              className={`w-[27px] h-[27px] transition-all ${
                isBookmarked 
                  ? 'text-yellow-400 fill-yellow-400' 
                  : 'text-white'
              }`}
              strokeWidth={2.5}
              style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.4))' }}
            />
          </motion.div>
        </button>

        {/* Share */}
        <button 
          onClick={(e) => { e.stopPropagation(); setIsShareOpen(true); }}
          className="flex flex-col items-center gap-0.5"
        >
          <motion.div whileTap={{ scale: 0.8 }}>
            <Share2 
              className="w-[27px] h-[27px] text-white" 
              strokeWidth={2.5}
              style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.4))' }}
            />
          </motion.div>
        </button>

        {/* More */}
        <button 
          onClick={(e) => e.stopPropagation()}
          className="mt-0.5"
        >
          <MoreVertical 
            className="w-[27px] h-[27px] text-white" 
            strokeWidth={2.5}
            style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.4))' }}
          />
        </button>
      </div>

      {/* Mute Button */}
      <AnimatePresence>
        {showControls && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            onClick={(e) => { e.stopPropagation(); setIsMuted(!isMuted); }}
            className="absolute top-[calc(3.5rem+env(safe-area-inset-top))] right-3 z-40 p-2 bg-black/30 backdrop-blur-sm hover:bg-black/40 active:bg-black/50 rounded-full transition-colors shadow-lg"
          >
            {isMuted ? (
              <VolumeX className="w-5 h-5 text-white" strokeWidth={2.5} />
            ) : (
              <Volume2 className="w-5 h-5 text-white" strokeWidth={2.5} />
            )}
          </motion.button>
        )}
      </AnimatePresence>

      {/* Bottom Info */}
      <div className="absolute bottom-0 left-0 right-0 z-30 pointer-events-auto">
        {/* User Info & Caption */}
        <div className="px-3 pb-3 pt-3 max-w-[calc(100%-80px)]">
          {/* Username Row */}
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-white font-bold text-[15px]" style={{ textShadow: '0 1px 3px rgba(0,0,0,0.5)' }}>
              {post.user.username}
            </span>
            {post.user.isVerified && (
              <div className="w-3.5 h-3.5 bg-blue-500 rounded-full flex items-center justify-center">
                <Check size={8} className="text-white" strokeWidth={3.5} />
              </div>
            )}
          </div>

          {/* Caption */}
          <p className="text-white text-[14px] leading-[1.4] line-clamp-2" style={{ textShadow: '0 1px 2px rgba(0,0,0,0.5)' }}>
            {post.caption}
          </p>

          {/* Music Info */}
          <div className="flex items-center gap-1.5 mt-2 pb-2">
            <Music className="w-3 h-3 text-white" strokeWidth={2.5} style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.5))' }} />
            <span className="text-white text-[12px]" style={{ textShadow: '0 1px 2px rgba(0,0,0,0.5)' }}>
              เพลงต้นฉบับ - {post.user.username}
            </span>
          </div>
        </div>

        {/* Progress Bar - Seekable */}
        <motion.div 
          data-progress-bar
          className="relative bg-white/10 cursor-pointer touch-none overflow-visible"
          onClick={handleProgressClick}
          onMouseDown={handleProgressMouseDown}
          onTouchStart={handleProgressTouchStart}
          animate={{ 
            height: isDraggingProgress ? '8px' : '3px',
            marginTop: isDraggingProgress ? '-2.5px' : '0px'
          }}
          transition={{ type: 'spring', stiffness: 400, damping: 30 }}
          style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
        >
          {/* Progress Fill */}
          <motion.div 
            className="h-full bg-orange-500 pointer-events-none relative"
            style={{ width: `${progress}%` }}
            transition={{ duration: 0.1 }}
          >
            {/* Scrubber Thumb */}
            <AnimatePresence>
              {isDraggingProgress && (
                <motion.div
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0, opacity: 0 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                  className="absolute right-0 top-1/2 -translate-y-1/2 w-4 h-4 bg-white rounded-full shadow-lg"
                  style={{ marginRight: '-8px' }}
                />
              )}
            </AnimatePresence>
          </motion.div>

          {/* Time Display */}
          <AnimatePresence>
            {isDraggingProgress && videoRef.current && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                transition={{ duration: 0.2 }}
                className="absolute left-1/2 -translate-x-1/2 -top-10 bg-black/80 backdrop-blur-md px-3 py-1.5 rounded-lg"
                style={{ 
                  left: `${progress}%`,
                  transform: 'translateX(-50%)'
                }}
              >
                <span className="text-white text-[12px] font-semibold whitespace-nowrap">
                  {formatTime(videoRef.current.currentTime)} / {formatTime(videoRef.current.duration)}
                </span>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>

      {/* Play/Pause Icon */}
      <AnimatePresence>
        {!isPlaying && (
          <motion.div
            initial={{ scale: 0.7, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.7, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
            onClick={togglePlay}
            className="absolute inset-0 flex items-center justify-center pointer-events-auto z-30"
          >
            <div className="bg-black/40 backdrop-blur-md p-6 rounded-full shadow-2xl">
              <svg width="50" height="50" viewBox="0 0 50 50" className="text-white">
                <path 
                  d="M15 10L40 25L15 40V10Z" 
                  fill="currentColor"
                />
              </svg>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Double-tap Like Animation */}
      <AnimatePresence>
        {isLiked && (
          <motion.div
            initial={{ scale: 0, opacity: 1 }}
            animate={{ scale: 1.5, opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6 }}
            className="absolute inset-0 flex items-center justify-center pointer-events-none z-20"
          >
            <Heart 
              className="w-24 h-24 text-white fill-white" 
              strokeWidth={0}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Comments Modal */}
      <CommentsModal isOpen={isCommentsOpen} onClose={() => setIsCommentsOpen(false)} post={post} />

      {/* Share Modal */}
      <ShareModal isOpen={isShareOpen} onClose={() => setIsShareOpen(false)} post={post} />
    </div>
  );
}
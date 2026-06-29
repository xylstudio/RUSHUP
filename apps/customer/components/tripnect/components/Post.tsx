import { Heart, MessageCircle, Bookmark, MoreHorizontal, Play, ArrowRight, Car, Share2, User } from 'lucide-react';
import { PostData } from '../data';
import { useState } from 'react';
import { ImageWithFallback } from './figma/ImageWithFallback';
import { CommentsModal } from './CommentsModal';
import { ShareModal } from './ShareModal';

interface PostProps {
  post: PostData;
  onVideoClick: (post: PostData) => void;
  onBookingClick: (post: PostData) => void;
  onRideClick?: (post: PostData) => void;
  onCommentsOpenChange?: (isOpen: boolean) => void;
  onShareOpenChange?: (isOpen: boolean) => void;
}

export function Post({ post, onVideoClick, onBookingClick, onRideClick, onCommentsOpenChange, onShareOpenChange }: PostProps) {
  const [isLiked, setIsLiked] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [isCommentsOpen, setIsCommentsOpen] = useState(false);
  const [isShareOpen, setIsShareOpen] = useState(false);
  const isVideo = !!post.videoUrl;

  const handleCommentsToggle = (open: boolean) => {
    setIsCommentsOpen(open);
    onCommentsOpenChange?.(open);
  };

  const handleShareToggle = (open: boolean) => {
    setIsShareOpen(open);
    onShareOpenChange?.(open);
  };

  return (
    <div className="relative mb-16 px-4 md:px-0">
      
      {/* --- 1. Header (Invisible) --- */}
      <div className="flex items-center justify-between mb-3 px-1">
        <div className="flex items-center gap-3">
            <div className="cursor-pointer hover:opacity-80 transition-opacity">
                {post.user.avatarUrl ? (
                    <img src={post.user.avatarUrl} className="w-8 h-8 rounded-full object-cover" />
                ) : (
                    <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-stone-800 flex items-center justify-center border border-slate-200 dark:border-stone-700">
                        <User size={16} className="text-slate-400 dark:text-stone-500" strokeWidth={2} />
                    </div>
                )}
            </div>
            <div className="flex flex-col">
                <span className="font-bold text-slate-900 text-[13px] leading-tight">{post.user.fullName}</span>
                {post.location && (
                    <span className="text-[10px] font-bold text-orange-500 uppercase tracking-wider">{post.location}</span>
                )}
            </div>
        </div>
        <button className="text-slate-300 hover:text-slate-900 transition-colors">
            <MoreHorizontal size={18} />
        </button>
      </div>

      {/* --- 2. Media (Clean & Borderless) --- */}
      <div className="relative w-full aspect-[4/5] rounded-[32px] overflow-hidden bg-slate-50">
          {isVideo ? (
             <div onClick={() => onVideoClick(post)} className="relative w-full h-full cursor-pointer group">
                <ImageWithFallback src={post.imageUrl} className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105" />
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="w-16 h-16 bg-white/10 backdrop-blur-[2px] rounded-full flex items-center justify-center border border-white/20">
                        <Play size={24} className="fill-white text-white ml-1" />
                    </div>
                </div>
             </div>
          ) : (
            <div className="w-full h-full group">
                <ImageWithFallback src={post.imageUrl} className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105" />
            </div>
          )}

          {/* Actions: Floating Glass (Ultra Light) */}
          <div className="absolute bottom-6 right-6 flex flex-col gap-5 z-10">
              <button onClick={() => setIsLiked(!isLiked)} className="group flex flex-col items-center gap-1">
                  <div className="transition-transform active:scale-90">
                    <Heart 
                        size={26} 
                        className={`transition-colors drop-shadow-md ${isLiked ? "fill-red-500 text-red-500" : "text-white"}`} 
                        strokeWidth={isLiked ? 0 : 1.5} 
                    />
                  </div>
                  <span className="text-white text-[10px] font-medium drop-shadow-md opacity-90">{post.likes}</span>
              </button>

              <button className="group flex flex-col items-center gap-1">
                  <div 
                    className="transition-transform active:scale-90"
                    onClick={() => handleCommentsToggle(true)}
                  >
                     <MessageCircle size={26} className="text-white drop-shadow-md" strokeWidth={1.5} />
                  </div>
                  <span className="text-white text-[10px] font-medium drop-shadow-md opacity-90">{post.comments}</span>
              </button>

              <button 
                className="group transition-transform active:scale-90"
                onClick={() => handleShareToggle(true)}
              >
                     <Share2 size={26} className="text-white drop-shadow-md" strokeWidth={1.5} />
              </button>

              <button onClick={() => setIsSaved(!isSaved)} className="group transition-transform active:scale-90">
                     <Bookmark 
                        size={26} 
                        className={`transition-colors drop-shadow-md ${isSaved ? "fill-orange-500 text-orange-500" : "text-white"}`} 
                        strokeWidth={isSaved ? 0 : 1.5} 
                    />
              </button>
          </div>
      </div>

      {/* --- 3. Footer (Minimalist Text) --- */}
      <div className="mt-4 px-1 flex items-start justify-between">
          <div className="max-w-[75%]">
             <p className="text-slate-600 text-[13px] leading-relaxed line-clamp-2">
                <span className="font-bold text-slate-900 mr-2">{post.user.fullName}</span>
                {post.caption}
             </p>
          </div>

          {/* Clean Booking (No Button Look) */}
          <div className="flex flex-col items-end gap-1 pl-2">
             <div className="flex items-center gap-2">


                 <button 
                    className="h-11 pl-6 pr-2 bg-orange-50 hover:bg-orange-100 rounded-full flex items-center justify-between gap-3 active:scale-95 transition-all group cursor-pointer"
                    onClick={(e) => {
                        e.stopPropagation();
                        onBookingClick(post);
                    }}
                 >
                    <span className="text-xs font-bold text-orange-900 uppercase tracking-widest">จอง</span>
                    <div className="w-8 h-8 rounded-full bg-orange-500 shadow-md shadow-orange-200 flex items-center justify-center text-white group-hover:scale-110 group-hover:rotate-[-15deg] transition-all duration-300">
                        <ArrowRight className="w-4 h-4" />
                    </div>
                </button>
             </div>
             <span className="text-xs font-medium text-slate-400 mr-2">฿{post.price?.toLocaleString() || '1,290'}</span>
          </div>
      </div>

      {/* Comments Modal */}
      <CommentsModal isOpen={isCommentsOpen} onClose={() => handleCommentsToggle(false)} post={post} />
      {/* Share Modal */}
      <ShareModal isOpen={isShareOpen} onClose={() => handleShareToggle(false)} post={post} />
    </div>
  );
}
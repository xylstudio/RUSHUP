import { X, Heart, Send, MoreHorizontal, ChevronLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useState, useRef, useEffect } from 'react';
import type { PostData } from '../data';

interface Comment {
  id: number;
  user: {
    username: string;
    fullName: string;
    avatarUrl: string;
  };
  text: string;
  timestamp: string;
  likes: number;
  isLiked: boolean;
  replies?: Comment[];
}

interface CommentsModalProps {
  isOpen: boolean;
  onClose: () => void;
  post?: PostData;
  comments?: number; // fallback for comment count
}

const MOCK_COMMENTS: Comment[] = [
  {
    id: 1,
    user: {
      username: 'somchai_travel',
      fullName: 'สมชาย นักท่องเที่ยว',
      avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100'
    },
    text: 'สวยมากเลยครับ! ไปช่วงไหนดีครับ?',
    timestamp: '2 ชม.',
    likes: 24,
    isLiked: false,
    replies: [
      {
        id: 11,
        user: {
          username: 'alex_smith',
          fullName: 'อเล็กซ์ สมิธ',
          avatarUrl: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100'
        },
        text: 'ช่วงพฤศจิกายน-กุมภาพันธ์ดีที่สุดเลยครับ',
        timestamp: '1 ชม.',
        likes: 8,
        isLiked: true
      }
    ]
  },
  {
    id: 2,
    user: {
      username: 'manee_journey',
      fullName: 'มานี ผจญภัย',
      avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100'
    },
    text: 'ขอพิกัดหน่อยค่ะ อยากไปมากกก 😍',
    timestamp: '5 ชม.',
    likes: 15,
    isLiked: true
  },
  {
    id: 3,
    user: {
      username: 'vichai_photo',
      fullName: 'วิชัย ถ่ายภาพ',
      avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100'
    },
    text: 'ถ่ายสวยมาก ใช้กล้องอะไรครับ',
    timestamp: '1 วัน',
    likes: 6,
    isLiked: false
  },
  {
    id: 4,
    user: {
      username: 'nida_travel',
      fullName: 'นิดา เที่ยวทั่วไทย',
      avatarUrl: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100'
    },
    text: 'เก็บไว้ในลิสต์เลยค่ะ',
    timestamp: '2 วัน',
    likes: 3,
    isLiked: false
  }
];

export function CommentsModal({ isOpen, onClose, post, comments }: CommentsModalProps) {
  const [commentList, setComments] = useState<Comment[]>(MOCK_COMMENTS);
  const [newComment, setNewComment] = useState('');
  const [replyingTo, setReplyingTo] = useState<Comment | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

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

  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  const handleLikeComment = (commentId: number) => {
    setComments(commentList.map(comment => {
      if (comment.id === commentId) {
        return {
          ...comment,
          isLiked: !comment.isLiked,
          likes: comment.isLiked ? comment.likes - 1 : comment.likes + 1
        };
      }
      // Handle nested replies
      if (comment.replies) {
        return {
          ...comment,
          replies: comment.replies.map(reply => 
            reply.id === commentId 
              ? {
                  ...reply,
                  isLiked: !reply.isLiked,
                  likes: reply.isLiked ? reply.likes - 1 : reply.likes + 1
                }
              : reply
          )
        };
      }
      return comment;
    }));
  };

  const handleSendComment = () => {
    if (!newComment.trim()) return;

    const newCommentObj: Comment = {
      id: Date.now(),
      user: {
        username: 'you',
        fullName: 'คุณ',
        avatarUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100'
      },
      text: newComment,
      timestamp: 'เมื่อสักครู่',
      likes: 0,
      isLiked: false
    };

    if (replyingTo) {
      // Add as reply
      setComments(commentList.map(comment => {
        if (comment.id === replyingTo.id) {
          return {
            ...comment,
            replies: [...(comment.replies || []), newCommentObj]
          };
        }
        return comment;
      }));
      setReplyingTo(null);
    } else {
      // Add as new comment
      setComments([newCommentObj, ...commentList]);
    }

    setNewComment('');
  };

  const totalComments = commentList.reduce((acc, comment) => {
    return acc + 1 + (comment.replies?.length || 0);
  }, 0);

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
            className="fixed inset-0 bg-black/60 z-50"
          />

          {/* Modal */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed inset-x-0 bottom-0 bg-white rounded-t-[24px] z-50 flex flex-col max-h-[85vh]"
          >
            {/* Handle Bar */}
            <div className="flex justify-center pt-3 pb-2">
              <div className="w-10 h-1 bg-stone-300 rounded-full" />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-stone-200">
              <h2 className="text-[17px] font-bold text-stone-900">
                ความคิดเห็น {totalComments > 0 && `(${totalComments})`}
              </h2>
              <button
                onClick={onClose}
                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-stone-100 transition-colors"
              >
                <X size={20} className="text-stone-600" strokeWidth={2} />
              </button>
            </div>

            {/* Comments List */}
            <div className="flex-1 overflow-y-auto px-4 py-4">
              {commentList.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-stone-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <Heart size={28} className="text-stone-400" strokeWidth={2} />
                  </div>
                  <p className="text-[15px] font-semibold text-stone-900 mb-1">ยังไม่มีความคิดเห็น</p>
                  <p className="text-[13px] text-stone-500">เป็นคนแรกที่แสดงความคิดเห็น</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {commentList.map((comment) => (
                    <div key={comment.id}>
                      {/* Main Comment */}
                      <div className="flex gap-3">
                        <img
                          src={comment.user.avatarUrl}
                          alt={comment.user.fullName}
                          className="w-9 h-9 rounded-full object-cover flex-shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="bg-stone-50 rounded-[18px] px-3 py-2">
                            <p className="text-[13px] font-bold text-stone-900 mb-0.5">
                              {comment.user.fullName}
                            </p>
                            <p className="text-[14px] text-stone-900 leading-snug">
                              {comment.text}
                            </p>
                          </div>
                          
                          {/* Comment Actions */}
                          <div className="flex items-center gap-4 mt-1.5 ml-3">
                            <span className="text-[12px] text-stone-500">
                              {comment.timestamp}
                            </span>
                            <button
                              onClick={() => handleLikeComment(comment.id)}
                              className={`text-[12px] font-semibold ${
                                comment.isLiked ? 'text-orange-500' : 'text-stone-600'
                              }`}
                            >
                              ถูกใจ {comment.likes > 0 && `(${comment.likes})`}
                            </button>
                            <button
                              onClick={() => setReplyingTo(comment)}
                              className="text-[12px] font-semibold text-stone-600"
                            >
                              ตอบกลับ
                            </button>
                          </div>

                          {/* Replies */}
                          {comment.replies && comment.replies.length > 0 && (
                            <div className="mt-3 space-y-3">
                              {comment.replies.map((reply) => (
                                <div key={reply.id} className="flex gap-3">
                                  <img
                                    src={reply.user.avatarUrl}
                                    alt={reply.user.fullName}
                                    className="w-8 h-8 rounded-full object-cover flex-shrink-0"
                                  />
                                  <div className="flex-1 min-w-0">
                                    <div className="bg-stone-50 rounded-[16px] px-3 py-2">
                                      <p className="text-[12px] font-bold text-stone-900 mb-0.5">
                                        {reply.user.fullName}
                                      </p>
                                      <p className="text-[13px] text-stone-900 leading-snug">
                                        {reply.text}
                                      </p>
                                    </div>
                                    
                                    <div className="flex items-center gap-4 mt-1.5 ml-3">
                                      <span className="text-[11px] text-stone-500">
                                        {reply.timestamp}
                                      </span>
                                      <button
                                        onClick={() => handleLikeComment(reply.id)}
                                        className={`text-[11px] font-semibold ${
                                          reply.isLiked ? 'text-orange-500' : 'text-stone-600'
                                        }`}
                                      >
                                        ถูกใจ {reply.likes > 0 && `(${reply.likes})`}
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Reply To Banner */}
            <AnimatePresence>
              {replyingTo && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="border-t border-stone-200 bg-stone-50 px-4 py-2 flex items-center justify-between overflow-hidden"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <ChevronLeft size={16} className="text-stone-500 flex-shrink-0" />
                    <span className="text-[13px] text-stone-600 truncate">
                      กำลังตอบกลับ <span className="font-semibold">{replyingTo.user.fullName}</span>
                    </span>
                  </div>
                  <button
                    onClick={() => setReplyingTo(null)}
                    className="text-[13px] font-semibold text-orange-500 flex-shrink-0"
                  >
                    ยกเลิก
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Input Area */}
            <div className="border-t border-stone-200 p-4 bg-white">
              <div className="flex items-center gap-3">
                <img
                  src="https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100"
                  alt="You"
                  className="w-9 h-9 rounded-full object-cover flex-shrink-0"
                />
                <div className="flex-1 flex items-center gap-2 bg-stone-50 rounded-full px-4 py-2">
                  <input
                    ref={inputRef}
                    type="text"
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSendComment()}
                    placeholder={replyingTo ? `ตอบกลับ ${replyingTo.user.fullName}...` : 'เขียนความคิดเห็น...'}
                    className="flex-1 bg-transparent text-[14px] text-stone-900 placeholder:text-stone-400 outline-none"
                  />
                  <button
                    onClick={handleSendComment}
                    disabled={!newComment.trim()}
                    className={`p-1.5 rounded-full transition-all ${
                      newComment.trim()
                        ? 'bg-orange-500 text-white'
                        : 'bg-transparent text-stone-300'
                    }`}
                  >
                    <Send size={16} strokeWidth={2.5} />
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
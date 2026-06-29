import { useState, useRef, useEffect } from 'react';
import { clsx } from 'clsx';
import { motion, useMotionValue, useTransform, PanInfo, animate } from 'framer-motion';
import { Trash2, Pin, Volume2, VolumeX, Check, Archive } from 'lucide-react';

export interface Chat {
  id: number;
  name: string;
  message: string;
  time: string;
  unread: number;
  avatar: string;
  verified: boolean;
  category: string;
  pinned?: boolean;
  muted?: boolean;
  isGroup?: boolean;
}

interface SwipeableChatProps {
  chat: Chat;
  onClick: () => void;
  onDelete?: (chatId: number) => void;
  onArchive?: (chatId: number) => void;
  onPin?: (chatId: number) => void;
  onMute?: (chatId: number) => void;
  onLongPress?: (chat: Chat) => void;
  lockedChatId?: number | null;
  lockedAction?: 'left' | 'right' | null;
  onLockChange?: (chatId: number | null, action: 'left' | 'right' | null) => void;
}

const SWIPE_THRESHOLD = 60;
const ACTION_WIDTH = 75;
const VERTICAL_SCROLL_THRESHOLD = 8; // px threshold for detecting scroll

export function SwipeableChat({ 
  chat, 
  onClick, 
  onDelete,
  onArchive, 
  onPin, 
  onMute,
  onLongPress,
  lockedChatId,
  lockedAction,
  onLockChange
}: SwipeableChatProps) {
  const [isLongPressing, setIsLongPressing] = useState(false);
  const [confirmAction, setConfirmAction] = useState<'delete' | 'archive' | null>(null);
  const x = useMotionValue(0);
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const hasDragged = useRef(false);
  const isDragging = useRef(false);
  const touchStartPos = useRef({ x: 0, y: 0 });
  const hasScrolled = useRef(false);

  const isMyLocked = lockedChatId === chat.id;
  const myLockedSide = isMyLocked ? lockedAction : null;

  // Clear long press timer
  const clearLongPressTimer = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  // Touch/Mouse Start - start long press timer
  const handleTouchStart = (e: React.TouchEvent | React.MouseEvent) => {
    if (isMyLocked) return;
    
    hasDragged.current = false;
    isDragging.current = false;
    hasScrolled.current = false;
    
    // Record start position
    if ('touches' in e) {
      touchStartPos.current = {
        x: e.touches[0].clientX,
        y: e.touches[0].clientY
      };
    } else {
      touchStartPos.current = {
        x: e.clientX,
        y: e.clientY
      };
    }
    
    // Start long press timer
    longPressTimer.current = setTimeout(() => {
      if (!hasDragged.current && !isDragging.current && !hasScrolled.current) {
        setIsLongPressing(true);
        onLongPress?.(chat);
        if (navigator.vibrate) navigator.vibrate(50);
      }
    }, 500);
  };

  // Touch/Mouse Move - detect scroll to cancel long press
  const handleTouchMove = (e: React.TouchEvent | React.MouseEvent) => {
    if (!longPressTimer.current) return;

    let currentX = 0;
    let currentY = 0;
    
    if ('touches' in e) {
      currentX = e.touches[0].clientX;
      currentY = e.touches[0].clientY;
    } else {
      currentX = e.clientX;
      currentY = e.clientY;
    }

    const deltaX = Math.abs(currentX - touchStartPos.current.x);
    const deltaY = Math.abs(currentY - touchStartPos.current.y);

    // If vertical movement is detected (scrolling), cancel long press
    if (deltaY > VERTICAL_SCROLL_THRESHOLD) {
      hasScrolled.current = true;
      clearLongPressTimer();
    }
    
    // If horizontal movement, it's a swipe
    if (deltaX > VERTICAL_SCROLL_THRESHOLD) {
      hasDragged.current = true;
      clearLongPressTimer();
    }
  };

  // Touch/Mouse End
  const handleTouchEnd = () => {
    clearLongPressTimer();
    setIsLongPressing(false);
    isDragging.current = false;
    hasScrolled.current = false;
  };

  // Handle drag start (from Motion)
  const handleDragStart = () => {
    hasDragged.current = true;
    isDragging.current = true;
    clearLongPressTimer();
    
    // Close other locked chats when starting to drag
    if (lockedChatId && lockedChatId !== chat.id) {
      onLockChange?.(null, null);
    }
  };

  // Handle drag (during dragging)
  const handleDrag = () => {
    // If we're locked, don't allow dragging
    if (isMyLocked) return;
    
    const currentX = x.get();
    
    // If dragging back towards center from locked position, unlock
    if (myLockedSide === 'left' && currentX > -ACTION_WIDTH) {
      onLockChange?.(null, null);
    } else if (myLockedSide === 'right' && currentX < ACTION_WIDTH) {
      onLockChange?.(null, null);
    }
  };

  // Handle drag end
  const handleDragEnd = (_: any, info: PanInfo) => {
    isDragging.current = false;
    const offset = info.offset.x;
    const velocity = info.velocity.x;
    const currentX = x.get();
    
    // Check if we should lock to show actions
    // Swipe Left (Delete & Archive)
    if (offset < -SWIPE_THRESHOLD && currentX < -SWIPE_THRESHOLD) {
      if (navigator.vibrate) navigator.vibrate([30, 20, 30]);
      onLockChange?.(chat.id, 'left');
    }
    // Swipe Right (Pin & Mute)
    else if (offset > SWIPE_THRESHOLD && currentX > SWIPE_THRESHOLD) {
      if (navigator.vibrate) navigator.vibrate([30, 20, 30]);
      onLockChange?.(chat.id, 'right');
    }
    // Otherwise, spring back to center smoothly
    else {
      // Smooth spring back animation
      animate(x, 0, {
        type: 'spring',
        stiffness: 300,
        damping: 30,
        velocity: velocity
      });
    }
  };

  // Handle click - only if not dragged
  const handleClick = () => {
    if (!hasDragged.current && !isLongPressing && !isMyLocked && !hasScrolled.current) {
      onClick();
    }
  };

  // Action handlers
  const handleDeleteClick = () => {
    setConfirmAction('delete');
  };

  const handleArchiveClick = () => {
    setConfirmAction('archive');
  };

  const handlePinClick = () => {
    onPin?.(chat.id);
    onLockChange?.(null, null);
  };

  const handleMuteClick = () => {
    onMute?.(chat.id);
    onLockChange?.(null, null);
  };

  useEffect(() => {
    return () => {
      clearLongPressTimer();
    };
  }, []);

  // Sync x position when locked state changes
  useEffect(() => {
    if (myLockedSide === 'left') {
      animate(x, -ACTION_WIDTH * 2, {
        type: 'spring',
        stiffness: 400,
        damping: 35
      });
    } else if (myLockedSide === 'right') {
      animate(x, ACTION_WIDTH * 2, {
        type: 'spring',
        stiffness: 400,
        damping: 35
      });
    } else if (!isDragging.current) {
      // Spring back to center with smooth animation
      animate(x, 0, {
        type: 'spring',
        stiffness: 350,
        damping: 32
      });
    }
  }, [myLockedSide, x]);

  return (
    <div className="relative overflow-hidden bg-white" ref={containerRef}>
      {/* Confirmation Dialog */}
      {confirmAction && (
        <ConfirmDialog
          action={confirmAction}
          chatName={chat.name}
          onConfirm={() => {
            if (confirmAction === 'delete') {
              onDelete?.(chat.id);
            } else if (confirmAction === 'archive') {
              onArchive?.(chat.id);
            }
            setConfirmAction(null);
            onLockChange?.(null, null);
          }}
          onCancel={() => {
            setConfirmAction(null);
            onLockChange?.(null, null);
          }}
        />
      )}

      {/* Background Actions */}
      <div className="absolute inset-0 flex items-center justify-between pointer-events-none">
        {/* Left Swipe = Delete & Archive Buttons (show on right side) */}
        <div className="absolute right-0 h-full flex pointer-events-auto">
          <button
            onClick={handleArchiveClick}
            className="h-full w-[75px] bg-orange-500 flex items-center justify-center hover:bg-orange-600 active:bg-orange-700 transition-colors"
          >
            <Archive size={22} className="text-white" strokeWidth={2.5} />
          </button>
          <button
            onClick={handleDeleteClick}
            className="h-full w-[75px] bg-red-500 flex items-center justify-center hover:bg-red-600 active:bg-red-700 transition-colors"
          >
            <Trash2 size={22} className="text-white" strokeWidth={2.5} />
          </button>
        </div>
        
        {/* Right Swipe = Mute & Pin Buttons (show on left side) */}
        <div className="absolute left-0 h-full flex pointer-events-auto">
          <button
            onClick={handlePinClick}
            className="h-full w-[75px] bg-orange-500 flex items-center justify-center hover:bg-orange-600 active:bg-orange-700 transition-colors"
          >
            <Pin 
              size={22} 
              className="text-white" 
              strokeWidth={2.5}
              fill={chat.pinned ? "white" : "none"}
            />
          </button>
          <button
            onClick={handleMuteClick}
            className="h-full w-[75px] bg-stone-400 flex items-center justify-center hover:bg-stone-500 active:bg-stone-600 transition-colors"
          >
            {chat.muted ? (
              <Volume2 size={22} className="text-white" strokeWidth={2.5} />
            ) : (
              <VolumeX size={22} className="text-white" strokeWidth={2.5} />
            )}
          </button>
        </div>
      </div>

      {/* Main Content */}
      <motion.div
        drag="x"
        dragConstraints={{ left: -ACTION_WIDTH * 2, right: ACTION_WIDTH * 2 }}
        dragElastic={0.15}
        dragMomentum={false}
        onDragStart={handleDragStart}
        onDrag={handleDrag}
        onDragEnd={handleDragEnd}
        style={{ x }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onMouseDown={handleTouchStart}
        onMouseMove={handleTouchMove}
        onMouseUp={handleTouchEnd}
        onMouseLeave={handleTouchEnd}
        className={clsx(
          'bg-white relative',
          isLongPressing && 'scale-[0.98]'
        )}
      >
        <button
          onClick={handleClick}
          className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 active:bg-slate-100 transition-colors text-left"
        >
          {/* Avatar */}
          <div className="relative flex-shrink-0">
            <img 
              src={chat.avatar} 
              alt={chat.name}
              className={clsx(
                "w-14 h-14 object-cover bg-slate-100",
                chat.isGroup ? "rounded-2xl" : "rounded-full"
              )}
            />
            {chat.verified && (
              <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-orange-500 rounded-full flex items-center justify-center border-2 border-white">
                <Check size={12} className="text-white" strokeWidth={3} />
              </div>
            )}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <h3 className={clsx(
                  "text-[15px] truncate",
                  chat.unread > 0 ? "font-bold text-slate-900" : "font-medium text-slate-900"
                )}>
                  {chat.name}
                </h3>
                {chat.pinned && (
                  <Pin size={14} className="text-orange-500 flex-shrink-0" fill="currentColor" />
                )}
                {chat.muted && (
                  <VolumeX size={14} className="text-slate-400 flex-shrink-0" />
                )}
              </div>
              <span className="text-[12px] text-slate-400 ml-2 flex-shrink-0">{chat.time}</span>
            </div>
            
            <div className="flex items-center justify-between">
              <p className={clsx(
                "text-[14px] truncate",
                chat.unread > 0 ? "text-slate-900 font-medium" : "text-slate-500"
              )}>
                {chat.message}
              </p>
              {chat.unread > 0 && (
                <div className="ml-2 min-w-[20px] h-5 px-1.5 bg-orange-500 text-white text-[11px] font-bold rounded-full flex items-center justify-center flex-shrink-0">
                  {chat.unread > 99 ? '99+' : chat.unread}
                </div>
              )}
            </div>
          </div>
        </button>

        {/* Long Press Indicator */}
        {isLongPressing && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute inset-0 pointer-events-none border-2 border-orange-500 rounded-lg"
          />
        )}
      </motion.div>
    </div>
  );
}

// Long Press Menu Modal
interface LongPressMenuProps {
  chat: Chat;
  isOpen: boolean;
  onClose: () => void;
  onMute?: (chatId: number) => void;
  onOpenChat?: () => void;
}

export function LongPressMenu({
  chat,
  isOpen,
  onClose,
  onMute,
  onOpenChat
}: LongPressMenuProps) {
  if (!isOpen) return null;

  // Mock recent messages for preview
  const recentMessages = [
    { id: 1, text: 'สวัสดีครับ!', time: '10:30', isMine: false },
    { id: 2, text: 'สวัสดีค่ะ', time: '10:31', isMine: true },
    { id: 3, text: 'วันนี้อากาศดีมากเลยนะ เหมาะกับการเที่ยว', time: '10:32', isMine: false },
    { id: 4, text: 'จริงเลย! ไปเที่ยวไหนดีคะ', time: '10:33', isMine: true },
    { id: 5, text: chat.message, time: chat.time, isMine: false },
  ];

  const handleMuteToggle = () => {
    onMute?.(chat.id);
    onClose();
  };

  return (
    <>
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[200]"
      />

      {/* Chat Preview Modal */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 30 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 30 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[201] w-[90%] max-w-md bg-white rounded-3xl shadow-2xl flex flex-col overflow-hidden"
        style={{ maxHeight: '80vh' }}
      >
        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-stone-100 bg-stone-50">
          <img 
            src={chat.avatar} 
            alt={chat.name}
            className={clsx(
              "w-12 h-12 object-cover",
              chat.isGroup ? "rounded-xl" : "rounded-full"
            )}
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="text-[16px] font-bold text-stone-900 truncate">{chat.name}</h3>
              {chat.verified && (
                <div className="w-4 h-4 bg-orange-500 rounded-full flex items-center justify-center flex-shrink-0">
                  <Check size={10} className="text-white" strokeWidth={3} />
                </div>
              )}
            </div>
            <p className="text-[12px] text-stone-500">แตะเพื่อดูแชททั้งหมด</p>
          </div>
        </div>

        {/* Messages Preview */}
        <div className="flex-1 overflow-y-auto p-4 bg-stone-50" style={{ maxHeight: '40vh' }}>
          <div className="space-y-3">
            {recentMessages.map((message) => (
              <div
                key={message.id}
                className={clsx(
                  "flex",
                  message.isMine ? "justify-end" : "justify-start"
                )}
              >
                <div
                  className={clsx(
                    "max-w-[75%] rounded-2xl px-4 py-2.5",
                    message.isMine
                      ? "bg-orange-500 text-white rounded-br-md"
                      : "bg-white text-stone-900 rounded-bl-md border border-stone-200"
                  )}
                >
                  <p className="text-[14px] leading-relaxed">{message.text}</p>
                  <span 
                    className={clsx(
                      "text-[11px] mt-1 block",
                      message.isMine ? "text-orange-100" : "text-stone-400"
                    )}
                  >
                    {message.time}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="border-t border-stone-200 bg-white">
          <button
            onClick={handleMuteToggle}
            className="w-full flex items-center gap-3 px-5 py-4 hover:bg-stone-50 active:bg-stone-100 transition-colors"
          >
            {chat.muted ? (
              <>
                <Volume2 size={20} className="text-orange-500" strokeWidth={2} />
                <span className="text-[15px] font-medium text-stone-900">เปิดการแจ้งเตือน</span>
              </>
            ) : (
              <>
                <VolumeX size={20} className="text-stone-500" strokeWidth={2} />
                <span className="text-[15px] font-medium text-stone-900">ปิดการแจ้งเตือน</span>
              </>
            )}
          </button>
        </div>

        {/* Footer Actions */}
        <div className="px-4 py-3 border-t border-stone-200 bg-white flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 py-3 text-[15px] font-semibold text-stone-600 hover:bg-stone-50 active:bg-stone-100 transition-colors rounded-xl"
          >
            ปิด
          </button>
          <button
            onClick={() => {
              onClose();
              onOpenChat?.();
            }}
            className="flex-1 py-3 text-[15px] font-semibold text-white bg-orange-500 hover:bg-orange-600 active:bg-orange-700 transition-colors rounded-xl"
          >
            เปิดแชท
          </button>
        </div>
      </motion.div>
    </>
  );
}

// Confirmation Dialog
interface ConfirmDialogProps {
  action: 'delete' | 'archive';
  chatName: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  action,
  chatName,
  onConfirm,
  onCancel
}: ConfirmDialogProps) {
  const isDelete = action === 'delete';
  
  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm"
      >
        <div className="flex items-start gap-3 mb-4">
          <div className={clsx(
            "w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0",
            isDelete ? "bg-red-100" : "bg-orange-100"
          )}>
            {isDelete ? (
              <Trash2 size={20} className="text-red-500" strokeWidth={2.5} />
            ) : (
              <Archive size={20} className="text-orange-500" strokeWidth={2.5} />
            )}
          </div>
          <div className="flex-1">
            <h3 className="text-[17px] font-bold text-stone-900 mb-1">
              {isDelete ? 'ลบแชท' : 'เก็บถาวร'}
            </h3>
            <p className="text-[14px] text-stone-600 leading-relaxed">
              {isDelete 
                ? `คุณต้องการลบการสนทนากับ `
                : `คุณต้องการเก็บการสนทนากับ `
              }
              <span className="font-semibold text-stone-900">{chatName}</span> 
              {isDelete ? ' หรือไม่?' : ' ไว้ในที่เก็บถาวรหรือไม่?'}
            </p>
          </div>
        </div>
        
        <div className="flex gap-2">
          <button
            onClick={onCancel}
            className="flex-1 py-3 text-[15px] font-semibold text-stone-700 bg-stone-100 hover:bg-stone-200 active:bg-stone-300 transition-colors rounded-xl"
          >
            ยกเลิก
          </button>
          <button
            onClick={onConfirm}
            className={clsx(
              "flex-1 py-3 text-[15px] font-semibold text-white transition-colors rounded-xl",
              isDelete 
                ? "bg-red-500 hover:bg-red-600 active:bg-red-700"
                : "bg-orange-500 hover:bg-orange-600 active:bg-orange-700"
            )}
          >
            {isDelete ? 'ลบแชท' : 'เก็บถาวร'}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
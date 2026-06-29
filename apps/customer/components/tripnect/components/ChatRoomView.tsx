import { useState, useRef, useEffect } from 'react';
import { clsx } from 'clsx';
import { ChevronLeft, Phone, Video, MoreVertical, Send, Image as ImageIcon, Mic, Smile } from 'lucide-react';

interface Message {
  id: number;
  text: string;
  time: string;
  isMine: boolean;
}

interface ChatRoomViewProps {
  chatId: number;
  chatName: string;
  chatAvatar: string;
  isVerified: boolean;
  onBack: () => void;
}

export function ChatRoomView({ chatId, chatName, chatAvatar, isVerified, onBack }: ChatRoomViewProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 1,
      text: 'สวัสดีครับ!',
      time: '10:30',
      isMine: false
    },
    {
      id: 2,
      text: 'สวัสดีค่ะ',
      time: '10:31',
      isMine: true
    },
    {
      id: 3,
      text: 'วันนี้อากาศดีมากเลยนะ เหมาะกับการเที่ยว',
      time: '10:32',
      isMine: false
    },
    {
      id: 4,
      text: 'จริงเลย! ไปเที่ยวไหนดีคะ',
      time: '10:33',
      isMine: true
    },
    {
      id: 5,
      text: 'ลองไปดอยสุเทพดูไหมครับ วิวสวยมาก',
      time: '10:34',
      isMine: false
    },
  ]);

  const [inputText, setInputText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = () => {
    if (inputText.trim() === '') return;

    const now = new Date();
    const timeString = `${now.getHours()}:${now.getMinutes().toString().padStart(2, '0')}`;

    const newMessage: Message = {
      id: messages.length + 1,
      text: inputText.trim(),
      time: timeString,
      isMine: true
    };

    setMessages([...messages, newMessage]);
    setInputText('');

    // Simulate response (optional)
    setTimeout(() => {
      const responseMessage: Message = {
        id: messages.length + 2,
        text: 'ได้เลยครับ! 😊',
        time: `${now.getHours()}:${(now.getMinutes() + 1).toString().padStart(2, '0')}`,
        isMine: false
      };
      setMessages(prev => [...prev, responseMessage]);
    }, 1000);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="w-full h-screen bg-[#F5F5F5] flex flex-col">
      
      {/* Header */}
      <div className="sticky top-0 z-40 bg-white border-b border-slate-100">
        <div className="flex items-center justify-between px-4 h-14">
          {/* Left */}
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <button 
              onClick={onBack}
              className="w-9 h-9 -ml-2 flex items-center justify-center text-slate-600 hover:text-slate-900 active:bg-slate-50 rounded-full transition-colors"
            >
              <ChevronLeft size={24} strokeWidth={2} />
            </button>
            
            <button className="flex items-center gap-2 min-w-0 flex-1 active:opacity-70 transition-opacity">
              <div className="relative flex-shrink-0">
                <img 
                  src={chatAvatar}
                  alt={chatName}
                  className="w-9 h-9 rounded-full object-cover bg-slate-100"
                />
                {isVerified && (
                  <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-orange-500 rounded-full flex items-center justify-center border-2 border-white">
                    <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                )}
              </div>
              <div className="min-w-0 text-left">
                <h2 className="text-[15px] font-semibold text-slate-900 truncate">{chatName}</h2>
                <p className="text-[11px] text-slate-400">ออนไลน์</p>
              </div>
            </button>
          </div>

          {/* Right */}
          <div className="flex items-center gap-1">
            <button className="w-9 h-9 flex items-center justify-center text-slate-600 hover:text-slate-900 hover:bg-slate-50 rounded-full transition-colors">
              <Phone size={18} strokeWidth={2} />
            </button>
            <button className="w-9 h-9 flex items-center justify-center text-slate-600 hover:text-slate-900 hover:bg-slate-50 rounded-full transition-colors">
              <Video size={18} strokeWidth={2} />
            </button>
            <button className="w-9 h-9 flex items-center justify-center text-slate-600 hover:text-slate-900 hover:bg-slate-50 rounded-full transition-colors">
              <MoreVertical size={18} strokeWidth={2} />
            </button>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {/* Date Divider */}
        <div className="flex items-center justify-center">
          <div className="px-3 py-1 bg-white/80 backdrop-blur-sm rounded-full shadow-sm">
            <span className="text-[11px] text-slate-500 font-medium">วันนี้</span>
          </div>
        </div>

        {messages.map((msg, index) => {
          const showAvatar = !msg.isMine && (index === 0 || messages[index - 1].isMine);
          
          return (
            <div
              key={msg.id}
              className={clsx(
                'flex gap-2',
                msg.isMine ? 'justify-end' : 'justify-start'
              )}
            >
              {/* Avatar for received messages */}
              {!msg.isMine && (
                <div className="w-8 h-8 flex-shrink-0">
                  {showAvatar && (
                    <img 
                      src={chatAvatar}
                      alt={chatName}
                      className="w-8 h-8 rounded-full object-cover"
                    />
                  )}
                </div>
              )}

              {/* Message Bubble */}
              <div className={clsx(
                'flex flex-col max-w-[75%]',
                msg.isMine ? 'items-end' : 'items-start'
              )}>
                <div className={clsx(
                  'px-4 py-2.5 rounded-2xl break-words',
                  msg.isMine 
                    ? 'bg-orange-500 text-white rounded-br-md' 
                    : 'bg-white text-slate-900 rounded-bl-md shadow-sm'
                )}>
                  <p className="text-[14px] leading-relaxed">{msg.text}</p>
                </div>
                <span className="text-[10px] text-slate-400 mt-1 px-1">
                  {msg.time}
                </span>
              </div>
            </div>
          );
        })}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="sticky bottom-0 bg-white border-t border-slate-100 px-4 py-3">
        <div className="flex items-end gap-2">
          {/* Attachment & Emoji Buttons */}
          <div className="flex items-center gap-1">
            <button className="w-9 h-9 flex items-center justify-center text-slate-500 hover:text-orange-500 hover:bg-orange-50 rounded-full transition-colors active:scale-95">
              <ImageIcon size={20} strokeWidth={2} />
            </button>
          </div>

          {/* Input */}
          <div className="flex-1 relative">
            <input
              ref={inputRef}
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="ข้อความ"
              className="w-full bg-slate-50 rounded-full px-4 py-2.5 text-[14px] text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:bg-white transition-all"
            />
            <button className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors">
              <Smile size={18} strokeWidth={2} />
            </button>
          </div>

          {/* Send Button */}
          <button 
            onClick={handleSend}
            disabled={inputText.trim() === ''}
            className={clsx(
              'w-9 h-9 flex items-center justify-center rounded-full transition-all active:scale-95',
              inputText.trim() !== ''
                ? 'bg-orange-500 text-white hover:bg-orange-600'
                : 'bg-slate-100 text-slate-300 cursor-not-allowed'
            )}
          >
            <Send size={18} strokeWidth={2} />
          </button>
        </div>
      </div>
    </div>
  );
}

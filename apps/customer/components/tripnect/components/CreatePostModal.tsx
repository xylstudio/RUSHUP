import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Image, Video, MapPin, Smile, Loader2, Send } from 'lucide-react';
import { useAuth } from '../../../lib/AuthContext';
import { supabase } from '../../../lib/supabaseClient';

interface CreatePostModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPostCreated: () => void;
}

export function CreatePostModal({ isOpen, onClose, onPostCreated }: CreatePostModalProps) {
  const { profile, user } = useAuth();
  const [caption, setCaption] = useState('');
  const [location, setLocation] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [fileType, setFileType] = useState<'image' | 'video' | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    const isVideo = selectedFile.type.startsWith('video/');
    setFileType(isVideo ? 'video' : 'image');
    setPreviewUrl(URL.createObjectURL(selectedFile));
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const selectedFile = e.dataTransfer.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    const isVideo = selectedFile.type.startsWith('video/');
    setFileType(isVideo ? 'video' : 'image');
    setPreviewUrl(URL.createObjectURL(selectedFile));
  };

  const handlePost = async () => {
    const userId = profile?.id || user?.id;
    if (!file || !userId) return;

    try {
      setIsUploading(true);

      // 1. Get presigned URL from Cloudflare R2 API route
      const res = await fetch('/api/upload/presign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename: file.name, contentType: file.type }),
      });

      if (!res.ok) throw new Error('Failed to get upload URL');
      const { presignedUrl, finalUrl } = await res.json();

      // 2. Upload file directly to Cloudflare R2
      const uploadRes = await fetch(presignedUrl, {
        method: 'PUT',
        headers: { 'Content-Type': file.type },
        body: file,
      });

      if (!uploadRes.ok) throw new Error('Failed to upload file to Cloudflare');

      // 3. Insert post metadata into Supabase 'posts' table
      const { error } = await supabase.from('posts').insert({
        user_id: userId,
        image_url: fileType === 'image' ? finalUrl : finalUrl + '#t=0.1', // Video thumbnail fallback
        video_url: fileType === 'video' ? finalUrl : null,
        caption: caption.trim(),
        location: location.trim() || null,
      });

      if (error) throw error;

      // Reset state and close modal
      setCaption('');
      setLocation('');
      setFile(null);
      setFileType(null);
      setPreviewUrl(null);
      onPostCreated();
      onClose();

    } catch (error) {
      console.error('Error creating post:', error);
      alert('ไม่สามารถอัปโหลดโพสต์ได้ กรุณาลองใหม่อีกครั้ง');
    } finally {
      setIsUploading(false);
    }
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
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200]"
          />

          {/* Modal Container */}
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 30 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 30 }}
            transition={{ type: "spring", stiffness: 350, damping: 25 }}
            className="fixed inset-0 z-[210] flex items-center justify-center p-4 pointer-events-none"
          >
            <div className="w-full max-w-lg bg-white dark:bg-stone-900 rounded-[24px] overflow-hidden shadow-2xl pointer-events-auto border border-stone-100 dark:border-stone-800 flex flex-col max-h-[90vh]">
              
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-stone-100 dark:border-stone-800">
                <h3 className="text-[17px] font-black text-stone-900 dark:text-stone-100">สร้างโพสต์ใหม่</h3>
                <button 
                  onClick={onClose}
                  disabled={isUploading}
                  className="p-1.5 rounded-full hover:bg-stone-50 dark:hover:bg-stone-800 text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Body */}
              <div className="flex-1 overflow-y-auto p-6 space-y-5">
                
                {/* File Dropzone / Preview */}
                {!previewUrl ? (
                  <div 
                    onClick={() => fileInputRef.current?.click()}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={handleDrop}
                    className="border-2 border-dashed border-stone-200 dark:border-stone-800 rounded-2xl p-8 flex flex-col items-center justify-center gap-3 cursor-pointer hover:border-orange-400 dark:hover:border-orange-500/50 hover:bg-orange-50/20 transition-all group min-h-[220px]"
                  >
                    <input 
                      type="file" 
                      ref={fileInputRef} 
                      onChange={handleFileChange}
                      accept="image/*,video/*"
                      className="hidden" 
                    />
                    <div className="w-12 h-12 rounded-full bg-stone-50 dark:bg-stone-850 flex items-center justify-center text-stone-400 group-hover:text-orange-500 group-hover:bg-orange-50 transition-colors">
                      <Image size={22} strokeWidth={2} />
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-bold text-stone-700 dark:text-stone-300">ลากและวางรูปภาพหรือวิดีโอที่นี่</p>
                      <p className="text-xs text-stone-450 mt-1 font-medium">หรือคลิกเพื่อเลือกไฟล์จากอุปกรณ์ของคุณ</p>
                    </div>
                  </div>
                ) : (
                  <div className="relative rounded-2xl overflow-hidden border border-stone-150 dark:border-stone-800 aspect-video bg-stone-50 dark:bg-stone-950 flex items-center justify-center group">
                    {fileType === 'video' ? (
                      <video src={previewUrl} className="w-full h-full object-contain" controls />
                    ) : (
                      <img src={previewUrl} className="w-full h-full object-cover" alt="Preview" />
                    )}
                    
                    {!isUploading && (
                      <button 
                        onClick={() => { setFile(null); setPreviewUrl(null); setFileType(null); }}
                        className="absolute top-3 right-3 p-1.5 bg-black/60 hover:bg-black/80 rounded-full text-white transition-colors"
                      >
                        <X size={16} />
                      </button>
                    )}
                  </div>
                )}

                {/* Caption Field */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-stone-400 dark:text-stone-500 uppercase tracking-wider">คำบรรยาย</label>
                  <textarea 
                    value={caption}
                    onChange={(e) => setCaption(e.target.value)}
                    placeholder="เขียนอะไรบางอย่างเกี่ยวกับสถานที่ท่องเที่ยวนี้..."
                    rows={3}
                    disabled={isUploading}
                    className="w-full px-4 py-3 rounded-xl border border-stone-200 dark:border-stone-800 bg-transparent text-sm text-stone-900 dark:text-stone-100 placeholder-stone-400 focus:border-orange-500 focus:ring-0 focus:outline-none transition-colors"
                  />
                </div>

                {/* Location Field */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-stone-400 dark:text-stone-500 uppercase tracking-wider">สถานที่</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-stone-400">
                      <MapPin size={16} />
                    </div>
                    <input 
                      type="text"
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      placeholder="เช่น อ.เมืองเชียงใหม่, ดอยสุเทพ"
                      disabled={isUploading}
                      className="w-full pl-10 pr-4 py-3 rounded-xl border border-stone-200 dark:border-stone-800 bg-transparent text-sm text-stone-900 dark:text-stone-100 placeholder-stone-400 focus:border-orange-500 focus:ring-0 focus:outline-none transition-colors"
                    />
                  </div>
                </div>

              </div>

              {/* Footer */}
              <div className="px-6 py-4 border-t border-stone-100 dark:border-stone-800 bg-stone-50/50 dark:bg-stone-900 flex justify-end gap-3">
                <button
                  onClick={onClose}
                  disabled={isUploading}
                  className="px-5 py-2.5 rounded-xl border border-stone-250 dark:border-stone-800 text-stone-600 dark:text-stone-300 font-bold text-sm hover:bg-stone-50 dark:hover:bg-stone-850 transition-colors disabled:opacity-50"
                >
                  ยกเลิก
                </button>
                <button
                  onClick={handlePost}
                  disabled={!file || isUploading}
                  className="px-6 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 disabled:bg-stone-200 dark:disabled:bg-stone-800 disabled:text-stone-400 text-white font-bold text-sm flex items-center gap-2 transition-all shadow-lg shadow-orange-500/20 active:scale-95 disabled:active:scale-100 disabled:shadow-none"
                >
                  {isUploading ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      กำลังอัปโหลด...
                    </>
                  ) : (
                    <>
                      <Send size={16} />
                      โพสต์
                    </>
                  )}
                </button>
              </div>

            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

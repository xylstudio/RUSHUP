'use client';
import React, { useState } from 'react';
import { QrCode, RefreshCcw, Gift, Award, Star, Ticket, X, Coffee, Square, ShieldCheck, Edit3, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabaseClient';
import { useI18n } from "@/lib/I18nContext";

type RewardMode = 'points' | 'glasses';

export default function PointGenerator({ onClose }: { onClose?: () => void }) {
    const { locale } = useI18n();
  const [mode, setMode] = useState<RewardMode>('points');
  const [amount, setAmount] = useState(10);
  const [customValue, setCustomValue] = useState('');
  const [isCustom, setIsCustom] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // 1 glass = 50 points
  const pointsToGenerate = isCustom 
    ? (mode === 'glasses' ? (Number(customValue) || 0) * 50 : (Number(customValue) || 0))
    : (mode === 'glasses' ? amount * 50 : amount);

  const generateQR = async () => {
    if (isCustom && (!customValue || Number(customValue) <= 0)) {
      alert('กรุณาระบุจำนวนที่ถูกต้อง');
      return;
    }

    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      const res = await fetch('/api/pos/points/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(session?.access_token ? { 'Authorization': `Bearer ${session.access_token}` } : {}),
        },
        body: JSON.stringify({ points: pointsToGenerate }),
      });
      
      const data = await res.json();
      if (data.token) {
        setToken(data.token);
      } else {
        alert(data.error || 'ไม่สามารถสร้างโทเค็นได้');
      }
    } catch (err) {
      console.error('QR Generation Error:', err);
      alert('เกิดข้อผิดพลาดในการเชื่อมต่อเครือข่าย');
    } finally {
      setLoading(false);
    }
  };

  const qrUrl = token 
    ? `https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(`https://liff.line.me/2009322178-2dtfXAvi/points/claim?token=${token}`)}`
    : null;

  const handlePresetClick = (val: number) => {
    setIsCustom(false);
    setAmount(val);
  };

  const handleCustomClick = () => {
    setIsCustom(true);
  };

  const resetGenerator = () => {
    setToken(null);
    setIsCustom(false);
    setAmount(10);
    setCustomValue('');
  };

  return (
    <div className="bg-white border-2 border-gray-900 p-0 rounded-none relative overflow-hidden shadow-[20px_20px_0px_rgba(0,0,0,0.05)] font-sans w-full max-w-[440px] h-[640px] mx-auto flex flex-col">
      {/* Header */}
      <div className="px-10 h-[100px] flex items-center justify-between shrink-0 bg-white border-b border-gray-100">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 border-2 border-gray-900 flex items-center justify-center shrink-0">
             {token ? <QrCode size={20} className="text-gray-900" /> : <Gift size={20} className="text-gray-900" />}
          </div>
          <div>
            <h2 className="text-xl font-black italic tracking-tighter text-gray-900 leading-none">
              {token ? 'คิวอาร์โค้ด' : 'สร้างรางวัล'} <span className="text-gray-400 not-italic ml-1">{locale === 'en' ? 'ของลูกค้า' : locale === 'zh' ? 'ของลูกค้า' : 'ของลูกค้า'}</span>
            </h2>
            <p className="text-[9px] text-gray-300 uppercase font-black tracking-[0.3em] mt-1.5 underline decoration-gray-900/10">Loyalty Management System</p>
          </div>
        </div>
        {onClose && (
          <button 
            onClick={onClose} 
            className="p-2 text-gray-300 hover:text-red-500 transition-all font-bold"
          >
            <X size={20} />
          </button>
        )}
      </div>

      {/* Main Content Area */}
      <div className="flex-1 relative overflow-hidden">
        <AnimatePresence mode="wait">
          {!token ? (
            <motion.div 
              key="setup-view"
              initial={{ x: -440, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -440, opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="absolute inset-0 p-10 flex flex-col justify-between"
            >
              <div className="space-y-12">
                {/* Mode Selector */}
                <div className="flex p-1 bg-gray-50 border border-gray-100 rounded-none shadow-inner">
                  <button
                    onClick={() => { setMode('points'); handlePresetClick(10); }}
                    className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest transition-all ${
                      mode === 'points' ? 'bg-white text-gray-900 shadow-sm border border-gray-100' : 'text-gray-300'
                    }`}
                  >
                    Text</button>
                  <button
                    onClick={() => { setMode('glasses'); handlePresetClick(1); }}
                    className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest transition-all ${
                      mode === 'glasses' ? 'bg-white text-gray-900 shadow-sm border border-gray-100' : 'text-gray-300'
                    }`}
                  >
                    Text</button>
                </div>

                {/* Amount Display */}
                <div className="text-center relative py-4">
                   <div className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-1 bg-gray-900/10"></div>
                   <p className="text-[10px] font-black text-gray-300 uppercase tracking-[0.4em] mb-3 leading-none">{locale === 'en' ? 'ระบุจำนวนที่จะได้รับ' : locale === 'zh' ? 'ระบุจำนวนที่จะได้รับ' : 'ระบุจำนวนที่จะได้รับ'}</p>
                   <p className="text-5xl font-black text-gray-900 italic tracking-tighter tabular-nums leading-none">
                     {pointsToGenerate} <span className="text-lg not-italic text-gray-400 uppercase ml-2">{locale === 'en' ? 'แต้ม' : locale === 'zh' ? 'แต้ม' : 'แต้ม'}</span>
                   </p>
                   <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-1 bg-gray-900/10"></div>
                </div>

                {/* Grid Overlay */}
                <div className="relative h-[120px]">
                   <AnimatePresence mode="wait">
                      {!isCustom ? (
                        <motion.div 
                          key="grid"
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.95 }}
                          className="absolute inset-0 grid grid-cols-5 gap-3"
                        >
                          {(mode === 'points' ? [10, 20, 50, 100] : [1, 2, 3, 4]).map((val) => (
                            <button 
                              key={val} 
                              onClick={() => handlePresetClick(val)}
                              className={`rounded-none text-xl font-black border transition-all flex flex-col items-center justify-center ${
                                amount === val && !isCustom 
                                  ? 'border-gray-900 bg-gray-900 text-white' 
                                  : 'border-gray-100 text-gray-300 hover:border-gray-900 hover:text-gray-900'
                              }`}
                            >
                              <span>{val}</span>
                              <span className="text-[8px] opacity-40 leading-none mt-1 font-bold">{mode === 'points' ? 'แต้ม' : 'แก้ว'}</span>
                            </button>
                          ))}
                          <button 
                            onClick={handleCustomClick}
                            className="border border-gray-100 text-gray-300 flex flex-col items-center justify-center hover:border-gray-900 hover:text-gray-900 transition-all font-black"
                          >
                            <Edit3 size={20} />
                            <span className="text-[8px] opacity-40 mt-1 uppercase font-bold">{locale === 'en' ? 'ระบุเอง' : locale === 'zh' ? 'ระบุเอง' : 'ระบุเอง'}</span>
                          </button>
                        </motion.div>
                      ) : (
                        <motion.div 
                          key="input"
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.95 }}
                          className="absolute inset-0 bg-white border-2 border-gray-900 flex overflow-hidden"
                        >
                          <input 
                            autoFocus
                            type="number"
                            value={customValue}
                            onChange={(e) => setCustomValue(e.target.value)}
                            placeholder={locale === 'en' ? 'ใส่ตัวเลข...' : locale === 'zh' ? 'ใส่ตัวเลข...' : 'ใส่ตัวเลข...'}
                            className="flex-1 h-full px-6 text-2xl font-black bg-white focus:outline-none tabular-nums border-none rounded-none placeholder:text-gray-100 no-spinner"
                          />
                          <button 
                            onClick={() => setIsCustom(false)}
                            className="px-8 h-full text-[11px] font-black uppercase tracking-widest text-white bg-gray-900 hover:bg-black transition-all flex items-center justify-center border-none rounded-none shrink-0"
                          >
                            Text</button>
                        </motion.div>
                      )}
                   </AnimatePresence>
                </div>
              </div>

              {/* Action Button */}
              <button 
                onClick={generateQR}
                disabled={loading}
                className="w-full h-16 bg-white border-2 border-gray-900 text-gray-900 rounded-none font-black uppercase tracking-[0.4em] text-[11px] flex items-center justify-center gap-4 hover:bg-gray-900 hover:text-white transition-all disabled:opacity-50"
              >
                {loading ? <RefreshCcw size={18} className="animate-spin" /> : <QrCode size={18} />}
                {loading ? 'กำลังดำเนินการ...' : 'สร้างคิวอาร์โค้ด'}
              </button>
            </motion.div>
          ) : (
            <motion.div 
              key="result-view"
              initial={{ x: 440, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 440, opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="absolute inset-0 p-10 flex flex-col justify-between items-center"
            >
              <div className="w-full text-center flex-1 flex flex-col items-center justify-center">
                <p className="text-[10px] font-black text-gray-300 uppercase tracking-[0.4em] mb-8">{locale === 'en' ? 'กรุณาสแกนเพื่อรับแต้ม' : locale === 'zh' ? 'กรุณาสแกนเพื่อรับแต้ม' : 'กรุณาสแกนเพื่อรับแต้ม'}</p>
                
                <div className="bg-white p-6 border border-gray-100 shadow-[20px_20px_60px_rgba(0,0,0,0.03)] inline-block mb-10">
                   <img src={qrUrl!} alt="QR" className="w-48 h-48 sm:w-56 sm:h-56 object-contain grayscale brightness-90 contrast-125" />
                </div>

                <div className="text-center space-y-3">
                   <p className="text-[9px] font-black text-gray-300 uppercase tracking-widest leading-none">REF: {token.slice(0, 12)}</p>
                   <p className="text-4xl font-black text-gray-900 italic tracking-tighter tabular-nums leading-none">
                     {pointsToGenerate} <span className="text-base not-italic text-gray-400 uppercase ml-2">{locale === 'en' ? 'แต้ม' : locale === 'zh' ? 'แต้ม' : 'แต้ม'}</span>
                   </p>
                </div>
              </div>

              <div className="w-full grid grid-cols-2 gap-3 shrink-0 pt-6 border-t border-gray-50">
                <button 
                  onClick={resetGenerator}
                  className="h-14 border border-gray-200 text-gray-300 font-black uppercase tracking-widest text-[9px] flex items-center justify-center gap-2 hover:border-gray-900 hover:text-gray-900 transition-all bg-white"
                >
                  <ArrowLeft size={14} /> {locale === 'en' ? 'Redo' : locale === 'zh' ? '重做' : 'ทำใหม่'}</button>
                <button 
                  onClick={onClose}
                  className="h-14 bg-gray-900 text-white font-black uppercase tracking-widest text-[9px] hover:bg-black transition-all"
                >
                  Text</button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <style jsx global>{`
          @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;900&display=swap');
          
          /* Force Global Reset for Number Inputs in this component */
          input[type="number"].no-spinner {
            -moz-appearance: textfield !important;
            appearance: textfield !important;
            margin: 0 !important;
            border-radius: 0 !important;
            box-shadow: none !important;
          }
          
          input[type="number"].no-spinner::-webkit-inner-spin-button, 
          input[type="number"].no-spinner::-webkit-outer-spin-button { 
            -webkit-appearance: none !important; 
            margin: 0 !important; 
          }

          body { font-family: 'Outfit', sans-serif; }
      `}</style>
    </div>
  );
}

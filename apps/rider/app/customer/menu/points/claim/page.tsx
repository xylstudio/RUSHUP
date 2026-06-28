'use client';
import React, { useEffect, useState, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Award, CheckCircle, XCircle, Sparkles, Star, Ticket, ArrowRight, Home, CheckCircle2 } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import XYLLoader from '@/components/loaders/XYLLoader'
import { useI18n } from "@/lib/I18nContext";

function ClaimPointsContent() {
    const { locale } = useI18n();
    const searchParams = useSearchParams()
    const router = useRouter()
    const token = searchParams.get('token')
    
    const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
    const [message, setMessage] = useState('กำลังตรวจสอบสิทธิ์ของคุณ...')
    const [pointsAdded, setPointsAdded] = useState(0)
    const [isLiffReady, setIsLiffReady] = useState(false)
    const [lineProfile, setLineProfile] = useState<any>(null)
    const [showPopup, setShowPopup] = useState(false)

    useEffect(() => {
        const initLiff = async () => {
            try {
                const liff = (await import('@line/liff')).default
                await liff.init({ liffId: process.env.NEXT_PUBLIC_LIFF_ID || '2009322178-2dtfXAvi' })
                
                if (!liff.isLoggedIn()) {
                    liff.login()
                    return
                }

                const profile = await liff.getProfile()
                setLineProfile(profile)
                setIsLiffReady(true)
            } catch (err) {
                console.error('LIFF Init Error:', err)
                setStatus('error')
                setMessage('ไม่สามารถเชื่อมต่อกับ LINE ได้ กรุณาลองใหม่อีกครั้ง')
            }
        }

        initLiff()
    }, [])

    useEffect(() => {
        if (isLiffReady && token && lineProfile) {
            handleClaim()
        } else if (isLiffReady && !token) {
            setStatus('error')
            setMessage('ไม่พบเหรียญรางวัลในลิงก์นี้')
        }
    }, [isLiffReady, token, lineProfile])

    const handleClaim = async () => {
        try {
            const res = await fetch('/api/liff/points/claim', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    token,
                    lineUserId: lineProfile.userId,
                    displayName: lineProfile.displayName,
                    avatarUrl: lineProfile.pictureUrl
                })
            })

            const data = await res.json()
            if (data.success) {
                setStatus('success')
                setPointsAdded(data.pointsAdded)
                setMessage(data.message || 'ยินดีด้วย! คุณได้รับแต้มสะสมแล้ว')
                setShowPopup(true)
                
                // 🕒 AUTO-CLOSE LIFF WINDOW after 3 seconds
                setTimeout(() => {
                    handleClose()
                }, 3500)
            } else {
                setStatus('error')
                setMessage(data.error || 'ไม่สามารถรับแต้มได้ในขณะนี้')
            }
        } catch (err) {
            console.error('Claim Error:', err)
            setStatus('error')
            setMessage('เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์')
        }
    }

    const handleClose = async () => {
        try {
            const liff = (await import('@line/liff')).default
            if (liff.isInClient()) {
                liff.closeWindow()
            } else {
                router.push('/liff/member')
            }
        } catch (e) {
            router.push('/liff/member')
        }
    }

    return (
        <div className="min-h-screen bg-[#FDFDFB] flex flex-col items-center justify-center p-6 font-sans overflow-hidden">
            <div className="w-full max-w-md bg-white border border-[#F0F0E8] p-10 sm:p-12 shadow-2xl relative overflow-hidden">
                {/* Decorative Elements */}
                <div className="absolute top-0 right-0 p-8 opacity-[0.03] rotate-12">
                    <Star size={120} fill="black" />
                </div>
                
                <div className="relative z-10 flex flex-col items-center text-center space-y-10">
                    <div className="space-y-4">
                        <h1 className="font-serif-luxury text-4xl font-light tracking-tighter text-[#1A1A18]">
                            XYL <span className="italic">LOYALTY</span>
                        </h1>
                        <div className="h-[1px] w-12 bg-[#1A1A18] mx-auto"></div>
                    </div>

                    {status === 'loading' && (
                        <div className="flex flex-col items-center space-y-6 py-10">
                            <XYLLoader mini />
                            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[#8C8A81]">
                                {message}
                            </p>
                        </div>
                    )}

                    {status === 'success' && !showPopup && (
                        <div className="flex flex-col items-center space-y-8 py-6 animate-in zoom-in duration-500">
                            <CheckCircle2 size={64} className="text-emerald-500" />
                            <p className="text-sm font-black uppercase tracking-widest text-emerald-600">Claim Completed</p>
                        </div>
                    )}

                    {status === 'error' && (
                        <div className="flex flex-col items-center space-y-8 py-6 animate-in fade-in duration-500">
                            <div className="w-20 h-20 bg-red-50 text-red-500 flex items-center justify-center rounded-full shadow-inner">
                                <XCircle size={40} />
                            </div>
                            <div className="space-y-2">
                                <p className="text-lg font-black text-[#1A1A18] uppercase tracking-tighter">Transaction Failed</p>
                                <p className="text-[9px] font-black uppercase tracking-[0.3em] text-red-400">ERROR ENCOUNTERED</p>
                            </div>
                            <p className="text-sm font-bold text-[#1A1A18] opacity-60 leading-relaxed px-4">
                                {message}
                            </p>
                        </div>
                    )}

                    <div className="w-full pt-10 border-t border-[#F0F0E8] space-y-4">
                        <button 
                            onClick={handleClose}
                            className="w-full h-14 bg-[#1A1A18] text-white flex items-center justify-center gap-4 text-[11px] font-black uppercase tracking-[0.4em] hover:bg-black transition-all shadow-xl"
                        >
                            {status === 'success' ? 'เรียบร้อย (ปิดหน้าจอนี้)' : 'กลับหน้าหลัก'} 
                            {status === 'success' ? <CheckCircle size={16} /> : <Home size={16} />}
                        </button>
                        
                        <p className="text-[8px] font-black text-[#8C8A81] uppercase tracking-[0.4em] pt-4">
                            Designed by XYL STUDIO • v1.0.15
                        </p>
                    </div>
                </div>
            </div>

            {/* 🎭 Success Popup Overlay */}
            <AnimatePresence>
                {showPopup && (
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[100] flex items-center justify-center px-6 pointer-events-none"
                    >
                        <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
                        <motion.div 
                            initial={{ scale: 0.8, opacity: 0, y: 40 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.8, opacity: 0, y: 20 }}
                            className="relative bg-white w-full max-w-sm p-12 text-center shadow-[0_30px_100px_rgba(0,0,0,0.3)] border border-gray-100/50 pointer-events-auto"
                        >
                            <div className="flex justify-center mb-10">
                                <div className="relative">
                                    <div className="w-24 h-24 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center shadow-inner">
                                        <CheckCircle2 size={48} />
                                    </div>
                                    <motion.div 
                                        animate={{ scale: [1, 1.5, 1], opacity: [0, 1, 0] }}
                                        transition={{ duration: 1.5, repeat: Infinity }}
                                        className="absolute inset-0 bg-emerald-100 rounded-full"
                                    />
                                </div>
                            </div>

                            <h3 className="text-xl font-black uppercase tracking-tight text-black mb-2">
                                {locale === 'en' ? 'Congratulations, points earned!' : locale === 'zh' ? '恭喜您，积分获得！' : '                                 ยินดีด้วย รับแต้มสำเร็จ!                             '}</h3>
                            <div className="flex items-center justify-center gap-2 mb-8">
                                <span className="text-4xl font-black text-emerald-600 tracking-tighter">+{pointsAdded}</span>
                                <span className="text-[10px] font-black text-emerald-600/50 uppercase tracking-widest mt-2">Points</span>
                            </div>
                            
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-relaxed mb-10">
                                {message}<br/>{locale === 'en' ? 'Closing this window automatically...' : locale === 'zh' ? '自动关闭该窗口...' : 'กำลังปิดหน้าต่างนี้อัตโนมัติ...                             '}</p>

                            <button 
                                onClick={handleClose}
                                className="w-full py-5 bg-black text-white text-[10px] font-black uppercase tracking-[0.4em] hover:bg-gray-900 transition-all shadow-xl"
                            >
                                Confirm & Close
                            </button>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            <style jsx global>{`
                @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;1,300;1,400&family=Outfit:wght@200;300;400;500;900&display=swap');
                .font-serif-luxury { font-family: 'Cormorant Garamond', serif; }
                body { font-family: 'Outfit', sans-serif; background-color: #FDFDFB; margin: 0; padding: 0; }
            `}</style>
        </div>
    )
}

export default function ClaimPointsPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen bg-[#FDFDFB] flex items-center justify-center">
                <XYLLoader mini />
            </div>
        }>
            <ClaimPointsContent />
        </Suspense>
    )
}

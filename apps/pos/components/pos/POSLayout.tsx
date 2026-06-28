'use client';
import React, { useState } from 'react'
import { 
  Menu as MenuIcon, X, ChevronRight, ArrowLeft, Search, 
  MapPin, Bell, Info, ShieldCheck, ShoppingBag, LogOut
} from 'lucide-react'
import Link from 'next/link'
import { supabase } from '@/lib/supabaseClient'
import PointGenerator from './PointGenerator'
import { useI18n } from "@/lib/I18nContext";

interface POSLayoutProps {
    children: React.ReactNode
    title: string
    subtitle?: string
    profile: any
    activeView: string
    allowedNav: any[]
    onSetView: (view: any) => void
    headerExtra?: React.ReactNode
    isDark?: boolean // For Kitchen view
    branchName?: string
    onBranchClick?: () => void
}

export default function POSLayout({ 
    children, title, subtitle, profile, activeView, 
    allowedNav, onSetView, headerExtra, isDark, branchName, onBranchClick 
}: POSLayoutProps) {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false)
    const { locale } = useI18n();

    // Determine the dashboard path based on role
    const getDashboardPath = () => {
        if (profile?.role === 'admin') return '/dashboard/admin'
        if (profile?.role === 'staff') return '/dashboard/staff'
        return '/dashboard'
    }

    const renderSidebarContent = () => (
        <>
            {/* Sidebar Header */}
            <header className={`p-6 sm:p-10 border-b space-y-4 sm:space-y-8 font-bold flex-shrink-0 ${isDark ? 'border-white/5' : 'border-[#E5E5DF]'}`}>
                <div className="flex justify-between items-start font-bold">
                    <div className="space-y-1 font-bold">
                        <h1 className={`font-serif-luxury text-4xl sm:text-5xl font-light tracking-tighter leading-none border-none font-bold ${isDark ? 'text-white' : 'text-[#1A1A18]'}`}>
                            XYL <span className="italic">STUDIO</span>
                        </h1>
                        <p className="text-[10px] sm:text-[11px] uppercase tracking-[0.3em] text-[#8C8A81] ml-0.5 font-bold">POS SYSTEM</p>
                    </div>
                    <button onClick={() => setIsSidebarOpen(false)} className={`p-2 hover:opacity-50 font-bold lg:hidden ${isDark ? 'text-white' : 'text-black'}`}><X size={20} /></button>
                </div>
                
                {/* Staff Profile Quick View */}
                <div className={`flex items-center gap-3 sm:gap-4 p-3 sm:p-4 border font-bold ${isDark ? 'bg-white/5 border-white/10' : 'bg-white border-[#E5E5DF]'}`}>
                    <div className="w-10 h-10 sm:w-12 sm:h-12 bg-[#1A1A18] text-white flex items-center justify-center font-black text-sm sm:text-base font-bold flex-shrink-0">
                        {profile?.full_name?.slice(0,1) || 'A'}
                    </div>
                    <div className="flex flex-col font-bold overflow-hidden">
                        <span className={`text-[11px] sm:text-[13px] font-black uppercase tracking-tight truncate ${isDark ? 'text-white' : 'text-black'}`}>{profile?.full_name}</span>
                        <span className="text-[9px] sm:text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-none mt-0.5">{locale === 'en' ? 'สาขา: ' : locale === 'zh' ? 'สาขา: ' : 'สาขา: '}{branchName || profile?.branch_code || 'MAIN'}</span>
                    </div>
                </div>
            </header>

            {/* Navigation Items */}
            <nav className="flex-1 overflow-y-auto px-6 py-10 space-y-6 no-scrollbar font-bold custom-scrollbar">
                {/* Operations Group */}
                {allowedNav.filter(item => item.group === 'operations').length > 0 && (
                    <div className="space-y-2">
                        <div className={`text-[11px] uppercase tracking-[0.2em] px-4 mb-4 ${isDark ? 'text-white/40' : 'text-gray-400'}`}>
                            {locale === 'en' ? '                             --- ใช้งานประจำวัน ---                         ' : locale === 'zh' ? '                             --- ใช้งานประจำวัน ---                         ' : '                             --- ใช้งานประจำวัน ---                         '}</div>
                        {allowedNav.filter(item => item.group === 'operations').map((item, idx) => {
                            const isActive = activeView === item.id;
                            const itemNumber = String(idx + 1).padStart(2, '0');
                            return (
                                <button 
                                    key={item.id}
                                    onClick={() => { onSetView(item.id); setIsSidebarOpen(false); }}
                                    className={`w-full group flex items-center gap-4 py-4 px-4 text-left transition-all duration-300 font-bold ${isActive ? 'translate-x-2' : ''}`}
                                >
                                    <div className="w-4 flex items-center justify-center font-bold">
                                        <span className={`h-[1px] transition-all duration-500 ${isActive ? 'w-4 opacity-100 bg-current' : 'w-0 opacity-0 group-hover:w-2 group-hover:opacity-30 bg-current'}`}></span>
                                    </div>
                                    <span className={`text-[12px] font-mono transition-colors duration-300 font-bold ${isActive ? (isDark ? 'text-white' : 'text-[#1A1A18]') : 'text-gray-400 group-hover:text-gray-400'}`}>
                                        {itemNumber}.
                                    </span>
                                    <span className={`text-[13px] uppercase tracking-widest transition-colors duration-300 font-black truncate ${isActive ? (isDark ? 'text-white' : 'text-[#1A1A18]') : 'text-gray-400 group-hover:text-gray-400'}`}>
                                        {item.label}
                                    </span>
                                    {isActive && <ChevronRight size={14} className={`ml-auto flex-shrink-0 ${isDark ? 'text-white' : 'text-[#1A1A18]'}`} />}
                                </button>
                            );
                        })}
                    </div>
                )}

                {/* Management Group */}
                {allowedNav.filter(item => item.group === 'management').length > 0 && (
                    <div className={`space-y-2 pt-6 border-t ${isDark ? 'border-white/5' : 'border-[#E5E5DF]'}`}>
                        <div className={`text-[11px] uppercase tracking-[0.2em] px-4 mb-4 ${isDark ? 'text-white/40' : 'text-gray-400'}`}>
                            {locale === 'en' ? '                             --- จัดการหลังบ้าน ---                         ' : locale === 'zh' ? '                             --- จัดการหลังบ้าน ---                         ' : '                             --- จัดการหลังบ้าน ---                         '}</div>
                        {allowedNav.filter(item => item.group === 'management').map((item, idx) => {
                            const isActive = activeView === item.id;
                            const opsCount = allowedNav.filter(i => i.group === 'operations').length;
                            const itemNumber = String(opsCount + idx + 1).padStart(2, '0');
                            return (
                                <button 
                                    key={item.id}
                                    onClick={() => { onSetView(item.id); setIsSidebarOpen(false); }}
                                    className={`w-full group flex items-center gap-4 py-4 px-4 text-left transition-all duration-300 font-bold ${isActive ? 'translate-x-2' : ''}`}
                                >
                                    <div className="w-4 flex items-center justify-center font-bold">
                                        <span className={`h-[1px] transition-all duration-500 ${isActive ? 'w-4 opacity-100 bg-current' : 'w-0 opacity-0 group-hover:w-2 group-hover:opacity-30 bg-current'}`}></span>
                                    </div>
                                    <span className={`text-[12px] font-mono transition-colors duration-300 font-bold ${isActive ? (isDark ? 'text-white' : 'text-[#1A1A18]') : 'text-gray-400 group-hover:text-gray-400'}`}>
                                        {itemNumber}.
                                    </span>
                                    <span className={`text-[13px] uppercase tracking-widest transition-colors duration-300 font-black truncate ${isActive ? (isDark ? 'text-white' : 'text-[#1A1A18]') : 'text-gray-400 group-hover:text-gray-400'}`}>
                                        {item.label}
                                    </span>
                                    {isActive && <ChevronRight size={14} className={`ml-auto flex-shrink-0 ${isDark ? 'text-white' : 'text-[#1A1A18]'}`} />}
                                </button>
                            );
                        })}
                    </div>
                )}
            </nav>

            {/* Sidebar Footer */}
            <footer className={`p-8 border-t font-bold flex-shrink-0 ${isDark ? 'border-white/5' : 'border-[#E5E5DF]'}`}>
                {!profile?.is_pos_account ? (
                    <Link 
                        href={getDashboardPath()}
                        className={`w-full h-16 rounded-none text-[12px] font-black uppercase tracking-[0.3em] flex items-center justify-center gap-4 transition-all font-bold ${isDark ? 'bg-white text-black hover:bg-gray-100' : 'bg-[#1A1A18] text-white hover:bg-black shadow-xl'}`}
                    >
                        <ArrowLeft size={16} /> {locale === 'en' ? ' กลับสู่ Dashboard                 ' : locale === 'zh' ? ' กลับสู่ Dashboard                 ' : ' กลับสู่ Dashboard                 '}
                    </Link>
                ) : (
                    <button 
                        onClick={async () => {
                            await supabase.auth.signOut()
                            window.location.href = '/login'
                        }}
                        className={`w-full h-16 rounded-none text-[12px] font-black uppercase tracking-[0.3em] flex items-center justify-center gap-4 transition-all font-bold ${isDark ? 'bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white' : 'bg-red-50 text-red-600 hover:bg-red-600 hover:text-white shadow-xl'}`}
                    >
                        <LogOut size={16} /> LOGOUT
                    </button>
                )}
                <div className="mt-8 text-center opacity-10 pointer-events-none font-bold">
                    <p className={`text-[8px] font-black uppercase tracking-[0.4em] ${isDark ? 'text-white' : 'text-[#1A1A18]'}`}>
                        Designed by XYL STUDIO • v1.0.35
                    </p>
                </div>
            </footer>
        </>
    );

    return (
        <div className={`xyl-pos-scale h-screen h-[100dvh] flex overflow-hidden font-sans ${isDark ? 'bg-[#1A1A18] text-white' : 'bg-[#FDFDFB] text-[#1A1A18]'} selection:bg-sage-600/10 font-bold`}>
            
            {/* PERSISTENT SIDEBAR FOR LG SCREENS */}
            <aside className={`hidden xl:flex w-[280px] 2xl:w-[320px] h-full flex-col flex-shrink-0 font-bold border-r ${isDark ? 'bg-[#1A1A18] border-white/5' : 'bg-[#F5F4F0] border-[#E5E5DF]'}`}>
                {renderSidebarContent()}
            </aside>

            {/* OFF-CANVAS SIDEBAR FOR MOBILE/TABLET PORTRAIT */}
            {isSidebarOpen && (
                <div className="fixed inset-0 z-[1000] xl:hidden flex animate-in fade-in duration-300 font-bold">
                    <div 
                        className={`absolute inset-0 backdrop-blur-md transition-all ${isDark ? 'bg-black/80' : 'bg-[#3a3a38]/40'}`} 
                        onClick={() => setIsSidebarOpen(false)}
                    ></div>
                    <aside className={`relative w-[320px] max-w-[85vw] h-full shadow-2xl animate-in slide-in-from-left duration-700 flex flex-col font-bold ${isDark ? 'bg-[#1A1A18] border-r border-white/5' : 'bg-[#F5F4F0]'}`}>
                        {renderSidebarContent()}
                    </aside>
                </div>
            )}

            {/* MAIN CONTENT WRAPPER */}
            <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
                {/* 2. MAIN HEADER (Sticky) */}
                <header className={`h-[60px] sm:h-[70px] border-b flex items-center justify-between px-3 sm:px-6 xl:px-10 sticky top-0 z-[50] flex-shrink-0 font-bold ${isDark ? 'bg-[#1A1A18] border-white/5' : 'bg-white border-[#F0F0E8]'}`}>
                    <div className="flex items-center gap-3 sm:gap-6 xl:gap-10 flex-1 font-bold min-w-[140px] sm:min-w-0 flex-shrink-0 z-10">
                        <button 
                            onClick={() => setIsSidebarOpen(true)}
                            className={`xl:hidden w-9 h-9 sm:w-11 sm:h-11 flex items-center justify-center transition-all border font-bold flex-shrink-0 ${isDark ? 'bg-white/5 text-white border-white/10 hover:bg-white hover:text-black' : 'bg-white text-[#1A1A18] border-[#F0F0E8] hover:bg-[#1A1A18] hover:text-white shadow-sm active:scale-95'}`}
                        >
                            <MenuIcon size={18} />
                        </button>

                    <div className="flex items-center gap-3 sm:gap-4 min-w-0 overflow-hidden">
                        <div className="flex flex-col font-bold min-w-0 overflow-hidden">
                            <span className={`text-[9px] sm:text-[10px] font-black tracking-widest uppercase leading-none mb-0.5 sm:mb-1 font-bold truncate ${isDark ? 'text-white/40' : 'text-[#818C83]'}`}>
                                {subtitle || 'XYL POS'}
                            </span>
                            <h1 className={`text-[13px] sm:text-[18px] font-black tracking-tighter uppercase leading-none font-bold border-none truncate ${isDark ? 'text-white' : 'text-black'}`}>
                                {title}
                            </h1>
                        </div>

                    </div>
                </div>

                {/* HEADER SLOT FOR VIEW-SPECIFIC ACTIONS */}
                <div className="flex items-center gap-4 sm:gap-6 font-bold">
                    {headerExtra}
                </div>
            </header>

            {/* 3. MAIN CONTENT CONTAINER */}
            <main className={`flex-1 relative flex flex-col font-bold custom-scrollbar min-h-0 ${activeView === 'delivery' ? 'overflow-visible' : (activeView === 'terminal' || activeView === 'kitchen') ? 'overflow-hidden' : 'overflow-y-auto'}`}>
                {children}
            </main>
            </div>

            <style jsx global>{`
                .no-scrollbar::-webkit-scrollbar { display: none; }
                .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
                
                .custom-scrollbar::-webkit-scrollbar { width: 6px; height: 6px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.05); border-radius: 0; }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(0,0,0,0.1); }

                html, body {
                    overscroll-behavior-y: none;
                    scroll-behavior: smooth;
                    height: 100%;
                    overflow: hidden;
                }

                .xyl-pos-scale .text-xs { font-size: 0.875rem !important; line-height: 1.3rem !important; }
                .xyl-pos-scale .text-sm { font-size: 1rem !important; line-height: 1.45rem !important; }
                .xyl-pos-scale .text-base { font-size: 1.05rem !important; line-height: 1.55rem !important; }
                .xyl-pos-scale .text-\[7px\] { font-size: 0.55rem !important; }
                .xyl-pos-scale .text-\[8px\] { font-size: 0.65rem !important; }
                .xyl-pos-scale .text-\[9px\] { font-size: 0.72rem !important; }
                .xyl-pos-scale .text-\[10px\] { font-size: 0.8rem !important; }
                .xyl-pos-scale .text-\[11px\] { font-size: 0.88rem !important; }
                .xyl-pos-scale .text-\[12px\] { font-size: 0.95rem !important; }
                .xyl-pos-scale .text-\[13px\] { font-size: 1rem !important; }
                .xyl-pos-scale .text-\[14px\] { font-size: 1.06rem !important; }
                .xyl-pos-scale .text-\[15px\] { font-size: 1.12rem !important; }
            `}</style>
        </div>
    )
}

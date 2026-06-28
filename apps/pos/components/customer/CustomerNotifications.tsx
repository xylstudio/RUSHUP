'use client'

import React from 'react'
import { motion } from 'framer-motion'
import { Bell } from 'lucide-react'

interface CustomerNotificationsProps {
  notifications: any[]
  copy: any
}

const CustomerNotifications: React.FC<CustomerNotificationsProps> = ({ notifications, copy }) => {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.08 }
    }
  }

  const itemVariants = {
    hidden: { opacity: 0, y: 15, scale: 0.98 },
    visible: { 
      opacity: 1, 
      y: 0, 
      scale: 1,
      transition: { type: 'spring', stiffness: 300, damping: 30 }
    }
  }

  return (
    <div className="screen-view h-full overflow-y-auto no-scrollbar">
      <header className="px-6 pt-12 pb-10">
        <span className="sans-font text-[9px] font-bold uppercase tracking-[0.4em] text-[#A3A3A3] mb-4 block">{copy.updatesTitle}</span>
        <h1 className="font-serif-thai text-5xl font-light text-[#111111] leading-none uppercase tracking-tighter">{copy.notificationsTitle}.</h1>
      </header>

      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="px-6 pb-40 space-y-4"
      >
        {notifications.length === 0 ? (
          <div className="py-24 text-center rounded-[40px] bg-white border border-black/[0.03]">
             <Bell size={48} strokeWidth={1} className="mx-auto mb-6 text-[#111111]/10" />
             <p className="font-serif-thai text-xl lowercase text-[#A3A3A3]">{copy.noNotifications}</p>
          </div>
        ) : (
          notifications.map((n, idx) => (
            <motion.div 
              key={n.id || idx}
              variants={itemVariants}
              className="bg-white p-8 rounded-[32px] border border-black/[0.03] transition-all hover:shadow-lg active:scale-[0.98]"
            >
              <div className="flex items-center justify-between mb-6">
                <span className="sans-font text-[8px] font-black uppercase tracking-[0.3em] text-[#E4BBAE]">Update {String(notifications.length - idx).padStart(2, '0')}</span>
                <span className="sans-font text-[8px] font-bold text-[#A3A3A3] uppercase tracking-widest">{new Date(n.created_at || Date.now()).toLocaleDateString()}</span>
              </div>
              <h2 className="font-serif-thai text-2xl text-[#111111] uppercase tracking-tight leading-tight mb-4">{n.title}</h2>
              <p className="sans-font text-[12px] leading-relaxed text-[#666666] opacity-80">{n.message}</p>
            </motion.div>
          ))
        )}
      </motion.div>
    </div>
  )
}

export default CustomerNotifications

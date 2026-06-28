'use client'

import React from 'react'
import { motion } from 'framer-motion'
import { FileText, Download, ArrowRight, FileSearch } from 'lucide-react'

interface CustomerDocumentsProps {
  documents: any[]
  copy: any
}

const CustomerDocuments: React.FC<CustomerDocumentsProps> = ({ documents, copy }) => {
  const itemVariants = {
    hidden: { opacity: 0, y: 15 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: { type: 'spring', stiffness: 300, damping: 30 }
    }
  }

  return (
    <div className="screen-view h-full overflow-y-auto no-scrollbar">
      <header className="px-6 pt-12 pb-10">
        <span className="font-sans text-[9px] font-bold uppercase tracking-[0.4em] text-[#A3A3A3] mb-4 block">{copy.identity}</span>
        <h1 className="font-sans text-5xl font-semibold text-[#111111] leading-none tracking-tight">{copy.documentsTitle}.</h1>
      </header>

      <div className="px-6 pb-40 space-y-4">
        {documents.length === 0 ? (
          <div className="py-24 text-center rounded-[32px] bg-white shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
             <FileSearch size={48} strokeWidth={1.5} className="mx-auto mb-6 text-[#111111]/20" />
             <p className="font-sans text-xl font-medium text-[#A3A3A3]">{copy.noDocuments}</p>
          </div>
        ) : (
          documents.map((doc, idx) => (
            <motion.div 
              key={doc.id || idx}
              initial="hidden"
              animate="visible"
              transition={{ delay: idx * 0.05 }}
              variants={itemVariants}
              className="bg-white p-8 rounded-[32px] border border-white flex items-center justify-between group active:scale-[0.98] transition-all shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)]"
            >
              <div className="flex items-center gap-6">
                <div className="w-14 h-14 rounded-2xl bg-[#FAF9F6] flex items-center justify-center text-[#111111]/30 group-hover:text-[#111111] transition-colors">
                  <FileText size={24} strokeWidth={1.5} />
                </div>
                <div>
                  <h4 className="font-sans text-xl font-semibold tracking-tight text-[#111111]">{doc.title}</h4>
                  <p className="font-sans text-[9px] text-[#A3A3A3] uppercase tracking-[0.2em] font-bold mt-1">{doc.category || 'Archive'}</p>
                </div>
              </div>
              <button className="w-10 h-10 rounded-full border border-black/[0.05] flex items-center justify-center group-hover:bg-black group-hover:text-white transition-all">
                <Download size={16} />
              </button>
            </motion.div>
          ))
        )}
      </div>
    </div>
  )
}

export default CustomerDocuments

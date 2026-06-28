import fs from 'fs'

const targetPath = '/Users/chenchirawongpothisan/Desktop/xylproject-pr-copilot-swe-agent-3/xylem-landscape/app/dashboard/customer/orders/[orderId]/page.tsx'

let content = fs.readFileSync(targetPath, 'utf-8')

const replacement = `
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#FDFBF9] via-[#F4F1EA] to-[#EBE9E0] text-[#1B2A22] overflow-x-hidden selection:bg-[#214031] selection:text-white">
      
      {/* Premium Header */}
      <header className="px-6 pt-12 pb-6 flex items-center justify-between sticky top-0 bg-[#FDFBF9]/80 backdrop-blur-2xl z-[100] border-b border-[#1B2A22]/5">
        <Link href="/dashboard/customer" className="w-12 h-12 flex items-center justify-center rounded-full bg-white shadow-sm border border-[#1B2A22]/10 hover:scale-105 active:scale-95 transition-all text-[#1B2A22]">
            <ArrowLeft size={18} strokeWidth={1.5} />
        </Link>
        <div className="text-center">
          <span className="sans-font text-[9px] font-black uppercase tracking-[0.4em] text-[#1B2A22]/40 mb-1 block">{copy.logKicker}</span>
          <span className="sans-font text-[11px] font-bold text-[#1B2A22]">#{order.order_code || order.id.slice(0,8)}</span>
        </div>
        <button onClick={() => window.location.reload()} className="w-12 h-12 flex items-center justify-center rounded-full bg-white shadow-sm border border-[#1B2A22]/10 hover:scale-105 hover:rotate-180 active:scale-95 transition-all text-[#1B2A22]">
            <Activity size={18} strokeWidth={1.5} />
        </button>
      </header>

      <main className="max-w-[600px] mx-auto pb-40 px-6 pt-12">
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="text-center mb-16"
        >
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-[#1B2A22]/5 mb-6">
            <Leaf className="text-[#214031]" size={24} strokeWidth={1} />
          </div>
          <h1 className="font-serif-thai text-5xl md:text-7xl font-light text-[#1B2A22] leading-tight mb-4">
            {copy.trackingTitle}
          </h1>
          <p className="sans-font text-[10px] font-bold uppercase tracking-[0.3em] text-[#1B2A22]/40 mb-12">{copy.summary}</p>
        </motion.div>

        <div className="space-y-6">
          {/* Main Info Grid */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.1 }}
            className="grid grid-cols-2 gap-4"
          >
            <div className="bg-white/60 backdrop-blur-xl border border-white/40 shadow-sm p-6 rounded-[2rem]">
              <span className="sans-font text-[9px] font-black uppercase tracking-widest text-[#1B2A22]/40 mb-3 block flex items-center gap-2">
                <Activity size={12} /> {copy.orderCode}
              </span>
              <p className="font-serif-thai text-xl tracking-tight text-[#1B2A22]">#{order.order_code || 'N/A'}</p>
            </div>
            <div className="bg-white/60 backdrop-blur-xl border border-white/40 shadow-sm p-6 rounded-[2rem]">
              <span className="sans-font text-[9px] font-black uppercase tracking-widest text-[#1B2A22]/40 mb-3 block flex items-center gap-2">
                <Calendar size={12} /> {copy.date}
              </span>
              <p className="font-serif-thai text-xl tracking-tight text-[#1B2A22]">
                {order.created_at ? new Date(order.created_at).toLocaleDateString(locale === 'th' ? 'th-TH' : 'en-US') : 'N/A'}
              </p>
            </div>
          </motion.div>

          {/* Status Card (Premium Dark) */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="relative overflow-hidden bg-gradient-to-br from-[#1A3626] to-[#0D1C13] rounded-[2rem] shadow-2xl p-8 md:p-10 text-white"
          >
            {/* Decorative background blur */}
            <div className="absolute top-0 right-0 -mr-20 -mt-20 w-64 h-64 bg-[#2C5E43] rounded-full blur-[80px] opacity-40 pointer-events-none"></div>
            
            <span className="relative z-10 sans-font text-[9px] font-black uppercase tracking-widest text-white/50 mb-6 block flex items-center gap-2">
              <Sparkles size={12} /> {copy.status}
            </span>
            
            <div className="relative z-10">
              <span className={\`inline-block px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest mb-6 border \${
                order.status === 'completed' ? 'border-[#10B981]/30 bg-[#10B981]/10 text-[#34D399]' :
                order.status === 'in_progress' ? 'border-[#F59E0B]/30 bg-[#F59E0B]/10 text-[#FCD34D]' :
                order.status === 'confirmed' ? 'border-[#3B82F6]/30 bg-[#3B82F6]/10 text-[#93C5FD]' :
                'border-white/10 bg-white/5 text-white/70'
              }\`}>
                {order.status || 'unknown'}
              </span>
              <h2 className="font-serif-thai text-4xl font-light tracking-tight leading-snug">
                 {serviceFlow.title}
              </h2>
              <p className="mt-4 text-[13px] leading-relaxed text-white/70 max-w-sm">
                {serviceFlow.description}
              </p>
            </div>

            {order.staff && (
              <div className="relative z-10 mt-8 pt-8 border-t border-white/10">
                <p className="sans-font text-[9px] font-black uppercase tracking-widest text-white/40 mb-3">{serviceFlow.stage === 'scheduled' ? copy.staffAssigned : 'ผู้รับผิดชอบ'}</p>
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-white/10 border border-white/20 flex items-center justify-center text-white/50">
                    <CheckCircle size={16} />
                  </div>
                  <p className="font-serif-thai text-xl tracking-tight text-white/90 uppercase">{order.staff?.display_name || order.staff?.email || 'STAFF'}</p>
                </div>
              </div>
            )}

            <div className="relative z-10 mt-8 flex gap-2 w-full">
               {['verified', 'scheduled', 'in_progress', 'completed'].map((s) => {
                 const stages = ['verified', 'scheduled', 'in_progress', 'completed']
                 const currentIdx = stages.indexOf(serviceFlow.stage || 'verified')
                 const thisIdx = stages.indexOf(s)
                 const isPast = thisIdx <= currentIdx
                 return (
                    <div key={s} className="flex-1">
                      <div className={\`h-1 w-full rounded-full transition-all duration-1000 \${isPast ? 'bg-[#34D399] shadow-[0_0_10px_rgba(52,211,153,0.5)]' : 'bg-white/10'}\`}></div>
                      <p className={\`mt-3 text-[8px] font-black uppercase tracking-widest \${isPast ? 'text-[#34D399]' : 'text-white/30'}\`}>
                        {s === 'verified' ? 'ยืนยันคำขอ' : s === 'scheduled' ? 'จัดทีม' : s === 'in_progress' ? 'เข้าดูแล' : 'รายงานผล'}
                      </p>
                    </div>
                 )
               })}
            </div>
          </motion.div>

          {latestPayment && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.3 }}
              className={\`rounded-[2rem] p-8 border \${paymentStatusTone.replace('bg-', 'bg-').replace('border-', 'border-').replace('text-', 'text-')} bg-white/50 backdrop-blur-md\`}
            >
              <div className="flex justify-between items-center">
                <div>
                  <p className="sans-font text-[9px] font-black uppercase tracking-widest opacity-60 mb-2">Payment Status</p>
                  <p className="font-serif-thai text-2xl tracking-tight capitalize">{latestPayment.status}</p>
                </div>
                <div className="text-right">
                  <p className="font-serif-thai text-2xl tracking-tight">฿{(latestPayment.amount || 0).toLocaleString()}</p>
                  {latestPayment.paid_at && (
                    <p className="mt-2 text-[9px] font-bold uppercase tracking-widest opacity-60">
                      Paid {new Date(latestPayment.paid_at).toLocaleDateString(locale === 'th' ? 'th-TH' : 'en-US')}
                    </p>
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {currentOrderPlanItems.length > 0 && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.4 }}
              className="bg-white/60 backdrop-blur-xl border border-white/40 shadow-sm rounded-[2rem] p-8"
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                  <span className="sans-font text-[9px] font-black uppercase tracking-widest text-[#1B2A22]/40 mb-3 block flex items-center gap-2">
                    <CloudSun size={12} /> {copy.annualPlan}
                  </span>
                  <h2 className="font-serif-thai text-4xl font-light tracking-tight text-[#1B2A22]">
                    {reportSummary.completedPlannedReports}/{reportSummary.plannedReports}
                  </h2>
                </div>
                <div className="grid grid-cols-2 gap-3 w-full md:w-auto">
                  <div className="bg-[#F4F1EA] rounded-2xl px-6 py-5 border border-[#EBE9E0]">
                    <p className="sans-font text-[8px] font-black uppercase tracking-[0.18em] text-[#1B2A22]/50">{copy.visitProgress}</p>
                    <p className="mt-2 text-2xl font-semibold text-[#214031]">{reportSummary.completedPlannedReports}</p>
                  </div>
                  <div className="bg-[#FDFBF9] rounded-2xl px-6 py-5 border border-[#EBE9E0]">
                    <p className="sans-font text-[8px] font-black uppercase tracking-[0.18em] text-[#1B2A22]/50">{copy.visitRemaining}</p>
                    <p className="mt-2 text-2xl font-semibold text-[#A45A2A]">{reportSummary.pendingPlannedReports}</p>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.5 }}
            className="bg-white/60 backdrop-blur-xl border border-white/40 shadow-sm rounded-[2rem] p-8"
          >
            <div className="flex flex-col md:flex-row items-start justify-between gap-8">
              <div className="flex-1">
                <span className="sans-font text-[9px] font-black uppercase tracking-widest text-[#1B2A22]/40 mb-3 block flex items-center gap-2">
                  <Star size={12} /> {copy.feedbackSection}
                </span>
                <h2 className="font-serif-thai text-3xl font-light tracking-tight text-[#1B2A22] mb-3">
                  {activeReportRatingFeedback ? copy.visitRated : copy.reportFeedbackTitle}
                </h2>
                <p className="text-[13px] leading-relaxed text-[#1B2A22]/60 max-w-sm">
                  {activeFeedbackReport ? canOpenFeedback ? copy.feedbackSectionDesc : copy.waitingFeedback : copy.visitNoContext}
                </p>
                {activeFeedbackReport && (
                  <div className="mt-6 bg-[#F4F1EA] rounded-2xl px-5 py-4 border border-[#EBE9E0]">
                    <p className="sans-font text-[8px] font-black uppercase tracking-[0.2em] text-[#1B2A22]/40 mb-1">{copy.activeVisit}</p>
                    <p className="text-[12px] font-semibold text-[#1B2A22]">
                      {activeFeedbackReport.serviceName || activeFeedbackReport.houseName || activeFeedbackReport.orderCode || '-'}
                    </p>
                    {activeFeedbackReport.annualVisitSequence && activeFeedbackReport.annualVisitTotal && (
                      <p className="mt-2 text-[10px] font-bold uppercase tracking-widest text-[#214031]">
                        {copy.annualPlan} {activeFeedbackReport.annualVisitSequence}/{activeFeedbackReport.annualVisitTotal}
                      </p>
                    )}
                  </div>
                )}
              </div>

              {activeReportRatingFeedback && typeof activeReportRatingFeedback.rating === 'number' ? (
                <div className="w-full md:w-[240px] bg-gradient-to-br from-[#1B2A22] to-[#121E18] rounded-2xl p-6 text-white shadow-lg">
                  <p className="sans-font text-[8px] font-black uppercase tracking-widest text-white/50 mb-4">{copy.visitRated}</p>
                  <div className="flex gap-1.5 mb-6">
                    {[1,2,3,4,5].map(v => (
                      <div key={v} className={\`w-8 h-8 rounded-full flex items-center justify-center \${activeReportRatingFeedback.rating >= v ? 'bg-amber-400 text-amber-900' : 'bg-white/10 text-white/30'}\`}>
                        <Star size={14} fill={activeReportRatingFeedback.rating >= v ? 'currentColor' : 'none'} strokeWidth={0} />
                      </div>
                    ))}
                  </div>
                  <div className="border-t border-white/10 pt-4">
                    <p className="sans-font text-[8px] font-black uppercase tracking-widest text-white/40 mb-1">{copy.recordedAt}</p>
                    <p className="text-[11px] font-semibold text-white/90 mb-4">{formatDateTimeByLocale(activeReportRatingFeedback.updatedAt || activeReportRatingFeedback.createdAt, locale)}</p>
                    
                    {activeReportRatingFeedback.commentMessage && (
                      <>
                        <p className="sans-font text-[8px] font-black uppercase tracking-widest text-white/40 mb-1">{copy.ratingCommentTitle}</p>
                        <p className="text-[12px] leading-relaxed text-white/80 italic">"{activeReportRatingFeedback.commentMessage}"</p>
                      </>
                    )}
                  </div>
                </div>
              ) : (
                <div className="grid gap-3 w-full md:w-[220px]">
                  <button
                    type="button"
                    onClick={() => canOpenFeedback && activeFeedbackReport && router.replace(\`/dashboard/customer/orders/\${orderId}?action=rate-report&reportId=\${activeFeedbackReport.id}\`)}
                    disabled={!canOpenFeedback || !activeFeedbackReport}
                    className={\`w-full rounded-2xl px-6 py-4 text-[10px] font-black uppercase tracking-widest transition-all shadow-sm \${canOpenFeedback ? 'bg-[#1B2A22] text-white hover:bg-[#214031] hover:shadow-md' : 'bg-[#EBE9E0] text-[#1B2A22]/30 cursor-not-allowed'}\`}
                  >
                    {copy.rateNow}
                  </button>
                  <button
                    type="button"
                    onClick={() => canOpenFeedback && activeFeedbackReport && router.replace(\`/dashboard/customer/orders/\${orderId}?action=issue-report&reportId=\${activeFeedbackReport.id}\`)}
                    disabled={!canOpenFeedback || !activeFeedbackReport}
                    className={\`w-full rounded-2xl px-6 py-4 text-[10px] font-black uppercase tracking-widest transition-all shadow-sm \${canOpenFeedback ? 'bg-white text-[#1B2A22] border border-[#EBE9E0] hover:bg-[#FDFBF9] hover:border-[#1B2A22]/20' : 'bg-transparent border border-[#EBE9E0] text-[#1B2A22]/30 cursor-not-allowed'}\`}
                  >
                    {copy.reportIssueNow}
                  </button>
                </div>
              )}
            </div>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.6 }}
            className="bg-white/60 backdrop-blur-xl border border-white/40 shadow-sm rounded-[2rem] p-8"
          >
            <span className="sans-font text-[9px] font-black uppercase tracking-widest text-[#1B2A22]/40 mb-6 block flex items-center gap-2">
              <MessageSquare size={12} /> {copy.reportSnapshot}
            </span>
            <div className="flex flex-col md:flex-row items-start justify-between gap-8">
              <div className="flex-1">
                <h3 className="font-serif-thai text-3xl font-light tracking-tight text-[#1B2A22] mb-3">
                  {latestOrderReport?.serviceName || latestOrderReport?.houseName || order?.service?.service_name || copy.emptyReports}
                </h3>
                <p className="text-[13px] leading-relaxed text-[#1B2A22]/70 mb-4 max-w-lg">
                  {latestOrderReport ? getCustomerReportSummaryText(latestOrderReport) || latestOrderReport.recommendations || latestOrderReport.problemsFound || copy.reportSnapshotDesc : copy.emptyReports}
                </p>
                <div className="flex items-center gap-4">
                  <div className="bg-[#F4F1EA] rounded-full px-4 py-1.5 border border-[#EBE9E0]">
                    <p className="text-[10px] font-semibold text-[#1B2A22]/60 uppercase tracking-widest">
                      <Clock size={10} className="inline mr-1" /> {formatCustomerReportDate(latestOrderReport?.updatedAt || latestOrderReport?.createdAt, locale)}
                    </p>
                  </div>
                  {latestOrderReport?.annualVisitSequence && latestOrderReport?.annualVisitTotal && (
                    <div className="bg-[#214031]/10 rounded-full px-4 py-1.5 border border-[#214031]/20">
                      <p className="text-[10px] font-bold text-[#214031] uppercase tracking-widest">
                        {copy.annualPlan} {latestOrderReport.annualVisitSequence}/{latestOrderReport.annualVisitTotal}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex flex-col gap-3 w-full md:w-[240px]">
                <Link
                  href="/dashboard/customer/reports"
                  className="inline-flex items-center justify-between bg-[#1B2A22] text-white rounded-2xl px-6 py-4 text-[10px] font-black uppercase tracking-widest transition-all hover:bg-[#214031] hover:shadow-md"
                >
                  {copy.openReportCenter}
                  <ArrowRight size={14} />
                </Link>
                {latestOrderReport && (
                  <Link
                    href={latestReportCenterHref}
                    className="inline-flex items-center justify-between bg-white text-[#1B2A22] border border-[#EBE9E0] rounded-2xl px-6 py-4 text-[10px] font-black uppercase tracking-widest transition-all hover:bg-[#FDFBF9] hover:border-[#1B2A22]/20"
                  >
                    {copy.openLatestReport}
                    <ArrowRight size={14} />
                  </Link>
                )}
              </div>
            </div>
          </motion.div>
        </div>
      </main>

      <footer className="px-6 py-20 text-center relative z-10">
        <Link 
          href="/dashboard/customer" 
          className="sans-font text-[10px] font-black uppercase tracking-widest text-[#1B2A22]/60 hover:text-[#1B2A22] inline-flex items-center gap-3 transition-all hover:gap-5 px-6 py-3 rounded-full bg-white/50 backdrop-blur-sm border border-[#1B2A22]/5 hover:bg-white"
        >
          {copy.back} <ArrowRight size={14} />
        </Link>
      </footer>

      <AnimatePresence>
        {(actionMode === 'rate' || actionMode === 'issue' || actionMode === 'rate-report' || actionMode === 'issue-report') && (
           <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-[#1B2A22]/40 backdrop-blur-xl"
          >
            <motion.div 
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              className="w-full max-w-[480px] bg-white rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="p-8 md:p-10 flex-1 overflow-y-auto">
                <div className="flex justify-between items-center mb-10">
                  <div className="w-12 h-12 rounded-full bg-[#F4F1EA] flex items-center justify-center text-[#214031]">
                    {actionMode.includes('rate') ? <Star size={20} strokeWidth={1.5} /> : <AlertCircle size={20} strokeWidth={1.5} />}
                  </div>
                  <button onClick={() => router.replace(\`/dashboard/customer/orders/\${orderId}\`)} className="w-10 h-10 rounded-full bg-black/5 hover:bg-black/10 flex items-center justify-center text-[#1B2A22] transition-colors">
                    <X size={18} />
                  </button>
                </div>

                <h2 className="font-serif-thai text-4xl font-light tracking-tight text-[#1B2A22] mb-8">{copy.feedbackTitle}.</h2>

                {notice && (
                  <div className={\`p-6 mb-10 rounded-2xl flex items-start gap-4 \${notice.type === 'success' ? 'bg-[#1B2A22] text-white' : 'bg-red-50 text-red-800 border border-red-200'}\`}>
                    {notice.type === 'success' ? <CheckCircle size={20} className="shrink-0 text-[#34D399]" /> : <AlertCircle size={20} className="shrink-0" />}
                    <span className="sans-font text-[11px] font-bold uppercase tracking-widest leading-relaxed">
                      {notice.message}
                    </span>
                  </div>
                )}

                {(actionMode === 'rate-report' || actionMode === 'rate') && !notice && ((isReportFeedbackMode ? activeReportRatingFeedback : existingRatingFeedback) && typeof (isReportFeedbackMode ? activeReportRatingFeedback?.rating : existingRatingFeedback?.rating) === 'number') && (
                  <div className="space-y-8">
                    <div>
                      <p className="sans-font text-[10px] font-black uppercase tracking-widest text-[#1B2A22]/40 mb-2">{copy.yourRating}</p>
                      <h3 className="font-serif-thai text-3xl font-light tracking-tight text-[#1B2A22]">{isReportFeedbackMode ? copy.visitRated : copy.feedbackAlreadySubmitted}</h3>
                      <p className="mt-4 text-[13px] leading-relaxed text-[#1B2A22]/60">{copy.ratingLockedNote}</p>
                    </div>
                    <div className="flex gap-2">
                      {[1,2,3,4,5].map(v => (
                        <div
                          key={v}
                          className={\`flex-1 aspect-square rounded-2xl flex items-center justify-center transition-all \${((isReportFeedbackMode ? activeReportRatingFeedback?.rating : existingRatingFeedback?.rating) || 0) >= v ? 'bg-amber-400 text-amber-900 shadow-md transform scale-105' : 'bg-[#F4F1EA] text-[#1B2A22]/20'}\`}
                        >
                          <Star size={24} fill={(((isReportFeedbackMode ? activeReportRatingFeedback?.rating : existingRatingFeedback?.rating) || 0) >= v) ? 'currentColor' : 'none'} strokeWidth={0} />
                        </div>
                      ))}
                    </div>
                    <div className="bg-[#FDFBF9] border border-[#EBE9E0] rounded-2xl p-6">
                      <p className="sans-font text-[9px] font-black uppercase tracking-widest text-[#1B2A22]/40 mb-1">{copy.recordedAt}</p>
                      <p className="text-[12px] font-semibold text-[#1B2A22]">{formatDateTimeByLocale((isReportFeedbackMode ? activeReportRatingFeedback?.updatedAt || activeReportRatingFeedback?.createdAt : existingRatingFeedback?.updated_at || existingRatingFeedback?.created_at), locale)}</p>
                      {((isReportFeedbackMode ? activeReportRatingFeedback?.commentMessage : existingRatingFeedback?.comment_message) || '').trim() ? (
                        <div className="mt-4 pt-4 border-t border-[#EBE9E0]">
                          <p className="sans-font text-[9px] font-black uppercase tracking-widest text-[#1B2A22]/40 mb-2">{copy.ratingCommentTitle}</p>
                          <p className="text-[13px] leading-relaxed text-[#1B2A22]/80 italic">"{isReportFeedbackMode ? activeReportRatingFeedback?.commentMessage : existingRatingFeedback?.comment_message}"</p>
                        </div>
                      ) : null}
                    </div>
                  </div>
                )}

                {(actionMode === 'rate' || actionMode === 'rate-report') && !notice && !(isReportFeedbackMode ? activeReportRatingFeedback : existingRatingFeedback) && (
                  <div className="space-y-10">
                    <div>
                      <p className="sans-font text-[10px] font-black uppercase tracking-widest text-[#1B2A22]/40 mb-6">{copy.rateTitle}</p>
                      <div className="flex gap-2">
                        {[1,2,3,4,5].map(v => (
                          <button 
                            key={v}
                            onClick={() => setRating(v)}
                            className={\`flex-1 aspect-square rounded-2xl flex items-center justify-center transition-all \${rating >= v ? 'bg-amber-400 text-amber-900 shadow-md transform scale-105' : 'bg-[#F4F1EA] text-[#1B2A22]/20 hover:bg-[#EBE9E0]'}\`}
                          >
                            <Star size={24} fill={rating >= v ? "currentColor" : "none"} strokeWidth={0} />
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <p className="sans-font text-[10px] font-black uppercase tracking-widest text-[#1B2A22]/40 mb-4">{copy.ratingCommentTitle}</p>
                      <textarea
                        value={ratingComment}
                        onChange={e => setRatingComment(e.target.value)}
                        className="w-full bg-[#FDFBF9] border border-[#EBE9E0] rounded-2xl p-6 min-h-[140px] outline-none focus:border-[#214031] focus:ring-1 focus:ring-[#214031] transition-all text-[14px] leading-relaxed text-[#1B2A22] resize-none"
                        placeholder={copy.ratingCommentPlaceholder}
                      />
                    </div>
                    <button 
                      onClick={() => handleSubmitFeedback('rating')}
                      disabled={isSubmitting}
                      className="w-full bg-[#1B2A22] text-white rounded-2xl py-6 sans-font text-[11px] font-black uppercase tracking-[0.3em] hover:bg-[#214031] transition-colors shadow-lg shadow-[#1B2A22]/20 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isSubmitting ? '...' : copy.send}
                    </button>
                  </div>
                )}

                {(actionMode === 'issue' || actionMode === 'issue-report') && !notice && (
                  <div className="space-y-10">
                    <p className="sans-font text-[10px] font-black uppercase tracking-widest text-[#1B2A22]/40">{copy.issueTitle}</p>
                    <textarea 
                      value={issueMessage}
                      onChange={e => setIssueMessage(e.target.value)}
                      className="w-full bg-[#FDFBF9] border border-[#EBE9E0] rounded-2xl p-6 min-h-[180px] outline-none focus:border-[#214031] focus:ring-1 focus:ring-[#214031] transition-all text-[14px] leading-relaxed text-[#1B2A22] resize-none"
                      placeholder="อธิบายปัญหาที่พบ หรือสิ่งที่ต้องการให้ทีมงานดูแลเพิ่มเติม..."
                    />
                    <button 
                      onClick={() => handleSubmitFeedback('issue')}
                      disabled={isSubmitting}
                      className="w-full bg-[#1B2A22] text-white rounded-2xl py-6 sans-font text-[11px] font-black uppercase tracking-[0.3em] hover:bg-[#214031] transition-colors shadow-lg shadow-[#1B2A22]/20 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isSubmitting ? '...' : copy.send}
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
`

const startIndex = content.indexOf('return (')
const endIndex = content.lastIndexOf('}')
if (startIndex !== -1 && endIndex !== -1) {
  content = content.substring(0, startIndex) + replacement + content.substring(endIndex)
  fs.writeFileSync(targetPath, content)
  console.log("Success")
} else {
  console.log("Failed to find boundaries")
}

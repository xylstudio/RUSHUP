'use client'

import Link from 'next/link'
import { ArrowRight, ChevronRight, ClipboardList, Home, ReceiptText } from 'lucide-react'
import { useI18n } from '@/lib/I18nContext'
import {
  type CustomerReportItem,
  extractCustomerReportTasks,
  formatCustomerReportDate,
  formatCustomerReportDateTime,
  getCustomerReportStatusText,
} from '@/lib/customerReports'

type CustomerReportFeedProps = {
  reports: CustomerReportItem[]
  loading?: boolean
  error?: string | null
  emptyMessage?: string
  maxItems?: number
  getDetailHref?: (report: CustomerReportItem) => string | null
  showHouseContext?: boolean
  showOrderContext?: boolean
  onClick?: (report: CustomerReportItem) => void
  minimal?: boolean
}

export default function CustomerReportFeed({
  reports,
  loading = false,
  error = null,
  emptyMessage = 'ยังไม่มีรายงานจากทีมงาน',
  maxItems,
  getDetailHref,
  showHouseContext = true,
  showOrderContext = true,
  onClick,
  minimal = false
}: CustomerReportFeedProps) {
  const { locale, copy } = useI18n() as any
  const visibleReports = typeof maxItems === 'number' ? reports.slice(0, maxItems) : reports

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2].map((i) => (
          <div key={i} className="animate-pulse bg-white p-6 border border-[#F3F3EF]">
            <div className="h-4 w-1/3 rounded bg-gray-100" />
            <div className="mt-4 h-6 w-full rounded bg-gray-50" />
          </div>
        ))}
      </div>
    )
  }

  if (error) {
    return <div className="p-8 border border-red-100 bg-red-50/30 text-[10px] uppercase font-black tracking-widest text-red-600">{error}</div>
  }

  if (visibleReports.length === 0) {
    return (
      <div className="py-24 text-center">
         <p className="font-serif-thai italic text-[#A3A3A3] text-lg opacity-40">{emptyMessage}</p>
      </div>
    )
  }

  if (minimal) {
    return (
      <div className="divide-y divide-[#F0EFEB]">
        {visibleReports.map((report, i) => (
          <button
            key={report.id}
            onClick={() => onClick?.(report)}
            className="w-full group flex gap-6 items-start py-6 hover:bg-[#F9F8F4]/50 px-1 transition-all text-left"
          >
            <span className="text-[10px] font-bold text-[#A3A3A3] mt-1.5 w-6 shrink-0">{i + 1}.</span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[8px] font-bold uppercase tracking-widest text-[#A3A3A3]">{report.houseName}</span>
                <span className="text-[8px] font-bold text-[#A3A3A3] opacity-30">|</span>
                <span className="text-[8px] font-bold uppercase tracking-widest text-[#A3A3A3]">{formatCustomerReportDate(report.date, locale)}</span>
              </div>
              <h4 className="font-serif-thai text-xl font-light text-[#111111] leading-none uppercase">{report.serviceName || "รายงานการดูแลสวน"}</h4>
            </div>
            <div className="flex items-center gap-4 shrink-0 mt-1">
              <span className="text-[8px] font-bold uppercase tracking-widest text-[#111111] bg-[#111111]/5 px-2 py-0.5">RECORD</span>
              <ChevronRight size={14} className="text-[#A3A3A3] group-hover:text-[#111111] transition-colors" />
            </div>
          </button>
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-4 md:space-y-5">
      {visibleReports.map((report) => {
        const tasks = extractCustomerReportTasks(report.workDone)
        const detailHref = getDetailHref?.(report)

        const CardContent = (
          <div className="customer-editorial-card !p-0 overflow-hidden rounded-none border border-[#111111] shadow-[4px_4px_0px_0px_rgba(17,17,17,1)] hover:shadow-[6px_6px_0px_0px_rgba(17,17,17,1)] hover:translate-x-[-2px] hover:translate-y-[-2px] transition-all duration-300">
            <div className="border-b border-[#F0F0F0] bg-[#FAFAFA] px-5 py-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="text-[7px] font-bold uppercase tracking-[0.3em] text-[#AF907A] flex items-center gap-2">
                  <ClipboardList className="h-3 w-3" />
                  {copy.loadingReport}
                </div>
                <div className={`text-[7px] font-bold uppercase tracking-[0.2em] px-2 py-0.5 border rounded-none ${report.problemsFound?.trim() ? 'border-red-100 bg-red-50 text-red-600' : 'border-green-100 bg-green-50 text-green-600'}`}>
                  {copy.statusReady}
                </div>
              </div>
              <div className="text-[7px] font-bold uppercase tracking-[0.2em] px-2 py-0.5 border border-[#111111]/5 rounded-none opacity-40">
                {getCustomerReportStatusText(report, locale)}
              </div>
            </div>

            <div className="px-4 py-3 md:px-5">
              {(showHouseContext || showOrderContext) && (
                <div className="mb-2 flex flex-wrap gap-2">
                  {showHouseContext && report.houseName ? (
                    <span className="text-[6px] font-bold uppercase tracking-widest text-[#A3A3A3] flex items-center gap-1">
                      <Home size={8} />
                      {report.houseName}
                    </span>
                  ) : null}
                  {showOrderContext && report.orderCode ? (
                    <span className="text-[6px] font-bold uppercase tracking-widest text-[#A3A3A3] flex items-center gap-1">
                      <ReceiptText size={8} />
                      #{report.orderCode}
                    </span>
                  ) : null}
                </div>
              )}

              <div className="mb-3 flex flex-col md:flex-row items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <h3 className="font-serif-thai text-xl font-light text-[#111111] uppercase tracking-tighter leading-tight">
                    {report.serviceName || report.houseName || 'Field Update'}
                  </h3>
                </div>

                <div className="flex md:flex-col gap-3 md:gap-0.5 items-center md:items-end">
                  <p className="text-[6px] font-bold uppercase tracking-[0.3em] text-[#A3A3A3]">{copy.updatedAt}</p>
                  <p className="text-[9px] font-bold text-[#111111] uppercase tracking-wider">{formatCustomerReportDateTime(report.updatedAt || report.createdAt, locale)}</p>
                </div>
              </div>

              <div className="grid gap-px bg-[#F0F0F0] border border-[#F0F0F0] grid-cols-2 lg:grid-cols-3">
                <div className="bg-white p-3">
                  <p className="text-[6px] font-bold uppercase tracking-[0.3em] text-[#A3A3A3] mb-1">{copy.workDone}</p>
                  <p className="text-[10px] font-medium leading-relaxed text-[#111111] line-clamp-1">
                    {tasks.length > 0 ? tasks.join(' • ') : '-'}
                  </p>
                </div>

                <div className="bg-white p-3">
                  <p className="text-[6px] font-bold uppercase tracking-[0.3em] text-[#A3A3A3] mb-1">{copy.issues}</p>
                  <p className="text-[10px] font-medium leading-relaxed text-[#111111] line-clamp-1">
                    {report.problemsFound?.trim() || '-'}
                  </p>
                </div>

                <div className="bg-white p-3 col-span-2 lg:col-span-1">
                  <p className="text-[6px] font-bold uppercase tracking-[0.3em] text-[#A3A3A3] mb-1">{copy.nextVisit}</p>
                  <p className="text-[10px] font-bold leading-relaxed text-[#AF907A] uppercase tracking-widest">
                    {report.nextVisitDate ? formatCustomerReportDate(report.nextVisitDate, locale) : copy.unknown}
                  </p>
                </div>
              </div>

              <div className="mt-4 flex items-center justify-between border-t border-[#111111]/10 pt-3 text-[9px] font-bold uppercase tracking-[0.2em] text-[#111111]">
                <span>{copy.openReport}</span>
                <ArrowRight size={12} />
              </div>
            </div>
          </div>
        )

        if (onClick) {
          return (
            <button
              key={report.id}
              onClick={() => onClick(report)}
              className="w-full text-left transition-all active:scale-[0.99] mb-4"
            >
              {CardContent}
            </button>
          )
        }

        if (detailHref) {
          return (
            <Link
              key={report.id}
              href={detailHref}
              className="w-full text-left transition-all active:scale-[0.99] mb-4 block"
            >
              {CardContent}
            </Link>
          )
        }

        return (
          <div key={report.id} className="w-full mb-4">
            {CardContent}
          </div>
        )
      })}
    </div>
  )
}
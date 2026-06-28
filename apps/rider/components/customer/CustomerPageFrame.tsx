'use client'

import type { ReactNode } from 'react'

type CustomerPageFrameProps = {
  badge: string
  title: string
  subtitle: string
  actions?: ReactNode
  stats?: ReactNode
  children: ReactNode
  titleClassName?: string
  noBackdrop?: boolean
}

export default function CustomerPageFrame({
  badge,
  title,
  subtitle,
  actions,
  stats,
  children,
  titleClassName,
  noBackdrop,
}: CustomerPageFrameProps) {
  return (
    <div className="relative overflow-hidden px-2 sm:px-0">
      {!noBackdrop && (
        <>
          <div className="absolute inset-x-0 top-0 -z-10 h-[520px] bg-[#FAF9F6]" />
        </>
      )}

      <section className="mb-8 rounded-none border border-white/60 bg-white/68 p-6 shadow-[0_28px_80px_rgba(26,54,38,0.08)] backdrop-blur-md sm:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <span className="mb-3 inline-flex rounded-none border border-[#D7DFD8] bg-[#F5F7F3] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.32em] text-[#32513E]">
              {badge}
            </span>
            <h1 className={`font-serif text-[2.7rem] leading-[0.92] tracking-[-0.04em] text-[#162d21] sm:text-[4.2rem] ${titleClassName || ''}`.trim()}>
              {title}
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-6 text-[#6B746F] sm:text-[15px]">{subtitle}</p>
          </div>
          {actions ? <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">{actions}</div> : null}
        </div>
      </section>

      {stats ? <section className="mb-8">{stats}</section> : null}

      <div className="space-y-6 pb-40 lg:pb-8">{children}</div>
    </div>
  )
}
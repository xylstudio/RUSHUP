"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";

interface MobileBottomBarProps {
  totalAmount: number;
  ctaLabel: string;
  disabled?: boolean;
  busy?: boolean;
  onClick: () => void;
  leftLabel?: string;
}

export default function MobileBottomBar({
  totalAmount,
  ctaLabel,
  disabled,
  busy,
  onClick,
  leftLabel = "Total",
}: MobileBottomBarProps) {
  const [mounted, setMounted] = useState(false);
  const [container, setContainer] = useState<HTMLElement | null>(null);

  useEffect(() => {
    setMounted(true);
    const el = document.createElement("div");
    el.id = "mobile-bottom-bar-portal";
    document.body.appendChild(el);
    setContainer(el);
    return () => {
      document.body.removeChild(el);
    };
  }, []);

  const content = (
    <div
      className="fixed inset-x-0 bottom-0 z-[999] sm:hidden"
      style={{ paddingBottom: (window as any)?.env?.safeAreaInsetBottom || (typeof window !== 'undefined' ? (parseInt(getComputedStyle(document.documentElement).getPropertyValue('--sat')) || 0) : 0) }}
    >
      <div className="mx-3 rounded-2xl bg-white border border-gray-200 shadow-[0_-6px_24px_rgba(0,0,0,0.08)] p-3">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs text-gray-500">{leftLabel}</div>
            <div className="text-lg font-bold text-gray-900">{totalAmount.toLocaleString()} THB</div>
          </div>
          <button
            type="button"
            disabled={disabled}
            onClick={onClick}
            className="inline-flex items-center justify-center px-4 py-3 rounded-xl bg-slate-900 hover:bg-slate-800 transition-all duration-200 text-white font-semibold disabled:opacity-50"
          >
            {busy ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                {ctaLabel}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );

  if (!mounted || !container) return null;
  return createPortal(content, container);
}

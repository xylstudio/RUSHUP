'use client';

import { LiffProvider } from '@/components/liff/LiffProvider';
import { Elements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { Suspense } from 'react';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || '');

export default function LiffLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={
       <div className="flex h-screen items-center justify-center bg-[#fcfcf9]">
         <div className="w-12 h-12 border-4 border-emerald-100 border-t-emerald-600 rounded-full animate-spin"></div>
       </div>
    }>
      <Elements stripe={stripePromise}>
        <LiffProvider>
          <div className="bg-[#fcfcf9] min-h-screen max-w-md mx-auto w-full shadow-2xl relative text-[#1A1A18] font-sans selection:bg-emerald-100 antialiased overflow-x-hidden">
            {children}
          </div>
        </LiffProvider>
      </Elements>
    </Suspense>
  );
}

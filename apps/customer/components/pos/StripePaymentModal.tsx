'use client'

import React, { useState, useEffect } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { X, Loader2, Check } from 'lucide-react';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || '');

function CheckoutForm({ 
  amount, 
  onSuccess, 
  onCancel 
}: { 
  amount: number; 
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsProcessing(true);

    const { error } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: window.location.href, // Or a dedicated success page
      },
      // Since PromptPay often requires redirect, this handles it automatically
    });

    if (error) {
      setMessage(error.message ?? 'An unexpected error occurred.');
    } else {
      // For promptpay, it might not return immediately here but redirect
      onSuccess();
    }

    setIsProcessing(false);
  };

  return (
    <form onSubmit={handleSubmit} className="w-full flex flex-col space-y-6">
      <PaymentElement options={{ layout: 'tabs' }} />
      {message && <div className="text-red-500 text-xs text-center font-bold">{message}</div>}
      <button 
        disabled={isProcessing || !stripe || !elements}
        className="w-full py-4 bg-black text-white text-[10px] font-black uppercase tracking-[0.3em] flex items-center justify-center gap-3 transition-all hover:bg-gray-900 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isProcessing ? <Loader2 size={16} className="animate-spin" /> : `Pay ฿ ${amount.toLocaleString()}`}
      </button>
      <button 
        type="button"
        onClick={onCancel}
        disabled={isProcessing}
        className="w-full py-2 bg-transparent text-gray-500 text-[10px] font-bold uppercase tracking-widest hover:text-black transition-colors"
      >
        Cancel
      </button>
    </form>
  );
}

export function StripePaymentModal({
  isOpen,
  onClose,
  amount,
  orderId,
  items = [],
  splitMode,
  onSuccess
}: {
  isOpen: boolean;
  onClose: () => void;
  amount: number;
  orderId: string;
  items?: any[];
  splitMode?: string;
  onSuccess: () => void;
}) {
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen && amount > 0 && orderId) {
      setLoading(true);
      fetch('/api/create-payment-intent/pos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount, order_id: orderId, items, splitMode })
      })
      .then(res => res.json())
      .then(data => {
        if (data.clientSecret) {
          setClientSecret(data.clientSecret);
        }
      })
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
    }
  }, [isOpen, amount, orderId, items, splitMode]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-md animate-in fade-in" onClick={onClose}></div>
      <div className="relative w-full max-w-sm bg-white border-2 border-black p-8 animate-in zoom-in-95 duration-200 flex flex-col items-center">
        
        <div className="w-full flex justify-between items-center mb-6">
          <span className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-400">Secure Checkout</span>
          <button onClick={onClose} className="hover:opacity-70"><X size={16} /></button>
        </div>

        {loading ? (
          <div className="py-12 flex flex-col items-center space-y-4 text-center">
            <Loader2 className="animate-spin text-black" size={32} />
            <p className="text-[9px] font-bold tracking-widest text-gray-400 uppercase">Preparing Secure Connection...</p>
          </div>
        ) : clientSecret ? (
          <Elements options={{ clientSecret, appearance: { theme: 'stripe' } }} stripe={stripePromise}>
            <CheckoutForm amount={amount} onSuccess={onSuccess} onCancel={onClose} />
          </Elements>
        ) : (
          <div className="py-8 text-center text-red-500 font-bold text-sm">
            Failed to load payment system. Please try again later.
          </div>
        )}
      </div>
    </div>
  );
}

"use client";
import React, { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import {
  calculatePricingSummary,
  getAvailablePricingPeriods,
  getRecommendedPriceTemplate,
  type PricingPeriod,
} from '@/lib/servicePricing'
import { useI18n } from '@/lib/I18nContext'
import CustomerServices from '@/components/customer/CustomerServices'

export default function CustomerServicesPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { copy, locale, isThaiLocale } = useI18n() as any;

  // -- DATA STATE --
  const [services, setServices] = useState<any[]>([]);
  const [priceTemplates, setPriceTemplates] = useState<any[]>([]);
  const [houses, setHouses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // -- BOOKING FLOW STATE --
  const [bookingStep, setBookingStep] = useState(1);
  const [bookingSearch, setBookingSearch] = useState("");
  const [selectedService, setSelectedService] = useState<any>(null);
  const [selectedHouse, setSelectedHouse] = useState<any>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<any>(null);
  const [bookingPeriod, setBookingPeriod] = useState<PricingPeriod>('one-time');
  const [bookingArea, setBookingArea] = useState<number>(0);
  const [bookingPriority, setBookingPriority] = useState<'normal' | 'urgent'>('normal');
  const [bookingPaymentMethod, setBookingPaymentMethod] = useState<'promptpay' | 'stripe'>('promptpay');
  const [bookingNotes, setBookingNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // -- HOUSE COMPOSER STATE --
  const [showInlineHouseComposer, setShowInlineHouseComposer] = useState(false);
  const [bookingHouseDraft, setBookingHouseDraft] = useState({ name: '', address: '', areaSize: '' });
  const [bookingHouseError, setBookingHouseError] = useState("");
  const [isCreatingBookingHouse, setIsCreatingBookingHouse] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const { data: sData } = await supabase.from('services').select('*').order('created_at');
      const { data: tData } = await supabase.from('price_templates').select('*');
      const { data: hData } = await supabase.from('houses').select('*').order('created_at');

      setServices(sData || []);
      setPriceTemplates(tData || []);
      setHouses(hData || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleServiceSelect = (service: any) => {
    setSelectedService(service);
    setBookingStep(2);
  };

  const handleHouseSelect = (house: any) => {
    setSelectedHouse(house);
    const area = house.area_size ? parseFloat(house.area_size) : 0;
    setBookingArea(area);
    setBookingStep(3);
  };

  const handleCreateHouse = async () => {
    if (!bookingHouseDraft.name || !bookingHouseDraft.address) {
      setBookingHouseError("Please fill in required fields.");
      return;
    }
    setIsCreatingBookingHouse(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { data, error: hErr } = await supabase.from('houses').insert({
        name: bookingHouseDraft.name,
        address: bookingHouseDraft.address,
        area_size: bookingHouseDraft.areaSize,
        user_id: user?.id
      }).select().single();
      if (hErr) throw hErr;
      setHouses([data, ...houses]);
      handleHouseSelect(data);
      setShowInlineHouseComposer(false);
    } catch (err: any) {
      setBookingHouseError(err.message);
    } finally {
      setIsCreatingBookingHouse(false);
    }
  };

  const handleConfirm = async () => {
    setIsSubmitting(true);
    try {
      // Implementation for booking creation...
      // For now, just simulate and redirect
      await new Promise(r => setTimeout(r, 2000));
      router.push('/dashboard/customer/houses');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const currentServiceTemplates = selectedService ? priceTemplates.filter(t => t.service_id === selectedService.id) : [];
  const availablePeriods = getAvailablePricingPeriods(selectedService, currentServiceTemplates);
  const pricingSummary = calculatePricingSummary({
    service: selectedService,
    templates: currentServiceTemplates,
    selectedTemplate: selectedTemplate || currentServiceTemplates[0],
    area: bookingArea,
    period: bookingPeriod,
    priority: bookingPriority,
  });

  if (loading) return <div className="h-screen w-screen flex items-center justify-center bg-[var(--customer-bg)] text-[var(--customer-ink)] uppercase tracking-widest text-[10px] font-bold">Loading Experience...</div>;

  return (
    <div className="h-screen w-screen overflow-hidden">
      <CustomerServices
        bookingStep={bookingStep}
        setBookingStep={setBookingStep}
        bookingSearch={bookingSearch}
        setBookingSearch={setBookingSearch}
        services={services}
        handleServiceSelectForBooking={handleServiceSelect}
        copy={copy}
        houses={houses}
        handleHouseSelectForBooking={handleHouseSelect}
        bookingHouseDraft={bookingHouseDraft}
        setBookingHouseDraft={setBookingHouseDraft as any}
        bookingHouseError={bookingHouseError}
        isCreatingBookingHouse={isCreatingBookingHouse}
        handleCreateHouseForBooking={handleCreateHouse}
        showInlineHouseComposer={showInlineHouseComposer}
        setShowInlineHouseComposer={setShowInlineHouseComposer as any}
        availableBookingPeriods={availablePeriods}
        bookingPeriod={bookingPeriod}
        setBookingPeriod={setBookingPeriod as any}
        bookingArea={bookingArea}
        setBookingArea={setBookingArea}
        bookingPriority={bookingPriority}
        setBookingPriority={setBookingPriority as any}
        bookingPricingSummary={pricingSummary}
        selectedTemplateForBooking={selectedTemplate}
        setSelectedTemplateForBooking={setSelectedTemplate}
        calculatePricingSummary={calculatePricingSummary}
        selectedServiceForBooking={selectedService}
        bookingPaymentMethod={bookingPaymentMethod}
        setBookingPaymentMethod={setBookingPaymentMethod as any}
        bookingNotes={bookingNotes}
        setBookingNotes={setBookingNotes}
        handleConfirmBooking={handleConfirm}
        isSubmittingBooking={isSubmitting}
        error={error}
        locale={locale}
        isThaiLocale={isThaiLocale}
        localeLabelClass="text-[10px] font-bold uppercase tracking-widest"
        localeMicroLabelClass="text-[8px] font-bold uppercase tracking-widest"
        localeButtonClass="px-6 py-3 border border-black/5 hover:bg-black/5 transition-all"
        bookingHouseCopy={copy.bookingHouse || {}}
      />
    </div>
  );
}

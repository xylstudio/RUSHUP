'use client';

import React, { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';
import { createClient } from '@/utils/supabase/client';
import { sortMenuItemsByOrder } from '@/lib/posMenuOrder';

declare global {
  interface Window {
    liff: any;
  }
}

interface LiffContextType {
  // Identity
  lineProfile: any;
  loading: boolean;
  error: string | null;
  phone: string;
  setPhone: (p: string) => void;
  address: string;
  setAddress: (a: string) => void;
  addressShort: string;
  setAddressShort: (a: string) => void;
  updateMemberInDB: (updates: { phone?: string; address?: string }) => Promise<void>;
  refreshHistory: () => Promise<void>;
  liff: any;

  // 🌍 Global Cached Data
  categories: any[];
  banners: any[];
  bestSellers: any[];
  shopStatus: any;
  activeOrders: any[];
  memberInfo: any;
  isDataReady: boolean;
  hasSeenLoader: boolean;
  setHasSeenLoader: (val: boolean) => void;
  refreshShopStatus: () => Promise<void>;
  refreshActiveOrders: () => Promise<void>;
  setActiveOrders: (orders: any[]) => void;
}

const LiffContext = createContext<LiffContextType | undefined>(undefined);

export const useLiff = () => {
  const context = useContext(LiffContext);
  if (!context) throw new Error('useLiff must be used within LiffProvider');
  return context;
};

export const LiffProvider = ({ children }: { children: React.ReactNode }) => {
  const supabase = createClient();

  // --- Identity ---
  const [lineProfile, setLineProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [addressShort, setAddressShort] = useState('');
  const initialized = useRef(false);

  // --- 🌍 Global Cached App Data ---
  const [categories, setCategories] = useState<any[]>([]);
  const [banners, setBanners] = useState<any[]>([]);
  const [bestSellers, setBestSellers] = useState<any[]>([]);
  const [shopStatus, setShopStatus] = useState<any>(null);
  const [activeOrders, setActiveOrders] = useState<any[]>([]);
  const [memberInfo, setMemberInfo] = useState<any>(null);
  const [isDataReady, setIsDataReady] = useState(false);
  const dataFetched = useRef(false);

  const formatAddressShort = (addr: string) => {
    if (!addr || addr.trim() === '' || addr.trim() === ':') return 'เลือกที่อยู่จัดส่ง';
    let clean = addr
      .replace(/ตำแหน่งปัจจุบัน|พิกัด|พัดกัก|พิกัด:|พัดกัก:|Coordinates:|position:|lat:|lng:|📍/gi, '')
      .replace(/-?\d+\.\d+\s*,\s*-?\d+\.\d+/g, '')
      .replace(/[.:;]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    if (!clean || clean === '' || clean === ':') return 'เลือกที่อยู่จัดส่ง';
    const sub = clean.match(/(?:แขวง|ต\.)\s?([^,\s\d]+)/)?.[1];
    const dist = clean.match(/(?:เขต|อ\.)\s?([^,\s\d]+)/)?.[1];
    if (sub && dist) return `${sub}, ${dist}`;
    if (dist) return dist;
    if (sub) return sub;
    return clean.length > 25 ? clean.substring(0, 25) + '...' : clean;
  };

  // --- Fetch: App-level data (shared across all LIFF pages) ---
  const fetchCoreData = useCallback(async (userId?: string) => {
    try {
      const [catRes, bannerRes, bsRes, statusRes] = await Promise.all([
        supabase.from('pos_menu_categories').select('*').order('order_index'),
        supabase.from('pos_banners').select('*').eq('is_active', true).order('order_index').limit(5),
        supabase
          .from('pos_menu_items')
          .select('*, modifiers:pos_item_modifier_links(group_id)')
          .eq('is_active', true)
          .or('is_popular.eq.true,is_recommended.eq.true')
          .order('name', { ascending: true })
          .limit(6),
        supabase.from('pos_shop_settings').select('*').maybeSingle(),
      ]);

      if (catRes.data) setCategories(catRes.data);
      if (bannerRes.data) setBanners(bannerRes.data);
      if (bsRes.data) setBestSellers(sortMenuItemsByOrder(bsRes.data));
      if (statusRes.data) setShopStatus(statusRes.data);

      // Active orders (requires userId)
      if (userId) {
        const { data: orders } = await supabase
          .from('pos_orders')
          .select('*')
          .eq('line_user_id', userId)
          .in('status', ['pending', 'payment_pending', 'paid', 'accepted', 'preparing', 'shipping', 'out_for_delivery'])
          .order('created_at', { ascending: false })
          .limit(3);
        if (orders) setActiveOrders(orders);

        const { data: member } = await supabase
          .from('pos_members')
          .select('*')
          .eq('line_user_id', userId)
          .maybeSingle();
        if (member) setMemberInfo(member);
      }
    } catch (err) {
      console.error('Core data fetch error:', err);
    } finally {
      setIsDataReady(true);
      dataFetched.current = true;
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('xyl_has_seen_loader', 'true');
      }
    }
  }, []);

  const refreshShopStatus = useCallback(async () => {
    const { data } = await supabase.from('pos_shop_settings').select('*').maybeSingle();
    if (data) setShopStatus(data);
  }, []);

  const refreshActiveOrders = useCallback(async () => {
    const userId = lineProfile?.userId || localStorage.getItem('xylem_line_user_id');
    if (!userId) return;
    const { data: orders } = await supabase
      .from('pos_orders')
      .select('*')
      .eq('line_user_id', userId)
      .in('status', ['pending', 'payment_pending', 'paid', 'accepted', 'preparing', 'shipping', 'out_for_delivery'])
      .order('created_at', { ascending: false })
      .limit(3);
    if (orders) setActiveOrders(orders);
  }, [lineProfile]);

  // --- Load from localStorage ---
  useEffect(() => {
    const savedPhone = localStorage.getItem('xylem_phone');
    const savedAddress = localStorage.getItem('xylem_address');
    if (savedPhone) setPhone(savedPhone);
    if (savedAddress) {
      setAddress(savedAddress);
      setAddressShort(formatAddressShort(savedAddress));
    }
  }, []);

  const liffId = process.env.NEXT_PUBLIC_LIFF_ID?.replace(/[^a-zA-Z0-9-]/g, '');

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    const initLiff = async () => {
      if (!liffId) {
        setError('Missing LIFF ID');
        setLoading(false);
        fetchCoreData(); // Still load UI data even without auth
        return;
      }

      try {
        if (!window.liff) {
          const script = document.createElement('script');
          script.src = 'https://static.line-scdn.net/liff/edge/2/sdk.js';
          script.async = true;
          document.body.appendChild(script);
          await new Promise((res) => (script.onload = res));
        }

        const liff = (window as any).liff;
        await liff.init({ liffId: liffId.trim() });

        let userId: string | undefined;

        if (liff.isLoggedIn()) {
          const profile = await liff.getProfile();
          setLineProfile(profile);
          localStorage.setItem('xylem_line_user_id', profile.userId);
          userId = profile.userId;

          const { data: memberData } = await supabase
            .from('pos_members')
            .select('phone, address, full_name, display_name, avatar_url, points, member_tier')
            .eq('line_user_id', profile.userId)
            .maybeSingle();

          if (memberData?.phone) setPhone(memberData.phone);
          if (memberData?.address) {
            setAddress(memberData.address);
            setAddressShort(formatAddressShort(memberData.address));
          }

          if (!memberData?.address) {
            const { data: orderData } = await supabase
              .from('pos_orders')
              .select('delivery_address')
              .eq('line_user_id', profile.userId)
              .not('delivery_address', 'is', null)
              .order('created_at', { ascending: false })
              .limit(1)
              .maybeSingle();
            if (orderData?.delivery_address) {
              setAddress(orderData.delivery_address);
              setAddressShort(formatAddressShort(orderData.delivery_address));
            }
          }
        }

        // 🚀 Fetch all core data immediately after identity resolution
        fetchCoreData(userId);
      } catch (err: any) {
        console.error('LIFF Init Error:', err);
        setError(err.message || String(err));
        fetchCoreData(); // Load data even on error
      } finally {
        setLoading(false);
      }
    };

    initLiff();
  }, [liffId]);

  const updateMemberInDB = async (updates: { phone?: string; address?: string }) => {
    const userId = lineProfile?.userId || localStorage.getItem('xylem_line_user_id');
    if (!userId) return;
    try {
      const { error } = await supabase.from('pos_members').update(updates).eq('line_user_id', userId);
      if (error) console.error('Database sync error:', error);
    } catch (e) {
      console.error('Critical error in updateMemberInDB:', e);
    }
  };

  const value: LiffContextType = {
    lineProfile,
    loading,
    error,
    phone,
    setPhone,
    address,
    setAddress,
    addressShort,
    setAddressShort,
    updateMemberInDB,
    refreshHistory: async () => {},
    liff: typeof window !== 'undefined' ? (window as any).liff : null,
    // 🌍 Global Cached Data
    categories,
    banners,
    bestSellers,
    shopStatus,
    activeOrders,
    memberInfo,
    isDataReady,
    hasSeenLoader: typeof window !== 'undefined' ? (sessionStorage.getItem('xyl_has_seen_loader') === 'true') : false,
    setHasSeenLoader: (val: boolean) => {
        if (typeof window !== 'undefined') {
            sessionStorage.setItem('xyl_has_seen_loader', val ? 'true' : 'false');
        }
    },
    refreshShopStatus,
    refreshActiveOrders,
    setActiveOrders,
  };

  return <LiffContext.Provider value={value}>{children}</LiffContext.Provider>;
};

'use client';
import { useEffect, useState, FormEvent } from 'react';
import Link from 'next/link';
import StatCard from '../../../components/StatCard';
import { 
  BuildingStorefrontIcon, 
  CurrencyDollarIcon, 
  ShoppingBagIcon, 
  CheckCircleIcon, 
  ListBulletIcon, 
  ClockIcon, 
  ArrowRightIcon, 
  Cog6ToothIcon, 
  BookOpenIcon, 
  InboxStackIcon 
} from '@heroicons/react/24/outline';
import { supabase } from '../../../lib/supabaseClient';
import { useI18n } from '@/lib/I18nContext';
import { formatCurrencyByLocale } from '@/lib/localeFormat';
import { useAuth } from '../../../lib/AuthContext';
import POSApp from '@/components/pos/POSApp';

export default function MerchantDashboard() {
  const { locale } = useI18n();
  const { profile, refreshProfile } = useAuth();
  
  // Branch Info
  const [branchName, setBranchName] = useState<string>('ร้านค้าของคุณ');
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string|null>(null);

  // States for Onboarding Form
  const [submittingOnboarding, setSubmittingOnboarding] = useState(false);
  const [onboardingError, setOnboardingError] = useState<string|null>(null);
  const [shopName, setShopName] = useState('');
  const [shopType, setShopType] = useState<'cafe' | 'garden' | 'both'>('both');
  const [shopAddress, setShopAddress] = useState('');
  const [shopPhone, setShopPhone] = useState('');
  const [shopEmail, setShopEmail] = useState(profile?.email || '');
  const [shopZips, setShopZips] = useState('');

  useEffect(() => {
    if (!profile?.branch_code || !profile?.is_verified) {
      setLoading(false);
      return;
    }

    async function fetchBranchData() {
      setLoading(true);
      setError(null);
      if (!supabase) {
        setError('ไม่สามารถเชื่อมต่อฐานข้อมูลได้');
        setLoading(false);
        return;
      }
      try {
        // 1. Fetch Branch Info
        const { data: branch, error: branchErr } = await supabase
          .from('branches')
          .select('id, branch_name')
          .eq('branch_code', profile.branch_code)
          .single();

        if (branchErr) throw branchErr;
        setBranchName(branch.branch_name);

        const branchId = branch.id;

        // 2. Fetch Stats
        // Branch Revenue (Sum of total from orders table for this branch_id)
        const { data: revenueData } = await supabase
          .from('orders')
          .select('total, total_price, calculated_price')
          .eq('branch_id', branchId)
          .eq('status', 'completed');

        const totalRevenue = revenueData?.reduce((sum, order: any) => {
          return sum + (Number(order.total || order.total_price || order.calculated_price) || 0);
        }, 0) || 0;
        setRevenue(totalRevenue);

        // Active Orders
        const { count: activeCount } = await supabase
          .from('orders')
          .select('*', { count: 'exact', head: true })
          .eq('branch_id', branchId)
          .in('status', ['pending', 'confirmed', 'preparing', 'delivering']);
        setActiveOrdersCount(activeCount || 0);

        // Completed Orders
        const { count: completedCount } = await supabase
          .from('orders')
          .select('*', { count: 'exact', head: true })
          .eq('branch_id', branchId)
          .eq('status', 'completed');
        setCompletedOrdersCount(completedCount || 0);

        // Total Menu Items (POS Services matching branch)
        const { count: itemsCount } = await supabase
          .from('services')
          .select('*', { count: 'exact', head: true })
          .eq('branch_id', branchId);
        setMenuItemsCount(itemsCount || 0);

        // 3. Fetch Recent Orders for this branch
        const { data: orders } = await supabase
          .from('orders')
          .select('*, profiles!orders_customer_id_fkey(display_name)')
          .eq('branch_id', branchId)
          .order('created_at', { ascending: false })
          .limit(5);
        setRecentOrders(orders || []);

      } catch (err: any) {
        setError(err.message || 'เกิดข้อผิดพลาดในการโหลดข้อมูลแดชบอร์ด');
      } finally {
        setLoading(false);
      }
    }

    fetchBranchData();
  }, [profile?.branch_code, profile?.is_verified]);

  const handleRegisterOnboarding = async (e: FormEvent) => {
    e.preventDefault();
    setSubmittingOnboarding(true);
    setOnboardingError(null);

    if (!shopName || !shopAddress || !shopPhone) {
      setOnboardingError('กรุณากรอกข้อมูลที่จำเป็นให้ครบถ้วน');
      setSubmittingOnboarding(false);
      return;
    }

    try {
      const randCode = Math.random().toString(36).substring(2, 4).toUpperCase();

      const { data: branchData, error: branchErr } = await supabase
        .from('branches')
        .insert([{
          branch_code: randCode,
          branch_name: shopName,
          name: shopName,
          code: randCode,
          address: shopAddress,
          phone: shopPhone,
          email: shopEmail,
          service_zip_codes: shopZips ? shopZips.split(',').map(z => z.trim()) : [],
          branch_type: shopType,
          latitude: 13.7563,
          longitude: 100.5018
        }])
        .select()
        .single();

      if (branchErr) throw branchErr;

      const { error: profileErr } = await supabase
        .from('profiles')
        .update({
          branch_code: randCode,
          is_verified: false
        })
        .eq('id', profile?.id);

      if (profileErr) throw profileErr;

      await refreshProfile();
    } catch (err: any) {
      setOnboardingError(err.message || 'เกิดข้อผิดพลาดในการลงทะเบียนร้านค้า');
    } finally {
      setSubmittingOnboarding(false);
    }
  };

  // Onboarding UI (No branch_code yet)
  if (profile && !profile.branch_code) {
    return (
      <div className="max-w-xl mx-auto py-12 px-4">
        <div className="bg-white/80 backdrop-blur-xl rounded-[32px] p-8 border border-stone-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] relative overflow-hidden">
          <div className="absolute top-0 right-0 w-48 h-48 bg-orange-500/5 rounded-full blur-3xl -mr-24 -mt-24 pointer-events-none"></div>
          
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-orange-100 text-orange-600 rounded-3xl flex items-center justify-center mx-auto mb-4">
              <BuildingStorefrontIcon className="h-8 w-8" />
            </div>
            <h1 className="text-2xl font-black text-stone-900 tracking-tight">สมัครเข้าร่วมเป็นร้านค้า RUSHUP</h1>
            <p className="text-stone-500 text-sm mt-2">กรอกข้อมูลรายละเอียดร้านค้าของคุณเพื่อส่งคำขอเปิดใช้งานระบบ</p>
          </div>

          {onboardingError && (
            <div className="bg-red-50 text-red-600 border border-red-100 rounded-2xl p-4 mb-6 text-sm font-medium">
              {onboardingError}
            </div>
          )}

          <form onSubmit={handleRegisterOnboarding} className="space-y-5">
            <div>
              <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider mb-2">ชื่อร้านค้า / สาขา *</label>
              <input 
                type="text" 
                value={shopName} 
                onChange={e => setShopName(e.target.value)} 
                required 
                className="w-full px-4 py-3 rounded-2xl border border-stone-200 focus:outline-none focus:border-orange-500 font-medium text-stone-900"
                placeholder="เช่น กาแฟโบราณ สาขาบางนา" 
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider mb-2">ประเภทบริการ *</label>
              <select 
                value={shopType} 
                onChange={e => setShopType(e.target.value as any)} 
                className="w-full px-4 py-3 rounded-2xl border border-stone-200 focus:outline-none focus:border-orange-500 font-medium text-stone-955 bg-white"
              >
                <option value="both">ร้านอาหาร และ บริการทั่วไป (Both)</option>
                <option value="cafe">ร้านอาหารและคาเฟ่ (Food & Cafe)</option>
                <option value="garden">บริการทำสวนและแต่งบ้าน (Garden Services)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider mb-2">เบอร์โทรศัพท์ร้านค้า *</label>
              <input 
                type="tel" 
                value={shopPhone} 
                onChange={e => setShopPhone(e.target.value)} 
                required 
                className="w-full px-4 py-3 rounded-2xl border border-stone-200 focus:outline-none focus:border-orange-500 font-medium text-stone-900"
                placeholder="เช่น 02-123-4567" 
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider mb-2">อีเมลติดต่อ</label>
              <input 
                type="email" 
                value={shopEmail} 
                onChange={e => setShopEmail(e.target.value)} 
                className="w-full px-4 py-3 rounded-2xl border border-stone-200 focus:outline-none focus:border-orange-500 font-medium text-stone-900"
                placeholder="shop@example.com" 
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider mb-2">ที่อยู่ร้านค้า *</label>
              <textarea 
                value={shopAddress} 
                onChange={e => setShopAddress(e.target.value)} 
                required 
                rows={3}
                className="w-full px-4 py-3 rounded-2xl border border-stone-200 focus:outline-none focus:border-orange-500 font-medium text-stone-900"
                placeholder="กรอกที่อยู่เต็มของร้านค้า" 
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider mb-2">รหัสไปรษณีย์ที่ให้บริการ (คั่นด้วยเครื่องหมายจุลภาค ,)</label>
              <input 
                type="text" 
                value={shopZips} 
                onChange={e => setShopZips(e.target.value)} 
                className="w-full px-4 py-3 rounded-2xl border border-stone-200 focus:outline-none focus:border-orange-500 font-medium text-stone-900"
                placeholder="เช่น 10110, 10250" 
              />
            </div>

            <button 
              type="submit" 
              disabled={submittingOnboarding}
              className="w-full bg-gradient-to-r from-orange-500 to-orange-600 text-white py-4 rounded-2xl font-bold shadow-lg shadow-orange-200 hover:shadow-xl active:scale-98 transition-all disabled:opacity-50 mt-4"
            >
              {submittingOnboarding ? 'กำลังบันทึกข้อมูล...' : 'ส่งคำขออนุมัติร้านค้า'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // Waiting Screen (branch_code exists but is_verified is false)
  if (profile && !profile.is_verified) {
    return (
      <div className="max-w-md mx-auto py-20 px-4 text-center">
        <div className="bg-white/80 backdrop-blur-xl rounded-[32px] p-8 border border-stone-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] relative overflow-hidden">
          <div className="w-20 h-20 bg-amber-50 text-amber-500 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-10 h-10 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          </div>
          <h1 className="text-2xl font-black text-stone-900 tracking-tight">อยู่ระหว่างการตรวจสอบ</h1>
          <p className="text-stone-500 text-sm mt-3 leading-relaxed">
            ข้อมูลร้านค้าของคุณได้ส่งไปยังระบบแล้ว ทีมงาน RUSHUP กำลังตรวจสอบและอนุมัติร้านค้าของคุณ
          </p>
        </div>
      </div>
    );
  }

  // Main Merchant Dashboard (POS Application)
  return <POSApp />;
}
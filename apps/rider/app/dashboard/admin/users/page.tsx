"use client";
import React, { useEffect, useState } from "react";
import { supabase } from "../../../../lib/supabaseClient";
import { PlusIcon, UserIcon, ClipboardIcon, TrashIcon, HomeIcon, MapPinIcon } from "@heroicons/react/24/outline";
import { getBranches } from '@/lib/supabaseClient';
import { useI18n } from "@/lib/I18nContext";

interface UserRow {
  id: string;
  email: string;
  display_name: string;
  role: "customer" | "staff" | "admin";
  customer_base_code?: string;
  staff_code?: string;
  branch_code?: string;
  staff_type?: 'cafe' | 'garden';
  daily_wage?: number;
  overtime_rate_per_hour?: number;
  target_working_days?: number;
  salary_type?: 'daily' | 'monthly';
  shift_start?: string;
  shift_end?: string;
}

interface HouseRow {
  id: string;
  house_code: string;
  name: string;
  user_id: string;
  customer_id?: string;
  address: string;
  zip_code?: string;
  branch_code?: string;
  house_type?: string;
  area_size?: string;
  phone_number?: string;
  contact_person?: string;
  key_location?: string;
  special_notes?: string;
  parking_available?: boolean;
  parking_spaces?: number;
  service_days?: string[];
  created_at?: string;
}

interface HouseWithOrderInfo extends HouseRow {
  order_count: number;
  status: string;
}

type OrderRow = {
  id?: string;
  customer_id?: string;
  house_id?: string;
  status?: string;
  created_at?: string;
  service_type?: string;
  total?: number;
}

type DocumentRow = {
  id?: string;
  user_id?: string;
  type?: string;
  created_at?: string;
  description?: string;
  status?: string;
}

type BranchRow = {
  branch_code: string;
  branch_name: string;
}


export default function AdminUsersPage() {
    const { locale } = useI18n();
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddUser, setShowAddUser] = useState(false);
  const [showAddHouse, setShowAddHouse] = useState<string | null>(null);
  const [newUser, setNewUser] = useState({ email: "", password: "", display_name: "", role: "customer" as "customer" | "staff", staff_type: "" as "" | "cafe" | "garden" });
  const [newHouse, setNewHouse] = useState({ name: "", user_id: "", address: "" });
  const [houses, setHouses] = useState<HouseRow[]>([]);
  const [toast, setToast] = useState<string | null>(null);
  const [toastVisible, setToastVisible] = useState(false);
  const [copiedUserId, setCopiedUserId] = useState<string | null>(null);
  const [expandedUserId, setExpandedUserId] = useState<string | null>(null);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [branchMap, setBranchMap] = useState<{ [code: string]: string }>({});
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [documents, setDocuments] = useState<DocumentRow[]>([]);
  const [branches, setBranches] = useState<BranchRow[]>([]);
  const [selectedHouse, setSelectedHouse] = useState<HouseRow | null>(null);
  // NEW: state to control house detail expand per user
  const [showHousesUserId, setShowHousesUserId] = useState<string | null>(null);

  useEffect(() => {
    const initializeData = async () => {
      try {
        setLoading(true);
        
        // Fetch all data concurrently
        await Promise.all([
          checkCurrentUser(),
          fetchUsers(),
          fetchHouses(),
          fetchOrders(),
          fetchDocuments(),
          fetchBranches()
        ]);
      } catch (error) {
        console.error('Error initializing data:', error);
        setError('เกิดข้อผิดพลาดในการโหลดข้อมูล');
      } finally {
        setLoading(false);
      }
    };

    initializeData();
  }, []);

  const fetchBranches = async () => {
    try {
      const { data } = await getBranches();
      setBranches(data || []);
      const branchMapObj: Record<string, string> = {};
      (data || []).forEach((b: BranchRow) => { 
        branchMapObj[String(b.branch_code)] = b.branch_name;
      });
      setBranchMap(branchMapObj);
    } catch (error) {
      console.error('Error fetching branches:', error);
    }
  };

  const showToast = (msg: string) => {
    setToast(msg);
    setToastVisible(true);
    setTimeout(() => setToastVisible(false), 1800);
    setTimeout(() => setToast(null), 2300);
  };

  // Cancel edit mode and revert changes
  const handleCancelEdit = () => {
    setEditingUserId(null);
    // Re-fetch data to revert any local changes
    fetchUsers();
  };

  // Save user data when edit mode is completed
  const handleSaveUser = async (userId: string) => {
    if (!supabase) {
      showToast('เกิดข้อผิดพลาดในการเชื่อมต่อฐานข้อมูล');
      return;
    }
    
    try {
      const user = users.find(u => u.id === userId);
      if (!user) return;

      // Sanitize data before update to prevent DB constraint errors
      const payload = {
        display_name: user.display_name,
        role: user.role,
        // Convert empty string to null for optional fields with constraints
        branch_code: (user.branch_code && String(user.branch_code).trim() !== "") ? String(user.branch_code).trim() : null,
        staff_type: (user.staff_type && String(user.staff_type).trim() !== "") ? String(user.staff_type).trim() : null,
        // Ensure numeric fields are valid numbers
        daily_wage: isNaN(Number(user.daily_wage)) ? 0 : Number(user.daily_wage),
        overtime_rate_per_hour: isNaN(Number(user.overtime_rate_per_hour)) ? 0 : Number(user.overtime_rate_per_hour),
        target_working_days: isNaN(Number(user.target_working_days)) ? 26 : Number(user.target_working_days),
        salary_type: (user.salary_type ? String(user.salary_type).toLowerCase().trim() : 'daily'),
        shift_start: user.shift_start || '08:30',
        shift_end: user.shift_end || '17:30'
      };

      console.log("=== SENDING UPDATE PAYLOAD ===", payload);

      const { error } = await supabase
        .from('profiles')
        .update(payload)
        .eq('id', userId);

      if (error) throw error;

      showToast('บันทึกข้อมูลเรียบร้อย');
      setEditingUserId(null); // Exit edit mode
      
      // Re-fetch data to get updated codes after a delay
      setTimeout(() => fetchUsers(), 500);
    } catch (error) {
      console.error('Error updating user:', error);
      showToast('เกิดข้อผิดพลาดในการบันทึกข้อมูล');
    }
  };

  async function checkCurrentUser() {
    if (!supabase) return;
    const { data: { user } } = await supabase.auth.getUser();
    console.log("=== CURRENT AUTH USER ===", user);
    
    if (user) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();
      console.log("=== CURRENT USER PROFILE ===", profile);
    }
  }

  async function fetchUsers() {
    if (!supabase) { 
      setError("ไม่สามารถเชื่อมต่อฐานข้อมูล"); 
      return; 
    }
    
    try {
      setError(null);
      const { data, error } = await supabase
        .from("profiles")
        .select("id, email, display_name, role, customer_base_code, staff_code, branch_code, staff_type, daily_wage, overtime_rate_per_hour, target_working_days, salary_type, shift_start, shift_end")
        .in("role", ["customer", "staff", "admin"])
        .order("created_at", { ascending: false });
      
      if (error) {
        setError(error.message);
        console.error("Error fetching users:", error);
      } else {
        setUsers(data || []);
        console.log("=== DEBUG USERS ===", data);
      }
    } catch (error) {
      console.error("Unexpected error fetching users:", error);
      setError("เกิดข้อผิดพลาดที่ไม่คาดคิด");
    }
  }

  async function fetchHouses() {
    try {
      const res = await fetch('/api/admin/houses');
      if (!res.ok) {
        throw new Error('Failed to fetch houses from API');
      }
      
      const json = await res.json();
      setHouses(json.data || []);
      console.log("=== DEBUG HOUSES (API) ===", json.data);
    } catch (err) {
      console.error("Fetch houses exception:", err);
    }
  }

  async function fetchOrders() {
    if (!supabase) return;
    
    try {
      const { data, error } = await supabase
        .from("orders")
        .select("*");
      
      if (error) {
        console.error("Error fetching orders:", error);
        return;
      }
      
      setOrders(data || []);
      console.log("=== DEBUG ORDERS ===", data);
    } catch (err) {
      console.error("Fetch orders exception:", err);
    }
  }

  async function fetchDocuments() {
    if (!supabase) return;
    
    try {
      const { data, error } = await supabase
        .from("documents")
        .select("*");
      
      if (error) {
        console.error("Error fetching documents:", error);
        return;
      }
      
      setDocuments(data || []);
      console.log("=== DEBUG DOCUMENTS ===", data);
    } catch (err) {
      console.error("Fetch documents exception:", err);
    }
  }

  async function handleAddUser(e: React.FormEvent) {
    e.preventDefault();
    if (!supabase) { setError("ไม่สามารถเชื่อมต่อฐานข้อมูล"); return; }
    setError(null);
    const { error } = await supabase.auth.signUp({
      email: newUser.email,
      password: newUser.password,
      options: { data: { display_name: newUser.display_name, role: newUser.role, staff_type: newUser.staff_type } }
    });
    if (error) { setError(error.message); return; }
    setShowAddUser(false);
    setNewUser({ email: "", password: "", display_name: "", role: "customer", staff_type: "" });
    await fetchUsers();
  }

  async function handleAddHouse(e: React.FormEvent) {
    e.preventDefault();
    if (!supabase) { setError("ไม่สามารถเชื่อมต่อฐานข้อมูล"); return; }
    setError(null);
    if (!showAddHouse) return;
    const { error } = await supabase
      .from("houses")
      .insert({ name: newHouse.name, user_id: showAddHouse, address: newHouse.address })
      .select()
      .single();
    if (error) { setError(error.message); return; }
    setShowAddHouse(null);
    setNewHouse({ name: "", user_id: "", address: "" });
    await fetchHouses();
  }

  async function handleDeleteUser(user: UserRow) {
    if (!supabase) { setError("ไม่สามารถเชื่อมต่อฐานข้อมูล"); return; }
    if (!window.confirm(`คุณแน่ใจว่าต้องการลบผู้ใช้ ${user.display_name || user.email} หรือไม่? การลบนี้จะลบข้อมูลที่เกี่ยวข้องทั้งหมด`)) return;
    setError(null);
    try {
      const res = await fetch(`/api/admin/users/${user.id}`, { method: 'DELETE' });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to delete user');
      
      await fetchUsers();
      await fetchHouses();
      showToast('ลบผู้ใช้งานสำเร็จ');
    } catch (err: any) {
      setError(err.message);
    }
  }

  const handleCopy = (user: UserRow) => {
    const code = user.role === 'customer' ? user.customer_base_code || '' : user.staff_code || '';
    navigator.clipboard.writeText(code);
    setCopiedUserId(user.id);
    setTimeout(() => setCopiedUserId(null), 1800);
  };

  if (!supabase) {
    return <div className="text-red-600 p-6">{locale === 'en' ? 'ไม่สามารถเชื่อมต่อฐานข้อมูล Supabase ได้ กรุณาตรวจสอบการตั้งค่า' : locale === 'zh' ? 'ไม่สามารถเชื่อมต่อฐานข้อมูล Supabase ได้ กรุณาตรวจสอบการตั้งค่า' : 'ไม่สามารถเชื่อมต่อฐานข้อมูล Supabase ได้ กรุณาตรวจสอบการตั้งค่า'}</div>;
  }

  const housesWithOrderInfo: HouseWithOrderInfo[] = houses.map(house => {
    const houseOrders = orders.filter(o => o.house_id === house.id);
    return {
      ...house,
      order_count: houseOrders.length,
      status: houseOrders[0]?.status || 'ปกติ',
    };
  });

  return (
    <div className="w-full max-w-full mx-auto px-4 sm:px-6 py-4 sm:py-8 bg-gradient-to-br from-gray-50 via-white to-gray-50 min-h-screen overflow-x-hidden">
      {/* Toast แจ้งเตือน */}
      {toast && (
        <div
          className={`
            fixed top-6 left-1/2 -translate-x-1/2 z-50
            bg-gradient-to-r from-green-500 to-green-600 text-white px-6 py-3 rounded-lg shadow-lg flex items-center gap-2
            transition-all duration-500
            ${toastVisible ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 -translate-y-4 scale-95'}
          `}
          style={{ pointerEvents: 'none', minWidth: 200, textAlign: 'center' }}
        >
          <ClipboardIcon className="w-5 h-5" />
          <span className="font-medium">{toast}</span>
        </div>
      )}
      
      {/* Header Section */}
      <div className="mb-8">
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                {locale === 'en' ? '                 จัดการผู้ใช้งาน               ' : locale === 'zh' ? '                 จัดการผู้ใช้งาน               ' : '                 จัดการผู้ใช้งาน               '}</h1>
              <p className="text-gray-600 mb-3">{locale === 'en' ? 'จัดการข้อมูลลูกค้าและพนักงานทั้งหมดในระบบ' : locale === 'zh' ? 'จัดการข้อมูลลูกค้าและพนักงานทั้งหมดในระบบ' : 'จัดการข้อมูลลูกค้าและพนักงานทั้งหมดในระบบ'}</p>
              <div className="flex items-center gap-6 text-sm text-gray-500">
                <span className="flex items-center gap-2">
                  <UserIcon className="w-4 h-4" />
                  {users.length} {locale === 'en' ? ' ผู้ใช้งาน                 ' : locale === 'zh' ? ' ผู้ใช้งาน                 ' : ' ผู้ใช้งาน                 '}</span>
              </div>
            </div>
            <button 
              onClick={() => setShowAddUser(true)} 
              className="flex items-center px-6 py-3 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg hover:from-green-600 hover:to-green-700 transition-all duration-200 shadow-md hover:shadow-lg"
            >
              <PlusIcon className="w-5 h-5 mr-2" /> 
              {locale === 'en' ? '                เพิ่มผู้ใช้งาน             ' : locale === 'zh' ? '                เพิ่มผู้ใช้งาน             ' : '                เพิ่มผู้ใช้งาน             '}</button>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-gradient-to-r from-red-50 to-red-100 border border-red-200 text-red-700 px-6 py-4 rounded-lg mb-6">
          <div className="flex items-center gap-3">
            <div className="w-5 h-5 bg-red-500 rounded-full flex items-center justify-center">
              <span className="text-white text-sm font-bold">!</span>
            </div>
            {error}
          </div>
        </div>
      )}

      {loading ? (
        <div className="text-center py-12">
          <div className="inline-flex flex-col items-center gap-3">
            <div className="w-10 h-10 border-4 border-green-200 rounded-full animate-spin border-t-green-600"></div>
            <div className="text-gray-600 font-medium">{locale === 'en' ? 'Loading data...' : locale === 'zh' ? '正在加载数据...' : 'กำลังโหลดข้อมูล...'}</div>
          </div>
        </div>
      ) : (
        <>
          {/* Add User Form */}
          {showAddUser && (
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 mb-8">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h2 className="text-xl font-bold text-gray-900 mb-1">{locale === 'en' ? 'เพิ่มผู้ใช้งานใหม่' : locale === 'zh' ? 'เพิ่มผู้ใช้งานใหม่' : 'เพิ่มผู้ใช้งานใหม่'}</h2>
                  <p className="text-gray-600 text-sm">{locale === 'en' ? 'กรอกข้อมูลผู้ใช้งานใหม่ในระบบ' : locale === 'zh' ? 'กรอกข้อมูลผู้ใช้งานใหม่ในระบบ' : 'กรอกข้อมูลผู้ใช้งานใหม่ในระบบ'}</p>
                </div>
                <button 
                  onClick={() => setShowAddUser(false)} 
                  className="text-gray-400 hover:text-gray-600 text-2xl hover:scale-110 transition-transform duration-200"
                >
                  ×
                </button>
              </div>
              <form onSubmit={handleAddUser} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">{locale === 'en' ? 'Email' : locale === 'zh' ? '电子邮件' : 'อีเมล'}</label>
                    <input 
                      autoFocus 
                      type="email" 
                      required 
                      className="w-full border border-gray-300 px-4 py-2 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all duration-200" 
                      value={newUser.email} 
                      onChange={e => setNewUser({ ...newUser, email: e.target.value })} 
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">{locale === 'en' ? 'password' : locale === 'zh' ? '密码' : 'รหัสผ่าน'}</label>
                    <input 
                      type="password" 
                      required 
                      className="w-full border border-gray-300 px-4 py-2 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all duration-200" 
                      value={newUser.password} 
                      onChange={e => setNewUser({ ...newUser, password: e.target.value })} 
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">{locale === 'en' ? 'ชื่อที่แสดง' : locale === 'zh' ? 'ชื่อที่แสดง' : 'ชื่อที่แสดง'}</label>
                    <input 
                      type="text" 
                      required 
                      className="w-full border border-gray-300 px-4 py-2 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all duration-200" 
                      value={newUser.display_name} 
                      onChange={e => setNewUser({ ...newUser, display_name: e.target.value })} 
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">{locale === 'en' ? 'บทบาท' : locale === 'zh' ? 'บทบาท' : 'บทบาท'}</label>
                    <select 
                      className="w-full border border-gray-300 px-4 py-2 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all duration-200" 
                      value={newUser.role} 
                      onChange={e => setNewUser({ ...newUser, role: e.target.value as "customer" | "staff" })}
                    >
                      <option value="customer">{locale === 'en' ? 'customer' : locale === 'zh' ? '顾客' : 'ลูกค้า'}</option>
                      <option value="staff">{locale === 'en' ? 'employee' : locale === 'zh' ? '员工' : 'พนักงาน'}</option>
                    </select>
                  </div>
                  {newUser.role === 'staff' && (
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">{locale === 'en' ? 'แผนกพนักงาน' : locale === 'zh' ? 'แผนกพนักงาน' : 'แผนกพนักงาน'}</label>
                      <select 
                        className="w-full border border-gray-300 px-4 py-2 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all duration-200" 
                        value={newUser.staff_type} 
                        onChange={e => setNewUser({ ...newUser, staff_type: e.target.value as "cafe" | "garden" })}
                        required
                      >
                        <option value="">{locale === 'en' ? 'เลือกแผนก...' : locale === 'zh' ? 'เลือกแผนก...' : 'เลือกแผนก...'}</option>
                        <option value="cafe">{locale === 'en' ? 'พนักงานคาเฟ่ / ร้านอาหาร' : locale === 'zh' ? 'พนักงานคาเฟ่ / ร้านอาหาร' : 'พนักงานคาเฟ่ / ร้านอาหาร'}</option>
                        <option value="garden">{locale === 'en' ? 'คนสวน / งานบริการ' : locale === 'zh' ? 'คนสวน / งานบริการ' : 'คนสวน / งานบริการ'}</option>
                      </select>
                    </div>
                  )}
                </div>
                <div className="flex justify-end gap-4 pt-4">
                  <button 
                    type="button" 
                    onClick={() => setShowAddUser(false)} 
                    className="px-6 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-all duration-200"
                  >
                    {locale === 'en' ? 'cancel' : locale === 'zh' ? '取消' : '                     ยกเลิก                   '}</button>
                  <button 
                    type="submit" 
                    className="px-6 py-2 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg hover:from-green-600 hover:to-green-700 transition-all duration-200 shadow-md"
                  >
                    {locale === 'en' ? '                     บันทึก                   ' : locale === 'zh' ? '                     บันทึก                   ' : '                     บันทึก                   '}</button>
                </div>
              </form>
            </div>
          )}

          {/* Users Table/Card List Responsive */}
          <div className="w-full">
            {/* Desktop: Table */}
            <div className="hidden sm:block mt-4">
              <table className="min-w-full bg-white rounded-xl overflow-hidden shadow-sm">
                <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
                  <tr>
                    <th className="px-6 py-4 text-left font-semibold text-gray-700">{locale === 'en' ? 'รหัสลูกค้า/พนักงาน' : locale === 'zh' ? 'รหัสลูกค้า/พนักงาน' : 'รหัสลูกค้า/พนักงาน'}</th>
                    <th className="px-6 py-4 text-left font-semibold text-gray-700">{locale === 'en' ? 'ชื่อที่แสดง / อีเมล' : locale === 'zh' ? 'ชื่อที่แสดง / อีเมล' : 'ชื่อที่แสดง / อีเมล'}</th>
                    <th className="px-6 py-4 text-left font-semibold text-gray-700">{locale === 'en' ? 'บทบาท' : locale === 'zh' ? 'บทบาท' : 'บทบาท'}</th>
                    <th className="px-6 py-4 text-left font-semibold text-gray-700">{locale === 'en' ? 'สาขา' : locale === 'zh' ? 'สาขา' : 'สาขา'}</th>
                    <th className="px-6 py-4 text-center font-semibold text-gray-700">{locale === 'en' ? 'จำนวนบ้าน' : locale === 'zh' ? 'จำนวนบ้าน' : 'จำนวนบ้าน'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {users.map((user) => {
                      const { locale } = useI18n();
                    const houseCount = housesWithOrderInfo.filter(h => h.user_id === user.id || h.customer_id === user.id).length;
                    return (
                      <React.Fragment key={user.id}>
                        <tr
                          className={`hover:bg-gradient-to-r hover:from-gray-50 hover:to-gray-100 transition-all duration-200 group cursor-pointer text-base ${expandedUserId === user.id ? 'bg-green-50' : ''}`}
                          onClick={() => setExpandedUserId(expandedUserId === user.id ? null : user.id)}
                        >
                          <td className="px-6 py-4">
                            <span className="font-mono text-sm text-gray-700 bg-gradient-to-r from-gray-100 to-gray-200 px-4 py-2 rounded-lg border border-gray-200 shadow-sm flex items-center justify-center min-w-[80px]">
                              {user.role === 'customer' ? user.customer_base_code || '-' : user.staff_code || '-'}
                            </span>
                          </td>
                          <td className="px-6 py-4 max-w-[200px] md:max-w-[350px]">
                            <div className="font-medium text-gray-900 break-words">{user.display_name}</div>
                            <div className="text-gray-500 text-sm break-all mt-0.5">{user.email}</div>
                          </td>
                          <td className="px-6 py-4">
                            {user.role === 'customer' ? (
                              <span className="inline-flex items-center px-3 py-1 rounded-full bg-gradient-to-r from-blue-100 to-blue-200 text-blue-700 text-sm font-medium shadow-sm">
                                {locale === 'en' ? 'customer' : locale === 'zh' ? '顾客' : '                                 ลูกค้า                               '}</span>
                            ) : user.role === 'staff' ? (
                              <span className="inline-flex items-center px-3 py-1 rounded-full bg-gradient-to-r from-green-100 to-green-200 text-green-700 text-sm font-medium shadow-sm">
                                {locale === 'en' ? 'employee' : locale === 'zh' ? '员工' : '                                 พนักงาน                               '}</span>
                            ) : (
                              <span className="inline-flex items-center px-3 py-1 rounded-full bg-gradient-to-r from-purple-100 to-purple-200 text-purple-700 text-sm font-medium shadow-sm">
                                {locale === 'en' ? '                                 แอดมิน                               ' : locale === 'zh' ? '                                 แอดมิน                               ' : '                                 แอดมิน                               '}</span>
                            )}
                          </td>
                          <td className="px-6 py-4">
                            {user.branch_code ? (branchMap[String(user.branch_code)] || user.branch_code) : "-"}
                          </td>
                          <td className="px-6 py-4 text-center">
                            <div className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-gradient-to-r from-gray-100 to-gray-200 text-gray-700 text-sm font-bold border border-gray-200 shadow-sm">
                              {houseCount}
                            </div>
                          </td>
                        </tr>
                        {expandedUserId === user.id && (
                          <tr>
                            <td colSpan={5} className="bg-white px-8 py-6 border-t border-b border-green-100 animate-fade-in">
                              <div className="space-y-6">
                              {/* User Info Section */}
                              <div>
                                <div className="flex justify-between items-center mb-4">
                                  <h3 className="text-lg font-semibold text-gray-800">{locale === 'en' ? 'ข้อมูลผู้ใช้' : locale === 'zh' ? 'ข้อมูลผู้ใช้' : 'ข้อมูลผู้ใช้'}</h3>
                                  <div className="flex items-center gap-2">
                                    {editingUserId === user.id ? (
                                      <>
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleCancelEdit();
                                          }}
                                          className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 text-gray-700 text-xs font-medium rounded-md hover:bg-gray-200 transition-colors"
                                        >
                                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                          </svg>
                                          {locale === 'en' ? 'cancel' : locale === 'zh' ? '取消' : '                                           ยกเลิก                                         '}</button>
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleSaveUser(user.id);
                                          }}
                                          className="flex items-center gap-1.5 px-3 py-1.5 bg-green-100 text-green-700 text-xs font-medium rounded-md hover:bg-green-200 transition-colors"
                                        >
                                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                          </svg>
                                          {locale === 'en' ? '                                           บันทึก                                         ' : locale === 'zh' ? '                                           บันทึก                                         ' : '                                           บันทึก                                         '}</button>
                                      </>
                                    ) : (
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setEditingUserId(user.id);
                                        }}
                                        className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-100 text-blue-700 text-xs font-medium rounded-md hover:bg-blue-200 transition-colors"
                                      >
                                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                        </svg>
                                        {locale === 'en' ? 'correct' : locale === 'zh' ? '正确的' : '                                         แก้ไข                                       '}</button>
                                    )}
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleCopy(user);
                                      }}
                                      className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 text-gray-700 text-xs font-medium rounded-md hover:bg-gray-200 transition-colors"
                                    >
                                      <ClipboardIcon className="w-3.5 h-3.5" />
                                      {copiedUserId === user.id ? 'คัดลอกแล้ว!' : 'คัดลอกรหัส'}
                                    </button>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleDeleteUser(user);
                                      }}
                                      className="flex items-center gap-1.5 px-3 py-1.5 bg-red-100 text-red-700 text-xs font-medium rounded-md hover:bg-red-200 transition-colors"
                                    >
                                      <TrashIcon className="w-3.5 h-3.5" />
                                      {locale === 'en' ? '                                       ลบ                                     ' : locale === 'zh' ? '                                       ลบ                                     ' : '                                       ลบ                                     '}</button>
                                  </div>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                                  {/* User Info fields only (no house details) */}
                                  <div className="bg-gray-50 p-3 rounded-lg">
                                    <div className="text-xs font-medium text-gray-600 mb-1">{locale === 'en' ? 'รหัสผู้ใช้' : locale === 'zh' ? 'รหัสผู้ใช้' : 'รหัสผู้ใช้'}</div>
                                    <div className="font-mono text-sm text-gray-800">{user.id}</div>
                                  </div>
                                  <div className="bg-gray-50 p-3 rounded-lg">
                                    <div className="text-xs font-medium text-gray-600 mb-1">{locale === 'en' ? 'Email' : locale === 'zh' ? '电子邮件' : 'อีเมล'}</div>
                                    <div className="text-sm text-gray-800 break-all">{user.email}</div>
                                  </div>
                                  {/* Inline Edit: Display Name */}
                                  <div className={`p-3 rounded-lg border ${editingUserId === user.id ? 'bg-blue-50 border-blue-200' : 'bg-gray-50 border-gray-200'}`}>
                                    <label className={`block text-xs font-medium mb-1 ${editingUserId === user.id ? 'text-blue-600' : 'text-gray-600'}`}>{locale === 'en' ? 'ชื่อที่แสดง' : locale === 'zh' ? 'ชื่อที่แสดง' : 'ชื่อที่แสดง'}</label>
                                    {editingUserId === user.id ? (
                                      <input
                                        type="text"
                                        className="w-full border-0 bg-transparent text-sm text-gray-800 focus:ring-2 focus:ring-blue-500 rounded px-2 py-1"
                                        value={user.display_name}
                                        onChange={(e) => {
                                          const newDisplayName = e.target.value;
                                          setUsers(currentUsers =>
                                            currentUsers.map(u => (u.id === user.id ? { ...u, display_name: newDisplayName } : u))
                                          );
                                        }}
                                      />
                                    ) : (
                                      <div className="text-sm text-gray-800 px-2 py-1">{user.display_name}</div>
                                    )}
                                  </div>
                                  {/* Inline Edit: Role */}
                                  <div className={`p-3 rounded-lg border ${editingUserId === user.id ? 'bg-blue-50 border-blue-200' : 'bg-gray-50 border-gray-200'}`}>
                                    <label className={`block text-xs font-medium mb-1 ${editingUserId === user.id ? 'text-blue-600' : 'text-gray-600'}`}>{locale === 'en' ? 'บทบาท' : locale === 'zh' ? 'บทบาท' : 'บทบาท'}</label>
                                    {editingUserId === user.id ? (
                                      <select
                                        className="w-full border-0 bg-transparent text-sm text-gray-800 focus:ring-2 focus:ring-blue-500 rounded px-2 py-1"
                                        value={user.role}
                                        onChange={(e) => {
                                          const newRole = e.target.value as "customer" | "staff" | "admin";
                                          setUsers(currentUsers =>
                                            currentUsers.map(u => (u.id === user.id ? { ...u, role: newRole } : u))
                                          );
                                        }}
                                      >
                                        <option value="customer">{locale === 'en' ? 'customer' : locale === 'zh' ? '顾客' : 'ลูกค้า'}</option>
                                        <option value="staff">{locale === 'en' ? 'employee' : locale === 'zh' ? '员工' : 'พนักงาน'}</option>
                                        <option value="admin">{locale === 'en' ? 'แอดมิน' : locale === 'zh' ? 'แอดมิน' : 'แอดมิน'}</option>
                                      </select>
                                    ) : (
                                      <div className="text-sm text-gray-800 px-2 py-1">
                                        {user.role === 'customer' ? 'ลูกค้า' : user.role === 'staff' ? 'พนักงาน' : 'แอดมิน'}
                                      </div>
                                    )}
                                  </div>
                                  {user.role === 'customer' && user.customer_base_code && (
                                    <div className="bg-gray-50 p-3 rounded-lg">
                                      <div className="text-xs font-medium text-gray-600 mb-1">{locale === 'en' ? 'รหัสลูกค้า' : locale === 'zh' ? 'รหัสลูกค้า' : 'รหัสลูกค้า'}</div>
                                      <div className="font-mono text-sm text-gray-800">{user.customer_base_code}</div>
                                    </div>
                                  )}
                                  {user.role === 'staff' && user.staff_code && (
                                    <div className="bg-gray-50 p-3 rounded-lg">
                                      <div className="text-xs font-medium text-gray-600 mb-1">{locale === 'en' ? 'รหัสพนักงาน' : locale === 'zh' ? 'รหัสพนักงาน' : 'รหัสพนักงาน'}</div>
                                      <div className="font-mono text-sm text-gray-800">{user.staff_code}</div>
                                    </div>
                                  )}
                                  {/* Inline Edit: Branch (for staff only) */}
                                  {user.role === 'staff' && (
                                    <div className={`p-3 rounded-lg border ${editingUserId === user.id ? 'bg-blue-50 border-blue-200' : 'bg-gray-50 border-gray-200'}`}>
                                      <label className={`block text-xs font-medium mb-1 ${editingUserId === user.id ? 'text-blue-600' : 'text-gray-600'}`}>{locale === 'en' ? 'สาขา' : locale === 'zh' ? 'สาขา' : 'สาขา'}</label>
                                      {editingUserId === user.id ? (
                                        <select
                                          className="w-full border-0 bg-transparent text-sm text-gray-800 focus:ring-2 focus:ring-blue-500 rounded px-2 py-1"
                                          value={user.branch_code || ''}
                                          onChange={(e) => {
                                            const newBranchCode = e.target.value;
                                            setUsers(currentUsers =>
                                              currentUsers.map(u => (u.id === user.id ? { ...u, branch_code: newBranchCode } : u))
                                            );
                                          }}
                                        >
                                          <option value="">{locale === 'en' ? 'เลือกสาขา' : locale === 'zh' ? 'เลือกสาขา' : 'เลือกสาขา'}</option>
                                          {branches.map(branch => (
                                            <option key={branch.branch_code} value={branch.branch_code}>
                                              {branch.branch_name}
                                            </option>
                                          ))}
                                        </select>
                                      ) : (
                                        <div className="text-sm text-gray-800 px-2 py-1">
                                          {user.branch_code ? (branchMap[String(user.branch_code)] || user.branch_code) : 'ไม่ได้เลือกสาขา'}
                                        </div>
                                      )}
                                    </div>
                                  )}
                                  {/* Inline Edit: Staff Type */}
                                  {user.role === 'staff' && (
                                    <div className={`p-3 rounded-lg border ${editingUserId === user.id ? 'bg-blue-50 border-blue-200' : 'bg-gray-50 border-gray-200'}`}>
                                      <label className={`block text-xs font-medium mb-1 ${editingUserId === user.id ? 'text-blue-600' : 'text-gray-600'}`}>{locale === 'en' ? 'แผนกพนักงาน' : locale === 'zh' ? 'แผนกพนักงาน' : 'แผนกพนักงาน'}</label>
                                      {editingUserId === user.id ? (
                                        <select
                                          className="w-full border-0 bg-transparent text-sm text-gray-800 focus:ring-2 focus:ring-blue-500 rounded px-2 py-1"
                                          value={user.staff_type || ''}
                                          onChange={(e) => {
                                            const newType = e.target.value as "cafe" | "garden";
                                            setUsers(currentUsers =>
                                              currentUsers.map(u => (u.id === user.id ? { ...u, staff_type: newType } : u))
                                            );
                                          }}
                                        >
                                          <option value="">{locale === 'en' ? 'เลือกแผนก...' : locale === 'zh' ? 'เลือกแผนก...' : 'เลือกแผนก...'}</option>
                                          <option value="cafe">{locale === 'en' ? 'คาเฟ่' : locale === 'zh' ? 'คาเฟ่' : 'คาเฟ่'}</option>
                                          <option value="garden">{locale === 'en' ? 'สวน' : locale === 'zh' ? 'สวน' : 'สวน'}</option>
                                        </select>
                                      ) : (
                                        <div className="text-sm text-gray-800 px-2 py-1">
                                          {user.staff_type === 'cafe' ? 'คาเฟ่' : user.staff_type === 'garden' ? 'สวน' : 'ไม่ได้ระบุ'}
                                        </div>
                                      )}
                                    </div>
                                  )}
                                  {/* Wage & Salary Settings (for staff only) */}
                                  {user.role === 'staff' && (
                                    <>
                                      <div className={`p-3 rounded-lg border ${editingUserId === user.id ? 'bg-blue-50 border-blue-200' : 'bg-gray-50 border-gray-200'}`}>
                                        <label className={`block text-xs font-medium mb-1 ${editingUserId === user.id ? 'text-blue-600' : 'text-gray-600'}`}>{locale === 'en' ? 'ประเภทเงินเดือน' : locale === 'zh' ? 'ประเภทเงินเดือน' : 'ประเภทเงินเดือน'}</label>
                                        {editingUserId === user.id ? (
                                          <select
                                            className="w-full border-0 bg-transparent text-sm text-gray-800 focus:ring-2 focus:ring-blue-500 rounded px-2 py-1"
                                            value={user.salary_type || 'daily'}
                                            onChange={(e) => {
                                              const newType = e.target.value as "daily" | "monthly";
                                              setUsers(currentUsers =>
                                                currentUsers.map(u => (u.id === user.id ? { ...u, salary_type: newType } : u))
                                              );
                                            }}
                                          >
                                            <option value="daily">{locale === 'en' ? 'รายวัน (Daily)' : locale === 'zh' ? 'รายวัน (Daily)' : 'รายวัน (Daily)'}</option>
                                            <option value="monthly">{locale === 'en' ? 'Monthly (Monthly)' : locale === 'zh' ? '每月（每月）' : 'รายเดือน (Monthly)'}</option>
                                          </select>
                                        ) : (
                                          <div className="text-sm text-gray-800 px-2 py-1">
                                            {user.salary_type === 'monthly' ? 'รายเดือน' : 'รายวัน'}
                                          </div>
                                        )}
                                      </div>
                                      <div className={`p-3 rounded-lg border ${editingUserId === user.id ? 'bg-blue-50 border-blue-200' : 'bg-gray-50 border-gray-200'}`}>
                                        <label className={`block text-xs font-medium mb-1 ${editingUserId === user.id ? 'text-blue-600' : 'text-gray-600'}`}>
                                          {user.salary_type === 'monthly' ? 'เงินเดือนฐาน' : 'ค่าแรงรายวัน'}
                                        </label>
                                        {editingUserId === user.id ? (
                                          <input
                                            type="number"
                                            className="w-full border-0 bg-transparent text-sm text-gray-800 focus:ring-2 focus:ring-blue-500 rounded px-2 py-1"
                                            value={user.daily_wage || 0}
                                            onChange={(e) => {
                                              const val = parseFloat(e.target.value);
                                              setUsers(currentUsers =>
                                                currentUsers.map(u => (u.id === user.id ? { ...u, daily_wage: val } : u))
                                              );
                                            }}
                                          />
                                        ) : (
                                          <div className="text-sm text-gray-800 px-2 py-1">
                                            {locale === 'en' ? '                                             ฿' : locale === 'zh' ? '                                             ฿' : '                                             ฿'}{(user.daily_wage || 0).toLocaleString()}
                                          </div>
                                        )}
                                      </div>
                                      <div className={`p-3 rounded-lg border ${editingUserId === user.id ? 'bg-blue-50 border-blue-200' : 'bg-gray-50 border-gray-200'}`}>
                                        <label className={`block text-xs font-medium mb-1 ${editingUserId === user.id ? 'text-blue-600' : 'text-gray-600'}`}>{locale === 'en' ? 'อัตรา OT (ต่อชั่วโมง)' : locale === 'zh' ? 'อัตรา OT (ต่อชั่วโมง)' : 'อัตรา OT (ต่อชั่วโมง)'}</label>
                                        {editingUserId === user.id ? (
                                          <input
                                            type="number"
                                            className="w-full border-0 bg-transparent text-sm text-gray-800 focus:ring-2 focus:ring-blue-500 rounded px-2 py-1"
                                            value={user.overtime_rate_per_hour || 0}
                                            onChange={(e) => {
                                              const val = parseFloat(e.target.value);
                                              setUsers(currentUsers =>
                                                currentUsers.map(u => (u.id === user.id ? { ...u, overtime_rate_per_hour: val } : u))
                                              );
                                            }}
                                          />
                                        ) : (
                                          <div className="text-sm text-gray-800 px-2 py-1">
                                            {locale === 'en' ? '                                             ฿' : locale === 'zh' ? '                                             ฿' : '                                             ฿'}{(user.overtime_rate_per_hour || 0).toLocaleString()}
                                          </div>
                                        )}
                                      </div>
                                      <div className={`p-3 rounded-lg border ${editingUserId === user.id ? 'bg-blue-50 border-blue-200' : 'bg-gray-50 border-gray-200'}`}>
                                        <label className={`block text-xs font-medium mb-1 ${editingUserId === user.id ? 'text-blue-600' : 'text-gray-600'}`}>{locale === 'en' ? 'วันทำงานเป้าหมาย (ต่อเดือน)' : locale === 'zh' ? 'วันทำงานเป้าหมาย (ต่อเดือน)' : 'วันทำงานเป้าหมาย (ต่อเดือน)'}</label>
                                        {editingUserId === user.id ? (
                                          <input
                                            type="number"
                                            className="w-full border-0 bg-transparent text-sm text-gray-800 focus:ring-2 focus:ring-blue-500 rounded px-2 py-1"
                                            value={user.target_working_days || 26}
                                            onChange={(e) => {
                                              const val = parseInt(e.target.value);
                                              setUsers(currentUsers =>
                                                currentUsers.map(u => (u.id === user.id ? { ...u, target_working_days: val } : u))
                                              );
                                            }}
                                          />
                                        ) : (
                                          <div className="text-sm text-gray-800 px-2 py-1">
                                            {user.target_working_days || 26} {locale === 'en' ? 'day' : locale === 'zh' ? '天' : ' วัน                                           '}</div>
                                        )}
                                      </div>
                                      <div className={`p-3 rounded-lg border ${editingUserId === user.id ? 'bg-blue-50 border-blue-200' : 'bg-gray-50 border-gray-200'}`}>
                                        <label className={`block text-xs font-medium mb-1 ${editingUserId === user.id ? 'text-blue-600' : 'text-gray-600'}`}>{locale === 'en' ? 'เวลาเริ่มงาน' : locale === 'zh' ? 'เวลาเริ่มงาน' : 'เวลาเริ่มงาน'}</label>
                                        {editingUserId === user.id ? (
                                          <input
                                            type="time"
                                            className="w-full border-0 bg-transparent text-sm text-gray-800 focus:ring-2 focus:ring-blue-500 rounded px-2 py-1"
                                            value={user.shift_start || '08:30'}
                                            onChange={(e) => {
                                              const val = e.target.value;
                                              setUsers(currentUsers =>
                                                currentUsers.map(u => (u.id === user.id ? { ...u, shift_start: val } : u))
                                              );
                                            }}
                                          />
                                        ) : (
                                          <div className="text-sm text-gray-800 px-2 py-1">
                                            {user.shift_start || '08:30'}
                                          </div>
                                        )}
                                      </div>
                                      <div className={`p-3 rounded-lg border ${editingUserId === user.id ? 'bg-blue-50 border-blue-200' : 'bg-gray-50 border-gray-200'}`}>
                                        <label className={`block text-xs font-medium mb-1 ${editingUserId === user.id ? 'text-blue-600' : 'text-gray-600'}`}>{locale === 'en' ? 'เวลาเลิกงาน' : locale === 'zh' ? 'เวลาเลิกงาน' : 'เวลาเลิกงาน'}</label>
                                        {editingUserId === user.id ? (
                                          <input
                                            type="time"
                                            className="w-full border-0 bg-transparent text-sm text-gray-800 focus:ring-2 focus:ring-blue-500 rounded px-2 py-1"
                                            value={user.shift_end || '17:30'}
                                            onChange={(e) => {
                                              const val = e.target.value;
                                              setUsers(currentUsers =>
                                                currentUsers.map(u => (u.id === user.id ? { ...u, shift_end: val } : u))
                                              );
                                            }}
                                          />
                                        ) : (
                                          <div className="text-sm text-gray-800 px-2 py-1">
                                            {user.shift_end || '17:30'}
                                          </div>
                                        )}
                                      </div>
                                    </>
                                  )}
                                </div>
                              </div>
                              {/* Houses Summary Card (click to expand) */}
                              <div className="mb-6">
                                <button
                                  className={`w-full flex items-center justify-between px-6 py-4 rounded-xl border border-[#3A5A40] bg-white shadow-sm hover:shadow-md transition-all duration-200 group focus:outline-none ${showHousesUserId === user.id ? 'ring-2 ring-[#3A5A40]' : ''}`}
                                  onClick={e => {
                                    e.stopPropagation();
                                    setShowHousesUserId(showHousesUserId === user.id ? null : user.id);
                                  }}
                                >
                                  <div className="flex items-center gap-3">
                                    <HomeIcon className="w-7 h-7 text-[#3A5A40]" />
                                    <div className="text-left">
                                      <div className="font-bold text-lg text-[#222]">{locale === 'en' ? 'บ้านที่เชื่อมโยง' : locale === 'zh' ? 'บ้านที่เชื่อมโยง' : 'บ้านที่เชื่อมโยง'}</div>
                                      <div className="text-base text-[#3A5A40] font-medium">{housesWithOrderInfo.filter(h => h.user_id === user.id).length} {locale === 'en' ? 'behind' : locale === 'zh' ? '在后面' : ' หลัง'}</div>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    {user.role === 'customer' && (
                                      <button
                                        onClick={e => {
                                          e.stopPropagation();
                                          window.location.href = `/dashboard/admin/users/${user.id}/add-house`;
                                        }}
                                        className="flex items-center gap-1.5 px-3 py-1.5 bg-[#E9F5E1] text-[#3A5A40] text-xs font-medium rounded-md hover:bg-[#D3E7C6] transition-colors"
                                      >
                                        <PlusIcon className="w-4 h-4 mr-1" />
                                        {locale === 'en' ? '                                         เพิ่มบ้าน                                       ' : locale === 'zh' ? '                                         เพิ่มบ้าน                                       ' : '                                         เพิ่มบ้าน                                       '}</button>
                                    )}
                                    <span className={`ml-2 transition-transform duration-200 ${showHousesUserId === user.id ? 'rotate-90' : ''}`}>
                                      <svg className="w-5 h-5 text-[#3A5A40]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                      </svg>
                                    </span>
                                  </div>
                                </button>
                                {/* Expand house details if open */}
                                {showHousesUserId === user.id && (
                                  <div className="mt-6">
                                    {housesWithOrderInfo.filter(h => h.user_id === user.id).length > 0 ? (
                                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                        {housesWithOrderInfo.filter(h => h.user_id === user.id).map((house) => (
                                          <div
                                            key={house.house_code}
                                            className="bg-white border border-[#3A5A40] rounded-2xl shadow p-6 flex flex-col gap-2 hover:scale-[1.025] hover:shadow-lg transition-all duration-200 cursor-pointer group"
                                            onClick={e => {
                                              e.stopPropagation();
                                              setSelectedHouse(house);
                                            }}
                                          >
                                            <div className="flex items-center gap-3 mb-2">
                                              <HomeIcon className="w-6 h-6 text-[#3A5A40]" />
                                              <span className="font-semibold text-lg text-[#222]">{house.name}</span>
                                            </div>
                                            <div className="text-xs text-[#3A5A40] mb-1">{locale === 'en' ? 'code:' : locale === 'zh' ? '代码：' : 'รหัส: '}<span className="font-mono text-[#222]">{house.house_code}</span></div>
                                            <div className="text-sm text-[#222] mb-1 flex items-center gap-1">
                                              <MapPinIcon className="w-4 h-4 text-[#3A5A40]" /> {house.address}
                                            </div>
                                            {house.area_size && (
                                              <div className="text-xs text-[#3A5A40]">{locale === 'en' ? 'size:' : locale === 'zh' ? '尺寸：' : 'ขนาด: '}<span className="font-medium text-[#222]">{house.area_size} {locale === 'en' ? 'sq m.' : locale === 'zh' ? '平方米。' : ' ตร.ม.'}</span></div>
                                            )}
                                            {house.branch_code && (
                                              <div className="text-xs text-[#3A5A40]">{locale === 'en' ? 'สาขา: ' : locale === 'zh' ? 'สาขา: ' : 'สาขา: '}<span className="font-medium text-[#222]">{branchMap[String(house.branch_code)] || house.branch_code}</span></div>
                                            )}
                                            <div className="flex items-center gap-3 mt-2">
                                              <span className="inline-flex items-center px-2 py-1 rounded-full bg-[#E9F5E1] text-[#3A5A40] text-xs font-medium">
                                                {house.status || 'ปกติ'}
                                              </span>
                                              <span className="inline-flex items-center px-2 py-1 rounded-full bg-[#F2F7F1] text-[#3A5A40] text-xs font-medium">
                                                {locale === 'en' ? '                                                 ออเดอร์: ' : locale === 'zh' ? '                                                 ออเดอร์: ' : '                                                 ออเดอร์: '}{house.order_count}
                                              </span>
                                            </div>
                                            <div className="mt-3 flex justify-end">
                                              <button
                                                className="px-4 py-1.5 bg-[#3A5A40] text-white rounded-lg font-medium shadow hover:bg-[#2C4631] transition-all duration-200 text-xs"
                                                onClick={e => {
                                                  e.stopPropagation();
                                                  setSelectedHouse(house);
                                                }}
                                              >
                                                {locale === 'en' ? 'View details' : locale === 'zh' ? '查看详情' : '                                                 ดูรายละเอียด                                               '}</button>
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    ) : (
                                      <div className="text-center py-8 text-[#B0B0B0] text-lg font-medium">{locale === 'en' ? 'ยังไม่มีบ้านที่เชื่อมโยง' : locale === 'zh' ? 'ยังไม่มีบ้านที่เชื่อมโยง' : 'ยังไม่มีบ้านที่เชื่อมโยง'}</div>
                                    )}
                                  </div>
                                )}
                              </div>
                              {/* Orders Section */}
                              <div>
                                <div className="flex justify-between items-center mb-3">
                                  <h4 className="text-md font-semibold text-gray-800">{locale === 'en' ? 'ออเดอร์ (' : locale === 'zh' ? 'ออเดอร์ (' : 'ออเดอร์ ('}{orders.filter(o => o.customer_id === user.id).length})</h4>
                                </div>
                                {orders.filter(o => o.customer_id === user.id).length > 0 ? (
                                  <div className="grid grid-cols-1 gap-3">
                                    {orders.filter(o => o.customer_id === user.id).map((order) => (
                                      <div key={order.id} className="bg-amber-50 border border-amber-200 p-3 rounded-lg">
                                        <div className="flex justify-between items-start">
                                          <div>
                                            <div className="font-medium text-amber-900">{locale === 'en' ? 'ออเดอร์ #' : locale === 'zh' ? 'ออเดอร์ #' : 'ออเดอร์ #'}{order.id}</div>
                                            <div className="text-xs text-amber-700 mt-1">
                                              {locale === 'en' ? '                                               วันที่: ' : locale === 'zh' ? '                                               วันที่: ' : '                                               วันที่: '}{order.created_at ? new Date(order.created_at).toLocaleDateString('th-TH') : '-'}
                                            </div>
                                            {order.service_type && (
                                              <div className="text-xs text-amber-600 mt-1">{locale === 'en' ? 'serve:' : locale === 'zh' ? '服务：' : 'บริการ: '}{order.service_type}</div>
                                            )}
                                          </div>
                                          <div className="text-right">
                                            <div className="text-xs text-amber-600">{locale === 'en' ? 'สถานะ: ' : locale === 'zh' ? 'สถานะ: ' : 'สถานะ: '}{order.status}</div>
                                            <div className="text-xs text-amber-600 font-medium">{locale === 'en' ? '฿' : locale === 'zh' ? '฿' : '฿'}{order.total || 0}</div>
                                          </div>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  <div className="text-center py-8 text-gray-500">
                                    <div className="text-sm">{locale === 'en' ? 'ยังไม่มีออเดอร์' : locale === 'zh' ? 'ยังไม่มีออเดอร์' : 'ยังไม่มีออเดอร์'}</div>
                                  </div>
                                )}
                              </div>
                              {/* Documents Section */}
                              <div>
                                <div className="flex justify-between items-center mb-3">
                                  <h4 className="text-md font-semibold text-gray-800">{locale === 'en' ? 'เอกสาร (' : locale === 'zh' ? 'เอกสาร (' : 'เอกสาร ('}{documents.filter(d => d.user_id === user.id).length})</h4>
                                </div>
                                {documents.filter(d => d.user_id === user.id).length > 0 ? (
                                  <div className="grid grid-cols-1 gap-3">
                                    {documents.filter(d => d.user_id === user.id).map((doc) => (
                                      <div key={doc.id} className="bg-purple-50 border border-purple-200 p-3 rounded-lg">
                                        <div className="flex justify-between items-start">
                                          <div>
                                            <div className="font-medium text-purple-900">{doc.type}</div>
                                            <div className="text-xs text-purple-700 mt-1">
                                              {locale === 'en' ? '                                               วันที่: ' : locale === 'zh' ? '                                               วันที่: ' : '                                               วันที่: '}{doc.created_at ? new Date(doc.created_at).toLocaleDateString('th-TH') : '-'}
                                            </div>
                                            {doc.description && (
                                              <div className="text-xs text-purple-600 mt-1">{doc.description}</div>
                                            )}
                                          </div>
                                          <div className="text-right">
                                            <div className="text-xs text-purple-600">{locale === 'en' ? 'สถานะ: ' : locale === 'zh' ? 'สถานะ: ' : 'สถานะ: '}{doc.status || 'ปกติ'}</div>
                                          </div>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  <div className="text-center py-8 text-gray-500">
                                    <div className="text-sm">{locale === 'en' ? 'ยังไม่มีเอกสาร' : locale === 'zh' ? 'ยังไม่มีเอกสาร' : 'ยังไม่มีเอกสาร'}</div>
                                  </div>
                                )}
                              </div>
                            </div>
                          </td>
                        </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile: Card List */}
            <div className="sm:hidden space-y-4 mt-4">
              {users.map((user) => {
                  const { locale } = useI18n();
                const houseCount = housesWithOrderInfo.filter(h => h.user_id === user.id || h.customer_id === user.id).length;
                return (
                  <div
                    key={user.id}
                    className={`bg-white rounded-xl shadow-md p-4 border border-gray-100 transition-all duration-200 ${expandedUserId === user.id ? 'ring-2 ring-green-400 bg-green-50' : ''}`}
                    onClick={() => setExpandedUserId(expandedUserId === user.id ? null : user.id)}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex-1">
                        <div className="font-bold text-lg text-gray-900 break-words">{user.display_name}</div>
                        <div className="text-gray-500 text-sm break-all">{user.email}</div>
                        <div className="text-xs text-gray-400 mt-1">
                          {locale === 'en' ? 'code:' : locale === 'zh' ? '代码：' : '                           รหัส: '}{user.role === 'customer' ? user.customer_base_code || '-' : user.staff_code || '-'}
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                          user.role === 'customer' 
                            ? 'bg-blue-100 text-blue-700' 
                            : user.role === 'staff'
                              ? 'bg-green-100 text-green-700'
                              : 'bg-purple-100 text-purple-700'
                        }`}>
                          {user.role === 'customer' ? 'ลูกค้า' : user.role === 'staff' ? 'พนักงาน' : 'แอดมิน'}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-gray-500">{locale === 'en' ? 'house:' : locale === 'zh' ? '房子：' : 'บ้าน:'}</span>
                          <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-gray-100 text-gray-700 text-xs font-bold">
                            {houseCount}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Mobile Actions */}
                    <div className="flex flex-wrap gap-2 mb-3">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCopy(user);
                        }}
                        className="flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-md hover:bg-gray-200 transition-colors"
                      >
                        <ClipboardIcon className="w-3 h-3" />
                        {copiedUserId === user.id ? 'คัดลอกแล้ว!' : 'คัดลอก'}
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingUserId(user.id);
                        }}
                        className="flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-md hover:bg-blue-200 transition-colors"
                      >
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                        {locale === 'en' ? 'correct' : locale === 'zh' ? '正确的' : '                         แก้ไข                       '}</button>
                      {user.role === 'customer' && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            window.location.href = `/dashboard/admin/users/${user.id}/add-house`;
                          }}
                          className="flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 text-xs rounded-md hover:bg-green-200 transition-colors"
                        >
                          <PlusIcon className="w-3 h-3" />
                          {locale === 'en' ? '                           เพิ่มบ้าน                         ' : locale === 'zh' ? '                           เพิ่มบ้าน                         ' : '                           เพิ่มบ้าน                         '}</button>
                      )}
                    </div>

                    {/* Mobile Expanded Content */}
                    {expandedUserId === user.id && (
                      <div className="mt-4 pt-4 border-t border-gray-200 animate-fade-in">
                        {/* User Info */}
                        <div className="grid grid-cols-1 gap-3 mb-4">
                          <div className="bg-gray-50 p-3 rounded-lg">
                            <div className="text-xs font-medium text-gray-600 mb-1">{locale === 'en' ? 'Email' : locale === 'zh' ? '电子邮件' : 'อีเมล'}</div>
                            <div className="text-sm text-gray-800 break-all">{user.email}</div>
                          </div>
                          <div className="bg-gray-50 p-3 rounded-lg">
                            <div className="text-xs font-medium text-gray-600 mb-1">{locale === 'en' ? 'บทบาท' : locale === 'zh' ? 'บทบาท' : 'บทบาท'}</div>
                            <div className="text-sm text-gray-800">
                              {user.role === 'customer' ? 'ลูกค้า' : 'พนักงาน'}
                            </div>
                          </div>
                          {user.branch_code && (
                            <div className="bg-gray-50 p-3 rounded-lg">
                              <div className="text-xs font-medium text-gray-600 mb-1">{locale === 'en' ? 'สาขา' : locale === 'zh' ? 'สาขา' : 'สาขา'}</div>
                              <div className="text-sm text-gray-800">
                                {branchMap[String(user.branch_code)] || user.branch_code}
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Houses Summary for Mobile */}
                        <div className="mb-4">
                          <button
                            className={`w-full flex items-center justify-between px-4 py-3 rounded-lg border border-[#3A5A40] bg-white shadow-sm hover:shadow-md transition-all duration-200 ${showHousesUserId === user.id ? 'ring-1 ring-[#3A5A40]' : ''}`}
                            onClick={e => {
                              e.stopPropagation();
                              setShowHousesUserId(showHousesUserId === user.id ? null : user.id);
                            }}
                          >
                            <div className="flex items-center gap-2">
                              <HomeIcon className="w-5 h-5 text-[#3A5A40]" />
                              <div className="text-left">
                                <div className="font-medium text-sm text-[#222]">{locale === 'en' ? 'บ้านที่เชื่อมโยง' : locale === 'zh' ? 'บ้านที่เชื่อมโยง' : 'บ้านที่เชื่อมโยง'}</div>
                                <div className="text-xs text-[#3A5A40]">{houseCount} {locale === 'en' ? 'behind' : locale === 'zh' ? '在后面' : ' หลัง'}</div>
                              </div>
                            </div>
                            <span className={`transition-transform duration-200 ${showHousesUserId === user.id ? 'rotate-90' : ''}`}>
                              <svg className="w-4 h-4 text-[#3A5A40]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                              </svg>
                            </span>
                          </button>

                          {/* Mobile House List */}
                          {showHousesUserId === user.id && (
                            <div className="mt-3">
                              {housesWithOrderInfo.filter(h => h.user_id === user.id).length > 0 ? (
                                <div className="space-y-3">
                                  {housesWithOrderInfo.filter(h => h.user_id === user.id).map((house) => (
                                    <div
                                      key={house.house_code}
                                      className="bg-white border border-[#3A5A40] p-3 rounded-lg cursor-pointer hover:bg-[#F2F7F1] transition-colors"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setSelectedHouse(house);
                                      }}
                                    >
                                      <div className="flex justify-between items-start">
                                        <div className="flex-1">
                                          <div className="font-medium text-[#3A5A40] text-sm">{house.name}</div>
                                          <div className="text-xs text-[#3A5A40] mt-1">{locale === 'en' ? 'code:' : locale === 'zh' ? '代码：' : 'รหัส: '}{house.house_code}</div>
                                          <div className="text-xs text-[#3A5A40] mt-1">{house.address}</div>
                                        </div>
                                        <div className="text-right">
                                          <div className="text-xs text-[#3A5A40]">{locale === 'en' ? 'ออเดอร์: ' : locale === 'zh' ? 'ออเดอร์: ' : 'ออเดอร์: '}{house.order_count}</div>
                                          <div className="text-xs text-[#3A5A40]">{locale === 'en' ? 'สถานะ: ' : locale === 'zh' ? 'สถานะ: ' : 'สถานะ: '}{house.status}</div>
                                        </div>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <div className="text-center py-6 text-gray-500 text-sm">{locale === 'en' ? 'ยังไม่มีบ้านที่เชื่อมโยง' : locale === 'zh' ? 'ยังไม่มีบ้านที่เชื่อมโยง' : 'ยังไม่มีบ้านที่เชื่อมโยง'}</div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Add House Form */}
          {showAddHouse && (
            <div className="bg-white p-6 rounded-xl shadow-sm mt-8 max-w-md mx-auto border border-gray-100">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h2 className="text-xl font-bold text-gray-900 mb-1">{locale === 'en' ? 'เพิ่มบ้านให้ลูกค้า' : locale === 'zh' ? 'เพิ่มบ้านให้ลูกค้า' : 'เพิ่มบ้านให้ลูกค้า'}</h2>
                  <p className="text-gray-600 text-sm">{locale === 'en' ? 'เพิ่มข้อมูลบ้านใหม่' : locale === 'zh' ? 'เพิ่มข้อมูลบ้านใหม่' : 'เพิ่มข้อมูลบ้านใหม่'}</p>
                </div>
                <button 
                  onClick={() => setShowAddHouse(null)} 
                  className="text-gray-400 hover:text-gray-600 text-2xl hover:scale-110 transition-transform duration-200"
                >
                  ×
                </button>
              </div>
              <form onSubmit={handleAddHouse} className="space-y-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">{locale === 'en' ? 'ชื่อบ้าน' : locale === 'zh' ? 'ชื่อบ้าน' : 'ชื่อบ้าน'}</label>
                  <input 
                    autoFocus 
                    type="text" 
                    required 
                    className="w-full border border-gray-300 px-4 py-2 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200" 
                    value={newHouse.name} 
                    onChange={e => setNewHouse({ ...newHouse, name: e.target.value })} 
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">{locale === 'en' ? 'ที่อยู่บ้าน' : locale === 'zh' ? 'ที่อยู่บ้าน' : 'ที่อยู่บ้าน'}</label>
                  <input 
                    type="text" 
                    required 
                    className="w-full border border-gray-300 px-4 py-2 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200" 
                    value={newHouse.address || ""} 
                    onChange={e => setNewHouse({ ...newHouse, address: e.target.value })} 
                  />
                </div>
                <div className="flex justify-end gap-4 pt-4">
                  <button 
                    type="button" 
                    onClick={() => setShowAddHouse(null)} 
                    className="px-6 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-all duration-200"
                  >
                    {locale === 'en' ? 'cancel' : locale === 'zh' ? '取消' : '                     ยกเลิก                   '}</button>
                  <button 
                    type="submit" 
                    className="px-6 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all duration-200 shadow-md"
                  >
                    {locale === 'en' ? '                     บันทึก                   ' : locale === 'zh' ? '                     บันทึก                   ' : '                     บันทึก                   '}</button>
                </div>
              </form>
            </div>
          )}

          {/* House Detail Modal */}
          {selectedHouse && (
            <div className="fixed inset-0 z-50 bg-black/20 transition-opacity duration-300">
              {/* Desktop: Slide from right */}
              <div className="hidden md:block fixed top-0 right-0 w-[400px] h-full bg-white shadow-2xl transform transition-transform duration-300 ease-out">
                <div className="flex flex-col h-full">
                  {/* Header */}
                  <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gray-50">
                    <div className="flex items-center gap-4">
                      <h2 className="text-xl font-bold text-gray-900">{locale === 'en' ? 'รายละเอียดบ้าน' : locale === 'zh' ? 'รายละเอียดบ้าน' : 'รายละเอียดบ้าน'}</h2>
                      <button 
                        onClick={() => window.location.href = `/dashboard/admin/houses/${selectedHouse.id}/collaborators`}
                        className="text-xs px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full hover:bg-emerald-200 transition-colors font-medium"
                      >
                        {locale === 'en' ? '                         จัดการผู้ดูแลบ้าน                       ' : locale === 'zh' ? '                         จัดการผู้ดูแลบ้าน                       ' : '                         จัดการผู้ดูแลบ้าน                       '}</button>
                    </div>
                    <button 
                      className="text-gray-400 hover:text-red-600 text-2xl transition-colors" 
                      onClick={() => setSelectedHouse(null)}
                      aria-label={locale === 'en' ? 'ปิด' : locale === 'zh' ? 'ปิด' : 'ปิด'}
                    >
                      ×
                    </button>
                  </div>
                  
                  {/* Content */}
                  <div className="flex-1 overflow-y-auto p-6">
                    <div className="mb-4">
                      <h3 className="text-lg font-semibold text-gray-900 mb-1">{selectedHouse.name}</h3>
                      <p className="text-gray-500 text-sm mb-2">{selectedHouse.address}</p>
                      <span className="inline-block bg-gray-100 text-gray-600 text-xs font-mono px-2 py-1 rounded">
                        {selectedHouse.house_code}
                      </span>
                    </div>
                    
                    <div className="space-y-3 text-sm">
                      {selectedHouse.zip_code && (
                        <div className="flex justify-between">
                          <span className="font-medium text-gray-600">{locale === 'en' ? 'zip code:' : locale === 'zh' ? '邮政编码：' : 'รหัสไปรษณีย์:'}</span>
                          <span className="text-gray-900">{selectedHouse.zip_code}</span>
                        </div>
                      )}
                      {selectedHouse.branch_code && (
                        <div className="flex justify-between">
                          <span className="font-medium text-gray-600">{locale === 'en' ? 'สาขา:' : locale === 'zh' ? 'สาขา:' : 'สาขา:'}</span>
                          <span className="text-gray-900">{branchMap[selectedHouse.branch_code] || selectedHouse.branch_code}</span>
                        </div>
                      )}
                      {selectedHouse.house_type && (
                        <div className="flex justify-between">
                          <span className="font-medium text-gray-600">{locale === 'en' ? 'ประเภทบ้าน:' : locale === 'zh' ? 'ประเภทบ้าน:' : 'ประเภทบ้าน:'}</span>
                          <span className="text-gray-900">{selectedHouse.house_type}</span>
                        </div>
                      )}
                      {selectedHouse.area_size && (
                        <div className="flex justify-between">
                          <span className="font-medium text-gray-600">{locale === 'en' ? 'Area size:' : locale === 'zh' ? '面积大小：' : 'ขนาดพื้นที่:'}</span>
                          <span className="text-gray-900">{selectedHouse.area_size} {locale === 'en' ? 'sq m.' : locale === 'zh' ? '平方米。' : ' ตร.ม.'}</span>
                        </div>
                      )}
                      {selectedHouse.phone_number && (
                        <div className="flex justify-between">
                          <span className="font-medium text-gray-600">{locale === 'en' ? 'เบอร์ติดต่อ:' : locale === 'zh' ? 'เบอร์ติดต่อ:' : 'เบอร์ติดต่อ:'}</span>
                          <span className="text-gray-900">{selectedHouse.phone_number}</span>
                        </div>
                      )}
                      {selectedHouse.contact_person && (
                        <div className="flex justify-between">
                          <span className="font-medium text-gray-600">{locale === 'en' ? 'ชื่อผู้ติดต่อ:' : locale === 'zh' ? 'ชื่อผู้ติดต่อ:' : 'ชื่อผู้ติดต่อ:'}</span>
                          <span className="text-gray-900">{selectedHouse.contact_person}</span>
                        </div>
                      )}
                      {selectedHouse.key_location && (
                        <div className="flex justify-between">
                          <span className="font-medium text-gray-600">{locale === 'en' ? 'จุดรับกุญแจ:' : locale === 'zh' ? 'จุดรับกุญแจ:' : 'จุดรับกุญแจ:'}</span>
                          <span className="text-gray-900">{selectedHouse.key_location}</span>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <span className="font-medium text-gray-600">{locale === 'en' ? 'ที่จอดรถ:' : locale === 'zh' ? 'ที่จอดรถ:' : 'ที่จอดรถ:'}</span>
                        <span className="text-gray-900">
                          {selectedHouse.parking_available ? `มี (${selectedHouse.parking_spaces || 0} คัน)` : 'ไม่มี'}
                        </span>
                      </div>
                      {selectedHouse.service_days && selectedHouse.service_days.length > 0 && (
                        <div className="flex justify-between">
                          <span className="font-medium text-gray-600">{locale === 'en' ? 'วันให้บริการ:' : locale === 'zh' ? 'วันให้บริการ:' : 'วันให้บริการ:'}</span>
                          <span className="text-gray-900">{selectedHouse.service_days.join(', ')}</span>
                        </div>
                      )}
                      {selectedHouse.special_notes && (
                        <div className="pt-2 border-t border-gray-200">
                          <span className="font-medium text-gray-600 block mb-1">{locale === 'en' ? 'รายละเอียดเพิ่มเติม:' : locale === 'zh' ? 'รายละเอียดเพิ่มเติม:' : 'รายละเอียดเพิ่มเติม:'}</span>
                          <span className="text-gray-900 text-sm">{selectedHouse.special_notes}</span>
                        </div>
                      )}
                      {selectedHouse.created_at && (
                        <div className="flex justify-between pt-2 border-t border-gray-200 text-xs">
                          <span className="font-medium text-gray-500">{locale === 'en' ? 'Added on:' : locale === 'zh' ? '添加于：' : 'เพิ่มเมื่อ:'}</span>
                          <span className="text-gray-500">{new Date(selectedHouse.created_at).toLocaleDateString('th-TH')}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Mobile: Slide from bottom */}
              <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white rounded-t-2xl shadow-2xl max-h-[80vh] transform transition-transform duration-300 ease-out">
                <div className="flex flex-col h-full">
                  {/* Header */}
                  <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gray-50 rounded-t-2xl">
                    <div className="flex items-center gap-3">
                      <h2 className="text-lg font-bold text-gray-900">{locale === 'en' ? 'รายละเอียดบ้าน' : locale === 'zh' ? 'รายละเอียดบ้าน' : 'รายละเอียดบ้าน'}</h2>
                      <button 
                        onClick={() => window.location.href = `/dashboard/admin/houses/${selectedHouse.id}/collaborators`}
                        className="text-[10px] px-2 py-1 bg-emerald-100 text-emerald-700 rounded-full hover:bg-emerald-200 transition-colors font-medium"
                      >
                        {locale === 'en' ? '                         จัดการผู้ดูแล                       ' : locale === 'zh' ? '                         จัดการผู้ดูแล                       ' : '                         จัดการผู้ดูแล                       '}</button>
                    </div>
                    <button 
                      className="text-gray-400 hover:text-red-600 text-2xl transition-colors" 
                      onClick={() => setSelectedHouse(null)}
                      aria-label={locale === 'en' ? 'ปิด' : locale === 'zh' ? 'ปิด' : 'ปิด'}
                    >
                      ×
                    </button>
                  </div>
                  
                  {/* Content */}
                  <div className="flex-1 overflow-y-auto p-4">
                    <div className="mb-4">
                      <h3 className="text-lg font-semibold text-gray-900 mb-1">{selectedHouse.name}</h3>
                      <p className="text-gray-500 text-sm mb-2">{selectedHouse.address}</p>
                      <span className="inline-block bg-gray-100 text-gray-600 text-xs font-mono px-2 py-1 rounded">
                        {selectedHouse.house_code}
                      </span>
                    </div>
                    
                    <div className="space-y-3 text-sm">
                      {selectedHouse.zip_code && (
                        <div className="flex justify-between">
                          <span className="font-medium text-gray-600">{locale === 'en' ? 'zip code:' : locale === 'zh' ? '邮政编码：' : 'รหัสไปรษณีย์:'}</span>
                          <span className="text-gray-900">{selectedHouse.zip_code}</span>
                        </div>
                      )}
                      {selectedHouse.branch_code && (
                        <div className="flex justify-between">
                          <span className="font-medium text-gray-600">{locale === 'en' ? 'สาขา:' : locale === 'zh' ? 'สาขา:' : 'สาขา:'}</span>
                          <span className="text-gray-900">{branchMap[selectedHouse.branch_code] || selectedHouse.branch_code}</span>
                        </div>
                      )}
                      {selectedHouse.house_type && (
                        <div className="flex justify-between">
                          <span className="font-medium text-gray-600">{locale === 'en' ? 'ประเภทบ้าน:' : locale === 'zh' ? 'ประเภทบ้าน:' : 'ประเภทบ้าน:'}</span>
                          <span className="text-gray-900">{selectedHouse.house_type}</span>
                        </div>
                      )}
                      {selectedHouse.area_size && (
                        <div className="flex justify-between">
                          <span className="font-medium text-gray-600">{locale === 'en' ? 'Area size:' : locale === 'zh' ? '面积大小：' : 'ขนาดพื้นที่:'}</span>
                          <span className="text-gray-900">{selectedHouse.area_size} {locale === 'en' ? 'sq m.' : locale === 'zh' ? '平方米。' : ' ตร.ม.'}</span>
                        </div>
                      )}
                      {selectedHouse.phone_number && (
                        <div className="flex justify-between">
                          <span className="font-medium text-gray-600">{locale === 'en' ? 'เบอร์ติดต่อ:' : locale === 'zh' ? 'เบอร์ติดต่อ:' : 'เบอร์ติดต่อ:'}</span>
                          <span className="text-gray-900">{selectedHouse.phone_number}</span>
                        </div>
                      )}
                      {selectedHouse.contact_person && (
                        <div className="flex justify-between">
                          <span className="font-medium text-gray-600">{locale === 'en' ? 'ชื่อผู้ติดต่อ:' : locale === 'zh' ? 'ชื่อผู้ติดต่อ:' : 'ชื่อผู้ติดต่อ:'}</span>
                          <span className="text-gray-900">{selectedHouse.contact_person}</span>
                        </div>
                      )}
                      {selectedHouse.key_location && (
                        <div className="flex justify-between">
                          <span className="font-medium text-gray-600">{locale === 'en' ? 'จุดรับกุญแจ:' : locale === 'zh' ? 'จุดรับกุญแจ:' : 'จุดรับกุญแจ:'}</span>
                          <span className="text-gray-900">{selectedHouse.key_location}</span>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <span className="font-medium text-gray-600">{locale === 'en' ? 'ที่จอดรถ:' : locale === 'zh' ? 'ที่จอดรถ:' : 'ที่จอดรถ:'}</span>
                        <span className="text-gray-900">
                          {selectedHouse.parking_available ? `มี (${selectedHouse.parking_spaces || 0} คัน)` : 'ไม่มี'}
                        </span>
                      </div>
                      {selectedHouse.service_days && selectedHouse.service_days.length > 0 && (
                        <div className="flex justify-between">
                          <span className="font-medium text-gray-600">{locale === 'en' ? 'วันให้บริการ:' : locale === 'zh' ? 'วันให้บริการ:' : 'วันให้บริการ:'}</span>
                          <span className="text-gray-900">{selectedHouse.service_days.join(', ')}</span>
                        </div>
                      )}
                      {selectedHouse.special_notes && (
                        <div className="pt-2 border-t border-gray-200">
                          <span className="font-medium text-gray-600 block mb-1">{locale === 'en' ? 'รายละเอียดเพิ่มเติม:' : locale === 'zh' ? 'รายละเอียดเพิ่มเติม:' : 'รายละเอียดเพิ่มเติม:'}</span>
                          <span className="text-gray-900 text-sm">{selectedHouse.special_notes}</span>
                        </div>
                      )}
                      {selectedHouse.created_at && (
                        <div className="flex justify-between pt-2 border-t border-gray-200 text-xs">
                          <span className="font-medium text-gray-500">{locale === 'en' ? 'Added on:' : locale === 'zh' ? '添加于：' : 'เพิ่มเมื่อ:'}</span>
                          <span className="text-gray-500">{new Date(selectedHouse.created_at).toLocaleDateString('th-TH')}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

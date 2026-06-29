"use client";
import { useEffect, useState } from "react";
import { supabase } from "../../../../lib/supabaseClient";
import { PlusIcon, UserIcon, ClipboardIcon, TrashIcon } from "@heroicons/react/24/outline";
import { getBranches } from '@/lib/supabaseClient';
import { useI18n } from "@/lib/I18nContext";

interface UserRow {
  id: string;
  email: string;
  display_name: string;
  role: "customer" | "staff";
  customer_base_code?: string;
  staff_code?: string;
  branch_code?: string;
}

interface HouseRow {
  id: string;
  house_code: string;
  name: string;
  user_id: string;
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

export default function AdminUsersPage() {
    const { locale } = useI18n();
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddUser, setShowAddUser] = useState(false);
  const [showAddHouse, setShowAddHouse] = useState<string | null>(null);
  const [newUser, setNewUser] = useState({ email: "", password: "", display_name: "", role: "customer" as "customer" | "staff" });
  const [newHouse, setNewHouse] = useState({ name: "", user_id: "", address: "" });
  const [houses, setHouses] = useState<HouseRow[]>([]);
  const [toast, setToast] = useState<string | null>(null);
  const [toastVisible, setToastVisible] = useState(false);
  const [copiedUserId, setCopiedUserId] = useState<string | null>(null);
  const [expandedUserId, setExpandedUserId] = useState<string | null>(null);
  const [branchMap, setBranchMap] = useState<{ [code: string]: string }>({});
  const [orders, setOrders] = useState<any[]>([]);
  const [documents, setDocuments] = useState<any[]>([]);
  const [branches, setBranches] = useState<any[]>([]);

  useEffect(() => {
    checkCurrentUser();
    fetchUsers();
    fetchHouses();
    getBranches().then(({ data }) => {
      setBranches(data || []);
      const branchMapObj: Record<string, string> = {};
      (data || []).forEach((b: any) => { branchMapObj[String(b.branch_code)] = b.branch_name });
      setBranchMap(branchMapObj);
    });
  }, []);

  const showToast = (msg: string) => {
    setToast(msg);
    setToastVisible(true);
    setTimeout(() => setToastVisible(false), 1800);
    setTimeout(() => setToast(null), 2300);
  };

  // Auto-save user data when inline fields change
  const handleFieldUpdate = async (userId: string, field: string, value: any) => {
    if (!supabase) {
      showToast('เกิดข้อผิดพลาดในการเชื่อมต่อฐานข้อมูล');
      return;
    }
    
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ [field]: value })
        .eq('id', userId);

      if (error) throw error;

      showToast('บันทึกข้อมูลเรียบร้อย');
      
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
    if (!supabase) { setError("ไม่สามารถเชื่อมต่อฐานข้อมูล"); setLoading(false); return; }
    setLoading(true);
    setError(null);
    const { data, error } = await supabase
      .from("profiles")
      .select("id, email, display_name, role, customer_base_code, staff_code, branch_code")
      .in("role", ["customer", "staff"])
      .order("created_at", { ascending: false });
    
    if (error) {
      setError(error.message);
    } else {
      setUsers(data || []);
      console.log("=== DEBUG USERS ===", data);
    }
    setLoading(false);
  }

  async function fetchHouses() {
    if (!supabase) { setError("ไม่สามารถเชื่อมต่อฐานข้อมูล"); return; }
    console.log("=== FETCHING HOUSES ===");
    try {
      const { data, error } = await supabase
        .from("houses")
        .select("id, house_code, name, user_id, address, zip_code, branch_code, house_type, area_size, phone_number, contact_person, key_location, special_notes, parking_available, parking_spaces, service_days");
      console.log("=== HOUSES RAW RESPONSE ===", { data, error });
      if (error) {
        console.error("=== HOUSES ERROR DETAILS ===", {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        });
        setError(`ข้อผิดพลาดในการดึงข้อมูลบ้าน: ${error.message}`);
        return;
      }
      if (data) {
        setHouses(data);
        console.log("=== DEBUG HOUSES ===", data);
      } else {
        console.log("=== NO HOUSES DATA ===");
        setHouses([]);
      }
    } catch (err) {
      console.error("=== FETCH HOUSES EXCEPTION ===", err);
      setError(`ข้อผิดพลาดที่ไม่คาดคิด: ${err}`);
    }
  }

  async function handleAddUser(e: React.FormEvent) {
    e.preventDefault();
    if (!supabase) { setError("ไม่สามารถเชื่อมต่อฐานข้อมูล"); return; }
    setError(null);
    const { data, error } = await supabase.auth.signUp({
      email: newUser.email,
      password: newUser.password,
      options: { data: { display_name: newUser.display_name, role: newUser.role } }
    });
    if (error) { setError(error.message); return; }
    setShowAddUser(false);
    setNewUser({ email: "", password: "", display_name: "", role: "customer" });
    await fetchUsers();
  }

  async function handleAddHouse(e: React.FormEvent) {
    e.preventDefault();
    if (!supabase) { setError("ไม่สามารถเชื่อมต่อฐานข้อมูล"); return; }
    setError(null);
    if (!showAddHouse) return;
    const { data, error } = await supabase
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
    const { error } = await supabase.from("profiles").delete().eq("id", user.id);
    if (error) { setError(error.message); return; }
    await fetchUsers();
    await fetchHouses();
    showToast('ลบผู้ใช้งานสำเร็จ');
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
    <div className="max-w-7xl mx-auto px-6 py-8 bg-gradient-to-br from-gray-50 via-white to-gray-50 min-h-screen">
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
                    <th className="px-6 py-4 text-left font-semibold text-gray-700">{locale === 'en' ? 'ชื่อที่แสดง' : locale === 'zh' ? 'ชื่อที่แสดง' : 'ชื่อที่แสดง'}</th>
                    <th className="px-6 py-4 text-left font-semibold text-gray-700">{locale === 'en' ? 'Email' : locale === 'zh' ? '电子邮件' : 'อีเมล'}</th>
                    <th className="px-6 py-4 text-left font-semibold text-gray-700">{locale === 'en' ? 'บทบาท' : locale === 'zh' ? 'บทบาท' : 'บทบาท'}</th>
                    <th className="px-6 py-4 text-left font-semibold text-gray-700">{locale === 'en' ? 'สาขา' : locale === 'zh' ? 'สาขา' : 'สาขา'}</th>
                    <th className="px-6 py-4 text-center font-semibold text-gray-700">{locale === 'en' ? 'จำนวนบ้าน' : locale === 'zh' ? 'จำนวนบ้าน' : 'จำนวนบ้าน'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {users.map((user) => {
                      const { locale } = useI18n();
                    const houseCount = housesWithOrderInfo.filter(h => h.user_id === user.id).length;
                    return (
                      <>
                        <tr
                          key={user.id}
                          className={`hover:bg-gradient-to-r hover:from-gray-50 hover:to-gray-100 transition-all duration-200 group cursor-pointer text-base ${expandedUserId === user.id ? 'bg-green-50' : ''}`}
                          onClick={() => setExpandedUserId(expandedUserId === user.id ? null : user.id)}
                        >
                          <td className="px-6 py-4">
                            <span className="font-mono text-sm text-gray-700 bg-gradient-to-r from-gray-100 to-gray-200 px-4 py-2 rounded-lg border border-gray-200 shadow-sm flex items-center justify-center min-w-[80px]">
                              {user.role === 'customer' ? user.customer_base_code || '-' : user.staff_code || '-'}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <div className="font-medium text-gray-900">{user.display_name}</div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-gray-600">{user.email}</div>
                          </td>
                          <td className="px-6 py-4">
                            {user.role === 'customer' ? (
                              <span className="inline-flex items-center px-3 py-1 rounded-full bg-gradient-to-r from-blue-100 to-blue-200 text-blue-700 text-sm font-medium shadow-sm">
                                {locale === 'en' ? 'customer' : locale === 'zh' ? '顾客' : '                                 ลูกค้า                               '}</span>
                            ) : (
                              <span className="inline-flex items-center px-3 py-1 rounded-full bg-gradient-to-r from-green-100 to-green-200 text-green-700 text-sm font-medium shadow-sm">
                                {locale === 'en' ? 'employee' : locale === 'zh' ? '员工' : '                                 พนักงาน                               '}</span>
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
                            <td colSpan={6} className="bg-white px-8 py-6 border-t border-b border-green-100 animate-fade-in">
                              {/* Inline Editing User Info */}
                              <div className="space-y-6">
                                <div>
                                  <div className="flex justify-between items-center mb-4">
                                    <h3 className="text-lg font-semibold text-gray-800">{locale === 'en' ? 'ข้อมูลผู้ใช้ (แก้ไขได้ทันที)' : locale === 'zh' ? 'ข้อมูลผู้ใช้ (แก้ไขได้ทันที)' : 'ข้อมูลผู้ใช้ (แก้ไขได้ทันที)'}</h3>
                                    <div className="flex items-center gap-2">
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
                                        {locale === 'en' ? '                                         ลบ                                       ' : locale === 'zh' ? '                                         ลบ                                       ' : '                                         ลบ                                       '}</button>
                                    </div>
                                  </div>
                                  
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                                    <div className="bg-gray-50 p-3 rounded-lg">
                                      <div className="text-xs font-medium text-gray-600 mb-1">{locale === 'en' ? 'รหัสผู้ใช้' : locale === 'zh' ? 'รหัสผู้ใช้' : 'รหัสผู้ใช้'}</div>
                                      <div className="font-mono text-sm text-gray-800">{user.id}</div>
                                    </div>
                                    <div className="bg-gray-50 p-3 rounded-lg">
                                      <div className="text-xs font-medium text-gray-600 mb-1">{locale === 'en' ? 'Email' : locale === 'zh' ? '电子邮件' : 'อีเมล'}</div>
                                      <div className="text-sm text-gray-800">{user.email}</div>
                                    </div>

                                    {/* Inline Edit: Display Name */}
                                    <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
                                      <label className="block text-xs font-medium text-blue-600 mb-1">{locale === 'en' ? 'ชื่อที่แสดง' : locale === 'zh' ? 'ชื่อที่แสดง' : 'ชื่อที่แสดง'}</label>
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
                                        onBlur={() => handleFieldUpdate(user.id, 'display_name', user.display_name)}
                                      />
                                    </div>

                                    {/* Inline Edit: Role */}
                                    <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
                                      <label className="block text-xs font-medium text-blue-600 mb-1">{locale === 'en' ? 'บทบาท' : locale === 'zh' ? 'บทบาท' : 'บทบาท'}</label>
                                      <select
                                        className="w-full border-0 bg-transparent text-sm text-gray-800 focus:ring-2 focus:ring-blue-500 rounded px-2 py-1"
                                        value={user.role}
                                        onChange={async (e) => {
                                          const newRole = e.target.value as "customer" | "staff";
                                          setUsers(currentUsers =>
                                            currentUsers.map(u => (u.id === user.id ? { ...u, role: newRole } : u))
                                          );
                                          await handleFieldUpdate(user.id, 'role', newRole);
                                        }}
                                      >
                                        <option value="customer">{locale === 'en' ? 'customer' : locale === 'zh' ? '顾客' : 'ลูกค้า'}</option>
                                        <option value="staff">{locale === 'en' ? 'employee' : locale === 'zh' ? '员工' : 'พนักงาน'}</option>
                                      </select>
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
                                      <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
                                        <label className="block text-xs font-medium text-blue-600 mb-1">{locale === 'en' ? 'สาขา' : locale === 'zh' ? 'สาขา' : 'สาขา'}</label>
                                        <select
                                          className="w-full border-0 bg-transparent text-sm text-gray-800 focus:ring-2 focus:ring-blue-500 rounded px-2 py-1"
                                          value={user.branch_code || ''}
                                          onChange={async (e) => {
                                            const newBranchCode = e.target.value;
                                            setUsers(currentUsers =>
                                              currentUsers.map(u => (u.id === user.id ? { ...u, branch_code: newBranchCode } : u))
                                            );
                                            await handleFieldUpdate(user.id, 'branch_code', newBranchCode);
                                          }}
                                        >
                                          <option value="">{locale === 'en' ? 'เลือกสาขา' : locale === 'zh' ? 'เลือกสาขา' : 'เลือกสาขา'}</option>
                                          {branches.map(branch => (
                                            <option key={branch.branch_code} value={branch.branch_code}>
                                              {branch.branch_name}
                                            </option>
                                          ))}
                                        </select>
                                      </div>
                                    )}
                                  </div>
                                </div>

                                {/* Houses Section */}
                                <div>
                                  <div className="flex justify-between items-center mb-3">
                                    <h4 className="text-md font-semibold text-gray-800">{locale === 'en' ? 'บ้านที่เชื่อมโยง (' : locale === 'zh' ? 'บ้านที่เชื่อมโยง (' : 'บ้านที่เชื่อมโยง ('}{housesWithOrderInfo.filter(h => h.user_id === user.id).length})</h4>
                                    {user.role === 'customer' && (
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setShowAddHouse(user.id);
                                        }}
                                        className="flex items-center gap-1.5 px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-md hover:bg-green-200 transition-colors"
                                      >
                                        <PlusIcon className="w-3 h-3" />
                                        {locale === 'en' ? '                                         เพิ่มบ้าน                                       ' : locale === 'zh' ? '                                         เพิ่มบ้าน                                       ' : '                                         เพิ่มบ้าน                                       '}</button>
                                    )}
                                  </div>
                                  
                                  {housesWithOrderInfo.filter(h => h.user_id === user.id).length > 0 ? (
                                    <div className="grid grid-cols-1 gap-3">
                                      {housesWithOrderInfo.filter(h => h.user_id === user.id).map((house) => (
                                        <div key={house.house_code} className="bg-blue-50 border border-blue-200 p-3 rounded-lg">
                                          <div className="flex justify-between items-start">
                                            <div>
                                              <div className="font-medium text-blue-900">{house.name}</div>
                                              <div className="text-xs text-blue-700 mt-1">{locale === 'en' ? 'code:' : locale === 'zh' ? '代码：' : 'รหัส: '}{house.house_code}</div>
                                              <div className="text-xs text-blue-600 mt-1">{house.address}</div>
                                              {house.branch_code && (
                                                <div className="text-xs text-blue-600 mt-1">
                                                  {locale === 'en' ? '                                                   สาขา: ' : locale === 'zh' ? '                                                   สาขา: ' : '                                                   สาขา: '}{branchMap[String(house.branch_code)] || house.branch_code}
                                                </div>
                                              )}
                                            </div>
                                            <div className="text-right">
                                              <div className="text-xs text-blue-600">{locale === 'en' ? 'ออเดอร์: ' : locale === 'zh' ? 'ออเดอร์: ' : 'ออเดอร์: '}{house.order_count}</div>
                                              <div className="text-xs text-blue-600">{locale === 'en' ? 'สถานะ: ' : locale === 'zh' ? 'สถานะ: ' : 'สถานะ: '}{house.status}</div>
                                            </div>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  ) : (
                                    <div className="text-center py-8 text-gray-500">
                                      <div className="text-sm">{locale === 'en' ? 'ยังไม่มีบ้านที่เชื่อมโยง' : locale === 'zh' ? 'ยังไม่มีบ้านที่เชื่อมโยง' : 'ยังไม่มีบ้านที่เชื่อมโยง'}</div>
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
                                                {locale === 'en' ? '                                                 วันที่: ' : locale === 'zh' ? '                                                 วันที่: ' : '                                                 วันที่: '}{order.created_at ? new Date(order.created_at).toLocaleDateString('th-TH') : '-'}
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
                                                {locale === 'en' ? '                                                 วันที่: ' : locale === 'zh' ? '                                                 วันที่: ' : '                                                 วันที่: '}{doc.created_at ? new Date(doc.created_at).toLocaleDateString('th-TH') : '-'}
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
                      </>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile: Card List */}
            <div className="sm:hidden mt-4 space-y-4">
              {users.map((user) => {
                  const { locale } = useI18n();
                const houseCount = housesWithOrderInfo.filter(h => h.user_id === user.id).length;
                return (
                  <div
                    key={user.id}
                    className={`bg-white rounded-xl shadow-md p-4 flex flex-col gap-2 border border-gray-100 transition-all duration-200 ${expandedUserId === user.id ? 'ring-2 ring-green-400 bg-green-50' : ''}`}
                    onClick={() => setExpandedUserId(expandedUserId === user.id ? null : user.id)}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-bold text-lg text-gray-900">{user.display_name}</div>
                        <div className="text-gray-500 text-sm">{user.email}</div>
                        <div className="text-xs text-gray-400 mt-1">{locale === 'en' ? 'code:' : locale === 'zh' ? '代码：' : 'รหัส: '}{user.role === 'customer' ? user.customer_base_code || '-' : user.staff_code || '-'}</div>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <span className="inline-flex items-center px-3 py-1 rounded-full bg-gradient-to-r from-blue-100 to-blue-200 text-blue-700 text-xs font-medium shadow-sm mb-1">
                          {user.role === 'customer' ? 'ลูกค้า' : 'พนักงาน'}
                        </span>
                        <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-gradient-to-r from-gray-100 to-gray-200 text-gray-700 text-sm font-bold border border-gray-200 shadow-sm">
                          {houseCount}
                        </span>
                      </div>
                    </div>
                    {expandedUserId === user.id && (
                      <div className="mt-4 animate-fade-in">
                        {/* Mobile Inline Editing */}
                        <div className="space-y-6">
                          <div>
                            <div className="flex justify-between items-center mb-4">
                              <h3 className="text-lg font-semibold text-gray-800">{locale === 'en' ? 'ข้อมูลผู้ใช้ (แก้ไขได้ทันที)' : locale === 'zh' ? 'ข้อมูลผู้ใช้ (แก้ไขได้ทันที)' : 'ข้อมูลผู้ใช้ (แก้ไขได้ทันที)'}</h3>
                              <div className="flex items-center gap-2">
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
                                  {locale === 'en' ? '                                   ลบ                                 ' : locale === 'zh' ? '                                   ลบ                                 ' : '                                   ลบ                                 '}</button>
                              </div>
                            </div>
                            
                            <div className="grid grid-cols-1 gap-3 mb-6">
                              <div className="bg-gray-50 p-3 rounded-lg">
                                <div className="text-xs font-medium text-gray-600 mb-1">{locale === 'en' ? 'รหัสผู้ใช้' : locale === 'zh' ? 'รหัสผู้ใช้' : 'รหัสผู้ใช้'}</div>
                                <div className="font-mono text-sm text-gray-800">{user.id}</div>
                              </div>
                              <div className="bg-gray-50 p-3 rounded-lg">
                                <div className="text-xs font-medium text-gray-600 mb-1">{locale === 'en' ? 'Email' : locale === 'zh' ? '电子邮件' : 'อีเมล'}</div>
                                <div className="text-sm text-gray-800">{user.email}</div>
                              </div>

                              {/* Mobile Inline Edit: Display Name */}
                              <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
                                <label className="block text-xs font-medium text-blue-600 mb-1">{locale === 'en' ? 'ชื่อที่แสดง' : locale === 'zh' ? 'ชื่อที่แสดง' : 'ชื่อที่แสดง'}</label>
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
                                  onBlur={() => handleFieldUpdate(user.id, 'display_name', user.display_name)}
                                />
                              </div>

                              {/* Mobile Inline Edit: Role */}
                              <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
                                <label className="block text-xs font-medium text-blue-600 mb-1">{locale === 'en' ? 'บทบาท' : locale === 'zh' ? 'บทบาท' : 'บทบาท'}</label>
                                <select
                                  className="w-full border-0 bg-transparent text-sm text-gray-800 focus:ring-2 focus:ring-blue-500 rounded px-2 py-1"
                                  value={user.role}
                                  onChange={async (e) => {
                                    const newRole = e.target.value as "customer" | "staff";
                                    setUsers(currentUsers =>
                                      currentUsers.map(u => (u.id === user.id ? { ...u, role: newRole } : u))
                                    );
                                    await handleFieldUpdate(user.id, 'role', newRole);
                                  }}
                                >
                                  <option value="customer">{locale === 'en' ? 'customer' : locale === 'zh' ? '顾客' : 'ลูกค้า'}</option>
                                  <option value="staff">{locale === 'en' ? 'employee' : locale === 'zh' ? '员工' : 'พนักงาน'}</option>
                                </select>
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

                              {/* Mobile Inline Edit: Branch (for staff only) */}
                              {user.role === 'staff' && (
                                <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
                                  <label className="block text-xs font-medium text-blue-600 mb-1">{locale === 'en' ? 'สาขา' : locale === 'zh' ? 'สาขา' : 'สาขา'}</label>
                                  <select
                                    className="w-full border-0 bg-transparent text-sm text-gray-800 focus:ring-2 focus:ring-blue-500 rounded px-2 py-1"
                                    value={user.branch_code || ''}
                                    onChange={async (e) => {
                                      const newBranchCode = e.target.value;
                                      setUsers(currentUsers =>
                                        currentUsers.map(u => (u.id === user.id ? { ...u, branch_code: newBranchCode } : u))
                                      );
                                      await handleFieldUpdate(user.id, 'branch_code', newBranchCode);
                                    }}
                                  >
                                    <option value="">{locale === 'en' ? 'เลือกสาขา' : locale === 'zh' ? 'เลือกสาขา' : 'เลือกสาขา'}</option>
                                    {branches.map(branch => (
                                      <option key={branch.branch_code} value={branch.branch_code}>
                                        {branch.branch_name}
                                      </option>
                                    ))}
                                  </select>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Mobile Houses Section */}
                          <div>
                            <div className="flex justify-between items-center mb-3">
                              <h4 className="text-md font-semibold text-gray-800">{locale === 'en' ? 'บ้านที่เชื่อมโยง (' : locale === 'zh' ? 'บ้านที่เชื่อมโยง (' : 'บ้านที่เชื่อมโยง ('}{housesWithOrderInfo.filter(h => h.user_id === user.id).length})</h4>
                              {user.role === 'customer' && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setShowAddHouse(user.id);
                                  }}
                                  className="flex items-center gap-1.5 px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-md hover:bg-green-200 transition-colors"
                                >
                                  <PlusIcon className="w-3 h-3" />
                                  {locale === 'en' ? '                                   เพิ่มบ้าน                                 ' : locale === 'zh' ? '                                   เพิ่มบ้าน                                 ' : '                                   เพิ่มบ้าน                                 '}</button>
                              )}
                            </div>
                            
                            {housesWithOrderInfo.filter(h => h.user_id === user.id).length > 0 ? (
                              <div className="grid grid-cols-1 gap-3">
                                {housesWithOrderInfo.filter(h => h.user_id === user.id).map((house) => (
                                  <div key={house.house_code} className="bg-blue-50 border border-blue-200 p-3 rounded-lg">
                                    <div className="flex justify-between items-start">
                                      <div>
                                        <div className="font-medium text-blue-900">{house.name}</div>
                                        <div className="text-xs text-blue-700 mt-1">{locale === 'en' ? 'code:' : locale === 'zh' ? '代码：' : 'รหัส: '}{house.house_code}</div>
                                        <div className="text-xs text-blue-600 mt-1">{house.address}</div>
                                        {house.branch_code && (
                                          <div className="text-xs text-blue-600 mt-1">
                                            {locale === 'en' ? '                                             สาขา: ' : locale === 'zh' ? '                                             สาขา: ' : '                                             สาขา: '}{branchMap[String(house.branch_code)] || house.branch_code}
                                          </div>
                                        )}
                                      </div>
                                      <div className="text-right">
                                        <div className="text-xs text-blue-600">{locale === 'en' ? 'ออเดอร์: ' : locale === 'zh' ? 'ออเดอร์: ' : 'ออเดอร์: '}{house.order_count}</div>
                                        <div className="text-xs text-blue-600">{locale === 'en' ? 'สถานะ: ' : locale === 'zh' ? 'สถานะ: ' : 'สถานะ: '}{house.status}</div>
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div className="text-center py-8 text-gray-500">
                                <div className="text-sm">{locale === 'en' ? 'ยังไม่มีบ้านที่เชื่อมโยง' : locale === 'zh' ? 'ยังไม่มีบ้านที่เชื่อมโยง' : 'ยังไม่มีบ้านที่เชื่อมโยง'}</div>
                              </div>
                            )}
                          </div>

                          {/* Mobile Orders Section */}
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
                                          {locale === 'en' ? '                                           วันที่: ' : locale === 'zh' ? '                                           วันที่: ' : '                                           วันที่: '}{order.created_at ? new Date(order.created_at).toLocaleDateString('th-TH') : '-'}
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

                          {/* Mobile Documents Section */}
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
                                          {locale === 'en' ? '                                           วันที่: ' : locale === 'zh' ? '                                           วันที่: ' : '                                           วันที่: '}{doc.created_at ? new Date(doc.created_at).toLocaleDateString('th-TH') : '-'}
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
        </>
      )}
    </div>
  );
}

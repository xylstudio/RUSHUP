'use client';
import { useEffect, useState } from 'react';
import { getPendingApprovals, approveUser } from '../../../../lib/supabaseClient';
import { CheckCircleIcon, XCircleIcon, StorefrontIcon, TruckIcon } from '@heroicons/react/24/outline';
import type { Profile } from '../../../../lib/supabaseClient';

export default function ApprovalsPage() {
  const [activeTab, setActiveTab] = useState<'merchant' | 'staff'>('merchant');
  const [pendingUsers, setPendingUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  useEffect(() => {
    fetchPendingApprovals();
  }, [activeTab]);

  const fetchPendingApprovals = async () => {
    setLoading(true);
    const { data } = await getPendingApprovals(activeTab);
    setPendingUsers(data || []);
    setLoading(false);
  };

  const handleApprove = async (userId: string) => {
    if (!confirm('ยืนยันการอนุมัติบัญชีนี้?')) return;
    setProcessingId(userId);
    const { error } = await approveUser(userId);
    if (error) {
      alert('Error approving user: ' + error.message);
    } else {
      alert('อนุมัติบัญชีสำเร็จ!');
      fetchPendingApprovals();
    }
    setProcessingId(null);
  };

  const handleReject = async (userId: string) => {
    if (!confirm('ยืนยันการปฏิเสธบัญชีนี้? (ระบบยังไม่ลบข้อมูล แต่จะค้างอยู่ในสถานะรอตรวจสอบ)')) return;
    // For now just alert, in the future could add a 'rejected' status
    alert('บันทึกการปฏิเสธแล้ว');
  };

  return (
    <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">อนุมัติบัญชีผู้ใช้งาน</h1>
        <p className="text-gray-500">ตรวจสอบและอนุมัติการสมัครเป็นร้านค้าและไรเดอร์บนแพลตฟอร์ม</p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 mb-6">
        <button
          onClick={() => setActiveTab('merchant')}
          className={`flex items-center gap-2 py-4 px-6 border-b-2 font-medium text-sm transition-colors ${
            activeTab === 'merchant'
              ? 'border-orange-500 text-orange-600'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
          }`}
        >
          <StorefrontIcon className="h-5 w-5" />
          ร้านค้าใหม่ (Merchants)
        </button>
        <button
          onClick={() => setActiveTab('staff')}
          className={`flex items-center gap-2 py-4 px-6 border-b-2 font-medium text-sm transition-colors ${
            activeTab === 'staff'
              ? 'border-green-500 text-green-600'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
          }`}
        >
          <TruckIcon className="h-5 w-5" />
          คนขับใหม่ (Riders)
        </button>
      </div>

      {/* Content */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-gray-500">กำลังโหลดข้อมูล...</div>
        ) : pendingUsers.length === 0 ? (
          <div className="p-12 text-center text-gray-500">ไม่มีคำขออนุมัติใหม่ในขณะนี้ 🎉</div>
        ) : (
          <ul className="divide-y divide-gray-200">
            {pendingUsers.map((user) => (
              <li key={user.id} className="p-6 hover:bg-gray-50 transition-colors">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">{user.display_name || user.email}</h3>
                    <div className="mt-1 flex items-center gap-4 text-sm text-gray-500">
                      <p>อีเมล: {user.email}</p>
                      <p>เบอร์โทร: {user.phone || '-'}</p>
                      <p>วันที่สมัคร: {new Date(user.created_at).toLocaleDateString('th-TH')}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => handleReject(user.id)}
                      disabled={processingId === user.id}
                      className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                    >
                      <XCircleIcon className="h-5 w-5 text-gray-400" />
                      ปฏิเสธ
                    </button>
                    <button
                      onClick={() => handleApprove(user.id)}
                      disabled={processingId === user.id}
                      className="flex items-center gap-2 px-4 py-2 border border-transparent rounded-lg text-sm font-medium text-white bg-green-600 hover:bg-green-700 shadow-sm disabled:opacity-50"
                    >
                      <CheckCircleIcon className="h-5 w-5" />
                      {processingId === user.id ? 'กำลังอนุมัติ...' : 'อนุมัติทันที'}
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

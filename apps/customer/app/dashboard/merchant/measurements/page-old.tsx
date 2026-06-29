'use client';
import { useState, useEffect } from 'react';
import { useAuth } from '../../../../lib/AuthContext';
import { getMeasurementRequestsWithDetails, assignMeasurementRequest, updateMeasurementRequest, getStaffMembers, MeasurementRequestWithDetails, getMeasurementRequests, type PriorityLevel } from '../../../../lib/supabaseClient';
import { useToastContext } from '@/components/Toast';
import {
  Square3Stack3DIcon,
  CalendarIcon,
  ClockIcon,
  UserIcon,
  HomeIcon,
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon,
  ClipboardDocumentCheckIcon,
  PhoneIcon,
  MapPinIcon,
  PencilSquareIcon,
  UsersIcon,
  ChartBarIcon
} from "@heroicons/react/24/outline";
import { 
  CheckCircleIcon as CheckCircleSolid,
  ClockIcon as ClockSolid,
  ExclamationTriangleIcon as ExclamationTriangleSolid
} from "@heroicons/react/24/solid";
import { useI18n } from "@/lib/I18nContext";

// ใช้ MeasurementRequestWithDetails interface จาก supabaseClient.ts แทน

interface StaffMember {
  id: string;
  display_name: string;
  email: string;
  branch_codes: string[];
}

const getStatusInfo = (status: string) => {
  switch (status) {
    case 'pending':
      return {
        label: 'รอการดำเนินการ',
        color: 'text-yellow-700 bg-yellow-100',
        icon: <ClockSolid className="w-4 h-4" />,
        borderColor: 'border-yellow-200'
      };
    case 'assigned':
      return {
        label: 'มอบหมายแล้ว',
        color: 'text-blue-700 bg-blue-100',
        icon: <UserIcon className="w-4 h-4" />,
        borderColor: 'border-blue-200'
      };
    case 'in_progress':
      return {
        label: 'กำลังดำเนินการ',
        color: 'text-indigo-700 bg-indigo-100',
        icon: <ExclamationTriangleSolid className="w-4 h-4" />,
        borderColor: 'border-indigo-200'
      };
    case 'completed':
      return {
        label: 'เสร็จสมบูรณ์',
        color: 'text-green-700 bg-green-100',
        icon: <CheckCircleSolid className="w-4 h-4" />,
        borderColor: 'border-green-200'
      };
    case 'cancelled':
      return {
        label: 'ยกเลิกแล้ว',
        color: 'text-red-700 bg-red-100',
        icon: <XCircleIcon className="w-4 h-4" />,
        borderColor: 'border-red-200'
      };
    default:
      return {
        label: status,
        color: 'text-gray-700 bg-gray-100',
        icon: <ClockIcon className="w-4 h-4" />,
        borderColor: 'border-gray-200'
      };
  }
};

const getPriorityInfo = (priority: string) => {
  switch (priority) {
    case 'urgent':
      return { label: 'เร่งด่วน', color: 'text-red-700 bg-red-100 border-red-200' };
    case 'high':
      return { label: 'สำคัญ', color: 'text-orange-700 bg-orange-100 border-orange-200' };
    case 'normal':
      return { label: 'ปกติ', color: 'text-blue-700 bg-blue-100 border-blue-200' };
    case 'low':
      return { label: 'ต่ำ', color: 'text-gray-700 bg-gray-100 border-gray-200' };
    default:
      return { label: priority, color: 'text-gray-700 bg-gray-100 border-gray-200' };
  }
};

const formatDate = (dateStr: string) => {
  return new Date(dateStr).toLocaleDateString('th-TH', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
};

const formatTime = (timeStr: string) => {
  return timeStr.substring(0, 5); // Remove seconds
};

export default function AdminMeasurementRequestsPage() {
    const { locale } = useI18n();
  const { profile } = useAuth();
  const { success, error: showError } = useToastContext();
  const [requests, setRequests] = useState<MeasurementRequestWithDetails[]>([]);
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [branchFilter, setBranchFilter] = useState<string>('all');
  const [updatingRequestId, setUpdatingRequestId] = useState<string | null>(null);
  
  // Assignment modal state
  const [assigningRequestId, setAssigningRequestId] = useState<string | null>(null);
  const [selectedStaffId, setSelectedStaffId] = useState('');

  // Statistics
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    assigned: 0,
    inProgress: 0,
    completed: 0
  });

  useEffect(() => {
    if (profile) {
      fetchMeasurementRequests();
      fetchStaff();
    }
  }, [profile, statusFilter, branchFilter]);

  useEffect(() => {
    calculateStats();
  }, [requests]);

  const fetchMeasurementRequests = async () => {
    if (!profile) return;
    
    setLoading(true);
    try {
      const filters: any = {};
      
      if (statusFilter !== 'all') {
        filters.status = statusFilter;
      }
      
      if (branchFilter !== 'all') {
        filters.branch_code = branchFilter;
      }

      const { data, error } = await getMeasurementRequests(filters);

      if (error) {
        showError("เกิดข้อผิดพลาดในการโหลดข้อมูลคำขอการวัดพื้นที่");
        console.error(error);
      } else {
        setRequests(data || []);
      }
    } catch (err) {
      console.error('Error:', err);
      showError("เกิดข้อผิดพลาดที่ไม่คาดคิด");
    }
    setLoading(false);
  };

  const fetchStaff = async () => {
    try {
      const { data, error } = await getStaffMembers();
      if (error) {
        console.error('Error fetching staff:', error);
      } else {
        // Map profiles to StaffMember shape, adapting single branch_code to array
        const mapped = (data || []).map((p: any) => ({
          id: p.id,
          display_name: p.display_name || p.email,
          email: p.email,
          branch_codes: p.branch_code ? [p.branch_code] : []
        })) as StaffMember[];
        setStaff(mapped);
      }
    } catch (err) {
      console.error('Error:', err);
    }
  };

  const calculateStats = () => {
    setStats({
      total: requests.length,
      pending: requests.filter(r => r.status === 'pending').length,
      assigned: requests.filter(r => r.status === 'assigned').length,
      inProgress: requests.filter(r => r.status === 'in_progress').length,
      completed: requests.filter(r => r.status === 'completed').length
    });
  };

  const handleAssignStaff = async (requestId: string, staffId: string) => {
    setUpdatingRequestId(requestId);
    try {
      const { error } = await assignMeasurementRequest(requestId, staffId);

      if (error) {
        showError("เกิดข้อผิดพลาดในการมอบหมายงาน");
      } else {
        success("มอบหมายงานสำเร็จ!");
        setAssigningRequestId(null);
        setSelectedStaffId('');
        fetchMeasurementRequests();
      }
    } catch (err) {
      showError("เกิดข้อผิดพลาดที่ไม่คาดคิด");
    }
    setUpdatingRequestId(null);
  };

  const handleUpdatePriority = async (requestId: string, priority: PriorityLevel) => {
    setUpdatingRequestId(requestId);
    try {
      const { error } = await updateMeasurementRequest(requestId, {
        priority_level: priority
      });

      if (error) {
        showError("เกิดข้อผิดพลาดในการอัปเดตความสำคัญ");
      } else {
        success("อัปเดตความสำคัญสำเร็จ!");
        fetchMeasurementRequests();
      }
    } catch (err) {
      showError("เกิดข้อผิดพลาดที่ไม่คาดคิด");
    }
    setUpdatingRequestId(null);
  };

  const handleCancelRequest = async (requestId: string) => {
    if (!confirm('ต้องการยกเลิกคำขอนี้หรือไม่?')) return;
    
    setUpdatingRequestId(requestId);
    try {
      const { error } = await updateMeasurementRequest(requestId, {
        status: 'cancelled'
      });

      if (error) {
        showError("เกิดข้อผิดพลาดในการยกเลิกคำขอ");
      } else {
        success("ยกเลิกคำขอสำเร็จ!");
        fetchMeasurementRequests();
      }
    } catch (err) {
      showError("เกิดข้อผิดพลาดที่ไม่คาดคิด");
    }
    setUpdatingRequestId(null);
  };

  const getAvailableStaff = (branchCode: string) => {
    return staff.filter(s => s.branch_codes.includes(branchCode));
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-300 rounded w-1/3 mb-4"></div>
          <div className="grid grid-cols-4 gap-4 mb-6">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-20 bg-gray-300 rounded"></div>
            ))}
          </div>
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-32 bg-gray-300 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <Square3Stack3DIcon className="w-8 h-8 text-green-600" />
          <h1 className="text-3xl font-bold text-gray-900">{locale === 'en' ? 'จัดการคำขอวัดพื้นที่' : locale === 'zh' ? 'จัดการคำขอวัดพื้นที่' : 'จัดการคำขอวัดพื้นที่'}</h1>
        </div>
        <p className="text-gray-600">
          {locale === 'en' ? '           จัดการและมอบหมายงานคำขอการวัดพื้นที่จากลูกค้า         ' : locale === 'zh' ? '           จัดการและมอบหมายงานคำขอการวัดพื้นที่จากลูกค้า         ' : '           จัดการและมอบหมายงานคำขอการวัดพื้นที่จากลูกค้า         '}</p>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
        <div className="bg-white rounded-lg shadow-sm border p-4">
          <div className="flex items-center gap-3">
            <ChartBarIcon className="w-8 h-8 text-blue-600" />
            <div>
              <p className="text-sm text-gray-600">{locale === 'en' ? 'ทั้งหมด' : locale === 'zh' ? 'ทั้งหมด' : 'ทั้งหมด'}</p>
              <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border p-4">
          <div className="flex items-center gap-3">
            <ClockSolid className="w-8 h-8 text-yellow-600" />
            <div>
              <p className="text-sm text-gray-600">{locale === 'en' ? 'รอดำเนินการ' : locale === 'zh' ? 'รอดำเนินการ' : 'รอดำเนินการ'}</p>
              <p className="text-2xl font-bold text-yellow-700">{stats.pending}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border p-4">
          <div className="flex items-center gap-3">
            <UserIcon className="w-8 h-8 text-blue-600" />
            <div>
              <p className="text-sm text-gray-600">{locale === 'en' ? 'Assigned' : locale === 'zh' ? '已分配' : 'มอบหมายแล้ว'}</p>
              <p className="text-2xl font-bold text-blue-700">{stats.assigned}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border p-4">
          <div className="flex items-center gap-3">
            <ExclamationTriangleSolid className="w-8 h-8 text-indigo-600" />
            <div>
              <p className="text-sm text-gray-600">{locale === 'en' ? 'in progress' : locale === 'zh' ? '进行中' : 'กำลังดำเนินการ'}</p>
              <p className="text-2xl font-bold text-indigo-700">{stats.inProgress}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border p-4">
          <div className="flex items-center gap-3">
            <CheckCircleSolid className="w-8 h-8 text-green-600" />
            <div>
              <p className="text-sm text-gray-600">{locale === 'en' ? 'เสร็จแล้ว' : locale === 'zh' ? 'เสร็จแล้ว' : 'เสร็จแล้ว'}</p>
              <p className="text-2xl font-bold text-green-700">{stats.completed}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-6 space-y-4">
        <div>
          <h3 className="text-sm font-medium text-gray-700 mb-2">{locale === 'en' ? 'กรองตามสถานะ' : locale === 'zh' ? 'กรองตามสถานะ' : 'กรองตามสถานะ'}</h3>
          <div className="flex flex-wrap gap-2">
            {[
              { value: 'all', label: 'ทั้งหมด' },
              { value: 'pending', label: 'รอดำเนินการ' },
              { value: 'assigned', label: 'มอบหมายแล้ว' },
              { value: 'in_progress', label: 'กำลังดำเนินการ' },
              { value: 'completed', label: 'เสร็จแล้ว' }
            ].map(filter => (
              <button
                key={filter.value}
                onClick={() => setStatusFilter(filter.value)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  statusFilter === filter.value
                    ? 'bg-green-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                {filter.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Requests List */}
      {requests.length === 0 ? (
        <div className="text-center py-12">
          <Square3Stack3DIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {statusFilter === 'all' ? 'ยังไม่มีคำขอการวัดพื้นที่' : `ไม่มีคำขอที่มีสถานะ "${statusFilter}"`}
          </h3>
          <p className="text-gray-500">
            {locale === 'en' ? '             เมื่อมีคำขอการวัดพื้นที่ จะแสดงรายการที่นี่           ' : locale === 'zh' ? '             เมื่อมีคำขอการวัดพื้นที่ จะแสดงรายการที่นี่           ' : '             เมื่อมีคำขอการวัดพื้นที่ จะแสดงรายการที่นี่           '}</p>
        </div>
      ) : (
        <div className="space-y-6">
          {requests.map((request) => {
              const { locale } = useI18n();
            const statusInfo = getStatusInfo(request.status ?? 'pending');
            const priorityInfo = getPriorityInfo(request.priority_level ?? 'normal');
            
            return (
              <div
                key={request.id}
                className={`bg-white rounded-xl shadow-sm border p-6 hover:shadow-md transition-shadow ${statusInfo.borderColor}`}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <Square3Stack3DIcon className="w-6 h-6 text-green-600" />
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">
                        {request.houses?.name || '—'}
                      </h3>
                      <p className="text-sm text-gray-600">
                        {locale === 'en' ? 'code:' : locale === 'zh' ? '代码：' : '                         รหัส: '}{request.houses?.house_code || '—'}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border ${priorityInfo.color}`}>
                      {priorityInfo.label}
                    </span>
                    <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium ${statusInfo.color}`}>
                      {statusInfo.icon}
                      {statusInfo.label}
                    </span>
                  </div>
                </div>

                {/* Customer Info */}
                <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="flex items-center gap-2 text-sm">
                      <UserIcon className="w-4 h-4 text-gray-500" />
                      <span>
                        <strong>{locale === 'en' ? 'customer:' : locale === 'zh' ? '顾客：' : 'ลูกค้า:'}</strong> {request.profiles?.display_name || '—'}
                      </span>
                    </div>
                    {request.branch_code && (
                      <div className="flex items-center gap-2 text-sm">
                        <HomeIcon className="w-4 h-4 text-gray-500" />
                        <span>
                          <strong>{locale === 'en' ? 'สาขา:' : locale === 'zh' ? 'สาขา:' : 'สาขา:'}</strong> {request.branch_code}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Address */}
                <div className="mb-4">
                  <div className="flex items-start gap-2 text-sm text-gray-600">
                    <MapPinIcon className="w-4 h-4 mt-0.5" />
                    <span>
                      <strong>{locale === 'en' ? 'address:' : locale === 'zh' ? '地址：' : 'ที่อยู่:'}</strong> {request.houses?.address || '—'}
                    </span>
                  </div>
                </div>

                {/* Request Details */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <CalendarIcon className="w-4 h-4" />
                    <span>
                      <strong>{locale === 'en' ? 'Required date:' : locale === 'zh' ? '所需日期：' : 'วันที่ต้องการ:'}</strong> {
                        request.preferred_date 
                          ? formatDate(request.preferred_date)
                          : 'ไม่ระบุ'
                      }
                    </span>
                  </div>
                  
                  {(request.preferred_time_start || request.preferred_time_end) && (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <ClockIcon className="w-4 h-4" />
                      <span>
                        <strong>{locale === 'en' ? 'time:' : locale === 'zh' ? '时间：' : 'เวลา:'}</strong> {
                          request.preferred_time_start 
                            ? formatTime(request.preferred_time_start)
                            : ''
                        }
                        {request.preferred_time_start && request.preferred_time_end ? ' - ' : ''}
                        {
                          request.preferred_time_end 
                            ? formatTime(request.preferred_time_end)
                            : ''
                        }
                      </span>
                    </div>
                  )}
                </div>

                {/* Assigned Staff */}
                {request.assigned_staff && (
                  <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                    <div className="flex items-center gap-2 text-sm">
                      <UserIcon className="w-4 h-4 text-blue-600" />
                      <span className="text-blue-800">
                        <strong>{locale === 'en' ? 'responsible person:' : locale === 'zh' ? '负责人：' : 'ผู้รับผิดชอบ:'}</strong> {request.assigned_staff.display_name}
                      </span>
                    </div>
                  </div>
                )}

                {/* Special Instructions */}
                {request.special_instructions && (
                  <div className="mb-4 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                    <p className="text-sm text-yellow-800">
                      <strong>{locale === 'en' ? 'note:' : locale === 'zh' ? '笔记：' : 'หมายเหตุ:'}</strong> {request.special_instructions}
                    </p>
                  </div>
                )}

                {/* Results (if completed) */}
                {request.status === 'completed' && request.measured_area_sqm && (
                  <div className="mt-4 p-4 bg-green-50 rounded-lg border border-green-200">
                    <div className="flex items-center gap-2 mb-2">
                      <ClipboardDocumentCheckIcon className="w-5 h-5 text-green-600" />
                      <h4 className="text-sm font-semibold text-green-800">{locale === 'en' ? 'Area measurement results' : locale === 'zh' ? '面积测量结果' : 'ผลการวัดพื้นที่'}</h4>
                    </div>
                    <p className="text-sm text-green-700">
                      <strong>{locale === 'en' ? 'area:' : locale === 'zh' ? '区域：' : 'พื้นที่:'}</strong> {request.measured_area_sqm} {locale === 'en' ? 'square meter' : locale === 'zh' ? '平方米' : ' ตารางเมตร                     '}</p>
                    {request.measurement_notes && (
                      <p className="text-sm text-green-700 mt-2">
                        <strong>{locale === 'en' ? 'note:' : locale === 'zh' ? '笔记：' : 'หมายเหตุ:'}</strong> {request.measurement_notes}
                      </p>
                    )}
                  </div>
                )}

                {/* Admin Actions */}
                <div className="mt-6 pt-4 border-t border-gray-100">
                  <div className="flex flex-wrap gap-3">
                    {/* Assign Staff */}
                    {(request.status === 'pending' || !request.assigned_staff_id) && (
                      <button
                        onClick={() => setAssigningRequestId(request.id)}
                        className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700 transition-colors"
                      >
                        {request.assigned_staff_id ? 'เปลี่ยนผู้รับผิดชอบ' : 'มอบหมายงาน'}
                      </button>
                    )}

                    {/* Priority Controls */}
                    <div className="flex items-center gap-1">
                      <span className="text-xs text-gray-500">{locale === 'en' ? 'ความสำคัญ:' : locale === 'zh' ? 'ความสำคัญ:' : 'ความสำคัญ:'}</span>
                      <select
                        value={request.priority_level}
                        onChange={(e) => handleUpdatePriority(request.id, e.target.value as PriorityLevel)}
                        disabled={updatingRequestId === request.id}
                        className="text-xs border border-gray-300 rounded px-2 py-1"
                      >
                        <option value="low">{locale === 'en' ? 'ต่ำ' : locale === 'zh' ? 'ต่ำ' : 'ต่ำ'}</option>
                        <option value="normal">{locale === 'en' ? 'normal' : locale === 'zh' ? '普通的' : 'ปกติ'}</option>
                        <option value="high">{locale === 'en' ? 'สำคัญ' : locale === 'zh' ? 'สำคัญ' : 'สำคัญ'}</option>
                        <option value="urgent">{locale === 'en' ? 'เร่งด่วน' : locale === 'zh' ? 'เร่งด่วน' : 'เร่งด่วน'}</option>
                      </select>
                    </div>

                    {/* Cancel */}
                    {request.status !== 'completed' && request.status !== 'cancelled' && (
                      <button
                        onClick={() => handleCancelRequest(request.id)}
                        disabled={updatingRequestId === request.id}
                        className="bg-red-600 text-white px-3 py-1 rounded text-sm hover:bg-red-700 transition-colors disabled:opacity-50"
                      >
                        {locale === 'en' ? 'cancel' : locale === 'zh' ? '取消' : '                         ยกเลิก                       '}</button>
                    )}
                  </div>
                </div>

                {/* Timestamps */}
                <div className="mt-4 pt-2 border-t border-gray-100">
                  <div className="flex flex-wrap gap-4 text-xs text-gray-500">
                    <span>
                      <strong>{locale === 'en' ? 'Submit a request:' : locale === 'zh' ? '提交请求：' : 'ส่งคำขอ:'}</strong> {formatDate(request.created_at)}
                    </span>
                    {request.assigned_at && (
                      <span>
                        <strong>{locale === 'en' ? 'มอบหมาน:' : locale === 'zh' ? 'มอบหมาน:' : 'มอบหมาน:'}</strong> {formatDate(request.assigned_at)}
                      </span>
                    )}
                    {request.completed_at && (
                      <span>
                        <strong>{locale === 'en' ? 'finish:' : locale === 'zh' ? '结束：' : 'เสร็จสิ้น:'}</strong> {formatDate(request.completed_at)}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Assignment Modal */}
      {assigningRequestId && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4">
            <div className="flex items-center gap-3 mb-4">
              <UsersIcon className="w-6 h-6 text-blue-600" />
              <h3 className="text-lg font-semibold text-gray-900">{locale === 'en' ? 'มอบหมายงาน' : locale === 'zh' ? 'มอบหมายงาน' : 'มอบหมายงาน'}</h3>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {locale === 'en' ? 'Choose employees' : locale === 'zh' ? '选择员工' : '                   เลือกพนักงาน                 '}</label>
                <select
                  value={selectedStaffId}
                  onChange={(e) => setSelectedStaffId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">{locale === 'en' ? '-- เลือกพนักงาน --' : locale === 'zh' ? '-- เลือกพนักงาน --' : '-- เลือกพนักงาน --'}</option>
                  {staff.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.display_name} ({s.branch_codes.join(', ')})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => {
                  setAssigningRequestId(null);
                  setSelectedStaffId('');
                }}
                className="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors"
              >
                {locale === 'en' ? 'cancel' : locale === 'zh' ? '取消' : '                 ยกเลิก               '}</button>
              <button
                onClick={() => handleAssignStaff(assigningRequestId, selectedStaffId)}
                disabled={updatingRequestId === assigningRequestId || !selectedStaffId}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                {updatingRequestId === assigningRequestId ? 'กำลังมอบหมาย...' : 'มอบหมาย'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

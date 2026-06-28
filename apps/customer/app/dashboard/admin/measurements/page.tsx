'use client';
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../../../lib/AuthContext';
import { getMeasurementRequestsWithDetails, MeasurementRequestWithDetails } from '../../../../lib/supabaseClient';
import { useToastContext } from '@/components/Toast';
import {
  Square3Stack3DIcon,
  ClockIcon,
  UserIcon,
  XCircleIcon,
  ClipboardDocumentCheckIcon,
  MapPinIcon,
} from "@heroicons/react/24/outline";
import { 
  CheckCircleIcon as CheckCircleSolid,
  ClockIcon as ClockSolid,
  ExclamationTriangleIcon as ExclamationTriangleSolid
} from "@heroicons/react/24/solid";
import { useI18n } from "@/lib/I18nContext";

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

const formatDate = (dateStr: string) => {
  return new Date(dateStr).toLocaleDateString('th-TH', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
};

const formatTime = (timeStr: string) => {
  return timeStr.substring(0, 5);
};

export default function AdminMeasurementRequestsPage() {
    const { locale } = useI18n();
  const { profile } = useAuth();
  const { error: showError } = useToastContext();
  const [requests, setRequests] = useState<MeasurementRequestWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const getErrorMessage = (error: unknown) =>
    error instanceof Error ? error.message : 'ไม่ทราบสาเหตุ'

  const fetchMeasurementRequests = useCallback(async () => {
    if (!profile) return;
    
    console.log('🔹 Admin fetching measurement requests...');
    setLoading(true);
    
    try {
      // Admin ดูข้อมูลทั้งหมด
      const data = await getMeasurementRequestsWithDetails();
      
      console.log('🔹 Admin measurement data:', data);
      
      // กรองตาม status filter
      let filteredData = data;
      if (statusFilter !== 'all') {
        filteredData = data.filter(request => request.status === statusFilter);
      }
      
      setRequests(filteredData);
    } catch (error: unknown) {
      console.error('❌ Error fetching admin measurement requests:', error);
      showError('เกิดข้อผิดพลาดในการโหลดข้อมูล: ' + getErrorMessage(error));
      setRequests([]);
    }
    
    setLoading(false);
  }, [profile, showError, statusFilter]);

  useEffect(() => {
    if (profile) {
      fetchMeasurementRequests();
    }
  }, [profile, fetchMeasurementRequests]);

  const getStats = () => {
    return {
      total: requests.length,
      pending: requests.filter(r => r.status === 'pending').length,
      assigned: requests.filter(r => r.status === 'assigned').length,
      inProgress: requests.filter(r => r.status === 'in_progress').length,
      completed: requests.filter(r => r.status === 'completed').length,
    };
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-300 rounded w-1/3 mb-4"></div>
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-32 bg-gray-300 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const stats = getStats();

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <Square3Stack3DIcon className="w-8 h-8 text-green-600" />
              <h1 className="text-3xl font-bold text-gray-900">{locale === 'en' ? 'จัดการงานวัดพื้นที่' : locale === 'zh' ? 'จัดการงานวัดพื้นที่' : 'จัดการงานวัดพื้นที่'}</h1>
            </div>
            <p className="text-gray-600">
              {locale === 'en' ? '               ดูภาพรวมและจัดการคำขอการวัดพื้นที่ทั้งหมด             ' : locale === 'zh' ? '               ดูภาพรวมและจัดการคำขอการวัดพื้นที่ทั้งหมด             ' : '               ดูภาพรวมและจัดการคำขอการวัดพื้นที่ทั้งหมด             '}</p>
          </div>
          
          {/* Stats Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 min-w-[100px]">
              <div className="text-center">
                <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
                <p className="text-sm text-gray-600">{locale === 'en' ? 'ทั้งหมด' : locale === 'zh' ? 'ทั้งหมด' : 'ทั้งหมด'}</p>
              </div>
            </div>
            
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 min-w-[100px]">
              <div className="text-center">
                <p className="text-2xl font-bold text-yellow-900">{stats.pending}</p>
                <p className="text-sm text-yellow-600">{locale === 'en' ? 'รอดำเนินการ' : locale === 'zh' ? 'รอดำเนินการ' : 'รอดำเนินการ'}</p>
              </div>
            </div>
            
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 min-w-[100px]">
              <div className="text-center">
                <p className="text-2xl font-bold text-blue-900">{stats.assigned}</p>
                <p className="text-sm text-blue-600">{locale === 'en' ? 'Assigned' : locale === 'zh' ? '已分配' : 'มอบหมายแล้ว'}</p>
              </div>
            </div>
            
            <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4 min-w-[100px]">
              <div className="text-center">
                <p className="text-2xl font-bold text-indigo-900">{stats.inProgress}</p>
                <p className="text-sm text-indigo-600">{locale === 'en' ? 'in progress' : locale === 'zh' ? '进行中' : 'กำลังดำเนินการ'}</p>
              </div>
            </div>
            
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 min-w-[100px]">
              <div className="text-center">
                <p className="text-2xl font-bold text-green-900">{stats.completed}</p>
                <p className="text-sm text-green-600">{locale === 'en' ? 'เสร็จแล้ว' : locale === 'zh' ? 'เสร็จแล้ว' : 'เสร็จแล้ว'}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Status Filter */}
      <div className="mb-6">
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

      {/* Requests List */}
      {requests.length === 0 ? (
        <div className="text-center py-12">
          <Square3Stack3DIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {statusFilter === 'all' ? 'ยังไม่มีงานวัดพื้นที่' : `ไม่มีงานที่มีสถานะ "${statusFilter}"`}
          </h3>
          <p className="text-gray-500">
            {locale === 'en' ? '             เมื่อมีคำขอการวัดพื้นที่ จะแสดงรายการที่นี่           ' : locale === 'zh' ? '             เมื่อมีคำขอการวัดพื้นที่ จะแสดงรายการที่นี่           ' : '             เมื่อมีคำขอการวัดพื้นที่ จะแสดงรายการที่นี่           '}</p>
        </div>
      ) : (
        <div className="space-y-6">
          {requests.map((request) => {
              const { locale } = useI18n();
            const statusInfo = getStatusInfo(request.status || 'pending');
            const isNewRequest = new Date(request.created_at) > new Date(Date.now() - 24 * 60 * 60 * 1000);

            return (
              <div
                key={request.id}
                className={`bg-white rounded-xl shadow-sm border p-6 hover:shadow-md transition-shadow ${statusInfo.borderColor} ${
                  isNewRequest ? 'ring-2 ring-blue-500 ring-opacity-50 bg-blue-50' : ''
                }`}
              >
                {/* Badge สำหรับงานใหม่ */}
                {isNewRequest && (
                  <div className="mb-4">
                    <span className="inline-flex items-center gap-1 px-3 py-1 bg-blue-600 text-white text-xs font-medium rounded-full">
                      {locale === 'en' ? '                       🆕 งานใหม่                     ' : locale === 'zh' ? '                       🆕 งานใหม่                     ' : '                       🆕 งานใหม่                     '}</span>
                  </div>
                )}
                
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <Square3Stack3DIcon className="w-6 h-6 text-green-600" />
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">
                        {request.houses?.name || `บ้าน ${request.house_code}`}
                      </h3>
                      <p className="text-sm text-gray-600">
                        {locale === 'en' ? 'code:' : locale === 'zh' ? '代码：' : '                         รหัส: '}{request.house_code}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium ${statusInfo.color}`}>
                      {statusInfo.icon}
                      {statusInfo.label}
                    </span>
                  </div>
                </div>

                {/* Customer Info */}
                <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="flex items-center gap-2 text-sm">
                      <UserIcon className="w-4 h-4 text-gray-500" />
                      <span>
                        <strong>{locale === 'en' ? 'customer:' : locale === 'zh' ? '顾客：' : 'ลูกค้า:'}</strong> {request.profiles?.display_name || `ลูกค้า ${request.customer_id.slice(0, 8)}...`}
                      </span>
                    </div>
                  </div>
                </div>

                {/* House Details */}
                <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="space-y-2">
                    {request.houses?.address && (
                      <div className="flex items-start gap-2 text-sm text-gray-600">
                        <MapPinIcon className="w-4 h-4 mt-0.5" />
                        <span>
                          <strong>{locale === 'en' ? 'address:' : locale === 'zh' ? '地址：' : 'ที่อยู่:'}</strong> {request.houses.address}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Request Details */}
                <div className="grid grid-cols-1 gap-4 mb-4">
                  {(request.preferred_time_start || request.preferred_time_end) && (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <ClockIcon className="w-4 h-4" />
                      <span>
                        <strong>{locale === 'en' ? 'เวลาที่ต้องการ:' : locale === 'zh' ? 'เวลาที่ต้องการ:' : 'เวลาที่ต้องการ:'}</strong> {
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

                {/* Special Instructions */}
                {request.special_instructions && (
                  <div className="mb-4 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                    <p className="text-sm text-yellow-800">
                      <strong>{locale === 'en' ? 'note:' : locale === 'zh' ? '笔记：' : 'หมายเหตุ:'}</strong> {request.special_instructions}
                    </p>
                  </div>
                )}

                {/* Assigned Staff Info */}
                {request.assigned_staff && (
                  <div className="mb-4 p-3 bg-green-50 rounded-lg border border-green-200">
                    <div className="flex items-center gap-2 text-sm text-green-800">
                      <UserIcon className="w-4 h-4" />
                      <span>
                        <strong>{locale === 'en' ? 'พนักงานที่รับผิดชอบ:' : locale === 'zh' ? 'พนักงานที่รับผิดชอบ:' : 'พนักงานที่รับผิดชอบ:'}</strong> {request.assigned_staff.display_name}
                      </span>
                    </div>
                  </div>
                )}

                {/* Results (if completed) */}
                {request.status === 'completed' && request.measured_area_sqm && (
                  <div className="mt-4 p-5 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl border-2 border-green-200">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="p-2 bg-green-100 rounded-lg">
                        <ClipboardDocumentCheckIcon className="w-6 h-6 text-green-600" />
                      </div>
                      <div>
                        <h4 className="text-lg font-semibold text-green-800">{locale === 'en' ? '✅ งานเสร็จสมบูรณ์' : locale === 'zh' ? '✅ งานเสร็จสมบูรณ์' : '✅ งานเสร็จสมบูรณ์'}</h4>
                        <p className="text-sm text-green-600">{locale === 'en' ? 'ข้อมูลได้ส่งให้ลูกค้าเรียบร้อยแล้ว' : locale === 'zh' ? 'ข้อมูลได้ส่งให้ลูกค้าเรียบร้อยแล้ว' : 'ข้อมูลได้ส่งให้ลูกค้าเรียบร้อยแล้ว'}</p>
                      </div>
                    </div>
                    
                    <div className="bg-white rounded-lg p-4 border border-green-200">
                      <div className="grid grid-cols-1 gap-3">
                        <div className="flex items-center gap-2">
                          <span className="text-2xl">📏</span>
                          <div>
                            <span className="text-sm text-gray-600">{locale === 'en' ? 'พื้นที่ที่วัดได้' : locale === 'zh' ? 'พื้นที่ที่วัดได้' : 'พื้นที่ที่วัดได้'}</span>
                            <p className="text-xl font-bold text-green-700">{request.measured_area_sqm} {locale === 'en' ? 'square meter' : locale === 'zh' ? '平方米' : ' ตารางเมตร'}</p>
                          </div>
                        </div>
                        
                        {request.measurement_notes && (
                          <div className="flex items-start gap-2 mt-3 pt-3 border-t border-gray-100">
                            <span className="text-lg">📝</span>
                            <div className="flex-1">
                              <span className="text-sm text-gray-600">{locale === 'en' ? 'note' : locale === 'zh' ? '笔记' : 'หมายเหตุ'}</span>
                              <p className="text-sm text-gray-800 mt-1">{request.measurement_notes}</p>
                            </div>
                          </div>
                        )}
                        
                        {request.completed_at && (
                          <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-100">
                            <span className="text-lg">🕒</span>
                            <div>
                              <span className="text-sm text-gray-600">{locale === 'en' ? 'finished when' : locale === 'zh' ? '完成时' : 'เสร็จสิ้นเมื่อ'}</span>
                              <p className="text-sm font-medium text-gray-800">{formatDate(request.completed_at)}</p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Timestamps */}
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <div className="flex flex-wrap gap-4 text-xs text-gray-500">
                    <span>
                      <strong>{locale === 'en' ? 'Submit a request:' : locale === 'zh' ? '提交请求：' : 'ส่งคำขอ:'}</strong> {formatDate(request.created_at)}
                    </span>
                    {request.assigned_at && (
                      <span>
                        <strong>{locale === 'en' ? 'มอบหมาย:' : locale === 'zh' ? 'มอบหมาย:' : 'มอบหมาย:'}</strong> {formatDate(request.assigned_at)}
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
    </div>
  );
}
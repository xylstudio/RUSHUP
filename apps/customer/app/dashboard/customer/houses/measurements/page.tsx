'use client';
import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '../../../../../lib/AuthContext';
import { 
  getMeasurementRequestsWithDetails,
  MeasurementRequestWithDetails,
  MeasurementStatus
} from '../../../../../lib/supabaseClient';
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
  ArrowLeftIcon
} from "@heroicons/react/24/outline";
import { 
  CheckCircleIcon as CheckCircleSolid,
  ClockIcon as ClockSolid,
  ExclamationTriangleIcon as ExclamationTriangleSolid
} from "@heroicons/react/24/solid";
import Link from 'next/link';
import { useI18n } from "@/lib/I18nContext";

const getStatusInfo = (status: MeasurementStatus) => {
  switch (status) {
    case 'pending':
      return {
        label: 'รอการดำเนินการ',
        color: 'text-yellow-700 bg-yellow-100',
        borderColor: 'border-yellow-200',
        icon: <ClockSolid className="w-4 h-4" />,
      };
    case 'assigned':
      return {
        label: 'มอบหมายงานแล้ว',
        color: 'text-blue-700 bg-blue-100',
        borderColor: 'border-blue-200',
        icon: <UserIcon className="w-4 h-4" />,
      };
    case 'in_progress':
      return {
        label: 'กำลังดำเนินการ',
        color: 'text-purple-700 bg-purple-100',
        borderColor: 'border-purple-200',
        icon: <ExclamationTriangleSolid className="w-4 h-4" />,
      };
    case 'completed':
      return {
        label: 'เสร็จสิ้น',
        color: 'text-green-700 bg-green-100',
        borderColor: 'border-green-200',
        icon: <CheckCircleSolid className="w-4 h-4" />,
      };
    case 'cancelled':
      return {
        label: 'ยกเลิก',
        color: 'text-red-700 bg-red-100',
        borderColor: 'border-red-200',
        icon: <XCircleIcon className="w-4 h-4" />,
      };
    default:
      return {
        label: status,
        color: 'text-gray-700 bg-gray-100',
        borderColor: 'border-gray-200',
        icon: <ExclamationTriangleIcon className="w-4 h-4" />,
      };
  }
};

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('th-TH', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
};

const formatTime = (timeString: string) => {
  return new Date(`1970-01-01T${timeString}`).toLocaleTimeString('th-TH', {
    hour: '2-digit',
    minute: '2-digit'
  });
};

export default function MeasurementRequestsPage() {
    const { locale } = useI18n();
  const searchParams = useSearchParams();
  const houseCodeFilter = (searchParams.get('houseCode') || '').trim();
  const { profile } = useAuth();
  const { success, error: showError } = useToastContext();
  const [requests, setRequests] = useState<MeasurementRequestWithDetails[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (profile) {
      fetchMeasurementRequests();
    }
  }, [profile]);

  const fetchMeasurementRequests = async () => {
    if (!profile) return;
    
    setLoading(true);
    try {
      const data = await getMeasurementRequestsWithDetails(profile.id);
      setRequests(data);
    } catch (err) {
      console.error('Error:', err);
      showError("เกิดข้อผิดพลาดในการโหลดข้อมูลคำขอการวัดพื้นที่");
    }
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="customer-editorial-page">
        <div className="customer-editorial-container">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-300 rounded w-1/3 mb-4"></div>
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-32 bg-gray-300 rounded"></div>
            ))}
          </div>
        </div>
        </div>
      </div>
    );
  }

  return (
    <div className="customer-editorial-page">
      <div className="customer-editorial-container">
      <div className="customer-editorial-header">
        <Link href="/dashboard/customer/houses" className="customer-editorial-back mb-4 inline-flex">
          <ArrowLeftIcon className="w-4 h-4" />
          {locale === 'en' ? 'Return to the home page.' : locale === 'zh' ? '返回主页。' : '           กลับไปหน้าบ้าน         '}</Link>

        <div className="flex items-center gap-3 mb-2">
          <Square3Stack3DIcon className="w-8 h-8 text-[#214031]" />
          <div>
            <p className="customer-editorial-kicker">Measurement Requests</p>
            <h1 className="customer-editorial-title text-[clamp(2rem,3.5vw,3.2rem)]">{locale === 'en' ? 'Area measurement request' : locale === 'zh' ? '面积测量请求' : 'คำขอการวัดพื้นที่'}</h1>
          </div>
        </div>
        <p className="customer-editorial-subtitle">
          {locale === 'en' ? 'Track the status of your area measurement request.' : locale === 'zh' ? '跟踪您的面积测量请求的状态。' : '           ติดตามสถานะคำขอการวัดพื้นที่ของคุณ         '}</p>
        {houseCodeFilter && (
          <p className="customer-editorial-body mt-2">{locale === 'en' ? 'Filtering for specific homes:' : locale === 'zh' ? '过滤特定房屋：' : 'กำลังกรองเฉพาะบ้าน: '}{houseCodeFilter}</p>
        )}
      </div>

      {/* Requests List */}
      {requests.filter((request) => !houseCodeFilter || request.house_code === houseCodeFilter).length === 0 ? (
        <div className="customer-editorial-empty">
          <Square3Stack3DIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="customer-editorial-empty-title mb-2">
            {locale === 'en' ? 'No area measurement requests yet.' : locale === 'zh' ? '尚无面积测量请求。' : '             ยังไม่มีคำขอการวัดพื้นที่           '}</h3>
          <p className="customer-editorial-body mb-6">
            {locale === 'en' ? 'When you request a team to come and measure the area will be listed here' : locale === 'zh' ? '当您请求团队前来测量时，此处将列出该面积' : '             เมื่อคุณร้องขอให้ทีมงานมาวัดพื้นที่ จะแสดงรายการที่นี่           '}</p>
          <Link href="/dashboard/customer/houses/add" className="customer-editorial-button-primary inline-flex">
            <HomeIcon className="w-5 h-5" />
            {locale === 'en' ? 'Add a new house' : locale === 'zh' ? '添加新房子' : '             เพิ่มบ้านใหม่           '}</Link>
        </div>
      ) : (
        <div className="space-y-6">
          {requests
            .filter((request) => !houseCodeFilter || request.house_code === houseCodeFilter)
            .map((request) => {
                const { locale } = useI18n();
            if (!request.status) return null;
            const statusInfo = getStatusInfo(request.status);
            
            return (
              <div
                key={request.id}
                className={`customer-editorial-card ${statusInfo.borderColor}`}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <Square3Stack3DIcon className="w-6 h-6 text-[#214031]" />
                    <div>
                      <h3 className="customer-editorial-card-title text-[1.5rem]">
                        {request.houses?.name || 'ไม่ระบุชื่อบ้าน'}
                      </h3>
                      <p className="customer-editorial-body text-xs">
                        {locale === 'en' ? 'code:' : locale === 'zh' ? '代码：' : '                         รหัส: '}{request.house_code}
                      </p>
                    </div>
                  </div>
                  <span className={`customer-editorial-badge ${statusInfo.color}`}>
                    {statusInfo.icon}
                    {statusInfo.label}
                  </span>
                </div>

                {/* Address */}
                {request.houses?.address && (
                  <div className="mb-4">
                    <p className="customer-editorial-body text-sm">
                      <strong>{locale === 'en' ? 'address:' : locale === 'zh' ? '地址：' : 'ที่อยู่:'}</strong> {request.houses.address}
                    </p>
                  </div>
                )}

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
                  <div className="customer-editorial-panel mb-4 bg-blue-50">
                    <div className="flex items-center gap-2 text-sm">
                      <UserIcon className="w-4 h-4 text-blue-600" />
                      <span className="text-blue-800">
                        <strong>{locale === 'en' ? 'responsible person:' : locale === 'zh' ? '负责人：' : 'ผู้รับผิดชอบ:'}</strong> {request.assigned_staff.display_name}
                        {request.assigned_staff.staff_code && ` (${request.assigned_staff.staff_code})`}
                      </span>
                    </div>
                  </div>
                )}

                {/* Special Instructions */}
                {request.special_instructions && (
                  <div className="customer-editorial-panel mb-4 bg-yellow-50">
                    <p className="text-sm text-yellow-800">
                      <strong>{locale === 'en' ? 'Special instructions:' : locale === 'zh' ? '特别说明：' : 'คำแนะนำพิเศษ:'}</strong> {request.special_instructions}
                    </p>
                  </div>
                )}

                {/* Measurement Results */}
                {request.status === 'completed' && request.measured_area_sqm && (
                  <div className="customer-editorial-panel mb-4 bg-green-50 border border-green-200">
                    <div className="flex items-center gap-2 mb-2">
                      <CheckCircleIcon className="w-4 h-4 text-green-600" />
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

                {/* Timestamps */}
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <div className="flex flex-wrap gap-4 text-xs text-gray-500">
                    <span>
                      <strong>{locale === 'en' ? 'Submit a request:' : locale === 'zh' ? '提交请求：' : 'ส่งคำขอ:'}</strong> {formatDate(request.created_at)}
                    </span>
                    {request.assigned_at && (
                      <span>
                        <strong>{locale === 'en' ? 'Assign work:' : locale === 'zh' ? '分配工作：' : 'มอบหมายงาน:'}</strong> {formatDate(request.assigned_at)}
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
    </div>
  );
}
'use client';
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../../../lib/AuthContext';
import { createNotificationWithRetry, getMeasurementRequestsWithDetails, supabase, updateMeasurementRequest, MeasurementRequestWithDetails } from '@/lib/supabaseClient';
import { useToastContext } from '../../../../components/Toast';
import {
  Square3Stack3DIcon,
  ClockIcon,
  UserIcon,
  XCircleIcon,
  ClipboardDocumentCheckIcon,
  MapPinIcon
} from "@heroicons/react/24/outline";
import { 
  CheckCircleIcon as CheckCircleSolid,
  ClockIcon as ClockSolid,
  ExclamationTriangleIcon as ExclamationTriangleSolid
} from "@heroicons/react/24/solid";
import { useI18n } from "@/lib/I18nContext";

// ใช้ interface จาก supabaseClient.ts แทน
// interface MeasurementRequest ถูกแทนที่ด้วย MeasurementRequestWithDetails

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
        label: 'มอบหมายให้แล้ว',
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
  return timeStr.substring(0, 5); // Remove seconds
};

const getFilterLabel = (value: string) => {
  const filters = [
    { value: 'all', label: 'ทั้งหมด' },
    { value: 'pending', label: 'รอดำเนินการ' },
    { value: 'assigned', label: 'มอบหมายแล้ว' },
    { value: 'in_progress', label: 'กำลังดำเนินการ' },
    { value: 'completed', label: 'เสร็จแล้ว' }
  ];
  return filters.find(f => f.value === value)?.label || value;
};

export default function StaffMeasurementRequestsPage() {
  const { profile } = useAuth();
  const { success, error: showError } = useToastContext();
  const [requests, setRequests] = useState<MeasurementRequestWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('pending'); // เริ่มต้นที่ pending
  const [updatingRequestId, setUpdatingRequestId] = useState<string | null>(null);
  
  // Completion form state
  const [completingRequestId, setCompletingRequestId] = useState<string | null>(null);
  const [measuredArea, setMeasuredArea] = useState<number | ''>('');
  const [measurementNotes, setMeasurementNotes] = useState('');
  const [measurementPhotos, setMeasurementPhotos] = useState<string[]>([]);
  const [isSubmittingWork, setIsSubmittingWork] = useState<boolean>(false);

  const getErrorMessage = (error: unknown) =>
    error instanceof Error ? error.message : 'ไม่ทราบสาเหตุ'

  // Remove mock data - we're using real database only

  const fetchMeasurementRequests = useCallback(async () => {
    if (!profile) return;
    
    console.log('🔹 Staff profile data:', profile);
    console.log('🔹 Profile branch_code:', profile.branch_code);
    console.log('🔹 Profile role:', profile.role);
    
    setLoading(true);
    try {
      // เรียก API จริงแทน mock data
      const filters: Record<string, string> = {};
      
      // ตอนนี้ไม่ filter ตาม branch ก่อน ให้แสดงข้อมูลทั้งหมด
      console.log('🔹 Not filtering by branch, showing all requests');
      
      if (statusFilter !== 'all') {
        filters.status = statusFilter;
        console.log('🔹 Using status filter:', filters.status);
      }

      console.log('🔹 Final request filters:', filters);

      try {
        // สำหรับ staff จะดูงานทั้งหมด ไม่จำกัดเฉพาะลูกค้า
        const data = await getMeasurementRequestsWithDetails();
        
        console.log('🔹 API Response data:', data);
        
        // กรองข้อมูลตาม status filter
        let filteredData = data;
        if (statusFilter !== 'all') {
          filteredData = data.filter(request => request.status === statusFilter);
        }
        
        console.log('🔹 Filtered data count:', filteredData.length);
        console.log('🔹 Filtered data:', filteredData);
        
        setRequests(filteredData);
      } catch (error: unknown) {
        console.error('❌ API Error:', error);
        showError('เกิดข้อผิดพลาดในการโหลดข้อมูล: ' + getErrorMessage(error));
        setRequests([]);
      }
    } catch (error: unknown) {
      console.error('Error fetching measurement requests:', error);
      showError('เกิดข้อผิดพลาดในการโหลดข้อมูล');
    }
    setLoading(false);
  }, [profile, showError, statusFilter]);

  useEffect(() => {
    if (profile) {
      fetchMeasurementRequests();
    }
  }, [profile, fetchMeasurementRequests]);

  // ฟังก์ชันสำหรับส่งการแจ้งเตือนไปยังลูกค้า
  const sendNotificationToCustomer = async (customerId: string, message: string, requestId: string) => {
    try {
      // สร้างข้อความที่มี display_name จริงของ staff
      const staffName = profile?.display_name || profile?.email || 'พนักงาน';
      const customerMessage = `ทีมงาน ${staffName} ได้รับงานการวัดพื้นที่ที่ ${message}`;
      
      console.log('📢 Sending measurement notification to customer:', { customerId, message: customerMessage });

      await createNotificationWithRetry({
        user_id: customerId,
        title: 'อัปเดตงานวัดพื้นที่',
        message: customerMessage,
        type: 'info',
        related_measurement_id: requestId,
        read: false,
      }, { context: 'staff.measurements.accept.customer' });

      const { data: admins, error: adminsError } = await supabase
        .from('profiles')
        .select('id')
        .eq('role', 'admin')

      if (!adminsError && admins?.length) {
        await Promise.all(
          admins.map((admin) =>
            createNotificationWithRetry({
              user_id: admin.id,
              title: 'อัปเดตงานวัดพื้นที่',
              message: `พนักงาน ${staffName} รับงานวัดพื้นที่ของลูกค้า`,
              type: 'info',
              related_measurement_id: requestId,
              read: false,
            }, { context: 'staff.measurements.accept.admin' })
          )
        )
      }
      
      console.log('✅ Measurement notifications sent');
      
    } catch (error) {
      console.error('❌ Error sending measurement notifications:', error);
    }
  };

  // ฟังก์ชันส่งแจ้งเตือนเมื่องานเสร็จ
  const sendWorkCompletionNotification = async (customerId: string, houseName: string, measuredArea: number, notes: string, requestId: string) => {
    try {
      const staffName = profile?.display_name || profile?.email || 'พนักงาน';
      
      const customerMessage = `✅ งานวัดพื้นที่เสร็จสิ้น!\n\n📍 ${houseName}\n📏 พื้นที่: ${measuredArea} ตารางเมตร${notes ? `\n📝 หมายเหตุ: ${notes}` : ''}\n\nโดย: ${staffName}`;
      
      console.log('📢 Sending work completion notification to customer:', { customerId, message: customerMessage });

      await createNotificationWithRetry({
        user_id: customerId,
        title: 'งานวัดพื้นที่เสร็จสิ้น',
        message: customerMessage,
        type: 'success',
        related_measurement_id: requestId,
        read: false,
      }, { context: 'staff.measurements.complete.customer' });
      
      console.log('✅ Work completion notification sent to customer');
      
    } catch (error) {
      console.error('❌ Error sending work completion notification:', error);
    }
  };

  // ฟังก์ชันส่งแจ้งเตือนให้แอดมินเมื่องานเสร็จ
  const sendAdminCompletionNotification = async (houseName: string, measuredArea: number, requestId: string) => {
    try {
      const staffName = profile?.display_name || profile?.email || 'พนักงาน';
      
      const adminMessage = `🎯 งานวัดพื้นที่เสร็จสมบูรณ์\n\n📍 ${houseName}\n📏 พื้นที่: ${measuredArea} ตารางเมตร\n👤 โดย: ${staffName}`;

      const { data: admins, error: adminsError } = await supabase
        .from('profiles')
        .select('id')
        .eq('role', 'admin')

      if (!adminsError && admins?.length) {
        await Promise.all(
          admins.map((admin) =>
            createNotificationWithRetry({
              user_id: admin.id,
              title: 'งานวัดพื้นที่เสร็จสมบูรณ์',
              message: adminMessage,
              type: 'success',
              related_measurement_id: requestId,
              read: false,
            }, { context: 'staff.measurements.complete.admin' })
          )
        )
      }
      
      console.log('✅ Work completion notification sent to admin');
      
    } catch (error) {
      console.error('❌ Error sending admin completion notification:', error);
    }
  };

  // ฟังก์ชันรับงานวัดพื้นที่
  const handleAcceptRequest = async (requestId: string) => {
    if (!profile) {
      showError('ไม่พบข้อมูลผู้ใช้');
      return;
    }

    // หา request ที่จะรับงาน
    const request = requests.find(r => r.id === requestId);
    if (!request) {
      showError('ไม่พบข้อมูลคำขอ');
      return;
    }

    setUpdatingRequestId(requestId);
    try {
      console.log('🔄 Staff accepting measurement request:', { requestId, staffId: profile.id });
      
      // เรียก API จริง
      const { error, data } = await updateMeasurementRequest(requestId, {
        status: 'assigned',
        assigned_staff_id: profile.id,
        assigned_at: new Date().toISOString()
      });
      
      console.log('📝 updateMeasurementRequest result:', { error, data });
      
      if (error) {
        showError('เกิดข้อผิดพลาดในการรับงาน: ' + getErrorMessage(error));
      } else {
        success('รับงานวัดพื้นที่เรียบร้อยแล้ว!');
        
        console.log('📢 Sending customer notification...');
        // ส่งการแจ้งเตือนไปยังลูกค้าและแอดมินเท่านั้น
        await sendNotificationToCustomer(
          request.customer_id,
          `${request.houses?.name || 'บ้านของคุณ'} แล้ว จะติดต่อกลับเร็วๆ นี้`,
          request.id
        );
        
        // Refresh ข้อมูลหลัง update สำเร็จเท่านั้น
        console.log('🔄 Refreshing measurement requests...');
        await fetchMeasurementRequests();
        if (statusFilter === 'pending') {
          setStatusFilter('assigned');
        }
      }
    } catch (error) {
      console.error('Error accepting request:', error);
      showError('เกิดข้อผิดพลาดในการรับงาน');
    }
    setUpdatingRequestId(null);
  };

  const handleStartWork = async (requestId: string) => {
    const request = requests.find(r => r.id === requestId);
    
    setUpdatingRequestId(requestId);
    try {
      console.log('🔄 Staff starting measurement work:', { requestId, staffId: profile?.id });
      
      const { error } = await updateMeasurementRequest(requestId, {
        status: 'in_progress'
      });

      if (error) {
        showError("เกิดข้อผิดพลาดในการเริ่มงาน");
      } else {
        success("เริ่มงานแล้ว!");
        
        console.log('📢 Sending work start notification...');
        if (request) {
          await sendNotificationToCustomer(
            request.customer_id,
            `${request.houses?.name || 'บ้านของคุณ'} กำลังดำเนินการวัดพื้นที่`,
            request.id
          );
        }
        
        fetchMeasurementRequests();
      }
    } catch (err) {
      console.error('❌ Error starting work:', err);
      showError("เกิดข้อผิดพลาดที่ไม่คาดคิด");
    }
    setUpdatingRequestId(null);
  };

  const handleCompleteWork = async (requestId: string) => {
    if (!measuredArea || measuredArea <= 0) {
      showError("กรุณากรอกขนาดพื้นที่ที่วัดได้ (ต้องมากกว่า 0)");
      return;
    }

    // หา request ที่จะส่งงาน
    const request = requests.find(r => r.id === requestId);
    if (!request) {
      showError('ไม่พบข้อมูลคำขอ');
      return;
    }

    setIsSubmittingWork(true);
    setUpdatingRequestId(requestId);
    
    try {
      console.log('🏗️ Staff completing measurement work:', { 
        requestId, 
        measuredArea, 
        measurementNotes,
        staffId: profile?.id 
      });

      // อัปเดตข้อมูลในฐานข้อมูล
      const { error } = await updateMeasurementRequest(requestId, {
        status: 'completed',
        measured_area_sqm: Number(measuredArea),
        measurement_notes: measurementNotes || undefined,
        measurement_photos: measurementPhotos.length > 0 ? measurementPhotos : undefined,
        completed_at: new Date().toISOString()
      });

      if (error) {
        showError("เกิดข้อผิดพลาดในการบันทึกผลการวัด: " + getErrorMessage(error));
      } else {
        success("ส่งงานวัดพื้นที่สำเร็จ! ข้อมูลได้ส่งให้ลูกค้าแล้ว");
        
        // ส่งแจ้งเตือนให้ลูกค้าว่างานเสร็จแล้ว
        console.log('📢 Sending completion notification to customer...');
        await sendWorkCompletionNotification(
          request.customer_id,
          request.houses?.name || `บ้าน ${request.house_code}`,
          Number(measuredArea),
          measurementNotes,
          request.id
        );
        
        // ส่งแจ้งเตือนให้แอดมิน
        await sendAdminCompletionNotification(
          request.houses?.name || `บ้าน ${request.house_code}`,
          Number(measuredArea),
          request.id
        );
        
        // รีเซ็ตฟอร์ม
        setCompletingRequestId(null);
        setMeasuredArea('');
        setMeasurementNotes('');
        setMeasurementPhotos([]);
        
        // รีเฟรชข้อมูล
        await fetchMeasurementRequests();
        
        // เปลี่ยนไปแท็บ completed เพื่อดูผลงาน
        if (statusFilter !== 'completed') {
          setStatusFilter('completed');
        }
      }
    } catch (err) {
      console.error('❌ Error completing work:', err);
      showError("เกิดข้อผิดพลาดที่ไม่คาดคิด");
    }
    
    setIsSubmittingWork(false);
    setUpdatingRequestId(null);
  };

  const getActionButtons = (request: MeasurementRequestWithDetails) => {
      const { locale } = useI18n();
    const isMyRequest = request.assigned_staff_id === profile?.id;
    
    switch (request.status) {
      case 'pending':
        if (!request.assigned_staff_id) {
          return (
            <button
              onClick={() => handleAcceptRequest(request.id)}
              disabled={updatingRequestId === request.id}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 text-sm"
            >
              {updatingRequestId === request.id ? 'กำลังรับงาน...' : 'รับงาน'}
            </button>
          );
        }
        break;
      
      case 'assigned':
        if (isMyRequest) {
          return (
            <button
              onClick={() => handleStartWork(request.id)}
              disabled={updatingRequestId === request.id}
              className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 text-sm"
            >
              {updatingRequestId === request.id ? 'กำลังเริ่มงาน...' : 'เริ่มงาน'}
            </button>
          );
        }
        break;
      
      case 'in_progress':
        if (isMyRequest) {
          return (
            <button
              onClick={() => setCompletingRequestId(request.id)}
              className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
            >
              {locale === 'en' ? '               📋 ส่งงาน             ' : locale === 'zh' ? '               📋 ส่งงาน             ' : '               📋 ส่งงาน             '}</button>
          );
        }
        break;
      
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-8">
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

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <Square3Stack3DIcon className="w-8 h-8 text-green-600" />
              <h1 className="text-3xl font-bold text-gray-900">{locale === 'en' ? 'งานวัดพื้นที่' : locale === 'zh' ? 'งานวัดพื้นที่' : 'งานวัดพื้นที่'}</h1>
            </div>
            <p className="text-gray-600">
              {locale === 'en' ? '               จัดการคำขอการวัดพื้นที่และบันทึกผลการวัด             ' : locale === 'zh' ? '               จัดการคำขอการวัดพื้นที่และบันทึกผลการวัด             ' : '               จัดการคำขอการวัดพื้นที่และบันทึกผลการวัด             '}</p>
          </div>
          
          {/* Stats Cards */}
          <div className="flex flex-wrap gap-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 min-w-[120px]">
              <div className="flex items-center gap-3">
                <ClockIcon className="w-8 h-8 text-blue-600" />
                <div>
                  <p className="text-sm text-blue-600 font-medium">{locale === 'en' ? 'งานรอรับ' : locale === 'zh' ? 'งานรอรับ' : 'งานรอรับ'}</p>
                  <p className="text-2xl font-bold text-blue-900">
                    {requests.filter(r => r.status === 'pending').length}
                  </p>
                </div>
              </div>
            </div>
            
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 min-w-[120px]">
              <div className="flex items-center gap-3">
                <UserIcon className="w-8 h-8 text-green-600" />
                <div>
                  <p className="text-sm text-green-600 font-medium">{locale === 'en' ? 'งานของฉัน' : locale === 'zh' ? 'งานของฉัน' : 'งานของฉัน'}</p>
                  <p className="text-2xl font-bold text-green-900">
                    {requests.filter(r => r.assigned_staff_id === profile?.id).length}
                  </p>
                </div>
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
            {statusFilter === 'all' ? 'ยังไม่มีงานวัดพื้นที่' : `ไม่มีงานที่มีสถานะ "${getFilterLabel(statusFilter)}"`}
          </h3>
          <p className="text-gray-500">
            {statusFilter === 'in_progress' 
              ? 'งานที่กำลังดำเนินการจะแสดงที่นี่ เมื่อวัดพื้นที่เสร็จแล้วให้กดปุ่ม "ส่งงาน"' 
              : 'เมื่อมีคำขอการวัดพื้นที่ จะแสดงรายการที่นี่'
            }
          </p>
        </div>
      ) : (
        <>
          {/* แสดงข้อความแจ้งเตือนสำหรับงาน in_progress */}
          {statusFilter === 'in_progress' && requests.length > 0 && (
            <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0">
                  <svg className="w-6 h-6 text-yellow-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-yellow-800">{locale === 'en' ? '💼 งานที่กำลังดำเนินการ' : locale === 'zh' ? '💼 งานที่กำลังดำเนินการ' : '💼 งานที่กำลังดำเนินการ'}</h4>
                  <p className="text-sm text-yellow-700 mt-1">
                    {locale === 'en' ? '                     เมื่อวัดพื้นที่หน้างานเสร็จแล้ว ให้กดปุ่ม ' : locale === 'zh' ? '                     เมื่อวัดพื้นที่หน้างานเสร็จแล้ว ให้กดปุ่ม ' : '                     เมื่อวัดพื้นที่หน้างานเสร็จแล้ว ให้กดปุ่ม '}<strong>{locale === 'en' ? '&quot;📋 ส่งงาน&quot;' : locale === 'zh' ? '&quot;📋 ส่งงาน&quot;' : '&quot;📋 ส่งงาน&quot;'}</strong> {locale === 'en' ? ' เพื่อกรอกผลการวัดและส่งข้อมูลให้ลูกค้าทันที                   ' : locale === 'zh' ? ' เพื่อกรอกผลการวัดและส่งข้อมูลให้ลูกค้าทันที                   ' : ' เพื่อกรอกผลการวัดและส่งข้อมูลให้ลูกค้าทันที                   '}</p>
                </div>
              </div>
            </div>
          )}
          
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
                        {locale === 'en' ? '                         🆕 งานใหม่                       ' : locale === 'zh' ? '                         🆕 งานใหม่                       ' : '                         🆕 งานใหม่                       '}</span>
                    </div>
                  )}
                  
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <Square3Stack3DIcon className="w-6 h-6 text-green-600" />
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">
                          {request.houses?.name || `บ้าน ${request.house_code}`}
                        </h3>
                        <p className="text-sm text-gray-600">
                          {locale === 'en' ? 'code:' : locale === 'zh' ? '代码：' : '                           รหัส: '}{request.house_code}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium ${statusInfo.color}`}>
                        {statusInfo.icon}
                        {statusInfo.label}
                      </span>
                      {getActionButtons(request)}
                    </div>
                  </div>

                  {/* Customer Info */}
                  <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="flex items-center gap-2 text-sm">
                        <UserIcon className="w-4 h-4 text-gray-500" />
                        <span>
                          <strong>{locale === 'en' ? 'customer:' : locale === 'zh' ? '顾客：' : 'ลูกค้า:'}</strong> {
                            request.profiles?.display_name || 
                            `ลูกค้า ${request.customer_id.slice(0, 8)}...`
                          }
                        </span>
                      </div>
                      {/* เบอร์โทรไม่มีในเวอร์ชันปัจจุบัน */}
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

                  {/* Service Schedule Info - ลบออกเนื่องจาก interface ปัจจุบันไม่มี fields เหล่านี้ */}

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
                          <strong>{locale === 'en' ? 'รับงาน:' : locale === 'zh' ? 'รับงาน:' : 'รับงาน:'}</strong> {formatDate(request.assigned_at)}
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
        </>
      )}

      {/* Complete Work Modal */}
      {completingRequestId && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-lg w-full mx-4">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-green-100 rounded-lg">
                <ClipboardDocumentCheckIcon className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <h3 className="text-xl font-semibold text-gray-900">{locale === 'en' ? 'ส่งงานวัดพื้นที่' : locale === 'zh' ? 'ส่งงานวัดพื้นที่' : 'ส่งงานวัดพื้นที่'}</h3>
                <p className="text-sm text-gray-600">{locale === 'en' ? 'กรอกผลการวัดเพื่อส่งให้ลูกค้า' : locale === 'zh' ? 'กรอกผลการวัดเพื่อส่งให้ลูกค้า' : 'กรอกผลการวัดเพื่อส่งให้ลูกค้า'}</p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {locale === 'en' ? '                   ขนาดพื้นที่ที่วัดได้ (ตารางเมตร) *                 ' : locale === 'zh' ? '                   ขนาดพื้นที่ที่วัดได้ (ตารางเมตร) *                 ' : '                   ขนาดพื้นที่ที่วัดได้ (ตารางเมตร) *                 '}</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={measuredArea}
                  onChange={(e) => setMeasuredArea(e.target.value === '' ? '' : parseFloat(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder={locale === 'en' ? 'เช่น 150.5' : locale === 'zh' ? 'เช่น 150.5' : 'เช่น 150.5'}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {locale === 'en' ? '                   หมายเหตุการวัด                 ' : locale === 'zh' ? '                   หมายเหตุการวัด                 ' : '                   หมายเหตุการวัด                 '}</label>
                <textarea
                  value={measurementNotes}
                  onChange={(e) => setMeasurementNotes(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  rows={3}
                  placeholder={locale === 'en' ? 'เช่น พื้นที่สามารถทำความสะอาดได้ปกติ...' : locale === 'zh' ? 'เช่น พื้นที่สามารถทำความสะอาดได้ปกติ...' : 'เช่น พื้นที่สามารถทำความสะอาดได้ปกติ...'}
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => {
                  setCompletingRequestId(null);
                  setMeasuredArea('');
                  setMeasurementNotes('');
                }}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
              >
                {locale === 'en' ? 'cancel' : locale === 'zh' ? '取消' : '                 ยกเลิก               '}</button>
              <button
                onClick={() => handleCompleteWork(completingRequestId!)}
                disabled={!measuredArea || isSubmittingWork}
                className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-colors"
              >
                {isSubmittingWork ? (
                  <>
                    <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    {locale === 'en' ? '                     กำลังส่งงาน...                   ' : locale === 'zh' ? '                     กำลังส่งงาน...                   ' : '                     กำลังส่งงาน...                   '}</>
                ) : (
                  <>
                    {locale === 'en' ? '                     🚀 ส่งงานให้ลูกค้า                   ' : locale === 'zh' ? '                     🚀 ส่งงานให้ลูกค้า                   ' : '                     🚀 ส่งงานให้ลูกค้า                   '}</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

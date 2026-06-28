import { supabase } from './supabaseClient';

export interface JobAssignment {
  id: string;
  order_id: string | null;
  staff_id: string | null;
  assigned_date: string | null;
  status: string;
  notes: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
  orders?: {
    id: string;
    order_code: string | null;
    scheduled_date: string | null;
    total: number | null;
    priority?: string | null;
    notes?: string | null;
    services?: { service_name: string | null } | null;
    houses?: { name: string | null; address: string | null; house_code: string | null } | null;
    profiles?: { display_name: string | null; phone: string | null } | null;
  } | null;
}

export class JobService {
  /**
   * อัปเดตสถานะงาน - ใช้ API route แทน direct Supabase
   */
  static async updateJobStatus(jobId: string, newStatus: string, userId: string): Promise<JobAssignment> {
    try {
      console.log('🔄 JobService: Updating via API:', { jobId, newStatus, userId });
      
      const response = await fetch('/api/jobs', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          jobId,
          status: newStatus,
          staffId: userId
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'ไม่สามารถอัปเดตสถานะได้');
      }

      const result = await response.json();
      console.log('✅ JobService: API response:', result);
      
      return result.job;
    } catch (error) {
      console.error('❌ JobService.updateJobStatus error:', error);
      throw error;
    }
  }

  /**
   * ดึงงานทั้งหมด (สำหรับแอดมิน)
   */
  static async getAllJobs(): Promise<JobAssignment[]> {
    try {
      if (!supabase) {
        throw new Error('Supabase client not configured');
      }

      const { data, error } = await supabase
        .from('job_assignments')
        .select(`
          *,
          profiles:staff_id (
            id,
            display_name,
            email
          )
        `)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('❌ Error fetching all jobs:', error);
        throw new Error(`ไม่สามารถดึงข้อมูลงานได้: ${error.message}`);
      }

      console.log('✅ All jobs fetched:', data?.length || 0);
      return data || [];
    } catch (error) {
      console.error('❌ JobService.getAllJobs error:', error);
      throw error;
    }
  }

  /**
   * มอบหมายงานให้พนักงาน
   */
  static async assignJobToStaff(jobId: string, staffId: string): Promise<JobAssignment> {
    try {
      if (!supabase) {
        throw new Error('Supabase client not configured');
      }

      const { data, error } = await supabase
        .from('job_assignments')
        .update({
          staff_id: staffId,
          status: 'assigned',
          assigned_date: new Date().toISOString().split('T')[0],
          updated_at: new Date().toISOString()
        })
        .eq('id', jobId)
        .select()
        .single();

      if (error) {
        console.error('❌ Error assigning job:', error);
        throw new Error(`ไม่สามารถมอบหมายงานได้: ${error.message}`);
      }

      console.log('✅ Job assigned successfully:', data);
      return data;
    } catch (error) {
      console.error('❌ JobService.assignJobToStaff error:', error);
      throw error;
    }
  }

  /**
   * สร้างงานใหม่
   */
  static async createNewJob(jobData: {
    notes: string;
    assigned_date: string;
    staff_id: string;
    status: string;
  }): Promise<JobAssignment> {
    try {
      if (!supabase) {
        throw new Error('Supabase client not configured');
      }

      const newJob = {
        id: crypto.randomUUID(),
        order_id: null,
        staff_id: jobData.staff_id,
        assigned_date: jobData.assigned_date,
        status: jobData.status,
        notes: jobData.notes,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const { data, error } = await supabase
        .from('job_assignments')
        .insert([newJob])
        .select()
        .single();

      if (error) {
        console.error('❌ Error creating job:', error);
        throw new Error(`ไม่สามารถสร้างงานได้: ${error.message}`);
      }

      console.log('✅ Job created successfully:', data);
      return data;
    } catch (error) {
      console.error('❌ JobService.createNewJob error:', error);
      throw error;
    }
  }

  /**
   * ดึงงานทั้งหมดของพนักงาน
   */
  static async getStaffJobs(staffId: string): Promise<JobAssignment[]> {
    try {
      console.log('🔍 Fetching jobs for staff:', staffId);
      
      if (!supabase) {
        throw new Error('Supabase client not configured');
      }
      
      const { data, error } = await supabase
        .from('job_assignments')
        .select(`
          *,
          orders (
            id,
            order_code,
            scheduled_date,
            total,
            priority,
            notes,
            services (service_name),
            houses!orders_house_id_fkey (name, address, house_code),
            profiles!orders_customer_id_fkey (display_name, phone)
          )
        `)
        .eq('staff_id', staffId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('❌ Error fetching staff jobs:', error);
        throw new Error(`ไม่สามารถดึงข้อมูลงานได้: ${error.message}`);
      }

      console.log('✅ Jobs fetched:', data?.length || 0, 'jobs');
      return data || [];
    } catch (error) {
      console.error('❌ JobService.getStaffJobs error:', error);
      return [];
    }
  }

  /**
   * เพิ่มหมายเหตุในงาน
   */
  static async addJobNote(jobId: string, note: string, userId: string): Promise<JobAssignment> {
    try {
      if (!supabase) {
        throw new Error('Supabase client not configured');
      }
      
      const { data, error } = await supabase
        .from('job_assignments')
        .update({ 
          notes: note,
          updated_at: new Date().toISOString()
        })
        .eq('id', jobId)
        .eq('staff_id', userId)
        .select()
        .single();

      if (error) {
        throw new Error(`ไม่สามารถเพิ่มหมายเหตุได้: ${error.message}`);
      }

      return data;
    } catch (error) {
      console.error('❌ JobService.addJobNote error:', error);
      throw error;
    }
  }

  /**
   * ส่งแจ้งเตือนให้ลูกค้า (ผ่าน Custom Event)
   */
  private static async notifyCustomer(orderId: string, status: string) {
    try {
      const statusMessages: Record<string, string> = {
        'in_progress': 'พนักงานเริ่มดำเนินงานแล้ว',
        'completed': 'งานของคุณเสร็จสิ้นแล้ว',
        'assigned': 'ได้รับมอบหมายงานใหม่'
      };

      const message = statusMessages[status] || `สถานะงานเปลี่ยนเป็น ${status}`;

      // ส่ง custom event เพื่อแจ้งเตือน
      const notificationEvent = new CustomEvent('newNotification', {
        detail: {
          message,
          type: status === 'completed' ? 'success' : 'info',
          orderId,
          status,
          timestamp: new Date().toISOString()
        }
      });

      window.dispatchEvent(notificationEvent);
      console.log('🔔 Notification sent:', message);
    } catch (error) {
      console.error('❌ Error sending notification:', error);
    }
  }

  /**
   * ตรวจสอบสถานะงาน
   */
  static getStatusInfo(status: string) {
    const statusMap = {
      'assigned': {
        text: 'ได้รับมอบหมาย',
        color: 'bg-yellow-100 text-yellow-800 border-yellow-200',
        nextAction: 'เริ่มงาน',
        nextStatus: 'in_progress'
      },
      'in_progress': {
        text: 'กำลังดำเนินการ',
        color: 'bg-blue-100 text-blue-800 border-blue-200',
        nextAction: 'งานเสร็จ',
        nextStatus: 'completed'
      },
      'completed': {
        text: 'เสร็จสิ้น',
        color: 'bg-green-100 text-green-800 border-green-200',
        nextAction: null,
        nextStatus: null
      }
    };

    return statusMap[status as keyof typeof statusMap] || {
      text: status,
      color: 'bg-gray-100 text-gray-800 border-gray-200',
      nextAction: null,
      nextStatus: null
    };
  }
}

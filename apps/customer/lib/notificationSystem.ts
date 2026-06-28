// notification-system.ts - Centralized notification management
export interface NotificationData {
  id: number;
  customerId?: string;
  staffId?: string;
  message: string;
  type: 'accept' | 'complete' | 'assign' | 'status_update';
  staffName?: string;
  recipientType: 'customer' | 'staff' | 'admin';
  timestamp: string;
  read: boolean;
  metadata?: {
    measurementRequestId?: string;
    orderId?: string;
    houseCode?: string;
  };
}

export class NotificationManager {
  private static instance: NotificationManager;
  private listeners: ((notification: NotificationData) => void)[] = [];

  static getInstance(): NotificationManager {
    if (!this.instance) {
      this.instance = new NotificationManager();
    }
    return this.instance;
  }

  // เพิ่ม listener สำหรับรับแจ้งเตือน
  addListener(callback: (notification: NotificationData) => void) {
    this.listeners.push(callback);
  }

  // ลบ listener
  removeListener(callback: (notification: NotificationData) => void) {
    this.listeners = this.listeners.filter(listener => listener !== callback);
  }

  // ส่งแจ้งเตือน
  async sendNotification(notification: NotificationData) {
    // ส่งผ่าน CustomEvent (สำหรับ same-tab notifications)
    const customEvent = new CustomEvent('newNotification', {
      detail: notification
    });
    window.dispatchEvent(customEvent);

    // เรียก listeners ทั้งหมด
    this.listeners.forEach(listener => {
      try {
        listener(notification);
      } catch (error) {
        console.error('Error in notification listener:', error);
      }
    });

    // แสดง browser notification ถ้าได้รับอนุญาต
    if (Notification.permission === 'granted') {
      const title = this.getNotificationTitle(notification.type);
      const body = notification.staffName 
        ? `${notification.staffName} ${notification.message}` 
        : notification.message;

      new Notification(title, {
        body,
        icon: '/favicon.ico',
        tag: `notification-${notification.id}`, // ป้องกันการแสดงซ้ำ
        requireInteraction: false
      });
    }

    // บันทึกลง localStorage สำหรับ persistence
    this.saveToStorage(notification);

    console.log(`📢 Notification sent:`, notification);
  }

  // ขอสิทธิ์ browser notification
  async requestPermission(): Promise<NotificationPermission> {
    if ('Notification' in window) {
      if (Notification.permission === 'default') {
        return await Notification.requestPermission();
      }
      return Notification.permission;
    }
    return 'denied';
  }

  // โหลดแจ้งเตือนจาก localStorage
  loadFromStorage(userId: string): NotificationData[] {
    try {
      const stored = localStorage.getItem(`notifications_${userId}`);
      if (stored) {
        const notifications = JSON.parse(stored);
        // กรองแจ้งเตือนที่เก่าเกิน 7 วัน
        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
        
        return notifications.filter((n: NotificationData) => 
          new Date(n.timestamp) > oneWeekAgo
        );
      }
    } catch (error) {
      console.error('Error loading notifications from storage:', error);
    }
    return [];
  }

  // บันทึกแจ้งเตือนลง localStorage
  private saveToStorage(notification: NotificationData) {
    try {
      const userId = notification.customerId || notification.staffId || 'unknown';
      const existing = this.loadFromStorage(userId);
      const updated = [notification, ...existing.slice(0, 49)]; // เก็บแค่ 50 รายการล่าสุด
      
      localStorage.setItem(`notifications_${userId}`, JSON.stringify(updated));
    } catch (error) {
      console.error('Error saving notification to storage:', error);
    }
  }

  private getNotificationTitle(type: string): string {
    switch (type) {
      case 'accept':
      case 'assign':
        return 'งานได้รับการรับรอง';
      case 'complete':
        return 'งานเสร็จสิ้น';
      case 'status_update':
        return 'อัปเดตสถานะ';
      default:
        return 'แจ้งเตือนใหม่';
    }
  }
}

// Helper function สำหรับส่งแจ้งเตือนแบบง่าย
export async function sendNotificationToCustomer(
  customerId: string,
  message: string,
  type: 'accept' | 'complete' | 'assign' | 'status_update' = 'status_update',
  staffName?: string,
  metadata?: NotificationData['metadata']
) {
  const notification: NotificationData = {
    id: Date.now(),
    customerId,
    message,
    type,
    staffName,
    recipientType: 'customer',
    timestamp: new Date().toISOString(),
    read: false,
    metadata
  };

  const manager = NotificationManager.getInstance();
  await manager.sendNotification(notification);
}

export async function sendNotificationToStaff(
  staffId: string,
  message: string,
  type: 'accept' | 'complete' | 'assign' | 'status_update' = 'status_update',
  metadata?: NotificationData['metadata']
) {
  const notification: NotificationData = {
    id: Date.now(),
    staffId,
    message,
    type,
    recipientType: 'staff',
    timestamp: new Date().toISOString(),
    read: false,
    metadata
  };

  const manager = NotificationManager.getInstance();
  await manager.sendNotification(notification);
}

export async function sendNotificationToAdmin(
  message: string,
  type: 'accept' | 'complete' | 'assign' | 'status_update' = 'status_update',
  metadata?: NotificationData['metadata']
) {
  const notification: NotificationData = {
    id: Date.now(),
    message,
    type,
    recipientType: 'admin',
    timestamp: new Date().toISOString(),
    read: false,
    metadata
  };

  const manager = NotificationManager.getInstance();
  await manager.sendNotification(notification);
}

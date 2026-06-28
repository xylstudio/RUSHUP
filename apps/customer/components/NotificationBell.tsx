'use client';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { BellIcon } from '@heroicons/react/24/outline';
import { BellIcon as BellSolidIcon } from '@heroicons/react/24/solid';
import { 
  getNotifications, 
  markNotificationAsRead, 
  markAllNotificationsAsRead,
  getUnreadNotificationCount,
  Notification,
  supabase
} from '../lib/supabaseClient';
import { playAppSound } from '@/lib/audioUtils';
import { useAuth } from '../lib/AuthContext';
import { formatDateTimeByLocale } from '@/lib/localeFormat';
import { useI18n } from "@/lib/I18nContext";

interface NotificationBellProps {
  variant?: 'light' | 'dark'
}

export default function NotificationBell({ variant = 'light' }: NotificationBellProps) {
  const { user, profile } = useAuth();
  const { locale } = useI18n();
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);

  const playNotificationSound = () => {
    try {
      playAppSound('notification');
    } catch (error) {
      // ignore
    }
  };

  // Load notifications from database
  const loadNotifications = useCallback(async (options?: { silent?: boolean }) => {
    if (!user?.id) return;

    const silent = Boolean(options?.silent);
    if (!silent) {
      setLoading(true);
    }

    try {
      const { data: notificationData } = await getNotifications(user.id);
      const { data: unreadCountData } = await getUnreadNotificationCount(user.id);

      setNotifications(notificationData);
      setUnreadCount(unreadCountData);
      setSyncError(null);
    } catch (error) {
      console.error('Error loading notifications:', error);
      setSyncError('การเชื่อมต่อแจ้งเตือนไม่เสถียร ระบบจะรีเฟรชอัตโนมัติ');
    } finally {
      if (!silent) {
        setLoading(false);
      }
    }
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id) return;

    // Initial load
    void loadNotifications();

    // Supabase Realtime + fallback refresh
    const channel = supabase
      .channel(`notifications-bell-${user.id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` },
        (payload) => {
          const incoming = payload.new as Notification;
          setNotifications((prev) => {
            if (prev.some((item) => item.id === incoming.id)) return prev;
            return [incoming, ...prev];
          });
          if (!incoming.read) {
            setUnreadCount((prev) => prev + 1);
          }
          playNotificationSound();
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` },
        () => {
          void loadNotifications({ silent: true });
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          setSyncError(null);
        }
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          setSyncError('Realtime หลุดชั่วคราว ระบบกำลังดึงข้อมูลใหม่ให้อัตโนมัติ');
        }
      });

    const poller = window.setInterval(() => {
      void loadNotifications({ silent: true });
    }, 30000);

    const refreshOnFocus = () => {
      void loadNotifications({ silent: true });
    };

    const refreshOnVisible = () => {
      if (document.visibilityState === 'visible') {
        void loadNotifications({ silent: true });
      }
    };

    window.addEventListener('focus', refreshOnFocus);
    document.addEventListener('visibilitychange', refreshOnVisible);

    return () => {
      window.clearInterval(poller);
      window.removeEventListener('focus', refreshOnFocus);
      document.removeEventListener('visibilitychange', refreshOnVisible);
      void supabase.removeChannel(channel);
    };
  }, [loadNotifications, user?.id]);

  useEffect(() => {
    // Listen for custom events for new notifications
    const handleNotification = () => {
      void loadNotifications({ silent: true });
      playNotificationSound();
    };

    // Listen to various notification events
    window.addEventListener('newNotification', handleNotification as EventListener);
    window.addEventListener('jobStatusUpdate', handleNotification as EventListener);
    window.addEventListener('customerNotification', handleNotification as EventListener);

    return () => {
      window.removeEventListener('newNotification', handleNotification as EventListener);
      window.removeEventListener('jobStatusUpdate', handleNotification as EventListener);
      window.removeEventListener('customerNotification', handleNotification as EventListener);
    };
  }, [loadNotifications]);

  const handleMarkAsRead = async (notificationId: string) => {
    try {
      await markNotificationAsRead(notificationId);
      setNotifications(prev =>
        prev.map(notification =>
          notification.id === notificationId
            ? { ...notification, read: true, read_at: new Date().toISOString() }
            : notification
        )
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const handleMarkAllAsRead = async () => {
    if (!user?.id) return;
    
    try {
      await markAllNotificationsAsRead(user.id);
      setNotifications(prev =>
        prev.map(notification => ({ 
          ...notification, 
          read: true, 
          read_at: new Date().toISOString() 
        }))
      );
      setUnreadCount(0);
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  };

  /** คลิกที่การแจ้งเตือน → mark as read แล้ว navigate ไปหน้าที่เกี่ยวข้อง */
  const handleNotificationClick = async (notification: Notification) => {
    // Mark as read first (fire-and-forget)
    if (!notification.read) {
      handleMarkAsRead(notification.id).catch(() => {});
    }
    setIsOpen(false);

    const role = (profile as any)?.role as string | undefined;
    const { related_order_id, related_measurement_id } = notification;

    if (role === 'admin') {
      if (related_order_id) { router.push(`/dashboard/admin/orders/${related_order_id}`); return; }
      if (related_measurement_id) { router.push('/dashboard/admin/measurements'); return; }
      router.push('/dashboard/admin');
      return;
    }

    if (role === 'customer') {
      if (related_order_id) { router.push(`/dashboard/customer/orders/${related_order_id}`); return; }
      router.push('/dashboard/customer');
      return;
    }

    if (role === 'staff') {
      if (related_order_id && user?.id) {
        // Staff task URL uses job_assignment.id — look it up
        try {
          const { data } = await supabase
            .from('job_assignments')
            .select('id')
            .eq('order_id', related_order_id)
            .eq('staff_id', user.id)
            .maybeSingle();
          if (data?.id) { router.push(`/dashboard/staff/tasks/${data.id}`); return; }
        } catch { /* fall through */ }
      }
      router.push('/dashboard/staff/tasks');
      return;
    }

    // Fallback — go to main dashboard
    router.push('/dashboard');
  };

  const getNotificationTitle = (notification: Notification) => {
    if (notification.title?.trim()) return notification.title.trim();

    switch (notification.type) {
      case 'success':
        return 'อัปเดตสำเร็จ';
      case 'warning':
        return 'แจ้งเตือนสำคัญ';
      case 'error':
        return 'เกิดข้อผิดพลาด';
      default:
        return 'อัปเดตล่าสุด';
    }
  };

  const getNotificationDotColor = (type: string) => {
    switch (type) {
      case 'success':
        return 'text-emerald-500';
      case 'warning':
        return 'text-amber-500';
      case 'error':
        return 'text-rose-500';
      default:
        return 'text-slate-400';
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'success':
        return '●';
      case 'warning':
        return '●';
      case 'error':
        return '●';
      default:
        return '●';
    }
  };

  if (!user) return null;

  const buttonClass =
    variant === 'dark'
      ? 'relative rounded-lg p-2 text-white/80 transition-colors hover:bg-white/10 hover:text-white'
      : 'relative rounded-lg p-2 text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-900'

  const unreadBadgeClass =
    variant === 'dark'
      ? 'absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs font-medium text-white border border-[#1A1A1A]'
      : 'absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs font-medium text-white'

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={buttonClass}
        title={`แจ้งเตือน ${unreadCount > 0 ? `(${unreadCount} ข้อความใหม่)` : ''}`}
      >
        {unreadCount > 0 ? (
          <BellSolidIcon className="h-6 w-6 text-red-500" />
        ) : (
          <BellIcon className="h-6 w-6" />
        )}
        
        {unreadCount > 0 && (
          <span className={`${unreadBadgeClass} animate-pulse`}>
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setIsOpen(false)}
          />
          
          {/* Notification Panel */}
          <div className="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-xl border border-gray-200 z-50 max-h-96 flex flex-col overflow-hidden">
            {/* Header */}
            <div className="px-4 py-3 border-b border-gray-100 flex justify-between items-center bg-white">
              <div>
                <h3 className="text-sm font-semibold text-gray-900">{locale === 'en' ? 'warn' : locale === 'zh' ? '警告' : 'แจ้งเตือน'}</h3>
                <p className="text-[11px] text-gray-500">{unreadCount > 0 ? `${unreadCount} รายการยังไม่ได้อ่าน` : 'ไม่มีรายการใหม่'}</p>
              </div>
              <div className="flex gap-2">
                {unreadCount > 0 && (
                  <button
                    onClick={handleMarkAllAsRead}
                    className="text-xs text-gray-600 hover:text-gray-900 font-medium"
                  >
                    {locale === 'en' ? 'Read all' : locale === 'zh' ? '阅读全部' : '                     อ่านทั้งหมด                   '}</button>
                )}
              </div>
            </div>

            {/* Notification List */}
            <div className="flex-1 overflow-y-auto">
              {syncError && (
                <div className="px-4 py-2 text-[11px] text-amber-700 bg-amber-50 border-b border-amber-100">
                  {syncError}
                </div>
              )}

              {loading ? (
                <div className="p-4 text-center">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
                  <p className="text-sm text-gray-500 mt-2">{locale === 'en' ? 'Loading...' : locale === 'zh' ? '加载中...' : 'กำลังโหลด...'}</p>
                </div>
              ) : notifications.length > 0 ? (
                notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`px-4 py-3 border-b border-gray-100 cursor-pointer transition-colors ${
                      !notification.read ? 'bg-slate-50 hover:bg-slate-100' : 'bg-white hover:bg-gray-50'
                    }`}
                    onClick={() => void handleNotificationClick(notification)}
                  >
                    <div className="flex items-start gap-2.5">
                      <span className={`text-xs flex-shrink-0 mt-1 ${getNotificationDotColor(notification.type || 'info')}`}>
                        {getNotificationIcon(notification.type || 'info')}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <p className={`text-xs ${!notification.read ? 'font-semibold text-gray-900' : 'font-medium text-gray-700'}`}>
                            {getNotificationTitle(notification)}
                          </p>
                          <p className="text-[10px] text-gray-400 shrink-0">
                            {formatDateTimeByLocale(notification.created_at, locale)}
                          </p>
                        </div>
                        <p className={`text-sm mt-1 leading-relaxed ${!notification.read ? 'text-gray-800' : 'text-gray-600'}`}>
                          {notification.message}
                        </p>
                        {(notification.related_order_id || notification.related_measurement_id) && (
                          <p className="text-[11px] text-gray-400 mt-1.5">
                            {locale === 'en' ? 'Tap to see details.' : locale === 'zh' ? '点击查看详细信息。' : '                             แตะเพื่อดูรายละเอียด                           '}</p>
                        )}
                      </div>
                      {!notification.read && (
                        <div className="w-1.5 h-1.5 bg-[#1A1A1A] rounded-full flex-shrink-0 mt-2"></div>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-8 text-center text-gray-500">
                  <BellIcon className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-sm">{locale === 'en' ? 'No notification' : locale === 'zh' ? '无通知' : 'ไม่มีแจ้งเตือน'}</p>
                  <p className="text-xs text-gray-400 mt-1">{locale === 'en' ? 'New notifications will appear here.' : locale === 'zh' ? '新的通知将出现在这里。' : 'แจ้งเตือนใหม่จะปรากฏที่นี่'}</p>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
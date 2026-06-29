'use client';
import { useEffect, useState } from 'react';
import { getAuditLogs, supabase, type AuditLog } from '../../../../lib/supabaseClient';
import { useI18n } from "@/lib/I18nContext";

type ViewMode = 'failed' | 'consent' | 'security' | 'all';

const CONSENT_ACTIONS = new Set([
  'register_succeeded',
  'privacy_policy_accepted',
  'terms_of_service_accepted',
  'marketing_consent_granted',
  'line_account_linked',
  'workshop_checkout_started',
]);

const SECURITY_ACTIONS = new Set([
  'register_failed',
  'register_exception',
  'line_login_succeeded',
  'line_link_verification_failed',
  'notification_delivery_failed',
  'line_notification_delivery_failed',
  'workshop_payment_initiated',
]);

type FailedNotificationDetail = {
  context?: string;
  error?: string;
  attempts?: number;
  requestId?: string;
};

export default function AuditLogsPage() {
    const { locale } = useI18n();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('failed');
  const [retryingLogId, setRetryingLogId] = useState<number | null>(null);
  const [retryMessage, setRetryMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const { data, error } = await getAuditLogs();
        if (error) {
          throw new Error((error as any)?.message || 'เกิดข้อผิดพลาด');
        }
        setLogs(data || []);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchLogs();
  }, []);

  const failedLogs = logs.filter(
    (log) => log.action === 'notification_delivery_failed' || log.action === 'line_notification_delivery_failed'
  );
  const consentLogs = logs.filter((log) => CONSENT_ACTIONS.has(log.action));
  const securityLogs = logs.filter((log) => SECURITY_ACTIONS.has(log.action));
  const displayedLogs = viewMode === 'failed'
    ? failedLogs
    : viewMode === 'consent'
      ? consentLogs
      : viewMode === 'security'
        ? securityLogs
        : logs;

  const parseFailureDetails = (details: any): FailedNotificationDetail => {
    if (!details || typeof details !== 'object') {
      return {};
    }

    return {
      context: typeof details.context === 'string' ? details.context : undefined,
      error: typeof details.error === 'string' ? details.error : undefined,
      attempts: typeof details.attempts === 'number' ? details.attempts : undefined,
      requestId: typeof details.request_id === 'string' ? details.request_id : undefined,
    };
  };

  const canRetryFailure = (details: any) => {
    return !!details?.notification?.user_id && !!details?.notification?.message;
  };

  const handleRetry = async (auditLogId: number) => {
    setRetryMessage(null);
    setRetryingLogId(auditLogId);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession()

      const response = await fetch('/api/notifications/retry-delivery', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
        },
        body: JSON.stringify({ auditLogId }),
      });

      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(result?.error || 'Retry ไม่สำเร็จ');
      }

      setRetryMessage({ type: 'success', text: `Retry สำเร็จ (log #${auditLogId})` });
    } catch (err: any) {
      setRetryMessage({ type: 'error', text: err?.message || 'Retry ไม่สำเร็จ' });
    } finally {
      setRetryingLogId(null);
    }
  };

  const groupedByContext = failedLogs.reduce<Record<string, number>>((acc, log) => {
    const detail = parseFailureDetails(log.details);
    const key = detail.context || 'unknown';
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});

  const sortedContexts = Object.entries(groupedByContext)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString('th-TH', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      timeZone: 'Asia/Bangkok' // Should dynamically use user's timezone later
    });
  };

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-900 mb-2">{locale === 'en' ? 'บันทึกการตรวจสอบ (Audit Log)' : locale === 'zh' ? 'บันทึกการตรวจสอบ (Audit Log)' : 'บันทึกการตรวจสอบ (Audit Log)'}</h1>
      <p className="text-gray-600 mb-6">{locale === 'en' ? 'ติดตามข้อผิดพลาดการส่งแจ้งเตือนและเหตุการณ์ระบบล่าสุด' : locale === 'zh' ? 'ติดตามข้อผิดพลาดการส่งแจ้งเตือนและเหตุการณ์ระบบล่าสุด' : 'ติดตามข้อผิดพลาดการส่งแจ้งเตือนและเหตุการณ์ระบบล่าสุด'}</p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="text-sm text-red-700">{locale === 'en' ? 'ส่งแจ้งเตือนไม่สำเร็จ (ทั้งหมด)' : locale === 'zh' ? 'ส่งแจ้งเตือนไม่สำเร็จ (ทั้งหมด)' : 'ส่งแจ้งเตือนไม่สำเร็จ (ทั้งหมด)'}</div>
          <div className="text-2xl font-semibold text-red-800">{failedLogs.length}</div>
        </div>
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <div className="text-sm text-gray-600">Consent / Compliance Events</div>
          <div className="text-2xl font-semibold text-gray-900">{consentLogs.length}</div>
        </div>
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <div className="text-sm text-gray-600">Security / Failure Events</div>
          <div className="text-sm font-medium text-gray-900 mt-1">
            {securityLogs[0]?.created_at ? formatTimestamp(securityLogs[0].created_at) : 'ยังไม่พบ'}
          </div>
        </div>
      </div>

      {sortedContexts.length > 0 && (
        <div className="bg-white shadow-sm rounded-lg p-4 mb-6 border border-gray-100">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">{locale === 'en' ? 'Top Context ที่ล้มเหลวบ่อย' : locale === 'zh' ? 'Top Context ที่ล้มเหลวบ่อย' : 'Top Context ที่ล้มเหลวบ่อย'}</h2>
          <div className="flex flex-wrap gap-2">
            {sortedContexts.map(([context, count]) => (
              <span key={context} className="inline-flex items-center rounded-full bg-amber-100 text-amber-800 px-3 py-1 text-xs font-medium">
                {context}: {count}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="flex items-center gap-2 mb-4">
        <button
          type="button"
          onClick={() => setViewMode('failed')}
          className={`px-3 py-1.5 rounded-md text-sm font-medium ${
            viewMode === 'failed' ? 'bg-red-600 text-white' : 'bg-gray-100 text-gray-700'
          }`}
        >
          {locale === 'en' ? '           เฉพาะส่งแจ้งเตือนไม่สำเร็จ         ' : locale === 'zh' ? '           เฉพาะส่งแจ้งเตือนไม่สำเร็จ         ' : '           เฉพาะส่งแจ้งเตือนไม่สำเร็จ         '}</button>
        <button
          type="button"
          onClick={() => setViewMode('consent')}
          className={`px-3 py-1.5 rounded-md text-sm font-medium ${
            viewMode === 'consent' ? 'bg-emerald-600 text-white' : 'bg-gray-100 text-gray-700'
          }`}
        >
          Consent / Policy
        </button>
        <button
          type="button"
          onClick={() => setViewMode('security')}
          className={`px-3 py-1.5 rounded-md text-sm font-medium ${
            viewMode === 'security' ? 'bg-amber-600 text-white' : 'bg-gray-100 text-gray-700'
          }`}
        >
          Security / Access
        </button>
        <button
          type="button"
          onClick={() => setViewMode('all')}
          className={`px-3 py-1.5 rounded-md text-sm font-medium ${
            viewMode === 'all' ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-700'
          }`}
        >
          {locale === 'en' ? '           ดูทั้งหมด         ' : locale === 'zh' ? '           ดูทั้งหมด         ' : '           ดูทั้งหมด         '}</button>
      </div>

      {retryMessage && (
        <div className={`mb-4 rounded-md border px-3 py-2 text-sm ${
          retryMessage.type === 'success'
            ? 'border-green-200 bg-green-50 text-green-700'
            : 'border-red-200 bg-red-50 text-red-700'
        }`}>
          {retryMessage.text}
        </div>
      )}
      
      <div className="bg-white shadow-md rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full leading-normal">
            <thead>
              <tr className="bg-gray-100 text-left text-gray-600 uppercase text-sm">
                <th className="px-5 py-3 border-b-2 border-gray-200">{locale === 'en' ? 'เวลา' : locale === 'zh' ? 'เวลา' : 'เวลา'}</th>
                <th className="px-5 py-3 border-b-2 border-gray-200">{locale === 'en' ? 'ผู้ใช้' : locale === 'zh' ? 'ผู้ใช้' : 'ผู้ใช้'}</th>
                <th className="px-5 py-3 border-b-2 border-gray-200">{locale === 'en' ? 'การกระทำ' : locale === 'zh' ? 'การกระทำ' : 'การกระทำ'}</th>
                <th className="px-5 py-3 border-b-2 border-gray-200">{locale === 'en' ? 'รายละเอียด' : locale === 'zh' ? 'รายละเอียด' : 'รายละเอียด'}</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={4} className="text-center py-5">{locale === 'en' ? 'Loading data...' : locale === 'zh' ? '正在加载数据...' : 'กำลังโหลดข้อมูล...'}</td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan={4} className="text-center py-5 text-red-500">{locale === 'en' ? 'เกิดข้อผิดพลาด: ' : locale === 'zh' ? 'เกิดข้อผิดพลาด: ' : 'เกิดข้อผิดพลาด: '}{error}</td>
                </tr>
              ) : displayedLogs.length === 0 ? (
                <tr>
                  <td colSpan={4} className="text-center py-5">{locale === 'en' ? 'ไม่พบข้อมูลที่ตรงกับตัวกรอง' : locale === 'zh' ? 'ไม่พบข้อมูลที่ตรงกับตัวกรอง' : 'ไม่พบข้อมูลที่ตรงกับตัวกรอง'}</td>
                </tr>
              ) : (
                displayedLogs.map(log => {
                    const { locale } = useI18n();
                  const failureDetails = parseFailureDetails(log.details);

                  return (
                  <tr key={log.id} className="border-b border-gray-200 hover:bg-gray-50">
                    <td className="px-5 py-4 text-sm whitespace-nowrap">
                      {formatTimestamp(log.created_at)}
                    </td>
                    <td className="px-5 py-4 text-sm">
                      {log.user_email || 'N/A'}
                    </td>
                    <td className="px-5 py-4 text-sm">
                      <span className={`text-xs font-semibold mr-2 px-2.5 py-0.5 rounded ${
                        log.action === 'notification_delivery_failed' || log.action === 'line_notification_delivery_failed'
                          ? 'bg-red-100 text-red-800'
                          : CONSENT_ACTIONS.has(log.action)
                            ? 'bg-emerald-100 text-emerald-800'
                            : SECURITY_ACTIONS.has(log.action)
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-blue-100 text-blue-800'
                      }`}>
                        {log.action}
                      </span>
                      {failureDetails.context && (
                        <div className="mt-1 text-xs text-gray-500">context: {failureDetails.context}</div>
                      )}
                      {typeof failureDetails.attempts === 'number' && (
                        <div className="text-xs text-gray-500">attempts: {failureDetails.attempts}</div>
                      )}
                      {failureDetails.requestId && (
                        <div className="text-xs text-gray-500">request_id: {failureDetails.requestId}</div>
                      )}
                      {log.action === 'notification_delivery_failed' && (
                        <div className="mt-2">
                          <button
                            type="button"
                            onClick={() => handleRetry(log.id)}
                            disabled={retryingLogId === log.id || !canRetryFailure(log.details)}
                            className="rounded-md bg-gray-900 px-2.5 py-1 text-xs font-medium text-white hover:bg-black disabled:cursor-not-allowed disabled:bg-gray-300"
                          >
                            {retryingLogId === log.id ? 'กำลัง Retry...' : 'Retry ส่งแจ้งเตือน'}
                          </button>
                          {!canRetryFailure(log.details) && (
                            <div className="mt-1 text-[11px] text-amber-600">{locale === 'en' ? 'ไม่มี payload notification สำหรับ replay' : locale === 'zh' ? 'ไม่มี payload notification สำหรับ replay' : 'ไม่มี payload notification สำหรับ replay'}</div>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="px-5 py-4 text-sm">
                      <pre className="bg-gray-100 p-2 rounded text-xs">
                        {JSON.stringify(log.details, null, 2)}
                      </pre>
                    </td>
                  </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
} 
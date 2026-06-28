'use client';
import Link from 'next/link'
import { useState, useEffect } from 'react';
import { useAuth } from '../../../../lib/AuthContext';
import { useToastContext } from '../../../../components/Toast';
import { JobService, JobAssignment } from '@/lib/jobService';
import {
  BriefcaseIcon,
  CalendarIcon,
  ClockIcon,
  MapPinIcon,
  HomeIcon,
  PhoneIcon,
  UserIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  EyeIcon,
  PlayIcon,
  PauseIcon,
  StopIcon,
  DocumentTextIcon,
  CurrencyDollarIcon,
} from "@heroicons/react/24/solid";
import { useI18n } from "@/lib/I18nContext";

export default function StaffJobsPage() {
    const { locale } = useI18n();
  const { profile } = useAuth();
  const { success, error: showError } = useToastContext();
  const [jobs, setJobs] = useState<JobAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStatus, setSelectedStatus] = useState<string>('all');

  const fetchJobs = async () => {
    if (!profile?.id) return;
    try {
      setLoading(true);
      const data = await JobService.getStaffJobs(profile.id);
      setJobs(data);
    } catch (err) {
      console.error('Failed to fetch jobs:', err);
      showError('ไม่สามารถโหลดข้อมูลงานได้');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchJobs();
  }, [profile?.id]);

  const getStatusBadge = (status: string) => {
    const statusInfo = JobService.getStatusInfo(status);
    return (
      <span className={`px-2 py-1 text-[10px] font-bold uppercase tracking-widest border ${statusInfo.color}`}>
        {statusInfo.text}
      </span>
    );
  };

  const getPriorityBadge = (priority: string) => {
    const styles = {
      low: 'text-[#70706B] border-[#E5E5DF]',
      normal: 'text-[#1A1A1A] border-[#E5E5DF]',
      high: 'bg-[#1A1A1A] text-white border-[#1A1A1A]',
      urgent: 'bg-[#E54D2E] text-white border-[#E54D2E]'
    };
    return (
      <span className={`px-2 py-1 text-[10px] font-bold uppercase tracking-widest border ${styles[priority as keyof typeof styles] || styles.normal}`}>
        {priority}
      </span>
    );
  };

  const filteredJobs = selectedStatus === 'all' 
    ? jobs 
    : jobs.filter(job => job.status === selectedStatus);

  const handleUpdateStatus = async (jobId: string, nextStatus: string) => {
    if (!profile?.id) return;
    try {
      await JobService.updateJobStatus(jobId, nextStatus, profile.id);
      success('อัปเดตสถานะสำเร็จ');
      fetchJobs();
    } catch (err) {
      showError('อัปเดตสถานะไม่สำเร็จ');
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-[#F3F3EF] rounded w-1/4"></div>
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-32 bg-[#F3F3EF] rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-light tracking-tight text-[#1A1A1A] mb-2">{locale === 'en' ? 'งานของฉัน' : locale === 'zh' ? 'งานของฉัน' : 'งานของฉัน'}</h1>
            <p className="text-[#70706B]">{locale === 'en' ? 'จัดการงานและติดตามสถานะการทำงาน' : locale === 'zh' ? 'จัดการงานและติดตามสถานะการทำงาน' : 'จัดการงานและติดตามสถานะการทำงาน'}</p>
          </div>
          <div className="flex items-center gap-3">
            <BriefcaseIcon className="w-8 h-8 text-[#1A1A1A]" />
          </div>
        </div>
      </div>

      <div className="mb-6 bg-white border border-[#E5E5DF] rounded-xl p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <div className="text-sm font-semibold text-[#1A1A1A]">{locale === 'en' ? 'สร้างรายงานให้ลูกค้า' : locale === 'zh' ? 'สร้างรายงานให้ลูกค้า' : 'สร้างรายงานให้ลูกค้า'}</div>
          <div className="text-sm text-[#70706B]">
            {locale === 'en' ? '             ปุ่มเขียน “รายงานสำหรับลูกค้า” อยู่ในหน้า “งานที่ได้รับมอบหมาย” และในหน้ารายละเอียดงาน           ' : locale === 'zh' ? '             ปุ่มเขียน “รายงานสำหรับลูกค้า” อยู่ในหน้า “งานที่ได้รับมอบหมาย” และในหน้ารายละเอียดงาน           ' : '             ปุ่มเขียน “รายงานสำหรับลูกค้า” อยู่ในหน้า “งานที่ได้รับมอบหมาย” และในหน้ารายละเอียดงาน           '}</div>
        </div>
        <Link
          href="/dashboard/staff/tasks"
          className="inline-flex items-center justify-center px-4 py-2 rounded-lg bg-[#1A1A1A] text-white hover:bg-black text-sm font-medium"
        >
          {locale === 'en' ? '           ไปเขียนรายงานให้ลูกค้า         ' : locale === 'zh' ? '           ไปเขียนรายงานให้ลูกค้า         ' : '           ไปเขียนรายงานให้ลูกค้า         '}</Link>
      </div>

      {/* Status Filter */}
      <div className="mb-6">
        <div className="flex flex-wrap gap-2">
          {[
            { key: 'all', label: 'ทั้งหมด' },
            { key: 'scheduled', label: 'กำหนดการ' },
            { key: 'in_progress', label: 'กำลังดำเนินการ' },
            { key: 'completed', label: 'เสร็จสิ้น' }
          ].map(filter => (
            <button
              key={filter.key}
              onClick={() => setSelectedStatus(filter.key)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                selectedStatus === filter.key
                  ? 'bg-[#1A1A1A] text-white border border-[#1A1A1A]'
                  : 'bg-white text-[#1A1A1A] border border-[#E5E5DF] hover:bg-[#F7F7F2]'
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>
      </div>

      {/* Jobs List */}
      <div className="space-y-4">
        {filteredJobs.length === 0 ? (
          <div className="text-center py-12">
            <BriefcaseIcon className="w-16 h-16 text-[#B5B5B0] mx-auto mb-4" />
            <h3 className="text-lg font-medium text-[#1A1A1A] mb-2">{locale === 'en' ? 'ไม่มีงานในสถานะนี้' : locale === 'zh' ? 'ไม่มีงานในสถานะนี้' : 'ไม่มีงานในสถานะนี้'}</h3>
            <p className="text-[#70706B]">{locale === 'en' ? 'งานจะแสดงที่นี่เมื่อมีการมอบหมาย' : locale === 'zh' ? 'งานจะแสดงที่นี่เมื่อมีการมอบหมาย' : 'งานจะแสดงที่นี่เมื่อมีการมอบหมาย'}</p>
          </div>
        ) : (
          filteredJobs.map(job => {
              const { locale } = useI18n();
            const order = job.orders;
            const statusInfo = JobService.getStatusInfo(job.status);
            
            return (
              <div key={job.id} className="bg-white rounded-none border border-[#111111] p-8">
                <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-8">
                  {/* Job Info */}
                  <div className="flex-1">
                    <div className="flex items-start justify-between mb-6">
                      <div>
                        <h3 className="text-2xl font-serif-thai font-light text-[#111111] mb-2 uppercase tracking-tight">
                          {order?.services?.service_name || 'งานดูแลสวน'}
                        </h3>
                        <p className="text-[10px] text-[#A3A3A3] font-bold uppercase tracking-[0.2em]">{order?.order_code || `#${job.id.slice(0, 8)}`}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        {getPriorityBadge(order?.priority || 'normal')}
                        {getStatusBadge(job.status)}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                      <div className="space-y-4">
                        <div className="flex items-center gap-3 text-[10px] font-bold uppercase tracking-widest text-[#111111]">
                          <HomeIcon className="w-4 h-4 text-[#A3A3A3]" />
                          <span>{order?.houses?.name || 'ไม่ระบุชื่อบ้าน'}</span>
                        </div>
                        <div className="flex items-center gap-3 text-[10px] font-bold uppercase tracking-widest text-[#111111]">
                          <UserIcon className="w-4 h-4 text-[#A3A3A3]" />
                          <span>{order?.profiles?.display_name || 'ลูกค้าทั่วไป'}</span>
                        </div>
                        <div className="flex items-center gap-3 text-[10px] font-bold uppercase tracking-widest text-[#111111]">
                          <PhoneIcon className="w-4 h-4 text-[#A3A3A3]" />
                          <span>{order?.profiles?.phone || '-'}</span>
                        </div>
                      </div>
                      <div className="space-y-4">
                        <div className="flex items-center gap-3 text-[10px] font-bold uppercase tracking-widest text-[#111111]">
                          <CalendarIcon className="w-4 h-4 text-[#A3A3A3]" />
                          <span>{order?.scheduled_date ? new Date(order.scheduled_date).toLocaleDateString('th-TH') : '-'}</span>
                        </div>
                        <div className="flex items-center gap-3 text-[10px] font-bold uppercase tracking-widest text-[#111111]">
                          <CurrencyDollarIcon className="w-4 h-4 text-[#A3A3A3]" />
                          <span>{order?.total?.toLocaleString() || '0'} {locale === 'en' ? 'baht' : locale === 'zh' ? '铢' : ' บาท'}</span>
                        </div>
                      </div>
                    </div>

                    <div className="mb-6">
                      <div className="flex items-start gap-3 text-[10px] font-bold uppercase tracking-widest text-[#717171] leading-relaxed">
                        <MapPinIcon className="w-4 h-4 mt-0.5 flex-shrink-0 text-[#A3A3A3]" />
                        <span>{order?.houses?.address || '-'}</span>
                      </div>
                    </div>

                    {(job.notes || order?.notes) && (
                      <div className="bg-[#FAFAFA] border border-[#EFEFEF] p-6 mb-4">
                        <div className="flex items-start gap-3">
                          <ExclamationTriangleIcon className="w-4 h-4 text-[#111111] mt-0.5" />
                          <div>
                            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#111111] mb-2">Instructions</p>
                            <p className="text-[12px] text-[#717171] leading-relaxed font-serif-thai italic">{job.notes || order?.notes}</p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="flex flex-col gap-3 min-w-[200px]">
                    {statusInfo.nextAction && (
                      <button
                        onClick={() => handleUpdateStatus(job.id, statusInfo.nextStatus!)}
                        className="w-full flex items-center justify-center gap-3 py-5 bg-[#111111] text-white text-[10px] font-bold uppercase tracking-[0.4em] hover:bg-black transition-all"
                      >
                        {statusInfo.nextStatus === 'in_progress' ? <PlayIcon className="w-4 h-4" /> : <CheckCircleIcon className="w-4 h-4" />}
                        {statusInfo.nextAction === 'Start' ? 'เริ่มงาน' : 'เสร็จสิ้น'}
                      </button>
                    )}
                    
                    <button
                      onClick={() => success('เปิดรายละเอียดงาน')}
                      className="w-full flex items-center justify-center gap-3 py-5 bg-white text-[#111111] border border-[#111111] text-[10px] font-bold uppercase tracking-[0.4em] hover:bg-[#FAFAFA] transition-all"
                    >
                      <EyeIcon className="w-4 h-4" />
                      {locale === 'en' ? 'View details' : locale === 'zh' ? '查看详情' : '                       ดูรายละเอียด                     '}</button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Summary Stats */}
      {filteredJobs.length > 0 && (
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white border border-[#E5E5DF] rounded-lg p-4">
            <div className="flex items-center gap-3">
              <CalendarIcon className="w-8 h-8 text-[#1A1A1A]" />
              <div>
                <p className="text-sm text-[#70706B] font-medium">{locale === 'en' ? 'งานวันนี้' : locale === 'zh' ? 'งานวันนี้' : 'งานวันนี้'}</p>
                <p className="text-2xl font-bold text-[#1A1A1A]">
                  {jobs.filter(j => j.orders?.scheduled_date === '2025-07-24').length}
                </p>
              </div>
            </div>
          </div>
          
          <div className="bg-white border border-[#E5E5DF] rounded-lg p-4">
            <div className="flex items-center gap-3">
              <ClockIcon className="w-8 h-8 text-[#1A1A1A]" />
              <div>
                <p className="text-sm text-[#70706B] font-medium">{locale === 'en' ? 'in progress' : locale === 'zh' ? '进行中' : 'กำลังดำเนินการ'}</p>
                <p className="text-2xl font-bold text-[#1A1A1A]">
                  {jobs.filter(j => j.status === 'in_progress').length}
                </p>
              </div>
            </div>
          </div>
          
          <div className="bg-white border border-[#E5E5DF] rounded-lg p-4">
            <div className="flex items-center gap-3">
              <CheckCircleIcon className="w-8 h-8 text-[#1A1A1A]" />
              <div>
                <p className="text-sm text-[#70706B] font-medium">{locale === 'en' ? 'เสร็จสิ้นแล้ว' : locale === 'zh' ? 'เสร็จสิ้นแล้ว' : 'เสร็จสิ้นแล้ว'}</p>
                <p className="text-2xl font-bold text-[#1A1A1A]">
                  {jobs.filter(j => j.status === 'completed').length}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

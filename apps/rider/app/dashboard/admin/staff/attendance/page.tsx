"use client";

import React, { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { 
  UsersIcon, 
  CalendarIcon, 
  ArrowDownTrayIcon,
  ClockIcon,
  CurrencyDollarIcon,
  CheckCircleIcon,
  XMarkIcon,
  InformationCircleIcon
} from "@heroicons/react/24/outline";
import {
  calculateAttendanceStats,
  calculateDailyStats,
  calculateSalary,
  AttendanceLog,
} from "@/lib/attendanceUtils";
import { format, parseISO } from "date-fns";
import { th } from "date-fns/locale";
import { useI18n } from "@/lib/I18nContext";

interface StaffSummary {
  id: string;
  display_name: string;
  role: string;
  staff_type: string;
  daily_wage: number;
  overtime_rate_per_hour: number;
  target_working_days: number;
  salary_type: 'daily' | 'monthly';
  shift_start: string;
  shift_end: string;
  stats: {
    daysWorked: number;
    lateMinutes: number;
    otMinutes: number;
    totalHours: number;
  };
  estimatedSalary: number;
  rawLogs: AttendanceLog[];
}

export default function AdminAttendancePage() {
  const { locale } = useI18n();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [staffSummaries, setStaffSummaries] = useState<StaffSummary[]>([]);
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM
  const [selectedStaff, setSelectedStaff] = useState<StaffSummary | null>(null);
  const [otApprovalMinutes, setOtApprovalMinutes] = useState<Record<string, number>>({});
  const [deductionAmount, setDeductionAmount] = useState<string>("");

  useEffect(() => {
    fetchData();
  }, [selectedMonth]);

  const fetchData = async () => {
    if (!supabase) return;
    setLoading(true);
    setError(null);

    try {
      // 1. Fetch all staff
      const { data: staffData, error: staffError } = await supabase
        .from("profiles")
        .select("id, display_name, role, staff_type, daily_wage, overtime_rate_per_hour, target_working_days, salary_type, shift_start, shift_end, is_pos_account")
        .eq("role", "staff");

      if (staffError) throw staffError;

      const staff = (staffData || []).filter(s => !s.is_pos_account);

      // 2. Fetch attendance logs for the selected month
      const startDate = new Date(selectedMonth + "-01");
      const endDate = new Date(startDate.getFullYear(), startDate.getMonth() + 1, 0, 23, 59, 59);

      const { data: logs, error: logsError } = await supabase
        .from("attendance_logs")
        .select("*")
        .gte("timestamp", startDate.toISOString())
        .lte("timestamp", endDate.toISOString())
        .order("timestamp", { ascending: true });

      if (logsError) throw logsError;

      // 3. Fetch salary adjustments (deductions)
      const { data: adjustments, error: adjError } = await supabase
        .from("salary_adjustments")
        .select("*")
        .eq("month", selectedMonth);

      if (adjError) throw adjError;

      // 4. Process data
      const summaries: StaffSummary[] = (staff || []).map(s => {
        const staffLogs = (logs || []).filter(l => l.profile_id === s.id) as AttendanceLog[];
        const stats = calculateAttendanceStats(staffLogs, s.shift_start || "08:30", s.shift_end || "17:30");
        
        const staffAdjustments = (adjustments || []).filter(a => a.profile_id === s.id);
        const totalDeductions = staffAdjustments.filter(a => a.amount < 0).reduce((sum, a) => sum + Math.abs(a.amount), 0);

        const estimatedSalary = calculateSalary(stats, {
          daily_wage: s.daily_wage || 0,
          overtime_rate_per_hour: s.overtime_rate_per_hour || 0,
          salary_type: s.salary_type || 'daily',
          target_working_days: s.target_working_days || 26
        }, totalDeductions);

        return {
          ...s,
          shift_start: s.shift_start || "08:30",
          shift_end: s.shift_end || "17:30",
          stats,
          estimatedSalary,
          rawLogs: staffLogs,
          totalDeductions
        };
      });

      setStaffSummaries(summaries);
    } catch (err: any) {
      console.error("Error fetching attendance data:", err);
      setError("เกิดข้อผิดพลาดในการโหลดข้อมูล");
    } finally {
      setLoading(false);
    }
  };

  const exportCSV = () => {
    const headers = ["ชื่อพนักงาน", "ประเภท", "วันทำงาน", "สาย (นาที)", "OT (นาที)", "ขาดงาน", "เวลาทำงาน", "ค่าแรงประมาณการ"];
    const rows = staffSummaries.map(s => [
      s.display_name,
      s.staff_type === 'cafe' ? 'คาเฟ่' : 'สวน',
      s.stats.daysWorked,
      s.stats.lateMinutes,
      s.stats.otMinutes,
      Math.max(0, (s.target_working_days || 26) - s.stats.daysWorked),
      `${s.shift_start}-${s.shift_end}`,
      s.estimatedSalary.toFixed(2)
    ]);

    const csvContent = "\uFEFF" + [headers, ...rows].map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `attendance_report_${selectedMonth}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const renderDetailsModal = () => {
    if (!selectedStaff) return null;

    // Group logs by day
    const logsByDay: Record<string, { checkIn?: string, checkOut?: string, checkOutLog?: AttendanceLog }> = {};
    selectedStaff.rawLogs.forEach(log => {
      const dateKey = format(parseISO(log.timestamp), 'yyyy-MM-dd');
      if (!logsByDay[dateKey]) logsByDay[dateKey] = {};
      if (log.type === 'check_in') {
        logsByDay[dateKey].checkIn = log.timestamp;
      } else {
        logsByDay[dateKey].checkOut = log.timestamp;
        logsByDay[dateKey].checkOutLog = log;
      }
    });

    const sortedDates = Object.keys(logsByDay).sort().reverse();

    const handleApproveOT = async (logId: string, status: 'approved' | 'rejected', defaultMinutes: number) => {
      const minsToApprove = otApprovalMinutes[logId] ?? defaultMinutes;
      const { error } = await supabase.from('attendance_logs').update({
        ot_status: status,
        ot_approved_minutes: status === 'approved' ? minsToApprove : 0
      }).eq('id', logId);
      
      if (!error) {
        fetchData();
        // Clear local state
        setOtApprovalMinutes(prev => {
          const newState = { ...prev };
          delete newState[logId];
          return newState;
        });
      } else {
        alert('เกิดข้อผิดพลาดในการบันทึก OT');
      }
    };

    const handleSaveDeduction = async () => {
      if (!deductionAmount || isNaN(Number(deductionAmount))) return;
      const amount = -Math.abs(Number(deductionAmount)); // ensure it's negative
      
      const { error } = await supabase.from('salary_adjustments').insert({
        profile_id: selectedStaff.id,
        month: selectedMonth,
        amount: amount,
        description: 'Manual deduction from attendance'
      });

      if (!error) {
        setDeductionAmount("");
        fetchData();
        alert("บันทึกการหักเงินเรียบร้อย");
      } else {
        alert("เกิดข้อผิดพลาดในการหักเงิน");
      }
    };

    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
        <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
          <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-[#FAFAF8]">
            <div>
              <h2 className="text-xl font-bold text-gray-900">{selectedStaff.display_name}</h2>
              <p className="text-sm text-gray-500">{locale === 'en' ? 'Monthly time stamp details' : locale === 'zh' ? '每月时间戳详细信息' : 'รายละเอียดการลงเวลา เดือน '}{format(parseISO(selectedMonth + "-01"), 'MMMM yyyy', { locale: th })}</p>
            </div>
            <button onClick={() => setSelectedStaff(null)} className="p-2 hover:bg-gray-200 rounded-full transition-colors">
              <XMarkIcon className="w-6 h-6 text-gray-500" />
            </button>
          </div>
          
          <div className="flex-1 overflow-y-auto p-6">
            <div className="grid grid-cols-3 gap-4 mb-8">
              <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                <div className="text-[10px] font-black uppercase text-gray-400 mb-1">{locale === 'en' ? 'work shift' : locale === 'zh' ? '轮班工作' : 'กะทำงาน'}</div>
                <div className="text-sm font-bold text-gray-700">{selectedStaff.shift_start} - {selectedStaff.shift_end}</div>
              </div>
              <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                <div className="text-[10px] font-black uppercase text-gray-400 mb-1">{locale === 'en' ? 'Total lateness/absence from work' : locale === 'zh' ? '总迟到/缺勤' : 'มาสายรวม / ขาดงาน'}</div>
                <div className="text-sm font-bold text-red-600">{locale === 'en' ? 'line' : locale === 'zh' ? '线' : 'สาย '}{selectedStaff.stats.lateMinutes} {locale === 'en' ? 'minutes / absence' : locale === 'zh' ? '分钟/缺席' : ' นาที / ขาด '}{Math.max(0, (selectedStaff.target_working_days || 26) - selectedStaff.stats.daysWorked)} {locale === 'en' ? 'day' : locale === 'zh' ? '天' : ' วัน'}</div>
              </div>
              <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                <div className="text-[10px] font-black uppercase text-gray-400 mb-1">{locale === 'en' ? 'Total OT (Approved)' : locale === 'zh' ? '总加班时间（已批准）' : 'OT รวม (ที่อนุมัติแล้ว)'}</div>
                <div className="text-sm font-bold text-green-600">{selectedStaff.stats.approvedOtMinutes} {locale === 'en' ? 'minute' : locale === 'zh' ? '分钟' : ' นาที'}</div>
              </div>
            </div>

            {selectedStaff.salary_type === 'monthly' && (
              <div className="mb-8 p-4 bg-red-50 rounded-xl border border-red-100 flex items-center justify-between">
                <div>
                  <div className="text-sm font-bold text-red-800">{locale === 'en' ? 'Monthly deduction (Leave work/absence from work)' : locale === 'zh' ? '每月扣除（请假/旷工）' : 'หักเงินรายเดือน (ลางาน/ขาดงาน)'}</div>
                  <div className="text-xs text-red-600">{locale === 'en' ? 'Current deducted amount: ฿' : locale === 'zh' ? '当前扣除金额：฿' : 'ยอดหักปัจจุบัน: ฿'}{(selectedStaff as any).totalDeductions || 0}</div>
                </div>
                <div className="flex items-center gap-2">
                  <input 
                    type="number" 
                    placeholder={locale === 'en' ? 'Amount to be additionally deducted' : locale === 'zh' ? '需额外扣除的金额' : 'ยอดเงินที่ต้องการหักเพิ่ม'} 
                    className="border border-red-200 rounded px-3 py-1.5 text-sm w-48"
                    value={deductionAmount}
                    onChange={e => setDeductionAmount(e.target.value)}
                  />
                  <button 
                    onClick={handleSaveDeduction}
                    className="bg-red-600 text-white px-4 py-1.5 rounded text-sm font-bold hover:bg-red-700 transition-colors"
                  >
                    {locale === 'en' ? 'Record of deduction' : locale === 'zh' ? '扣除记录' : '                     บันทึกหักเงิน                   '}</button>
                </div>
              </div>
            )}

            <table className="w-full text-left">
              <thead>
                <tr className="text-[10px] font-black uppercase tracking-widest text-gray-400 border-b border-gray-100">
                  <th className="pb-3">{locale === 'en' ? 'date' : locale === 'zh' ? '日期' : 'วันที่'}</th>
                  <th className="pb-3">{locale === 'en' ? 'Attend work' : locale === 'zh' ? '参加工作' : 'เข้างาน'}</th>
                  <th className="pb-3">{locale === 'en' ? 'finish work' : locale === 'zh' ? '完成工作' : 'เลิกงาน'}</th>
                  <th className="pb-3 text-right">{locale === 'en' ? 'status' : locale === 'zh' ? '地位' : 'สถานะ'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {sortedDates.map(date => {
                  const dayData = logsByDay[date];
                  const checkInTime = dayData.checkIn ? format(parseISO(dayData.checkIn), 'HH:mm') : '-';
                  const checkOutTime = dayData.checkOut ? format(parseISO(dayData.checkOut), 'HH:mm') : '-';
                  
                  const dayStats = calculateDailyStats(
                    dayData.checkIn,
                    dayData.checkOut,
                    selectedStaff.shift_start,
                    selectedStaff.shift_end
                  );

                  return (
                    <tr key={date} className="text-sm">
                      <td className="py-4 font-medium text-gray-700">
                        {format(parseISO(date), 'dd MMM yyyy', { locale: th })}
                      </td>
                      <td className={`py-4 ${dayStats.lateMinutes > 0 ? 'text-red-600 font-bold' : 'text-gray-600'}`}>
                        <div className="flex flex-col">
                          <span>{checkInTime}</span>
                          {dayStats.lateMinutes > 0 && (
                            <span className="text-[10px] text-red-500">{locale === 'en' ? 'line' : locale === 'zh' ? '线' : 'สาย '}{dayStats.lateMinutes} {locale === 'en' ? 'n.' : locale === 'zh' ? '名词' : ' น.'}</span>
                          )}
                        </div>
                      </td>
                      <td className="py-4 text-gray-600">
                        <div className="flex flex-col gap-1">
                          <span>{checkOutTime}</span>
                          
                          {dayStats.otMinutes > 0 && dayData.checkOutLog && (
                            <div className="mt-1 p-2 bg-gray-50 rounded border border-gray-100 w-full max-w-[200px]">
                              <div className="text-[10px] font-bold text-gray-500 mb-1">{locale === 'en' ? 'Automatic calculation:' : locale === 'zh' ? '自动计算：' : 'คำนวณอัตโนมัติ: '}{dayStats.otMinutes} {locale === 'en' ? 'minute' : locale === 'zh' ? '分钟' : ' นาที'}</div>
                              
                              {dayData.checkOutLog.ot_status === 'approved' ? (
                                <div className="text-[10px] text-green-600 font-bold flex items-center gap-1">
                                  <CheckCircleIcon className="w-3 h-3" /> {locale === 'en' ? 'Approved (' : locale === 'zh' ? '得到正式认可的 （' : ' อนุมัติแล้ว ('}{dayData.checkOutLog.ot_approved_minutes} {locale === 'en' ? 'minute)' : locale === 'zh' ? '分钟）' : ' นาที)                                 '}</div>
                              ) : dayData.checkOutLog.ot_status === 'rejected' ? (
                                <div className="text-[10px] text-red-600 font-bold flex items-center gap-1">
                                  <XMarkIcon className="w-3 h-3" /> {locale === 'en' ? 'Not approved' : locale === 'zh' ? '未获批准' : ' ไม่อนุมัติ                                 '}</div>
                              ) : (
                                <div className="flex flex-col gap-2">
                                  <div className="flex items-center gap-1">
                                    <input 
                                      type="number" 
                                      className="border rounded px-1 py-0.5 text-xs w-16" 
                                      placeholder={String(dayStats.otMinutes)}
                                      value={otApprovalMinutes[dayData.checkOutLog.id] !== undefined ? otApprovalMinutes[dayData.checkOutLog.id] : dayStats.otMinutes}
                                      onChange={(e) => setOtApprovalMinutes({...otApprovalMinutes, [dayData.checkOutLog!.id]: Number(e.target.value)})}
                                    />
                                    <span className="text-[10px]">{locale === 'en' ? 'minute' : locale === 'zh' ? '分钟' : 'นาที'}</span>
                                  </div>
                                  <div className="flex gap-1">
                                    <button onClick={() => handleApproveOT(dayData.checkOutLog!.id, 'approved', dayStats.otMinutes)} className="bg-green-100 text-green-700 px-2 py-1 rounded text-[10px] font-bold flex-1">{locale === 'en' ? 'approve' : locale === 'zh' ? '批准' : 'อนุมัติ'}</button>
                                    <button onClick={() => handleApproveOT(dayData.checkOutLog!.id, 'rejected', 0)} className="bg-red-100 text-red-700 px-2 py-1 rounded text-[10px] font-bold flex-1">{locale === 'en' ? 'refuse' : locale === 'zh' ? '拒绝' : 'ปฏิเสธ'}</button>
                                  </div>
                                </div>
                              )}
                            </div>
                          )}

                          {/* Display Reason if early check-out */}
                          {selectedStaff.rawLogs.find(l => 
                            l.type === 'check_out' && 
                            format(parseISO(l.timestamp), 'yyyy-MM-dd') === date && 
                            l.reason
                          )?.reason && (
                            <span className="text-[10px] text-amber-600 font-bold mt-1">
                              {locale === 'en' ? 'reason:' : locale === 'zh' ? '原因：' : '                               เหตุผล: '}{selectedStaff.rawLogs.find(l => 
                                l.type === 'check_out' && 
                                format(parseISO(l.timestamp), 'yyyy-MM-dd') === date
                              )?.reason}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-4 text-right">
                        {dayStats.hasPendingOT ? (
                          <span className="text-[10px] bg-amber-50 text-amber-600 px-2 py-0.5 rounded font-bold">{locale === 'en' ? 'Waiting for OT approval' : locale === 'zh' ? '等待 OT 批准' : 'รออนุมัติ OT'}</span>
                        ) : dayStats.lateMinutes > 0 ? (
                          <span className="text-[10px] bg-red-50 text-red-600 px-2 py-0.5 rounded font-bold">{locale === 'en' ? 'line' : locale === 'zh' ? '线' : 'สาย'}</span>
                        ) : (
                          <span className="text-[10px] bg-green-50 text-green-600 px-2 py-0.5 rounded font-bold">{locale === 'en' ? 'normal' : locale === 'zh' ? '普通的' : 'ปกติ'}</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[#FAFAF8] p-4 md:p-8">
      {renderDetailsModal()}
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-[#1A1A1A] mb-2 flex items-center gap-3">
              <CalendarIcon className="w-8 h-8 text-[#3A5A40]" />
              {locale === 'en' ? 'Time and salary reports' : locale === 'zh' ? '时间和工资报告' : '               รายงานการลงเวลาและเงินเดือน             '}</h1>
            <p className="text-[#70706B]">{locale === 'en' ? 'Check attendance and calculate monthly employee income.' : locale === 'zh' ? '检查出勤情况并计算员工每月收入。' : 'ตรวจสอบการเข้างานและคำนวณรายได้ของพนักงานรายเดือน'}</p>
          </div>

          <div className="flex items-center gap-3">
            <input 
              type="month" 
              className="bg-white border border-[#E5E5DF] rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-[#3A5A40] outline-none"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
            />
            <button 
              onClick={exportCSV}
              className="flex items-center gap-2 bg-[#1A1A1A] text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-[#333] transition-all"
            >
              <ArrowDownTrayIcon className="w-4 h-4" />
              {locale === 'en' ? 'Export CSV' : locale === 'zh' ? '导出 CSV' : '               ส่งออก CSV             '}</button>
          </div>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white p-6 border border-[#E5E5DF] shadow-sm">
            <div className="text-[10px] font-black uppercase tracking-widest text-[#A3A3A3] mb-2">{locale === 'en' ? 'All employees' : locale === 'zh' ? '全体员工' : 'พนักงานทั้งหมด'}</div>
            <div className="text-2xl font-bold text-[#1A1A1A]">{staffSummaries.length} {locale === 'en' ? 'person' : locale === 'zh' ? '人' : ' คน'}</div>
          </div>
          <div className="bg-white p-6 border border-[#E5E5DF] shadow-sm">
            <div className="text-[10px] font-black uppercase tracking-widest text-[#A3A3A3] mb-2">{locale === 'en' ? 'Come to work today' : locale === 'zh' ? '今天来上班' : 'มาทำงานวันนี้'}</div>
            <div className="text-2xl font-bold text-[#3A5A40]">
              {staffSummaries.filter(s => s.stats.daysWorked > 0).length} {locale === 'en' ? 'person' : locale === 'zh' ? '人' : ' คน             '}</div>
          </div>
          <div className="bg-white p-6 border border-[#E5E5DF] shadow-sm">
            <div className="text-[10px] font-black uppercase tracking-widest text-[#A3A3A3] mb-2">{locale === 'en' ? 'Total payment amount (estimated)' : locale === 'zh' ? '付款总额（预计）' : 'ยอดจ่ายทั้งหมด (ประมาณการ)'}</div>
            <div className="text-2xl font-bold text-[#1A1A1A]">
              {locale === 'en' ? '               ฿' : locale === 'zh' ? '               ฿' : '               ฿'}{staffSummaries.reduce((sum, s) => sum + s.estimatedSalary, 0).toLocaleString()}
            </div>
          </div>
          <div className="bg-white p-6 border border-[#E5E5DF] shadow-sm flex justify-between items-center">
            <div>
              <div className="text-[10px] font-black uppercase tracking-widest text-[#A3A3A3] mb-2">{locale === 'en' ? 'OT waiting for approval (this month)' : locale === 'zh' ? 'OT等待批准（本月）' : 'OT รออนุมัติ (เดือนนี้)'}</div>
              <div className="text-2xl font-bold text-amber-600">
                {staffSummaries.filter(s => s.stats.hasPendingOT).length} {locale === 'en' ? 'person' : locale === 'zh' ? '人' : ' คน               '}</div>
            </div>
            {staffSummaries.some(s => s.stats.hasPendingOT) && (
              <div className="animate-pulse w-3 h-3 bg-amber-500 rounded-full"></div>
            )}
          </div>
        </div>

        {/* Main Table */}
        <div className="bg-white border border-[#E5E5DF] shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#FAFAF8] border-b border-[#E5E5DF]">
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-[#A3A3A3]">{locale === 'en' ? 'employee' : locale === 'zh' ? '员工' : 'พนักงาน'}</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-[#A3A3A3]">{locale === 'en' ? 'Department/Shift' : locale === 'zh' ? '部门/班次' : 'แผนก/กะ'}</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-[#A3A3A3]">{locale === 'en' ? 'working day' : locale === 'zh' ? '工作日' : 'วันทำงาน'}</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-[#A3A3A3]">{locale === 'en' ? 'Wired/OT' : locale === 'zh' ? '有线/OT' : 'สาย / OT'}</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-[#A3A3A3]">{locale === 'en' ? 'Missing work' : locale === 'zh' ? '缺少工作' : 'ขาดงาน'}</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-[#A3A3A3]">{locale === 'en' ? 'Wage/base' : locale === 'zh' ? '工资/基数' : 'ค่าแรง/ฐาน'}</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-[#A3A3A3] text-right">{locale === 'en' ? 'Total (฿)' : locale === 'zh' ? '总计 (฿)' : 'ยอดรวม (฿)'}</th>
                  <th className="px-6 py-4"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F1F1EB]">
                {loading ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-12 text-center text-[#70706B]">{locale === 'en' ? 'Loading data...' : locale === 'zh' ? '正在加载数据...' : 'กำลังโหลดข้อมูล...'}</td>
                  </tr>
                ) : staffSummaries.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-12 text-center text-[#70706B]">{locale === 'en' ? 'Employee information not found' : locale === 'zh' ? '未找到员工信息' : 'ไม่พบข้อมูลพนักงาน'}</td>
                  </tr>
                ) : (
                  staffSummaries.map((staff) => (
                    <tr key={staff.id} className="hover:bg-[#FAFAF8] transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-bold text-[#1A1A1A]">{staff.display_name}</div>
                        <div className="text-[10px] text-[#A3A3A3] uppercase tracking-tighter">{staff.id.slice(0, 8)}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-1">
                          <span className={`px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest border w-fit ${
                            staff.staff_type === 'cafe' ? 'bg-amber-50 text-amber-700 border-amber-100' : 'bg-green-50 text-green-700 border-green-100'
                          }`}>
                            {staff.staff_type || 'N/A'}
                          </span>
                          <span className="text-[10px] text-gray-500 font-mono">{staff.shift_start}-{staff.shift_end}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm font-medium text-[#1A1A1A]">
                        {staff.stats.daysWorked} / {staff.target_working_days || 26}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-1">
                          <span className={`text-xs ${staff.stats.lateMinutes > 0 ? 'text-red-600' : 'text-gray-400'}`}>
                            {locale === 'en' ? 'line:' : locale === 'zh' ? '线：' : '                             สาย: '}{staff.stats.lateMinutes} {locale === 'en' ? 'minute' : locale === 'zh' ? '分钟' : ' นาที                           '}</span>
                          {staff.stats.hasPendingOT ? (
                            <span className="text-[10px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded font-bold w-fit">
                              {locale === 'en' ? 'There is OT waiting for approval.' : locale === 'zh' ? '有 OT 等待批准。' : '                               มี OT รออนุมัติ                             '}</span>
                          ) : (
                            <span className={`text-xs ${staff.stats.approvedOtMinutes > 0 ? 'text-green-600' : 'text-gray-400'}`}>
                              OT: {staff.stats.approvedOtMinutes} {locale === 'en' ? 'minute' : locale === 'zh' ? '分钟' : ' นาที                             '}</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-red-600 font-bold">
                        {Math.max(0, (staff.target_working_days || 26) - staff.stats.daysWorked)} {locale === 'en' ? 'day' : locale === 'zh' ? '天' : ' วัน                       '}</td>
                      <td className="px-6 py-4 text-xs text-[#70706B]">
                        <div>{staff.salary_type === 'monthly' ? 'เดือนละ' : 'วันละ'} {locale === 'en' ? ' ฿' : locale === 'zh' ? ' ฿' : ' ฿'}{staff.daily_wage?.toLocaleString()}</div>
                        <div>{locale === 'en' ? 'OT per hour ฿' : locale === 'zh' ? '每小时 OT ฿' : 'OT ชม.ละ ฿'}{staff.overtime_rate_per_hour?.toLocaleString()}</div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="text-lg font-black text-[#1A1A1A]">
                          {locale === 'en' ? '                           ฿' : locale === 'zh' ? '                           ฿' : '                           ฿'}{staff.estimatedSalary.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button 
                          onClick={() => setSelectedStaff(staff)}
                          className="p-2 hover:bg-gray-100 rounded-lg transition-all text-gray-400 hover:text-[#3A5A40]"
                        >
                          <InformationCircleIcon className="w-5 h-5" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

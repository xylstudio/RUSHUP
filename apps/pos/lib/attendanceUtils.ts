import { differenceInMilliseconds } from 'date-fns';

export interface AttendanceLog {
  id: string;
  profile_id: string;
  type: 'check_in' | 'check_out';
  timestamp: string;
  is_within_range: boolean;
  reason?: string | null;
  ot_status?: 'pending' | 'approved' | 'rejected';
  ot_approved_minutes?: number;
}

export interface AttendanceStats {
  daysWorked: number;
  lateMinutes: number;
  otMinutes: number; // Represents auto-calculated OT (for reference or pending)
  approvedOtMinutes: number; // Represents manually approved OT
  totalHours: number;
  hasPendingOT: boolean;
}

export interface WageConfig {
  daily_wage: number;
  overtime_rate_per_hour: number;
  salary_type: 'daily' | 'monthly';
  target_working_days: number;
}

/**
 * Calculates attendance statistics for a single day.
 */
export function calculateDailyStats(
  checkInTimestamp?: string,
  checkOutTimestamp?: string,
  shiftStart: string = "08:30",
  shiftEnd: string = "17:30",
  gracePeriodMinutes: number = 10,
  otStatus?: string,
  otApprovedMinutes?: number
) {
  let lateMinutes = 0;
  let otMinutes = 0;
  let approvedOtMinutes = 0;
  let hasPendingOT = false;
  let workMs = 0;

  const parseTimeToMins = (timeStr: string) => {
    const [hrs, mins] = timeStr.split(':').map(Number);
    return hrs * 60 + mins;
  };

  const shiftStartMins = parseTimeToMins(shiftStart);
  const shiftEndMins = parseTimeToMins(shiftEnd);

  if (checkInTimestamp) {
    const time = new Date(checkInTimestamp);
    const mins = time.getHours() * 60 + time.getMinutes();
    // Only count as late if after (Shift Start + Grace Period)
    if (mins > shiftStartMins + gracePeriodMinutes) {
      lateMinutes = mins - shiftStartMins;
    }
  }

  if (checkOutTimestamp) {
    const time = new Date(checkOutTimestamp);
    const mins = time.getHours() * 60 + time.getMinutes();
    // Overtime is auto-calculated only from late checkout
    if (mins > shiftEndMins) {
      otMinutes = mins - shiftEndMins;
      
      // If OT hasn't been explicitly rejected and hasn't been approved yet
      if (otStatus === 'pending' || !otStatus) {
        hasPendingOT = true;
      }
    }
    
    // Actual payable OT
    if (otStatus === 'approved' && otApprovedMinutes !== undefined) {
      approvedOtMinutes = otApprovedMinutes;
      hasPendingOT = false;
    }
  }

  if (checkInTimestamp && checkOutTimestamp) {
    workMs = new Date(checkOutTimestamp).getTime() - new Date(checkInTimestamp).getTime();
  }

  return { lateMinutes, otMinutes, approvedOtMinutes, hasPendingOT, workMs };
}

/**
 * Calculates attendance statistics from a list of logs.
 */
export function calculateAttendanceStats(
  logs: AttendanceLog[], 
  configShiftStart: string = "08:30", 
  configShiftEnd: string = "17:30"
): AttendanceStats {
  const uniqueDays = new Set(logs.map(l => new Date(l.timestamp).toDateString()));
  let totalLate = 0;
  let totalOT = 0;
  let totalApprovedOT = 0;
  let totalMs = 0;
  let hasPending = false;

  const logsByDay: Record<string, AttendanceLog[]> = {};
  logs.forEach(log => {
    const d = new Date(log.timestamp).toDateString();
    if (!logsByDay[d]) logsByDay[d] = [];
    logsByDay[d].push(log);
  });

  Object.values(logsByDay).forEach(dayLogs => {
    const checkIn = dayLogs.find(l => l.type === 'check_in');
    const checkOut = dayLogs.find(l => l.type === 'check_out');

    const dayStats = calculateDailyStats(
      checkIn?.timestamp,
      checkOut?.timestamp,
      configShiftStart,
      configShiftEnd,
      10,
      checkOut?.ot_status,
      checkOut?.ot_approved_minutes
    );

    totalLate += dayStats.lateMinutes;
    totalOT += dayStats.otMinutes;
    totalApprovedOT += dayStats.approvedOtMinutes;
    totalMs += dayStats.workMs;
    if (dayStats.hasPendingOT) hasPending = true;
  });

  return {
    daysWorked: uniqueDays.size,
    lateMinutes: totalLate,
    otMinutes: totalOT,
    approvedOtMinutes: totalApprovedOT,
    totalHours: Math.round(totalMs / (1000 * 60 * 60)),
    hasPendingOT: hasPending
  };
}

/**
 * Calculates estimated salary based on stats and wage configuration.
 * @param deductions - Manual deductions (e.g., unpaid leaves for monthly staff). Positive number representing currency.
 */
export function calculateSalary(stats: AttendanceStats, config: WageConfig, deductions: number = 0): number {
  // We only pay for APPROVED OT
  const otHours = stats.approvedOtMinutes / 60;
  const otPay = otHours * (config.overtime_rate_per_hour || 0);

  if (config.salary_type === 'monthly') {
    // For monthly, salary is fixed, minus manual deductions, plus approved OT.
    const baseSalary = config.daily_wage || 0; // In monthly mode, daily_wage field acts as monthly base salary
    return Math.max(0, baseSalary - deductions) + otPay;
  } else {
    // Daily wage mode
    const basePay = stats.daysWorked * (config.daily_wage || 0);
    return Math.max(0, basePay - deductions) + otPay;
  }
}

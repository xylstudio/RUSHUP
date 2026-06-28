const { calculateDailyStats } = require('../lib/attendanceUtils');

function test() {
  const shiftStart = "07:30";
  const shiftEnd = "17:30";
  const gracePeriod = 10;

  const scenarios = [
    {
      name: "Early arrival (No OT)",
      checkIn: "2024-04-30T07:20:00Z",
      checkOut: "2024-04-30T17:30:00Z",
      expected: { late: 0, ot: 0 }
    },
    {
      name: "On-time arrival",
      checkIn: "2024-04-30T07:30:00Z",
      checkOut: "2024-04-30T17:30:00Z",
      expected: { late: 0, ot: 0 }
    },
    {
      name: "Within grace period (07:40)",
      checkIn: "2024-04-30T07:40:00Z",
      checkOut: "2024-04-30T17:30:00Z",
      expected: { late: 0, ot: 0 }
    },
    {
      name: "Late arrival (07:41)",
      checkIn: "2024-04-30T07:41:00Z",
      checkOut: "2024-04-30T17:30:00Z",
      expected: { late: 11, ot: 0 }
    },
    {
      name: "Late departure (OT)",
      checkIn: "2024-04-30T07:30:00Z",
      checkOut: "2024-04-30T18:00:00Z",
      expected: { late: 0, ot: 30 }
    }
  ];

  console.log("--- Attendance Logic Test ---");
  scenarios.forEach(s => {
    // We need to adjust for local time if the utility uses getHours/getMinutes
    // Our utility uses:
    // const time = new Date(checkInTimestamp);
    // const mins = time.getHours() * 60 + time.getMinutes();
    
    // In node environment, getHours() depends on local TZ.
    // Let's create dates that will have the specific time regardless of TZ for testing purposes
    // Or just manually create dates.
    
    const dIn = new Date(2024, 3, 30, ...s.checkIn.split('T')[1].split(':').map(Number));
    const dOut = new Date(2024, 3, 30, ...s.checkOut.split('T')[1].split(':').map(Number));

    const result = calculateDailyStats(dIn.toISOString(), dOut.toISOString(), shiftStart, shiftEnd, gracePeriod);
    
    const latePass = result.lateMinutes === s.expected.late;
    const otPass = result.otMinutes === s.expected.ot;

    console.log(`${latePass && otPass ? '✅' : '❌'} ${s.name}:`);
    console.log(`   Late: ${result.lateMinutes} (Expected: ${s.expected.late})`);
    console.log(`   OT: ${result.otMinutes} (Expected: ${s.expected.ot})`);
  });
}

test();

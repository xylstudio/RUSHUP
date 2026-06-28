
require('dotenv').config({ path: '.env.local' });
const tsNode = require('ts-node');
tsNode.register({
  compilerOptions: { module: "commonjs", esModuleInterop: true },
});

const { buildCustomerReportFlexMessage, buildCustomerBatchReportCarouselFlexMessage } = require('../lib/server/lineMessaging.ts');

const singleReport = {
  orderId: "ord-1",
  reportId: "rep-1",
  orderCode: "ORD-001",
  serviceName: "ดูแลสวนรายเดือน",
  staffName: "Natthan Chaimongkol",
  houseName: "XYL STUDIO",
  completedAt: new Date().toISOString(),
  workDone: "กำจัดวัชพืช\nล้างทำความสะอาดระบบน้ำ\nใส่ปุ๋ย",
  problemsFound: "ไม่มีปัญหา",
  nextVisitDate: "2026-06-10",
  visitCountText: "2/24",
  pricingPeriod: "monthly",
  zones: [
    { 
      name: "หน้าบ้าน", 
      work_done: "ดูแลทั่วไป", 
      before_photos: ["https://images.unsplash.com/photo-1585320806297-9794b3e4eeae"], 
      after_photos: ["https://images.unsplash.com/photo-1598902108854-10e335adac99"] 
    }
  ]
};

console.log("=== SINGLE REPORT FLEX ===");
const singleFlex = buildCustomerReportFlexMessage({
  message: "Test message",
  lineReport: singleReport,
  customerId: "cust-1",
  appBaseUrl: "http://localhost:3000"
});
console.log(JSON.stringify(singleFlex, null, 2));

console.log("\n=== BATCH REPORT (CAROUSEL) FLEX ===");
const batchFlex = buildCustomerBatchReportCarouselFlexMessage({
  batchReports: {
    staffName: "Natthan Chaimongkol",
    reports: [singleReport, { ...singleReport, houseName: "บ้านตัวอย่าง 2", orderId: "ord-2" }]
  },
  customerId: "cust-1",
  appBaseUrl: "http://localhost:3000"
});
console.log(JSON.stringify(batchFlex, null, 2));

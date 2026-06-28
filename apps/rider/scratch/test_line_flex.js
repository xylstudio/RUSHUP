require('dotenv').config({ path: '.env.local' });
const tsNode = require('ts-node');
tsNode.register({
  compilerOptions: { module: "commonjs", esModuleInterop: true },
});

const { buildCustomerReportFlexMessage } = require('./lib/server/lineMessaging.ts');

const lineReport = {
  orderId: "123",
  reportId: "456",
  orderCode: "ORD-123",
  serviceName: "Test Service",
  staffName: "Test Staff",
  houseName: "Test House",
  completedAt: new Date().toISOString(),
  workDone: "Test Work",
  pricingPeriod: "one-time",
  zones: [
    { name: "Zone 1", work_done: "Cut grass", before_photos: ["https://example.com/1.jpg"], after_photos: ["https://example.com/2.jpg"] },
    { name: "Zone 2", work_done: "Cleaned", before_photos: ["https://example.com/3.jpg"], after_photos: ["https://example.com/4.jpg"] }
  ]
};

try {
  const result = buildCustomerReportFlexMessage({
    message: "Test message",
    lineReport,
    customerId: "cust-1",
    appBaseUrl: "http://localhost:3000"
  });
  console.log(JSON.stringify(result, null, 2));
} catch (e) {
  console.error("Error building flex:", e);
}

import { buildCustomerReportFlexMessage } from './lib/server/lineMessaging'

const mockData = {
  orderId: 'mock-order-id',
  reportId: 'mock-report-id',
  orderCode: 'ORD123456',
  serviceName: 'ตัดหญ้า',
  staffName: 'Natthan Chaimongkol',
  houseName: 'Baan Xylem',
  completedAt: new Date().toISOString(),
  workDone: 'ตัดหญ้า\nล้างทำความสะอาดระบบน้ำ\nกำลังดำเนินการลงรายงาน...',
  problemsFound: 'ไม่มีปัญหา',
  nextVisitDate: '2026-05-13',
  beforePhotos: ['https://example.com/before.jpg'],
  afterPhotos: ['https://example.com/after.jpg'],
  zones: [],
  visitCountText: '1/24'
}

const result = buildCustomerReportFlexMessage({
  title: 'รายงานหลังจบงานพร้อมแล้ว',
  message: 'Natthan Chaimongkol เสร็จงาน: ดูแลสวน',
  lineReport: mockData,
  customerId: 'mock-customer-id',
  appBaseUrl: 'https://xylem-landscape.vercel.app'
})

console.log(JSON.stringify(result, null, 2))

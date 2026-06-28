import { buildCustomerReportFlexMessage } from './lib/server/lineMessaging.js'

function main() {
  const flex = buildCustomerReportFlexMessage({
    title: 'Test',
    message: 'Test Message',
    lineReport: {
      houseName: 'บ้านเทส',
      staffName: 'ทีมงาน',
      pricingPeriod: 'monthly',
      totalSessions: 12,
      completedSessions: 1,
      beforePhotos: [],
      afterPhotos: [],
      workDone: 'ตัดหญ้า',
      zones: [
        {
          zName: 'โซนหน้าบ้าน',
          zBeforeUrl: 'https://placekitten.com/200/200',
          zAfterUrl: 'https://placekitten.com/200/200',
          zWork: 'ตัดหญ้าหน้าบ้าน'
        }
      ]
    },
    customerId: 'test',
    appBaseUrl: 'http://localhost'
  })
  
  console.log(JSON.stringify(flex, null, 2))
}

main()

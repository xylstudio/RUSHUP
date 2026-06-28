import { createClient } from '@supabase/supabase-js'
import { sendLinePushToLineUserId } from './lib/server/lineMessaging'
import { buildCustomerReportFlexMessage } from './lib/server/lineMessaging'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY

async function main() {
  const supabase = createClient(url!, key!)
  const lineUserId = "U600115e5881c63dc9e5f58bcba5e01bd" // A random valid LINE ID from the database or I can just test with a dummy one
  
  // Wait, I can just console.log the JSON and then use curl to push to my own bot!
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

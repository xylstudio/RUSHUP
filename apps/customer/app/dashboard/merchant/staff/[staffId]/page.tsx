import { useI18n } from "@/lib/I18nContext";

export default function StaffDetails({ params }: { params: { staffId: string } }) {
    const { locale } = useI18n();
  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-900 mb-8">{locale === 'en' ? 'Employee ID details:' : locale === 'zh' ? '员工 ID 详细信息：' : 'รายละเอียดพนักงาน ID: '}{params.staffId}</h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">{locale === 'en' ? 'personal information' : locale === 'zh' ? '个人信息' : 'ข้อมูลส่วนตัว'}</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500">Staff ID</p>
                <p className="font-medium">{params.staffId}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Name</p>
                <p className="font-medium">{locale === 'en' ? 'Somsak Yanying' : locale === 'zh' ? '颂萨克艳英' : 'สมศักดิ์ ขยันยิ่ง'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Email</p>
                <p className="font-medium">somsakk.k@xylem.com</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Phone</p>
                <p className="font-medium">098-765-4321</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Hire Date</p>
                <p className="font-medium">January 10, 2019</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Status</p>
                <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-sm">
                  Active
                </span>
              </div>
              <div>
                <p className="text-sm text-gray-500">Specializations</p>
                <p className="font-medium">Lawn Care, Tree Trimming</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Years Experience</p>
                <p className="font-medium">5 years</p>
              </div>
            </div>
          </div>
          
          <div className="mt-6 bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">{locale === 'en' ? 'Work history' : locale === 'zh' ? '工作经历' : 'ประวัติการทำงาน'}</h2>
            <div className="bg-gray-100 p-4 rounded-lg">
              <p className="text-gray-500">{locale === 'en' ? 'Work history and performance will be displayed here.' : locale === 'zh' ? '工作历史和绩效将显示在这里。' : 'ประวัติการทำงานและประสิทธิภาพจะแสดงที่นี่'}</p>
            </div>
          </div>
        </div>
        
        <div className="lg:col-span-1">
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Recent Tasks</h2>
            <div className="space-y-3">
              <div className="border-b border-gray-200 pb-3">
                <p className="font-medium text-gray-800">Lawn Care</p>
                <p className="text-sm text-gray-600">123 Main Street</p>
                <p className="text-sm text-gray-500">Completed - Today</p>
              </div>
              <div className="border-b border-gray-200 pb-3">
                <p className="font-medium text-gray-800">Tree Trimming</p>
                <p className="text-sm text-gray-600">456 Oak Avenue</p>
                <p className="text-sm text-gray-500">In Progress</p>
              </div>
              <div className="border-b border-gray-200 pb-3">
                <p className="font-medium text-gray-800">Garden Design</p>
                <p className="text-sm text-gray-600">789 Pine Street</p>
                <p className="text-sm text-gray-500">Scheduled</p>
              </div>
            </div>
          </div>
          
          <div className="mt-6 bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Quick Actions</h2>
            <div className="space-y-2">
              <button className="w-full bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700">
                Assign Task
              </button>
              <button className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
                Send Message
              </button>
              <button className="w-full bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700">
                View Schedule
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 
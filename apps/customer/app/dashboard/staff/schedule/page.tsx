'use client';
import { useI18n } from "@/lib/I18nContext";

export default function StaffSchedule() {
    const { locale } = useI18n();
  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-900 mb-8">{locale === 'en' ? 'My work schedule' : locale === 'zh' ? '我的工作安排' : 'ตารางงานของฉัน'}</h1>
      
      <div className="bg-white p-6 rounded-lg shadow">
        {/* FullCalendar or other calendar component would go here */}
        <div className="bg-gray-100 h-96 flex items-center justify-center">
          <p className="text-gray-500">{locale === 'en' ? 'The Calendar component is displayed here.' : locale === 'zh' ? '此处显示日历组件。' : 'คอมโพเนนต์ปฏิทินจะแสดงที่นี่'}</p>
        </div>
      </div>
    </div>
  )
} 
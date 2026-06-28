import sys

with open('components/customer/GardenCalendar.tsx', 'r') as f:
    content = f.read()

# We need to find the TRANSLATIONS block and replace it with a clean one
start_str = "const TRANSLATIONS: Record<string, any> = {"
end_str = "const RESCHEDULE_REASONS" # Wait, RESCHEDULE_REASONS is gone

# Let's just use regex to replace from "const TRANSLATIONS: Record<string, any> = {" to "  }\n}"
import re
new_translations = """const TRANSLATIONS: Record<string, any> = {
  th: {
    weekDays: ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'],
    swipe: 'เลื่อน',
    upcoming: 'กำลังจะมาถึง',
    history: 'ประวัติ',
    summaryFor: 'ภาพรวมของเดือน',
    summaryTitle: 'แผนการดูแลเดือนนี้',
    noActivities: 'ไม่มีกิจกรรมในเดือนนี้',
    upcomingVisit: 'คิวงานถัดไป',
    pastService: 'งานที่เสร็จสิ้น',
    details: 'รายละเอียด',
    report: 'ดูรายงาน',
    reschedule: 'เลื่อนนัด',
    noAppointmentsDay: 'ยังไม่มีรายการนัดหมายในวันที่เลือก',
    supportCare: 'Support & Care',
    supportDesc: 'หากมีข้อสงสัยเกี่ยวกับงานบริการหรือต้องการแจ้งปัญหาหน้างานเพิ่มเติม สามารถติดต่อสถาปนิกผ่าน Line OA ของสตูดิโอได้ตลอดเวลาครับ',
    rescheduling: 'กำลังเลื่อนนัดหมาย',
    selectNewDate: 'เลือกวันที่ใหม่บนปฏิทิน',
    datePlaceholder: 'กรุณาแตะเลือกวันที่ต้องการบนปฏิทิน',
    reason: 'เหตุผลในการเลื่อน',
    notes: 'หมายเหตุเพิ่มเติม',
    notesPlaceholder: 'เช่น ฝากกุญแจไว้ที่นิติ...',
    confirmReschedule: 'ยืนยันการเลื่อนนัด',
    cancel: 'ยกเลิก',
    systemUpdated: 'อัปเดตระบบแล้ว',
    everythingSet: 'ทุกอย่างพร้อมสำหรับรอบถัดไป',
    rescheduleReasons: [
      'ไม่สะดวกอยู่บ้านตามเวลานัด',
      'ขอเปลี่ยนเป็นช่วงเวลาที่สะดวกกว่า',
      'มีธุระเร่งด่วน',
      'สภาพอากาศไม่เหมาะกับงาน',
    ]
  },
  en: {
    weekDays: ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'],
    swipe: 'SWIPE',
    upcoming: 'Upcoming',
    history: 'History',
    summaryFor: 'SUMMARY FOR',
    summaryTitle: 'Monthly Care Plan',
    noActivities: 'No activities recorded for this month',
    upcomingVisit: 'Upcoming Visit',
    pastService: 'Past Service',
    details: 'Details',
    report: 'Report',
    reschedule: 'Reschedule',
    noAppointmentsDay: 'No appointments on the selected date',
    supportCare: 'Support & Care',
    supportDesc: 'If you have any questions about our services or need to report any issues, you can contact our architects via Line OA at any time.',
    rescheduling: 'Rescheduling Appointment',
    selectNewDate: 'Select a new date on the calendar',
    datePlaceholder: 'Please tap a new date on the calendar',
    reason: 'Reason for rescheduling',
    notes: 'Additional Notes',
    notesPlaceholder: 'e.g. Leave keys at the office...',
    confirmReschedule: 'Confirm Reschedule',
    cancel: 'Cancel',
    systemUpdated: 'System Updated',
    everythingSet: 'Everything is set for your next visit',
    rescheduleReasons: [
      'Not available at home at the scheduled time',
      'Would like to change to a more convenient time',
      'Urgent matters',
      'Weather conditions are not suitable',
    ]
  },
  zh: {
    weekDays: ['日', '一', '二', '三', '四', '五', '六'],
    swipe: '滑动',
    upcoming: '即将到来',
    history: '历史',
    summaryFor: '总结',
    summaryTitle: '本月护理计划',
    noActivities: '本月没有记录活动',
    upcomingVisit: '下次访问',
    pastService: '过往服务',
    details: '详情',
    report: '报告',
    reschedule: '重新安排',
    noAppointmentsDay: '所选日期没有预约',
    supportCare: '支持与护理',
    supportDesc: '如果您对我们的服务有任何疑问或需要报告任何问题，可以随时通过Line OA联系我们的建筑师。',
    rescheduling: '重新安排预约',
    selectNewDate: '在日历上选择一个新日期',
    datePlaceholder: '请点击日历上的新日期',
    reason: '重新安排的原因',
    notes: '附加说明',
    notesPlaceholder: '例如将钥匙留在办公室...',
    confirmReschedule: '确认重新安排',
    cancel: '取消',
    systemUpdated: '系统已更新',
    everythingSet: '下次访问的一切都准备好了',
    rescheduleReasons: [
      '在预定时间不方便在家',
      '想改一个更方便的时间',
      '有紧急事务',
      '天气条件不适合',
    ]
  }
}"""

content = re.sub(r"const TRANSLATIONS: Record<string, any> = \{.*?\n\}\n", new_translations + "\n", content, flags=re.DOTALL)

with open('components/customer/GardenCalendar.tsx', 'w') as f:
    f.write(content)

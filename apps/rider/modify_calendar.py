import sys

with open('components/customer/GardenCalendar.tsx', 'r') as f:
    content = f.read()

translations = """
const TRANSLATIONS: Record<string, any> = {
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
}
"""

reschedule_reason_block = """const RESCHEDULE_REASONS = [
  'ไม่สะดวกอยู่บ้านตามเวลานัด',
  'ขอเปลี่ยนเป็นช่วงเวลาที่สะดวกกว่า',
  'มีธุระเร่งด่วน',
  'สภาพอากาศไม่เหมาะกับงาน',
]"""

content = content.replace(reschedule_reason_block, translations)

# Component definition
content = content.replace("const router = useRouter()", "const router = useRouter()\n  const t = TRANSLATIONS[locale] || TRANSLATIONS['en']")
content = content.replace("const [reason, setReason] = useState(RESCHEDULE_REASONS[0])", "const [reason, setReason] = useState(t.rescheduleReasons[0])")
content = content.replace("setReason(RESCHEDULE_REASONS[0])", "setReason(t.rescheduleReasons[0])")
content = content.replace("RESCHEDULE_REASONS.map", "t.rescheduleReasons.map")

# Luxury success
content = content.replace("const LuxurySuccessAnimation = ({ message }: { message: string }) => (", "const LuxurySuccessAnimation = ({ message, t }: { message: string, t: any }) => (")
content = content.replace("Everything is set for your next visit", "{t.everythingSet}")
content = content.replace("{saveSuccess && <LuxurySuccessAnimation message={saveSuccess} />}", "{saveSuccess && <LuxurySuccessAnimation message={saveSuccess} t={t} />}")

# Array replacements
content = content.replace("['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT']", "t.weekDays")

# Exact string replacements
def replace_html_text(content, old, new):
    return content.replace(f">{old}<", f">{{{new}}}<")

content = content.replace("SWIPE", "{t.swipe}")
content = replace_html_text(content, "Upcoming", "t.upcoming")
content = replace_html_text(content, "History", "t.history")
content = replace_html_text(content, "ภาพรวมแผนการดูแลเดือนนี้", "t.summaryTitle")
content = content.replace("SUMMARY FOR ", "{t.summaryFor} ")
content = replace_html_text(content, "No activities recorded for this month", "t.noActivities")

# Inside mapped events
content = content.replace("Upcoming • ", "{t.upcomingVisit} • ")
content = content.replace("Completed • ", "{t.pastService} • ")
content = replace_html_text(content, "Details", "t.details")
content = content.replace("ดูรายงานฉบับเต็ม", "{t.report}")
content = replace_html_text(content, "Reschedule", "t.reschedule")
content = replace_html_text(content, "ยังไม่มีรายการนัดหมายในวันที่เลือก", "t.noAppointmentsDay")
content = replace_html_text(content, "Support & Care", "t.supportCare")
content = content.replace("หากมีข้อสงสัยเกี่ยวกับงานบริการหรือต้องการแจ้งปัญหาหน้างานเพิ่มเติม สามารถติดต่อสถาปนิกผ่าน Line OA ของสตูดิโอได้ตลอดเวลาครับ", "{t.supportDesc}")
content = replace_html_text(content, "กำลังเลื่อนนัดหมาย", "t.rescheduling")
content = replace_html_text(content, "เลือกวันที่ใหม่บนปฏิทิน", "t.selectNewDate")
content = content.replace("กรุณาแตะเลือกวันที่ต้องการบนปฏิทิน", "{t.datePlaceholder}")
content = replace_html_text(content, "เหตุผลในการเลื่อน", "t.reason")
content = replace_html_text(content, "หมายเหตุเพิ่มเติม", "t.notes")
content = content.replace("เช่น ฝากกุญแจไว้ที่นิติ...", "{t.notesPlaceholder}")
content = content.replace("ยืนยันการเลื่อนนัด", "{t.confirmReschedule}")
content = replace_html_text(content, "ยกเลิก", "t.cancel")
content = content.replace("System Updated", "{t.systemUpdated}")
content = replace_html_text(content, "แตะเลือกวันที่ใหม่บนปฏิทิน", "t.selectNewDate")

with open('components/customer/GardenCalendar.tsx', 'w') as f:
    f.write(content)

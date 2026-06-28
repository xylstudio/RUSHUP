import nodemailer from 'nodemailer'

// Email configuration
const emailConfig = {
  host: process.env.EMAIL_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.EMAIL_PORT || '587'),
  secure: false, // true for 465, false for other ports
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS, // Gmail App Password
  },
}

// Create transporter
const transporter = nodemailer.createTransport(emailConfig)

// Email templates
interface BookingEmailData {
  customerName: string
  customerEmail: string
  workshopTopic: string
  workshopDate: string
  workshopTime: string
  attendeesCount: number
  totalAmount: number
  bookingId: string
  paymentMethod: string
  paymentStatus: 'paid' | 'pending' | 'pending_cash'
  language?: 'th' | 'en' | 'zh'
}

// Multi-language email templates
function getCustomerEmailTemplate(data: BookingEmailData) {
  const lang = data.language || 'th'
  
  const translations = {
    th: {
      subject: 'ยืนยันการจอง Workshop - XYL Studio',
      title: 'ยืนยันการจอง Workshop',
      greeting: `เรียน คุณ${data.customerName}`,
      thankYou: 'ขอบคุณที่จองเวิร์คชอปกับเรา! นี่คือรายละเอียดการจองของคุณ:',
      bookingDetails: 'รายละเอียดการจอง',
      bookingNumber: 'หมายเลขการจอง:',
      workshop: 'เวิร์คชอป:',
      date: 'วันที่:',
      time: 'เวลา:',
      attendees: 'จำนวนผู้เข้าร่วม:',
      paymentMethod: 'วิธีชำระเงิน:',
      total: 'ยอดรวม:',
      currency: 'บาท',
      statusText: {
        paid: 'ชำระเงินสำเร็จแล้ว',
        pending: 'รอการชำระเงิน',
        pending_cash: 'จ่ายเงินสดหน้าร้าน'
      },
      paymentText: {
        promptpay: 'PromptPay',
        creditcard: 'บัตรเครดิต/เดบิต',
        banktransfer: 'โอนผ่านธนาคาร',
        cash: 'เงินสด (จ่ายหน้าร้าน)'
      },
      cashPayment: {
        title: '💵 การชำระเงินสด',
        instructions: [
          'กรุณามาถึงก่อนเวลาเริ่มเวิร์คชอป <strong>15 นาที</strong>',
          `เตรียมเงินสดจำนวน <strong>${data.totalAmount.toLocaleString()} บาท</strong> (พอดีจำนวน)`,
          'หากไม่สามารถมาได้ กรุณาแจ้งล่วงหน้า 24 ชั่วโมง'
        ]
      },
      location: {
        title: '📍 ที่อยู่ XYL Studio',
        address: '123 ถนนสุขุมวิท แขวงคลองเตย เขตคลองเตย กรุงเทพฯ 10110',
        phone: 'โทร: 02-123-4567',
        line: 'Line: @xylstudio'
      },
      buttons: {
        map: '🗺️ ดูแผนที่',
        call: '📞 โทรสอบถาม'
      },
      footer: {
        thanks: '🌿 ขอบคุณที่เลือก XYL Studio',
        contact: 'หากมีคำถามใดๆ สามารถติดต่อเราได้ตลอดเวลา',
        disclaimer: 'อีเมลนี้ถูกส่งอัตโนมัติ กรุณาอย่าตอบกลับ<br>หากต้องการติดต่อ กรุณาใช้ช่องทางที่ระบุด้านบน'
      }
    },
    en: {
      subject: 'Workshop Booking Confirmation - XYL Studio',
      title: 'Workshop Booking Confirmation',
      greeting: `Dear ${data.customerName}`,
      thankYou: 'Thank you for booking our workshop! Here are your booking details:',
      bookingDetails: 'Booking Details',
      bookingNumber: 'Booking Number:',
      workshop: 'Workshop:',
      date: 'Date:',
      time: 'Time:',
      attendees: 'Attendees:',
      paymentMethod: 'Payment Method:',
      total: 'Total:',
      currency: 'THB',
      statusText: {
        paid: 'Payment Successful',
        pending: 'Payment Pending',
        pending_cash: 'Pay Cash On-Site'
      },
      paymentText: {
        promptpay: 'PromptPay',
        creditcard: 'Credit/Debit Card',
        banktransfer: 'Bank Transfer',
        cash: 'Cash (Pay On-Site)'
      },
      cashPayment: {
        title: '💵 Cash Payment',
        instructions: [
          'Please arrive <strong>15 minutes</strong> before workshop starts',
          `Prepare exact cash amount of <strong>${data.totalAmount.toLocaleString()} THB</strong>`,
          'If unable to attend, please notify 24 hours in advance'
        ]
      },
      location: {
        title: '📍 XYL Studio Location',
        address: '123 Sukhumvit Road, Khlong Toei, Bangkok 10110',
        phone: 'Phone: 02-123-4567',
        line: 'Line: @xylstudio'
      },
      buttons: {
        map: '🗺️ View Map',
        call: '📞 Call Us'
      },
      footer: {
        thanks: '🌿 Thank you for choosing XYL Studio',
        contact: 'If you have any questions, feel free to contact us anytime',
        disclaimer: 'This email was sent automatically. Please do not reply.<br>For inquiries, please use the contact methods listed above.'
      }
    },
    zh: {
      subject: '工作坊预订确认 - XYL Studio',
      title: '工作坊预订确认',
      greeting: `亲爱的 ${data.customerName}`,
      thankYou: '感谢您预订我们的工作坊！以下是您的预订详情：',
      bookingDetails: '预订详情',
      bookingNumber: '预订编号：',
      workshop: '工作坊：',
      date: '日期：',
      time: '时间：',
      attendees: '参与人数：',
      paymentMethod: '支付方式：',
      total: '总计：',
      currency: '泰铢',
      statusText: {
        paid: '支付成功',
        pending: '待支付',
        pending_cash: '现场现金支付'
      },
      paymentText: {
        promptpay: 'PromptPay',
        creditcard: '信用卡/借记卡',
        banktransfer: '银行转账',
        cash: '现金（现场支付）'
      },
      cashPayment: {
        title: '💵 现金支付',
        instructions: [
          '请在工作坊开始前 <strong>15 分钟</strong> 到达',
          `请准备准确的现金金额 <strong>${data.totalAmount.toLocaleString()} 泰铢</strong>`,
          '如无法参加，请提前24小时通知'
        ]
      },
      location: {
        title: '📍 XYL Studio 地址',
        address: '123 素坤逸路，空堤区，曼谷 10110',
        phone: '电话：02-123-4567',
        line: 'Line：@xylstudio'
      },
      buttons: {
        map: '🗺️ 查看地图',
        call: '📞 电话咨询'
      },
      footer: {
        thanks: '🌿 感谢您选择 XYL Studio',
        contact: '如有任何疑问，请随时联系我们',
        disclaimer: '此邮件为自动发送，请勿回复。<br>如需咨询，请使用上述联系方式。'
      }
    }
  }
  
  const t = translations[lang]
  const peopleText = lang === 'en' ? (data.attendeesCount > 1 ? 'people' : 'person') : 
                     lang === 'zh' ? '人' : 'คน'

  const dateLocale = lang === 'en' ? 'en-US' : lang === 'zh' ? 'zh-CN' : 'th-TH'
  
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${t.subject}</title>
  <style>
    body { font-family: 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #1e293b, #475569); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
    .content { background: #f8fafc; padding: 30px; border-radius: 0 0 10px 10px; }
    .booking-card { background: white; padding: 25px; border-radius: 8px; margin: 20px 0; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
    .status-badge { display: inline-block; padding: 6px 12px; border-radius: 20px; font-size: 12px; font-weight: bold; }
    .status-paid { background: #dcfce7; color: #166534; }
    .status-pending { background: #fef3c7; color: #92400e; }
    .status-cash { background: #dbeafe; color: #1e40af; }
    .detail-row { display: flex; justify-content: space-between; margin: 10px 0; padding: 8px 0; border-bottom: 1px solid #e2e8f0; }
    .detail-label { font-weight: 600; color: #64748b; }
    .detail-value { font-weight: 500; }
    .total-row { background: #f1f5f9; padding: 15px; border-radius: 8px; margin: 15px 0; }
    .footer { text-align: center; margin-top: 30px; padding: 20px; color: #64748b; font-size: 14px; }
    .button { display: inline-block; background: #1e293b; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 10px 5px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🌿 XYL Studio</h1>
      <h2>${t.title}</h2>
    </div>
    
    <div class="content">
      <p>${t.greeting}</p>
      <p>${t.thankYou}</p>
      
      <div class="booking-card">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
          <h3>${t.bookingDetails}</h3>
          <span class="status-badge status-${data.paymentStatus === 'paid' ? 'paid' : data.paymentStatus === 'pending_cash' ? 'cash' : 'pending'}">
            ${t.statusText[data.paymentStatus]}
          </span>
        </div>
        
        <div class="detail-row">
          <span class="detail-label">${t.bookingNumber}</span>
          <span class="detail-value">#${data.bookingId}</span>
        </div>
        
        <div class="detail-row">
          <span class="detail-label">${t.workshop}</span>
          <span class="detail-value">${data.workshopTopic}</span>
        </div>
        
        <div class="detail-row">
          <span class="detail-label">${t.date}</span>
          <span class="detail-value">${new Date(data.workshopDate).toLocaleDateString(dateLocale, { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
          })}</span>
        </div>
        
        <div class="detail-row">
          <span class="detail-label">${t.time}</span>
          <span class="detail-value">${data.workshopTime}</span>
        </div>
        
        <div class="detail-row">
          <span class="detail-label">${t.attendees}</span>
          <span class="detail-value">${data.attendeesCount} ${peopleText}</span>
        </div>
        
        <div class="detail-row">
          <span class="detail-label">${t.paymentMethod}</span>
          <span class="detail-value">${t.paymentText[data.paymentMethod as keyof typeof t.paymentText] || data.paymentMethod}</span>
        </div>
        
        <div class="total-row">
          <div class="detail-row" style="border: none; margin: 0;">
            <span class="detail-label" style="font-size: 18px;">${t.total}</span>
            <span class="detail-value" style="font-size: 20px; font-weight: bold; color: #1e293b;">${data.totalAmount.toLocaleString()} ${t.currency}</span>
          </div>
        </div>
      </div>
      
      ${data.paymentStatus === 'pending_cash' ? `
        <div style="background: #dbeafe; border: 1px solid #3b82f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h4 style="color: #1e40af; margin: 0 0 10px 0;">${t.cashPayment.title}</h4>
          <ul style="color: #1e40af; margin: 0; padding-left: 20px;">
            ${t.cashPayment.instructions.map(instruction => `<li>${instruction}</li>`).join('')}
          </ul>
        </div>
      ` : ''}
      
      <div style="text-align: center; margin: 30px 0;">
        <h4>${t.location.title}</h4>
        <p style="margin: 5px 0;">${t.location.address}</p>
        <p style="margin: 5px 0;">${t.location.phone}</p>
        <p style="margin: 5px 0;">${t.location.line}</p>
      </div>
      
      <div style="text-align: center;">
        <a href="https://maps.google.com" class="button">${t.buttons.map}</a>
        <a href="tel:021234567" class="button">${t.buttons.call}</a>
      </div>
    </div>
    
    <div class="footer">
      <p>${t.footer.thanks}</p>
      <p>${t.footer.contact}</p>
      <p style="font-size: 12px; color: #94a3b8;">
        ${t.footer.disclaimer}
      </p>
    </div>
  </div>
</body>
</html>
  `
}

// Admin notification email template (always in Thai for admin)
function getAdminEmailTemplate(data: BookingEmailData) {
  const adminTranslations = {
    title: 'มีการจองใหม่!',
    subtitle: 'XYL Studio Workshop',
    bookingDetails: 'รายละเอียดการจอง',
    bookingNumber: 'หมายเลขการจอง:',
    customerName: 'ชื่อลูกค้า:',
    email: 'อีเมล:',
    workshop: 'เวิร์คชอป:',
    date: 'วันที่:',
    time: 'เวลา:',
    attendees: 'จำนวนผู้เข้าร่วม:',
    paymentMethod: 'วิธีชำระเงิน:',
    paymentStatus: 'สถานะการชำระเงิน:',
    total: 'ยอดรวม:',
    currency: 'บาท',
    peopleText: 'คน',
    preparation: 'กรุณาเตรียมความพร้อมสำหรับการจองนี้'
  }

  const t = adminTranslations
  
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${t.title} - XYL Studio</title>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #dc2626; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { background: #f9fafb; padding: 25px; border-radius: 0 0 8px 8px; }
    .booking-details { background: white; padding: 20px; border-radius: 8px; margin: 15px 0; }
    .detail-row { margin: 8px 0; padding: 5px 0; border-bottom: 1px solid #e5e7eb; }
    .label { font-weight: bold; color: #374151; }
    .value { color: #111827; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🚨 ${t.title}</h1>
      <h2>${t.subtitle}</h2>
    </div>
    
    <div class="content">
      <div class="booking-details">
        <h3>${t.bookingDetails}</h3>
        
        <div class="detail-row">
          <span class="label">${t.bookingNumber}</span>
          <span class="value">#${data.bookingId}</span>
        </div>
        
        <div class="detail-row">
          <span class="label">${t.customerName}</span>
          <span class="value">${data.customerName}</span>
        </div>
        
        <div class="detail-row">
          <span class="label">${t.email}</span>
          <span class="value">${data.customerEmail}</span>
        </div>
        
        <div class="detail-row">
          <span class="label">${t.workshop}</span>
          <span class="value">${data.workshopTopic}</span>
        </div>
        
        <div class="detail-row">
          <span class="label">${t.date}</span>
          <span class="value">${new Date(data.workshopDate).toLocaleDateString('th-TH', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          })}</span>
        </div>
        
        <div class="detail-row">
          <span class="label">${t.time}</span>
          <span class="value">${data.workshopTime}</span>
        </div>
        
        <div class="detail-row">
          <span class="label">${t.attendees}</span>
          <span class="value">${data.attendeesCount} ${t.peopleText}</span>
        </div>
        
        <div class="detail-row">
          <span class="label">${t.paymentMethod}</span>
          <span class="value">${data.paymentMethod}</span>
        </div>
        
        <div class="detail-row">
          <span class="label">${t.paymentStatus}</span>
          <span class="value">${data.paymentStatus}</span>
        </div>
        
        <div class="detail-row" style="border: none; margin-top: 15px; padding-top: 15px; border-top: 2px solid #e5e7eb;">
          <span class="label" style="font-size: 18px;">${t.total}</span>
          <span class="value" style="font-size: 20px; font-weight: bold; color: #dc2626;">${data.totalAmount.toLocaleString()} ${t.currency}</span>
        </div>
      </div>
      
      <p style="text-align: center; margin: 20px 0;">
        <strong>${t.preparation}</strong>
      </p>
    </div>
  </div>
</body>
</html>
  `
}

// Send booking confirmation emails
export async function sendBookingEmails(data: BookingEmailData) {
  try {
    const lang = data.language || 'th'
    
    // Get subject based on language
    const customerSubjects = {
      th: `✅ ยืนยันการจอง Workshop - ${data.workshopTopic} | XYL Studio`,
      en: `✅ Workshop Booking Confirmation - ${data.workshopTopic} | XYL Studio`,
      zh: `✅ 工作坊预订确认 - ${data.workshopTopic} | XYL Studio`
    }
    
    // Send confirmation email to customer
    const customerEmail = {
      from: `${process.env.EMAIL_FROM_NAME || 'XYL Studio'} <${process.env.EMAIL_FROM}>`,
      to: data.customerEmail,
      subject: customerSubjects[lang],
      html: getCustomerEmailTemplate(data),
    }

    // Send notification email to admin (always in Thai)
    const adminEmail = {
      from: `${process.env.EMAIL_FROM_NAME || 'XYL Studio'} <${process.env.EMAIL_FROM}>`,
      to: process.env.EMAIL_FROM, // Send to same email as sender (admin)
      subject: `🚨 การจองใหม่: ${data.customerName} - ${data.workshopTopic}`,
      html: getAdminEmailTemplate(data),
    }

    // Send both emails
    const [customerResult, adminResult] = await Promise.all([
      transporter.sendMail(customerEmail),
      transporter.sendMail(adminEmail),
    ])

    console.log('Emails sent successfully:', {
      customer: customerResult.messageId,
      admin: adminResult.messageId,
    })

    return {
      success: true,
      customerMessageId: customerResult.messageId,
      adminMessageId: adminResult.messageId,
    }
  } catch (error) {
    console.error('Failed to send emails:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

// Test email connection
export async function testEmailConnection() {
  try {
    await transporter.verify()
    return { success: true, message: 'Email connection verified' }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}
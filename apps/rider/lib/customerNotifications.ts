// Global notification broadcasting system
// ใส่ไว้ใน layout หรือ provider เพื่อให้ทุกหน้าได้รับ

export function broadcastCustomerNotification(notification: any) {
  console.log('🌐 Broadcasting customer notification:', notification);
  
  // ส่ง custom event ไปยังทุก tab/window
  window.dispatchEvent(new CustomEvent('customerNotification', {
    detail: notification
  }));
  
  // ส่งไปยัง localStorage เพื่อ sync ระหว่าง tabs
  try {
    const existing = localStorage.getItem('customer_notifications') || '[]';
    const notifications = JSON.parse(existing);
    notifications.unshift(notification);
    
    // เก็บแค่ 50 notifications ล่าสุด
    const trimmed = notifications.slice(0, 50);
    localStorage.setItem('customer_notifications', JSON.stringify(trimmed));
    
    console.log('💾 Customer notification saved to localStorage');
  } catch (error) {
    console.error('❌ Error saving customer notification:', error);
  }
}

// ฟังก์ชันสำหรับจำลองการรับแจ้งเตือนจาก server
export function simulateCustomerNotification(jobId: string, status: string) {
  const statusMessages = {
    'in_progress': 'พนักงานได้รับงานแล้วและกำลังเดินทางไปยังที่หมาย',
    'completed': 'งานเสร็จสิ้นแล้ว',
    'assigned': 'งานได้รับการมอบหมายแล้ว'
  };

  const notification = {
    id: Date.now(),
    message: statusMessages[status as keyof typeof statusMessages] || 'มีการอัปเดตสถานะงาน',
    type: 'info',
    timestamp: new Date().toISOString(),
    jobId: jobId,
    status: status,
    read: false,
    recipientType: 'customer'
  };

  setTimeout(() => {
    broadcastCustomerNotification(notification);
  }, 1000); // ดีเลย์ 1 วินาที เพื่อจำลอง network latency
}

'use client'

import React, { useEffect, useRef } from 'react'
import { useI18n } from '@/lib/I18nContext'
import { driver } from 'driver.js'
import 'driver.js/dist/driver.css'
import '@/styles/tour.css'

interface OnboardingTourProps {
  onComplete: () => void
}

export default function CustomerOnboardingTour({ onComplete }: OnboardingTourProps) {
  const { locale } = useI18n()
  const isThai = locale === 'th'
  const hasStarted = useRef(false)

  useEffect(() => {
    if (hasStarted.current) return
    hasStarted.current = true

    const driverObj = driver({
      showProgress: true,
      animate: true,
      allowClose: true,
      overlayColor: 'rgba(0, 0, 0, 0.75)',
      nextBtnText: isThai ? 'ถัดไป ➔' : 'Next ➔',
      prevBtnText: isThai ? 'ย้อนกลับ' : 'Previous',
      doneBtnText: isThai ? 'เริ่มใช้งาน' : 'Get Started',
      popoverClass: 'xyl-tour-popover',
      onDestroyStarted: () => {
        if (!driverObj.hasNextStep() || confirm(isThai ? "ต้องการข้ามคำแนะนำหรือไม่?" : "Are you sure you want to skip the tour?")) {
          driverObj.destroy();
          onComplete();
        }
      },
      steps: [
        {
          popover: {
            title: isThai ? 'ยินดีต้อนรับสู่ XYLEM' : 'Welcome to XYLEM',
            description: isThai 
              ? 'เราเตรียมพื้นที่สำหรับคุณเรียบร้อยแล้ว! ขอเวลาสักครู่เพื่อแนะนำการใช้งานระบบจัดการสวนแบบพรีเมียมของเรา'
              : 'Your space is ready! Take a moment to learn about our premium garden management system.',
            side: "center",
            align: "center"
          }
        },
        {
          element: '#tour-location-selector',
          popover: {
            title: isThai ? 'จัดการโครงการของคุณ' : 'Manage your properties',
            description: isThai 
              ? 'กดตรงนี้เพื่อสลับดูโครงการปัจจุบัน หรือกดปุ่ม "เพิ่มโครงการ" เพื่อเพิ่มบ้านหลังใหม่ของคุณ'
              : 'Click here to switch current projects or click "Add Project" to add a new house.',
            side: "bottom",
            align: "start"
          }
        },
        {
          element: '#tour-nav-orders',
          popover: {
            title: isThai ? 'จองและติดตามงานบริการ' : 'Book & Track Services',
            description: isThai 
              ? 'จองบริการต่างๆ นัดหมายเข้าบริการ และติดตามสถานะความคืบหน้าของงานบริการได้ที่นี่'
              : 'Book various services, schedule appointments, and track the progress of your services here.',
            side: "top",
            align: "center"
          }
        },
        {
          element: '#tour-nav-reports',
          popover: {
            title: isThai ? 'ภาพรวมสุขภาพสวน' : 'Garden Health Overview',
            description: isThai 
              ? 'ติดตามภาพรวมการดูแลสวน ตรวจเช็คสุขภาพต้นไม้ และดูรายงานการดูแลของทุกบ้านแบบภาพรวม'
              : 'Monitor overall garden care, check plant health, and view comprehensive care reports across all your properties.',
            side: "top",
            align: "center"
          }
        },
        {
          element: '#tour-nav-marketplace',
          popover: {
            title: isThai ? 'ร้านค้าและของตกแต่ง' : 'The Marketplace',
            description: isThai 
              ? 'ช้อปต้นไม้หายากและของตกแต่งสวนสุดเอ็กซ์คลูซีฟ พร้อมบริการจัดส่งและปลูกถึงที่'
              : 'Shop rare plants and exclusive garden decors with delivery and planting right to your home.',
            side: "top",
            align: "center"
          }
        }
      ]
    });

    // Slight delay to ensure elements are rendered
    setTimeout(() => {
      driverObj.drive();
    }, 600);

    return () => {
      // Cleanup if unmounted abruptly
      try {
        driverObj.destroy();
      } catch (e) {}
    }
  }, [isThai, onComplete]);

  return null // Purely an overlay component driving driver.js
}

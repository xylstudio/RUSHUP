import { 
  Order, 
  OrderStatus, 
  AdditionalService, 
  OrderAdditionalService,
  OrderWithDetails
} from '../lib/supabaseClient'
import { useI18n } from '../lib/I18nContext'
import { formatCurrencyByLocale, formatDateByLocale, formatTimeByLocale } from '@/lib/localeFormat'
import { useI18n } from "@/lib/I18nContext";

interface OrderSummaryProps {
  order: OrderWithDetails
  showFullDetails?: boolean
}

export default function OrderSummary({
  order,
  showFullDetails = true
}: OrderSummaryProps) {
  const { locale } = useI18n()
  const getStatusColor = (status: OrderStatus) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800'
      case 'in_progress':
        return 'bg-yellow-100 text-yellow-800'
      case 'confirmed':
        return 'bg-blue-100 text-blue-800'
      case 'cancelled':
        return 'bg-red-100 text-red-800'
      case 'pending':
        return 'bg-gray-100 text-gray-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusLabel = (status: OrderStatus) => {
    switch (status) {
      case 'pending':
        return 'รอดำเนินการ'
      case 'confirmed':
        return 'ยืนยันแล้ว'
      case 'in_progress':
        return 'กำลังดำเนินการ'
      case 'completed':
        return 'เสร็จสิ้น'
      case 'cancelled':
        return 'ยกเลิก'
      default:
        return status
    }
  }

  const formatCurrency = (amount: number) => {
    return formatCurrencyByLocale(amount, locale)
  }

  const formatDate = (dateString: string) => {
    return formatDateByLocale(dateString, locale)
  }

  const formatTime = (timeString: string) => {
    return formatTimeByLocale(timeString, locale)
  }

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <div className="flex justify-between items-start mb-6">
        <div>
          <h2 className="text-xl font-semibold text-gray-800 mb-1">{locale === 'en' ? 'Order summary' : locale === 'zh' ? '订单汇总' : 'สรุปรายการสั่งซื้อ'}</h2>
          {order.order_code && (
            <p className="text-sm text-gray-600">{locale === 'en' ? 'Order code:' : locale === 'zh' ? '订购代码：' : 'รหัสออเดอร์: '}{order.order_code}</p>
          )}
        </div>
        <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(order.status)}`}>
          {getStatusLabel(order.status)}
        </span>
      </div>
      
      <div className="space-y-4 mb-6">
        {/* Customer Information */}
        {order.profiles && (
          <div className="flex justify-between">
            <span className="text-gray-600">{locale === 'en' ? 'customer:' : locale === 'zh' ? '顾客：' : 'ลูกค้า:'}</span>
            <div className="text-right">
              <div className="font-medium">{order.profiles.display_name}</div>
              {order.profiles.customer_base_code && (
                <div className="text-sm text-gray-500">{order.profiles.customer_base_code}</div>
              )}
            </div>
          </div>
        )}

        {/* Service Information */}
        {order.services && (
          <div className="flex justify-between">
            <span className="text-gray-600">{locale === 'en' ? 'serve:' : locale === 'zh' ? '服务：' : 'บริการ:'}</span>
            <div className="text-right">
              <div className="font-medium">{order.services.service_name}</div>
              {order.services.service_code && (
                <div className="text-sm text-gray-500">{order.services.service_code}</div>
              )}
            </div>
          </div>
        )}

        {/* Property Information */}
        {order.houses && (
          <div className="flex justify-between">
            <span className="text-gray-600">{locale === 'en' ? 'address:' : locale === 'zh' ? '地址：' : 'ที่อยู่:'}</span>
            <div className="text-right">
              <div className="font-medium">{order.houses.name}</div>
              <div className="text-sm text-gray-500">{order.houses.address}</div>
              <div className="text-sm text-gray-500">{order.houses.house_code}</div>
            </div>
          </div>
        )}

        {/* Scheduling Information */}
        {order.scheduled_date && (
          <div className="flex justify-between">
            <span className="text-gray-600">{locale === 'en' ? 'Appointment date:' : locale === 'zh' ? '预约日期：' : 'วันที่นัดหมาย:'}</span>
            <div className="text-right">
              <div className="font-medium">{formatDate(order.scheduled_date)}</div>
              {order.preferred_time_start && order.preferred_time_end && (
                <div className="text-sm text-gray-500">
                  {formatTime(order.preferred_time_start)} - {formatTime(order.preferred_time_end)}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Service Area */}
        {order.service_area && (
          <div className="flex justify-between">
            <span className="text-gray-600">{locale === 'en' ? 'Area size:' : locale === 'zh' ? '面积大小：' : 'ขนาดพื้นที่:'}</span>
            <span className="font-medium">{order.service_area} {locale === 'en' ? 'sq m.' : locale === 'zh' ? '平方米。' : ' ตร.ม.'}</span>
          </div>
        )}

        {/* Priority */}
        {order.priority && order.priority !== 'normal' && (
          <div className="flex justify-between">
            <span className="text-gray-600">{locale === 'en' ? 'Urgency:' : locale === 'zh' ? '紧急程度：' : 'ความเร่งด่วน:'}</span>
            <span className={`font-medium ${
              order.priority === 'urgent' ? 'text-red-600' :
              order.priority === 'high' ? 'text-orange-600' :
              'text-blue-600'
            }`}>
              {order.priority === 'urgent' ? 'เร่งด่วน' :
               order.priority === 'high' ? 'สูง' :
               order.priority === 'low' ? 'ต่ำ' : 'ปกติ'}
            </span>
          </div>
        )}
      </div>

      {/* Additional Services */}
      {order.order_additional_services && order.order_additional_services.length > 0 && (
        <div className="border-t border-gray-200 pt-4 mb-4">
          <h3 className="font-semibold text-gray-800 mb-3">{locale === 'en' ? 'Additional services' : locale === 'zh' ? '附加服务' : 'บริการเสริม'}</h3>
          <div className="space-y-2">
            {order.order_additional_services.map((item, index) => (
              <div key={index} className="flex justify-between items-center">
                <div className="flex-1">
                  <div className="font-medium">{item.additional_services.service_name}</div>
                  {item.additional_services.description && (
                    <div className="text-sm text-gray-500">{item.additional_services.description}</div>
                  )}
                </div>
                <div className="text-right ml-4">
                  <div className="font-medium">
                    {item.quantity && item.quantity > 1 ? `${item.quantity} x ` : ''}
                    {formatCurrency(item.unit_price || 0)}
                  </div>
                  {item.quantity && item.quantity > 1 && (
                    <div className="text-sm text-gray-500">
                      {locale === 'en' ? 'together' : locale === 'zh' ? '一起' : '                       รวม '}{formatCurrency(item.total_price || 0)}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Pricing Breakdown */}
      {showFullDetails && (
        <div className="border-t border-gray-200 pt-4 mb-4 space-y-2">
          {order.base_price && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">{locale === 'en' ? 'Base price:' : locale === 'zh' ? '基价：' : 'ราคาฐาน:'}</span>
              <span>{formatCurrency(order.base_price)}</span>
            </div>
          )}
          {order.calculated_price && order.calculated_price !== order.base_price && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">{locale === 'en' ? 'Price calculated according to area:' : locale === 'zh' ? '按面积计算价格：' : 'ราคาคำนวณตามพื้นที่:'}</span>
              <span>{formatCurrency(order.calculated_price)}</span>
            </div>
          )}
          {order.additional_services_price && order.additional_services_price > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">{locale === 'en' ? 'Additional services:' : locale === 'zh' ? '附加服务：' : 'บริการเสริม:'}</span>
              <span>{formatCurrency(order.additional_services_price)}</span>
            </div>
          )}
        </div>
      )}

      {/* Notes */}
      {(order.notes || order.special_instructions) && (
        <div className="border-t border-gray-200 pt-4 mb-4">
          <h3 className="font-semibold text-gray-800 mb-2">{locale === 'en' ? 'note' : locale === 'zh' ? '笔记' : 'หมายเหตุ'}</h3>
          {order.notes && (
            <p className="text-sm text-gray-600 mb-2">{order.notes}</p>
          )}
          {order.special_instructions && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
              <div className="text-sm text-yellow-800">
                <span className="font-medium">{locale === 'en' ? 'Special instructions:' : locale === 'zh' ? '特别说明：' : 'คำแนะนำพิเศษ:'}</span> {order.special_instructions}
              </div>
            </div>
          )}
        </div>
      )}
      
      {/* Total */}
      <div className="border-t border-gray-200 pt-4">
        <div className="flex justify-between items-center">
          <span className="text-lg font-semibold text-gray-800">{locale === 'en' ? 'Total price:' : locale === 'zh' ? '总价：' : 'ราคารวมทั้งสิ้น:'}</span>
          <span className="text-2xl font-bold text-green-600">{formatCurrency(order.total)}</span>
        </div>
        
        {/* Estimated Duration */}
        {order.services?.estimated_duration && (
          <div className="mt-2 text-sm text-gray-600 text-right">
            {locale === 'en' ? 'Estimated duration:' : locale === 'zh' ? '预计持续时间：' : '             ระยะเวลาโดยประมาณ: '}{order.services.estimated_duration} {
              order.services.estimated_duration_unit === 'hours' ? 'ชั่วโมง' :
              order.services.estimated_duration_unit === 'days' ? 'วัน' :
              order.services.estimated_duration_unit === 'weeks' ? 'สัปดาห์' :
              order.services.estimated_duration_unit === 'months' ? 'เดือน' :
              order.services.estimated_duration_unit
            }
          </div>
        )}

        {/* Created Date */}
        <div className="mt-2 text-xs text-gray-500 text-right">
          {locale === 'en' ? 'Created on:' : locale === 'zh' ? '创建于：' : '           สร้างเมื่อ: '}{formatDate(order.created_at)}
        </div>
      </div>
    </div>
  )
} 
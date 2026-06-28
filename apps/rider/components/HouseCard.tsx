import Link from 'next/link'
import { House } from '../lib/supabaseClient'
import { useI18n } from '../lib/I18nContext'
import { formatDateByLocale } from '@/lib/localeFormat'
import { useI18n } from "@/lib/I18nContext";

interface HouseCardProps {
  house: House
  imageUrl?: string
  href?: string
  showActions?: boolean
}

export default function HouseCard({
  house,
  imageUrl,
  href,
  showActions = true
}: HouseCardProps) {
  const { locale } = useI18n()
  const defaultHref = href || `/dashboard/customer/houses/${house.house_code}`
  
  return (
    <div className="bg-white rounded-lg shadow-lg overflow-hidden hover:shadow-xl transition-shadow duration-300">
      {imageUrl && (
        <div className="h-48 bg-gray-200">
          <img 
            src={imageUrl} 
            alt={house.name}
            className="w-full h-full object-cover"
          />
        </div>
      )}
      
      <div className="p-6">
        <div className="flex justify-between items-start mb-3">
          <h3 className="text-xl font-semibold text-gray-800">{house.name}</h3>
          <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full font-medium">
            {house.house_code}
          </span>
        </div>
        
        <p className="text-gray-600 mb-4">{house.address}</p>
        
        <div className="space-y-2 text-sm text-gray-500">
          {house.area_size && (
            <div className="flex justify-between">
              <span>{locale === 'en' ? 'Area size:' : locale === 'zh' ? '面积大小：' : 'ขนาดพื้นที่:'}</span>
              <span>{house.area_size} {locale === 'en' ? 'sq m.' : locale === 'zh' ? '平方米。' : ' ตร.ม.'}</span>
            </div>
          )}
          {house.house_type && (
            <div className="flex justify-between">
              <span>{locale === 'en' ? 'type:' : locale === 'zh' ? '类型：' : 'ประเภท:'}</span>
              <span>{house.house_type}</span>
            </div>
          )}
          {house.zip_code && (
            <div className="flex justify-between">
              <span>{locale === 'en' ? 'zip code:' : locale === 'zh' ? '邮政编码：' : 'รหัสไปรษณีย์:'}</span>
              <span>{house.zip_code}</span>
            </div>
          )}
          <div className="flex justify-between">
            <span>{locale === 'en' ? 'Added on:' : locale === 'zh' ? '添加于：' : 'เพิ่มเมื่อ:'}</span>
            <span>{formatDateByLocale(house.created_at, locale, { year: 'numeric', month: 'short', day: 'numeric' })}</span>
          </div>
        </div>

        {house.operating_hour_start && house.operating_hour_end && (
          <div className="mt-3 p-3 bg-green-50 rounded-lg">
            <div className="text-sm text-green-800">
              <span className="font-medium">{locale === 'en' ? 'Service time:' : locale === 'zh' ? '服务时间：' : 'เวลาให้บริการ:'}</span>
              <span className="ml-2">{house.operating_hour_start} - {house.operating_hour_end}</span>
            </div>
          </div>
        )}

        {house.parking_available && (
          <div className="mt-3 p-3 bg-blue-50 rounded-lg">
            <div className="text-sm text-blue-800">
              <span className="font-medium">{locale === 'en' ? '🚗 There is parking.' : locale === 'zh' ? '🚗 有停车位。' : '🚗 มีที่จอดรถ'}</span>
              {house.parking_spaces && <span className="ml-2">({house.parking_spaces} {locale === 'en' ? 'vehicle)' : locale === 'zh' ? '车辆）' : ' คัน)'}</span>}
            </div>
          </div>
        )}

        {house.special_notes && (
          <div className="mt-3 p-3 bg-yellow-50 rounded-lg">
            <div className="text-sm text-yellow-800">
              <span className="font-medium">{locale === 'en' ? 'Special Note:' : locale === 'zh' ? '特别提示：' : 'หมายเหตุพิเศษ:'}</span>
              <p className="mt-1">{house.special_notes}</p>
            </div>
          </div>
        )}
        
        {showActions && (
          <div className="mt-6 space-y-2">
            <Link
              href={defaultHref}
              className="w-full inline-block text-center bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              {locale === 'en' ? 'View details' : locale === 'zh' ? '查看详情' : '               ดูรายละเอียด             '}</Link>
            <Link
              href={`/dashboard/customer/services?house_code=${house.house_code}`}
              className="w-full inline-block text-center bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors font-medium"
            >
              {locale === 'en' ? 'Order service' : locale === 'zh' ? '订单服务' : '               สั่งบริการ             '}</Link>
          </div>
        )}
      </div>
    </div>
  )
} 
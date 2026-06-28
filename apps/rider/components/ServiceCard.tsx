import Link from 'next/link'
import { Service, PriceTemplate } from '../lib/supabaseClient'
import { ClockIcon, CurrencyDollarIcon } from '@heroicons/react/24/outline'
import { useI18n } from "@/lib/I18nContext";

interface ServiceCardProps {
  service: Service
  priceTemplates?: PriceTemplate[]
  imageUrl?: string
  href?: string
  showPricing?: boolean
  selectedArea?: number
}

export default function ServiceCard({
  service,
  priceTemplates = [],
  imageUrl,
  href,
  showPricing = true,
  selectedArea = 0
}: ServiceCardProps) {
    const { locale } = useI18n();
  const defaultHref = href || `/dashboard/customer/services/${service.id}`
  
  // Calculate price based on area if templates exist
  const calculatePrice = () => {
    if (!showPricing) return null
    
    if (selectedArea > 0 && priceTemplates.length > 0) {
      const applicableTemplate = priceTemplates.find(template => 
        selectedArea >= (template.area_min || 0) && selectedArea <= (template.area_max || 9999)
      )
      
      if (applicableTemplate) {
        const calculatedPrice = (applicableTemplate.base_price || 0) + (selectedArea * (applicableTemplate.price_per_unit || 0))
        return calculatedPrice
      }
    }
    
    return service.base_price || service.price || 0
  }

  const displayPrice = calculatePrice()
  const isAreaBased = priceTemplates.length > 0

  return (
    <div className="bg-white rounded-lg shadow-lg overflow-hidden hover:shadow-xl transition-shadow duration-300">
      {imageUrl && (
        <div className="h-48 bg-gray-200">
          <img 
            src={imageUrl} 
            alt={service.service_name}
            className="w-full h-full object-cover"
          />
        </div>
      )}
      
      <div className="p-6">
        <div className="flex justify-between items-start mb-3">
          {service.category && (
            <span className="inline-block px-3 py-1 text-xs font-semibold text-green-800 bg-green-100 rounded-full">
              {service.category}
            </span>
          )}
          {service.service_code && (
            <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded font-mono">
              {service.service_code}
            </span>
          )}
        </div>
        
        <h3 className="text-xl font-semibold text-gray-800 mb-2">{service.service_name}</h3>
        
        {service.description && (
          <p className="text-gray-600 mb-4 line-clamp-3">{service.description}</p>
        )}

        {/* Duration Information */}
        {service.has_estimated_duration && service.estimated_duration && (
          <div className="flex items-center gap-2 mb-3 text-sm text-gray-600">
            <ClockIcon className="w-4 h-4" />
            <span>
              {locale === 'en' ? 'period:' : locale === 'zh' ? '时期：' : '               ระยะเวลา: '}{service.estimated_duration} {
                service.estimated_duration_unit === 'hours' ? 'ชั่วโมง' :
                service.estimated_duration_unit === 'days' ? 'วัน' :
                service.estimated_duration_unit === 'weeks' ? 'สัปดาห์' :
                service.estimated_duration_unit === 'months' ? 'เดือน' :
                service.estimated_duration_unit
              }
            </span>
          </div>
        )}

        {/* Billing Type */}
        {service.billing_type && (
          <div className="mb-3">
            <span className={`inline-block px-2 py-1 text-xs font-medium rounded ${
              service.billing_type === 'one-time' ? 'bg-blue-100 text-blue-800' :
              service.billing_type === 'recurring' ? 'bg-purple-100 text-purple-800' :
              'bg-orange-100 text-orange-800'
            }`}>
              {service.billing_type === 'one-time' ? 'ครั้งเดียว' :
               service.billing_type === 'recurring' ? 'ต่อเนื่อง' :
               'ทั้งสองแบบ'}
            </span>
          </div>
        )}

        {/* Pricing Information */}
        {showPricing && (
          <div className="mb-4">
            {isAreaBased && selectedArea > 0 ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">{locale === 'en' ? 'area:' : locale === 'zh' ? '区域：' : 'พื้นที่: '}{selectedArea} {locale === 'en' ? 'sq m.' : locale === 'zh' ? '平方米。' : ' ตร.ม.'}</span>
                  <div className="text-2xl font-bold text-green-600">
                    {locale === 'en' ? '                     ฿' : locale === 'zh' ? '                     ฿' : '                     ฿'}{displayPrice?.toLocaleString()}
                  </div>
                </div>
                <div className="text-xs text-gray-500">
                  {locale === 'en' ? '*Price estimates according to area' : locale === 'zh' ? '*根据地区估算价格' : '                   *ราคาประมาณการตามพื้นที่                 '}</div>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1 text-sm text-gray-600">
                  <CurrencyDollarIcon className="w-4 h-4" />
                  <span>{isAreaBased ? 'ตั้งแต่' : 'ราคา'}</span>
                </div>
                <div className="text-2xl font-bold text-green-600">
                  {locale === 'en' ? '                   ฿' : locale === 'zh' ? '                   ฿' : '                   ฿'}{displayPrice?.toLocaleString()}
                  {isAreaBased && <span className="text-sm text-gray-500"> {locale === 'en' ? 'up' : locale === 'zh' ? '向上' : ' ขึ้นไป'}</span>}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Price Templates Summary */}
        {isAreaBased && showPricing && (
          <div className="mb-4 p-3 bg-gray-50 rounded-lg">
            <div className="text-xs font-medium text-gray-700 mb-2">{locale === 'en' ? 'Price according to area:' : locale === 'zh' ? '按面积价格：' : 'ราคาตามพื้นที่:'}</div>
            <div className="space-y-1">
              {priceTemplates.slice(0, 3).map((template, index) => (
                <div key={template.id} className="flex justify-between text-xs text-gray-600">
                  <span>{template.area_min}-{template.area_max} {locale === 'en' ? 'sq m.' : locale === 'zh' ? '平方米。' : ' ตร.ม.'}</span>
                  <span>{locale === 'en' ? '฿' : locale === 'zh' ? '฿' : '฿'}{template.base_price?.toLocaleString()} {locale === 'en' ? ' + ฿' : locale === 'zh' ? ' + ฿' : ' + ฿'}{template.price_per_unit}{locale === 'en' ? '/sq m.' : locale === 'zh' ? '/平方米。' : '/ตร.ม.'}</span>
                </div>
              ))}
              {priceTemplates.length > 3 && (
                <div className="text-xs text-gray-500 text-center">
                  {locale === 'en' ? 'and another' : locale === 'zh' ? '和另一个' : '                   และอีก '}{priceTemplates.length - 3} {locale === 'en' ? 'Package' : locale === 'zh' ? '包裹' : ' แพ็กเกจ                 '}</div>
              )}
            </div>
          </div>
        )}
        
        <div className="flex gap-2">
          <Link
            href={defaultHref}
            className="flex-1 text-center bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors font-medium"
          >
            {locale === 'en' ? 'View details' : locale === 'zh' ? '查看详情' : '             ดูรายละเอียด           '}</Link>
          <Link
            href={`${defaultHref}?action=order`}
            className="flex-1 text-center bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            {locale === 'en' ? 'Order service' : locale === 'zh' ? '订单服务' : '             สั่งบริการ           '}</Link>
        </div>
      </div>
    </div>
  )
} 
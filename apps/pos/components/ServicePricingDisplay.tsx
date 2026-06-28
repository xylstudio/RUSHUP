'use client'

import { useState, useEffect } from 'react'
import { Service, PriceTemplate, calculateServicePrice } from '../lib/supabaseClient'
import { CurrencyDollarIcon, CalculatorIcon } from '@heroicons/react/24/outline'
import { useI18n, type Locale } from '../lib/I18nContext'
import { formatCurrencyByLocale, formatNumberByLocale } from '../lib/localeFormat'

interface ServicePricingDisplayProps {
  service: Service
  priceTemplates: PriceTemplate[]
  defaultArea?: number
  onPriceCalculated?: (price: number, template: PriceTemplate | null) => void
}

const copyByLocale: Record<Locale, Record<string, string>> = {
  th: {
    servicePrice: 'ราคาบริการ',
    perVisit: 'ต่อครั้ง',
    flatRate: 'ราคาเหมาจ่าย',
    estimatedDuration: 'ระยะเวลาโดยประมาณ:',
    calculatePrice: 'คำนวณราคา',
    areaSize: 'ขนาดพื้นที่ (ตารางเมตร)',
    enterArea: 'กรุณาใส่ขนาดพื้นที่',
    sqmShort: 'ตร.ม.',
    pricePackages: 'แพ็กเกจราคา',
    calculating: 'กำลังคำนวณ...',
    forArea: 'สำหรับพื้นที่',
    squareMeters: 'ตารางเมตร',
    usingPackage: 'ใช้แพ็กเกจ:',
    basePrice: 'ราคาฐาน:',
    pricePerSqm: 'ราคาต่อตร.ม.:',
    hour: 'ชั่วโมง',
    day: 'วัน',
    week: 'สัปดาห์',
    month: 'เดือน',
  },
  en: {
    servicePrice: 'Service Pricing',
    perVisit: 'per visit',
    flatRate: 'flat rate',
    estimatedDuration: 'Estimated duration:',
    calculatePrice: 'Price Calculator',
    areaSize: 'Area size (sq m)',
    enterArea: 'Enter area size',
    sqmShort: 'sq m',
    pricePackages: 'Price Packages',
    calculating: 'Calculating...',
    forArea: 'For an area of',
    squareMeters: 'square meters',
    usingPackage: 'Using package:',
    basePrice: 'Base price:',
    pricePerSqm: 'Price per sq m:',
    hour: 'hours',
    day: 'days',
    week: 'weeks',
    month: 'months',
  },
  zh: {
    servicePrice: '服务价格',
    perVisit: '每次',
    flatRate: '固定价格',
    estimatedDuration: '预计时长：',
    calculatePrice: '价格计算',
    areaSize: '面积（平方米）',
    enterArea: '请输入面积',
    sqmShort: '平方米',
    pricePackages: '价格套餐',
    calculating: '正在计算...',
    forArea: '适用面积',
    squareMeters: '平方米',
    usingPackage: '使用套餐：',
    basePrice: '基础价格：',
    pricePerSqm: '每平方米价格：',
    hour: '小时',
    day: '天',
    week: '周',
    month: '个月',
  },
}

export default function ServicePricingDisplay({
  service,
  priceTemplates,
  defaultArea = 0,
  onPriceCalculated
}: ServicePricingDisplayProps) {
  const { locale } = useI18n()
  const copy = copyByLocale[locale]
  const [selectedArea, setSelectedArea] = useState(defaultArea)
  const [calculatedData, setCalculatedData] = useState<{
    base_price: number
    calculated_price: number
    template_used: PriceTemplate | null
  } | null>(null)
  const [loading, setLoading] = useState(false)

  const hasAreaBasedPricing = priceTemplates.length > 0

  useEffect(() => {
    const calculatePrice = async () => {
      if (!hasAreaBasedPricing || selectedArea <= 0) {
        const basePrice = service.base_price || service.price || 0
        setCalculatedData({
          base_price: basePrice,
          calculated_price: basePrice,
          template_used: null
        })
        onPriceCalculated?.(basePrice, null)
        return
      }

      setLoading(true)
      try {
        const { data, error } = await calculateServicePrice(service.id, selectedArea)
        if (!error && data) {
          setCalculatedData(data)
          onPriceCalculated?.(data.calculated_price, data.template_used)
        }
      } catch (error) {
        console.error('Error calculating price:', error)
      } finally {
        setLoading(false)
      }
    }

    calculatePrice()
  }, [service.id, selectedArea, hasAreaBasedPricing, onPriceCalculated])

  const handleAreaChange = (area: number) => {
    setSelectedArea(area)
  }

  const durationUnitLabel =
    service.estimated_duration_unit === 'hours' ? copy.hour :
    service.estimated_duration_unit === 'days' ? copy.day :
    service.estimated_duration_unit === 'weeks' ? copy.week :
    service.estimated_duration_unit === 'months' ? copy.month :
    service.estimated_duration_unit

  if (!hasAreaBasedPricing) {
    // Simple pricing display for non-area-based services
    return (
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="flex items-center gap-2 mb-4">
          <CurrencyDollarIcon className="w-5 h-5 text-green-600" />
          <h3 className="text-lg font-semibold text-gray-900">{copy.servicePrice}</h3>
        </div>
        
        <div className="text-center">
          <div className="text-3xl font-bold text-green-600 mb-2">
            {formatCurrencyByLocale(service.base_price || service.price || 0, locale)}
          </div>
          <div className="text-sm text-gray-500">
            {service.billing_type === 'recurring' ? copy.perVisit : copy.flatRate}
          </div>
        </div>

        {service.has_estimated_duration && service.estimated_duration && (
          <div className="mt-4 p-3 bg-blue-50 rounded-lg">
            <div className="text-sm text-blue-800">
              <span className="font-medium">{copy.estimatedDuration}</span>
              <span className="ml-2">
                {formatNumberByLocale(service.estimated_duration, locale)} {durationUnitLabel}
              </span>
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <div className="flex items-center gap-2 mb-4">
        <CalculatorIcon className="w-5 h-5 text-green-600" />
        <h3 className="text-lg font-semibold text-gray-900">{copy.calculatePrice}</h3>
      </div>

      {/* Area Input */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {copy.areaSize}
        </label>
        <div className="relative">
          <input
            type="number"
            min="1"
            value={selectedArea || ''}
            onChange={(e) => handleAreaChange(Number(e.target.value))}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-lg"
            placeholder={copy.enterArea}
          />
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500">
            {copy.sqmShort}
          </div>
        </div>
      </div>

      {/* Quick Area Buttons */}
      <div className="grid grid-cols-3 gap-2 mb-6">
        {[50, 100, 200].map((area) => (
          <button
            key={area}
            onClick={() => handleAreaChange(area)}
            className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              selectedArea === area
                ? 'bg-green-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {formatNumberByLocale(area, locale)} {copy.sqmShort}
          </button>
        ))}
      </div>

      {/* Price Templates Display */}
      <div className="mb-6">
        <h4 className="text-sm font-medium text-gray-700 mb-3">{copy.pricePackages}</h4>
        <div className="space-y-2">
          {priceTemplates.map((template) => (
            <div
              key={template.id}
              className={`p-3 border rounded-lg transition-colors ${
                calculatedData?.template_used?.id === template.id
                  ? 'border-green-500 bg-green-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="flex justify-between items-center">
                <div>
                  <div className="font-medium text-gray-900">{template.template_name}</div>
                  <div className="text-sm text-gray-600">
                    {formatNumberByLocale(template.area_min, locale)}-{formatNumberByLocale(template.area_max, locale)} {copy.sqmShort}
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-semibold text-gray-900">
                    {formatCurrencyByLocale(template.base_price, locale)}
                  </div>
                  <div className="text-sm text-gray-600">
                    + {formatCurrencyByLocale(template.price_per_unit, locale)}/{copy.sqmShort}
                  </div>
                </div>
              </div>
              {template.description && (
                <div className="mt-2 text-sm text-gray-500">{template.description}</div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Calculated Price Display */}
      {selectedArea > 0 && (
        <div className="border-t pt-6">
          <div className="text-center">
            {loading ? (
              <div className="flex items-center justify-center">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-green-600"></div>
                <span className="ml-2 text-gray-600">{copy.calculating}</span>
              </div>
            ) : calculatedData ? (
              <div>
                <div className="text-3xl font-bold text-green-600 mb-2">
                  {formatCurrencyByLocale(calculatedData.calculated_price, locale)}
                </div>
                <div className="text-sm text-gray-500 mb-4">
                  {copy.forArea} {formatNumberByLocale(selectedArea, locale)} {copy.squareMeters}
                </div>
                
                {calculatedData.template_used && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <div className="text-sm text-green-800">
                      <div className="font-medium mb-1">{copy.usingPackage} {calculatedData.template_used.template_name}</div>
                      <div className="grid grid-cols-2 gap-4 text-xs">
                        <div>{copy.basePrice} {formatCurrencyByLocale(calculatedData.base_price, locale)}</div>
                        <div>{copy.pricePerSqm} {formatCurrencyByLocale(calculatedData.template_used.price_per_unit, locale)}</div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-gray-500">{copy.enterArea}</div>
            )}
          </div>
        </div>
      )}

      {/* Duration Information */}
      {service.has_estimated_duration && service.estimated_duration && (
        <div className="mt-4 p-3 bg-blue-50 rounded-lg">
          <div className="text-sm text-blue-800">
            <span className="font-medium">{copy.estimatedDuration}</span>
            <span className="ml-2">
              {formatNumberByLocale(service.estimated_duration, locale)} {durationUnitLabel}
            </span>
          </div>
        </div>
      )}
    </div>
  )
}
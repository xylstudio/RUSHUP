'use client';
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import { ChevronLeft, Droplets, Leaf, Sun } from 'lucide-react'
import { supabase } from '@/lib/supabaseClient'
import { useAuth } from '@/lib/AuthContext'
import { useI18n } from "@/lib/I18nContext";

type PlantDetail = {
  id: string
  name: string
  common_name?: string
  scientific_name?: string
  description?: string
  category: string
  size_label?: string
  sunlight_requirement?: string
  watering_requirement?: string
  soil_requirement?: string
  care_tips?: string
  pet_friendly?: boolean
  feature_tags?: string[]
  price: number
  stock_quantity: number
  image_url?: string
  is_active: boolean
}

const careGuideByCategory: Record<string, { sunlight: string; water: string; soil: string; tip: string }> = {
  PALMS: {
    sunlight: 'แดดจัดถึงครึ่งวัน',
    water: 'รดน้ำ 3-4 ครั้ง/สัปดาห์',
    soil: 'ดินโปร่ง ระบายน้ำดี',
    tip: 'หลีกเลี่ยงน้ำขังโคนต้น และตัดใบแห้งสม่ำเสมอ',
  },
  TREES: {
    sunlight: 'แดดจัดอย่างน้อย 6 ชั่วโมง/วัน',
    water: 'รดน้ำลึก 2-3 ครั้ง/สัปดาห์',
    soil: 'ดินร่วนผสมอินทรียวัตถุ',
    tip: 'พรวนดินและเติมปุ๋ยคอกบาง ๆ ทุก 1-2 เดือน',
  },
  SHRUBS: {
    sunlight: 'แดดครึ่งวันถึงแดดจัด',
    water: 'รดน้ำวันเว้นวัน (ปรับตามสภาพอากาศ)',
    soil: 'ดินร่วนชุ่มชื้นพอดี',
    tip: 'ตัดแต่งทรงพุ่มหลังแตกยอดใหม่เพื่อทรงพุ่มแน่น',
  },
  ALL: {
    sunlight: 'แสงสว่างเพียงพอและอากาศถ่ายเท',
    water: 'ตรวจความชื้นก่อนรดน้ำทุกครั้ง',
    soil: 'ดินระบายน้ำดี ไม่แฉะ',
    tip: 'สังเกตใบเหลือง/เหี่ยวเพื่อปรับน้ำและแสงให้เหมาะสม',
  },
}

export default function CustomerMarketplaceDetailPage() {
    const { locale } = useI18n();
  const params = useParams<{ plantId: string }>()
  const { user } = useAuth()
  const [plant, setPlant] = useState<PlantDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [notice, setNotice] = useState('')
  const [adding, setAdding] = useState(false)

  useEffect(() => {
    const load = async () => {
      if (!params?.plantId) {
        setLoading(false)
        return
      }

      setLoading(true)
      const { data, error } = await supabase
        .from('marketplace_plants')
        .select('id, name, common_name, scientific_name, description, category, size_label, sunlight_requirement, watering_requirement, soil_requirement, care_tips, pet_friendly, feature_tags, price, stock_quantity, image_url, is_active')
        .eq('id', params.plantId)
        .single()

      if (!error && data) {
        setPlant(data as PlantDetail)
      }

      setLoading(false)
    }

    void load()
  }, [params?.plantId])

  const addToCart = async () => {
    if (!plant || !user?.id) {
      setNotice('กรุณาเข้าสู่ระบบก่อนเพิ่มสินค้า')
      return
    }

    if (plant.stock_quantity <= 0) {
      setNotice('สินค้านี้หมดชั่วคราว')
      return
    }

    setAdding(true)
    setNotice('')

    const { data: existing, error: existingError } = await supabase
      .from('marketplace_cart_items')
      .select('id, quantity')
      .eq('customer_id', user.id)
      .eq('plant_id', plant.id)
      .maybeSingle()

    if (existingError) {
      setNotice('เพิ่มสินค้าลงตะกร้าไม่สำเร็จ')
      setAdding(false)
      return
    }

    if (existing) {
      const { error: updateError } = await supabase
        .from('marketplace_cart_items')
        .update({ quantity: Number(existing.quantity || 0) + 1 })
        .eq('id', existing.id)

      if (updateError) {
        setNotice('เพิ่มสินค้าลงตะกร้าไม่สำเร็จ')
        setAdding(false)
        return
      }
    } else {
      const { error: insertError } = await supabase.from('marketplace_cart_items').insert({
        customer_id: user.id,
        plant_id: plant.id,
        quantity: 1,
      })

      if (insertError) {
        setNotice('เพิ่มสินค้าลงตะกร้าไม่สำเร็จ')
        setAdding(false)
        return
      }
    }

    window.dispatchEvent(new CustomEvent('marketplaceCartUpdated'))
    setNotice('เพิ่มสินค้าลงตะกร้าแล้ว')
    setAdding(false)
  }

  if (loading) {
    return <div className="customer-editorial-page"><div className="customer-editorial-container"><div className="customer-editorial-body">{locale === 'en' ? 'Loading product details...' : locale === 'zh' ? '正在加载产品详细信息...' : 'กำลังโหลดรายละเอียดสินค้า...'}</div></div></div>
  }

  if (!plant) {
    return (
      <div className="customer-editorial-page">
        <div className="customer-editorial-container">
          <div className="customer-editorial-toolbar">
            <Link href="/dashboard/customer/marketplace" aria-label={locale === 'en' ? 'go back' : locale === 'zh' ? '回去' : 'กลับ'} className="customer-editorial-icon-button">
              <ChevronLeft className="h-4 w-4" />
            </Link>
          </div>
          <div className="customer-editorial-empty mt-8">
            <p className="customer-editorial-empty-title">{locale === 'en' ? 'Product information not found' : locale === 'zh' ? '未找到产品信息' : 'ไม่พบข้อมูลสินค้า'}</p>
          </div>
        </div>
      </div>
    )
  }

  const careGuide = careGuideByCategory[plant.category] || careGuideByCategory.ALL

  return (
    <div className="customer-editorial-page">
      <div className="customer-editorial-container">
        <div className="customer-editorial-header">
          <div className="customer-editorial-toolbar">
            <Link href="/dashboard/customer/marketplace" aria-label={locale === 'en' ? 'go back' : locale === 'zh' ? '回去' : 'กลับ'} className="customer-editorial-icon-button">
              <ChevronLeft className="h-4 w-4" />
            </Link>
            <div>
              <p className="customer-editorial-kicker">Plant Library</p>
              <h1 className="customer-editorial-title">{plant.name}</h1>
              <p className="customer-editorial-subtitle">{locale === 'en' ? 'Choose a plant from the curated collection. Complete with care instructions and planting details in the same design language as the customer portal.' : locale === 'zh' ? '从精选的植物收藏中选择一种植物。包含护理说明和种植详细信息，采用与客户门户相同的设计语言。' : 'เลือกต้นไม้จากคอลเลกชันที่คัดมาแล้ว พร้อมคำแนะนำการดูแลและรายละเอียดการปลูกในภาษาดีไซน์เดียวกับ customer portal'}</p>
            </div>
          </div>
        </div>

        <div className="customer-editorial-grid two">
          <div className="customer-editorial-card overflow-hidden">
            <div className="aspect-[4/3] bg-[#F3F3EF]">
          <img
            src={plant.image_url || 'https://images.unsplash.com/photo-1463320726281-696a485928c7?q=80&w=600&auto=format&fit=crop'}
            alt={plant.name}
            className="h-full w-full object-cover"
          />
            </div>
            <div className="space-y-3 pt-5">
              <p className="customer-editorial-kicker">{plant.category}</p>
              <p className="customer-editorial-body">{plant.common_name || '-'}</p>
              <p className="customer-editorial-body italic">{plant.scientific_name || '-'}</p>
              <p className="customer-editorial-body">{locale === 'en' ? 'size:' : locale === 'zh' ? '尺寸：' : 'ขนาด: '}{plant.size_label || '-'}</p>
              {plant.description ? <p className="customer-editorial-body">{plant.description}</p> : null}
              <div className="customer-editorial-panel">
                <p className="customer-editorial-meta">Price</p>
                <p className="customer-editorial-stat-value text-[#1D2D24]">{locale === 'en' ? '฿' : locale === 'zh' ? '฿' : '฿'}{Number(plant.price || 0).toLocaleString()}</p>
                <p className="mt-2 text-xs font-semibold text-[#6E685E]">{locale === 'en' ? 'stock' : locale === 'zh' ? '库存' : 'สต็อก '}{plant.stock_quantity}</p>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="customer-editorial-panel">
              <p className="customer-editorial-kicker">Care Guide</p>
              <h2 className="customer-editorial-card-title mt-3">{locale === 'en' ? 'Care details' : locale === 'zh' ? '护理细节' : 'รายละเอียดการดูแล'}</h2>
              <div className="customer-editorial-grid three mt-6">
                <div className="customer-editorial-card">
                  <div className="mb-2 inline-flex items-center gap-1 text-xs font-semibold text-[#4C4C46]">
              <Sun className="h-3.5 w-3.5" /> {locale === 'en' ? 'sunshine' : locale === 'zh' ? '阳光' : ' แดด                   '}</div>
                  <p className="customer-editorial-body text-xs">{plant.sunlight_requirement || careGuide.sunlight}</p>
                </div>
                <div className="customer-editorial-card">
                  <div className="mb-2 inline-flex items-center gap-1 text-xs font-semibold text-[#4C4C46]">
              <Droplets className="h-3.5 w-3.5" /> {locale === 'en' ? 'water' : locale === 'zh' ? '水' : ' น้ำ                   '}</div>
                  <p className="customer-editorial-body text-xs">{plant.watering_requirement || careGuide.water}</p>
                </div>
                <div className="customer-editorial-card">
                  <div className="mb-2 inline-flex items-center gap-1 text-xs font-semibold text-[#4C4C46]">
              <Leaf className="h-3.5 w-3.5" /> {locale === 'en' ? 'earth' : locale === 'zh' ? '地球' : ' ดิน                   '}</div>
                  <p className="customer-editorial-body text-xs">{plant.soil_requirement || careGuide.soil}</p>
                </div>
              </div>
              <div className="customer-editorial-card mt-4">
                <p className="customer-editorial-body text-xs">{locale === 'en' ? 'Tips:' : locale === 'zh' ? '尖端：' : 'เคล็ดลับ: '}{plant.care_tips || careGuide.tip}</p>
              </div>
              {plant.pet_friendly !== undefined ? (
                <p className="customer-editorial-body mt-4 text-xs">{plant.pet_friendly ? 'เหมาะกับบ้านที่มีสัตว์เลี้ยง' : 'ควรตรวจสอบความปลอดภัยหากมีสัตว์เลี้ยง'}</p>
              ) : null}
              {Array.isArray(plant.feature_tags) && plant.feature_tags.length > 0 ? (
                <div className="mt-4 flex flex-wrap gap-2">
                  {plant.feature_tags.map((tag) => (
                    <span key={tag} className="customer-editorial-badge">
                      {tag}
                    </span>
                  ))}
                </div>
              ) : null}
            </div>

            {notice ? <div className="customer-editorial-panel text-sm text-[#2A4532]">{notice}</div> : null}

            <div className="customer-editorial-button-row">
              <button onClick={addToCart} disabled={adding || plant.stock_quantity <= 0} className="customer-editorial-button-primary flex-1">
                {adding ? 'กำลังเพิ่ม...' : plant.stock_quantity <= 0 ? 'สินค้าหมด' : 'เพิ่มลงตะกร้า'}
              </button>
              <Link href="/dashboard/customer/marketplace/checkout" className="customer-editorial-button-secondary">
                {locale === 'en' ? 'go pay' : locale === 'zh' ? '去付钱' : '                 ไปชำระเงิน               '}</Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

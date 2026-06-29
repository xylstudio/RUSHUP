'use client';
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/AuthContext'
import { useI18n } from '@/lib/I18nContext'
import { getPosMenuItems, getBranches, getOrdersWithDetails, supabase } from '@/lib/supabaseClient'
import XYLLoader from '@/components/loaders/XYLLoader'
import TripnectApp from '../../../components/tripnect/App'

export default function CustomerDashboard() {
  const { user, profile, loading: authLoading } = useAuth()
  const router = useRouter()
  const { copy } = useI18n()

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  const [services, setServices] = useState<any[]>([])
  const [branches, setBranches] = useState<any[]>([])
  const [orders, setOrders] = useState<any[]>([])

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace('/login')
      return
    }

    if (user) {
      fetchDashboardData()
    }
  }, [user, authLoading, router])

  const fetchDashboardData = async () => {
    try {
      setLoading(true)
      
      const [
        servicesRes,
        branchesRes,
        ordersRes,
      ] = await Promise.all([
        getPosMenuItems(),
        getBranches(),
        getOrdersWithDetails(),
      ])

      if (servicesRes.data) setServices(servicesRes.data)
      if (branchesRes.data) setBranches(branchesRes.data)
      if (ordersRes) setOrders(ordersRes)

    } catch (err: any) {
      console.error('Error fetching customer data:', err)
      setError(err.message || 'Failed to load data')
    } finally {
      setLoading(false)
    }
  }

  if (authLoading || loading) return <XYLLoader tagline={copy?.loading || 'Loading...'} />

  if (error) {
    return (
      <div className="fixed inset-0 z-[500] bg-white flex items-center justify-center p-10 text-center">
        <div className="max-w-md space-y-6">
          <div className="text-amber-600 text-5xl flex justify-center">⚠</div>
          <h2 className="text-2xl font-serif-thai text-[#111111]">Service Interruption</h2>
          <p className="text-sm text-[#666666] leading-relaxed">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-8 py-3 bg-[#111111] text-white text-[10px] font-bold uppercase tracking-widest rounded-full"
          >
            Retry Connection
          </button>
        </div>
      </div>
    )
  }

  return (
    <TripnectApp services={services} branches={branches} orders={orders} profile={profile} />
  )
}

import { createClient } from '@supabase/supabase-js'
import {
  type DocumentCatalogMainCategory,
  type DocumentCatalogSubcategory,
  getDocumentCategoryDefaults,
} from './documentItemCatalog'

// ============================================================================
// COMPLETE TYPESCRIPT INTERFACES - 100% MATCHING SCHEMA
// ============================================================================

// Enum Types (matching SQL schema exactly)
export type UserRole = 'customer' | 'staff' | 'admin';
export type HouseTypeEnum = 'บ้านเดี่ยว' | 'คาเฟ่/ร้านอาหาร' | 'โรงแรม/รีสอร์ท' | 'โครงการหมู่บ้าน/คอนโด';
export type OrderStatus = 'pending' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled';
export type MeasurementStatus = 'pending' | 'assigned' | 'in_progress' | 'completed' | 'cancelled';
export type JobAssignmentStatus = 'assigned' | 'accepted' | 'in_progress' | 'completed' | 'declined';
export type DocumentType = 'contract' | 'invoice' | 'receipt' | 'report' | 'photo' | 'quotation' | 'plant_material' | 'other';
export type PriorityLevel = 'low' | 'normal' | 'high' | 'urgent';
export type BillingType = 'one-time' | 'recurring' | 'both';
export type PricingPeriod = 'one-time' | 'monthly' | 'yearly';
export type DurationUnit = 'hours' | 'days' | 'weeks' | 'months';

export type HouseCollaboratorRole = 'manager' | 'editor' | 'viewer';

// Core Table Interfaces
export interface Profile {
  id: string;
  email: string;
  role: UserRole;
  display_name?: string;
  phone?: string;
  loyalty_points?: number;
  timezone: string;
  customer_base_code?: string;
  staff_code?: string;
  address?: string;
  zip_code?: string;
  branch_code?: string;
  department?: string;
  salary_type?: 'fixed' | 'daily' | 'hourly';
  fixed_salary?: number;
  daily_rate?: number;
  hourly_rate?: number;
  is_verified?: boolean;
  staff_type?: 'cafe' | 'garden';
  staff_level?: 'staff' | 'manager' | 'admin';
  is_active?: boolean;
  is_pos_account?: boolean;
  created_at: string;
  updated_at: string;
}

export interface Branch {
  id: string;
  branch_code: string;
  branch_name: string;
  name: string;
  code: string;
  address: string;
  phone?: string;
  email?: string;
  service_zip_codes: string[];
  branch_type?: 'garden' | 'cafe' | 'both';
  latitude?: number;
  longitude?: number;
  created_at: string;
  updated_at: string;
}

export interface PosShopSettings {
  id: string;
  branch_id?: string;
  is_open: boolean;
  opening_hours: any;
  status_message?: string;
  status: string;
  status_expiry?: string;
  check_in_radius: number;
  delivery_fee_rules: any[];
  delivery_gp?: any;
  updated_at: string;
}

export interface House {
  id: string;
  house_code: string;
  user_id: string;
  customer_id?: string;
  name: string;
  address: string;
  image_url?: string | null;
  latitude?: number;
  longitude?: number;
  zip_code?: string;
  branch_code?: string;
  house_type?: string;
  area_size?: number;
  phone_number?: string;
  contact_person?: string;
  service_days?: string[];
  key_location?: string;
  special_notes?: string;
  operating_hour_start?: string;
  operating_hour_end?: string;
  parking_available?: boolean;
  parking_spaces?: number;
  created_at: string;
  updated_at: string;
}

export interface Service {
  id: string;
  service_name: string;
  name?: string;
  service_code?: string;
  description?: string;
  category?: string;
  base_price?: number;
  price?: number;
  has_estimated_duration?: boolean;
  estimated_duration?: number;
  estimated_duration_unit?: DurationUnit;
  billing_type?: BillingType;
  is_active?: boolean;
  created_at: string;
  updated_at: string;
}

export interface PriceTemplate {
  id: string;
  service_id: string;
  template_name: string;
  area_min?: number;
  area_max?: number;
  price_per_unit?: number;
  base_price?: number;
  pricing_period?: PricingPeriod;
  description?: string;
  is_active?: boolean;
  created_at: string;
  updated_at: string;
}

export interface PosMenuItem {
  id: string;
  name: string;
  category_id?: string;
  description?: string;
  sale_price: number;
  cost_price?: number;
  image_url?: string;
  is_active?: boolean;
  branch_id?: string;
  in_stock?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface Order {
  id: string;
  customer_id: string;
  service_id?: string;
  house_id?: string;
  house_code?: string;
  price_template_id?: string;
  order_code?: string;
  status: OrderStatus;
  service_area?: number;
  base_price?: number;
  calculated_price?: number;
  additional_services_price?: number;
  total: number;
  total_price?: number;
  pricing_period?: PricingPeriod;
  scheduled_date?: string;
  preferred_time_start?: string;
  preferred_time_end?: string;
  priority?: PriorityLevel;
  notes?: string;
  special_instructions?: string;
  sessions_per_period?: number;
  total_sessions?: number;
  completed_sessions?: number;
  created_at: string;
  updated_at: string;
  completed_at?: string;
}

export interface JobAssignment {
  id: string;
  order_id: string;
  staff_id: string;
  status?: JobAssignmentStatus;
  notes?: string;
  scheduled_date?: string;
  assigned_at: string;
  accepted_at?: string;
  started_at?: string;
  completed_at?: string;
  created_at: string;
  updated_at: string;
}

export interface MeasurementRequest {
  id: string;
  house_code: string;
  customer_id: string;
  request_type?: string;
  status?: MeasurementStatus;
  priority_level?: PriorityLevel;
  assigned_staff_id?: string;
  preferred_date?: string;
  preferred_time_start?: string;
  preferred_time_end?: string;
  special_instructions?: string;
  measurement_notes?: string;
  measured_area_sqm?: number;
  measurement_photos?: string[];
  branch_code?: string;
  created_at: string;
  updated_at: string;
  assigned_at?: string;
  completed_at?: string;
}

export interface Document {
  id: string;
  user_id: string;
  order_id?: string;
  type: DocumentType;
  document_code?: string;
  file_url?: string | null;
  file_name?: string;
  file_size?: number;
  description?: string | null;
  status?: string | null;
  created_at: string;
  updated_at: string;
  generated_at?: string | null;
}

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type?: string;
  read?: boolean;
  related_order_id?: string;
  related_measurement_id?: string;
  created_at: string;
  read_at?: string;
}

export interface HouseCollaborator {
  id: string;
  house_id: string;
  user_id: string;
  role: HouseCollaboratorRole;
  receive_notifications?: boolean;
  profiles?: {
    display_name: string;
    email: string;
  };
  created_at: string;
  updated_at: string;
}

export interface AuditLog {
  id: number;
  user_id?: string;
  user_email?: string;
  action: string;
  details?: any;
  ip_address?: string;
  user_agent?: string;
  created_at: string;
}

export interface AdditionalService {
  id: string;
  service_name: string;
  description?: string;
  price?: number;
  category?: string;
  is_active?: boolean;
  created_at: string;
}

export interface OrderAdditionalService {
  id: string;
  order_id: string;
  additional_service_id: string;
  quantity?: number;
  unit_price?: number;
  total_price?: number;
  created_at: string;
}

export interface Job {
  id: string;
  order_id?: string;
  staff_id?: string;
  status?: string;
  created_at: string;
  completed_at?: string;
}

export type MarketplacePlantCategory = 'PALMS' | 'TREES' | 'SHRUBS' | 'ALL';
export type PlantItemCategory = 'tree' | 'palm' | 'shrub' | 'material' | 'other';

export type MarketplacePlantMaintenanceLevel = 'low' | 'medium' | 'high';
export type MarketplacePlantGrowthRate = 'slow' | 'moderate' | 'fast';

export interface MarketplacePlant {
  id: string;
  sku?: string;
  name: string;
  common_name?: string;
  scientific_name?: string;
  plant_family?: string;
  category: MarketplacePlantCategory;
  description?: string;
  size_label?: string;
  height_cm?: number;
  canopy_width_cm?: number;
  trunk_diameter_inch?: number;
  tree_height_label?: string;
  shrub_spacing_cm?: number;
  sunlight_requirement?: string;
  watering_requirement?: string;
  soil_requirement?: string;
  maintenance_level?: MarketplacePlantMaintenanceLevel;
  growth_rate?: MarketplacePlantGrowthRate;
  pet_friendly?: boolean;
  care_tips?: string;
  notes?: string;
  feature_tags?: string[];
  price: number;
  stock_quantity: number;
  image_url?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface PlantLibraryVariant {
  id: string;
  plant_entry_id: string;
  item_name: string;
  english_name?: string;
  scientific_name?: string;
  plant_family?: string;
  category: MarketplacePlantCategory;
  description?: string;
  item_category: PlantItemCategory;
  size_label?: string;
  size_mode: 'tree' | 'shrub' | 'other';
  unit: string;
  height_cm?: number;
  canopy_width_cm?: number;
  trunk_diameter_inch?: number;
  tree_height_label?: string;
  shrub_spacing_cm?: number;
  sunlight_requirement?: string;
  watering_requirement?: string;
  soil_requirement?: string;
  maintenance_level?: MarketplacePlantMaintenanceLevel;
  growth_rate?: MarketplacePlantGrowthRate;
  pet_friendly?: boolean;
  care_tips?: string;
  notes?: string;
  feature_tags?: string[];
  material_price: number;
  labor_price: number;
  marketplace_price: number;
  preferred_price: number;
  stock_quantity: number;
  image_url?: string;
  is_marketplace_enabled: boolean;
  marketplace_active: boolean;
  marketplace_plant_id?: string;
  document_item_catalog_id?: string;
  normalized_primary_name?: string;
  normalized_english_name?: string;
  normalized_scientific_name?: string;
  normalized_size_label?: string;
  normalized_unit?: string;
  created_at: string;
  updated_at: string;
}

// Legacy interfaces for backward compatibility
export interface HouseData extends House {}
export interface BranchData extends Branch {}

// ============================================================================
// SUPABASE CLIENT SETUP (SINGLETON)
// ============================================================================

const getSupabaseConfig = () => {
  const rawUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').trim().replace(/\/$/, '')
  const rawKey = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '').trim()

  if (!rawUrl || !rawKey) {
    console.warn('Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY');
    return { url: 'https://mock.supabase.co', key: 'mock_key' };
  }

  if (/placeholder-project\.supabase\.co/i.test(rawUrl) || /placeholder/i.test(rawKey)) {
    console.warn('Supabase env vars are placeholder');
    return { url: 'https://mock.supabase.co', key: 'mock_key' };
  }

  return { url: rawUrl, key: rawKey }
}

const config = getSupabaseConfig()

// Exported singleton instance
export const supabase = createClient(config.url, config.key, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  }
})

// ============================================================================
// AUTHENTICATION FUNCTIONS - UPDATED FOR NEW SCHEMA
// ============================================================================

export const signUp = async (email: string, password: string, fullName: string, role: UserRole = 'customer') => {
  try {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          role: role
        }
      }
    })

    if (error) return { data, error }

    // Fallback: Manually create profile if trigger fails or for immediate consistency
    if (data?.user) {
      const { error: profileError } = await supabase
        .from('profiles')
        .upsert({
          id: data.user.id,
          email: email,
          role: role,
          display_name: fullName,
          timezone: 'Asia/Bangkok',
          updated_at: new Date().toISOString()
        }, { onConflict: 'id' });

      if (profileError) {
        console.warn('[SignUp] Profile creation fallback error:', profileError);
      }
    }

    return { data, error }
  } catch (error) {
    return { data: null, error }
  }
}

export const signIn = async (email: string, password: string) => {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    return { data, error }
  } catch (error) {
    return { data: null, error }
  }
}

export const signInWithLine = async (redirectPath: string = '/login') => {
  try {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || (typeof window !== 'undefined' ? window.location.origin : '')
    const normalizedPath = redirectPath.startsWith('/') ? redirectPath : `/${redirectPath}`
    const redirectTo = appUrl ? `${appUrl}${normalizedPath}` : undefined

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'line' as any,
      options: {
        redirectTo,
      },
    })

    return { data, error }
  } catch (error) {
    return { data: null, error }
  }
}

export const signOut = async () => {
  try {
    const { error } = await supabase.auth.signOut()
    return { error }
  } catch (error) {
    return { error }
  }
}

export const getCurrentUser = async () => {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    return user
  } catch (error) {
    console.error('Error getting current user:', error)
    return null
  }
}

// ============================================================================
// PROFILE MANAGEMENT FUNCTIONS - UPDATED FOR NEW SCHEMA
// ============================================================================

export const getUserProfile = async (): Promise<{ data: Profile | null, error: any }> => {
  try {
    const { data: authData, error: authError } = await supabase.auth.getUser()
    const user = authData?.user

    if (authError || !user) {
      return { data: null, error: authError || new Error('User not authenticated') }
    }

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .maybeSingle()

    return { data, error }
  } catch (error) {
    return { data: null, error }
  }
}

export const getCustomers = async (): Promise<{ data: Profile[], error: any }> => {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('role', 'customer')
      .order('created_at', { ascending: false })

    return { data: data || [], error }
  } catch (error) {
    return { data: [], error }
  }
}

export const getStaffMembers = async (): Promise<{ data: Profile[], error: any }> => {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('role', 'staff')
      .order('created_at', { ascending: false })

    return { data: data || [], error }
  } catch (error) {
    return { data: [], error }
  }
}

export const updateUserProfile = async (userId: string, updates: Partial<Profile>): Promise<{ data: Profile | null, error: any }> => {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', userId)
      .select()
      .single()

    return { data, error }
  } catch (error) {
    return { data: null, error }
  }
}

// ============================================================================
// HOUSE MANAGEMENT FUNCTIONS - UPDATED FOR NEW SCHEMA
// ============================================================================

export const getHouseCount = async (customerId: string): Promise<{ data: number, error: any }> => {
  try {
    const { count, error } = await supabase
      .from('houses')
      .select('*', { count: 'exact', head: true })
      .or(`user_id.eq.${customerId},customer_id.eq.${customerId}`)

    return { data: count || 0, error }
  } catch (error) {
    return { data: 0, error }
  }
}

export const getCustomerHouses = async (customerId: string): Promise<{ data: House[], error: any }> => {
  try {
    // WORKAROUND for RLS infinite recursion: Call the backend API that uses service_role key
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : (process.env.NEXT_PUBLIC_APP_URL || '')
    const url = `${baseUrl}/api/customer/houses?customerId=${customerId}`
    
    // Pass session token if available (though API bypasses RLS, good practice)
    const { data: sessionData } = await supabase.auth.getSession()
    
    const res = await fetch(url, {
      cache: 'no-store',
      headers: {
        ...(sessionData?.session?.access_token ? { Authorization: `Bearer ${sessionData.session.access_token}` } : {})
      }
    })
    
    const result = await res.json()
    if (!res.ok) throw new Error(result.error || 'Failed to fetch houses')
      
    return { data: result.data || [], error: null }
  } catch (error) {
    console.error('getCustomerHouses failed via API:', error)
    return { data: [], error }
  }
}

// --- House Collaboration Helper Functions ---

export const getHouseCollaborators = async (houseId: string): Promise<{ data: HouseCollaborator[], error: any }> => {
  try {
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : (process.env.NEXT_PUBLIC_APP_URL || '')
    const url = `${baseUrl}/api/houses/${houseId}/collaborators?t=${Date.now()}`
    
    const { data: sessionData } = await supabase.auth.getSession()
    
    const res = await fetch(url, {
      cache: 'no-store',
      headers: {
        ...(sessionData?.session?.access_token ? { Authorization: `Bearer ${sessionData.session.access_token}` } : {})
      }
    })
    
    const result = await res.json()
    if (!res.ok) throw new Error(result.error || 'Failed to fetch collaborators')
      
    return { data: result.data || [], error: null }
  } catch (error) {
    return { data: [], error }
  }
}

export const inviteCollaboratorByEmail = async (houseId: string, email: string, role: HouseCollaboratorRole): Promise<{ data: any, error: any }> => {
  try {
    // 1. Find profile by email
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', email.toLowerCase().trim())
      .maybeSingle()

    if (profileError || !profile) {
      return { data: null, error: profileError || new Error('User not found by this email') }
    }

    // 2. Check if already a collaborator
    const { data: existing } = await supabase
      .from('house_collaborators')
      .select('id')
      .match({ house_id: houseId, user_id: profile.id })
      .maybeSingle()

    if (existing) {
      return { data: null, error: new Error('User is already a collaborator') }
    }

    // 3. Insert new collaborator
    const { data, error } = await supabase
      .from('house_collaborators')
      .insert({
        house_id: houseId,
        user_id: profile.id,
        role: role
      })
      .select()
      .single()

    return { data, error }
  } catch (error) {
    return { data: null, error }
  }
}

export const removeCollaborator = async (houseId: string, userId: string): Promise<{ error: any }> => {
  try {
    const { data: sessionData } = await supabase.auth.getSession()
    const token = sessionData?.session?.access_token
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : (process.env.NEXT_PUBLIC_APP_URL || '')

    const res = await fetch(`${baseUrl}/api/houses/${houseId}/collaborators/${userId}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      }
    })

    const result = await res.json()
    if (!res.ok) throw new Error(result.error || 'Failed to remove collaborator')

    return { error: null }
  } catch (error) {
    return { error }
  }
}

export const updateCollaboratorRole = async (houseId: string, userId: string, role: HouseCollaboratorRole): Promise<{ error: any }> => {
  try {
    const { data: sessionData } = await supabase.auth.getSession()
    const token = sessionData?.session?.access_token
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : (process.env.NEXT_PUBLIC_APP_URL || '')

    const res = await fetch(`${baseUrl}/api/houses/${houseId}/collaborators/${userId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      },
      body: JSON.stringify({ role })
    })

    const result = await res.json()
    if (!res.ok) throw new Error(result.error || 'Failed to update role')

    return { error: null }
  } catch (error) {
    return { error }
  }
}

export const getAllHouses = async (): Promise<{ data: House[], error: any }> => {
  try {
    const { data, error } = await supabase
      .from('houses')
      .select(`
        *,
        profiles!houses_user_id_fkey (
          display_name,
          email,
          customer_base_code
        )
      `)
      .order('created_at', { ascending: false })

    return { data: data || [], error }
  } catch (error) {
    return { data: [], error }
  }
}

export const createHouse = async (house: Partial<House>): Promise<{ data: House | null, error: any }> => {
  try {
    const res = await fetch('/api/customer/houses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(house)
    })
    const json = await res.json()
    if (!res.ok) throw new Error(json.error || 'Failed to create house')
    return { data: json.data, error: null }
  } catch (error: any) {
    return { data: null, error: error.message || error }
  }
}

export const updateHouse = async (houseId: string, updates: Partial<House>): Promise<{ data: House | null, error: any }> => {
  try {
    const { data, error } = await supabase
      .from('houses')
      .update(updates)
      .eq('id', houseId)
      .select()
      .single()

    return { data, error }
  } catch (error) {
    return { data: null, error }
  }
}

export const deleteHouse = async (houseId: string): Promise<{ error: any }> => {
  try {
    const { error } = await supabase
      .from('houses')
      .delete()
      .eq('id', houseId)

    return { error }
  } catch (error) {
    return { error }
  }
}

export const getHouseByCode = async (houseCode: string): Promise<{ data: House | null, error: any }> => {
  try {
    const { data, error } = await supabase
      .from('houses')
      .select('*')
      .eq('house_code', houseCode)
      .single()

    return { data, error }
  } catch (error) {
    return { data: null, error }
  }
}

// ============================================================================
// SERVICE MANAGEMENT FUNCTIONS - UPDATED FOR NEW SCHEMA
// ============================================================================

export const getServices = async (): Promise<{ data: Service[], error: any }> => {
  try {
    const { data, error } = await supabase
      .from('services')
      .select('*')
      .eq('is_active', true)
      .order('service_name', { ascending: true })

    return { data: data || [], error }
  } catch (error) {
    return { data: [], error }
  }
}

export const getMarketplacePlants = async (): Promise<{ data: MarketplacePlant[], error: any }> => {
  try {
    const { data, error } = await supabase
      .from('marketplace_plants')
      .select('*')
      .order('name', { ascending: true })

    return { data: (data || []) as MarketplacePlant[], error }
  } catch (error) {
    return { data: [], error }
  }
}

export const getAllMarketplacePlants = async (): Promise<{ data: MarketplacePlant[], error: any }> => {
  try {
    const { data, error } = await supabase
      .from('marketplace_plants')
      .select('*')
      .order('created_at', { ascending: false })

    return { data: (data || []) as MarketplacePlant[], error }
  } catch (error) {
    return { data: [], error }
  }
}

export const createMarketplacePlant = async (plant: Partial<MarketplacePlant>): Promise<{ data: MarketplacePlant | null, error: any }> => {
  try {
    const { data, error } = await supabase
      .from('marketplace_plants')
      .insert(plant)
      .select()
      .single()

    return { data: data as MarketplacePlant | null, error }
  } catch (error) {
    return { data: null, error }
  }
}

export const updateMarketplacePlant = async (plantId: string, updates: Partial<MarketplacePlant>): Promise<{ data: MarketplacePlant | null, error: any }> => {
  try {
    const { data, error } = await supabase
      .from('marketplace_plants')
      .update(updates)
      .eq('id', plantId)
      .select()
      .single()

    return { data: data as MarketplacePlant | null, error }
  } catch (error) {
    return { data: null, error }
  }
}

export const getAllServices = async (): Promise<{ data: Service[], error: any }> => {
  try {
    const { data, error } = await supabase
      .from('services')
      .select('*')
      .order('created_at', { ascending: false })

    return { data: data || [], error }
  } catch (error) {
    return { data: [], error }
  }
}

export const createService = async (service: Partial<Service>): Promise<{ data: Service | null, error: any }> => {
  try {
    const { data, error } = await supabase
      .from('services')
      .insert(service)
      .select()
      .single()

    return { data, error }
  } catch (error) {
    return { data: null, error }
  }
}

export const updateService = async (serviceId: string, updates: Partial<Service>): Promise<{ data: Service | null, error: any }> => {
  try {
    const { data, error } = await supabase
      .from('services')
      .update(updates)
      .eq('id', serviceId)
      .select()
      .single()

    return { data, error }
  } catch (error) {
    return { data: null, error }
  }
}

export const deleteService = async (serviceId: string): Promise<{ error: any }> => {
  try {
    const { error } = await supabase
      .from('services')
      .update({ is_active: false })
      .eq('id', serviceId)

    return { error }
  } catch (error) {
    return { error }
  }
}

// ============================================================================
// PRICE TEMPLATES FUNCTIONS - NEW FOR UPDATED SCHEMA
// ============================================================================

export const getPriceTemplates = async (serviceId?: string): Promise<{ data: PriceTemplate[], error: any }> => {
  try {
    let query = supabase
      .from('price_templates')
      .select(`
        *,
        services (
          service_name,
          service_code
        )
      `)
      .eq('is_active', true)
      .order('area_min', { ascending: true })

    if (serviceId) {
      query = query.eq('service_id', serviceId)
    }

    const { data, error } = await query

    return { data: data || [], error }
  } catch (error) {
    return { data: [], error }
  }
}

// Admin-friendly: include inactive templates (e.g., to re-enable or audit)
export const getAllPriceTemplates = async (serviceId?: string): Promise<{ data: PriceTemplate[], error: any }> => {
  try {
    let query = supabase
      .from('price_templates')
      .select(`
        *,
        services (
          service_name,
          service_code
        )
      `)
      .order('area_min', { ascending: true })

    if (serviceId) {
      query = query.eq('service_id', serviceId)
    }

    const { data, error } = await query
    return { data: data || [], error }
  } catch (error) {
    return { data: [], error }
  }
}

export const createPriceTemplate = async (template: Partial<PriceTemplate>): Promise<{ data: PriceTemplate | null, error: any }> => {
  try {
    const { data, error } = await supabase
      .from('price_templates')
      .insert(template)
      .select()
      .single()

    return { data, error }
  } catch (error) {
    return { data: null, error }
  }
}

export const updatePriceTemplate = async (templateId: string, updates: Partial<PriceTemplate>): Promise<{ data: PriceTemplate | null, error: any }> => {
  try {
    const { data, error } = await supabase
      .from('price_templates')
      .update(updates)
      .eq('id', templateId)
      .select()
      .single()

    return { data, error }
  } catch (error) {
    return { data: null, error }
  }
}

export const deletePriceTemplate = async (templateId: string): Promise<{ error: any }> => {
  try {
    const { error } = await supabase
      .from('price_templates')
      .update({ is_active: false })
      .eq('id', templateId)

    return { error }
  } catch (error) {
    return { error }
  }
}

export const calculateServicePrice = async (serviceId: string, areaSize: number): Promise<{ data: { base_price: number, calculated_price: number, template_used: PriceTemplate | null }, error: any }> => {
  try {
    // Get applicable price template
    const { data: templates, error: templatesError } = await supabase
      .from('price_templates')
      .select('*')
      .eq('service_id', serviceId)
      .eq('is_active', true)
      .lte('area_min', areaSize)
      .gte('area_max', areaSize)
      .single()

    if (templatesError) {
      // If no template found, get service base price
      const { data: service, error: serviceError } = await supabase
        .from('services')
        .select('base_price')
        .eq('id', serviceId)
        .single()

      if (serviceError) {
        return { data: { base_price: 0, calculated_price: 0, template_used: null }, error: serviceError }
      }

      return { 
        data: { 
          base_price: service.base_price || 0, 
          calculated_price: service.base_price || 0, 
          template_used: null 
        }, 
        error: null 
      }
    }

    const calculatedPrice = (templates.base_price || 0) + (areaSize * (templates.price_per_unit || 0))

    return { 
      data: { 
        base_price: templates.base_price || 0, 
        calculated_price: calculatedPrice, 
        template_used: templates 
      }, 
      error: null 
    }
  } catch (error) {
    return { data: { base_price: 0, calculated_price: 0, template_used: null }, error }
  }
}

// ============================================================================ 
// ORDER MANAGEMENT FUNCTIONS - UPDATED FOR NEW SCHEMA
// ============================================================================

export const getCustomerOrders = async (customerId: string): Promise<{ data: any[], error: any }> => {
  try {
    const { data, error } = await supabase
      .from('orders')
      .select(`
        *,
        services (
          id,
          service_name,
          service_code,
          base_price,
          estimated_duration,
          estimated_duration_unit
        ),
        houses!orders_house_id_fkey (
          id,
          house_code,
          name,
          address,
          area_size
        ),
        order_additional_services (
          id,
          quantity,
          unit_price,
          total_price,
          additional_services (
            service_name,
            description
          )
        )
      `)
      .eq('customer_id', customerId)
      .order('created_at', { ascending: false })

    return { data: data || [], error }
  } catch (error) {
    return { data: [], error }
  }
}

export const getAllOrders = async (): Promise<{ data: any[], error: any }> => {
  try {
    const { data, error } = await supabase
      .from('orders')
      .select(`
        *,
        profiles!orders_customer_id_fkey (
          display_name,
          email,
          customer_base_code
        ),
        services (
          service_name,
          service_code
        ),
        houses!orders_house_id_fkey (
          house_code,
          name,
          address
        )
      `)
      .order('created_at', { ascending: false })

    return { data: data || [], error }
  } catch (error) {
    return { data: [], error }
  }
}

export const createOrder = async (order: Partial<Order>): Promise<{ data: Order | null, error: any }> => {
  try {
    const { data, error } = await supabase
      .from('orders')
      .insert(order)
      .select()
      .single()

    return { data, error }
  } catch (error) {
    return { data: null, error }
  }
}

export const updateOrder = async (orderId: string, updates: Partial<Order>): Promise<{ data: Order | null, error: any }> => {
  try {
    const { data, error } = await supabase
      .from('orders')
      .update(updates)
      .eq('id', orderId)
      .select()
      .single()

    return { data, error }
  } catch (error) {
    return { data: null, error }
  }
}

export const deleteOrder = async (orderId: string): Promise<{ error: any }> => {
  try {
    const { error } = await supabase
      .from('orders')
      .delete()
      .eq('id', orderId)

    return { error }
  } catch (error) {
    return { error }
  }
}

// ============================================================================
// ADDITIONAL SERVICES FUNCTIONS - NEW FOR UPDATED SCHEMA  
// ============================================================================

export const getAdditionalServices = async (): Promise<{ data: AdditionalService[], error: any }> => {
  try {
    const { data, error } = await supabase
      .from('additional_services')
      .select('*')
      .eq('is_active', true)
      .order('service_name', { ascending: true })

    return { data: data || [], error }
  } catch (error) {
    return { data: [], error }
  }
}

export const createAdditionalService = async (service: Partial<AdditionalService>): Promise<{ data: AdditionalService | null, error: any }> => {
  try {
    const { data, error } = await supabase
      .from('additional_services')
      .insert(service)
      .select()
      .single()

    return { data, error }
  } catch (error) {
    return { data: null, error }
  }
}

export const addAdditionalServiceToOrder = async (orderAdditionalService: Partial<OrderAdditionalService>): Promise<{ data: OrderAdditionalService | null, error: any }> => {
  try {
    const { data, error } = await supabase
      .from('order_additional_services')
      .insert(orderAdditionalService)
      .select()
      .single()

    return { data, error }
  } catch (error) {
    return { data: null, error }
  }
}

export const getOrderAdditionalServices = async (orderId: string): Promise<{ data: any[], error: any }> => {
  try {
    const { data, error } = await supabase
      .from('order_additional_services')
      .select(`
        *,
        additional_services (
          service_name,
          description,
          category
        )
      `)
      .eq('order_id', orderId)

    return { data: data || [], error }
  } catch (error) {
    return { data: [], error }
  }
}

export const getOrdersWithDetails = async (): Promise<OrderWithDetails[]> => {
  try {
    const res = await fetch('/api/customer/orders', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    })
    
    if (!res.ok) {
      throw new Error(`Failed to fetch orders: ${res.statusText}`)
    }
    
    const result = await res.json()
    if (!result.success) {
      throw new Error(result.error || 'Failed to fetch orders')
    }
    
    return result.data || []
  } catch (error) {
    console.error('getOrdersWithDetails error:', error)
    return []
  }
}

// Type for orders with related details
export interface OrderWithDetails extends Order {
  services: Service | null
  houses: House | null
  profiles: Profile | null
  price_templates?: PriceTemplate | null
  order_additional_services?: (OrderAdditionalService & {
    additional_services: AdditionalService
  })[]
}

export const getOrderById = async (orderId: string): Promise<OrderWithDetails | null> => {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('ไม่พบข้อมูลผู้ใช้')

    const { data, error } = await supabase
      .from('orders')
      .select(`
        *,
        services (
          id,
          service_name,
          service_code,
          description,
          estimated_duration,
          estimated_duration_unit
        ),
        houses (
          id,
          name,
          address,
          house_code,
          area_size,
          house_type
        ),
        profiles (
          id,
          display_name,
          customer_base_code,
          phone
        ),
        price_templates (
          id,
          template_name,
          description
        ),
        order_additional_services (
          id,
          quantity,
          unit_price,
          total_price,
          additional_services (
            id,
            service_name,
            description,
            category
          )
        )
      `)
      .eq('id', orderId)
      .eq('customer_id', user.id)
      .single()

    if (error) throw error

    return data
  } catch (error) {
    console.error('Error fetching order by ID:', error)
    return null
  }
}

// ============================================================================
// MEASUREMENT REQUEST FUNCTIONS - UPDATED FOR NEW SCHEMA
// ============================================================================

export const createMeasurementRequest = async (request: Partial<MeasurementRequest>): Promise<{ data: MeasurementRequest | null, error: any }> => {
  try {
    const { data, error } = await supabase
      .from('measurement_requests')
      .insert(request)
      .select()
      .single()

    return { data, error }
  } catch (error) {
    return { data: null, error }
  }
}

export const getMeasurementRequests = async (filters?: { 
  status?: MeasurementStatus, 
  branch_code?: string, 
  customer_id?: string,
  assigned_staff_id?: string
}): Promise<{ data: any[], error: any }> => {
  try {
    let query = supabase
      .from('measurement_requests')
      .select(`
        *,
        profiles!measurement_requests_customer_id_fkey (
          display_name,
          email,
          phone,
          customer_base_code
        ),
        houses!measurement_requests_house_code_fkey (
          house_code,
          name,
          address,
          phone_number,
          contact_person,
          service_days,
          area_size,
          house_type,
          special_notes,
          key_location,
          operating_hour_start,
          operating_hour_end
        ),
        assigned_staff:profiles!measurement_requests_assigned_staff_id_fkey (
          display_name,
          staff_code,
          phone
        )
      `)
      .order('created_at', { ascending: false });

    // Apply filters if provided
    if (filters?.status) {
      query = query.eq('status', filters.status);
    }
    
    if (filters?.branch_code) {
      query = query.eq('branch_code', filters.branch_code);
    }

    if (filters?.customer_id) {
      query = query.eq('customer_id', filters.customer_id);
    }

    if (filters?.assigned_staff_id) {
      query = query.eq('assigned_staff_id', filters.assigned_staff_id);
    }

    const { data, error } = await query;

    return { data: data || [], error }
  } catch (error) {
    return { data: [], error }
  }
}

export const getMeasurementRequestsWithDetails = async (customerId?: string): Promise<MeasurementRequestWithDetails[]> => {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user && !customerId) throw new Error('ไม่พบข้อมูลผู้ใช้')

    let query = supabase
      .from('measurement_requests')
      .select(`
        *,
        houses (
          house_code,
          name,
          address
        ),
        profiles!measurement_requests_customer_id_fkey (
          display_name,
          customer_base_code
        ),
        assigned_staff:profiles!measurement_requests_assigned_staff_id_fkey (
          display_name,
          staff_code
        )
      `)
      .order('created_at', { ascending: false })

    if (customerId) {
      query = query.eq('customer_id', customerId)
    } else if (user?.id) {
      const { data: roleProfile, error: roleError } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .maybeSingle()

      if (roleError) throw roleError

      const role = roleProfile?.role
      if (role === 'customer') {
        query = query.eq('customer_id', user.id)
      }
    }

    const { data, error } = await query

    if (error) throw error

    return data || []
  } catch (error) {
    console.error('Error fetching measurement requests with details:', error)
    return []
  }
}

// Type for measurement requests with related details
export interface MeasurementRequestWithDetails extends MeasurementRequest {
  houses: {
    house_code: string
    name: string
    address: string
  } | null
  profiles: {
    display_name: string
    customer_base_code: string | null
  } | null
  assigned_staff?: {
    display_name: string
    staff_code: string | null
  } | null
}

export const getStaffMeasurementRequests = async (staffId: string): Promise<{ data: any[], error: any }> => {
  try {
    const { data, error } = await supabase
      .from('measurement_requests')
      .select(`
        *,
        profiles!measurement_requests_customer_id_fkey (
          display_name,
          email,
          phone,
          customer_base_code
        ),
        houses!measurement_requests_house_code_fkey (
          house_code,
          name,
          address,
          phone_number,
          contact_person,
          service_days,
          area_size,
          house_type,
          special_notes,
          key_location,
          operating_hour_start,
          operating_hour_end
        )
      `)
      .eq('assigned_staff_id', staffId)
      .order('created_at', { ascending: false })

    return { data: data || [], error }
  } catch (error) {
    return { data: [], error }
  }
}

export const updateMeasurementRequest = async (requestId: string, updates: Partial<MeasurementRequest>): Promise<{ data: MeasurementRequest | null, error: any }> => {
  try {
    const { data, error } = await supabase
      .from('measurement_requests')
      .update(updates)
      .eq('id', requestId)
      .select()
      .single()

    return { data, error }
  } catch (error) {
    return { data: null, error }
  }
}

export const assignMeasurementRequest = async (requestId: string, staffId: string): Promise<{ data: MeasurementRequest | null, error: any }> => {
  try {
    const { data, error } = await supabase
      .from('measurement_requests')
      .update({ 
        assigned_staff_id: staffId, 
        status: 'assigned'
      })
      .eq('id', requestId)
      .select()
      .single()
    return { data, error }
  } catch (error) {
    return { data: null, error }
  }
}

export const completeMeasurementRequest = async (requestId: string, measurementData: {
  measured_area_sqm?: number,
  measurement_notes?: string,
  measurement_photos?: string[]
}): Promise<{ data: MeasurementRequest | null, error: any }> => {
  try {
    const { data, error } = await supabase
      .from('measurement_requests')
      .update({ 
        ...measurementData,
        status: 'completed'
      })
      .eq('id', requestId)
      .select()
      .single()
    return { data, error }
  } catch (error) {
    return { data: null, error }
  }
}

// ============================================================================
// NOTIFICATION FUNCTIONS - UPDATED FOR NEW SCHEMA
// ============================================================================

export const getCustomerNotifications = async (customerId: string): Promise<{ data: Notification[], error: any }> => {
  try {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', customerId)
      .order('created_at', { ascending: false })

    return { data: data || [], error }
  } catch (error) {
    return { data: [], error }
  }
}



// ============================================================================
// BRANCH FUNCTIONS - UPDATED FOR NEW SCHEMA  
// ============================================================================

export const getBranches = async (): Promise<{ data: Branch[], error: any }> => {
  try {
    const { data, error } = await supabase
      .from('branches')
      .select('*')
      .order('branch_name', { ascending: true })

    return { data: data || [], error }
  } catch (error) {
    return { data: [], error }
  }
}

export const getPosMenuItems = async (branchId?: string): Promise<{ data: PosMenuItem[], error: any }> => {
  try {
    let query = supabase.from('pos_menu_items').select('*').eq('is_active', true)
    if (branchId) {
      query = query.or(`branch_id.eq.${branchId},branch_id.is.null`)
    }
    const { data, error } = await query.order('name', { ascending: true })
    return { data: data || [], error }
  } catch (error) {
    return { data: [], error }
  }
}

const sanitizeBranchPayload = (branch: Partial<Branch>) => {
  const payload: any = { ...branch }

  if (!payload.id || payload.id === '') delete payload.id
  if (!payload.created_at || payload.created_at === '') delete payload.created_at
  if (!payload.updated_at || payload.updated_at === '') delete payload.updated_at

  if (payload.address === '') payload.address = null
  if (payload.phone === '') payload.phone = null
  if (payload.email === '') payload.email = null
  if (payload.name === '') payload.name = null
  if (payload.code === '') payload.code = null
  
  if (payload.latitude === '') payload.latitude = null
  if (payload.longitude === '') payload.longitude = null
  
  if (payload.service_zip_codes && Array.isArray(payload.service_zip_codes)) {
    // Ensure it's a clean array
    payload.service_zip_codes = payload.service_zip_codes.filter(Boolean)
  }

  return payload
}

const sanitizePosSettingsPayload = (settings: Partial<PosShopSettings>) => {
  const payload: any = { ...settings }

  if (!payload.id || payload.id === '') delete payload.id
  if (!payload.updated_at || payload.updated_at === '') delete payload.updated_at

  if (payload.status_expiry === '') payload.status_expiry = null
  if (payload.status_message === '') payload.status_message = null
  
  if (payload.check_in_radius === '') payload.check_in_radius = 50
  if (typeof payload.check_in_radius === 'string') payload.check_in_radius = Number(payload.check_in_radius)

  return payload
}

export const createBranch = async (branch: Partial<Branch>): Promise<{ data: Branch | null, error: any }> => {
  try {
    const payload = sanitizeBranchPayload(branch)
    const { data, error } = await supabase
      .from('branches')
      .insert(payload)
      .select()
      .single()
    return { data, error }
  } catch (error) {
    return { data: null, error }
  }
}

export const updateBranch = async (id: string, updates: Partial<Branch>): Promise<{ data: Branch | null, error: any }> => {
  try {
    const payload = sanitizeBranchPayload(updates)
    const { data, error } = await supabase
      .from('branches')
      .update(payload)
      .eq('id', id)
      .select()
      .single()
    return { data, error }
  } catch (error) {
    return { data: null, error }
  }
}

export const getPosSettings = async (branchId?: string): Promise<{ data: PosShopSettings | null, error: any }> => {
  try {
    let query = supabase.from('pos_shop_settings').select('*')
    
    if (branchId) {
      query = query.eq('branch_id', branchId)
    } else {
      // If no branchId, get the global/first one (fallback)
      query = query.is('branch_id', null)
    }
    
    const { data, error } = await query.maybeSingle()
    return { data, error }
  } catch (error) {
    return { data: null, error }
  }
}

export const updatePosSettings = async (id: string, updates: Partial<PosShopSettings>): Promise<{ data: PosShopSettings | null, error: any }> => {
  try {
    const payload = sanitizePosSettingsPayload(updates)
    const { data, error } = await supabase
      .from('pos_shop_settings')
      .update(payload)
      .eq('id', id)
      .select()
      .single()
    return { data, error }
  } catch (error) {
    return { data: null, error }
  }
}

export const deleteBranch = async (id: string): Promise<{ error: any }> => {
  try {
    const { error } = await supabase
      .from('branches')
      .delete()
      .eq('id', id)
    return { error }
  } catch (error) {
    return { error }
  }
}

export const findBranchByZipCode = async (zipCode: string): Promise<{ data: Branch | null, error: any }> => {
  try {
    const { data, error } = await supabase
      .from('branches')
      .select('*')
      .contains('service_zip_codes', [zipCode])
      .in('branch_type', ['garden', 'both'])
      .limit(1)
      .single()

    return { data, error }
  } catch (error) {
    return { data: null, error }
  }
}

// ============================================================================
// JOB ASSIGNMENT FUNCTIONS - NEW FOR UPDATED SCHEMA
// ============================================================================

export const getJobAssignments = async (filters?: { 
  staff_id?: string, 
  order_id?: string, 
  status?: JobAssignmentStatus 
}): Promise<{ data: any[], error: any }> => {
  try {
    let query = supabase
      .from('job_assignments')
      .select(`
        *,
        orders (
          id,
          order_code,
          status,
          scheduled_date,
          total,
          houses!orders_house_id_fkey (
            house_code,
            name,
            address
          ),
          services (
            service_name,
            estimated_duration
          )
        ),
        profiles!job_assignments_staff_id_fkey (
          display_name,
          staff_code,
          phone
        )
      `)
      .order('assigned_at', { ascending: false })

    if (filters?.staff_id) {
      query = query.eq('staff_id', filters.staff_id)
    }
    if (filters?.order_id) {
      query = query.eq('order_id', filters.order_id)
    }
    if (filters?.status) {
      query = query.eq('status', filters.status)
    }

    const { data, error } = await query

    return { data: data || [], error }
  } catch (error) {
    return { data: [], error }
  }
}

export const createJobAssignment = async (assignment: Partial<JobAssignment>): Promise<{ data: JobAssignment | null, error: any }> => {
  try {
    const { data, error } = await supabase
      .from('job_assignments')
      .insert(assignment)
      .select()
      .single()

    return { data, error }
  } catch (error) {
    return { data: null, error }
  }
}

export const updateJobAssignment = async (assignmentId: string, updates: Partial<JobAssignment>): Promise<{ data: JobAssignment | null, error: any }> => {
  try {
    const { data, error } = await supabase
      .from('job_assignments')
      .update(updates)
      .eq('id', assignmentId)
      .select()
      .single()

    return { data, error }
  } catch (error) {
    return { data: null, error }
  }
}

// ============================================================================
// DOCUMENT FUNCTIONS - NEW FOR UPDATED SCHEMA
// ============================================================================

export const getDocuments = async (filters?: { 
  user_id?: string, 
  order_id?: string, 
  type?: DocumentType 
}): Promise<{ data: Document[], error: any }> => {
  try {
    let query = supabase
      .from('documents')
      .select('*')
      .order('created_at', { ascending: false })

    if (filters?.user_id) {
      query = query.eq('user_id', filters.user_id)
    }
    if (filters?.order_id) {
      query = query.eq('order_id', filters.order_id)
    }
    const { data, error } = await query

    return { data: data || [], error }
  } catch (error) {
    return { data: [], error }
  }
}

export const getAdminDocuments = async (): Promise<{ data: any[], error: any }> => {
  try {
    const { data: joinedData, error: joinedError } = await supabase
      .from('documents')
      .select('*, recipient:user_id(display_name, email, phone), order:orders!order_id(total, order_code, customer:profiles!orders_customer_id_fkey(display_name, email, phone))')
      .order('created_at', { ascending: false })

    let data = joinedData
    if (joinedError) {
      const { data: fallbackData, error: fallbackError } = await supabase
        .from('documents')
        .select('*')
        .order('created_at', { ascending: false })

      if (fallbackError) throw fallbackError
      data = fallbackData || []
    }

    // Transform data to flat structure for easier consumption
    const enrichedData = data?.map(doc => {
      let parsedDescription: any = null
      if (typeof doc.description === 'string') {
        try {
          parsedDescription = JSON.parse(doc.description)
        } catch {
          parsedDescription = null
        }
      }

      const payloadRecipientName =
        parsedDescription?.recipient?.name ||
        parsedDescription?.recipient_name ||
        ''

      const orderCustomerName = doc.order?.customer?.display_name || ''
      const customerName = payloadRecipientName || orderCustomerName || ''
      const payloadTotal = Number(parsedDescription?.total)
      const documentTotal = Number(doc.total)
      const orderTotal = Number(doc.order?.total)
      const resolvedTotal = Number.isFinite(documentTotal) && documentTotal > 0
        ? documentTotal
        : Number.isFinite(payloadTotal) && payloadTotal > 0
          ? payloadTotal
          : Number.isFinite(orderTotal) && orderTotal > 0
            ? orderTotal
            : 0

      return {
        ...doc,
        recipient: {
          name: doc.recipient?.display_name || payloadRecipientName || 'Unknown',
          email: doc.recipient?.email || '',
          phone: doc.recipient?.phone || ''
        },
        customer: {
          name: customerName,
          email: doc.order?.customer?.email || '',
          phone: doc.order?.customer?.phone || ''
        },
        customer_name: customerName,
        total: resolvedTotal,
        order_code: doc.order?.order_code || doc.document_code
      }
    })

    return { data: enrichedData || [], error: null }
  } catch (error) {
    console.error('Error fetching admin documents:', error)
    return { data: [], error }
  }
}

export const deleteAdminDocument = async (documentId: string): Promise<{ data: any | null, error: any }> => {
  try {
    const { data, error } = await supabase
      .from('documents')
      .delete()
      .eq('id', documentId)
      .select()
      .single()

    if (error) {
      const rawMessage = String(error?.message || '')
      if (
        rawMessage.includes('fk_documents_source_document') ||
        rawMessage.includes('referenced by downstream documents')
      ) {
        return {
          data: null,
          error: {
            ...error,
            message: 'ไม่สามารถลบเอกสารนี้ได้ เพราะมีเอกสารอื่นอ้างอิงอยู่แล้ว',
          },
        }
      }
    }

    return { data, error }
  } catch (error) {
    return { data: null, error }
  }
}

export const createDocument = async (document: Partial<Document>): Promise<{ data: Document | null, error: any }> => {
  try {
    const { data, error } = await supabase
      .from('documents')
      .insert(document)
      .select()
      .single()

    return { data, error }
  } catch (error) {
    return { data: null, error }
  }
}

export const getDocumentDetails = async (documentId: string): Promise<{ data: any | null, error: any }> => {
  try {
    const { data, error } = await supabase
      .from('documents')
      .select(`
        *,
        orders (
          *,
          profiles!orders_customer_id_fkey (
            id,
            display_name,
            email,
            phone,
            address,
            zip_code
          ),
          services (
            id,
            service_name,
            service_code,
            description,
            base_price,
            billing_type,
            estimated_duration,
            estimated_duration_unit
          ),
          houses!orders_house_id_fkey (
            id,
            house_code,
            name,
            address,
            area_size,
            zip_code,
            phone_number,
            contact_person
          ),
          order_additional_services (
            id,
            quantity,
            unit_price,
            total_price,
            additional_services (
              service_name,
              description,
              category
            )
          )
        )
      `)
      .eq('id', documentId)
      .single()

    return { data, error }
  } catch (error) {
    return { data: null, error }
  }
}

async function generateDocumentCode(prefix: 'Q' | 'INV' | 'RCPT' | 'PMAT' | 'CONT') {
  const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, '')
  const like = `${prefix}-${datePart}-%`

  const { data, error } = await supabase
    .from('documents')
    .select('document_code')
    .like('document_code', like)
    .order('document_code', { ascending: false })
    .limit(1)

  if (error) {
    const fallback = Math.random().toString(36).slice(2, 6).toUpperCase()
    return `${prefix}-${datePart}-${fallback}`
  }

  const last = data?.[0]?.document_code
  let next = 1
  if (typeof last === 'string') {
    const m = last.match(/-(\d+)$/)
    if (m?.[1]) {
      const n = Number(m[1])
      if (Number.isFinite(n) && n >= 0) next = n + 1
    }
  }

  const seq = String(next).padStart(4, '0')
  return `${prefix}-${datePart}-${seq}`
}

function isUniqueViolation(err: any) {
  const code = err?.code || err?.details?.code
  if (code === '23505') return true
  const message = String(err?.message || '')
  return message.toLowerCase().includes('duplicate key') || message.toLowerCase().includes('unique constraint')
}

async function insertDocumentWithCodeRetry<T extends Record<string, any>>(params: {
  prefix: 'Q' | 'INV' | 'RCPT' | 'PMAT' | 'CONT'
  buildRow: (document_code: string) => T
  maxAttempts?: number
}) {
  const attempts = Math.max(1, Math.min(10, params.maxAttempts ?? 5))

  let lastError: any = null
  for (let i = 0; i < attempts; i++) {
    const document_code = await generateDocumentCode(params.prefix)

    const { data, error } = await supabase
      .from('documents')
      .insert(params.buildRow(document_code))
      .select()
      .single()

    if (!error) {
      return { data, error: null }
    }

    lastError = error
    if (!isUniqueViolation(error) || i === attempts - 1) {
      return { data: null, error }
    }
  }

  return { data: null, error: lastError || new Error('สร้างเอกสารไม่สำเร็จ') }
}

export type ManualDocumentType = 'quotation' | 'invoice' | 'receipt' | 'plant_material' | 'contract'
export type ManualDocumentStatus = 'draft' | 'issued' | 'paid'
export type ContractDocumentType = 'landscape_turnkey' | 'annual_maintenance'

export interface DocumentInstallment {
  id: string
  label?: string
  due_at?: string
  amount: number
  percent?: number
  paid_at?: string
}

export interface ManualDocumentPayload {
  kind: 'manual_document'
  doc_type: ManualDocumentType
  idempotency_key?: string
  contract_type?: ContractDocumentType
  source_document_id?: string
  source_order_id?: string
  source_customer_id?: string
  source_house_id?: string
  project_name?: string
  house_name?: string
  recipient: {
    name: string
    phone?: string
    address?: string
    tax_id?: string
  }
  contract_details?: {
    land_deed_number?: string
    work_start_date?: string
    work_end_date?: string
    signing_location?: string
    project_location?: string
    quotation_attachment_pages?: string
    invoice_reference_code?: string
    invoice_attachment_pages?: string
    employer_signer_name?: string
    employer_witness_name?: string
    employer_id_attachment_pages?: string
    contractor_id_attachment_pages?: string
    contractor_company_name?: string
    contractor_company_address?: string
    contractor_company_tax_id?: string
    contractor_signer_name?: string
    contractor_witness_name?: string
  }
  items?: Array<{
    description: string
    quantity: number
    unit_price: number
    plant_document_mode?: 'auto' | 'exclude' | 'tree' | 'shrub' | 'material'
  }>
  zones?: Array<{
    id: string
    name: string
    categories: Array<{
      id: string
      name: string
      main_category?: DocumentCatalogMainCategory
      subcategory?: DocumentCatalogSubcategory
      items: Array<{
        id: string
        description: string
        spec?: string
        size_mode?: 'shrub' | 'tree' | 'other'
        plant_document_mode?: 'auto' | 'exclude' | 'tree' | 'shrub' | 'material'
        height_m?: number
        trunk_diameter_inch?: number
        tree_height_label?: string
        size?: string
        spacing_x?: number
        spacing_y?: number
        area_sqm?: number
        unit: string
        quantity: number
        unit_price_material?: number
        unit_price_labor?: number
        remark?: string
      }>
    }>
  }>
  installments?: any[]
  applied_installment_ids?: string[]
  notes?: string
  issued_at?: string
  due_at?: string
  paid_at?: string
  paid_amount?: number
  payment_method?: 'cash' | 'transfer' | 'credit_card' | 'cheque' | 'other'
  total?: number
  vat_rate?: number
  overhead_rate?: number
  discount_type?: 'amount' | 'percent'
  discount_value?: number
  discount_amount?: number
  show_vat?: boolean
  show_overhead?: boolean
  show_global_labor?: boolean
  global_labor_rate?: number
  withholding_tax_rate?: number
  show_withholding_tax?: boolean
  show_zones?: boolean
  document_code?: string
  total_label?: string
  show_total_label?: boolean
  conditions?: Array<{ id: string, text: string, selected: boolean }>
}

const normalizeIdempotencyKey = (value?: string | null) => {
  const normalized = String(value || '').trim()
  return normalized || null
}

const normalizeManualPayloadForPersistence = (
  type: ManualDocumentType,
  payload: ManualDocumentPayload
): ManualDocumentPayload => {
  if (type !== 'plant_material') {
    return payload
  }

  const normalizedTotal = Number(payload.total)

  return {
    ...payload,
    total: Number.isFinite(normalizedTotal) && normalizedTotal >= 0 ? normalizedTotal : 0,
  }
}

const getExistingManualDocumentByIdempotency = async (params: {
  owner_user_id: string
  idempotency_key: string
}): Promise<{ data: Document | null, error: any }> => {
  try {
    const { data, error } = await supabase
      .from('documents')
      .select('*')
      .eq('user_id', params.owner_user_id)
      .eq('manual_kind', 'manual_document')
      .eq('idempotency_key', params.idempotency_key)
      .maybeSingle()

    return { data: (data as any) || null, error }
  } catch (error) {
    return { data: null, error }
  }
}

const deriveManualDocumentStatus = (
  type: ManualDocumentType,
  payload: Partial<ManualDocumentPayload>,
  fallbackStatus: ManualDocumentStatus = 'issued'
): ManualDocumentStatus => {
  if (type === 'quotation') return fallbackStatus
  if (type === 'receipt') return payload.paid_at ? 'paid' : 'issued'
  if (type === 'invoice') return payload.paid_at ? 'paid' : 'issued'
  return fallbackStatus
}

export interface DocumentItemCatalogEntry {
  id: string
  item_name: string
  english_name?: string
  scientific_name?: string
  size_label?: string
  main_category?: DocumentCatalogMainCategory
  subcategory?: DocumentCatalogSubcategory
  item_category?: PlantItemCategory
  size_mode?: 'tree' | 'shrub' | 'other'
  unit: string
  material_price: number
  labor_price: number
  image_url?: string | null
  normalized_name?: string
  normalized_english_name?: string
  normalized_scientific_name?: string
  normalized_size_label?: string
  normalized_unit?: string
  last_total_price: number
  usage_count: number
  created_at: string
  updated_at: string
}

export interface PlantingSpacingReference {
  id: string
  spacing_meter: number
  plants_per_sqm: number
  label: string
  created_at: string
  updated_at: string
}

export const getPlantingSpacingReferences = async (): Promise<{ data: PlantingSpacingReference[], error: any }> => {
  try {
    const { data, error } = await supabase
      .from('planting_spacing_reference')
      .select('*')
      .order('spacing_meter', { ascending: true })

    return { data: (data || []) as PlantingSpacingReference[], error }
  } catch (error) {
    return { data: [], error }
  }
}

export const getDocumentItemCatalog = async (): Promise<{ data: DocumentItemCatalogEntry[], error: any }> => {
  try {
    const { data, error } = await supabase
      .from('document_item_catalog')
      .select('*')
      .order('updated_at', { ascending: false })
      .limit(500)

    return { data: (data || []) as DocumentItemCatalogEntry[], error }
  } catch (error) {
    return { data: [], error }
  }
}

export const getPlantLibraryVariants = async (): Promise<{ data: PlantLibraryVariant[], error: any }> => {
  try {
    const { data, error } = await supabase
      .from('v_plant_library_variants')
      .select('*')
      .order('is_marketplace_enabled', { ascending: false })
      .order('updated_at', { ascending: false })
      .limit(1000)

    return { data: (data || []) as PlantLibraryVariant[], error }
  } catch (error) {
    return { data: [], error }
  }
}

const normalizeCatalogValue = (value?: string | null) =>
  (value || '')
    .normalize('NFKC')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()

export const upsertDocumentItemCatalog = async (items: Array<{
  item_name: string
  english_name?: string
  scientific_name?: string
  size_label?: string
  main_category?: DocumentCatalogMainCategory | string
  subcategory?: DocumentCatalogSubcategory | string
  item_category?: PlantItemCategory | string
  size_mode?: 'tree' | 'shrub' | 'other' | string
  unit?: string
  material_price?: number
  labor_price?: number
  image_url?: string | null
}>): Promise<{ data: DocumentItemCatalogEntry[], error: any }> => {
  try {
    const normalized = items
      .map((item) => {
        const itemName = String(item.item_name || '').trim()
        if (!itemName) return null

        const englishName = String(item.english_name || '').trim()
        const scientificName = String(item.scientific_name || '').trim()
        const sizeLabel = String(item.size_label || '').trim()
        const itemCategoryRaw = String(item.item_category || '').trim().toLowerCase()
        const itemCategory = itemCategoryRaw === 'tree'
          || itemCategoryRaw === 'palm'
          || itemCategoryRaw === 'shrub'
          || itemCategoryRaw === 'material'
          || itemCategoryRaw === 'other'
          ? itemCategoryRaw
          : itemCategoryRaw === '' && String(item.size_mode || '').trim().toLowerCase() === 'tree'
            ? 'tree'
            : itemCategoryRaw === '' && String(item.size_mode || '').trim().toLowerCase() === 'shrub'
              ? 'shrub'
              : 'other'
        const sizeModeRaw = String(item.size_mode || 'other').trim().toLowerCase()
        const sizeMode = sizeModeRaw === 'tree' || sizeModeRaw === 'shrub' || sizeModeRaw === 'other'
          ? sizeModeRaw
          : 'other'
        const categoryDefaults = getDocumentCategoryDefaults(
          item.main_category,
          item.subcategory,
          itemName,
          itemCategory,
          sizeMode
        )
        const unit = String(item.unit || '').trim() || categoryDefaults.defaultUnit || 'หน่วย'
        const materialPrice = Number(item.material_price) || 0
        const laborPrice = Number(item.labor_price) || 0

        return {
          item_name: itemName,
          english_name: englishName || '',
          scientific_name: scientificName || null,
          size_label: sizeLabel || null,
          main_category: categoryDefaults.mainCategory,
          subcategory: categoryDefaults.subcategory,
          item_category: itemCategory,
          size_mode: sizeMode,
          unit,
          material_price: materialPrice,
          labor_price: laborPrice,
          image_url: item.image_url || null,
          normalized_name: normalizeCatalogValue(itemName),
          normalized_english_name: normalizeCatalogValue(englishName),
          normalized_scientific_name: normalizeCatalogValue(scientificName),
          normalized_size_label: normalizeCatalogValue(sizeLabel),
          normalized_unit: normalizeCatalogValue(unit),
          last_total_price: materialPrice + laborPrice,
          usage_count: 1,
        }
      })
      .filter(Boolean) as Array<{
        item_name: string
        english_name: string
        scientific_name: string | null
        size_label: string | null
        main_category: DocumentCatalogMainCategory
        subcategory: DocumentCatalogSubcategory
        item_category: PlantItemCategory
        size_mode: 'tree' | 'shrub' | 'other'
        unit: string
        material_price: number
        labor_price: number
        image_url: string | null
        normalized_name: string
        normalized_english_name: string
        normalized_scientific_name: string
        normalized_size_label: string
        normalized_unit: string
        last_total_price: number
        usage_count: number
      }>

    if (!normalized.length) {
      return { data: [], error: null }
    }

    const { data, error } = await supabase
      .from('document_item_catalog')
      .upsert(normalized, {
        onConflict: 'normalized_name,normalized_english_name,normalized_scientific_name,item_category,size_mode,normalized_size_label,normalized_unit',
        ignoreDuplicates: false,
      })
      .select('*')

    return { data: (data || []) as DocumentItemCatalogEntry[], error }
  } catch (error) {
    return { data: [], error }
  }
}

export const saveDocumentItemCatalogEntry = async (item: {
  id?: string
  item_name: string
  english_name?: string
  scientific_name?: string
  size_label?: string
  main_category?: DocumentCatalogMainCategory | string
  subcategory?: DocumentCatalogSubcategory | string
  item_category?: PlantItemCategory | string
  size_mode?: 'tree' | 'shrub' | 'other' | string
  unit?: string
  material_price?: number
  labor_price?: number
  image_url?: string | null
}): Promise<{ data: DocumentItemCatalogEntry | null, error: any }> => {
  try {
    const itemName = String(item.item_name || '').trim()
    if (!itemName) {
      return { data: null, error: new Error('กรุณาระบุชื่อรายการ') }
    }

    const englishName = String(item.english_name || '').trim()
    const scientificName = String(item.scientific_name || '').trim()
    const sizeLabel = String(item.size_label || '').trim()
    const itemCategoryRaw = String(item.item_category || '').trim().toLowerCase()
    const sizeModeRaw = String(item.size_mode || 'other').trim().toLowerCase()
    const sizeMode = sizeModeRaw === 'tree' || sizeModeRaw === 'shrub' || sizeModeRaw === 'other' ? sizeModeRaw : 'other'
    const itemCategory = itemCategoryRaw === 'tree'
      || itemCategoryRaw === 'palm'
      || itemCategoryRaw === 'shrub'
      || itemCategoryRaw === 'material'
      || itemCategoryRaw === 'other'
      ? itemCategoryRaw
      : sizeMode === 'tree'
        ? 'tree'
        : sizeMode === 'shrub'
          ? 'shrub'
          : 'other'
    const categoryDefaults = getDocumentCategoryDefaults(
      item.main_category,
      item.subcategory,
      itemName,
      itemCategory,
      sizeMode
    )
    const unit = String(item.unit || '').trim() || categoryDefaults.defaultUnit || 'หน่วย'
    const payload = {
      item_name: itemName,
      english_name: englishName,
      scientific_name: scientificName,
      size_label: sizeLabel,
      main_category: categoryDefaults.mainCategory,
      subcategory: categoryDefaults.subcategory,
      item_category: itemCategory,
      size_mode: sizeMode,
      unit,
      material_price: Number(item.material_price) || 0,
      labor_price: Number(item.labor_price) || 0,
      image_url: item.image_url || null,
      normalized_name: normalizeCatalogValue(itemName),
      normalized_english_name: normalizeCatalogValue(englishName),
      normalized_scientific_name: normalizeCatalogValue(scientificName),
      normalized_size_label: normalizeCatalogValue(sizeLabel),
      normalized_unit: normalizeCatalogValue(unit),
      last_total_price: (Number(item.material_price) || 0) + (Number(item.labor_price) || 0),
    }

    const findExistingCatalogEntry = async () => {
      const normalizedIdentityQuery = await supabase
        .from('document_item_catalog')
        .select('*')
        .eq('normalized_name', payload.normalized_name)
        .eq('normalized_english_name', payload.normalized_english_name)
        .eq('normalized_scientific_name', payload.normalized_scientific_name)
        .eq('item_category', payload.item_category)
        .eq('size_mode', payload.size_mode)
        .eq('normalized_size_label', payload.normalized_size_label)
        .eq('normalized_unit', payload.normalized_unit)
        .limit(1)
        .maybeSingle()

      if (normalizedIdentityQuery.data) {
        return normalizedIdentityQuery.data as DocumentItemCatalogEntry
      }

      const fallbackLookupQuery = await supabase
        .from('document_item_catalog')
        .select('*')
        .eq('item_name', payload.item_name)
        .eq('scientific_name', payload.scientific_name)
        .eq('size_label', payload.size_label)
        .eq('unit', payload.unit)
        .limit(1)
        .maybeSingle()

      return (fallbackLookupQuery.data as DocumentItemCatalogEntry | null) || null
    }

    const updateExistingCatalogEntry = async (existingId: string) => {
      const { data, error } = await supabase
        .from('document_item_catalog')
        .update(payload)
        .eq('id', existingId)
        .select('*')
        .maybeSingle()

      return { data: (data as DocumentItemCatalogEntry) || null, error }
    }

    if (item.id) {
      return await updateExistingCatalogEntry(item.id)
    }

    const { data, error } = await supabase
      .from('document_item_catalog')
      .insert({
        ...payload,
        usage_count: 1,
      })
      .select('*')
      .maybeSingle()

    if (error && String((error as any)?.code || '') === '23505') {
      const existingEntry = await findExistingCatalogEntry()
      if (existingEntry?.id) {
        return await updateExistingCatalogEntry(existingEntry.id)
      }
    }

    return { data: (data as DocumentItemCatalogEntry) || null, error }
  } catch (error) {
    return { data: null, error }
  }
}

export const deleteDocumentItemCatalogEntry = async (id: string): Promise<{ error: any }> => {
  try {
    const { error } = await supabase
      .from('document_item_catalog')
      .delete()
      .eq('id', id)

    return { error }
  } catch (error) {
    return { error }
  }
}

export const createManualDocument = async (params: {
  owner_user_id: string
  type: ManualDocumentType
  payload: Omit<ManualDocumentPayload, 'kind' | 'doc_type'>
  status?: ManualDocumentStatus
}): Promise<{ data: Document | null, error: any }> => {
  try {
    const now = new Date().toISOString()
    const prefix = params.type === 'quotation'
      ? 'Q'
      : params.type === 'invoice'
        ? 'INV'
        : params.type === 'receipt'
          ? 'RCPT'
          : params.type === 'plant_material'
            ? 'PMAT'
            : 'CONT'

    const fullPayload = normalizeManualPayloadForPersistence(params.type, {
      kind: 'manual_document',
      doc_type: params.type,
      issued_at: now,
      ...params.payload,
    } as ManualDocumentPayload)
    const idempotencyKey = normalizeIdempotencyKey(fullPayload.idempotency_key)

    if (idempotencyKey) {
      const { data: existing, error: existingError } = await getExistingManualDocumentByIdempotency({
        owner_user_id: params.owner_user_id,
        idempotency_key: idempotencyKey,
      })
      if (existingError) return { data: null, error: existingError }
      if (existing) return { data: existing, error: null }
    }

    const status = params.status || deriveManualDocumentStatus(params.type, fullPayload, params.type === 'quotation' ? 'draft' : 'issued')

    const { data, error } = await insertDocumentWithCodeRetry({
      prefix,
      buildRow: (document_code) => ({
        user_id: params.owner_user_id,
        type: params.type,
        document_code,
        status,
        description: JSON.stringify(fullPayload),
        generated_at: now,
      }),
    })

    if (error && isUniqueViolation(error) && idempotencyKey) {
      const { data: existing, error: existingError } = await getExistingManualDocumentByIdempotency({
        owner_user_id: params.owner_user_id,
        idempotency_key: idempotencyKey,
      })
      if (existingError) return { data: null, error: existingError }
      if (existing) return { data: existing, error: null }
    }

    return { data: data as any, error }
  } catch (error) {
    return { data: null, error }
  }
}

export const updateManualDocument = async (params: {
  doc_id: string
  type: ManualDocumentType
  payload: Omit<ManualDocumentPayload, 'kind' | 'doc_type'>
  status?: ManualDocumentStatus
}): Promise<{ data: Document | null, error: any }> => {
  try {
    const fullPayload = normalizeManualPayloadForPersistence(params.type, {
      kind: 'manual_document',
      doc_type: params.type,
      ...params.payload,
    } as ManualDocumentPayload)
    const status = params.status || deriveManualDocumentStatus(params.type, fullPayload, params.type === 'quotation' ? 'draft' : 'issued')

    const { data, error } = await supabase
      .from('documents')
      .update({
        type: params.type,
        status,
        description: JSON.stringify(fullPayload),
      })
      .eq('id', params.doc_id)
      .select('*')
      .maybeSingle()

    return { data: (data as any) || null, error }
  } catch (error) {
    return { data: null, error }
  }
}

export const createChainedDocument = async (params: {
  source_document_id: string
  type: Exclude<ManualDocumentType, 'quotation'>
  payload: Omit<ManualDocumentPayload, 'kind' | 'doc_type' | 'source_document_id'>
  status?: ManualDocumentStatus
}): Promise<{ data: Document | null, error: any }> => {
  try {
    const { data: source, error: sourceError } = await supabase
      .from('documents')
      .select('id, user_id, order_id')
      .eq('id', params.source_document_id)
      .single()

    if (sourceError || !source) {
      return { data: null, error: sourceError || new Error('ไม่พบเอกสารต้นทาง') }
    }

    const now = new Date().toISOString()
    const prefix = params.type === 'invoice'
      ? 'INV'
      : params.type === 'receipt'
        ? 'RCPT'
        : params.type === 'plant_material'
          ? 'PMAT'
          : 'CONT'

    const fullPayload = normalizeManualPayloadForPersistence(params.type, {
      kind: 'manual_document',
      doc_type: params.type,
      source_document_id: params.source_document_id,
      issued_at: now,
      ...params.payload,
    } as ManualDocumentPayload)
    const idempotencyKey = normalizeIdempotencyKey(fullPayload.idempotency_key)

    if (idempotencyKey) {
      const { data: existing, error: existingError } = await getExistingManualDocumentByIdempotency({
        owner_user_id: source.user_id,
        idempotency_key: idempotencyKey,
      })
      if (existingError) return { data: null, error: existingError }
      if (existing) return { data: existing, error: null }
    }

    const status = params.status || deriveManualDocumentStatus(params.type, fullPayload)

    const { data, error } = await insertDocumentWithCodeRetry({
      prefix,
      buildRow: (document_code) => ({
        user_id: source.user_id,
        order_id: source.order_id || null,
        type: params.type,
        document_code,
        status,
        description: JSON.stringify(fullPayload),
        generated_at: now,
      }),
    })

    if (error && isUniqueViolation(error) && idempotencyKey) {
      const { data: existing, error: existingError } = await getExistingManualDocumentByIdempotency({
        owner_user_id: source.user_id,
        idempotency_key: idempotencyKey,
      })
      if (existingError) return { data: null, error: existingError }
      if (existing) return { data: existing, error: null }
    }

    return { data: data as any, error }
  } catch (error) {
    return { data: null, error }
  }
}

export const createQuotationForOrder = async (orderId: string): Promise<{ data: Document | null, error: any }> => {
  try {
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select(`
        id,
        customer_id,
        house_id,
        order_code,
        total,
        calculated_price,
        base_price,
        profiles!orders_customer_id_fkey (
          id,
          display_name,
          email,
          phone,
          address
        ),
        services (
          id,
          service_name,
          service_code
        ),
        houses!orders_house_id_fkey (
          id,
          name,
          house_code,
          address
        ),
        order_additional_services (
          id,
          quantity,
          unit_price,
          total_price,
          additional_services (
            service_name
          )
        )
      `)
      .eq('id', orderId)
      .single()

    if (orderError || !order) {
      return { data: null, error: orderError || new Error('ไม่พบคำสั่งซื้อ') }
    }

    const now = new Date().toISOString()

    const recipientName =
      (order as any)?.profiles?.display_name ||
      (order as any)?.profiles?.email ||
      'ลูกค้า'
    const recipientPhone = (order as any)?.profiles?.phone || undefined
    const recipientAddress =
      (order as any)?.houses?.address ||
      (order as any)?.profiles?.address ||
      undefined

    const mainDescription =
      (order as any)?.services?.service_name ||
      (order as any)?.services?.service_code ||
      'ค่าบริการ'
    const mainUnitPrice = Number((order as any)?.calculated_price ?? (order as any)?.base_price ?? (order as any)?.total) || 0

    const zoneItems: any[] = [
      {
        id: 'it-001',
        description: mainDescription,
        unit: 'งาน',
        quantity: 1,
        unit_price_material: mainUnitPrice,
        unit_price_labor: 0,
        remark: '',
      },
    ]

    const addons = Array.isArray((order as any)?.order_additional_services)
      ? (order as any).order_additional_services
      : []
    addons.forEach((addon: any, index: number) => {
      zoneItems.push({
        id: `it-${String(index + 2).padStart(3, '0')}`,
        description: addon?.additional_services?.service_name || 'บริการเพิ่มเติม',
        unit: 'งาน',
        quantity: Number(addon?.quantity) || 1,
        unit_price_material: Number(addon?.unit_price) || 0,
        unit_price_labor: 0,
        remark: '',
      })
    })

    const payload: ManualDocumentPayload = {
      kind: 'manual_document',
      doc_type: 'quotation',
      issued_at: now,
      source_order_id: order.id,
      source_customer_id: order.customer_id,
      source_house_id: (order as any)?.house_id || undefined,
      project_name: (order as any)?.services?.service_name || undefined,
      house_name: (order as any)?.houses?.name || (order as any)?.houses?.house_code || undefined,
      recipient: {
        name: recipientName,
        phone: recipientPhone,
        address: recipientAddress,
      },
      zones: [
        {
          id: 'zone-a',
          name: 'ZONE A: งานหลัก',
          categories: [
            {
              id: 'cat-001',
              name: 'รายการจากระบบ',
              items: zoneItems,
            },
          ],
        },
      ],
      show_zones: false,
      conditions: [],
      total: Number((order as any)?.total) || 0,
      show_overhead: false,
      show_vat: false,
    }

    const { data, error } = await insertDocumentWithCodeRetry({
      prefix: 'Q',
      buildRow: (document_code) => ({
        user_id: order.customer_id,
        order_id: order.id,
        type: 'quotation',
        document_code,
        status: 'generated',
        generated_at: now,
        description: JSON.stringify({
          ...payload,
          document_code,
        }),
      }),
    })

    return { data: data as any, error }
  } catch (error) {
    return { data: null, error }
  }
}

// ============================================================================
// AUDIT LOG FUNCTIONS - UPDATED FOR NEW SCHEMA
// ============================================================================

export const getAuditLogs = async (limit: number = 100): Promise<{ data: AuditLog[], error: any }> => {
  try {
    const { data, error } = await supabase
      .from('audit_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit)
    return { data: data || [], error }
  } catch (error) {
    return { data: [], error }
  }
}

export const createAuditLog = async (action: string, details: any): Promise<{ data: AuditLog | null, error: any }> => {
  try {
    const user = await getCurrentUser()
    const { data, error } = await supabase
      .from('audit_logs')
      .insert({
        user_id: user?.id,
        user_email: user?.email,
        action,
        details
      })
      .select()
      .single()
    return { data, error }
  } catch (error) {
    return { data: null, error }
  }
}

// ============================================================================
// NOTIFICATION FUNCTIONS - NEW FOR UPDATED SCHEMA
// ============================================================================

export const getNotifications = async (userId: string): Promise<{ data: Notification[], error: any }> => {
  try {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(50)

    return { data: data || [], error }
  } catch (error) {
    return { data: [], error }
  }
}

export const getUnreadNotificationCount = async (userId: string): Promise<{ data: number, error: any }> => {
  try {
    const { count, error } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('read', false)

    return { data: count || 0, error }
  } catch (error) {
    return { data: 0, error }
  }
}

export const markNotificationAsRead = async (notificationId: string): Promise<{ data: Notification | null, error: any }> => {
  try {
    const { data, error } = await supabase
      .from('notifications')
      .update({ 
        read: true, 
        read_at: new Date().toISOString() 
      })
      .eq('id', notificationId)
      .select()
      .single()

    return { data, error }
  } catch (error) {
    return { data: null, error }
  }
}

export const markAllNotificationsAsRead = async (userId: string): Promise<{ data: any, error: any }> => {
  try {
    const { data, error } = await supabase
      .from('notifications')
      .update({ 
        read: true, 
        read_at: new Date().toISOString() 
      })
      .eq('user_id', userId)
      .eq('read', false)

    return { data, error }
  } catch (error) {
    return { data: null, error }
  }
}

type NotificationCreatePayload = Partial<Notification> & Record<string, unknown>

export const createNotification = async (notification: NotificationCreatePayload): Promise<{ data: Notification | null, error: any }> => {
  try {
    if (typeof window !== 'undefined') {
      const {
        data: { session },
      } = await supabase.auth.getSession()

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      }

      if (session?.access_token) {
        headers.Authorization = `Bearer ${session.access_token}`
      }

      const response = await fetch('/api/notifications/send', {
        method: 'POST',
        headers,
        credentials: 'include',
        body: JSON.stringify(notification),
      })

      const result = await response.json().catch(() => ({}))
      if (!response.ok) {
        return { data: null, error: new Error(result?.error || response.statusText) }
      }

      return { data: (result?.notification || null) as Notification | null, error: null }
    }

    const { data, error } = await supabase
      .from('notifications')
      .insert(notification)
      .select()
      .single()

    return { data, error }
  } catch (error) {
    return { data: null, error }
  }
}

export const createNotificationWithRetry = async (
  notification: NotificationCreatePayload,
  options?: { maxAttempts?: number; retryDelayMs?: number; context?: string }
): Promise<{ data: Notification | null, error: any; attempts: number }> => {
  const maxAttempts = Math.max(1, options?.maxAttempts ?? 3)
  const retryDelayMs = Math.max(0, options?.retryDelayMs ?? 300)

  let lastError: any = null

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const { data, error } = await createNotification(notification)
    if (!error && data) {
      return { data, error: null, attempts: attempt }
    }

    lastError = error

    if (attempt < maxAttempts) {
      await new Promise((resolve) => setTimeout(resolve, retryDelayMs * attempt))
    }
  }

  try {
    await createAuditLog('notification_delivery_failed', {
      context: options?.context || 'unknown',
      notification,
      error: lastError?.message || String(lastError),
      attempts: maxAttempts,
    })
  } catch {}

  return { data: null, error: lastError, attempts: maxAttempts }
}

// ============================================================================
// STATISTICS FUNCTIONS - UPDATED FOR NEW SCHEMA
// ============================================================================

export const getCustomerCount = async (): Promise<{ data: number, error: any }> => {
  try {
    const { count, error } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .eq('role', 'customer')

    return { data: count || 0, error }
  } catch (error) {
    return { data: 0, error }
  }
}

export const getStaffCount = async (): Promise<{ data: number, error: any }> => {
  try {
    const { count, error } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .eq('role', 'staff')

    return { data: count || 0, error }
  } catch (error) {
    return { data: 0, error }
  }
}

export const getTotalOrders = async (): Promise<{ data: number, error: any }> => {
  try {
    const { count, error } = await supabase
      .from('orders')
      .select('*', { count: 'exact', head: true })

    return { data: count || 0, error }
  } catch (error) {
    return { data: 0, error }
  }
}

export const getPendingMeasurementRequests = async (): Promise<{ data: number, error: any }> => {
  try {
    const { count, error } = await supabase
      .from('measurement_requests')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending')

    return { data: count || 0, error }
  } catch (error) {
    return { data: 0, error }
  }
}

// ============================================================================
// ADMIN FUNCTIONS - NEW FOR UPDATED SCHEMA
// ============================================================================

export const createAdminUser = async (email: string, password: string, displayName: string): Promise<{ data: any, error: any }> => {
  try {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: displayName,
          role: 'admin'
        }
      }
    })
    return { data, error }
  } catch (error) {
    return { data: null, error }
  }
}

export const promoteUserToStaff = async (userId: string): Promise<{ data: Profile | null, error: any }> => {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .update({ role: 'staff' })
      .eq('id', userId)
      .select()
      .single()

    return { data, error }
  } catch (error) {
    return { data: null, error }
  }
}

export const promoteUserToAdmin = async (userId: string): Promise<{ data: Profile | null, error: any }> => {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .update({ role: 'admin' })
      .eq('id', userId)
      .select()
      .single()

    return { data, error }
  } catch (error) {
    return { data: null, error }
  }
}

export default supabase
// ============================================================================
// SYSTEM SETTINGS (Admin Config)
// ============================================================================

export interface SystemSetting<T> {
  key: string
  value: T
  description?: string
  updated_at?: string
  updated_by?: string
}

export interface SystemFeatures {
  marketplace_enabled: boolean
  service_booking_enabled: boolean
  new_user_registration: boolean
  maintenance_mode: boolean
}

const toBooleanFeature = (value: unknown, fallback: boolean) => {
  if (typeof value === 'boolean') return value
  if (typeof value === 'number') return value !== 0
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase()
    if (normalized === 'true' || normalized === '1' || normalized === 'yes' || normalized === 'on') return true
    if (normalized === 'false' || normalized === '0' || normalized === 'no' || normalized === 'off') return false
  }
  return fallback
}

const normalizeSystemFeatures = (value: unknown): SystemFeatures => {
  const source = value && typeof value === 'object' ? (value as Record<string, unknown>) : {}
  return {
    marketplace_enabled: toBooleanFeature(source.marketplace_enabled, DEFAULT_SYSTEM_FEATURES.marketplace_enabled),
    service_booking_enabled: toBooleanFeature(source.service_booking_enabled, DEFAULT_SYSTEM_FEATURES.service_booking_enabled),
    new_user_registration: toBooleanFeature(source.new_user_registration, DEFAULT_SYSTEM_FEATURES.new_user_registration),
    maintenance_mode: toBooleanFeature(source.maintenance_mode, DEFAULT_SYSTEM_FEATURES.maintenance_mode),
  }
}

export const DEFAULT_SYSTEM_FEATURES: SystemFeatures = {
  marketplace_enabled: false,
  service_booking_enabled: false,
  new_user_registration: true,
  maintenance_mode: false,
}

export const getSystemSettings = async (): Promise<{ data: any[], error: any }> => {
  try {
    const { data: rows, error } = await supabase
      .from('system_settings')
      .select('*')

    if (error) return { data: [], error }

    return { data: rows || [], error: null }
  } catch (error) {
    return { data: [], error }
  }
}

export const updateSystemSetting = async <T>(key: string, value: T): Promise<{ success: boolean, error: any }> => {
  try {
    // Upsert using key as conflict target
    const { error } = await supabase
      .from('system_settings')
      .upsert({ 
        key: key, 
        value: value,
        updated_at: new Date().toISOString()
      }, { onConflict: 'key' })
      .select()

    if (error) throw error
    return { success: true, error: null }
  } catch (error) {
    return { success: false, error }
  }
}

export const getSystemFeatures = async (): Promise<{ data: SystemFeatures, error: any }> => {
  try {
    if (typeof window !== 'undefined') {
      try {
        const response = await fetch(`/api/system/features?t=${Date.now()}`, {
          method: 'GET',
          cache: 'no-store',
          credentials: 'include',
        })

        const payload = await response.json().catch(() => ({}))
        if (response.ok && payload?.features) {
          return {
            data: normalizeSystemFeatures(payload.features),
            error: null,
          }
        }
      } catch (err) {
        console.error('[getSystemFeatures] Client-side fetch failed:', err)
        // Fallback to direct DB read below.
      }
    }

    const { data: row, error } = await supabase
      .from('system_settings')
      .select('value')
      .eq('key', 'features')
      .maybeSingle()

    if (error) {
      return { data: DEFAULT_SYSTEM_FEATURES, error }
    }

    return {
      data: normalizeSystemFeatures(row?.value),
      error: null,
    }
  } catch (error) {
    return { data: DEFAULT_SYSTEM_FEATURES, error }
  }
}

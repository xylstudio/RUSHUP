import { supabase, type House, type Profile } from './supabaseClient';

export interface HousePlan {
  id: string;
  house_id: string;
  customer_id: string;
  plan_name: string;
  plan_data: any; // SVG paths, shapes, zones, etc.
  created_at: string;
  updated_at: string;
  houses?: House;
  profiles?: Profile;
}

export const getHousePlans = async (customerId?: string): Promise<{ data: HousePlan[], error: any }> => {
  try {
    let query = supabase
      .from('house_plans')
      .select('*, houses(*), profiles(*)');
    
    if (customerId) {
      query = query.eq('customer_id', customerId);
    }
    
    const { data, error } = await query.order('created_at', { ascending: false });
    return { data: data || [], error };
  } catch (error) {
    return { data: [], error };
  }
};

export const getHousePlanByHouseId = async (houseId: string): Promise<{ data: HousePlan | null, error: any }> => {
  try {
    const { data, error } = await supabase
      .from('house_plans')
      .select('*, houses(*), profiles(*)')
      .eq('house_id', houseId)
      .maybeSingle();
    
    return { data, error };
  } catch (error) {
    return { data: null, error };
  }
};

export const saveHousePlan = async (plan: Partial<HousePlan>): Promise<{ data: HousePlan | null, error: any }> => {
  try {
    const { id, ...updates } = plan;
    
    if (id) {
      const { data, error } = await supabase
        .from('house_plans')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      return { data, error };
    } else {
      const { data, error } = await supabase
        .from('house_plans')
        .insert(updates)
        .select()
        .single();
      return { data, error };
    }
  } catch (error) {
    return { data: null, error };
  }
};

export const deleteHousePlan = async (planId: string): Promise<{ error: any }> => {
  try {
    const { error } = await supabase
      .from('house_plans')
      .delete()
      .eq('id', planId);
    return { error };
  } catch (error) {
    return { error };
  }
};

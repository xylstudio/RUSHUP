'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'
import { User } from '@supabase/supabase-js'
import { useSupabase } from '../app/supabase-provider'

type Role = 'customer' | 'staff' | 'admin';

interface Profile {
  id: string;
  email: string;
  role: Role;
  display_name: string;
  phone?: string;
  timezone?: string;
  staff_code?: string;
  customer_base_code?: string;
  branch_code?: string;
  address?: string;
  zip_code?: string;
  department?: string;
  salary_type?: 'fixed' | 'daily' | 'hourly' | 'monthly';
  fixed_salary?: number;
  daily_rate?: number;
  hourly_rate?: number;
  is_verified?: boolean;
  staff_type?: 'cafe' | 'garden';
  shift_start?: string;
  shift_end?: string;
}

interface AuthContextType {
  user: User | null
  profile: Profile | null
  loading: boolean
  refreshProfile: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  loading: true,
  refreshProfile: async () => {},
  signOut: async () => {},
});

const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const { session, loading: supabaseLoading, supabase } = useSupabase();
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchProfile = async (userId: string) => {
    try {
      const { data: profileData, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()

      if (error) {
        console.error('[AuthContext] Error fetching profile:', error);
        setProfile(null);
        return;
      }
      
      if (profileData) {
        setProfile(profileData as Profile);
      } else {
        setProfile(null);
      }
    } catch (e) {
      console.error("[AuthContext] Fatal Error in fetchProfile:", e);
      setProfile(null);
    }
  };

  useEffect(() => {
    if (supabaseLoading) {
      return;
    }

    if (session?.user) {
      fetchProfile(session.user.id).finally(() => setLoading(false));
    } else {
      setProfile(null);
      setLoading(false);
    }
  }, [session, supabaseLoading]);

  const refreshProfile = async () => {
    if (session?.user) {
      await fetchProfile(session.user.id);
    }
  }

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error('Error signing out:', error);
        throw error;
      }
      setProfile(null);
    } catch (error) {
      console.error('Error during sign out:', error);
      throw error;
    }
  }

  const value = {
    user: session?.user || null,
    profile,
    loading,
    refreshProfile,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export { useAuth, AuthProvider }; 
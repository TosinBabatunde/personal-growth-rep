import React, { createContext, useContext, useEffect, useState } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { Database } from '@/types/database';
import { Platform } from 'react-native';

type UserProfile = Database['public']['Tables']['users']['Row'];

interface AuthContextType {
  session: Session | null;
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  updateProfile: (updates: Partial<UserProfile>) => Promise<void>;
  refreshProfile: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const loadUserProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (error) throw error;
      setProfile(data);
    } catch (error) {
      console.error('Error loading profile:', error);
    }
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        loadUserProfile(session.user.id);
      }
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        loadUserProfile(session.user.id);
      } else {
        setProfile(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUpWithEmail = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: undefined,
      },
    });

    if (error) throw error;

    if (data.user) {
      await supabase.from('users').upsert({
        id: data.user.id,
        email: email,
        full_name: '',
      }, { onConflict: 'id' });

      await loadUserProfile(data.user.id);
    }
  };

  const signInWithEmail = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw error;

    if (data.user) {
      await loadUserProfile(data.user.id);
    }
  };

 const signOut = async () => {
  try {
    setLoading(true);

    // Clear local state immediately
    setSession(null);
    setUser(null);
    setProfile(null);

    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  } finally {
    setLoading(false);
  }
};


  const updateProfile = async (updates: Partial<UserProfile>) => {
    if (!user) throw new Error('No user logged in');

    const { error } = await supabase
      .from('users')
      .upsert({
        id: user.id,
        email: user.email || '',
        ...updates,
        updated_at: new Date().toISOString()
      }, { onConflict: 'id' });

    if (error) throw error;
    await loadUserProfile(user.id);
  };

  const refreshProfile = async () => {
    if (user) {
      await loadUserProfile(user.id);
    }
  };

 const resetPassword = async (email: string) => {
  const appUrl =
    process.env.EXPO_PUBLIC_APP_URL ||
    (Platform.OS === 'web' && typeof window !== 'undefined'
      ? window.location.origin
      : undefined);

  const options: { redirectTo?: string } = {};

  if (appUrl) {
    const base = appUrl.replace(/\/$/, '');
    options.redirectTo = `${appUrl}/reset-password`;
  }

  const { error } = await supabase.auth.resetPasswordForEmail(email, options);
  if (error) throw error;
};

  return (
    <AuthContext.Provider
      value={{
        session,
        user,
        profile,
        loading,
        signInWithEmail,
        signUpWithEmail,
        signOut,
        updateProfile,
        refreshProfile,
        resetPassword,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

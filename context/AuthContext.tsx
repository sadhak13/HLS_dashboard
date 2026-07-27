"use client";

import React, { createContext, useContext, useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { UserProfile } from '@/types/app.types';

interface AuthContextType {
  user: any | null;
  profile: UserProfile | null;
  isLoading: boolean;
}

export const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  isLoading: true,
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<any | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    let mounted = true;

    const fetchProfileForUser = async (userId: string) => {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
      return data as UserProfile | null;
    };

    // Subscribe FIRST so we never miss a SIGNED_IN event that fires
    // between getSession() returning and the subscription being attached.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return;

        // TOKEN_REFRESHED fires on tab focus — don't disrupt existing state
        if (event === 'TOKEN_REFRESHED') return;

        const currentUser = session?.user ?? null;
        setUser(currentUser);

        if (currentUser) {
          const profileData = await fetchProfileForUser(currentUser.id);
          if (mounted) setProfile(profileData);
        } else {
          if (mounted) setProfile(null);
        }

        if (mounted) setIsLoading(false);
      }
    );

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!mounted) return;
      if (session?.user) {
        setUser(session.user);
        const profileData = await fetchProfileForUser(session.user.id);
        if (mounted) {
          setProfile(profileData);
          setIsLoading(false);
        }
      } else {
        setUser(null);
        setProfile(null);
        setIsLoading(false);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <AuthContext.Provider value={{ user, profile, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);

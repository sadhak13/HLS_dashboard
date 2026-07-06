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
        const currentUser = session?.user ?? null;
        setUser(currentUser);

        if (currentUser) {
          const profileData = await fetchProfileForUser(currentUser.id);
          if (mounted) setProfile(profileData);
        } else {
          if (mounted) setProfile(null);
        }

        // Always clear the loader once we have a definitive auth state
        if (mounted) setIsLoading(false);
      }
    );

    // Then get the initial session — if there's already a session, onAuthStateChange
    // will also fire with INITIAL_SESSION, so we don't double-set state here.
    // We only need this to handle the case where no event fires at all (no session).
    supabase.auth.getSession().then(({ data: { session } }) => {
      // If onAuthStateChange already fired (isLoading already false), skip.
      // Otherwise set everything from the initial session check.
      if (mounted && session === null) {
        setUser(null);
        setProfile(null);
        setIsLoading(false);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [supabase]);

  return (
    <AuthContext.Provider value={{ user, profile, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);

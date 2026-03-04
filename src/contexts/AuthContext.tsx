import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

interface Profile {
  id: string;
  user_id: string;
  full_name: string | null;
  avatar_url: string | null;
  credits_balance: number;
  auto_topoff_enabled: boolean;
  auto_topoff_threshold: number;
  auto_topoff_amount: number;
  stripe_customer_id: string | null;
  created_at: string;
  updated_at: string;
}

interface SubscriptionState {
  subscribed: boolean;
  product_id: string | null;
  subscription_end: string | null;
  loading: boolean;
}

// Map Stripe product IDs to tier names
const PRODUCT_TIERS: Record<string, string> = {
  'prod_U5QGa4LQQ3FTM5': 'pro',
  'prod_U5QYBgXK9IJhW1': 'pro',
};

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  subscription: SubscriptionState;
  isLoading: boolean;
  tier: string; // 'free' | 'pro' | 'enterprise'
  signUp: (email: string, password: string, fullName?: string) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  refreshSubscription: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [subscription, setSubscription] = useState<SubscriptionState>({
    subscribed: false, product_id: null, subscription_end: null, loading: false,
  });

  const fetchProfile = async (userId: string) => {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("user_id", userId)
      .single();

    if (error) {
      console.error("Error fetching profile:", error);
      return null;
    }
    return data as Profile;
  };

  const refreshProfile = async () => {
    if (user) {
      const profileData = await fetchProfile(user.id);
      setProfile(profileData);
    }
  };

  const refreshSubscription = useCallback(async () => {
    if (!session) return;
    setSubscription(s => ({ ...s, loading: true }));
    try {
      const { data, error } = await supabase.functions.invoke('check-subscription');
      if (!error && data) {
        setSubscription({
          subscribed: data.subscribed || false,
          product_id: data.product_id || null,
          subscription_end: data.subscription_end || null,
          loading: false,
        });
      } else {
        setSubscription(s => ({ ...s, loading: false }));
      }
    } catch {
      setSubscription(s => ({ ...s, loading: false }));
    }
  }, [session]);

  const tier = subscription.product_id
    ? (PRODUCT_TIERS[subscription.product_id] || 'pro')
    : 'free';

  useEffect(() => {
    const { data: { subscription: authSub } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          setTimeout(async () => {
            const profileData = await fetchProfile(session.user.id);
            setProfile(profileData);
          }, 0);
        } else {
          setProfile(null);
          setSubscription({ subscribed: false, product_id: null, subscription_end: null, loading: false });
        }
        setIsLoading(false);
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        fetchProfile(session.user.id).then(setProfile);
      }
      setIsLoading(false);
    });

    return () => authSub.unsubscribe();
  }, []);

  // Check subscription on login and periodically
  useEffect(() => {
    if (session) {
      refreshSubscription();
      const interval = setInterval(refreshSubscription, 60_000);
      return () => clearInterval(interval);
    }
  }, [session, refreshSubscription]);

  const signUp = async (email: string, password: string, fullName?: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: window.location.origin,
        data: { full_name: fullName },
      },
    });
    return { error };
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setProfile(null);
    setSubscription({ subscribed: false, product_id: null, subscription_end: null, loading: false });
  };

  return (
    <AuthContext.Provider
      value={{
        user, session, profile, subscription, isLoading, tier,
        signUp, signIn, signOut, refreshProfile, refreshSubscription,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

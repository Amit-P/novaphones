import React, { createContext, useContext, useEffect, useState } from 'react';
import type { RecordModel } from 'pocketbase';
import { pb } from '@/integrations/pocketbase/client';

interface AuthContextType {
  user: RecordModel | null;
  signOut: () => Promise<void>;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<RecordModel | null>(pb.authStore.record);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // PocketBase persists the session in localStorage. onChange with the second
    // arg `true` fires immediately with the current auth, so we don't need a
    // separate getSession() call like we did with Supabase.
    const unsubscribe = pb.authStore.onChange((_token, record) => {
      setUser(record);
      setLoading(false);
    }, true);

    return () => unsubscribe();
  }, []);

  const signOut = async () => {
    pb.authStore.clear();
  };

  const value = {
    user,
    signOut,
    loading,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

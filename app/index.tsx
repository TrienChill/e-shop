// app/index.tsx
import { supabase } from '@/src/lib/supabase';
import { Session } from '@supabase/supabase-js';
import { Redirect, useRootNavigationState } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';

export default function Index() {
  const rootNavigationState = useRootNavigationState();
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Kiểm tra xem hệ thống navigation đã sẵn sàng chưa
  if (!rootNavigationState?.key || loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return <Redirect href={(session ? '/(tabs)' : '/(auth)/login') as any} />;
}
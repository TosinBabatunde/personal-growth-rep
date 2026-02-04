import React, { useEffect, useRef } from 'react';
import { Tabs, Redirect, useRouter } from 'expo-router';
import { Platform, View, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/contexts/AuthContext';
import { Home, MessageCircle, TrendingUp, User, Info } from 'lucide-react-native';

export default function TabLayout() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, profile, loading } = useAuth();

  // Prevent double redirect loops
  const redirectedRef = useRef(false);

  // ✅ Redirect new/returning users who haven't seen About yet
  useEffect(() => {
    if (loading) return;
    if (!user?.id) return;
    if (!profile?.id) return;

    const needsAbout = !profile.about_seen_at;

    if (needsAbout && !redirectedRef.current) {
      redirectedRef.current = true;
      router.replace('/about');
    }
  }, [loading, user?.id, profile?.id, profile?.about_seen_at, router]);

  // Wait for auth to initialize
  if (loading) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: '#FFFFFF',
        }}
      >
        <ActivityIndicator size="large" color="#FF6B6B" />
      </View>
    );
  }

  // Block tabs if logged out
  if (!user) {
    return <Redirect href="/(auth)/sign-in" />;
  }

  // Comprehensive bottom-bar fix:
  const BASE_HEIGHT = 64;
  const EXTRA_WEB_PADDING = Platform.OS === 'web' ? 12 : 0;
  const bottomPadding = Math.max(12, insets.bottom) + EXTRA_WEB_PADDING;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#FF6B6B',
        tabBarInactiveTintColor: '#9CA3AF',
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopWidth: 1,
          borderTopColor: '#E5E7EB',
          paddingTop: 8,
          paddingBottom: bottomPadding,
          height: BASE_HEIGHT + bottomPadding,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
          lineHeight: 12,
          marginTop: 2,
          paddingBottom: 2,
        },
        tabBarIconStyle: {
          marginTop: 2,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ size, color }) => <Home size={size} color={color} />,
        }}
      />

      <Tabs.Screen
        name="feedback"
        options={{
          title: 'Feedback',
          tabBarIcon: ({ size, color }) => (
            <MessageCircle size={size} color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="growth"
        options={{
          title: 'Growth',
          tabBarIcon: ({ size, color }) => (
            <TrendingUp size={size} color={color} />
          ),
        }}
      />
      
      <Tabs.Screen
        name="about"
        options={{
          title: 'About',
          tabBarIcon: ({ size, color }) => (
            <Info size={size} color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ size, color }) => <User size={size} color={color} />,
        }}
      />
    </Tabs>
  );
}

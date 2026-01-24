import React from 'react';
import { Tabs, Redirect } from 'expo-router';
import { Platform, View, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/contexts/AuthContext';
import { Home, MessageCircle, TrendingUp, User } from 'lucide-react-native';

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  const { user, loading } = useAuth();

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
  // - Always pad by safe-area inset
  // - Add a small extra buffer (helps with mobile browser bottom chrome on web)
  // - Keep a consistent base height across platforms
  const BASE_HEIGHT = 64; // visual height of the bar (icons + labels)
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
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ size, color }) => <User size={size} color={color} />,
        }}
      />
    </Tabs>
  );
}

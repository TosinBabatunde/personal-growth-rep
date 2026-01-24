import { Tabs, Redirect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/contexts/AuthContext';
import { Home, MessageCircle, TrendingUp, User } from 'lucide-react-native';
import { Platform, View, ActivityIndicator } from 'react-native';

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  const { user, loading } = useAuth();

  // STEP 4: wait for auth to initialize
  if (loading) {
    return (
     <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FFFFFF' }}>
        <ActivityIndicator size="large" color="#FF6B6B" />
      </View>
    );
  }

  // STEP 4: block tabs if logged out
  if (!user) {
    return <Redirect href="/(auth)/sign-in" />;
  }

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
        paddingBottom: Math.max(12, insets.bottom + (Platform.OS === 'ios' ? 8 : 0)),
        height: (Platform.OS === 'ios' ? 84 : 70) + insets.bottom,
      },
      tabBarLabelStyle: {
        fontSize: 11,
        fontWeight: '600',
        lineHeight: 12,
        marginTop: 2,
        paddingBottom: Platform.OS === 'ios' ? 0 : 2,
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

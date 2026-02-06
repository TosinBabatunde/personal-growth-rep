import React from 'react';
import { Platform } from 'react-native';
import { Stack, Head } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useFrameworkReady } from '@/hooks/useFrameworkReady';
import { AuthProvider } from '@/contexts/AuthContext';

export const unstable_settings = {
  title: "Growth Feedback App",
};

// Web-only CSS to fix 100vh / browser bottom chrome issues (iOS Safari + Android Chrome)
if (Platform.OS === 'web') {
  require('./+web.css');
}

export default function RootLayout() {
  useFrameworkReady();

  return (
    <SafeAreaProvider>
      <AuthProvider>
        
        {/* Web tab title (guaranteed) */}
        <Head>
          <title>Growth Feedback App</title>
        </Head>
        
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="(auth)" />
          <Stack.Screen name="(tabs)" />
          <Stack.Screen
            name="feedback"
            options={{
              headerShown: false,
              presentation: 'card',
            }}
          />
          <Stack.Screen name="+not-found" />
        </Stack>
        <StatusBar style="auto" />
      </AuthProvider>
    </SafeAreaProvider>
  );
}

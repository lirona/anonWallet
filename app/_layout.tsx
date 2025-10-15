import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, useRouter, usePathname } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import 'react-native-reanimated';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Provider } from 'react-redux';
import '../polyfills';

import { useColorScheme } from '@/hooks/use-color-scheme';
import store from '@/utils/store';
import { useAppInitializer } from '@/components/AppInitializer';
import { useAppSlice } from '@/slices';

function RootLayoutNav() {
  const { isLoading } = useAppInitializer();
  const { loggedIn } = useAppSlice();
  const pathname = usePathname();
  const router = useRouter();
  const colorScheme = useColorScheme();

  useEffect(() => {
    if (isLoading) return;

    // Simple redirect logic:
    // If logged in and on landing page → go to wallet-home
    // If logged out and NOT on landing page → go to landing
    if (loggedIn && pathname === '/') {
      router.replace('/wallet-home');
    } else if (!loggedIn && pathname !== '/') {
      router.replace('/');
    }
  }, [loggedIn, pathname, isLoading, router]);

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#1C2A3A' }}>
        <ActivityIndicator size="large" color="#E78123" />
      </View>
    );
  }

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack screenOptions={{ headerShown: false }}>
        {/* Expo Router auto-discovers all routes in app/ folder */}
      </Stack>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}

export default function RootLayout() {
  return (
    <Provider store={store}>
      <SafeAreaProvider>
        <RootLayoutNav />
      </SafeAreaProvider>
    </Provider>
  );
}

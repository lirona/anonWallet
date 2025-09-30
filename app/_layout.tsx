import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Provider } from 'react-redux';
import '../polyfills';

import { useColorScheme } from '@/hooks/use-color-scheme';
import store from '@/utils/store';

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <Provider store={store}>
      <SafeAreaProvider>
        <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
          <Stack screenOptions={{ headerShown: false }}>
            {/* Expo Router auto-discovers all routes in app/ folder */}
          </Stack>
          <StatusBar style="auto" />
        </ThemeProvider>
      </SafeAreaProvider>
    </Provider>
  );
}

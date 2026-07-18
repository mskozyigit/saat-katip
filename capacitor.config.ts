import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.saatkatip.app',
  appName: 'Saat Katip',
  webDir: 'dist',
  server: {
    // Mobilde Supabase OAuth redirect için custom URL scheme
    // Android'de androidScheme, iOS'te iosScheme kullanılır
    androidScheme: 'https',
    iosScheme: 'https',
  },
  plugins: {
    // Supabase OAuth için gerekli Capacitor eklentileri
    // (ileride eklenecek)
  },
};

export default config;

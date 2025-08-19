import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.szakacsmedia.artrio',
  appName: 'Artrio',
  webDir: 'dist',
  server: {
    iosScheme: 'capacitor',
    androidScheme: 'https'
  },
  ios: {
    preferredContentMode: 'mobile',
    backgroundColor: '#ffffff',
    contentInset: 'automatic',
    scrollEnabled: false,
    allowsLinkPreview: false,
    overrideUserAgent: 'Artrio iOS App',
    limitsNavigationsToAppBoundDomains: false
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 500, // Show briefly while app loads
      launchAutoHide: true,
      backgroundColor: "#ffffff",
      androidSplashResourceName: "splash",
      androidScaleType: "CENTER_CROP",
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: true,
      iosSpinnerStyle: "small",
      spinnerColor: "#1BA0CC"
    },
    Keyboard: {
      resize: 'body',
      style: 'dark',
      resizeOnFullScreen: true
    },
    Camera: {
      permissions: ['camera', 'photos']
    }
  },
};

export default config;
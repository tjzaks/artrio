import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.artrio.artrio',
  appName: 'Artrio',
  webDir: 'dist',
  server: {
    // IMPORTANT: 'capacitor' works on real devices, 'ionic' works in simulator
    // Using 'capacitor' for real device testing (simulators are unreliable)
    iosScheme: 'capacitor',
    androidScheme: 'https',
    // Allow connections to Supabase from iOS
    allowNavigation: ['*'],
    // For localhost development - uncomment these
    // url: 'http://localhost:8100',
    // cleartext: true
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
      launchShowDuration: 0, // Don't auto-hide, let the app control it
      launchAutoHide: false, // Manually hide when React is ready
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
    },
    Media: {
      // Instagram-style photo access configuration
      presentLimitedLibraryPicker: false,
      sortByCreationDate: true,
      // Don't show the annoying limited access alert
      preventAutomaticLimitedAccessAlert: true
    }
  },
};

export default config;
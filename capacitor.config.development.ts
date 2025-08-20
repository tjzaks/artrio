import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.szakacsmedia.artrio',
  appName: 'Artrio',
  webDir: 'dist',
  server: {
    // Use local server for development/simulator
    url: 'http://localhost:5173',
    cleartext: true,
    allowNavigation: ['*']
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
      launchShowDuration: 0,
      launchAutoHide: false,
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
      presentLimitedLibraryPicker: false,
      sortByCreationDate: true,
      preventAutomaticLimitedAccessAlert: true
    }
  },
};

export default config;
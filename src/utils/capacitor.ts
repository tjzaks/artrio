import { Capacitor } from '@capacitor/core';
import { SplashScreen } from '@capacitor/splash-screen';
import { StatusBar } from '@capacitor/status-bar';
import { Keyboard } from '@capacitor/keyboard';

export const initializeApp = async () => {
  if (!Capacitor.isNativePlatform()) {
    return;
  }

  try {
    // DON'T hide splash screen here - let the React app control it
    // The native splash will stay visible until React is ready
    
    if (Capacitor.getPlatform() === 'ios') {
      // Configure status bar for iOS
      await StatusBar.setStyle({ style: 'dark' });
      // CRITICAL: Don't overlay content - push it down instead
      await StatusBar.setOverlaysWebView({ overlay: false });
      
      // Configure keyboard for iOS
      await Keyboard.setAccessoryBarVisible({ isVisible: false });
      await Keyboard.setScroll({ isDisabled: true });
      await Keyboard.setResizeMode({ mode: 'body' });
    }
  } catch (error) {
    console.error('Error initializing native app:', error);
  }
};

// Separate function to hide splash when app is ready
export const hideSplashScreen = async () => {
  if (Capacitor.isNativePlatform()) {
    try {
      await SplashScreen.hide();
    } catch (error) {
      console.error('Error hiding splash screen:', error);
    }
  }
};

export const isNativePlatform = () => Capacitor.isNativePlatform();
export const getPlatform = () => Capacitor.getPlatform();
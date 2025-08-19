import { Capacitor } from '@capacitor/core';
import { SplashScreen } from '@capacitor/splash-screen';
import { StatusBar } from '@capacitor/status-bar';
import { Keyboard } from '@capacitor/keyboard';

export const initializeApp = async () => {
  if (!Capacitor.isNativePlatform()) {
    return;
  }

  try {
    // Hide splash screen immediately since we have our own
    await SplashScreen.hide();

    if (Capacitor.getPlatform() === 'ios') {
      // Configure status bar for iOS
      await StatusBar.setStyle({ style: 'dark' });
      
      // Configure keyboard for iOS
      await Keyboard.setAccessoryBarVisible({ isVisible: false });
      await Keyboard.setScroll({ isDisabled: true });
      await Keyboard.setResizeMode({ mode: 'body' });
    }
  } catch (error) {
    console.error('Error initializing native app:', error);
  }
};

export const isNativePlatform = () => Capacitor.isNativePlatform();
export const getPlatform = () => Capacitor.getPlatform();
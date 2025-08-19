import { useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { StatusBar } from '@capacitor/status-bar';
import { SplashScreen } from '@capacitor/splash-screen';

const IOSLoader = () => {
  useEffect(() => {
    const initializeApp = async () => {
      if (Capacitor.isNativePlatform()) {
        try {
          // Hide the native splash screen
          await SplashScreen.hide();
          
          // Set status bar for iOS
          if (Capacitor.getPlatform() === 'ios') {
            await StatusBar.setStyle({ style: 'dark' });
            await StatusBar.setBackgroundColor({ color: '#000000' });
          }
        } catch (error) {
          console.error('Error initializing app:', error);
        }
      }
    };

    initializeApp();
  }, []);

  return (
    <div className="fixed inset-0 bg-black flex items-center justify-center">
      <div className="text-white">Loading Artrio...</div>
    </div>
  );
};

export default IOSLoader;
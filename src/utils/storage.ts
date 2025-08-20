// Minimal storage compatibility layer for iOS
// Only wraps critical auth-related storage calls

const storage = {
  getItem: async (key: string): Promise<string | null> => {
    if (typeof window !== 'undefined' && (window as any).Capacitor) {
      const { Preferences } = await import('@capacitor/preferences');
      const result = await Preferences.get({ key });
      return result.value || null;
    }
    return localStorage.getItem(key);
  },
  
  setItem: async (key: string, value: string): Promise<void> => {
    if (typeof window !== 'undefined' && (window as any).Capacitor) {
      const { Preferences } = await import('@capacitor/preferences');
      await Preferences.set({ key, value });
      return;
    }
    localStorage.setItem(key, value);
  },
  
  removeItem: async (key: string): Promise<void> => {
    if (typeof window !== 'undefined' && (window as any).Capacitor) {
      const { Preferences } = await import('@capacitor/preferences');
      await Preferences.remove({ key });
      return;
    }
    localStorage.removeItem(key);
  }
};

export default storage;
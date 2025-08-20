// Minimal storage compatibility layer for iOS
// Only wraps critical auth-related storage calls

const storage = {
  getItem: async (key: string): Promise<string | null> => {
    // For now, just use localStorage - we'll handle Capacitor later if needed
    if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
      return localStorage.getItem(key);
    }
    return null;
  },
  
  setItem: async (key: string, value: string): Promise<void> => {
    // For now, just use localStorage - we'll handle Capacitor later if needed
    if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
      localStorage.setItem(key, value);
    }
  },
  
  removeItem: async (key: string): Promise<void> => {
    // For now, just use localStorage - we'll handle Capacitor later if needed
    if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
      localStorage.removeItem(key);
    }
  }
};

export default storage;
import React, { createContext, useContext, useState, ReactNode } from 'react';

interface SwipeBackContextType {
  isSwipeBackDisabled: boolean;
  disableSwipeBack: () => void;
  enableSwipeBack: () => void;
  temporarilyDisableSwipeBack: (callback: () => void | Promise<void>) => Promise<void>;
}

const SwipeBackContext = createContext<SwipeBackContextType | undefined>(undefined);

export const SwipeBackProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isSwipeBackDisabled, setIsSwipeBackDisabled] = useState(false);

  const disableSwipeBack = () => {
    setIsSwipeBackDisabled(true);
  };

  const enableSwipeBack = () => {
    setIsSwipeBackDisabled(false);
  };

  const temporarilyDisableSwipeBack = async (callback: () => void | Promise<void>) => {
    setIsSwipeBackDisabled(true);
    try {
      await callback();
    } finally {
      setIsSwipeBackDisabled(false);
    }
  };

  return (
    <SwipeBackContext.Provider
      value={{
        isSwipeBackDisabled,
        disableSwipeBack,
        enableSwipeBack,
        temporarilyDisableSwipeBack,
      }}
    >
      {children}
    </SwipeBackContext.Provider>
  );
};

export const useSwipeBackContext = () => {
  const context = useContext(SwipeBackContext);
  if (context === undefined) {
    // Return a default implementation if context is not available
    return {
      isSwipeBackDisabled: false,
      disableSwipeBack: () => {},
      enableSwipeBack: () => {},
      temporarilyDisableSwipeBack: async (callback: () => void | Promise<void>) => {
        await callback();
      },
    };
  }
  return context;
};
import React, { ComponentType } from 'react';
import { SwipeBackContainer } from './SwipeBackContainer';
import { useLocation } from 'react-router-dom';

interface WithSwipeBackOptions {
  disabled?: boolean;
  disabledPaths?: string[];
}

export function withSwipeBack<P extends object>(
  Component: ComponentType<P>,
  options?: WithSwipeBackOptions
) {
  return (props: P) => {
    const location = useLocation();
    
    // Check if swipe back should be disabled for this path
    const isDisabled = options?.disabled || 
      options?.disabledPaths?.includes(location.pathname) || 
      false;
    
    return (
      <SwipeBackContainer disabled={isDisabled}>
        <Component {...props} />
      </SwipeBackContainer>
    );
  };
}
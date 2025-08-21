import React, { useEffect, useRef } from 'react';
import { Capacitor } from '@capacitor/core';

interface SwipeableToastProps {
  children: React.ReactNode;
  onDismiss?: () => void;
}

export const SwipeableToast: React.FC<SwipeableToastProps> = ({ children, onDismiss }) => {
  const toastRef = useRef<HTMLDivElement>(null);
  const swipeStartRef = useRef<{ x: number; y: number; time: number } | null>(null);
  
  // Check if we're on iOS
  const isIOS = () => {
    return Capacitor.getPlatform() === 'ios';
  };

  useEffect(() => {
    // Enable swipe on all platforms for toasts
    const element = toastRef.current;
    if (!element) return;

    let currentY = 0;
    let isDragging = false;

    const handleTouchStart = (e: TouchEvent) => {
      const touch = e.touches[0];
      swipeStartRef.current = {
        x: touch.clientX,
        y: touch.clientY,
        time: Date.now()
      };
      isDragging = true;
      currentY = 0;
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!swipeStartRef.current || !isDragging) return;
      
      const touch = e.touches[0];
      const deltaY = touch.clientY - swipeStartRef.current.y;
      
      // Only allow upward swipe (negative deltaY)
      if (deltaY < 0) {
        e.preventDefault();
        currentY = deltaY;
        element.style.transform = `translateY(${deltaY}px)`;
        element.style.opacity = `${Math.max(0, 1 + deltaY / 100)}`;
      }
    };

    const handleTouchEnd = (e: TouchEvent) => {
      if (!swipeStartRef.current || !isDragging) return;
      
      const touch = e.changedTouches[0];
      const deltaY = touch.clientY - swipeStartRef.current.y;
      const deltaTime = Date.now() - swipeStartRef.current.time;
      const velocity = Math.abs(deltaY) / deltaTime;
      
      // If swiped up more than 50px or with high velocity, dismiss
      if (deltaY < -50 || (deltaY < -20 && velocity > 0.3)) {
        element.style.transition = 'all 0.2s ease-out';
        element.style.transform = 'translateY(-100%)';
        element.style.opacity = '0';
        
        setTimeout(() => {
          onDismiss?.();
        }, 200);
      } else {
        // Snap back
        element.style.transition = 'all 0.2s ease-out';
        element.style.transform = 'translateY(0)';
        element.style.opacity = '1';
      }
      
      isDragging = false;
      swipeStartRef.current = null;
    };

    element.addEventListener('touchstart', handleTouchStart, { passive: false });
    element.addEventListener('touchmove', handleTouchMove, { passive: false });
    element.addEventListener('touchend', handleTouchEnd, { passive: false });

    return () => {
      element.removeEventListener('touchstart', handleTouchStart);
      element.removeEventListener('touchmove', handleTouchMove);
      element.removeEventListener('touchend', handleTouchEnd);
    };
  }, [onDismiss]);

  return (
    <div ref={toastRef} className="swipeable-toast">
      {children}
    </div>
  );
};
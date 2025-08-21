import { useEffect, useRef, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';
import { useSwipeBackContext } from '@/contexts/SwipeBackContext';

interface SwipeState {
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
  isDragging: boolean;
  startTime: number;
}

export const useSwipeBack = (options?: {
  disabled?: boolean;
  onSwipeStart?: () => void;
  onSwipeMove?: (progress: number) => void;
  onSwipeEnd?: (completed: boolean) => void;
  onSwipeCancel?: () => void;
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isSwipeBackDisabled } = useSwipeBackContext();
  const [swipeProgress, setSwipeProgress] = useState(0);
  const [isSwipingBack, setIsSwipingBack] = useState(false);
  const swipeStateRef = useRef<SwipeState>({
    startX: 0,
    startY: 0,
    currentX: 0,
    currentY: 0,
    isDragging: false,
    startTime: 0,
  });

  // Configuration
  const EDGE_THRESHOLD = 20; // pixels from left edge to start swipe
  const SWIPE_THRESHOLD = 0.35; // 35% of screen width to trigger navigation
  const VELOCITY_THRESHOLD = 0.3; // pixels per millisecond
  const MIN_SWIPE_DISTANCE = 50; // minimum pixels to consider it a swipe
  const VERTICAL_TOLERANCE = 30; // degrees from horizontal to still count as horizontal swipe

  // Check if we're on a root path (shouldn't allow back navigation)
  const isRootPath = () => {
    const rootPaths = ['/', '/auth', '/reset-password'];
    return rootPaths.includes(location.pathname);
  };

  // Check if we're on iOS platform
  const isIOS = () => {
    return Capacitor.getPlatform() === 'ios';
  };

  useEffect(() => {
    // Only enable on iOS and non-root paths, and when not globally disabled
    if (!isIOS() || options?.disabled || isSwipeBackDisabled || isRootPath()) {
      return;
    }

    const handleTouchStart = (e: TouchEvent) => {
      const touch = e.touches[0];
      const startX = touch.clientX;
      const startY = touch.clientY;

      // Only start tracking if touch starts near left edge
      if (startX <= EDGE_THRESHOLD) {
        swipeStateRef.current = {
          startX,
          startY,
          currentX: startX,
          currentY: startY,
          isDragging: true,
          startTime: Date.now(),
        };
        setIsSwipingBack(true);
        options?.onSwipeStart?.();
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      const state = swipeStateRef.current;
      if (!state.isDragging) return;

      const touch = e.touches[0];
      const currentX = touch.clientX;
      const currentY = touch.clientY;

      // Calculate angle of swipe
      const deltaX = currentX - state.startX;
      const deltaY = currentY - state.startY;
      const angle = Math.abs(Math.atan2(deltaY, deltaX) * 180 / Math.PI);

      // Check if swipe is mostly horizontal
      if (angle > VERTICAL_TOLERANCE && angle < (180 - VERTICAL_TOLERANCE)) {
        // Too vertical, cancel the swipe
        handleTouchCancel();
        return;
      }

      // Only process right swipes (positive deltaX)
      if (deltaX > 0) {
        state.currentX = currentX;
        state.currentY = currentY;

        // Calculate progress (0 to 1)
        const screenWidth = window.innerWidth;
        const progress = Math.min(deltaX / screenWidth, 1);
        setSwipeProgress(progress);
        options?.onSwipeMove?.(progress);

        // Prevent default to stop page scrolling during swipe
        if (deltaX > 10) {
          e.preventDefault();
        }
      }
    };

    const handleTouchEnd = (e: TouchEvent) => {
      const state = swipeStateRef.current;
      if (!state.isDragging) return;

      const deltaX = state.currentX - state.startX;
      const deltaTime = Date.now() - state.startTime;
      const velocity = deltaX / deltaTime;
      const screenWidth = window.innerWidth;
      const progress = deltaX / screenWidth;

      // Determine if we should complete the navigation
      const shouldNavigateBack = 
        (progress >= SWIPE_THRESHOLD) || 
        (velocity >= VELOCITY_THRESHOLD && deltaX >= MIN_SWIPE_DISTANCE);

      if (shouldNavigateBack) {
        // Trigger navigation
        navigate(-1);
        options?.onSwipeEnd?.(true);
      } else {
        // Cancel and snap back
        options?.onSwipeEnd?.(false);
      }

      // Reset state
      resetSwipeState();
    };

    const handleTouchCancel = () => {
      if (swipeStateRef.current.isDragging) {
        options?.onSwipeCancel?.();
        resetSwipeState();
      }
    };

    const resetSwipeState = () => {
      swipeStateRef.current = {
        startX: 0,
        startY: 0,
        currentX: 0,
        currentY: 0,
        isDragging: false,
        startTime: 0,
      };
      setSwipeProgress(0);
      setIsSwipingBack(false);
    };

    // Add event listeners
    document.addEventListener('touchstart', handleTouchStart, { passive: false });
    document.addEventListener('touchmove', handleTouchMove, { passive: false });
    document.addEventListener('touchend', handleTouchEnd, { passive: false });
    document.addEventListener('touchcancel', handleTouchCancel, { passive: false });

    // Cleanup
    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
      document.removeEventListener('touchcancel', handleTouchCancel);
    };
  }, [navigate, location.pathname, options?.disabled, isSwipeBackDisabled]);

  return {
    swipeProgress,
    isSwipingBack,
  };
};
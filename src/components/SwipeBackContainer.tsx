import React, { ReactNode, useState, useEffect } from 'react';
import { useSwipeBack } from '@/hooks/useSwipeBack';
import { motion, AnimatePresence } from 'framer-motion';

interface SwipeBackContainerProps {
  children: ReactNode;
  disabled?: boolean;
}

export const SwipeBackContainer: React.FC<SwipeBackContainerProps> = ({ 
  children, 
  disabled = false 
}) => {
  const [translateX, setTranslateX] = useState(0);
  const [opacity, setOpacity] = useState(1);
  const [showShadow, setShowShadow] = useState(false);
  
  const { swipeProgress, isSwipingBack } = useSwipeBack({
    disabled,
    onSwipeStart: () => {
      setShowShadow(true);
    },
    onSwipeMove: (progress) => {
      // Calculate translation based on progress
      const screenWidth = window.innerWidth;
      const translation = progress * screenWidth;
      setTranslateX(translation);
      
      // Fade out slightly as we swipe
      const newOpacity = 1 - (progress * 0.3);
      setOpacity(newOpacity);
    },
    onSwipeEnd: (completed) => {
      if (!completed) {
        // Animate back to original position
        setTranslateX(0);
        setOpacity(1);
        setTimeout(() => setShowShadow(false), 300);
      }
    },
    onSwipeCancel: () => {
      setTranslateX(0);
      setOpacity(1);
      setShowShadow(false);
    }
  });

  // Reset when not swiping
  useEffect(() => {
    if (!isSwipingBack) {
      setTranslateX(0);
      setOpacity(1);
      setShowShadow(false);
    }
  }, [isSwipingBack]);

  return (
    <div className="relative w-full h-full overflow-hidden">
      <motion.div
        className="w-full h-full"
        animate={{
          x: translateX,
          opacity: opacity,
        }}
        transition={{
          type: "spring",
          stiffness: 300,
          damping: 30,
          duration: 0.3
        }}
        style={{
          willChange: 'transform',
        }}
      >
        {children}
      </motion.div>
      
      {/* Edge shadow/indicator when swiping */}
      <AnimatePresence>
        {showShadow && (
          <motion.div
            className="absolute left-0 top-0 h-full w-1 bg-gradient-to-r from-black/20 to-transparent pointer-events-none z-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: swipeProgress }}
            exit={{ opacity: 0 }}
            style={{
              width: '20px',
            }}
          />
        )}
      </AnimatePresence>
      
      {/* Visual feedback for edge detection zone (only in debug mode) */}
      {process.env.NODE_ENV === 'development' && (
        <div 
          className="absolute left-0 top-0 h-full pointer-events-none z-50"
          style={{
            width: '20px',
            background: isSwipingBack 
              ? 'linear-gradient(90deg, rgba(59, 130, 246, 0.1) 0%, transparent 100%)' 
              : 'transparent',
            transition: 'background 0.2s'
          }}
        />
      )}
    </div>
  );
};
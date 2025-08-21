import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface SplashScreenProps {
  onComplete: () => void;
}

const SplashScreen = ({ onComplete }: SplashScreenProps) => {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    // Show splash for 1.5 seconds (animation duration)
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(onComplete, 200); // Wait for fade out animation
    }, 1500);

    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden bg-white"
        >
          {/* Three bars growing from baseline */}
          <div className="flex items-end justify-center gap-4" style={{ height: '200px' }}>
            {/* Red bar (leftmost) - starts first */}
            <motion.div
              className="w-12 rounded-full"
              style={{ backgroundColor: '#E94F37' }}
              initial={{ height: 0 }}
              animate={{ height: '200px' }}
              transition={{
                duration: 0.8,
                ease: "easeOut"
              }}
            />
            
            {/* Green bar (middle) - starts at 75% of red bar */}
            <motion.div
              className="w-12 rounded-full"
              style={{ backgroundColor: '#22B14C' }}
              initial={{ height: 0 }}
              animate={{ height: '200px' }}
              transition={{
                duration: 0.8,
                delay: 0.6, // 75% of 0.8s
                ease: "easeOut"
              }}
            />
            
            {/* Blue bar (rightmost) - starts at 75% of green bar */}
            <motion.div
              className="w-12 rounded-full"
              style={{ backgroundColor: '#1BA0CC' }}
              initial={{ height: 0 }}
              animate={{ height: '200px' }}
              transition={{
                duration: 0.8,
                delay: 1.2, // Previous delay + 75% of 0.8s
                ease: "easeOut"
              }}
            />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default SplashScreen;
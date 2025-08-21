import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface SplashScreenProps {
  onComplete: () => void;
  isLoading?: boolean; // Pass loading state to control animation
}

const SplashScreen = ({ onComplete, isLoading = false }: SplashScreenProps) => {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    // Simple timer-based approach - show for fixed duration
    const displayTime = isLoading ? 2500 : 1800; // Slightly longer if loading
    
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(onComplete, 200); // Wait for fade out animation
    }, displayTime);
    
    return () => clearTimeout(timer);
  }, [isLoading, onComplete]);

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
                duration: isLoading ? 1.2 : 0.6, // Slower if loading
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
                duration: isLoading ? 1.2 : 0.6,
                delay: isLoading ? 0.9 : 0.45, // 75% of duration
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
                duration: isLoading ? 1.2 : 0.6,
                delay: isLoading ? 1.8 : 0.9, // Previous delay + 75% of duration
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
import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface SplashScreenProps {
  onComplete: () => void;
}

const SplashScreen = ({ onComplete }: SplashScreenProps) => {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    // Show splash for 2 seconds
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(onComplete, 300); // Wait for fade out animation
    }, 2000);

    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden bg-white"
        >
          {/* Simple logo fade and scale */}
          <motion.img
            src="/artrio-logo.png"
            alt=""
            className="w-72 h-72 object-contain"
            initial={{ 
              opacity: 0,
              scale: 0.8
            }}
            animate={{ 
              opacity: 1,
              scale: 1
            }}
            transition={{
              duration: 0.6,
              ease: [0.34, 1.56, 0.64, 1]
            }}
          />

          {/* Single paint stroke underneath */}
          <motion.div
            className="absolute bottom-1/3 left-1/2 -translate-x-1/2"
            initial={{ opacity: 0, scaleX: 0 }}
            animate={{ 
              opacity: 1,
              scaleX: 1
            }}
            transition={{
              delay: 0.4,
              duration: 0.5,
              ease: "easeOut"
            }}
          >
            <div 
              className="h-4 rounded-full"
              style={{
                width: '240px',
                background: 'linear-gradient(90deg, transparent, #E85D3D 20%, #F97316 50%, #E85D3D 80%, transparent)',
                filter: 'blur(2px)'
              }}
            />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default SplashScreen;
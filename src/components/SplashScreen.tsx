import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface SplashScreenProps {
  onComplete: () => void;
}

const SplashScreen = ({ onComplete }: SplashScreenProps) => {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    // Show splash for 2.5 seconds
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(onComplete, 300); // Wait for fade out animation
    }, 2500);

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
          {/* Logo animation - pieces coming together */}
          <motion.div
            className="relative"
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
            transition={{ 
              duration: 0.6,
              ease: "easeOut"
            }}
          >
            {/* The main logo image with build effect */}
            <motion.img
              src="/artrio-logo.png"
              alt=""
              className="w-56 h-56 object-contain"
              initial={{ 
                opacity: 0,
                scale: 0.3,
                filter: "blur(20px)"
              }}
              animate={{ 
                opacity: 1,
                scale: 1,
                filter: "blur(0px)"
              }}
              transition={{
                duration: 1.2,
                ease: [0.34, 1.56, 0.64, 1]
              }}
              style={{
                clipPath: 'polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)'
              }}
            />

            {/* Animated mask effect - logo pieces assembling */}
            <motion.div
              className="absolute inset-0 pointer-events-none"
              initial={{ opacity: 1 }}
              animate={{ opacity: 0 }}
              transition={{ duration: 1, delay: 0.8 }}
            >
              {/* Left piece sliding in */}
              <motion.div
                className="absolute inset-0 bg-white"
                initial={{ x: 0 }}
                animate={{ x: "-100%" }}
                transition={{ 
                  duration: 0.5,
                  delay: 0.1,
                  ease: "easeInOut"
                }}
                style={{ 
                  clipPath: 'polygon(0% 0%, 33% 0%, 33% 100%, 0% 100%)'
                }}
              />
              
              {/* Center piece revealing */}
              <motion.div
                className="absolute inset-0 bg-white"
                initial={{ scaleY: 1 }}
                animate={{ scaleY: 0 }}
                transition={{ 
                  duration: 0.5,
                  delay: 0.3,
                  ease: "easeInOut"
                }}
                style={{ 
                  clipPath: 'polygon(33% 0%, 66% 0%, 66% 100%, 33% 100%)',
                  transformOrigin: 'center'
                }}
              />
              
              {/* Right piece sliding in */}
              <motion.div
                className="absolute inset-0 bg-white"
                initial={{ x: 0 }}
                animate={{ x: "100%" }}
                transition={{ 
                  duration: 0.5,
                  delay: 0.5,
                  ease: "easeInOut"
                }}
                style={{ 
                  clipPath: 'polygon(66% 0%, 100% 0%, 100% 100%, 66% 100%)'
                }}
              />
            </motion.div>

            {/* Subtle pulse after assembly */}
            <motion.div
              className="absolute inset-0"
              initial={{ opacity: 0 }}
              animate={{ 
                opacity: [0, 0.5, 0],
                scale: [1, 1.1, 1.2]
              }}
              transition={{
                duration: 0.8,
                delay: 0.9,
                ease: "easeOut"
              }}
            >
              <img
                src="/artrio-logo.png"
                alt=""
                className="w-56 h-56 object-contain opacity-30"
                style={{ filter: 'blur(15px)' }}
              />
            </motion.div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default SplashScreen;
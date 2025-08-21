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
          {/* Paint splash container */}
          <motion.div
            className="relative"
            initial={{ scale: 0.9 }}
            animate={{ scale: 1 }}
            transition={{ 
              duration: 0.5,
              ease: "easeOut"
            }}
          >
            {/* Main logo with paint drip effect */}
            <motion.img
              src="/artrio-logo.png"
              alt=""
              className="w-64 h-64 object-contain relative z-10"
              initial={{ 
                opacity: 0,
                scale: 0,
                rotate: -180
              }}
              animate={{ 
                opacity: 1,
                scale: 1,
                rotate: 0
              }}
              transition={{
                duration: 0.8,
                ease: [0.34, 1.56, 0.64, 1],
                opacity: { duration: 0.4 }
              }}
            />

            {/* Paint splatter effects */}
            <motion.div
              className="absolute -inset-8 pointer-events-none"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3, duration: 0.5 }}
            >
              {/* Paint splatter 1 - top left */}
              <motion.div
                className="absolute top-0 left-0 w-12 h-12 rounded-full"
                style={{ backgroundColor: '#3B82A0' }}
                initial={{ scale: 0, x: 50, y: 50 }}
                animate={{ 
                  scale: [0, 1.5, 1],
                  x: 0,
                  y: 0
                }}
                transition={{ 
                  delay: 0.4,
                  duration: 0.6,
                  ease: "easeOut"
                }}
              />
              
              {/* Paint splatter 2 - bottom right */}
              <motion.div
                className="absolute bottom-0 right-0 w-16 h-16 rounded-full"
                style={{ backgroundColor: '#E85D3D' }}
                initial={{ scale: 0, x: -50, y: -50 }}
                animate={{ 
                  scale: [0, 1.3, 0.8],
                  x: 0,
                  y: 0
                }}
                transition={{ 
                  delay: 0.5,
                  duration: 0.6,
                  ease: "easeOut"
                }}
              />
              
              {/* Paint splatter 3 - top right */}
              <motion.div
                className="absolute top-4 right-8 w-8 h-8 rounded-full"
                style={{ backgroundColor: '#F97316' }}
                initial={{ scale: 0 }}
                animate={{ 
                  scale: [0, 1.2, 0.9]
                }}
                transition={{ 
                  delay: 0.6,
                  duration: 0.5,
                  ease: "easeOut"
                }}
              />
              
              {/* Paint drip effect */}
              <motion.div
                className="absolute bottom-16 left-1/2 -translate-x-1/2 w-1"
                style={{ backgroundColor: '#22C55E' }}
                initial={{ height: 0 }}
                animate={{ 
                  height: [0, 60, 40]
                }}
                transition={{ 
                  delay: 0.7,
                  duration: 0.8,
                  ease: "easeOut"
                }}
              />
            </motion.div>

            {/* Brush stroke effect */}
            <motion.div
              className="absolute -bottom-8 left-1/2 -translate-x-1/2"
              initial={{ opacity: 0, scaleX: 0 }}
              animate={{ 
                opacity: [0, 1, 0.8],
                scaleX: 1
              }}
              transition={{
                delay: 0.8,
                duration: 0.6,
                ease: "easeOut"
              }}
            >
              <div 
                className="h-3 rounded-full"
                style={{
                  width: '200px',
                  background: 'linear-gradient(90deg, transparent, #E85D3D 20%, #F97316 50%, #E85D3D 80%, transparent)',
                  filter: 'blur(1px)'
                }}
              />
            </motion.div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default SplashScreen;
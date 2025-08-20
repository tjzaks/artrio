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

          <motion.div
            initial={{ scale: 0.3, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ 
              duration: 0.6,
              ease: [0.34, 1.56, 0.64, 1]
            }}
            className="flex flex-col items-center relative z-10"
          >
            {/* Main Logo Container */}
            <div className="relative">
              {/* Dynamic shadow that moves */}
              <motion.div
                className="absolute -bottom-8 left-1/2 -translate-x-1/2 w-48 h-6 bg-black/10 rounded-full blur-xl"
                animate={{
                  scaleX: [1, 1.3, 1],
                  opacity: [0.2, 0.1, 0.2]
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
              />

              {/* New Artrio Logo Image with animations */}
              <motion.div
                className="relative"
                initial={{ rotateY: 0 }}
                animate={{ 
                  rotateY: [0, 10, -10, 0],
                  scale: [1, 1.05, 1]
                }}
                transition={{
                  duration: 4,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
              >
                <motion.img
                  src="/artrio-logo.png"
                  alt="Artrio"
                  className="w-64 h-64 object-contain"
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={{ 
                    opacity: 1, 
                    scale: 1
                  }}
                  transition={{
                    duration: 0.8,
                    type: "spring",
                    stiffness: 100
                  }}
                />
                
                {/* Pulse effect around logo */}
                <motion.div
                  className="absolute inset-0 rounded-full"
                  style={{
                    background: 'radial-gradient(circle, rgba(215, 57, 53, 0.2) 0%, rgba(123, 177, 70, 0.2) 33%, rgba(27, 160, 204, 0.2) 66%, transparent 100%)'
                  }}
                  animate={{
                    scale: [1, 1.3, 1],
                    opacity: [0.5, 0, 0.5]
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    ease: "easeOut"
                  }}
                />

                {/* Rotating ring effect */}
                <svg className="absolute inset-0 w-full h-full pointer-events-none">
                  <motion.circle
                    cx="50%"
                    cy="50%"
                    r="120"
                    fill="none"
                    stroke="url(#gradient)"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeDasharray="10 20"
                    initial={{ pathLength: 0, opacity: 0 }}
                    animate={{ 
                      pathLength: 1, 
                      opacity: [0, 0.3, 0],
                      rotate: 360
                    }}
                    transition={{
                      pathLength: { duration: 2, delay: 0.8 },
                      opacity: { duration: 3, repeat: Infinity },
                      rotate: { duration: 8, repeat: Infinity, ease: "linear" }
                    }}
                  />
                  <defs>
                    <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#D73935" />
                      <stop offset="50%" stopColor="#7BB146" />
                      <stop offset="100%" stopColor="#1BA0CC" />
                    </linearGradient>
                  </defs>
                </svg>
              </motion.div>
            </div>
            
            {/* Tagline */}
            <motion.p
              className="text-gray-500 text-lg font-medium mt-2"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.2, duration: 0.6 }}
            >
              Connect in Trios
            </motion.p>

            {/* Loading indicator - subtle */}
            <motion.div
              className="flex gap-2 mt-8"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.5, duration: 0.4 }}
            >
              {[0, 0.15, 0.3].map((delay, i) => (
                <motion.div
                  key={i}
                  className="w-2 h-2 bg-gray-400 rounded-full"
                  animate={{ 
                    y: [0, -8, 0],
                    opacity: [0.3, 1, 0.3]
                  }}
                  transition={{ 
                    duration: 1,
                    repeat: Infinity,
                    delay
                  }}
                />
              ))}
            </motion.div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default SplashScreen;
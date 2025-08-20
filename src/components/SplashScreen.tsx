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
                className="absolute -bottom-8 left-1/2 -translate-x-1/2 w-32 h-4 bg-black/10 rounded-full blur-xl"
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

              {/* Main bars with enhanced animations */}
              <div className="relative flex items-center justify-center gap-3">
                {/* Red Bar */}
                <motion.div
                  className="relative"
                  initial={{ x: -200, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ 
                    delay: 0.2, 
                    duration: 0.8,
                    type: "spring",
                    stiffness: 100
                  }}
                >
                  <motion.div
                    className="w-16 h-40 rounded-full relative overflow-hidden"
                    style={{ 
                      background: 'linear-gradient(135deg, #FF6B6B 0%, #D73935 50%, #B71C1C 100%)',
                      boxShadow: '0 10px 40px rgba(215, 57, 53, 0.3), inset 0 -5px 10px rgba(0,0,0,0.1)'
                    }}
                    animate={{
                      rotateZ: [0, 5, -5, 0],
                      scaleY: [1, 1.05, 1]
                    }}
                    transition={{
                      duration: 3,
                      repeat: Infinity,
                      ease: "easeInOut"
                    }}
                  >
                    {/* Inner glow effect */}
                    <motion.div
                      className="absolute inset-0 bg-gradient-to-t from-transparent to-white/20"
                      animate={{
                        opacity: [0.3, 0.6, 0.3]
                      }}
                      transition={{
                        duration: 2,
                        repeat: Infinity,
                        ease: "easeInOut"
                      }}
                    />
                    
                    {/* Pulse effect */}
                    <motion.div
                      className="absolute -inset-2 bg-red-400 rounded-full blur-xl"
                      animate={{
                        opacity: [0, 0.5, 0],
                        scale: [0.8, 1.2, 0.8]
                      }}
                      transition={{
                        duration: 2,
                        repeat: Infinity,
                        ease: "easeOut",
                        delay: 0.5
                      }}
                    />
                  </motion.div>
                </motion.div>

                {/* Green Bar */}
                <motion.div
                  className="relative"
                  initial={{ y: -200, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ 
                    delay: 0.3, 
                    duration: 0.8,
                    type: "spring",
                    stiffness: 100
                  }}
                >
                  <motion.div
                    className="w-16 h-40 rounded-full relative overflow-hidden"
                    style={{ 
                      background: 'linear-gradient(135deg, #95E770 0%, #7BB146 50%, #558B2F 100%)',
                      boxShadow: '0 10px 40px rgba(123, 177, 70, 0.3), inset 0 -5px 10px rgba(0,0,0,0.1)'
                    }}
                    animate={{
                      scaleY: [1, 1.1, 1],
                      y: [0, -5, 0]
                    }}
                    transition={{
                      duration: 2.5,
                      repeat: Infinity,
                      ease: "easeInOut",
                      delay: 0.3
                    }}
                  >
                    {/* Inner glow effect */}
                    <motion.div
                      className="absolute inset-0 bg-gradient-to-t from-transparent to-white/20"
                      animate={{
                        opacity: [0.3, 0.6, 0.3]
                      }}
                      transition={{
                        duration: 2,
                        repeat: Infinity,
                        ease: "easeInOut",
                        delay: 0.3
                      }}
                    />
                    
                    {/* Pulse effect */}
                    <motion.div
                      className="absolute -inset-2 bg-green-400 rounded-full blur-xl"
                      animate={{
                        opacity: [0, 0.5, 0],
                        scale: [0.8, 1.2, 0.8]
                      }}
                      transition={{
                        duration: 2,
                        repeat: Infinity,
                        ease: "easeOut",
                        delay: 0.8
                      }}
                    />
                  </motion.div>
                </motion.div>

                {/* Blue Bar */}
                <motion.div
                  className="relative"
                  initial={{ x: 200, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ 
                    delay: 0.4, 
                    duration: 0.8,
                    type: "spring",
                    stiffness: 100
                  }}
                >
                  <motion.div
                    className="w-16 h-40 rounded-full relative overflow-hidden"
                    style={{ 
                      background: 'linear-gradient(135deg, #5FC3E8 0%, #1BA0CC 50%, #0277BD 100%)',
                      boxShadow: '0 10px 40px rgba(27, 160, 204, 0.3), inset 0 -5px 10px rgba(0,0,0,0.1)'
                    }}
                    animate={{
                      rotateZ: [0, -5, 5, 0],
                      scaleY: [1, 1.05, 1]
                    }}
                    transition={{
                      duration: 3,
                      repeat: Infinity,
                      ease: "easeInOut",
                      delay: 0.6
                    }}
                  >
                    {/* Inner glow effect */}
                    <motion.div
                      className="absolute inset-0 bg-gradient-to-t from-transparent to-white/20"
                      animate={{
                        opacity: [0.3, 0.6, 0.3]
                      }}
                      transition={{
                        duration: 2,
                        repeat: Infinity,
                        ease: "easeInOut",
                        delay: 0.6
                      }}
                    />
                    
                    {/* Pulse effect */}
                    <motion.div
                      className="absolute -inset-2 bg-blue-400 rounded-full blur-xl"
                      animate={{
                        opacity: [0, 0.5, 0],
                        scale: [0.8, 1.2, 0.8]
                      }}
                      transition={{
                        duration: 2,
                        repeat: Infinity,
                        ease: "easeOut",
                        delay: 1.1
                      }}
                    />
                  </motion.div>
                </motion.div>
              </div>

              {/* Connecting energy between bars */}
              <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: -1 }}>
                <motion.circle
                  cx="50%"
                  cy="50%"
                  r="80"
                  fill="none"
                  stroke="url(#gradient)"
                  strokeWidth="2"
                  strokeLinecap="round"
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
            </div>
            
            {/* Artrio Text */}
            <motion.div
              className="mt-16"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.9, duration: 0.6 }}
            >
              <motion.h1
                className="text-6xl font-black tracking-tight text-gray-900"
                animate={{
                  scale: [1, 1.02, 1]
                }}
                transition={{
                  duration: 3,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
              >
                ARTRIO
              </motion.h1>
            </motion.div>
            
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
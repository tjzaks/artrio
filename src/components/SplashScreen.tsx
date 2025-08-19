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
          exit={{ opacity: 0, scale: 1.2 }}
          transition={{ duration: 0.3 }}
          className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden"
          style={{
            background: 'radial-gradient(circle at 50% 50%, #1BA0CC 0%, #7BB146 40%, #D73935 100%)'
          }}
        >
          {/* Animated background circles */}
          <motion.div
            className="absolute inset-0"
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.3 }}
            transition={{ duration: 1 }}
          >
            <motion.div
              className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full"
              style={{ background: 'rgba(215, 57, 53, 0.3)' }}
              animate={{
                scale: [1, 1.5, 1],
                x: [-50, 50, -50],
                y: [-30, 30, -30],
              }}
              transition={{
                duration: 4,
                repeat: Infinity,
                ease: "easeInOut"
              }}
            />
            <motion.div
              className="absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full"
              style={{ background: 'rgba(123, 177, 70, 0.3)' }}
              animate={{
                scale: [1.5, 1, 1.5],
                x: [50, -50, 50],
                y: [30, -30, 30],
              }}
              transition={{
                duration: 4,
                repeat: Infinity,
                ease: "easeInOut",
                delay: 1
              }}
            />
            <motion.div
              className="absolute top-1/2 left-1/2 w-96 h-96 rounded-full -translate-x-1/2 -translate-y-1/2"
              style={{ background: 'rgba(27, 160, 204, 0.3)' }}
              animate={{
                scale: [1, 1.3, 1],
                rotate: [0, 180, 360],
              }}
              transition={{
                duration: 4,
                repeat: Infinity,
                ease: "easeInOut",
                delay: 0.5
              }}
            />
          </motion.div>

          <motion.div
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ 
              duration: 0.8,
              ease: [0.43, 0.13, 0.23, 0.96],
              delay: 0.1
            }}
            className="flex flex-col items-center relative z-10"
          >
            {/* Main Logo with 3D effect */}
            <div className="relative">
              {/* Shadow/Glow effect */}
              <motion.div
                className="absolute inset-0 blur-3xl opacity-60"
                animate={{
                  scale: [1, 1.2, 1],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
              >
                <div className="flex gap-4">
                  <div className="w-12 h-32 rounded-full bg-red-500" />
                  <div className="w-12 h-32 rounded-full bg-green-500" />
                  <div className="w-12 h-32 rounded-full bg-blue-500" />
                </div>
              </motion.div>

              {/* Main bars */}
              <div className="relative flex gap-4">
                <motion.div
                  className="w-12 h-32 rounded-full shadow-2xl"
                  style={{ 
                    background: 'linear-gradient(180deg, #FF6B6B 0%, #D73935 100%)',
                    boxShadow: '0 20px 40px rgba(215, 57, 53, 0.5)'
                  }}
                  initial={{ scale: 0, y: 50, rotate: -20 }}
                  animate={{ 
                    scale: 1, 
                    y: 0, 
                    rotate: 0,
                  }}
                  transition={{ 
                    delay: 0.3, 
                    duration: 0.6, 
                    ease: "easeOut",
                    rotate: {
                      duration: 2,
                      repeat: Infinity,
                      ease: "easeInOut",
                      repeatType: "reverse",
                      repeatDelay: 0.5,
                      delay: 0.9,
                      keyframes: [0, 5, 0, -5, 0]
                    }
                  }}
                />
                <motion.div
                  className="w-12 h-32 rounded-full shadow-2xl"
                  style={{ 
                    background: 'linear-gradient(180deg, #95E770 0%, #7BB146 100%)',
                    boxShadow: '0 20px 40px rgba(123, 177, 70, 0.5)'
                  }}
                  initial={{ scale: 0, y: 50 }}
                  animate={{ 
                    scale: 1, 
                    y: 0,
                  }}
                  transition={{ 
                    delay: 0.4, 
                    duration: 0.6, 
                    ease: "easeOut",
                    y: {
                      duration: 2,
                      repeat: Infinity,
                      ease: "easeInOut",
                      repeatType: "reverse",
                      delay: 1,
                      keyframes: [0, -10, 0, 10, 0]
                    }
                  }}
                />
                <motion.div
                  className="w-12 h-32 rounded-full shadow-2xl"
                  style={{ 
                    background: 'linear-gradient(180deg, #5FC3E8 0%, #1BA0CC 100%)',
                    boxShadow: '0 20px 40px rgba(27, 160, 204, 0.5)'
                  }}
                  initial={{ scale: 0, y: 50, rotate: 20 }}
                  animate={{ 
                    scale: 1, 
                    y: 0, 
                    rotate: 0,
                  }}
                  transition={{ 
                    delay: 0.5, 
                    duration: 0.6, 
                    ease: "easeOut",
                    rotate: {
                      duration: 2,
                      repeat: Infinity,
                      ease: "easeInOut",
                      repeatType: "reverse",
                      repeatDelay: 0.5,
                      delay: 1.1,
                      keyframes: [0, -5, 0, 5, 0]
                    }
                  }}
                />
              </div>
            </div>
            
            {/* Artrio Text with shine effect */}
            <motion.div
              className="mt-12 relative"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8, duration: 0.6 }}
            >
              <motion.h1
                className="text-6xl font-black tracking-tight text-white relative"
                style={{
                  textShadow: '0 4px 20px rgba(0,0,0,0.3)',
                }}
              >
                ARTRIO
              </motion.h1>
              
              {/* Shine effect */}
              <motion.div
                className="absolute inset-0 overflow-hidden"
                initial={{ x: '-100%' }}
                animate={{ x: '200%' }}
                transition={{
                  duration: 1.5,
                  delay: 1.2,
                  ease: "easeInOut"
                }}
              >
                <div 
                  className="h-full w-20 -skew-x-12"
                  style={{
                    background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.6), transparent)'
                  }}
                />
              </motion.div>
            </motion.div>
            
            {/* Tagline with typewriter effect */}
            <motion.div
              className="mt-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.4, duration: 0.6 }}
            >
              <motion.p
                className="text-white/90 text-xl font-medium"
                style={{
                  textShadow: '0 2px 10px rgba(0,0,0,0.3)',
                }}
              >
                Connect in Trios
              </motion.p>
            </motion.div>

            {/* Pulsing dots */}
            <motion.div
              className="flex gap-3 mt-8"
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 1.8, duration: 0.4 }}
            >
              <motion.div
                className="w-3 h-3 bg-white rounded-full shadow-lg"
                animate={{ 
                  scale: [1, 1.5, 1],
                  opacity: [0.7, 1, 0.7]
                }}
                transition={{ 
                  duration: 0.8,
                  repeat: Infinity,
                  delay: 0
                }}
              />
              <motion.div
                className="w-3 h-3 bg-white rounded-full shadow-lg"
                animate={{ 
                  scale: [1, 1.5, 1],
                  opacity: [0.7, 1, 0.7]
                }}
                transition={{ 
                  duration: 0.8,
                  repeat: Infinity,
                  delay: 0.2
                }}
              />
              <motion.div
                className="w-3 h-3 bg-white rounded-full shadow-lg"
                animate={{ 
                  scale: [1, 1.5, 1],
                  opacity: [0.7, 1, 0.7]
                }}
                transition={{ 
                  duration: 0.8,
                  repeat: Infinity,
                  delay: 0.4
                }}
              />
            </motion.div>
          </motion.div>

          {/* Particle effects */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            {[...Array(20)].map((_, i) => (
              <motion.div
                key={i}
                className="absolute w-2 h-2 bg-white/30 rounded-full"
                initial={{
                  x: Math.random() * window.innerWidth,
                  y: window.innerHeight + 20,
                }}
                animate={{
                  y: -20,
                  x: Math.random() * window.innerWidth,
                }}
                transition={{
                  duration: Math.random() * 3 + 2,
                  repeat: Infinity,
                  delay: Math.random() * 2,
                  ease: "linear"
                }}
              />
            ))}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default SplashScreen;
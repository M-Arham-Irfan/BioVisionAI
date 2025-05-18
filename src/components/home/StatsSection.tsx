import { CheckCircle, Zap, Globe, Users } from "lucide-react";
import { motion, useInView } from "framer-motion";
import { useRef, useEffect } from "react";

// Add TypeScript interface for AnimatedCounter
interface AnimatedCounterProps {
  from?: number;
  to: number;
  duration?: number;
  delay?: number;
  format?: (value: number) => string;
}

// Add TypeScript types to CountUp component
interface CountUpProps {
  from: number;
  to: number;
  duration: number;
  format: (value: number) => string;
}

// CountUp component to handle the actual counting animation
const CountUp = ({ from, to, duration, format }: CountUpProps) => {
  const nodeRef = useRef<HTMLSpanElement>(null);
  
  useEffect(() => {
    if (!nodeRef.current) return;
    
    let start = from;
    const end = to;
    const range = end - start;
    const startTime = performance.now();
    const endTime = startTime + duration * 1000;
    
    const updateCounter = (currentTime: number) => {
      if (!nodeRef.current) return;
      
      if (currentTime >= endTime) {
        nodeRef.current.textContent = format(end);
        return;
      }
      
      const elapsedTime = currentTime - startTime;
      const progress = Math.min(elapsedTime / (duration * 1000), 1);
      // Easing function - easeOutQuad
      const easedProgress = 1 - (1 - progress) * (1 - progress);
      const currentValue = start + range * easedProgress;
      
      nodeRef.current.textContent = format(Math.floor(currentValue));
      requestAnimationFrame(updateCounter);
    };
    
    requestAnimationFrame(updateCounter);
  }, [from, to, duration, format]);
  
  return <span ref={nodeRef}>{format(from)}</span>;
};

// Component for animated counter with proper TypeScript types
const AnimatedCounter = ({ 
  from = 0, 
  to, 
  duration = 1.5, 
  delay = 0,
  format = (value: number) => value.toString()
}: AnimatedCounterProps) => {
  return (
    <motion.div
      initial={{ opacity: 0.5 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5, delay }}
      className="text-3xl md:text-4xl font-bold text-white mb-1"
    >
      <motion.span
        initial={{ opacity: 0.7 }}
        animate={{ opacity: 1 }}
        transition={{ 
          duration: 0.2,
          ease: "easeInOut"
        }}
      >
        <motion.div
          initial="hidden"
          animate="visible"
          variants={{
            hidden: { opacity: 0 },
            visible: { opacity: 1 }
          }}
          transition={{ 
            duration,
            delay,
            ease: "easeOut"
          }}
        >
          <CountUp from={from} to={to} duration={duration} format={format} />
        </motion.div>
      </motion.span>
    </motion.div>
  );
};

const StatsSection = () => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, amount: 0.3 });
  
  return (
    <div 
      ref={ref}
      className="w-full bg-gradient-to-b from-gray-900 to-black py-16"
    >
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-12">
          <motion.div 
            className="text-center"
            initial={{ y: 20, opacity: 0 }}
            animate={isInView ? { y: 0, opacity: 1 } : { y: 20, opacity: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
          >
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-blue-500/20 text-blue-400 mb-4">
              <CheckCircle className="h-6 w-6" />
            </div>
            <AnimatedCounter 
              from={70}
              to={99.8} 
              delay={0.3}
              format={(value) => `${value.toFixed(1)}%`}
            />
            <div className="text-gray-400 text-sm">Accuracy Rate</div>
          </motion.div>
          
          <motion.div 
            className="text-center"
            initial={{ y: 20, opacity: 0 }}
            animate={isInView ? { y: 0, opacity: 1 } : { y: 20, opacity: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-purple-500/20 text-purple-400 mb-4">
              <Zap className="h-6 w-6" />
            </div>
            <AnimatedCounter 
              from={60}
              to={10} 
              delay={0.4}
              format={(value) => `<${value}s`}
            />
            <div className="text-gray-400 text-sm">Analysis Time</div>
          </motion.div>
          
          <motion.div 
            className="text-center"
            initial={{ y: 20, opacity: 0 }}
            animate={isInView ? { y: 0, opacity: 1 } : { y: 20, opacity: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
          >
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-cyan-500/20 text-cyan-400 mb-4">
              <Globe className="h-6 w-6" />
            </div>
            <AnimatedCounter 
              from={0}
              to={120} 
              delay={0.5}
              format={(value) => `${value}+`}
            />
            <div className="text-gray-400 text-sm">Countries Served</div>
          </motion.div>
          
          <motion.div 
            className="text-center"
            initial={{ y: 20, opacity: 0 }}
            animate={isInView ? { y: 0, opacity: 1 } : { y: 20, opacity: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
          >
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-green-500/20 text-green-400 mb-4">
              <Users className="h-6 w-6" />
            </div>
            <AnimatedCounter 
              from={0}
              to={5} 
              delay={0.6}
              format={(value) => `${value}M+`}
            />
            <div className="text-gray-400 text-sm">Lives Impacted</div>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default StatsSection;

import { useNavigate } from "react-router-dom";
import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { FileScan, ChevronRight, Sparkles } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { motion, useInView, AnimatePresence } from "framer-motion";

interface CallToActionProps {
  hasUsedFreeScan: boolean;
  onScanClick: () => void;
  scanCount: number;
  loading?: boolean;
}

const CallToAction = ({ hasUsedFreeScan, onScanClick, scanCount, loading = false }: CallToActionProps) => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const sectionRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(sectionRef, { once: true, amount: 0.2 });
  
  return (
    <div className="relative w-full overflow-hidden">
      {/* Futuristic background with animated elements */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-950 via-indigo-900 to-blue-950">
        {/* Simplified glowing orb background */}
        <div className="absolute inset-0 opacity-30">
          <motion.div 
            className="absolute top-1/3 left-1/3 w-[50vw] h-[50vw] bg-blue-400/20 rounded-full blur-3xl animate-pulse-slow"
          />
        </div>
        
        {/* Grid pattern overlay */}
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAxMCAwIEwgMCAwIDAgMTAiIGZpbGw9Im5vbmUiIHN0cm9rZT0icmdiYSgyNTUsMjU1LDI1NSwwLjEpIiBzdHJva2Utd2lkdGg9IjEiLz48L3BhdHRlcm4+PC9kZWZzPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9InVybCgjZ3JpZCkiLz48L3N2Zz4=')] opacity-20"></div>
        
        {/* Horizontal scan line */}
        <motion.div 
          className="absolute left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-blue-400 to-transparent"
          animate={{ 
            y: ["0%", "100%", "0%"]
          }}
          transition={{ 
            duration: 8, 
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      </div>

      <div className="relative py-24 container mx-auto px-4" ref={sectionRef}>
        <div className="max-w-4xl mx-auto">
          <AnimatePresence>
            {isInView && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="text-center space-y-8"
              >
                <motion.h2 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.7, delay: 0.1 }}
                  className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight"
                >
                  <span className="relative inline-block">
                    <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-200 via-indigo-100 to-blue-200 animate-in fade-in slide-in-from-bottom-4 duration-700">
                      Experience the Future of X-ray Analysis Today
                    </span>
                    <motion.span 
                      className="absolute -inset-1 block rounded-lg opacity-20 bg-gradient-to-r from-blue-400 to-indigo-500 blur-xl"
                      animate={{ 
                        opacity: [0.1, 0.3, 0.1]
                      }}
                      transition={{ 
                        duration: 3, 
                        repeat: Infinity,
                        ease: "easeInOut"
                      }}
                    />
                  </span>
                </motion.h2>
                
                <motion.p 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.7, delay: 0.2 }}
                  className="text-xl text-blue-100 opacity-90 max-w-2xl mx-auto leading-relaxed"
                >
                  Start with a free analysis and discover how our AI can help detect potential health concerns with unprecedented speed and accuracy.
                  {!loading && scanCount > 0 && (
                    <> Join the{' '}
                      <motion.span 
                        className="font-semibold relative inline-block animate-in fade-in zoom-in duration-300"
                      >
                        {scanCount.toLocaleString()}+
                        <span className="absolute -inset-0.5 rounded-md bg-blue-400/10 -z-10"></span>
                      </motion.span>
                      {' '}scans already analyzed.
                    </>
                  )}
                </motion.p>
                
                <motion.div 
                  className="flex flex-col sm:flex-row justify-center items-center gap-6 mt-10"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.7, delay: 0.3 }}
                >
                  <Button 
                    onClick={onScanClick}
                    variant="outline"
                    size="lg" 
                    className="relative group px-8 py-7 text-lg bg-indigo-900/15 hover:bg-indigo-800/25 border-indigo-400/60 text-indigo-100 hover:text-white rounded-full overflow-hidden backdrop-blur-md transition-all duration-300 hover:shadow-[0_0_20px_rgba(99,102,241,0.5)] hover:border-indigo-300 transform-gpu hover:scale-[1.02]"
                  >
                    <motion.span 
                      className="absolute inset-0 w-full h-full opacity-0 group-hover:opacity-100 bg-gradient-to-tr from-white/5 via-transparent to-white/5 rounded-full transition-opacity duration-500" 
                    />
                    <span className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-indigo-500/40 to-transparent opacity-30"></span>
                    <span className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-indigo-500/40 to-transparent opacity-30"></span>
                    <div 
                      className="absolute inset-0 -z-10 opacity-20" 
                      style={{
                        background: 'radial-gradient(circle at 50% 50%, rgba(99, 102, 241, 0.15) 0%, transparent 60%)'
                      }}
                    />
                    <span className="relative flex items-center">
                      <FileScan className="mr-2 h-5 w-5 text-indigo-200 group-hover:text-white transition-colors duration-300" />
                      {isAuthenticated || !hasUsedFreeScan ? "Analyze Your X-ray Now" : "Try Free Analysis"}
                    </span>
                  </Button>
                  
                  <Button 
                    onClick={() => navigate("/pricing")}
                    variant="outline" 
                    size="lg" 
                    className="group px-8 py-7 text-lg bg-blue-900/15 hover:bg-blue-800/25 border-blue-400/60 text-blue-100 hover:text-white rounded-full relative overflow-hidden backdrop-blur-md transition-all duration-300 hover:shadow-[0_0_20px_rgba(59,130,246,0.5)] hover:border-blue-300 transform-gpu hover:scale-[1.02]"
                  >
                    <motion.span 
                      className="absolute inset-0 -z-10 opacity-0 group-hover:opacity-100 bg-gradient-to-tr from-white/5 via-transparent to-white/5 rounded-full transition-opacity duration-500" 
                    />
                    <span className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-blue-500/40 to-transparent opacity-30"></span>
                    <span className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-blue-500/40 to-transparent opacity-30"></span>
                    <div
                      className="absolute inset-0 -z-20 opacity-20"
                      style={{
                        background: 'radial-gradient(circle at 50% 50%, rgba(59, 130, 246, 0.15) 0%, transparent 60%)'
                      }}
                    />
                    <Sparkles className="mr-2 h-5 w-5 text-blue-200 group-hover:text-white transition-colors duration-300" />
                    View Our Plans
                    <motion.span 
                      className="inline-block"
                      whileHover={{ x: 4 }}
                      transition={{ type: "spring", stiffness: 400, damping: 10 }}
                    >
                      <ChevronRight className="ml-2 h-5 w-5" />
                    </motion.span>
                  </Button>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};

export default CallToAction;

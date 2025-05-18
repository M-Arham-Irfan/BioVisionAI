import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Sparkles, ArrowRight, Scan, Brain, FileScan } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

// Add keyframes animation to the head once on component load
const floatAnimation = `
@keyframes float {
  0% {
    transform: translateY(0) translateX(0);
    opacity: 0.2;
  }
  5% {
    opacity: 1;
  }
  95% {
    opacity: 1;
  }
  100% {
    transform: translateY(-100px) translateX(20px);
    opacity: 0.2;
  }
}

/* Performance optimization for background animations */
@keyframes pulse-slow {
  0%, 100% {
    opacity: 0.5;
    transform: scale(1);
  }
  50% {
    opacity: 0.8;
    transform: scale(1.05);
  }
}
`;

interface HeroSectionProps {
  scanCount: number;
  hasUsedFreeScan: boolean;
  onScanClick: () => void;
}

const HeroSection = ({
  scanCount,
  hasUsedFreeScan,
  onScanClick,
}: HeroSectionProps) => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [isInViewport, setIsInViewport] = useState(false);
  const animationFrameRef = useRef<number | null>(null);
  const heroSectionRef = useRef<HTMLDivElement>(null);

  // Add animation style on component mount
  useEffect(() => {
    const styleElement = document.createElement("style");
    styleElement.innerHTML = floatAnimation;
    document.head.appendChild(styleElement);

    // Cleanup
    return () => {
      document.head.removeChild(styleElement);
    };
  }, []);

  // Setup Intersection Observer to only animate when in viewport
  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        setIsInViewport(entry.isIntersecting);
      });
    }, { threshold: 0.1 });

    if (heroSectionRef.current) {
      observer.observe(heroSectionRef.current);
    }

    return () => {
      if (heroSectionRef.current) {
        observer.unobserve(heroSectionRef.current);
      }
    };
  }, []);

  // Generate optimized random particles with custom properties
  const particleCount = 15; // Further reduced count, focusing on quality over quantity
  
  // Use useRef to maintain stable particles across renders
  const particlesRef = useRef<Array<{
    id: number;
    size: number;
    x: number;
    y: number;
    duration: number;
    delay: number;
    opacity: number;
    color: string;
  }>>([]);
  
  // Initialize particles only once with better distribution and varied colors
  useEffect(() => {
    if (particlesRef.current.length === 0) {
      // Create a grid system to ensure better distribution and less overlap
      const gridSize = 4; // 4x4 grid
      const particles = [];
      
      // Create one particle per grid cell to ensure good distribution
      for (let i = 0; i < particleCount; i++) {
        // Calculate grid position (0-3 in x and y)
        const gridX = i % gridSize;
        const gridY = Math.floor(i / gridSize);
        
        // Calculate percentage with some randomness but staying within grid cell
        const cellWidth = 100 / gridSize;
        const cellHeight = 100 / gridSize;
        const x = (gridX * cellWidth) + (Math.random() * (cellWidth * 0.8));
        const y = (gridY * cellHeight) + (Math.random() * (cellHeight * 0.8));
        
        // Vary the colors slightly
        const colors = [
          "rgba(59, 130, 246, 0.9)",  // blue
          "rgba(99, 102, 241, 0.9)",  // indigo
          "rgba(139, 92, 246, 0.9)"   // purple
        ];
        
        particles.push({
          id: i,
          size: 2 + Math.random() * 4,
          x,
          y,
          duration: 8 + Math.random() * 8, // Slightly longer durations
          delay: Math.random() * 8,
          opacity: 0.5 + Math.random() * 0.5,
          color: colors[Math.floor(Math.random() * colors.length)]
        });
      }
      
      particlesRef.current = particles;
    }
  }, [particleCount]);

  return (
    <div 
      id="hero-section" 
      ref={heroSectionRef}
      className="relative w-full min-h-[85vh] overflow-hidden bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900 flex items-center"
      style={{
        "--parallax-offset": "0px"
      } as React.CSSProperties}
    >
      {/* Animated background elements */}
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPjxkZWZzPjxwYXR0ZXJuIGlkPSJncmlkIiB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHBhdHRlcm5Vbml0cz0idXNlclNwYWNlT25Vc2UiPjxwYXRoIGQ9Ik0gNDAgMCBMIDAgMCAwIDQwIiBmaWxsPSJub25lIiBzdHJva2U9IiNhYWEiIHN0cm9rZS13aWR0aD0iMC4yIi8+PC9wYXR0ZXJuPjwvZGVmcz48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSJ1cmwoI2dyaWQpIi8+PC9zdmc+')] opacity-10"></div>
        
        {/* Background glow effects - consolidated and reduced to 2 main circles */}
        <div className="absolute top-1/4 left-1/4 w-[40vw] h-[40vw] bg-blue-500/20 rounded-full filter blur-3xl animate-pulse"></div>
        <div 
          className="absolute bottom-1/4 right-1/4 w-[35vw] h-[35vw] bg-indigo-500/20 rounded-full filter blur-3xl animate-pulse"
          style={{ animationDelay: "1.5s" }}
        ></div>

        {/* Enhanced primary particles with better distribution */}
        {particlesRef.current.map((particle) => (
          <div
            key={particle.id}
            className="absolute rounded-full"
            style={{
              top: `${particle.y}%`,
              left: `${particle.x}%`,
              width: `${particle.size}px`,
              height: `${particle.size}px`,
              backgroundColor: particle.color,
              boxShadow: `0 0 ${particle.size * 3}px ${
                particle.size / 2
              }px ${particle.color.replace(/0\.8/, '0.5')}`,
              animation: `float ${particle.duration}s ease-in-out ${particle.delay}s infinite`,
              opacity: particle.opacity,
            }}
          />
        ))}

        {/* Just three key accent orbs at carefully selected positions */}
        <div
          className="absolute w-2 h-2 bg-blue-500 rounded-full filter blur-[1px]"
          style={{
            top: "30%",
            left: "15%",
            animation: `float 14s ease-in-out 0s infinite`,
            boxShadow: "0 0 15px 2px rgba(59, 130, 246, 0.9)",
          }}
        />

        <div
          className="absolute w-2 h-2 bg-indigo-500 rounded-full filter blur-[1px]"
          style={{
            top: "65%",
            left: "75%",
            animation: `float 16s ease-in-out 3s infinite`,
            boxShadow: "0 0 20px 2px rgba(99, 102, 241, 0.9)",
          }}
        />

        <div
          className="absolute w-2 h-2 bg-purple-500 rounded-full filter blur-[1px]"
          style={{
            top: "20%",
            right: "25%",
            animation: `float 18s ease-in-out 2s infinite`,
            boxShadow: "0 0 15px 2px rgba(139, 92, 246, 0.9)",
          }}
        />
      </div>

      <div className="container mx-auto px-4 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div className="text-center lg:text-left">
            <div className="inline-flex items-center px-3 py-1 rounded-full bg-blue-500/20 text-blue-300 text-sm font-medium mb-6">
              <span className="relative flex h-2 w-2 mr-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
              </span>
              <span className="mr-1">{scanCount.toLocaleString()}</span>
              <span>Chest X-rays Analyzed</span>
            </div>

            <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold mb-6 text-white">
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-cyan-300">
                Next-Gen
              </span>
              <br />
              <span className="text-white font-light">Chest X-ray</span>
              <br />
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-purple-400 via-pink-400 to-red-400">
                AI Analysis
              </span>
            </h1>

            <p className="text-lg md:text-xl text-blue-100 mb-8 max-w-xl mx-auto lg:mx-0">
              Our cutting-edge AI technology analyzes chest X-rays with
              precision previously only achievable by specialists, detecting
              potential concerns in seconds.
            </p>

            <div className="flex flex-col sm:flex-row justify-center lg:justify-start gap-4">
              <Button
                onClick={onScanClick}
                size="lg"
                className="px-8 py-6 text-lg rounded-full border border-indigo-400/60 text-indigo-100 hover:text-white bg-indigo-900/15 hover:bg-indigo-800/25 backdrop-blur-md relative overflow-hidden group transition-all duration-300 hover:shadow-[0_0_15px_rgba(99,102,241,0.5)] hover:border-indigo-300 hover:scale-[1.02]"
              >
                <span className="absolute inset-0 w-full h-full bg-gradient-to-tr from-white/5 via-transparent to-white/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></span>
                <span className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-indigo-500/40 to-transparent opacity-30"></span>
                <span className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-indigo-500/40 to-transparent opacity-30"></span>
                <span className="relative flex items-center">
                  <FileScan className="mr-2 h-5 w-5 text-indigo-200 group-hover:text-white transition-colors duration-300" />
                  {isAuthenticated || !hasUsedFreeScan
                    ? "Analyze Your X-ray"
                    : "Try Free Analysis"}
                </span>
              </Button>

              <Button
                onClick={() => navigate("/pricing")}
                variant="outline"
                size="lg"
                className="px-8 py-6 text-lg rounded-full border border-blue-400/60 text-blue-100 hover:text-white bg-blue-900/15 hover:bg-blue-800/25 backdrop-blur-md relative overflow-hidden group transition-all duration-300 hover:shadow-[0_0_15px_rgba(59,130,246,0.5)] hover:border-blue-300 hover:scale-[1.02]"
              >
                <span className="absolute inset-0 w-full h-full bg-gradient-to-tr from-white/5 via-transparent to-white/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></span>
                <span className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-blue-500/40 to-transparent opacity-30"></span>
                <span className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-blue-500/40 to-transparent opacity-30"></span>
                <Sparkles className="mr-2 h-5 w-5 text-blue-200 group-hover:text-white transition-colors duration-300" />
                View Pricing
              </Button>
            </div>
          </div>

          <div className="hidden lg:block">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-2xl blur-xl transform -rotate-6"></div>
              <div className="relative bg-gray-800/80 backdrop-blur-sm border border-gray-700/50 p-8 rounded-2xl shadow-2xl">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center">
                    <Brain className="h-8 w-8 text-blue-400 mr-2" />
                    <span className="text-xl font-bold text-white">
                      AI Analysis
                    </span>
                  </div>
                  <div className="flex space-x-1">
                    <div className="w-3 h-3 rounded-full bg-red-500"></div>
                    <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                    <div className="w-3 h-3 rounded-full bg-green-500"></div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="h-40 bg-gray-700/50 rounded-lg overflow-hidden relative">
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Scan className="h-20 w-20 text-blue-300/30 animate-pulse" />
                    </div>
                    <div className="absolute bottom-0 left-0 right-0 h-1/3 bg-gradient-to-t from-blue-500/20 to-transparent"></div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-gray-700/50 h-24 rounded-lg p-3">
                      <div className="text-xs text-gray-400 mb-1">
                        Probability
                      </div>
                      <div className="text-2xl font-bold text-white">94.6%</div>
                      <div className="mt-1 h-1 bg-gray-600 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-blue-500 rounded-full"
                          style={{ width: "94.6%" }}
                        ></div>
                      </div>
                    </div>
                    <div className="bg-gray-700/50 h-24 rounded-lg p-3">
                      <div className="text-xs text-gray-400 mb-1">Severity</div>
                      <div className="text-2xl font-bold text-yellow-400">
                        Moderate
                      </div>
                      <div className="mt-1 h-1 bg-gray-600 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-yellow-500 rounded-full"
                          style={{ width: "60%" }}
                        ></div>
                      </div>
                    </div>
                  </div>

                  <Button className="w-full bg-blue-600 hover:bg-blue-700">
                    <ArrowRight className="h-4 w-4 mr-2" />
                    View Full Report
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HeroSection;

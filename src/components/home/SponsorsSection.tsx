import { useRef } from "react";
import { motion, useInView } from "framer-motion";

const SponsorsSection = () => {
  const sectionRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(sectionRef, { once: true, amount: 0.2 });
  
  const logos = [
    { name: "Siemens", url: "https://qure-website-images.s3.ap-south-1.amazonaws.com/14_Siemens_1fdd200492.webp?w=1920&q=75" },
    { name: "Medtronic", url: "https://qure-website-images.s3.ap-south-1.amazonaws.com/Medtronic_Logo_b4bae75863.webp?w=3840&q=75" },
    { name: "Partner 3", url: "https://qure-website-images.s3.ap-south-1.amazonaws.com/image_406_9b31c8f360.webp?w=1080&q=75" },
    { name: "Partner 4", url: "https://qure-website-images.s3.ap-south-1.amazonaws.com/image_187_43047ae759.webp?w=1920&q=75" },
    { name: "Partner 5", url: "https://qure-website-images.s3.ap-south-1.amazonaws.com/image_387_cd9f1575ec.webp?w=640&q=75" },
    { name: "Partner 6", url: "https://qure-website-images.s3.ap-south-1.amazonaws.com/image_409_6220445e66.webp?w=640&q=75" },
  ];

  const logoItems = [...logos, ...logos, ...logos];

  return (
    <div 
      ref={sectionRef}
      className="relative w-full bg-gradient-to-b from-black to-gray-900 py-20 overflow-hidden"
    >
      {/* Background effects */}
      <div className="absolute inset-0">
        <motion.div 
          className="absolute top-1/4 left-1/4 w-[40vw] h-[40vw] bg-blue-500/5 rounded-full blur-3xl"
          animate={{ 
            scale: [1, 1.05, 1],
            opacity: [0.4, 0.7, 0.4]
          }}
          transition={{ 
            duration: 3,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
      </div>

      <div className="container mx-auto px-4 relative z-10">
        <div className="text-center mb-16">
          <motion.h2 
            initial={{ opacity: 0, y: 20 }}
            animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
            transition={{ duration: 0.7, delay: 0.1 }}
            className="text-3xl md:text-4xl font-bold text-white mb-4 relative"
          >
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-white to-blue-200">
              Trusted by Leading Healthcare Organizations
            </span>
            
            {/* Subtle glow effect */}
            <motion.span 
              className="absolute left-1/2 -translate-x-1/2 -inset-y-4 w-3/4 h-full opacity-20 bg-gradient-to-r from-blue-500/0 via-blue-500/30 to-blue-500/0 blur-xl rounded-full"
              animate={{ 
                opacity: [0.1, 0.2, 0.1],
                width: ["60%", "80%", "60%"]
              }}
              transition={{ 
                duration: 5, 
                repeat: Infinity,
                ease: "easeInOut"
              }}
            />
          </motion.h2>
          
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
            transition={{ duration: 0.7, delay: 0.2 }}
            className="text-gray-400 text-lg max-w-3xl mx-auto"
          >
            Our technology is used by top medical institutions and healthcare companies worldwide
          </motion.p>
        </div>

        {/* Improved infinite scroll implementation */}
        <div className="relative max-w-full mx-auto overflow-hidden py-12">
          {/* Fade effect overlays */}
          <div className="absolute left-0 top-0 h-full w-24 bg-gradient-to-r from-black to-transparent z-10" />
          <div className="absolute right-0 top-0 h-full w-24 bg-gradient-to-l from-black to-transparent z-10" />
          
          {/* Sliding logos container */}
          <div className="flex py-6 animate-infinite-scroll w-fit">
            {logoItems.map((logo, index) => (
              <div
                key={`logo-${index}`}
                className="mx-8 flex min-w-[192px] h-24 items-center justify-center bg-gray-900/40 backdrop-blur-sm rounded-xl p-6 border border-gray-800/50 hover:border-blue-500/50 transition-all duration-300 group"
              >
                <img
                  src={logo.url}
                  alt={logo.name}
                  className="h-12 w-auto opacity-90 group-hover:opacity-100 transition-opacity"
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SponsorsSection;

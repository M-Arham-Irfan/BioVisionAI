import { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence, useInView } from "framer-motion";
import { Quote, Award, BadgeCheck, Sparkles } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface Testimonial {
  quote: string;
  name: string;
  title: string;
  company: string;
}

// Card animation variants - optimized
const cardVariants = {
  hidden: { 
    opacity: 0, 
    y: 20,
  },
  visible: (i: number) => ({ 
    opacity: 1, 
    y: 0,
    transition: { 
      duration: 0.4,
      ease: "easeOut",
      delay: 0.1 + (i * 0.05)
    }
  }),
  exit: { 
    opacity: 0, 
    transition: { 
      duration: 0.3,
    }
  }
};

const TestimonialsSection = () => {
  const sectionRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(sectionRef, { once: true, amount: 0.2 });
  
  const testimonials: Testimonial[] = [
    {
      quote: "The speed and accuracy of this AI system is remarkable. It has helped us detect potential issues in chest X-rays much earlier than traditional methods.",
      name: "Dr. Sarah Johnson",
      title: "Chief Radiologist",
      company: "Metropolitan Medical Center"
    },
    {
      quote: "The AI-powered analysis has revolutionized our workflow. We're now able to prioritize urgent cases more effectively.",
      name: "Dr. Michael Chen",
      title: "Director of Radiology",
      company: "Healthcare Partners Group"
    },
    {
      quote: "This platform has been a game-changer for our rural healthcare facility where specialist radiologists are not always available.",
      name: "Dr. Emily Rodriguez",
      title: "Medical Director",
      company: "Community Health Networks"
    },
    {
      quote: "The accuracy and speed of the AI analysis have significantly improved our diagnostic capabilities.",
      name: "Dr. James Wilson",
      title: "Pulmonary Specialist",
      company: "University Medical Research"
    }
  ];

  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentIndex((prevIndex) => (prevIndex + 1) % (testimonials.length - 2));
    }, 5000);

    return () => clearInterval(timer);
  }, [testimonials.length]);

  const visibleTestimonials = testimonials.slice(currentIndex, currentIndex + 3);

  return (
    <div 
      ref={sectionRef}
      className="relative w-full bg-gray-900 py-24 overflow-hidden will-change-transform"
    >
      {/* Simplified background - static gradient instead of animated */}
      <div className="absolute inset-0">
        <div 
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-gradient-to-r from-blue-500/5 to-purple-500/5 rounded-full blur-2xl opacity-70"
        />
      </div>

      <div className="container mx-auto px-4 relative z-10">
        <div 
          className="text-center max-w-3xl mx-auto mb-16"
        >
          <h2 
            className="text-3xl md:text-4xl font-bold text-white mb-4 flex items-center justify-center gap-2 animate-in fade-in slide-in-from-bottom-4 duration-700 relative"
          >
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-white to-blue-200">
              Trusted by Healthcare Professionals
            </span>
            <span>
              <Award className="h-6 w-6 text-blue-400" />
            </span>
          </h2>
          
          <p 
            className="text-gray-400 text-lg animate-in fade-in slide-in-from-bottom-4 duration-700 delay-300"
          >
            Hear from doctors and radiologists who use our AI platform in their daily practice.
          </p>
        </div>
        
        <div className="relative max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative z-10">
              {visibleTestimonials.map((testimonial, index) => (
                <motion.div
                  key={`${currentIndex}-${index}`}
                  custom={index}
                  variants={cardVariants}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                  className="will-change-transform"
                  style={{
                    contain: "paint layout"
                  }}
                >
                  <Card className="h-full bg-gray-800/40 border border-gray-700 hover:border-blue-500/50 transition-colors duration-300 group">
                    <CardContent className="p-6">
                      <div className="mb-4">
                        <Quote className="h-8 w-8 text-blue-400 opacity-50 group-hover:scale-110 transition-transform duration-300" />
                      </div>
                      <p 
                        className="text-gray-300 mb-6 min-h-[120px] group-hover:text-white transition-colors"
                      >
                        "{testimonial.quote}"
                      </p>
                      <div className="flex items-start space-x-2">
                        <div className="mt-1">
                          <BadgeCheck className="h-5 w-5 text-blue-400 group-hover:text-blue-300 transition-colors" />
                        </div>
                        <div>
                          <div className="font-semibold text-white">
                            {testimonial.name}
                          </div>
                          <div className="text-blue-400 text-sm">
                            {testimonial.title}
                          </div>
                          <div className="text-gray-500 text-sm">
                            {testimonial.company}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TestimonialsSection;

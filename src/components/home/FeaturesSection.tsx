import { 
  Brain, 
  Shield, 
  FileSearch, 
  Clock, 
  ChartBar, 
  Users,
  Sparkles
} from "lucide-react";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";

const FeaturesSection = () => {
  const features = [
    {
      icon: Brain,
      title: "Advanced AI Detection",
      description: "Our AI model is trained on millions of X-ray images for industry-leading accuracy.",
      gradient: "from-blue-500/20 to-purple-500/20"
    },
    {
      icon: Shield,
      title: "HIPAA Compliant",
      description: "Your medical data is secure with end-to-end encryption and strict privacy controls.",
      gradient: "from-emerald-500/20 to-teal-500/20"
    },
    {
      icon: FileSearch,
      title: "Detailed Analysis",
      description: "Get comprehensive reports including condition probability and severity assessment.",
      gradient: "from-blue-500/20 to-cyan-500/20"
    },
    {
      icon: Clock,
      title: "Instant Results",
      description: "Receive analysis in seconds rather than waiting days for traditional readings.",
      gradient: "from-purple-500/20 to-pink-500/20"
    },
    {
      icon: ChartBar,
      title: "Visual Heatmaps",
      description: "See exactly where our AI detects potential issues with intuitive visualizations.",
      gradient: "from-orange-500/20 to-amber-500/20"
    },
    {
      icon: Users,
      title: "Expert Validation",
      description: "Our AI models are validated by leading radiologists worldwide.",
      gradient: "from-teal-500/20 to-green-500/20"
    }
  ];

  return (
    <div className="relative w-full bg-black py-24 overflow-hidden">
      {/* Animated background effects */}
      <div className="absolute inset-0">
        <motion.div 
          className="absolute top-0 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl"
          animate={{ 
            opacity: [0.4, 0.7, 0.4],
            scale: [1, 1.05, 1]
          }}
          transition={{ 
            duration: 3,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
        <motion.div 
          className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl"
          animate={{ 
            opacity: [0.4, 0.7, 0.4],
            scale: [1, 1.05, 1]
          }}
          transition={{ 
            duration: 3,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 1.5
          }}
        />
      </div>

      <div className="container mx-auto px-4 relative z-10">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4 flex items-center justify-center gap-2">
              Next-Generation AI Features
              <motion.span
                animate={{ rotate: [0, 5, 0, -5, 0] }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              >
                <Sparkles className="h-6 w-6 text-blue-400" />
              </motion.span>
            </h2>
            <p className="text-gray-400 text-lg">
              Our platform leverages cutting-edge AI technology to provide precise chest X-ray analysis that rivals specialist assessment.
            </p>
          </motion.div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
            >
              <Card className="h-full bg-gray-900/40 backdrop-blur-xl border border-gray-800 hover:border-blue-500/50 transition-all duration-300 group">
                <CardContent className="p-6">
                  <motion.div 
                    className={`mb-6 p-4 rounded-xl bg-gradient-to-br ${feature.gradient} backdrop-blur-xl`}
                    whileHover={{ scale: 1.05 }}
                    transition={{ type: "spring", stiffness: 300, damping: 10 }}
                  >
                    <feature.icon className="h-8 w-8 text-white" />
                  </motion.div>
                  <h3 className="text-xl font-bold text-white mb-3 group-hover:text-blue-400 transition-colors">
                    {feature.title}
                  </h3>
                  <p className="text-gray-400 group-hover:text-gray-300 transition-colors">
                    {feature.description}
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default FeaturesSection;

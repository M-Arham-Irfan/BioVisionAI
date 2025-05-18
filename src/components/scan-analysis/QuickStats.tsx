import { motion } from "framer-motion";
import { Brain, CheckCircle2, Clock, Scan } from "lucide-react";
import { Card } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { useUserStats } from "@/hooks/useSupabaseData";

export const QuickStats = () => {
  const { user } = useAuth();
  const { stats, loading, error } = useUserStats(user?.auth_id || null);

  return (
    <div className="relative">
      {/* Futuristic background elements */}
      <div className="absolute inset-0 bg-gradient-to-b from-gray-900/50 to-gray-950/30 -z-10 rounded-xl overflow-hidden">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAxMCAwIEwgMCAwIDAgMTAiIGZpbGw9Im5vbmUiIHN0cm9rZT0icmdiYSgzMCw2NCwxNzUsMC4wNSkiIHN0cm9rZS13aWR0aD0iMSIvPjwvcGF0dGVybj48L2RlZnM+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0idXJsKCNncmlkKSIvPjwvc3ZnPg==')] opacity-20"></div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          whileHover={{ scale: 1.03 }}
          className="relative overflow-hidden"
        >
          <Card className="bg-gray-900 backdrop-blur-md rounded-lg p-4 border border-gray-800 shadow-md">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-600/5 via-blue-500/5 to-transparent"></div>
            <div className="relative flex items-center space-x-2">
              <div className="bg-blue-950/50 p-1.5 rounded-md">
                <Scan className="text-blue-400 h-4 w-4" />
              </div>
              <span className="text-sm text-gray-300">Scans Analyzed</span>
            </div>
            {loading ? (
              <div className="h-8 w-16 bg-gray-800 rounded animate-pulse mt-1"></div>
            ) : (
              <p className="text-2xl font-medium mt-2 text-white tracking-tight relative">
                {stats.total.toLocaleString()}
              </p>
            )}
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
          whileHover={{ scale: 1.03 }}
          className="relative overflow-hidden"
        >
          <Card className="bg-gray-900 backdrop-blur-md rounded-lg p-4 border border-gray-800 shadow-md">
            <div className="absolute inset-0 bg-gradient-to-br from-purple-600/5 via-purple-500/5 to-transparent"></div>
            <div className="relative flex items-center space-x-2">
              <div className="bg-purple-950/50 p-1.5 rounded-md">
                <Clock className="text-purple-400 h-4 w-4" />
              </div>
              <span className="text-sm text-gray-300">Today</span>
            </div>
            {loading ? (
              <div className="h-8 w-16 bg-gray-800 rounded animate-pulse mt-1"></div>
            ) : (
              <p className="text-2xl font-medium mt-2 text-white tracking-tight relative">
                {stats.today.toLocaleString()}
              </p>
            )}
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.2 }}
          whileHover={{ scale: 1.03 }}
          className="relative overflow-hidden"
        >
          <Card className="bg-gray-900 backdrop-blur-md rounded-lg p-4 border border-gray-800 shadow-md">
            <div className="absolute inset-0 bg-gradient-to-br from-cyan-600/5 via-cyan-500/5 to-transparent"></div>
            <div className="relative flex items-center space-x-2">
              <div className="bg-cyan-950/50 p-1.5 rounded-md">
                <Brain className="text-cyan-400 h-4 w-4" />
              </div>
              <span className="text-sm text-gray-300">AI Models</span>
            </div>
            <p className="text-2xl font-medium mt-2 text-white tracking-tight relative">
              1
            </p>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.3 }}
          whileHover={{ scale: 1.03 }}
          className="relative overflow-hidden"
        >
          <Card className="bg-gray-900 backdrop-blur-md rounded-lg p-4 border border-gray-800 shadow-md">
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-600/5 via-emerald-500/5 to-transparent"></div>
            <div className="relative flex items-center space-x-2">
              <div className="bg-emerald-950/50 p-1.5 rounded-md">
                <CheckCircle2 className="text-emerald-400 h-4 w-4" />
              </div>
              <span className="text-sm text-gray-300">Accuracy</span>
            </div>
            <p className="text-2xl font-medium mt-2 text-white tracking-tight relative">
              87.8%
            </p>
          </Card>
        </motion.div>
      </div>
    </div>
  );
};

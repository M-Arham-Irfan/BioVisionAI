import { motion } from "framer-motion";
import { AlertCircle, AlertTriangle, Clock, Zap } from "lucide-react";
import { Card } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { useCanPerformScan } from "@/hooks/useCanPerformScan";

export const RemainingScansInfo = () => {
  const { user, isAuthenticated } = useAuth();
  const { remainingScans, maxScans, performedScans, isLimited, loading } = useCanPerformScan();

  // If not limited or loading, don't show this component
  if (!isLimited || loading || remainingScans === null || maxScans === null) {
    return null;
  }

  // Calculate the percentage of scans used for the progress indicator
  const percentUsed = Math.min(100, Math.round((performedScans / maxScans) * 100));

  return (
    <div className="relative mb-6">
      {/* Futuristic background elements - different styling from QuickStats */}
      <div className="absolute inset-0 bg-gradient-to-b from-gray-900/40 to-gray-950/20 -z-10 rounded-xl overflow-hidden">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAxMCAwIEwgMCAwIDAgMTAiIGZpbGw9Im5vbmUiIHN0cm9rZT0icmdiYSgzMCw2NCwxNzUsMC4wNSkiIHN0cm9rZS13aWR0aD0iMSIvPjwvcGF0dGVybj48L2RlZnM+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0idXJsKCNncmlkKSIvPjwvc3ZnPg==')] opacity-20"></div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="relative overflow-hidden"
      >
        <Card className={`backdrop-blur-md rounded-lg p-4 border shadow-md ${
          remainingScans > 5 
            ? "bg-emerald-900/30 border-emerald-700/50" 
            : remainingScans > 0 
              ? "bg-amber-900/30 border-amber-700/50" 
              : "bg-red-900/30 border-red-700/50"
        }`}>
          <div className="flex flex-col space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                {remainingScans > 5 ? (
                  <div className="bg-emerald-950/50 p-2 rounded-md">
                    <Zap className="text-emerald-400 h-5 w-5" />
                  </div>
                ) : remainingScans > 0 ? (
                  <div className="bg-amber-950/50 p-2 rounded-md">
                    <Clock className="text-amber-400 h-5 w-5" />
                  </div>
                ) : (
                  <div className="bg-red-950/50 p-2 rounded-md">
                    <AlertTriangle className="text-red-400 h-5 w-5" />
                  </div>
                )}
                <div>
                  <div className="text-sm font-medium text-gray-200">
                    Scan Usage Today
                  </div>
                  <p className="text-xl font-medium text-white tracking-tight relative">
                    {performedScans} of {maxScans} scans used
                  </p>
                </div>
              </div>
              
              <div className="text-right">
                <div className="text-sm font-medium text-gray-200">Remaining</div>
                <p className={`text-xl font-medium tracking-tight ${
                  remainingScans > 5 ? "text-emerald-300" : 
                  remainingScans > 0 ? "text-amber-300" : 
                  "text-red-300"
                }`}>
                  {remainingScans}
                </p>
              </div>
            </div>
            
            {/* Progress bar showing usage */}
            <div className="w-full bg-gray-700/50 rounded-full h-2 overflow-hidden">
              <div 
                className={`h-full ${
                  percentUsed > 80 ? "bg-red-500" : 
                  percentUsed > 50 ? "bg-amber-500" : 
                  "bg-blue-500"
                }`}
                style={{ width: `${percentUsed}%` }}
              ></div>
            </div>
            
            {!isAuthenticated && (
              <div className="text-sm text-gray-300 mt-1">
                <p className="flex items-center">
                  <AlertCircle className="h-4 w-4 mr-1 text-gray-400 flex-shrink-0" />
                  Create an account for more scans and to save your analysis history
                </p>
              </div>
            )}
          </div>
        </Card>
      </motion.div>
    </div>
  );
}; 
import { useState } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Download,
  Share2,
  Eye,
  AlertTriangle,
  CheckCircle2,
  Info,
} from "lucide-react";
import { ScanAnalysisResult , Disease} from "@/types/database";
import { format } from "date-fns";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import { DiagnosticReport } from "./DiagnosticReport";

interface AnalysisResultsProps {
  result: ScanAnalysisResult;
  scanImage?: string;
}


export const AnalysisResults = ({
  result,
  scanImage,
}: AnalysisResultsProps) => {
  const [showReport, setShowReport] = useState(false);

  const displayCondition = result.probability < 25 ? "Normal" : result.condition;
  // Determine severity - if displaying as Normal, use Low severity
  const displaySeverity = result.probability < 25 ? "Low" : result.severity;


  const getSeverityDetails = (severity: string) => {
    switch (severity) {
      case "High":
        return {
          icon: AlertTriangle,
          color: "text-red-500",
          bgColor: "bg-red-500/10",
          borderColor: "border-red-500/30",
        };
      case "Medium":
        return {
          icon: Info,
          color: "text-amber-500",
          bgColor: "bg-amber-500/10",
          borderColor: "border-amber-500/30",
        };
      default:
        return {
          icon: CheckCircle2,
          color: "text-green-500",
          bgColor: "bg-green-500/10",
          borderColor: "border-green-500/30",
        };
    }
  };

  const severityDetails = getSeverityDetails(result.severity);
  const SeverityIcon = severityDetails.icon;

  return (
    <Card className="relative overflow-hidden bg-gray-900/80 border-gray-800 shadow-lg">
      {/* Futuristic Radial Gradient Background */}
      <div className="absolute inset-0 bg-gradient-radial from-blue-600/10 via-blue-900/5 to-transparent z-0"></div>
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAxMCAwIEwgMCAwIDAgMTAiIGZpbGw9Im5vbmUiIHN0cm9rZT0icmdiYSgzMCw2NCwxNzUsMC4wNSkiIHN0cm9rZS13aWR0aD0iMSIvPjwvcGF0dGVybj48L2RlZnM+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0idXJsKCNncmlkKSIvPjwvc3ZnPg==')] opacity-30 z-0"></div>

      <CardHeader className="relative z-10 border-b border-gray-800 bg-gray-900/50 backdrop-blur-sm">
        <div className="flex justify-between items-center">
          <CardTitle className="font-bold tracking-tight text-gray-100">
            Analysis Results
          </CardTitle>
          <Badge
            className={`${
              displayCondition === "Normal" || displayCondition === "No Finding"
                ? "bg-blue-500/20 text-blue-400 border border-blue-500/30"
                : displaySeverity === "High"
                ? "bg-red-500/20 text-red-400 border border-red-500/30"
                : displaySeverity === "Medium"
                ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                : "bg-green-500/20 text-green-400 border border-green-500/30"
            }`}
          >
            {displayCondition}
          </Badge>
        </div>
        <div className="text-sm text-gray-400 mt-1 flex items-center">
          <span className="inline-block w-2 h-2 rounded-full bg-blue-500 mr-2 animate-pulse"></span>
          Scan analyzed {format(new Date(result.performed_at), "MMM d, yyyy")} at{" "}
          {format(new Date(result.performed_at), "HH:mm")}
        </div>
      </CardHeader>

      <CardContent className="pt-6 relative z-10">
        <div className="space-y-6">
          {/* Severity and Probability */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className={`rounded-lg p-4 ${severityDetails.bgColor} border ${severityDetails.borderColor} backdrop-blur-sm`}
          >
            <div className="flex items-center mb-2">
              <SeverityIcon
                className={`h-5 w-5 mr-2 ${severityDetails.color}`}
              />
              <h3 className={`font-medium ${severityDetails.color}`}>
                {displayCondition === "Normal" || displayCondition === "No Finding"
                  ? "No Abnormalities Detected"
                  : `${displaySeverity} Risk - ${displayCondition}`}
              </h3>
            </div>
            <div className="flex justify-between items-center mt-2">
              <span className="text-sm text-gray-300">Confidence Level</span>
              <div className="flex items-center">
                <div className="w-32 bg-gray-800 rounded-full h-2 mr-2 overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${result.probability}%` }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                    className="bg-blue-600 h-full rounded-full"
                  ></motion.div>
                </div>
                <Badge
                  variant="outline"
                  className="bg-gray-900/70 border-gray-700 text-gray-200"
                >
                  {result.probability}%
                </Badge>
              </div>
            </div>
          </motion.div>

          {/* Prediction List */}
          {result.predictions && result.predictions.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.1 }}
              className="rounded-lg bg-gray-900/50 backdrop-blur-sm p-4 border border-gray-800"
            >
              <h3 className="font-medium mb-3 text-gray-200">
                Top Predictions
              </h3>

              {(() => {
              // Types
              interface Disease {
                disease_name: string;
                confidence: number;
                correlation?: number;
                isChild?: boolean;
                parentDisease?: string;
              }

              interface DiseaseGroup {
                diseases: Disease[];
                score: number;
                confidenceDeltaPenalty?: number;
                prevalenceScore?: number;
                hierarchyBonus?: number;
                explanation: string[];
              }

              const SIMILARITY_THRESHOLD = 0.03; // Base threshold for confidence similarity
              const CORRELATION_THRESHOLD = 0.65; // Base threshold for clinical relevance

              // Disease prevalence in the dataset
              const DISEASE_PREVALENCE: Record<string, number> = {
                Atelectasis: 0.103,
                Cardiomegaly: 0.025,
                Consolidation: 0.042,
                Edema: 0.021,
                Effusion: 0.119,
                Emphysema: 0.022,
                Fibrosis: 0.015,
                Hernia: 0.002,
                Infiltration: 0.177,
                Mass: 0.052,
                Nodule: 0.056,
                'Pleural Thickening': 0.030,
                Pneumonia: 0.013,
                Pneumothorax: 0.047
              };

              // Enhanced correlation map with additional relationship data
              const DISEASE_RELATIONSHIPS: Record<string, Record<string, {
                correlation: number;   // How often they co-occur
                hierarchical?: string; // 'parent', 'child', or undefined
              }>> = {
                Pneumonia: { 
                  Infiltration: { correlation: 0.85, hierarchical: 'child' }, 
                  Consolidation: { correlation: 0.78 }, 
                  Effusion: { correlation: 0.65 } 
                },
                Atelectasis: { 
                  Mass: { correlation: 0.6 }, 
                  Nodule: { correlation: 0.55 }, 
                  Pneumothorax: { correlation: 0.7 } 
                },
                Cardiomegaly: { 
                  Edema: { correlation: 0.75 }, 
                  Effusion: { correlation: 0.68 } 
                },
                Effusion: { 
                  Pneumonia: { correlation: 0.65 }, 
                  Cardiomegaly: { correlation: 0.68 }, 
                  Edema: { correlation: 0.73 } 
                },
                Edema: { 
                  Effusion: { correlation: 0.73 }, 
                  Cardiomegaly: { correlation: 0.75 } 
                },
                Mass: { 
                  Nodule: { correlation: 0.82, hierarchical: 'parent' }, 
                  Atelectasis: { correlation: 0.6 } 
                },
                Nodule: { 
                  Mass: { correlation: 0.82, hierarchical: 'child' }, 
                  Atelectasis: { correlation: 0.55 } 
                },
                Infiltration: { 
                  Pneumonia: { correlation: 0.85, hierarchical: 'parent' }, 
                  Atelectasis: { correlation: 0.5 } 
                },
                Consolidation: { 
                  Pneumonia: { correlation: 0.78 }, 
                  Infiltration: { correlation: 0.7 } 
                },
                Pneumothorax: { 
                  Atelectasis: { correlation: 0.7 } 
                }
              };

              // Function to analyze and group diseases
              function analyzeDiseasePredictions(predictions: Disease[]): DiseaseGroup[] {
                // 1. Sort predictions by confidence
                const sorted = [...predictions].sort((a, b) => b.confidence - a.confidence);
                const processed = new Set<number>();
                const groupsFirstLevel: Disease[][] = [];

                // 2. First level grouping with enhanced relationship awareness
                sorted.forEach((pred, i) => {
                  if (processed.has(i)) return;
                  const group = [pred];
                  processed.add(i);

                  sorted.forEach((other, j) => {
                    if (i === j || processed.has(j)) return;
                    
                    // Get relationship data
                    const relationship = 
                      DISEASE_RELATIONSHIPS[pred.disease_name]?.[other.disease_name] || 
                      DISEASE_RELATIONSHIPS[other.disease_name]?.[pred.disease_name];
                    
                    if (!relationship) return;
                    
                    const corr = relationship.correlation || 0;
                    const diff = Math.abs(pred.confidence - other.confidence);
                    
                    // Enhanced grouping logic with hierarchical relationship awareness
                    if ((diff <= SIMILARITY_THRESHOLD && corr >= CORRELATION_THRESHOLD) || corr >= 0.75) {
                      // Check hierarchical relationship
                      const isHierarchical = relationship.hierarchical !== undefined;
                      const enhancedOther = { 
                        ...other, 
                        correlation: corr,
                        isChild: relationship.hierarchical === 'child',
                        parentDisease: relationship.hierarchical === 'child' ? pred.disease_name : undefined
                      };
                      
                      group.push(enhancedOther);
                      processed.add(j);
                    }
                  });
                  
                  groupsFirstLevel.push(group);
                });

                // 3. Multi-level grouping: combine related groups
                const multiLevelGroups: Disease[][] = [];
                const processedGroups = new Set<number>();
                
                groupsFirstLevel.forEach((group, idx) => {
                  if (processedGroups.has(idx)) return;
                  
                  let combinedGroup = [...group];
                  processedGroups.add(idx);
                  
                  // Look for other groups that share relationships with this group
                  groupsFirstLevel.forEach((otherGroup, otherIdx) => {
                    if (idx === otherIdx || processedGroups.has(otherIdx)) return;
                    
                    // Check if any disease in this group relates to any disease in the other group
                    const hasRelationship = group.some(disease1 => 
                      otherGroup.some(disease2 => {
                        const relationship = 
                          DISEASE_RELATIONSHIPS[disease1.disease_name]?.[disease2.disease_name] || 
                          DISEASE_RELATIONSHIPS[disease2.disease_name]?.[disease1.disease_name];
                        return relationship && relationship.correlation >= CORRELATION_THRESHOLD;
                      })
                    );
                    
                    if (hasRelationship) {
                      combinedGroup = [...combinedGroup, ...otherGroup];
                      processedGroups.add(otherIdx);
                    }
                  });
                  
                  multiLevelGroups.push(combinedGroup);
                });

                // 4. Score calculation with multiple factors
                const calculateGroupScore = (group: Disease[]): DiseaseGroup => {
                  const avgConf = group.reduce((sum, p) => sum + p.confidence, 0) / group.length;
                  const primaryDisease = group[0];
                  const explanations: string[] = [];
                  
                  // Add primary disease to explanation
                  explanations.push(`Primary finding: ${primaryDisease.disease_name} (${(primaryDisease.confidence * 100).toFixed(1)}% confidence)`);
                  
                  // For single disease
                  if (group.length === 1) {
                    const prevalence = DISEASE_PREVALENCE[primaryDisease.disease_name] || 0;
                    
                    // Adjust score based on AUC and prevalence
                    const score = avgConf * (1 + prevalence);
                    
                    explanations.push(`Disease prevalence factor: ${prevalence.toFixed(3)}`);
                    
                    return {
                      diseases: group,
                      score: score,
                      prevalenceScore: prevalence,
                      explanation: explanations
                    };
                  }
                  
                  // For disease groups
                  let avgCorr = 0;
                  let confidenceDeltaPenalty = 0;
                  let prevalenceScore = 0;
                  let hierarchyBonus = 0;
                  
                  // Calculate correlation score
                  const correlations = group.slice(1).map(p => p.correlation || 0);
                  avgCorr = correlations.reduce((sum, c) => sum + c, 0) / correlations.length;
                  
                  // Calculate confidence delta penalty (0 to 0.5 range)
                  group.slice(1).forEach(disease => {
                    const confidenceDelta = Math.abs(primaryDisease.confidence - disease.confidence);
                    const expectedDelta = 0.1 * (1 - (disease.correlation || 0)); // Lower correlation = higher expected delta
                    const unexpectedDelta = Math.max(0, confidenceDelta - expectedDelta);
                    confidenceDeltaPenalty += unexpectedDelta;
                  });
                  confidenceDeltaPenalty = confidenceDeltaPenalty / (group.length - 1);
                  
                  // Calculate prevalence alignment
                  prevalenceScore = group.reduce((sum, disease) => sum + (DISEASE_PREVALENCE[disease.disease_name] || 0), 0) / group.length;
                  
                  // Calculate hierarchy bonus (if present)
                  const hierarchicalRelations = group.filter(d => d.isChild || d.parentDisease).length;
                  hierarchyBonus = hierarchicalRelations > 0 ? 0.1 * (hierarchicalRelations / (group.length - 1)) : 0;
                  
                  // Final weighted score calculation
                  const baseScore = avgConf * avgCorr;
                  const finalScore = baseScore * (1 - confidenceDeltaPenalty) * (1 + prevalenceScore) * (1 + hierarchyBonus);
                  
                  // Add explanations
                  explanations.push(`Group of ${group.length} related conditions with average correlation of ${avgCorr.toFixed(2)}`);
                  
                  if (confidenceDeltaPenalty > 0) {
                    explanations.push(`Confidence inconsistency penalty: ${(confidenceDeltaPenalty * 100).toFixed(1)}%`);
                  }
                  
                  if (prevalenceScore > 0) {
                    explanations.push(`Group prevalence factor: ${prevalenceScore.toFixed(3)}`);
                  }
                  
                  if (hierarchyBonus > 0) {
                    explanations.push(`Hierarchical relationship bonus: ${(hierarchyBonus * 100).toFixed(1)}%`);
                  }
                  
                  return {
                    diseases: group,
                    score: finalScore,
                    confidenceDeltaPenalty,
                    prevalenceScore,
                    hierarchyBonus,
                    explanation: explanations
                  };
                };

                // 5. Calculate scores and select top groups
                const scoredGroups = multiLevelGroups.map(group => calculateGroupScore(group));
                return scoredGroups.sort((a, b) => b.score - a.score).slice(0, 3);
              }

              // UI component for rendering the results
              return (
                <div className="space-y-6">
                  {analyzeDiseasePredictions(result.predictions).map((group, idx) => (
                    <div key={idx} className="mt-4 p-4 bg-gray-900/40 rounded-lg border border-gray-800">
                      <h3 className="text-sm font-medium text-gray-300 mb-1">
                        Possible {group.diseases.length > 1 ? "Group" : ""} Condition {idx + 1}
                      </h3>
                      
                      {/* Enhanced score display with components */}
                      <div className="mb-3 px-3 py-2 bg-gray-800/50 rounded text-xs">
                        <div className="flex justify-between items-center">
                          <span className="text-gray-400 font-medium">Group Score: {group.score.toFixed(3)}</span>
                          {group.confidenceDeltaPenalty !== undefined && (
                            <span className={`text-${group.confidenceDeltaPenalty > 0.1 ? 'yellow' : 'green'}-400`}>
                              Confidence alignment: {((1-group.confidenceDeltaPenalty) * 100).toFixed()}%
                            </span>
                          )}
                        </div>
                      </div>
                      
                      {/* Explainability component */}
                      <div className="mb-3 text-xs text-gray-400 border-l-2 border-blue-500/30 pl-3">
                        {group.explanation.map((exp, i) => (
                          <p key={i} className="mb-1">{exp}</p>
                        ))}
                      </div>
                      
                      {group.diseases.length > 1 && (
                        <div className="flex items-center mb-2">
                          <div className="h-2 w-2 rounded-full bg-blue-500 mr-2" />
                          <span className="text-xs text-blue-400">
                            Related conditions with clinical correlation
                          </span>
                        </div>
                      )}

                      {group.diseases.map((disease, i) => (
                        <div
                          key={i}
                          className={`flex justify-between items-center my-2 ${
                            group.diseases.length > 1 ? 'pl-4 border-l-2 border-blue-500/50' : ''
                          }`}
                        >
                          <div className="flex-1">
                            <span className="text-sm text-gray-300">{disease.disease_name}</span>
                            
                            {group.diseases.length === 1 && (
                              <span className="ml-2 text-xs text-gray-400">
                                Score: {(disease.confidence).toFixed(3)}
                              </span>
                            )}
                            
                            {i === 0 && group.diseases.length > 1 && (
                              <span className="ml-2 px-1.5 py-0.5 text-xs rounded bg-blue-900/40 text-blue-400 border border-blue-500/30">
                                Primary
                              </span>
                            )}
                            
                            {i > 0 && (
                              <span className="ml-2 px-1.5 py-0.5 text-xs rounded bg-indigo-900/40 text-indigo-400 border border-indigo-500/30">
                                Related
                              </span>
                            )}
                            
                            {disease.isChild && (
                              <span className="ml-2 px-1.5 py-0.5 text-xs rounded bg-purple-900/40 text-purple-400 border border-purple-500/30">
                                Subtype
                              </span>
                            )}
                            
                            {disease.parentDisease && (
                              <span className="ml-2 px-1.5 py-0.5 text-xs rounded bg-green-900/40 text-green-400 border border-green-500/30">
                                Parent: {disease.parentDisease}
                              </span>
                            )}
                            
                            {disease.correlation != null && i > 0 && (
                              <span className="ml-2 text-xs text-gray-400">
                                ({Math.round(disease.correlation * 100)}% correlation)
                              </span>
                            )}
                          </div>

                          <div className="flex items-center">
                            <div className="flex items-center ml-2 text-xs text-gray-500">
                              Prevalence: {((DISEASE_PREVALENCE[disease.disease_name] || 0) * 100).toFixed(1)}%
                            </div>
                            <div className="w-32 bg-gray-800 rounded-full h-2 mx-2 overflow-hidden">
                              <div
                                className={`h-full rounded-full ${
                                  group.diseases.length > 1
                                    ? i === 0
                                      ? 'bg-blue-600'
                                      : disease.isChild
                                        ? 'bg-purple-600'
                                        : 'bg-indigo-600'
                                    : 'bg-cyan-600'
                                }`}
                                style={{ width: `${Math.round(disease.confidence * 100)}%` }}
                              ></div>
                            </div>
                            <span className="text-xs font-medium text-cyan-400">
                              {Math.round(disease.confidence * 100)}%
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              );
            })()}
            </motion.div>
          )}

          {/* Recommendation */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.2 }}
            className="rounded-lg bg-gray-900/50 backdrop-blur-sm p-4 border border-gray-800"
          >
            <h3 className="font-medium mb-2 text-gray-200">
              Medical Recommendation
            </h3>
            <p className="text-sm text-gray-300">              
              {displayCondition === "Normal"
                ? "No significant abnormalities detected. Continue with regular health check-ups as recommended by your healthcare provider."
                : result.recommendation}</p>
          </motion.div>

          {/* Actions */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3, delay: 0.3 }}
            className="flex justify-between items-center pt-2"
          >
            <div className="space-x-2">
              <Button
                size="sm"
                variant="outline"
                className="bg-indigo-900/30 border-indigo-400/50 text-indigo-100 hover:bg-indigo-800/40 hover:text-white backdrop-blur-md transition-all duration-300"
                onClick={() => setShowReport(true)}
              >
                <Download className="h-4 w-4 mr-1" /> Export Report
              </Button>
            </div>
          </motion.div>
        </div>
      </CardContent>

      {/* Report Dialog */}
      <Dialog open={showReport} onOpenChange={setShowReport}>
        <DialogContent className="max-w-none w-fit p-0 bg-gray-900 border-gray-800 max-h-[90vh] overflow-hidden">
          <VisuallyHidden>
            <DialogHeader>
              <DialogTitle>Scan Analysis Report</DialogTitle>
              <DialogDescription>
                A detailed report of the scan analysis, including findings and recommendations.
              </DialogDescription>
            </DialogHeader>
          </VisuallyHidden>
          {showReport && scanImage && (
            <DiagnosticReport
              result={{
                ...result,
                condition: displayCondition,
                severity: displaySeverity
              }}
              scanImage={scanImage}
              onGenerateComplete={() => setShowReport(false)}
            />
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
};

import { useEffect, useRef, useState } from 'react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { ScanAnalysisResult } from '@/types/database';
import { format } from 'date-fns';
import { Card } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Activity, Info, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

interface DiagnosticReportProps {
  result: ScanAnalysisResult & {
    id?: string | number;
    date?: string;
  };
  scanImage: string;
  onGenerateComplete?: () => void;
}

export const DiagnosticReport = ({ result, scanImage, onGenerateComplete }: DiagnosticReportProps) => {
  const reportRef = useRef<HTMLDivElement>(null);
  const [generating, setGenerating] = useState(false);

  console.log('DiagnosticReport received result:', JSON.stringify(result));
  console.log('DiagnosticReport result.performed_at (for date):', result.performed_at);

  const formatDate = (dateString?: string, isDateOfBirth = false) => {
    if (dateString) {
      const dateObj = new Date(dateString);
      if (!isNaN(dateObj.getTime())) {
        return isDateOfBirth 
          ? format(dateObj, 'MMM d, yyyy') 
          : format(dateObj, 'MMM d, yyyy HH:mm');
      }
    }
    console.warn('Invalid or missing dateString for formatting in DiagnosticReport:', dateString);
    return 'N/A';
  };

  const generatePDF = async () => {
    if (!reportRef.current) return;
    
    setGenerating(true);
    toast.info("Generating PDF report...");
    
    try {
      await document.fonts.ready;
      await new Promise(resolve => setTimeout(resolve, 500)); // Increased delay for better rendering

      const reportElement = reportRef.current;

      console.log('Report dimensions before capture:', {
        scrollHeight: reportElement.scrollHeight,
        offsetHeight: reportElement.offsetHeight,
        clientWidth: reportElement.clientWidth,
        scrollWidth: reportElement.scrollWidth
      });

      // Create a temporary container for the report
      const tempContainer = document.createElement('div');
      tempContainer.style.position = 'absolute';
      tempContainer.style.left = '-9999px';
      tempContainer.style.top = '0';
      tempContainer.style.width = `${reportElement.scrollWidth}px`;
      tempContainer.style.height = `${reportElement.scrollHeight}px`;
      tempContainer.style.overflow = 'visible';
      
      // Clone the report node and preserve exact styling and layout
      const clone = reportElement.cloneNode(true) as HTMLElement;
      clone.style.transform = 'none';
      clone.style.width = `${reportElement.scrollWidth}px`;
      clone.style.height = `${reportElement.scrollHeight}px`;
      clone.style.overflow = 'visible';
      
      // Fix icon alignment in the cloned element
      const headings = clone.querySelectorAll('.text-xl.font-semibold');
      headings.forEach(heading => {
        const icon = heading.querySelector('svg');
        if (icon) {
          (icon as unknown as HTMLElement).style.verticalAlign = 'middle';
          (icon as unknown as HTMLElement).style.display = 'inline-block';
          (icon as unknown as HTMLElement).style.position = 'relative';
          (icon as unknown as HTMLElement).style.top = '0';
        }
      });
      
      tempContainer.appendChild(clone);
      document.body.appendChild(tempContainer);

      // Improved html2canvas settings
      const canvas = await html2canvas(clone, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        logging: false,
        backgroundColor: '#ffffff',
        scrollX: 0,
        scrollY: 0,
        width: reportElement.scrollWidth,
        height: reportElement.scrollHeight,
        imageTimeout: 0, // No timeout
        onclone: (doc, element) => {
          element.style.width = `${reportElement.scrollWidth}px`;
          element.style.height = `${reportElement.scrollHeight}px`;
          element.style.overflow = 'visible';
          
          // Apply additional fixes for icon alignment
          const icons = element.querySelectorAll('svg');
          icons.forEach(icon => {
            (icon as unknown as HTMLElement).style.display = 'inline-block';
            (icon as unknown as HTMLElement).style.verticalAlign = 'text-bottom';
          });
        }
      });
      
      document.body.removeChild(tempContainer);
      
      // Create PDF with exact A4 dimensions
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
        compress: true
      });

      // A4 dimensions
      const pageWidth = 210;
      const pageHeight = 297;
      const margin = 10;
      const contentWidth = pageWidth - (margin * 2);
      
      // Preserve aspect ratio exactly
      const canvasWidth = canvas.width;
      const canvasHeight = canvas.height;
      const aspectRatio = canvasHeight / canvasWidth;
      const scaledWidth = contentWidth;
      const scaledHeight = contentWidth * aspectRatio;

      // Calculate number of pages needed
      const totalPages = Math.ceil(scaledHeight / (pageHeight - (margin * 2)));
      
      console.log('PDF generation info:', {
        canvasWidth,
        canvasHeight,
        scaledHeight,
        totalPages,
        aspectRatio
      });
      
      // Split the canvas across multiple PDF pages
      for (let i = 0; i < totalPages; i++) {
        if (i > 0) {
          pdf.addPage();
        }

        // Calculate what portion of the canvas to use for this page
        const sourceY = i * canvasHeight / totalPages;
        const sourceHeight = canvasHeight / totalPages;

        // Create a temporary canvas for this page slice
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = canvasWidth;
        tempCanvas.height = sourceHeight;
        const tempCtx = tempCanvas.getContext('2d');

        if (tempCtx) {
          // Draw the slice of the original canvas onto the temp canvas
          tempCtx.drawImage(
            canvas,
            0,
            sourceY,
            canvasWidth,
            sourceHeight,
            0,
            0,
            canvasWidth,
            sourceHeight
          );
          
          // Add the slice to the PDF with exact aspect ratio
          pdf.addImage(
            tempCanvas.toDataURL('image/png'),
            'PNG',
            margin,
            margin,
            scaledWidth,
            (sourceHeight * scaledWidth) / canvasWidth
          );
        }
      }
      
      pdf.save(`BioVision-AI-Report-${format(new Date(), 'yyyy-MM-dd-HHmm')}.pdf`);
      toast.success("PDF report generated successfully!");
    } catch (err) {
      console.error("PDF generation failed:", err);
      toast.error("Failed to generate PDF report. Please try again.");
    } finally {
      setGenerating(false);
      if (onGenerateComplete) {
        onGenerateComplete();
      }
    }
  };

  useEffect(() => {
    generatePDF();
  }, []);

  return (
    <div className="flex flex-col">
      <div 
        ref={reportRef} 
        className="w-[210mm] bg-white text-black p-8 mx-auto" 
        style={{ maxHeight: "80vh", overflowY: "auto" }}
      >
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-blue-900 font-orbitron">BioVision AI</h1>
            <p className="text-gray-600">Advanced Medical Imaging Analysis</p>
          </div>
          <div className="text-right">
            <p className="text-gray-600">Report Date:</p>
            <p className="font-medium">{format(new Date(), 'MMMM d, yyyy')}</p>
            <p className="text-gray-600">Report ID:</p>
            <p className="font-medium">{result.id}</p>
          </div>
        </div>

        <Separator className="my-4" />

        {/* Patient Information */}
        {result.patient_info && (
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-blue-900 mb-3 flex items-center">
              <Activity className="mr-2 h-5 w-5 inline-block align-text-bottom" />
              Patient Information
            </h2>
            <Card className="p-4 bg-gray-50">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-gray-600">Full Name:</p>
                  <p className="font-medium">{result.patient_info.first_name} {result.patient_info.last_name}</p>
                </div>
                <div>
                  <p className="text-gray-600">Date of Birth:</p>
                  <p className="font-medium">{formatDate(result.patient_info.date_of_birth, true)}</p>
                </div>
                <div>
                  <p className="text-gray-600">Gender:</p>
                  <p className="font-medium">{result.patient_info.gender}</p>
                </div>
                <div>
                  <p className="text-gray-600">Location:</p>
                  <p className="font-medium">{result.patient_info.city}, {result.patient_info.country}</p>
                </div>
              </div>
            </Card>
          </div>
        )}

        {/* Analysis Summary */}
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-blue-900 mb-3 flex items-center">
            <Activity className="mr-2 h-5 w-5 inline-block align-text-bottom" />
            Analysis Summary
          </h2>
          <Card className="p-4 bg-gray-50">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-gray-600">Condition:</p>
                <p className="font-medium">{result.condition}</p>
              </div>
              <div>
                <p className="text-gray-600">Confidence Level:</p>
                <p className="font-medium">{result.probability}%</p>
              </div>
              <div>
                <p className="text-gray-600">Severity:</p>
                <p className="font-medium">{result.severity}</p>
              </div>
              <div>
                <p className="text-gray-600">Analysis Date:</p>
                <p className="font-medium">{formatDate(result.performed_at)}</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Medical Images */}
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-blue-900 mb-3">Medical Images</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-600 mb-2">Original Scan</p>
              <img 
                src={scanImage} 
                alt="Original scan" 
                className="h-56 w-auto rounded-lg border object-contain mx-auto" 
              />
            </div>
            {result.heatmap_url && (
              <div>
                <p className="text-sm text-gray-600 mb-2">Analysis Heatmap</p>
                <img 
                  src={result.heatmap_url} 
                  alt="Analysis heatmap" 
                  className="h-56 w-auto rounded-lg border object-contain mx-auto" 
                />
              </div>
            )}
          </div>
        </div>

        {/* Detailed Predictions */}
        {result.predictions && result.predictions.length > 0 && (
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-blue-900 mb-3">Detailed Analysis</h2>
            <Card className="p-4 bg-gray-50">
              <table className="w-full">
                <thead>
                  <tr>
                    <th className="text-left text-gray-600 pb-2">Condition</th>
                    <th className="text-right text-gray-600 pb-2">Probability</th>
                  </tr>
                </thead>
                <tbody>
                  {result.predictions.map((prediction, index) => (
                    <tr key={index} className="border-t">
                      <td className="py-2">{prediction.disease_name}</td>
                      <td className="text-right py-2">{Math.round(prediction.confidence * 100)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          </div>
        )}

        {/* Recommendations */}
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-blue-900 mb-3 flex items-center">
            <Info className="mr-2 h-5 w-5 inline-block align-text-bottom" />
            Medical Recommendation
          </h2>
          <Card className="p-4 bg-gray-50">
            <p className="whitespace-pre-line">{result.recommendation}</p>
          </Card>
        </div>

        {/* Disclaimer */}
        <div className="mt-8 border-t pt-4">
          <div className="flex items-start space-x-2 text-gray-600">
            <AlertTriangle className="h-5 w-5 flex-shrink-0 text-amber-500 mt-0.5" />
            <div className="text-sm">
              <p className="font-semibold mb-1">Important Disclaimer:</p>
              <p>This report is generated by an AI system and is intended for informational purposes only. 
              It should not be used as a substitute for professional medical advice, diagnosis, or treatment. 
              The results and recommendations provided should be reviewed and validated by qualified healthcare 
              professionals. BioVision AI's analysis is a supplementary tool and should not be used as the sole 
              basis for medical decisions.</p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center text-sm text-gray-500">
          <p>Generated by BioVision AI - Advanced Medical Imaging Analysis</p>
          <p>© {new Date().getFullYear()} BioVision AI. All rights reserved.</p>
        </div>
      </div>
      
      {generating && (
        <div className="p-4 flex justify-center">
          <div className="animate-pulse text-blue-500">Generating PDF...</div>
        </div>
      )}
    </div>
  );
};

import React from 'react';
import DualViewDisplay from "@/components/scan-analysis/DualViewDisplay"; // Assuming this is the correct path

interface RefactoredDualViewProps {
  originalImage: string | null | undefined;
  heatmapImage: string | null | undefined;
  // Add any other props DualViewDisplay might need or that were implied by ScanDetailsDualView
}

const RefactoredDualView: React.FC<RefactoredDualViewProps> = ({
  originalImage,
  heatmapImage,
}) => {
  // The original ScanDetailsDualView had a fixed height of 400px and some overrides.
  // We'll try to achieve this with Tailwind and by passing props to DualViewDisplay if possible.
  // DualViewDisplay would ideally accept a className for its container to allow these overrides.

  // If DualViewDisplay doesn't support className for its root, we might need to wrap it
  // or modify DualViewDisplay itself (which is outside the scope of this refactor for now).

  // Assuming DualViewDisplay internally handles its own loading and isDicom states, 
  // or these should be passed if they are dynamic.
  // The original had isLoading={false} isDicom={false} hardcoded.

  return (
    <div className="relative w-full h-[400px] overflow-hidden bg-transparent scan-details-dual-view-wrapper">
      {/* 
        The original <style> tag targeted:
        - .absolute.top-4.right-4 -> top: 8px; right: 8px; z-index: 20;
        - .min-h-\[500px\] -> min-height: 400px !important; max-height: 400px !important;
        - .bg-gradient-to-b -> background: transparent !important;
        
        These are hard to replicate perfectly without knowing DualViewDisplay's internal structure 
        or modifying it. We'll apply to this wrapper where possible.
        The `DualViewDisplay` itself should be responsible for its internal layout.
        If `DualViewDisplay` uses Tailwind, its internal `min-h-[500px]` and `bg-gradient-to-b` 
        would need to be conditional or accept overrides.
      */}
      <DualViewDisplay
        originalImage={originalImage}
        heatmapImage={heatmapImage}
        isLoading={false} // as per original hardcoding
        isDicom={false}   // as per original hardcoding
        // It would be ideal if DualViewDisplay accepted a containerClassName or similar
        // e.g., containerClassName="!min-h-[400px] !max-h-[400px] !bg-transparent"
      />
      {/* 
        The control positioning (top-4 right-4) would ideally be part of DualViewDisplay's props 
        or its internal configurable styling. Overriding with global CSS via <style> is not ideal.
        If DualViewDisplay renders controls that have fixed classes, one might need to use CSS modules
        or a more specific global CSS override if absolutely necessary, but this is a last resort.
        For now, we omit the <style> tag and assume DualViewDisplay can be configured or its styles adapted.
      */}
    </div>
  );
};

export default RefactoredDualView; 
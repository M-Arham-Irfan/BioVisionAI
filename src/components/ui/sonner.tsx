import { useTheme } from "next-themes"
import { Toaster as Sonner } from "sonner"
import { useEffect } from "react"

type ToasterProps = React.ComponentProps<typeof Sonner>

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme()

  // Add Sonner-specific animation styles
  useEffect(() => {
    const style = document.createElement('style')
    style.innerHTML = `
      [data-sonner-toaster][data-theme=system],
      [data-sonner-toaster][data-theme=light],
      [data-sonner-toaster][data-theme=dark] {
        --front-bg: rgba(15, 23, 42, 0.9);
        --front-border: rgba(0, 240, 255, 0.4);
        --front-text: #f1f5f9;
        --normal-bg: rgba(15, 23, 42, 0.9);
        --normal-border: rgba(0, 240, 255, 0.4);
        --normal-text: #f1f5f9;
        --border-opacity: 0.4;
        --backdrop-filter: blur(6px);
      }
      
      [data-sonner-toast] {
        will-change: opacity;
        transition: opacity 300ms, height 300ms, box-shadow 200ms;
      }
      
      [data-sonner-toast]:hover {
        box-shadow: 0 0 15px rgba(0, 240, 255, 0.4) !important;
      }
      
      [data-sonner-toast][data-styled=true] {
        background: var(--front-bg);
        border: 1px solid var(--front-border);
        color: var(--front-text);
        backdrop-filter: var(--backdrop-filter);
        border-radius: 0.5rem;
        box-shadow: 0 0 10px rgba(0, 240, 255, 0.2);
        padding: 0.75rem 1rem;
      }

      [data-sonner-toast] [data-icon] {
        animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
      }
    `
    document.head.appendChild(style)
    
    return () => {
      document.head.removeChild(style)
    }
  }, [])

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-slate-900/90 group-[.toaster]:backdrop-blur-sm group-[.toaster]:text-slate-100 group-[.toaster]:border-futuristic-cyber-blue/40 group-[.toaster]:shadow-[0_0_10px_rgba(0,240,255,0.2)] group-[.toaster]:rounded-md group-[.toaster]:p-3 group-[.toaster]:px-4 group-[.toaster]:hover:shadow-[0_0_15px_rgba(0,240,255,0.4)]",
          description: "group-[.toast]:text-slate-300 group-[.toast]:font-inter",
          title: "group-[.toast]:font-poppins group-[.toast]:font-semibold",
          actionButton:
            "group-[.toast]:bg-slate-800/70 group-[.toast]:text-futuristic-cyber-blue group-[.toast]:border-futuristic-cyber-blue/40 group-[.toast]:shadow-sm",
          cancelButton:
            "group-[.toast]:bg-slate-800/70 group-[.toast]:text-slate-300 group-[.toast]:border-slate-700 group-[.toast]:shadow-sm",
          success: 
            "group-[.toaster]:border-futuristic-electric-green/40 group-[.toaster]:shadow-[0_0_10px_rgba(124,252,0,0.2)] group-[.toaster]:hover:shadow-[0_0_15px_rgba(124,252,0,0.4)]",
          error: 
            "group-[.toaster]:border-futuristic-red/40 group-[.toaster]:shadow-[0_0_15px_rgba(255,76,76,0.3)] group-[.toaster]:hover:shadow-[0_0_20px_rgba(255,76,76,0.5)]",
          warning: 
            "group-[.toaster]:border-futuristic-orange/40 group-[.toaster]:shadow-[0_0_10px_rgba(255,165,0,0.2)] group-[.toaster]:hover:shadow-[0_0_15px_rgba(255,165,0,0.4)]",
          info: 
            "group-[.toaster]:border-medical-600/40 group-[.toaster]:shadow-[0_0_10px_rgba(24,144,255,0.2)] group-[.toaster]:hover:shadow-[0_0_15px_rgba(24,144,255,0.4)]",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }

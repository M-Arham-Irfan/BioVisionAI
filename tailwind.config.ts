import type { Config } from "tailwindcss";

export default {
	darkMode: ["class"],
	content: [
		"./pages/**/*.{ts,tsx}",
		"./components/**/*.{ts,tsx}",
		"./app/**/*.{ts,tsx}",
		"./src/**/*.{ts,tsx}",
	],
	prefix: "",
	theme: {
		container: {
			center: true,
			padding: '2rem',
			screens: {
				'2xl': '1400px'
			}
		},
		extend: {
			fontFamily: {
				'poppins': ['Poppins', 'sans-serif'],
				'orbitron': ['Orbitron', 'sans-serif'],
				'roboto-mono': ['"Roboto Mono"', 'monospace'],
				'raleway': ['Raleway', 'sans-serif'],
				'inter': ['Inter', 'sans-serif'],
			},
			colors: {
				border: 'hsl(var(--border))',
				input: 'hsl(var(--input))',
				ring: 'hsl(var(--ring))',
				background: 'hsl(var(--background))',
				foreground: 'hsl(var(--foreground))',
				primary: {
					DEFAULT: 'hsl(var(--primary))',
					foreground: 'hsl(var(--primary-foreground))'
				},
				secondary: {
					DEFAULT: 'hsl(var(--secondary))',
					foreground: 'hsl(var(--secondary-foreground))'
				},
				destructive: {
					DEFAULT: 'hsl(var(--destructive))',
					foreground: 'hsl(var(--destructive-foreground))'
				},
				muted: {
					DEFAULT: 'hsl(var(--muted))',
					foreground: 'hsl(var(--muted-foreground))'
				},
				accent: {
					DEFAULT: 'hsl(var(--accent))',
					foreground: 'hsl(var(--accent-foreground))'
				},
				popover: {
					DEFAULT: 'hsl(var(--popover))',
					foreground: 'hsl(var(--popover-foreground))'
				},
				card: {
					DEFAULT: 'hsl(var(--card))',
					foreground: 'hsl(var(--card-foreground))'
				},
				sidebar: {
					DEFAULT: 'hsl(var(--sidebar-background))',
					foreground: 'hsl(var(--sidebar-foreground))',
					primary: 'hsl(var(--sidebar-primary))',
					'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
					accent: 'hsl(var(--sidebar-accent))',
					'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
					border: 'hsl(var(--sidebar-border))',
					ring: 'hsl(var(--sidebar-ring))'
				},
				// BioVision custom colors
				medical: {
					100: '#e6f7ff',
					200: '#bae7ff',
					300: '#91d5ff',
					400: '#69c0ff',
					500: '#40a9ff',
					600: '#1890ff',
					700: '#096dd9',
					800: '#0050b3',
					900: '#003a8c',
				},
				aigreen: {
					100: '#e6fffb',
					300: '#87e8de',
					500: '#36cfc9',
					700: '#08979c',
					900: '#006d75',
				},
				// Futuristic UI colors
				futuristic: {
					'deep-blue': '#0f0c29',
					'indigo': '#302b63',
					'slate': '#24243e',
					'cyber-blue': '#00f0ff',
					'electric-green': '#7CFC00',
					'orange': '#FFA500',
					'aqua': '#3DF0C2',
					'blue': '#00c6ff',
					'blue-purple': '#0072ff',
					'red': '#FF4C4C',
				},
			},
			borderRadius: {
				lg: 'var(--radius)',
				md: 'calc(var(--radius) - 2px)',
				sm: 'calc(var(--radius) - 4px)'
			},
			keyframes: {
				'accordion-down': {
					from: {
						height: '0'
					},
					to: {
						height: 'var(--radix-accordion-content-height)'
					}
				},
				'accordion-up': {
					from: {
						height: 'var(--radix-accordion-content-height)'
					},
					to: {
						height: '0'
					}
				},
				'pulse-slow': {
					'0%, 100%': { opacity: '0.4' },
					'50%': { opacity: '0.7' }
				},
				'float': {
					'0%': { transform: 'translateY(0%)' },
					'50%': { transform: 'translateY(100%)' },
					'100%': { transform: 'translateY(0%)' }
				},
				'ripple': {
					'0%': { transform: 'scale(0.8)', opacity: '1' },
					'100%': { transform: 'scale(2)', opacity: '0' },
				},
				'glow': {
					'0%': { opacity: '0.1', boxShadow: '0 0 5px 2px rgba(0, 240, 255, 0.3)' },
					'50%': { opacity: '0.3', boxShadow: '0 0 20px 5px rgba(0, 240, 255, 0.6)' },
					'100%': { opacity: '0.1', boxShadow: '0 0 5px 2px rgba(0, 240, 255, 0.3)' }
				},
				'analyze-dots': {
					'0%': { content: '"."' },
					'33%': { content: '".."' },
					'66%': { content: '"..."' },
					'100%': { content: '"."' },
				},
				'scan-rotate': {
					'0%': { transform: 'rotate(0deg)' },
					'100%': { transform: 'rotate(360deg)' },
				},
				'scan-pulse': {
					'0%': { transform: 'scale(1)', opacity: '1' },
					'50%': { transform: 'scale(1.03)', opacity: '0.8' },
					'100%': { transform: 'scale(1)', opacity: '1' },
				},
				'infinite-scroll': {
					'0%': { transform: 'translateX(0)' },
					'100%': { transform: 'translateX(calc(-100% / 3))' }
				},
				'marquee': {
					'0%': { transform: 'translateX(0%)' },
					'100%': { transform: 'translateX(-100%)' }
				}
			},
			animation: {
				'accordion-down': 'accordion-down 0.2s ease-out',
				'accordion-up': 'accordion-up 0.2s ease-out',
				'spin-slow': 'spin 20s linear infinite',
				'pulse-slow': 'pulse-slow 3s ease-in-out infinite',
				'float': 'float 8s ease-in-out infinite',
				'ripple': 'ripple 1.5s ease-out infinite',
				'glow': 'glow 3s ease-in-out infinite',
				'scan-rotate': 'scan-rotate 20s linear infinite',
				'scan-pulse': 'scan-pulse 3s ease-in-out infinite',
				'infinite-scroll': 'infinite-scroll 20s linear infinite',
				'marquee': 'marquee 30s linear infinite',
			},
			backgroundImage: {
				'gradient-futuristic': 'linear-gradient(135deg, #0f0c29, #302b63, #24243e)',
				'gradient-progress': 'linear-gradient(90deg, #00c6ff, #0072ff)',
			}
		}
	},
	plugins: [require("tailwindcss-animate")],
} satisfies Config;

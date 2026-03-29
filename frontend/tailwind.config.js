/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    darkMode: 'class',
    theme: {
        extend: {
            colors: {
                primary: "rgb(var(--color-primary) / <alpha-value>)",
                "primary-light": "rgb(var(--color-primary-light) / <alpha-value>)",
                secondary: "rgb(var(--color-secondary) / <alpha-value>)",
                background: "rgb(var(--bg-page) / <alpha-value>)",
                surface: "rgb(var(--bg-surface) / <alpha-value>)",
                "surface-elevated": "rgb(var(--bg-surface-elevated) / <alpha-value>)",
                "text-main": "rgb(var(--text-heading) / <alpha-value>)",
                "text-sub": "rgb(var(--text-body) / <alpha-value>)",
                "text-muted": "rgb(var(--text-muted) / <alpha-value>)",
                "border-subtle": "rgb(var(--border-subtle) / <alpha-value>)",
                "border-strong": "rgb(var(--border-strong) / <alpha-value>)",
                // Medical theme colors
                "medical-green": "#2E7D32",
                "medical-light": "#4CAF50",
                "medical-soft": "#F5F9F6",
                "medical-white": "#FFFFFF",
            },
            fontFamily: {
                sans: ['Inter', 'sans-serif'],
                display: ['Syne', 'sans-serif'],
            },
            animation: {
                'fade-in': 'fadeIn 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards',
                'slide-up': 'slideUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards',
            },
            keyframes: {
                fadeIn: {
                    '0%': { opacity: '0' },
                    '100%': { opacity: '1' },
                },
                slideUp: {
                    '0%': { transform: 'translateY(20px)', opacity: '0' },
                    '100%': { transform: 'translateY(0)', opacity: '1' },
                }
            }
        },
    },
    plugins: [],
}

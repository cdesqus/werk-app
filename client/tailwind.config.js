/** @type {import('tailwindcss').Config} */
export default {
    darkMode: 'class',
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                background: "rgba(var(--background), <alpha-value>)",
                foreground: "rgba(var(--foreground), <alpha-value>)",
                card: "rgba(var(--card), <alpha-value>)",
                'card-foreground': "rgba(var(--card-foreground), <alpha-value>)",
                border: "rgba(var(--border), <alpha-value>)",
                primary: '#a3e635', // lime-400
            },
            fontFamily: {
                sans: ['Inter', 'sans-serif'],
            },
            borderRadius: {
                '3xl': '1.5rem',
            }
        },
    },
    plugins: [],
}

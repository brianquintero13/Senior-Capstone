// tailwind.config.js
module.exports = {
    content: [
        "./app/**/*.{js,ts,jsx,tsx,mdx}",
        "./pages/**/*.{js,ts,jsx,tsx,mdx}",
        "./components/**/*.{js,ts,jsx,tsx,mdx}",
        "./public/**/*.{html}", // so Tailwind can see any static HTML if you use it later
    ],
    theme: { extend: {} },
    plugins: [],
};

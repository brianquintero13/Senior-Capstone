// app/layout.js
import "./globals.css";
import { Inter, Roboto_Mono } from "next/font/google";
import Providers from "./components/Providers";

// Replace Geist with Inter/Roboto Mono, keep the same CSS variable names
const geistSans = Inter({
    subsets: ["latin"],
    variable: "--font-geist-sans",
    display: "swap",
});

const geistMono = Roboto_Mono({
    subsets: ["latin"],
    variable: "--font-geist-mono",
    display: "swap",
});

export const metadata = {
    title: "ShadeSync",
    description: "Smart motorized window shade control",
};

export default function RootLayout({ children }) {
    return (
        <html lang="en">
        <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <Providers>
        {children}
        </Providers>
        </body>
        </html>
    );
}

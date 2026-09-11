import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
// import { FingerprintProvider } from "@fingerprint/react";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Salon CRM - Professional Salon Management System",
  description: "Complete salon management system with client management, appointments, staff tracking, services, transactions, and more.",
  keywords: ["Salon", "CRM", "Management", "Appointments", "Staff", "Services"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        {children}
        <Toaster position="top-right" richColors />
      </body>
    </html>
  );
}


// export default function RootLayout({
//   children,
// }: Readonly<{ children: React.ReactNode }>) {
//   return (
//     <html lang="en">
//       <body>
//         <FingerprintProvider
//           apiKey="rtdI0VJW7Yw0oM8U0mUD"
//           region="us" // must match your workspace region
//         >
//           {children}
//         </FingerprintProvider>
//       </body>
//     </html>
//   );
// }

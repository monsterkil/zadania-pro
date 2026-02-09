import "./globals.css";

export const metadata = {
  title: "Zadania Pro",
  description: "System zarządzania zadaniami",
};

export default function RootLayout({ children }) {
  return (
    <html lang="pl">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap" rel="stylesheet" />
      </head>
      <body className="bg-surface text-slate-200 font-sans antialiased">
        {children}
      </body>
    </html>
  );
}

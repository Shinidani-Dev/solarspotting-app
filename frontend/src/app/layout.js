import './globals.css';

export const metadata = {
  title: 'SolarSpotting App',
  description: 'App zur Erfassung und Analyse von Sonnenflecken',
};

export default function RootLayout({ children }) {
  return (
    <html lang="de">
      <body className="bg-slate-900 text-slate-100 min-h-screen">
        {children}
      </body>
    </html>
  );
}
import './globals.css';
import QueryProviders from './providers';

export const metadata = {
  title: 'SolarSpotting App',
  description: 'App zur Erfassung und Analyse von Sonnenflecken',
};

export default function RootLayout({ children }) {
  return (
    <html lang="de">
      <body className="min-h-screen bg-slate-900 text-slate-100">
        <QueryProviders>{children}</QueryProviders>
      </body>
    </html>
  );
}
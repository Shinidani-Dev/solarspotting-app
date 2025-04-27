import Link from "next/link";

export default function PlaygroundPage() {
    return (
      <div>
        <h1 className="text-3xl font-bold mb-6">UI Komponenten-Bibliothek</h1>
        
        <p className="text-slate-300 mb-6">
          Willkommen in der Komponenten-Bibliothek für SolarSpotting. Hier findest du alle 
          wiederverwendbaren UI-Komponenten, die im Projekt verwendet werden. Wähle eine 
          Kategorie aus der Seitenleiste, um die verfügbaren Komponenten zu erkunden.
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-8">
          {/* Komponenten-Karten */}
          <div className="card border-l-4 border-l-amber-500">
            <h2 className="text-xl font-semibold mb-2">Buttons</h2>
            <p className="text-slate-400 mb-4">Primäre, sekundäre und Aktions-Buttons</p>
            <Link href="/playground/buttons" className="btn btn-primary inline-block">
              Ansehen
            </Link>
          </div>
          
          <div className="card border-l-4 border-l-blue-500">
            <h2 className="text-xl font-semibold mb-2">Eingabefelder</h2>
            <p className="text-slate-400 mb-4">Textfelder, Auswahlmenüs und Checkboxen</p>
            <Link href="/playground/inputs" className="btn btn-primary inline-block">
              Ansehen
            </Link>
          </div>
          
          <div className="card border-l-4 border-l-emerald-500">
            <h2 className="text-xl font-semibold mb-2">Benachrichtigungen</h2>
            <p className="text-slate-400 mb-4">Toasts, Alerts und Status-Meldungen</p>
            <Link href="/playground/notifications" className="btn btn-primary inline-block">
              Ansehen
            </Link>
          </div>
        </div>
      </div>
    );
  }
'use client';

import { useEffect, useState } from "react";
import ClassManager from "@/components/labeling/ClassManager";
import labelingService from "@/api/labelingService";
import { useRouter } from "next/navigation";
import Button from "@/components/ui/buttons/Button";
import { Play, Loader2 } from "lucide-react";

export default function LabelingSetupPage() {
  const router = useRouter();
  const [totalImages, setTotalImages] = useState(0);
  const [classes, setClasses] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setIsLoading(true);
      try {
        const data = await labelingService.listRawImages();
        setTotalImages(data.total);
      } catch (e) {
        console.error(e);
        alert('Fehler beim Laden der Bilder: ' + (e.message || 'Unbekannter Fehler'));
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, []);

  const startLabeling = () => {
    if (classes.length === 0) {
      alert("Bitte mindestens eine Klasse definieren!");
      return;
    }

    // speichere Klassen im localStorage
    localStorage.setItem("labeling_classes", JSON.stringify(classes));

    // wechsle zu erster Bild-Seite
    router.push("/labeling/0");
  };

  return (
    <div className="p-8 space-y-6">
      <div className="p-6 card">
        <h1 className="mb-2 text-2xl font-bold text-amber-400">
          Dataset Vorbereitung
        </h1>

        {isLoading ? (
          <div className="flex items-center gap-2 text-slate-400">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Lade Bilder...</span>
          </div>
        ) : (
          <p className="text-slate-300">
            Bilder im Dataset: <span className="font-bold text-amber-400">{totalImages}</span>
          </p>
        )}
      </div>

      <ClassManager classes={classes} setClasses={setClasses} />

      <div className="flex justify-end">
        <Button
          variant="primary"
          size="lg"
          onClick={startLabeling}
          disabled={classes.length === 0 || isLoading}
        >
          <Play size={20} className="mr-2" />
          Labeling starten
        </Button>
      </div>
    </div>
  );
}
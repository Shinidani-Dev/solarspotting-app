'use client';

import { useEffect, useState } from "react";
import ClassManager from "@/components/labeling/ClassManager";
import labelingService from "@/api/labelingService";
import { useRouter } from "next/navigation";

export default function LabelingSetupPage() {
  const router = useRouter();
  const [totalImages, setTotalImages] = useState(0);
  const [classes, setClasses] = useState([]);

  useEffect(() => {
    async function load() {
      try {
        const data = await labelingService.listRawImages();
        setTotalImages(data.total);
      } catch (e) {
        console.error(e);
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
      <h1 className="text-2xl font-bold text-amber-400">Dataset Vorbereitung</h1>

      <p className="text-slate-300">
        Bilder im Dataset: <span className="text-amber-400">{totalImages}</span>
      </p>

      <ClassManager classes={classes} setClasses={setClasses} />

      <button
        className="btn-primary mt-6"
        onClick={startLabeling}
      >
        Labeling starten
      </button>
    </div>
  );
}

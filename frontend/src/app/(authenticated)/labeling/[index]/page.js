'use client';

import { useEffect, useState } from "react";
import labelingService from "@/api/labelingService";
import OriginalImageViewer from "@/components/labeling/OriginalImageViewer";
import LabelingHeader from "@/components/labeling/LabelingHeader";
import PatchList from "@/components/labeling/PatchList";
import PatchLabelModal from "@/components/labeling/PatchLabelModal";
import { useRouter } from "next/navigation";

export default function LabelingPage({ params }) {
  const router = useRouter();
  const index = parseInt(params.index);

  const [dataset, setDataset] = useState(null);
  const [totalImages, setTotalImages] = useState(0);
  const [classes, setClasses] = useState([]);
  const [selectedPatch, setSelectedPatch] = useState(null);

  // Load classes
  useEffect(() => {
    const stored = localStorage.getItem("labeling_classes");
    if (stored) setClasses(JSON.parse(stored));
  }, []);

  // Load image
  useEffect(() => {
    async function load() {
      try {
        const data = await labelingService.getImageByIndex(index);
        setDataset(data);
        setTotalImages(data.total_images);
      } catch (e) {
        console.error(e);
      }
    }
    load();
  }, [index]);

  const goNext = () => {
    if (index + 1 < totalImages) router.push(`/labeling/${index + 1}`);
  };

  const goPrev = () => {
    if (index > 0) router.push(`/labeling/${index - 1}`);
  };

  return (
    <div className="p-6 space-y-6">

      {/* Header */}
      <LabelingHeader
        currentIndex={index}
        totalImages={totalImages}
        onPrev={goPrev}
        onNext={goNext}
        onFinish={() => labelingService.finalize()}
      />

      {dataset && (
        <>
          <OriginalImageViewer data={dataset} />

          <PatchList
            patches={dataset.patches}
            onSelect={(p) => setSelectedPatch(p)}
          />

          {selectedPatch && (
            <PatchLabelModal
              patch={selectedPatch}
              classes={classes}
              onClose={() => setSelectedPatch(null)}
            />
          )}
        </>
      )}
    </div>
  );
}

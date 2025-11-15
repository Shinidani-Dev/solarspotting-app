'use client';

import { useState, useEffect } from 'react';
import labelingService from '@/api/labelingService';

export function useLabelingState() {
  const [dataset, setDataset] = useState(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [totalImages, setTotalImages] = useState(0);
  const [initialized, setInitialized] = useState(false);
  const [selectedPatch, setSelectedPatch] = useState(null);

  const [labeledPatches, setLabeledPatches] = useState(new Set());

  /**
   * Helper: Check if annotation JSON exists for patch name
   */
  function annotationExists(patchFile) {
    // Backend returns "patches" → we check if patch JSON exists
    // Later we can add a small HEAD request, but for now we trust backend info.
    return false; // default (we handle this later with backend support)
  }

  /**
   * Load an image by index
   */
  async function loadImageByIndex(index) {
    try {
      const res = await labelingService.getImage(index);

      setDataset(res);
      setCurrentIndex(res.current_index);
      setTotalImages(res.total_images);
      setSelectedPatch(null);

      // Reset labeled patches for new image
      setLabeledPatches(new Set());

      // Auto-detect labeled patches: 
      // If annotation file exists → mark it green
      // (Optional backend extension: include labeled info)
      res.patches.forEach(p => {
        if (annotationExists(p.patch_file)) {
          setLabeledPatches(prev => new Set([...prev, p.patch_file]));
        }
      });

      setInitialized(true);

    } catch (err) {
      console.error("Failed to load dataset image:", err);
    }
  }

  // initial load
  useEffect(() => {
    loadImageByIndex(0);
  }, []);

  return {
    dataset,
    loadImageByIndex,
    currentIndex,
    totalImages,
    selectedPatch,
    setSelectedPatch,
    labeledPatches,
    setLabeledPatches,
    initialized
  };
}

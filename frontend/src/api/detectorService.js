import api from "@/api/apiClient";

const detectorService = {
  // ========================================
  // IMAGE MANAGEMENT
  // ========================================

  async uploadImage(file) {
    const formData = new FormData();
    formData.append("file", file);

    const res = await api.post("/labeling/upload", formData, {
      headers: { "Content-Type": "multipart/form-data" }
    });
    return res.data;
  },

  async listImages() {
    const res = await api.get("/labeling/dataset/list");
    return res.data;
  },

  // ========================================
  // PROCESSING
  // ========================================

  async processImage(filename) {
    const res = await api.post(`/labeling/process/${filename}`);
    return res.data;
  },

  // ========================================
  // DETECTION (ML Model)
  // ========================================

  async detectOnPatch(patchImageBase64, confidenceThreshold = 0.25) {
    const res = await api.post("/labeling/detect", {
      patch_image_base64: patchImageBase64,
      confidence_threshold: confidenceThreshold
    });
    return res.data;
  },

  // ========================================
  // ANNOTATIONS
  // ========================================

  /**
   * Get existing annotation for a patch (if exists)
   * Returns { exists: false } silently if not found (no console error)
   */
  async getAnnotation(patchFilename) {
    try {
      const res = await api.get(`/labeling/annotation/${patchFilename}`);
      return res.data;
    } catch (err) {
      // 404 ist erwartet wenn keine Annotation existiert - STILL ignorieren
      if (err.response?.status === 404) {
        return { exists: false };
      }
      // Andere Fehler werfen
      throw err;
    }
  },

  async saveAnnotation(payload) {
    const formData = new FormData();
    formData.append("image_file", payload.original_image_file);
    formData.append("patch_file", payload.patch_file);
    formData.append("px", payload.px);
    formData.append("py", payload.py);
    formData.append("annotations", JSON.stringify(payload.annotations));
    formData.append("patch_image_base64", payload.patch_image_base64);

    const res = await api.post("/labeling/label", formData, {
      headers: { "Content-Type": "multipart/form-data" }
    });
    return res.data;
  },

  async deletePatch(patchFilename) {
    const res = await api.delete(`/labeling/patch/${patchFilename}`);
    return res.data;
  },

  // ========================================
  // DATASET
  // ========================================

  async finalizeDataset() {
    const res = await api.post("/labeling/dataset/finish");
    return res.data;
  },

  async resetDataset() {
    const res = await api.post("/labeling/dataset/reset");
    return res.data;
  },

  async getDatasetStats() {
    const res = await api.get("/labeling/dataset/stats");
    return res.data;
  },

  // ========================================
  // TRAINING
  // ========================================

  async startTraining(config = {}) {
    const res = await api.post("/labeling/train", {
      epochs: config.epochs || 50,
      batch_size: config.batchSize || 16,
      model_arch: config.modelArch || "yolov8n.pt"
    });
    return res.data;
  },

  async getTrainingStatus() {
    const res = await api.get("/labeling/train/status");
    return res.data;
  },

  // ========================================
  // MODEL INFO
  // ========================================

  async getModelInfo() {
    const res = await api.get("/labeling/model/info");
    return res.data;
  },

  async getClasses() {
    const res = await api.get("/labeling/classes");
    return res.data;
  }
};

export default detectorService;
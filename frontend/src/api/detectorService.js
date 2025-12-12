import api from "@/api/apiClient";

const detectorService = {
  // ========================================
  // IMAGE MANAGEMENT
  // ========================================

  /**
   * Upload a single image
   * Required role: Labeler or Admin
   */
  async uploadImage(file) {
    const formData = new FormData();
    formData.append("file", file);

    const res = await api.post("/labeling/upload", formData, {
      headers: { "Content-Type": "multipart/form-data" }
    });
    return res.data;
  },

  /**
   * Upload multiple images at once
   * Required role: Labeler or Admin
   */
  async uploadMultipleImages(files) {
    const formData = new FormData();
    files.forEach(file => {
      formData.append("files", file);
    });

    const res = await api.post("/labeling/upload/multiple", formData, {
      headers: { "Content-Type": "multipart/form-data" }
    });
    return res.data;
  },

  /**
   * List all raw images in storage
   * Required role: Any authenticated user
   */
  async listImages() {
    const res = await api.get("/labeling/dataset/list");
    return res.data;
  },

  /**
   * Delete a raw image from storage
   * Required role: Labeler or Admin
   */
  async deleteRawImage(filename) {
    const res = await api.delete(`/labeling/image/${filename}`);
    return res.data;
  },

  // ========================================
  // PROCESSING
  // ========================================

  /**
   * Process an image (segmentation, patch generation)
   * Required role: Any authenticated user
   */
  async processImage(filename) {
    const res = await api.post(`/labeling/process/${filename}`);
    return res.data;
  },

  // ========================================
  // DETECTION (ML Model)
  // ========================================

  /**
   * Run ML detection on a patch (without saving)
   * Required role: Any authenticated user
   */
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
   * Returns { exists: false } silently if not found
   */
  async getAnnotation(patchFilename) {
    try {
      const res = await api.get(`/labeling/annotation/${patchFilename}`);
      return res.data;
    } catch (err) {
      if (err.response?.status === 404) {
        return { exists: false };
      }
      throw err;
    }
  },

  /**
   * Save annotation for a patch
   * Required role: Labeler or Admin
   */
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

  /**
   * Delete a patch and its annotation
   * Required role: Labeler or Admin
   */
  async deletePatch(patchFilename) {
    const res = await api.delete(`/labeling/patch/${patchFilename}`);
    return res.data;
  },

  // ========================================
  // DATASET
  // ========================================

  /**
   * List all patches in the dataset with their annotations
   * Required role: Labeler or Admin
   */
  async listDatasetPatches() {
    const res = await api.get("/labeling/dataset/patches");
    return res.data;
  },

  /**
   * Finalize dataset (create train/val split)
   * Required role: Labeler or Admin
   */
  async finalizeDataset() {
    const res = await api.post("/labeling/dataset/finish");
    return res.data;
  },

  /**
   * Reset dataset (delete all patches and annotations)
   * Required role: Labeler or Admin
   */
  async resetDataset() {
    const res = await api.post("/labeling/dataset/reset");
    return res.data;
  },

  /**
   * Get dataset statistics
   * Required role: Admin
   */
  async getDatasetStats() {
    const res = await api.get("/labeling/dataset/stats");
    return res.data;
  },

  // ========================================
  // TRAINING
  // ========================================

  /**
   * Start model training
   * Required role: Admin
   */
  async startTraining(config = {}) {
    const res = await api.post("/labeling/train", {
      epochs: config.epochs || 50,
      batch_size: config.batchSize || 16,
      model_arch: config.modelArch || "yolov8n.pt"
    });
    return res.data;
  },

  /**
   * Get training status
   * Required role: Admin
   */
  async getTrainingStatus() {
    const res = await api.get("/labeling/train/status");
    return res.data;
  },

  // ========================================
  // MODEL INFO
  // ========================================

  /**
   * Get model information
   * Required role: Admin
   */
  async getModelInfo() {
    const res = await api.get("/labeling/model/info");
    return res.data;
  },

  /**
   * Get available classes
   */
  async getClasses() {
    const res = await api.get("/labeling/classes");
    return res.data;
  }
};

export default detectorService;
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

  async uploadMultipleImages(files) {
    const formData = new FormData();
    files.forEach(file => formData.append("files", file));
    const res = await api.post("/labeling/upload/multiple", formData, {
      headers: { "Content-Type": "multipart/form-data" }
    });
    return res.data;
  },

  /**
   * List raw images with optional filtering and pagination
   */
  async listImages({ year, month, skip = 0, limit = 32 } = {}) {
    const params = new URLSearchParams();
    if (year) params.append("year", year);
    if (month) params.append("month", month);
    params.append("skip", skip);
    params.append("limit", limit);
    const res = await api.get(`/labeling/dataset/list?${params.toString()}`);
    return res.data;
  },

  /**
   * Get neighbor images for navigation
   */
  async getNeighborImages(filename) {
    const res = await api.get(`/labeling/dataset/neighbors/${filename}`);
    return res.data;
  },

  async deleteRawImage(filename) {
    const res = await api.delete(`/labeling/image/${filename}`);
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
  // DATASET MANAGEMENT
  // ========================================

  /**
   * List dataset patches with pagination
   */
  async listDatasetPatches({ skip = 0, limit = 42 } = {}) {
    const params = new URLSearchParams();
    params.append("skip", skip);
    params.append("limit", limit);
    const res = await api.get(`/labeling/dataset/patches?${params.toString()}`);
    return res.data;
  },

  async finalizeDataset() {
    const res = await api.post("/labeling/finalize");
    return res.data;
  },

  async getDatasetStats() {
    const res = await api.get("/labeling/dataset/stats");
    return res.data;
  },

  // ========================================
  // MODEL MANAGEMENT
  // ========================================

  async getModelInfo() {
    const res = await api.get("/labeling/model/info");
    return res.data;
  },

  // ========================================
  // TRAINING
  // ========================================

  async startTraining(config = {}) {
    const res = await api.post("/labeling/train", config);
    return res.data;
  },

  async getTrainingStatus() {
    const res = await api.get("/labeling/train/status");
    return res.data;
  }
};

export default detectorService;
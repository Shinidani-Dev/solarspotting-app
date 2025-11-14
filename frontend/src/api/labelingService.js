import apiClient from './apiClient';

/**
 * Labeling related API services
 */
export const labelingService = {
  // Get list of available images for labeling
  getDatasetList: async () => {
    const response = await apiClient.get("/labeling/dataset/list");
    return response.data;
  },

  // Load image by index with patches
  loadImageByIndex: async (index) => {
    const response = await apiClient.get(`/labeling/dataset/image/${index}`);
    return response.data;
  },

  // Save patch annotation
  savePatchAnnotation: async (data) => {
    // Convert to FormData for the backend
    const formData = new FormData();
    formData.append('image_file', data.image_file);
    formData.append('patch_file', data.patch_file);
    formData.append('px', data.px);
    formData.append('py', data.py);
    formData.append('annotations', JSON.stringify(data.annotations));
    formData.append('patch_image_base64', data.patch_image_base64);

    const response = await apiClient.post("/labeling/label", formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  // Finalize dataset (create train/val split)
  finalizeDataset: async () => {
    const response = await apiClient.post("/labeling/dataset/finish");
    return response.data;
  },

  // Reset dataset
  resetDataset: async () => {
    const response = await apiClient.post("/labeling/dataset/reset");
    return response.data;
  },

  // Delete a patch
  deletePatch: async (patchFile) => {
    const response = await apiClient.delete(`/labeling/patch/${patchFile}`);
    return response.data;
  },
};
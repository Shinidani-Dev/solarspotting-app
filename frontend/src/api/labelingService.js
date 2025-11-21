import api from "@/api/apiClient";

const labelingService = {
  // -------- 1) Liste aller Rohbilder --------
  async listRawImages() {
    const res = await api.get("/labeling/dataset/list");
    return res.data;
  },

  // -------- 2) Hole Bild inklusive Patches + Grid --------
  async getImageByIndex(index) {
    const res = await api.get(`/labeling/dataset/image/${index}`);
    return res.data;
  },

  // -------- 3) Speichere Annotation eines Patch --------
  async saveAnnotation(payload) {
    const formData = new FormData();
    
    formData.append("image_file", payload.original_image_file);
    formData.append("patch_file", payload.patch_file);
    formData.append("px", payload.px);
    formData.append("py", payload.py);
    formData.append("annotations", JSON.stringify(payload.annotations));
    formData.append("patch_image_base64", payload.patch_image_base64);

    try {
      const res = await api.post("/labeling/label", formData, {
        headers: { "Content-Type": "multipart/form-data" }
      });
      return res.data;
    } catch (err) {
      console.error("Fehler beim Speichern (Axios):", err);
      throw err;
    }
  },

  // -------- 4) Lösche Annotation und Patch --------
  async deleteAnnotation(patchFile) {
    try {
      const res = await api.delete(`/labeling/patch/${patchFile}`);
      return res.data;
    } catch (err) {
      console.error("Fehler beim Löschen (Axios):", err);
      throw err;
    }
  },

  // -------- 5) Dataset abschließen --------
  async finalize() {
    const res = await api.post("/labeling/dataset/finish");
    return res.data;
  },
};

export default labelingService;
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
    console.log("HIER");
    console.log("image_file: " + payload.original_image_file);
    console.log("patch_file: " + payload.patch_file);
    console.log("px: " + payload.px);
    console.log("py: " + payload.py);
    console.log("annotations: " + payload.annotations);
    console.log("patch_image_base64: " + payload.patch_image_base64);

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

  // -------- 4) Dataset abschließen --------
  async finalize() {
    const res = await api.post("/labeling/dataset/finish");
    return res.data;
  },
};

export default labelingService;

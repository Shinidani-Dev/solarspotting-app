/**
 * Demo Service - API calls for the public Demo page
 *
 * WICHTIG:
 * - Keine absolute API-URL
 * - Alle Requests laufen über Next.js Rewrites
 * - Kein CORS, kein Cross-Origin
 */

const API_BASE = '/api/v1';

const demoService = {
  // ========================================
  // DEMO IMAGES
  // ========================================

  async listImages() {
    const res = await fetch(`${API_BASE}/demo/images`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`Failed to list demo images: ${res.status} ${errorText}`);
    }

    return res.json();
  },

  getImageUrl(filename) {
    return `${API_BASE}/demo/image/${filename}`;
  },

  // ========================================
  // PROCESSING
  // ========================================

  async processImage(filename) {
    const res = await fetch(`${API_BASE}/demo/process/${filename}`, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`Failed to process demo image: ${res.status} ${errorText}`);
    }

    return res.json();
  },

  // ========================================
  // DETECTION
  // ========================================

  async detectOnPatch(patchImageBase64, confidenceThreshold = 0.25) {
    const res = await fetch(`${API_BASE}/demo/detect`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        patch_image_base64: patchImageBase64,
        confidence_threshold: confidenceThreshold,
      }),
    });

    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`Failed to detect on patch: ${res.status} ${errorText}`);
    }

    return res.json();
  },

  // ========================================
  // MODEL INFO
  // ========================================

  async getModelInfo() {
    const res = await fetch(`${API_BASE}/demo/model/info`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`Failed to get model info: ${res.status} ${errorText}`);
    }

    return res.json();
  },
};

export default demoService;

/**
 * Demo Service - API calls for the public Demo page
 * 
 * WICHTIG: Diese Endpoints erfordern KEINE Authentifizierung!
 * Alle Daten sind temporär und werden nicht gespeichert.
 */

// API Base URL - mit Fallback
const getApiBaseUrl = () => {
  if (typeof window !== 'undefined') {
    return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';
  }
  return 'http://localhost:8000/api/v1';
};

const demoService = {
  // ========================================
  // DEMO IMAGES
  // ========================================

  /**
   * List all available demo images
   */
  async listImages() {
    const baseUrl = getApiBaseUrl();
    const res = await fetch(`${baseUrl}/demo/images`, {
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

  /**
   * Get demo image URL (for <img src>)
   */
  getImageUrl(filename) {
    const baseUrl = getApiBaseUrl();
    return `${baseUrl}/demo/image/${filename}`;
  },

  // ========================================
  // PROCESSING
  // ========================================

  /**
   * Process demo image to generate patches
   * Note: Patches are NOT saved on server - only returned for display
   */
  async processImage(filename) {
    const baseUrl = getApiBaseUrl();
    const res = await fetch(`${baseUrl}/demo/process/${filename}`, {
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

  /**
   * Run ML detection on a patch
   * Note: Results are NOT saved - only returned for display
   */
  async detectOnPatch(patchImageBase64, confidenceThreshold = 0.25) {
    const baseUrl = getApiBaseUrl();
    const res = await fetch(`${baseUrl}/demo/detect`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        patch_image_base64: patchImageBase64,
        confidence_threshold: confidenceThreshold
      })
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

  /**
   * Get basic model info for demo display
   */
  async getModelInfo() {
    const baseUrl = getApiBaseUrl();
    const res = await fetch(`${baseUrl}/demo/model/info`, {
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
  }
};

export default demoService;
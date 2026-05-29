import { getAuthToken } from '@/lib/auth';

const BASE_URL = '/api/v1/protuberances';

function authHeaders() {
  const token = getAuthToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function b64ToUrl(b64) {
  const bytes = atob(b64);
  const arr = new Uint8Array(bytes.length);
  for (let i = 0; i < bytes.length; i++) arr[i] = bytes.charCodeAt(i);
  return URL.createObjectURL(new Blob([arr], { type: 'image/png' }));
}

/**
 * Sends an image to the backend, detects the sun disk circle, and returns
 * { cx, cy, r, annotatedUrl } where annotatedUrl is a blob URL of the
 * image with the detected circle drawn on it.
 */
export async function detectCircle(image) {
  const form = new FormData();
  form.append('file', image, 'image.png');

  const response = await fetch(`${BASE_URL}/detect-circle`, {
    method: 'POST',
    headers: authHeaders(),
    body: form,
  });

  if (!response.ok) throw new Error(`Server error ${response.status}`);
  const json = await response.json();

  return {
    cx: json.cx,
    cy: json.cy,
    r: json.r,
    annotatedUrl: b64ToUrl(json.annotated),
  };
}

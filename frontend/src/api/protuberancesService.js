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

/**
 * Full protuberance profile:
 *   - detects sun disk (cx, cy, r)
 *   - bilateral filter + Otsu binarization
 *   - counts white pixels per 1° wedge in annulus [r, r + rExtension]
 *
 * Returns { cx, cy, r, rInner, rOuter, annotatedUrl, binarizedUrl, profile }
 * where profile is an array of 360 objects: { degree: 1..360, count: number }
 */
export async function computeProfile(image, rExtension = 80) {
  const form = new FormData();
  form.append('file', image, 'image.png');
  form.append('r_extension', String(rExtension));

  const response = await fetch(`${BASE_URL}/profile`, {
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
    rInner: json.r_inner,
    rOuter: json.r_outer,
    annotatedUrl:  b64ToUrl(json.annotated),
    multiOtsuUrl:  b64ToUrl(json.multi_otsu),
    binarizedUrl:  b64ToUrl(json.binarized),
    profile: json.profile,   // [{degree, count}, ...]
  };
}

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

/** Fast circle detection — returns { cx, cy, r } in 2048×2048 server space. */
export async function detectCircle(image) {
  const form = new FormData();
  form.append('file', image, 'image.png');

  const res = await fetch(`${BASE_URL}/detect-circle`, {
    method: 'POST',
    headers: authHeaders(),
    body: form,
  });
  if (!res.ok) throw new Error(`Server error ${res.status}`);
  return res.json();  // { cx, cy, r }
}

/**
 * Full protuberance profile.
 *
 * cx / cy / rx / ry are optional manual overrides in 2048×2048 server space.
 * rx / ry are the ellipse semi-axes (use equal values for a circle).
 *
 * Returns { cx, cy, rx, ry, rxOut, ryOut,
 *           annotatedUrl, multiOtsuUrl, binarizedUrl, profile }.
 */
export async function computeProfile(
  image,
  rExtension = 80,
  cx = null, cy = null,
  rx = null, ry = null,
) {
  const form = new FormData();
  form.append('file', image, 'image.png');
  form.append('r_extension', String(rExtension));
  if (cx !== null) form.append('cx', String(cx));
  if (cy !== null) form.append('cy', String(cy));
  if (rx !== null) form.append('rx', String(rx));
  if (ry !== null) form.append('ry', String(ry));

  const res = await fetch(`${BASE_URL}/profile`, {
    method: 'POST',
    headers: authHeaders(),
    body: form,
  });
  if (!res.ok) throw new Error(`Server error ${res.status}`);
  const json = await res.json();

  return {
    cx:      json.cx,
    cy:      json.cy,
    rx:      json.rx,
    ry:      json.ry,
    rxOut:   json.rx_out,
    ryOut:   json.ry_out,
    annotatedUrl: b64ToUrl(json.annotated),
    multiOtsuUrl: b64ToUrl(json.multi_otsu),
    binarizedUrl: b64ToUrl(json.binarized),
    profile:      json.profile,  // [{degree, count}, ...]
  };
}

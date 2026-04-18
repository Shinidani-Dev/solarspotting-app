import { getAuthToken } from '@/lib/auth';

const BASE_URL = '/api/v1/image-processing';

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

async function postImageBlob(endpoint, image) {
  const form = new FormData();
  form.append('file', image, 'image.png');

  const response = await fetch(`${BASE_URL}${endpoint}`, {
    method: 'POST',
    headers: authHeaders(),
    body: form,
  });

  if (!response.ok) throw new Error(`Server error ${response.status}`);
  return response.blob();
}

async function postImageWithColors(endpoint, image, colorStrings, alpha) {
  const form = new FormData();
  form.append('file', image, 'image.png');
  if (colorStrings[0]) form.append('mask_color_1', colorStrings[0]);
  if (colorStrings[1]) form.append('mask_color_2', colorStrings[1]);
  if (colorStrings[2]) form.append('mask_color_3', colorStrings[2]);
  form.append('alpha', String(alpha));

  const response = await fetch(`${BASE_URL}${endpoint}`, {
    method: 'POST',
    headers: authHeaders(),
    body: form,
  });

  if (!response.ok) throw new Error(`Server error ${response.status}`);
  const json = await response.json();

  return {
    processed: b64ToUrl(json.processed),
    mask:      b64ToUrl(json.mask),
    overlay:   b64ToUrl(json.overlay),
  };
}

export const applyGrayscale = (image) => postImageBlob('/grayscale', image);
export const applyBilateral = (image) => postImageBlob('/bilateral', image);

export const applyMultiOtsu = (image, colors, alpha) =>
  postImageWithColors('/multi-otsu', image, colors, alpha);

export const applyBinarized = (image, colors, alpha) =>
  postImageWithColors('/binarized', image, colors, alpha);

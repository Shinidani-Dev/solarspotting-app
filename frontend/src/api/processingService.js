import { getAuthToken } from '@/lib/auth';

const BASE_URL = '/api/v1/image-processing';

async function postImage(endpoint, image) {
  const form = new FormData();
  form.append('file', image, 'image.png');

  const token = getAuthToken();
  const response = await fetch(`${BASE_URL}${endpoint}`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: form,
  });

  if (!response.ok) throw new Error(`Server error ${response.status}`);
  return response.blob();
}

export const applyGrayscale  = (image) => postImage('/grayscale',  image);
export const applyBilateral  = (image) => postImage('/bilateral',  image);
export const applyMultiOtsu  = (image) => postImage('/multi-otsu', image);
export const applyBinarized  = (image) => postImage('/binarized',  image);

import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { storage } from '../firebase/config';

export async function uploadImage(uri, path) {
  const response = await fetch(uri);
  const blob = await response.blob();
  const storageRef = ref(storage, path);
  await uploadBytes(storageRef, blob);
  return getDownloadURL(storageRef);
}

export async function uploadListingImages(uris, userId) {
  const timestamp = Date.now();
  const uploads = uris.map((uri, i) =>
    uploadImage(uri, `listings/${userId}/${timestamp}_${i}.jpg`)
  );
  return Promise.all(uploads);
}

export async function deleteImage(url) {
  try {
    const fileRef = ref(storage, url);
    await deleteObject(fileRef);
  } catch {
    // Ignore — file may already be gone
  }
}

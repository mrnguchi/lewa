import type { ImagePickerAsset } from 'expo-image-picker';

import { api } from './api';
import type { UserData } from '../utils/authStorage';

type ProfileUploadSignature = {
  apiKey: string;
  timestamp: number;
  signature: string;
  publicId: string;
  uploadUrl: string;
};

type CloudinaryProfileUpload = {
  secure_url?: string;
  public_id?: string;
  error?: {
    message?: string;
  };
};

const MAX_PROFILE_IMAGE_BYTES = 5 * 1024 * 1024;

/**
 * Chooses a reliable image type for React Native's multipart upload.
 */
const getProfileImageFileDetails = (asset: ImagePickerAsset) => {
  const extension = asset.fileName?.split('.').pop()?.toLowerCase();

  if (asset.mimeType === 'image/png' || extension === 'png') {
    return { extension: 'png', mimeType: 'image/png' };
  }

  if (asset.mimeType === 'image/webp' || extension === 'webp') {
    return { extension: 'webp', mimeType: 'image/webp' };
  }

  return { extension: 'jpg', mimeType: 'image/jpeg' };
};

/**
 * Uploads the selected image and saves its permanent URL on the student profile.
 */
export const uploadStudentProfileImage = async (
  studentId: string,
  asset: ImagePickerAsset
): Promise<UserData> => {
  if (asset.fileSize && asset.fileSize > MAX_PROFILE_IMAGE_BYTES) {
    throw new Error('Profile pictures must be 5 MB or smaller.');
  }

  const signatureResponse = await api.post<{
    success: boolean;
    data: ProfileUploadSignature;
  }>('/api/uploads/profile-image-signature', {}, { suppressErrorToast: true } as any);
  const signature = signatureResponse.data.data;
  const fileDetails = getProfileImageFileDetails(asset);
  const formData = new FormData();

  formData.append('file', {
    uri: asset.uri,
    name: asset.fileName ?? `profile-picture.${fileDetails.extension}`,
    type: fileDetails.mimeType,
  } as any);
  formData.append('api_key', signature.apiKey);
  formData.append('timestamp', String(signature.timestamp));
  formData.append('signature', signature.signature);
  formData.append('public_id', signature.publicId);

  const uploadResponse = await fetch(signature.uploadUrl, {
    method: 'POST',
    body: formData,
  });
  const uploadPayload = (await uploadResponse.json()) as CloudinaryProfileUpload;

  if (!uploadResponse.ok || !uploadPayload.secure_url || !uploadPayload.public_id) {
    throw new Error(uploadPayload.error?.message || 'Profile picture upload failed.');
  }

  const profileResponse = await api.patch<{ success: boolean; data: UserData }>(
    `/api/students/${studentId}/profile-image`,
    {
      profile_image_url: uploadPayload.secure_url,
      public_id: uploadPayload.public_id,
    },
    { suppressErrorToast: true } as any
  );

  return profileResponse.data.data;
};

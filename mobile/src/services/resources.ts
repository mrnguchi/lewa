import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';

import { api } from './api';
import { ResourceItem, ResourceType } from '../types/resources';

type GetResourcesParams = {
  type?: ResourceType;
  limit?: number;
};

type CreateResourcePayload = {
  code: string;
  title: string;
  level: number;
  faculty?: string;
  type: ResourceType;
  file_url: string;
  description?: string;
};

type UploadSignatureResponse = {
  cloudName: string;
  apiKey: string;
  uploadPreset: string;
  timestamp: number;
  signature: string;
  publicId: string;
  resourceType: 'raw';
  uploadUrl: string;
};

type UploadResponse = {
  secure_url: string;
};

/**
 * Fetches resources from the backend, optionally narrowing by type or limit.
 */
export const getResources = async (params: GetResourcesParams = {}) => {
  const response = await api.get<{ success: boolean; data: ResourceItem[] }>('/api/resources', {
    params,
  });

  return response.data.data;
};

/**
 * Creates a new resource record after the file has been uploaded.
 */
export const createResource = async (payload: CreateResourcePayload) => {
  const response = await api.post<{ success: boolean; data: ResourceItem }>('/api/resources', payload);
  return response.data.data;
};

/**
 * Requests a signed Cloudinary payload for uploading a PDF resource file.
 */
const getResourceUploadSignature = async (filename?: string | null) => {
  const response = await api.post<{ success: boolean; data: UploadSignatureResponse }>(
    '/api/uploads/resource-file-signature',
    {
      filename: filename ?? undefined,
    }
  );

  return response.data.data;
};

/**
 * Uploads a selected PDF file to Cloudinary and returns the stored file URL.
 */
export const uploadResourceFile = async (uri: string, fileName?: string | null) => {
  const signature = await getResourceUploadSignature(fileName);
  const formData = new FormData();

  formData.append('file', {
    uri,
    name: fileName ?? `${signature.publicId}.pdf`,
    type: 'application/pdf',
  } as unknown as Blob);
  formData.append('api_key', signature.apiKey);
  formData.append('timestamp', `${signature.timestamp}`);
  formData.append('signature', signature.signature);
  formData.append('public_id', signature.publicId);
  formData.append('upload_preset', signature.uploadPreset);

  const response = await fetch(signature.uploadUrl, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    throw new Error('Resource upload failed');
  }

  const payload = (await response.json()) as UploadResponse;
  return payload.secure_url;
};

/**
 * Builds a stable local filename for downloaded resource documents.
 */
const buildDownloadFileName = (resource: ResourceItem) => {
  const sanitizedCode = resource.code.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  return `${sanitizedCode || 'resource'}-${resource.id}.pdf`;
};

/**
 * Downloads a resource file and opens the platform share sheet when supported.
 */
export const downloadResourceFile = async (resource: ResourceItem) => {
  const cachedFileUri = await getCachedResourceFileUri(resource);

  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(cachedFileUri, {
      mimeType: 'application/pdf',
      dialogTitle: resource.title,
      UTI: 'com.adobe.pdf',
    });
  }

  return cachedFileUri;
};

/**
 * Ensures a resource PDF is available locally and returns the cached file path.
 */
export const getCachedResourceFileUri = async (resource: ResourceItem) => {
  const fileUri = `${FileSystem.cacheDirectory}${buildDownloadFileName(resource)}`;
  const fileInfo = await FileSystem.getInfoAsync(fileUri);

  if (fileInfo.exists) {
    return fileUri;
  }

  const downloadResult = await FileSystem.downloadAsync(resource.file_url, fileUri);
  return downloadResult.uri;
};

/**
 * Returns the best viewer URL for the current platform's embedded PDF rendering.
 */
export const buildResourceViewerUrl = (fileUrl: string) => {
  if (Platform.OS === 'android') {
    return `https://docs.google.com/gview?embedded=1&url=${encodeURIComponent(fileUrl)}`;
  }

  return fileUrl;
};

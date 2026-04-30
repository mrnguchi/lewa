import axios from "axios";
import { authStorage } from "../utils/authStorage";
import { showErrorToast } from "./toast";
import { getFriendlyErrorMessage } from "../utils/errorMessages";

const BASE_URL = "http://172.20.10.2:4000";
export const api = axios.create({
  baseURL: BASE_URL,
  timeout: 30000, // Increased to 30 seconds for registration/login with password hashing
  headers: {
    "Content-Type": "application/json",
  },
});

// Request interceptor to add auth token to headers
api.interceptors.request.use(
  async (config) => {
    try {
      // Skip token for auth endpoints (login, register)
      const isAuthEndpoint = config.url?.includes('/auth/login') || config.url?.includes('/auth/register');

      if (!isAuthEndpoint) {
        const token = await authStorage.getToken();
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
      }
    } catch {
      // Don't fail the request if token retrieval fails.
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for user-friendly API feedback.
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const message = getFriendlyErrorMessage(error);
    (error as any).userMessage = message;

    if (!(error.config as any)?.suppressErrorToast) {
      showErrorToast(message);
    }

    return Promise.reject(error);
  }
);

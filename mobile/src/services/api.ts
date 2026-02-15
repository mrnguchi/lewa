import axios from "axios";

const BASE_URL = "http://192.168.1.84:4000"; // change if needed

export const api = axios.create({
  baseURL: BASE_URL,
  timeout: 10000,
  headers: {
    "Content-Type": "application/json",
  },
});

// Optional: response interceptor for consistent error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response) {
      console.log("API Error:", error.response.data);
    } else {
      console.log("Network Error:", error.message);
    }
    return Promise.reject(error);
  }
);

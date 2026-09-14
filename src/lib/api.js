import axios from "axios";

export function formatApiErrorDetail(detail) {
  if (detail == null) return "Something went wrong. Please try again.";
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) {
    return detail
      .map((e) => {
        if (!e) return "";
        if (typeof e === "string") return e;
        if (typeof e.msg === "string") return e.msg;
        if (typeof e.message === "string") return e.message;
        if (typeof e.error === "string") return e.error;
        return JSON.stringify(e);
      })
      .filter(Boolean)
      .join(" ");
  }
  if (typeof detail === "object") {
    if (typeof detail.msg === "string") return detail.msg;
    if (typeof detail.message === "string") return detail.message;
    if (typeof detail.error === "string") return detail.error;
    if (detail.error && typeof detail.error === "object") {
      return formatApiErrorDetail(detail.error);
    }
    try {
      return JSON.stringify(detail);
    } catch {
      return "An unexpected error occurred. Please try again.";
    }
  }
  return String(detail);
}

export function apiError(e) {
  const data = e?.response?.data;
  if (data) {
    if (typeof data === "string") return data;
    if (data.error) return formatApiErrorDetail(data.error);
    if (data.message) return formatApiErrorDetail(data.message);
    return formatApiErrorDetail(data);
  }
  return formatApiErrorDetail(e?.message || e) || "Request failed";
}

const instance = axios.create({
  baseURL: "/api"
});

// Request interceptor to attach JWT token
instance.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

const api = {
  get: async (url) => {
    const res = await instance.get(url);
    return res;
  },
  post: async (url, payload, config) => {
    const res = await instance.post(url, payload, config);
    return res;
  },
  put: async (url, payload) => {
    const res = await instance.put(url, payload);
    return res;
  },
  patch: async (url, payload) => {
    const res = await instance.patch(url, payload);
    return res;
  },
  delete: async (url) => {
    const res = await instance.delete(url);
    return res;
  },
  defaults: {
    baseURL: "/api"
  }
};

export default api;

import axios from "axios";

// Create axios instance with base configuration
const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || "/api",
  timeout: 120000, // 2 minutes for AI generation
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true, // Enable sending cookies
});

// Flag to prevent multiple simultaneous refresh attempts
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });

  failedQueue = [];
};

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle errors and token refresh
api.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error) => {
    const originalRequest = error.config;

    // Skip refresh for login/register
    if (
      (error.response?.status === 401 && !originalRequest._retry) &&
      !originalRequest.url.includes("/auth/login") &&
      !originalRequest.url.includes("/auth/register")
    ) {
      if (isRefreshing) {
        // If already refreshing, queue this request
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return api(originalRequest);
          })
          .catch((err) => {
            return Promise.reject(err);
          });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        // Try to refresh the token
        const response = await api.post("/auth/refresh");
        const { accessToken } = response.data;

        // Store new token
        localStorage.setItem("token", accessToken);

        // Update authorization header
        api.defaults.headers.common["Authorization"] = `Bearer ${accessToken}`;
        originalRequest.headers.Authorization = `Bearer ${accessToken}`;

        // Process queued requests with new token
        processQueue(null, accessToken);

        // Retry original request
        return api(originalRequest);
      } catch (refreshError) {
        // Refresh failed, logout user
        processQueue(refreshError, null);
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        window.location.href = "/login";
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

// Authentication API calls
export const authAPI = {
  register: (userData) => api.post("/auth/register", userData),
  login: (credentials) => api.post("/auth/login", credentials),
  getProfile: () => api.get("/auth/me"),
  updateProfile: (profileData) => api.put("/auth/profile", profileData),
  changePassword: (passwordData) =>
    api.post("/auth/change-password", passwordData),
  saveDestination: (destinationData) =>
    api.post("/auth/save-destination", destinationData),
  logout: () => api.post("/auth/logout"),
};

// AI API calls
export const aiAPI = {
  generateItinerary: (itineraryData) =>
    api.post("/ai/generate-itinerary", itineraryData),
  optimizeItinerary: (optimizationData) =>
    api.post("/ai/optimize-itinerary", optimizationData),
  getTravelSuggestions: (preferencesData) =>
    api.post("/ai/travel-suggestions", preferencesData),
  getDestinationInsights: (destinationData) =>
    api.post("/ai/destination-insights", destinationData),
  getRecommendations: () => api.get("/ai/recommendations"),
  refreshRecommendations: () => api.post("/ai/recommendations/refresh"),
};

// Trip API calls
export const tripAPI = {
  getTrips: (params = {}) => api.get("/trips", { params }),
  getTripById: (id) => api.get(`/trips/${id}`),
  createTrip: (tripData) => api.post("/trips", tripData),
  updateTrip: (id, tripData) => api.put(`/trips/${id}`, tripData),
  deleteTrip: (id) => api.delete(`/trips/${id}`),
  getPublicTrips: (params = {}) => api.get("/trips/public", { params }),
  cloneTrip: (id) => api.post(`/trips/${id}/clone`),
  getTripStats: () => api.get("/trips/stats"),
  getUpcomingTrips: (params = {}) => api.get("/trips/upcoming", { params }),
  getPastTrips: (params = {}) => api.get("/trips/past", { params }),
  getRecentTrips: () => api.get("/trips/recent"),
};

// Maps API calls (using consolidated backend route)
export const mapsAPI = {
  getNearbyPlaces: (params = {}) => api.get("/maps/places/nearby", { params }),
  searchPlaces: (params = {}) => api.get("/maps/places/search", { params }),
  getDirections: (params = {}) => api.get("/maps/directions", { params }),
  geocodeAddress: (params = {}) => api.get("/maps/geocode", { params }),
  reverseGeocode: (params = {}) => api.get("/maps/reverse-geocode", { params }),
  saveLocation: (locationData) => api.post("/maps/save-location", locationData),
  getSavedLocations: () => api.get("/maps/saved-locations"),
  deleteSavedLocation: (id) => api.delete(`/maps/saved-locations/${id}`),
};

// User API calls
export const userAPI = {
  getUsers: (params = {}) => api.get("/users", { params }),
  getUserById: (id) => api.get(`/users/${id}`),
  updateUser: (id, userData) => api.put(`/users/${id}`, userData),
  deleteUser: (id) => api.delete(`/users/${id}`),
  getUserStats: () => api.get("/users/stats"),
  updatePreferences: (preferences) =>
    api.put("/users/preferences", preferences),
  uploadAvatar: (formData) =>
    api.post("/users/avatar", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    }),
  updateProfile: (profileData) => api.put("/auth/profile", profileData),
  changePassword: (passwordData) =>
    api.post("/auth/change-password", passwordData),
};

// Error handling utility
export const handleApiError = (error) => {
  if (error.response) {
    // Server responded with error status
    const { status, data } = error.response;
    return {
      message: data.message || "An error occurred",
      status,
      errors: data.errors || null,
    };
  } else if (error.request) {
    // Request was made but no response received
    return {
      message: "Network error. Please check your connection.",
      status: 0,
      errors: null,
    };
  } else {
    // Something else happened
    return {
      message: error.message || "An unexpected error occurred",
      status: 0,
      errors: null,
    };
  }
};

export default api;

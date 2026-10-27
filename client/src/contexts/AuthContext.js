import React, { createContext, useContext, useReducer, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";
import api from "../services/api";

const AuthContext = createContext();

const initialState = {
  user: null,
  token: localStorage.getItem("token"),
  isAuthenticated: false,
  loading: false, // Start false, only true when actually verifying
};

const authReducer = (state, action) => {
  switch (action.type) {
    case "AUTH_START":
      return {
        ...state,
        loading: true,
      };
    case "AUTH_SUCCESS":
      return {
        ...state,
        user: action.payload.user,
        token: action.payload.token,
        isAuthenticated: true,
        loading: false,
      };
    case "AUTH_FAIL":
      return {
        ...state,
        user: null,
        token: null,
        isAuthenticated: false,
        loading: false,
      };
    case "LOGOUT":
      return {
        ...state,
        user: null,
        token: null,
        isAuthenticated: false,
        loading: false,
      };
    case "UPDATE_USER":
      return {
        ...state,
        user: action.payload,
      };
    default:
      return state;
  }
};

export const AuthProvider = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, initialState);
  const navigate = useNavigate();

  // Set auth token in axios headers
  useEffect(() => {
    if (state.token) {
      api.defaults.headers.common["Authorization"] = `Bearer ${state.token}`;
    } else {
      delete api.defaults.headers.common["Authorization"];
    }
  }, [state.token]);

  // Check if user is authenticated on app load
  useEffect(() => {
    const checkAuth = async () => {
      const storedToken = localStorage.getItem("token");
      if (storedToken) {
        dispatch({ type: "AUTH_START" }); // Explicitly start loading
        try {
          // Add timeout to prevent hanging
          const controller = new AbortController();
          const timeoutId = setTimeout(() => {
            controller.abort();
            console.error("Auth check timeout - clearing token");
            localStorage.removeItem("token");
            dispatch({ type: "AUTH_FAIL" });
          }, 5000); // 5 second timeout

          const response = await api.get("/auth/me", {
            signal: controller.signal,
          });
          clearTimeout(timeoutId);

          dispatch({
            type: "AUTH_SUCCESS",
            payload: {
              user: response.data.user,
              token: storedToken,
            },
          });
        } catch (error) {
          console.error("Auth check failed:", error);
          localStorage.removeItem("token");
          dispatch({ type: "AUTH_FAIL" });
        }
      } else {
        // No token, immediately set loading to false
        dispatch({ type: "AUTH_FAIL" });
      }
    };

    checkAuth();
  }, []);

  const login = async (email, password) => {
    try {
      dispatch({ type: "AUTH_START" });
      const response = await api.post("/auth/login", { email, password });

      const { user, token } = response.data;
      
      if (token) {
        localStorage.setItem("token", token);
      }

      dispatch({
        type: "AUTH_SUCCESS",
        payload: { user, token },
      });

      toast.success("Login successful!");
      navigate("/dashboard");

      return { success: true };
    } catch (error) {
      dispatch({ type: "AUTH_FAIL" });
      const message = error.response?.data?.message || "Login failed";
      toast.error(message);
      return { success: false, message };
    }
  };

  const register = async (userData) => {
    try {
      dispatch({ type: "AUTH_START" });
      const response = await api.post("/auth/register", userData);

      const { user, token } = response.data;
      
      if (token) {
        localStorage.setItem("token", token);
      }

      dispatch({
        type: "AUTH_SUCCESS",
        payload: { user, token },
      });

      toast.success("Registration successful!");
      navigate("/dashboard");

      return { success: true };
    } catch (error) {
      dispatch({ type: "AUTH_FAIL" });
      const message = error.response?.data?.message || "Registration failed";
      toast.error(message);
      return { success: false, message };
    }
  };

  const logout = async () => {
    try {
      if (state.token) {
        await api.post("/auth/logout");
      }
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      localStorage.removeItem("token");
      dispatch({ type: "LOGOUT" });
      toast.success("Logged out successfully");
      navigate("/");
    }
  };

  const updateUser = (userData) => {
    dispatch({
      type: "UPDATE_USER",
      payload: userData,
    });
  };

  const updateProfile = async (profileData) => {
    try {
      const response = await api.put("/auth/profile", profileData);
      dispatch({
        type: "UPDATE_USER",
        payload: response.data.user,
      });
      toast.success("Profile updated successfully");
      return { success: true };
    } catch (error) {
      const message = error.response?.data?.message || "Profile update failed";
      toast.error(message);
      return { success: false, message };
    }
  };

  const changePassword = async (currentPassword, newPassword) => {
    try {
      await api.post("/auth/change-password", { currentPassword, newPassword });
      toast.success("Password changed successfully");
      return { success: true };
    } catch (error) {
      const message = error.response?.data?.message || "Password change failed";
      toast.error(message);
      return { success: false, message };
    }
  };

  const hasPermission = (permission) => {
    if (!state.user) return false;

    // Admin has all permissions
    if (state.user.role === "admin") return true;
    return permission !== "admin";
  };

  const getRemainingAiRequests = () => {
    if (!state.user) return 0;

    // Return unlimited requests (-1) for all users
    return -1;
  };

  const refreshUserData = async () => {
    try {
      const response = await api.get("/auth/me");
      dispatch({
        type: "UPDATE_USER",
        payload: response.data.user,
      });
      return response.data.user;
    } catch (error) {
      console.error("Failed to refresh user data:", error);
      return null;
    }
  };

  const value = {
    user: state.user,
    token: state.token,
    isAuthenticated: state.isAuthenticated,
    loading: state.loading,
    login,
    register,
    logout,
    updateUser,
    updateProfile,
    changePassword,
    hasPermission,
    getRemainingAiRequests,
    refreshUserData,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

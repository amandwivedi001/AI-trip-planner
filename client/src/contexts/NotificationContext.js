import React, { createContext, useContext, useReducer, useEffect } from "react";
import io from "socket.io-client";
import toast from "react-hot-toast";
import { useAuth } from "./AuthContext";

// Initial state
const initialState = {
  socket: null,
  isConnected: false,
  notifications: [],
  unreadCount: 0,
  realTimeData: {},
};

// Action types
const NotificationActionTypes = {
  CONNECT_SOCKET: "CONNECT_SOCKET",
  DISCONNECT_SOCKET: "DISCONNECT_SOCKET",
  ADD_NOTIFICATION: "ADD_NOTIFICATION",
  MARK_NOTIFICATION_READ: "MARK_NOTIFICATION_READ",
  MARK_ALL_READ: "MARK_ALL_READ",
  UPDATE_REAL_TIME_DATA: "UPDATE_REAL_TIME_DATA",
  CLEAR_NOTIFICATIONS: "CLEAR_NOTIFICATIONS",
};

// Reducer
const notificationReducer = (state, action) => {
  switch (action.type) {
    case NotificationActionTypes.CONNECT_SOCKET:
      return {
        ...state,
        socket: action.payload,
        isConnected: true,
      };

    case NotificationActionTypes.DISCONNECT_SOCKET:
      return {
        ...state,
        socket: null,
        isConnected: false,
      };

    case NotificationActionTypes.ADD_NOTIFICATION:
      return {
        ...state,
        notifications: [action.payload, ...state.notifications].slice(0, 50), // Keep only latest 50
        unreadCount: state.unreadCount + 1,
      };

    case NotificationActionTypes.MARK_NOTIFICATION_READ:
      return {
        ...state,
        notifications: state.notifications.map((notification) =>
          notification.id === action.payload
            ? { ...notification, read: true }
            : notification
        ),
        unreadCount: Math.max(0, state.unreadCount - 1),
      };

    case NotificationActionTypes.MARK_ALL_READ:
      return {
        ...state,
        notifications: state.notifications.map((notification) => ({
          ...notification,
          read: true,
        })),
        unreadCount: 0,
      };

    case NotificationActionTypes.UPDATE_REAL_TIME_DATA:
      return {
        ...state,
        realTimeData: {
          ...state.realTimeData,
          [action.payload.key]: action.payload.data,
        },
      };

    case NotificationActionTypes.CLEAR_NOTIFICATIONS:
      return {
        ...state,
        notifications: [],
        unreadCount: 0,
      };

    default:
      return state;
  }
};

// Create context
const NotificationContext = createContext();

// Custom hook to use notification context
export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error(
      "useNotifications must be used within a NotificationProvider"
    );
  }
  return context;
};

// Notification provider component
export const NotificationProvider = ({ children }) => {
  const [state, dispatch] = useReducer(notificationReducer, initialState);
  const { user, isAuthenticated } = useAuth();

  // Connect to Socket.IO when user is authenticated
  useEffect(() => {
    if (isAuthenticated && user && !state.socket) {
      const socketUrl =
        process.env.REACT_APP_API_URL?.replace("/api", "") ||
        "http://localhost:5000";
      const newSocket = io(socketUrl, {
        auth: {
          token: localStorage.getItem("token"),
        },
      });

      dispatch({
        type: NotificationActionTypes.CONNECT_SOCKET,
        payload: newSocket,
      });

      // Socket event listeners
      newSocket.on("connect", () => {
        console.log("Socket connected:", newSocket.id);
      });

      newSocket.on("disconnect", () => {
        console.log("Socket disconnected");
        dispatch({ type: NotificationActionTypes.DISCONNECT_SOCKET });
      });

      // Trip-related events
      newSocket.on("trip-updated", (data) => {
        addNotification({
          type: "trip",
          title: "Trip Updated",
          message: `Your trip "${data.tripName}" has been updated.`,
          data,
        });

        dispatch({
          type: NotificationActionTypes.UPDATE_REAL_TIME_DATA,
          payload: { key: "tripUpdate", data },
        });
      });

      // Payment-related events
      newSocket.on("payment-success", (data) => {
        addNotification({
          type: "payment",
          title: "Payment Successful",
          message: `Payment of ${data.currency.toUpperCase()} ${
            data.amount
          } was successful.`,
          data,
        });

        toast.success("Payment completed successfully!");
      });

      newSocket.on("payment-failed", (data) => {
        addNotification({
          type: "payment",
          title: "Payment Failed",
          message: `Payment failed: ${data.error}`,
          data,
        });

        toast.error("Payment failed. Please try again.");
      });

      // Booking-related events
      newSocket.on("booking-confirmed", (data) => {
        addNotification({
          type: "booking",
          title: "Booking Confirmed",
          message: `Your booking (${data.bookingReference}) has been confirmed.`,
          data,
        });

        toast.success("Booking confirmed!");
      });

      newSocket.on("booking-cancelled", (data) => {
        addNotification({
          type: "booking",
          title: "Booking Cancelled",
          message: `Your booking (${data.bookingReference}) has been cancelled.`,
          data,
        });
      });

      // Subscription events
      newSocket.on("subscription-renewed", (data) => {
        addNotification({
          type: "subscription",
          title: "Subscription Renewed",
          message: `Your subscription has been renewed. Next billing: ${new Date(
            data.periodEnd
          ).toLocaleDateString()}`,
          data,
        });
      });

      newSocket.on("subscription-cancelled", (data) => {
        addNotification({
          type: "subscription",
          title: "Subscription Cancelled",
          message: `Your subscription has been cancelled and will end on ${new Date(
            data.endDate
          ).toLocaleDateString()}`,
          data,
        });
      });

      // Admin notifications
      if (user.role === "admin") {
        newSocket.on("admin-alert", (data) => {
          addNotification({
            type: "admin",
            title: "Admin Alert",
            message: data.message,
            data,
          });
        });

        newSocket.on("system-alert", (data) => {
          addNotification({
            type: "system",
            title: "System Alert",
            message: data.message,
            data,
            priority: "high",
          });
        });
      }

      // General notifications
      newSocket.on("notification", (data) => {
        addNotification(data);
      });

      return () => {
        newSocket.disconnect();
      };
    }
  }, [isAuthenticated, user, state.socket]);

  // Disconnect socket when user logs out
  useEffect(() => {
    if (!isAuthenticated && state.socket) {
      state.socket.disconnect();
      dispatch({ type: NotificationActionTypes.DISCONNECT_SOCKET });
    }
  }, [isAuthenticated, state.socket]);

  // Add notification function
  const addNotification = (notification) => {
    const newNotification = {
      id: Date.now() + Math.random(),
      timestamp: new Date(),
      read: false,
      ...notification,
    };

    dispatch({
      type: NotificationActionTypes.ADD_NOTIFICATION,
      payload: newNotification,
    });

    // Show toast for high priority notifications
    if (notification.priority === "high") {
      toast.error(notification.message);
    }
  };

  // Mark notification as read
  const markAsRead = (notificationId) => {
    dispatch({
      type: NotificationActionTypes.MARK_NOTIFICATION_READ,
      payload: notificationId,
    });
  };

  // Mark all notifications as read
  const markAllAsRead = () => {
    dispatch({ type: NotificationActionTypes.MARK_ALL_READ });
  };

  // Clear all notifications
  const clearNotifications = () => {
    dispatch({ type: NotificationActionTypes.CLEAR_NOTIFICATIONS });
  };

  // Join trip room for real-time updates
  const joinTripRoom = (tripId) => {
    if (state.socket) {
      state.socket.emit("join-trip", tripId);
    }
  };

  // Leave trip room
  const leaveTripRoom = (tripId) => {
    if (state.socket) {
      state.socket.emit("leave-trip", tripId);
    }
  };

  // Send trip update
  const sendTripUpdate = (tripData) => {
    if (state.socket) {
      state.socket.emit("trip-update", tripData);
    }
  };

  const value = {
    ...state,
    addNotification,
    markAsRead,
    markAllAsRead,
    clearNotifications,
    joinTripRoom,
    leaveTripRoom,
    sendTripUpdate,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};

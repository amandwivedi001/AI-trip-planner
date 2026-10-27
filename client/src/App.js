import React from "react";
import { Routes, Route } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import { NotificationProvider } from "./contexts/NotificationContext";
import ProtectedRoute from "./components/auth/ProtectedRoute";
import PublicRoute from "./components/auth/PublicRoute";
import Layout from "./components/layout/Layout";

// Pages
import Home from "./pages/Home";
import Login from "./pages/auth/Login";
import Register from "./pages/auth/Register";
import Dashboard from "./pages/Dashboard";
import TripPlanner from "./pages/TripPlanner";
import Trips from "./pages/Trips";
import TripDetail from "./pages/TripDetail";
import Maps from "./pages/Maps";
import Profile from "./pages/Profile";
import NotFound from "./pages/NotFound";

function App() {
  return (
    <AuthProvider>
      <NotificationProvider>
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<Layout />}>
            <Route index element={<Home />} />
          </Route>

          {/* Auth Routes - only accessible when not logged in */}
          <Route path="/auth" element={<Layout fullScreen />}>
            <Route
              path="login"
              element={
                <PublicRoute>
                  <Login />
                </PublicRoute>
              }
            />
            <Route
              path="register"
              element={
                <PublicRoute>
                  <Register />
                </PublicRoute>
              }
            />
          </Route>

          {/* Legacy auth routes for compatibility */}
          <Route
            path="/login"
            element={
              <PublicRoute>
                <Layout fullScreen>
                  <Login />
                </Layout>
              </PublicRoute>
            }
          />
          <Route
            path="/register"
            element={
              <PublicRoute>
                <Layout fullScreen>
                  <Register />
                </Layout>
              </PublicRoute>
            }
          />

          {/* Protected Routes - only accessible when logged in */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Layout showSidebar>
                  <Dashboard />
                </Layout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/trip-planner"
            element={
              <ProtectedRoute>
                <Layout showSidebar>
                  <TripPlanner />
                </Layout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/trips"
            element={
              <ProtectedRoute>
                <Layout showSidebar>
                  <Trips />
                </Layout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/trips/:id"
            element={
              <ProtectedRoute>
                <Layout showSidebar>
                  <TripDetail />
                </Layout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/maps"
            element={
              <ProtectedRoute>
                <Layout showNavbarOnly>
                  <Maps />
                </Layout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <Layout showSidebar>
                  <Profile />
                </Layout>
              </ProtectedRoute>
            }
          />

          {/* 404 Not Found */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </NotificationProvider>
    </AuthProvider>
  );
}

export default App;

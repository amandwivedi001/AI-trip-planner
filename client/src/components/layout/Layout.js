import React from "react";
import { Outlet, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { useAuth } from "../../contexts/AuthContext";
import Navbar from "./Navbar";
import Sidebar from "./Sidebar";
import Footer from "./Footer";
const Layout = ({
  children,
  showSidebar = false,
  fullScreen = false,
  showNavbarOnly = false,
}) => {
  const { isAuthenticated } = useAuth();
  const location = useLocation();

  const shouldShowSidebar = showSidebar && isAuthenticated;
  const shouldShowFooter = location.pathname === '/';

  // 1. Full Screen Layout (Auth pages)
  if (fullScreen) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        {children || <Outlet />}
      </div>
    );
  }

  // 2. Navbar Only Layout
  if (showNavbarOnly) {
    return (
      <div className="flex flex-col min-h-screen bg-gray-50 dark:bg-gray-900">
        <Navbar />
        <main className="flex-1">
          {children || <Outlet />}
        </main>
      </div>
    );
  }

  // 3. MAIN LAYOUT (Sandwich Style: Nav -> Content -> Footer)
  return (
    // changed 'h-screen' to 'min-h-screen' so the page grows with content
    <div className="flex flex-col min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-200">
      
      {/* TOP: Sticky Navbar */}
      {/* sticky top-0 ensures it stays at the top while scrolling */}
      <div className="sticky top-0 z-50 w-full">
        <Navbar />
      </div>

      {/* MIDDLE: Sidebar + Content */}
      {/* flex-1 pushes the footer down if content is short */}
      <div className="flex flex-1 relative">
        
        {/* Left: Sidebar */}
        {shouldShowSidebar && (
           // sticky top-16 (adjust based on Navbar height) ensures Sidebar stays visible 
           // while you scroll down the content
           <aside className="hidden lg:block w-72 flex-shrink-0 sticky top-[64px] h-[calc(100vh-64px)] overflow-y-auto">
              <Sidebar />
           </aside>
        )}

        {/* Right: Main Content */}
        {/* UPDATED: Removed p-4 md:p-6 lg:p-8 */}
        <main className="flex-1 w-full">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            {children || <Outlet />}
          </motion.div>
        </main>
      </div>

      {/* BOTTOM: Full Width Footer - Only show on home page */}
      {shouldShowFooter && (
        <div className="w-full z-10 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800">
           <Footer />
        </div>
      )}

    </div>
  );
};

export default Layout;
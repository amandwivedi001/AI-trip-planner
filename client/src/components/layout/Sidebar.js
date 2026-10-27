import React, { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "../../contexts/AuthContext";
import {
  FaChartBar,
  FaPlane,
  FaMapMarkedAlt,
  FaRoute,
  FaUsers,
  FaDatabase,
  FaFileAlt,
  FaUser,
  FaBars,
  FaTimes,
} from "react-icons/fa";

const Sidebar = () => {
  const { hasPermission } = useAuth();
  const location = useLocation();
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  // --- Navigation Arrays ---
  const userNavigation = [
    {
      name: "Dashboard",
      href: "/dashboard",
      icon: FaChartBar,
      description: "Overview & Analytics",
    },
    {
      name: "Trip Planner",
      href: "/trip-planner",
      icon: FaPlane,
      description: "Plan your next adventure",
    },
    {
      name: "My Trips",
      href: "/trips",
      icon: FaRoute,
      description: "View all trips",
    },
    {
      name: "Maps",
      href: "/maps",
      icon: FaMapMarkedAlt,
      description: "Explore destinations",
    },
  ];

  const adminNavigation = [
    {
      name: "Admin Panel",
      href: "/admin",
      icon: FaDatabase,
      description: "System management",
    },
    {
      name: "User Management",
      href: "/admin/users",
      icon: FaUsers,
      description: "Manage users",
    },
    {
      name: "Analytics",
      href: "/admin/analytics",
      icon: FaChartBar,
      description: "Platform insights",
    },
    {
      name: "Content Management",
      href: "/admin/content",
      icon: FaFileAlt,
      description: "Manage content",
    },
  ];

  // Determine available links
  const currentNavigation = hasPermission("admin")
    ? [...userNavigation, ...adminNavigation]
    : userNavigation;

  // Helper Component for Navigation Links
  const NavItem = ({ item, isActive, index }) => (
    <motion.div
      key={item.name}
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.05 }}
      whileHover={{ x: 6, scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
    >
      <Link
        to={item.href}
        onClick={() => setIsMobileOpen(false)}
        className={`group relative flex items-center px-4 py-3.5 text-sm font-medium rounded-xl transition-all duration-200 ${
          isActive
            ? "bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-lg shadow-blue-500/30 dark:shadow-blue-500/20"
            : "text-gray-700 dark:text-gray-300 hover:bg-white dark:hover:bg-gray-700/80 hover:text-gray-900 dark:hover:text-white hover:shadow-md"
        }`}
      >
        <item.icon
          className={`mr-3 h-5 w-5 transition-transform group-hover:scale-110 ${
            isActive
              ? "text-white"
              : "text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300"
          }`}
        />
        <div className="flex-1">
          <div className="font-semibold">{item.name}</div>
          <div
            className={`text-xs line-clamp-1 ${
              isActive
                ? "text-blue-100"
                : "text-gray-500 dark:text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300"
            }`}
          >
            {item.description}
          </div>
        </div>
      </Link>
    </motion.div>
  );

  return (
    <>
      {/* 1. Mobile Toggle Button (Visible only on small screens) */}
      <button
        onClick={() => setIsMobileOpen(!isMobileOpen)}
        className="lg:hidden fixed top-[70px] left-4 z-50 p-2 bg-blue-600 text-white rounded-md shadow-lg border border-blue-500 hover:bg-blue-700 transition-colors"
      >
        {isMobileOpen ? <FaTimes /> : <FaBars />}
      </button>

      {/* 2. Mobile Overlay (Background dimming) */}
      <AnimatePresence>
        {isMobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsMobileOpen(false)}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 lg:hidden"
          />
        )}
      </AnimatePresence>

      {/* 3. Main Sidebar Container */}
      <div
        className={`
          /* Position & Z-Index */
          fixed lg:relative top-0 left-0 z-40
          
          /* Size */
          h-full w-72 
          
          /* Styling */
          bg-gradient-to-b from-blue-50 via-purple-50 to-white dark:from-gray-900 dark:via-blue-950/30 dark:to-gray-800 
          border-r border-gray-200/50 dark:border-gray-700/50 
          flex flex-col shadow-xl 
          
          /* Transition for Mobile Slide-in */
          transition-transform duration-300 ease-in-out
          
          /* Logic: Open/Close on Mobile, Always Open on Desktop */
          ${isMobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
        `}
      >
        {/* Navigation List */}
        <nav className="flex-1 px-3 py-5 space-y-6 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600 scrollbar-track-transparent">
          <div className="space-y-1">
            <h4 className="px-3 text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-3 flex justify-between items-center">
              <span>Main Menu</span>
              {/* Close button inside sidebar for mobile ease of use */}
              <button onClick={() => setIsMobileOpen(false)} className="lg:hidden text-lg text-gray-400">
                <FaTimes />
              </button>
            </h4>
            
            {currentNavigation.map((item, index) => {
              const isActive = location.pathname === item.href;
              return (
                <NavItem
                  key={item.name}
                  item={item}
                  isActive={isActive}
                  index={index}
                />
              );
            })}
          </div>
        </nav>

        {/* Bottom Actions Section */}
        <motion.div
          className="p-3 border-t border-gray-200/50 dark:border-gray-700/50 space-y-2 bg-gradient-to-t from-white via-blue-50/30 to-transparent dark:from-gray-800 dark:via-blue-950/20 dark:to-transparent"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
            <Link
              to="/trip-planner"
              className="w-full flex items-center justify-center px-4 py-3 border border-transparent rounded-xl shadow-lg text-sm font-bold text-white bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 hover:from-blue-700 hover:via-purple-700 hover:to-pink-700 transition-all duration-200 hover:shadow-xl"
            >
              <FaPlane className="mr-2 h-4 w-4" />
              Plan New Trip
            </Link>
          </motion.div>

          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
            <Link
              to="/profile"
              className="w-full flex items-center justify-center px-4 py-2.5 border border-gray-200 dark:border-gray-700/50 rounded-xl text-sm font-semibold text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-all duration-200 hover:shadow-md shadow-sm"
            >
              <FaUser className="mr-2 h-4 w-4" />
              Profile
            </Link>
          </motion.div>
        </motion.div>
      </div>
    </>
  );
};

export default Sidebar;
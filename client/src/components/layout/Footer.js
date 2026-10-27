import React from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  FaTwitter,
  FaInstagram,
  FaLinkedin,
  FaShieldAlt,
  FaRocket,
} from "react-icons/fa";

const Footer = () => {
  return (
    <footer className="relative bg-gradient-to-br from-gray-900 via-blue-950 to-gray-900 dark:from-black dark:via-blue-950/50 dark:to-black text-white py-8 lg:py-16 overflow-hidden">
      {/* Background Animation */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 animate-pulse"></div>
      </div>

      <div className="relative max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="grid grid-cols-2 md:grid-cols-3 gap-8 lg:gap-12 mb-4 lg:mb-12"
        >
          {/* Brand Section */}
          <div className="col-span-2 md:col-span-1">
            <h3 className="text-2xl lg:text-3xl font-bold mb-3 bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
              AI Trip Planner
            </h3>
            <p className="text-sm lg:text-base text-gray-400 mb-2 lg:mb-4 leading-relaxed">
              Your intelligent travel companion powered by cutting-edge AI. Plan
              smarter, explore better.
            </p>
            <div className="hidden md:flex space-x-4 mt-6">
              <a
                href="#"
                className="w-11 h-11 rounded-full bg-gradient-to-r from-blue-500 to-blue-600 flex items-center justify-center hover:scale-110 transition-transform duration-300 shadow-lg shadow-blue-500/50"
              >
                <FaTwitter className="h-5 w-5" />
              </a>
              <a
                href="#"
                className="w-11 h-11 rounded-full bg-gradient-to-r from-pink-500 to-purple-600 flex items-center justify-center hover:scale-110 transition-transform duration-300 shadow-lg shadow-pink-500/50"
              >
                <FaInstagram className="h-5 w-5" />
              </a>
              <a
                href="#"
                className="w-11 h-11 rounded-full bg-gradient-to-r from-blue-600 to-blue-700 flex items-center justify-center hover:scale-110 transition-transform duration-300 shadow-lg shadow-blue-600/50"
              >
                <FaLinkedin className="h-5 w-5" />
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-base lg:text-lg font-semibold mb-4 lg:mb-6 text-white">
              Quick Links
            </h4>
            <div className="space-y-1">
              {[
                { name: "Dashboard", to: "/dashboard" },
                { name: "Trip Planner", to: "/trip-planner" },
                { name: "Maps", to: "/maps" },
                { name: "My Trips", to: "/trips" },
              ].map((link, index) => (
                <motion.div
                  key={link.name}
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Link
                    to={link.to}
                    className="text-sm lg:text-base text-gray-400 hover:text-white hover:translate-x-2 inline-flex items-center transition-all duration-300 group py-1 md:py-2"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500 mr-3 group-hover:bg-purple-500"></span>
                    {link.name}
                  </Link>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Resources */}
          <div>
            <h4 className="text-base lg:text-lg font-semibold mb-4 lg:mb-6 text-white">
              Resources
            </h4>
            <div className="space-y-1">
              {[
                { name: "About Project", to: "/about" },
                { name: "How It Works", to: "/about" },
                { name: "Contact", to: "/contact" },
                { name: "Privacy Policy", to: "/privacy" },
              ].map((item, index) => (
                <motion.div
                  key={item.name}
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Link
                    to={item.to}
                    className="text-sm lg:text-base text-gray-400 hover:text-white hover:translate-x-2 inline-flex items-center transition-all duration-300 group py-1 md:py-2"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-purple-500 mr-3 group-hover:bg-pink-500"></span>
                    {item.name}
                  </Link>
                </motion.div>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Bottom Bar */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.4 }}
          className="border-t border-gray-800/50 pt-6 lg:pt-8"
        >
          <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
            <p className="text-gray-400 text-xs lg:text-sm">
              &copy; {new Date().getFullYear()} AI Trip Planner. All rights
              reserved.
            </p>
            <div className="flex items-center space-x-6 text-xs lg:text-sm text-gray-400">
              <span className="flex items-center">
                <FaShieldAlt className="h-4 w-4 mr-2 text-green-400" />
                Secure & Private
              </span>
              <span className="flex items-center">
                <FaRocket className="h-4 w-4 mr-2 text-purple-400" />
                AI Powered
              </span>
            </div>
          </div>
        </motion.div>
      </div>
    </footer>
  );
};

export default Footer;

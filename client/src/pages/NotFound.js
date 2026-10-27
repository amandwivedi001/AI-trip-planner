import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { FaHome, FaSearch, FaArrowLeft } from 'react-icons/fa';

const NotFound = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-accent-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          {/* 404 Number */}
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="text-9xl font-bold text-primary-600 mb-4"
          >
            404
          </motion.div>

          {/* Title */}
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="text-3xl font-bold text-gray-900 mb-4"
          >
            Page Not Found
          </motion.h1>

          {/* Description */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.6 }}
            className="text-lg text-gray-600 mb-8"
          >
            Oops! The page you're looking for doesn't exist. 
            It might have been moved, deleted, or you entered the wrong URL.
          </motion.p>

          {/* Action Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.8 }}
            className="space-y-4"
          >
            <Link
              to="/"
              className="btn-lg bg-primary-600 text-white hover:bg-primary-700 font-semibold w-full flex items-center justify-center"
            >
              <FaHome className="mr-2" />
              Go to Homepage
            </Link>

            <button
              onClick={() => window.history.back()}
              className="btn-lg border-2 border-primary-600 text-primary-600 hover:bg-primary-600 hover:text-white font-semibold w-full flex items-center justify-center"
            >
              <FaArrowLeft className="mr-2" />
              Go Back
            </button>
          </motion.div>

          {/* Search Suggestion */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 1 }}
            className="mt-8 p-6 bg-white rounded-lg shadow-sm"
          >
            <div className="flex items-center justify-center mb-3">
              <FaSearch className="h-5 w-5 text-gray-400 mr-2" />
              <h3 className="text-lg font-semibold text-gray-900">
                Looking for something specific?
              </h3>
            </div>
            <p className="text-gray-600 text-sm mb-4">
              Try searching for hotels, flights, or destinations using our search feature.
            </p>
            <Link
              to="/hotels"
              className="text-primary-600 hover:text-primary-700 font-medium text-sm"
            >
              Browse Hotels →
            </Link>
          </motion.div>

          {/* Help Section */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 1.2 }}
            className="mt-8 text-center"
          >
            <p className="text-gray-500 text-sm mb-2">
              Need help? Contact our support team
            </p>
            <Link
              to="/contact"
              className="text-primary-600 hover:text-primary-700 font-medium text-sm"
            >
              Contact Support
            </Link>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
};

export default NotFound;

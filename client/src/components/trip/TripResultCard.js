import React, { useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";
import { tripAPI } from "../../services/api";
import {
  FaMapMarkerAlt,
  FaCalendarAlt,
  FaUsers,
  FaRupeeSign,
  FaStar,
  FaArrowRight,
  FaDownload,
  FaPlus,
  FaEye,
} from "react-icons/fa";

const TripResultCard = ({ itinerary, formValues, onViewDetails }) => {
  const [imageError, setImageError] = useState(false);
  const [isAddingTrip, setIsAddingTrip] = useState(false);
  const navigate = useNavigate();

  const handleDownloadPDF = () => {
    toast.success(
      "Generating PDF... This feature will download your trip itinerary!"
    );
    // TODO: Implement PDF generation
    // This would typically call an API endpoint that generates a PDF
    // Example: window.open(`/api/trips/download-pdf/${tripId}`, '_blank');
  };

  const handleAddTrip = async () => {
    try {
      setIsAddingTrip(true);

      // Prepare trip data for saving
      const tripData = {
        title: `Trip to ${itinerary.destination || formValues.destination}`,
        description:
          itinerary.overview ||
          `${formValues.duration} day trip to ${
            itinerary.destination || formValues.destination
          }`,
        destination: itinerary.destination || formValues.destination,
        startDate: formValues.startDate,
        endDate: formValues.endDate,
        duration: itinerary.duration,
        travelers: formValues.travelers,
        budget: {
          min: itinerary.totalEstimatedCost?.amount || 0,
          max: itinerary.totalEstimatedCost?.amount || 0,
          currency: itinerary.totalEstimatedCost?.currency || "INR",
        },
        interests: formValues.interests || [],
        travelStyle: formValues.travelStyle,
        accommodation: formValues.accommodationType,
        transport: formValues.transportation ? [formValues.transportation] : [],
        specialRequests: formValues.specialRequests || "",
        itinerary: {
          dailyPlans: itinerary.itinerary || [],
          recommendations: itinerary.recommendations || {},
          totalEstimatedCost: itinerary.totalEstimatedCost,
        },
        // Generated trips should have status "upcoming"
        status: "upcoming",
      };

      const response = await tripAPI.createTrip(tripData);

      if (response.data.success) {
        toast.success("Trip added successfully!");
        navigate("/trips");
      }
    } catch (error) {
      console.error("Error adding trip:", error);
      toast.error(error.response?.data?.message || "Failed to add trip");
    } finally {
      setIsAddingTrip(false);
    }
  };

  const formatCurrency = (amount) => {
    if (amount === undefined || amount === null || Number.isNaN(amount)) {
      return "N/A";
    }
    return new Intl.NumberFormat("en-IN", {
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // Curated destination images from Pexels
  const destinationImages = {
    paris:
      "https://images.pexels.com/photos/2363/france-landmark-lights-night.jpg?auto=compress&cs=tinysrgb&w=800&h=600&fit=crop",
    london:
      "https://images.pexels.com/photos/460672/pexels-photo-460672.jpeg?auto=compress&cs=tinysrgb&w=800&h=600&fit=crop",
    tokyo:
      "https://images.pexels.com/photos/2506923/pexels-photo-2506923.jpeg?auto=compress&cs=tinysrgb&w=800&h=600&fit=crop",
    newyork:
      "https://images.pexels.com/photos/466685/pexels-photo-466685.jpeg?auto=compress&cs=tinysrgb&w=800&h=600&fit=crop",
    rome: "https://images.pexels.com/photos/1797161/pexels-photo-1797161.jpeg?auto=compress&cs=tinysrgb&w=800&h=600&fit=crop",
    dubai:
      "https://images.pexels.com/photos/1470502/pexels-photo-1470502.jpeg?auto=compress&cs=tinysrgb&w=800&h=600&fit=crop",
    bali: "https://images.pexels.com/photos/2166559/pexels-photo-2166559.jpeg?auto=compress&cs=tinysrgb&w=800&h=600&fit=crop",
    sydney:
      "https://images.pexels.com/photos/1796736/pexels-photo-1796736.jpeg?auto=compress&cs=tinysrgb&w=800&h=600&fit=crop",
    barcelona:
      "https://images.pexels.com/photos/1388030/pexels-photo-1388030.jpeg?auto=compress&cs=tinysrgb&w=800&h=600&fit=crop",
    default:
      "https://images.pexels.com/photos/2263436/pexels-photo-2263436.jpeg?auto=compress&cs=tinysrgb&w=800&h=600&fit=crop",
  };

  // Get destination image based on destination name
  const getDestinationImage = () => {
    const destination = (itinerary.destination || formValues.destination || "")
      .toLowerCase()
      .replace(/\s+/g, "");

    // Check if destination matches any predefined city
    for (const [city, imageUrl] of Object.entries(destinationImages)) {
      if (destination.includes(city)) {
        return imageUrl;
      }
    }

    return destinationImages.default;
  };

  const getFallbackImage = () => {
    return destinationImages.default;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="relative overflow-hidden rounded-2xl shadow-2xl bg-white dark:bg-gray-800 max-w-4xl mx-auto"
    >
      {/* Hero Image */}
      <div className="relative h-80 overflow-hidden">
        <img
          src={imageError ? getFallbackImage() : getDestinationImage()}
          alt={itinerary.destination || formValues.destination}
          onError={() => setImageError(true)}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/20 to-transparent md:from-black/70 md:via-black/30 md:to-transparent" />

        {/* Destination Badge */}
        <div className="absolute top-4 right-4 md:left-4 md:right-auto">
          <div className="bg-white/95 backdrop-blur-sm px-2 md:px-4 py-1 md:py-2 rounded-full shadow-lg">
            <div className="flex items-center gap-2">
              <FaMapMarkerAlt className="text-red-500" />
              <span className="font-semibold text-gray-900">
                {itinerary.destination || formValues.destination}
              </span>
            </div>
          </div>
        </div>

        {/* Rating Badge (if available) - Hidden on mobile */}
        <div className="hidden md:block absolute top-4 right-4">
          <div className="bg-yellow-400 text-gray-900 px-2 md:px-3 py-1 md:py-2 rounded-full shadow-lg flex items-center gap-1">
            <FaStar className="text-white" />
            <span className="font-bold">AI Optimized</span>
          </div>
        </div>

        {/* Title and subtitle overlay */}
        <div className="absolute bottom-0 left-0 right-0 p-3 md:p-6 text-white">
          <h2 className="text-xl md:text-4xl font-bold mb-1 md:mb-2">
            Your Perfect {itinerary.destination || formValues.destination}{" "}
            Adventure
          </h2>
          <p className="hidden md:block text-sm md:text-lg text-gray-200">
            Personalized itinerary crafted by AI just for you
          </p>
        </div>
      </div>

      {/* Trip Details Card */}
      <div className="p-3 md:p-8">
        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-blue-50 dark:bg-blue-900/20 p-2 md:p-4 rounded-xl text-center">
            <FaCalendarAlt className="h-5 w-5 md:h-6 md:w-6 mx-auto text-blue-600 mb-2" />
            <p className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white">
              {itinerary.duration}
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400">Days</p>
          </div>

          <div className="bg-purple-50 dark:bg-purple-900/20 p-2 md:p-4 rounded-xl text-center">
            <FaUsers className="h-5 w-5 md:h-6 md:w-6 mx-auto text-purple-600 mb-2" />
            <p className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white">
              {formValues.travelers}
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Travelers
            </p>
          </div>

          <div className="bg-green-50 dark:bg-green-900/20 p-2 md:p-4 rounded-xl text-center">
            <FaRupeeSign className="h-5 w-5 md:h-6 md:w-6 mx-auto text-green-600 mb-2" />
            <p className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white">
              ₹{formatCurrency(itinerary.totalEstimatedCost?.amount)}
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {itinerary.totalEstimatedCost?.currency || "INR"}
            </p>
          </div>

          <div className="bg-orange-50 dark:bg-orange-900/20 p-2 md:p-4 rounded-xl text-center">
            <FaStar className="h-5 w-5 md:h-6 md:w-6 mx-auto text-orange-600 mb-2" />
            <p className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white">
              {itinerary.itinerary?.length || 0}
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Activities
            </p>
          </div>
        </div>

        {/* Trip Highlights */}
        {itinerary.recommendations?.highlights && (
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
              ✨ Trip Highlights
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {itinerary.recommendations.highlights
                .slice(0, 4)
                .map((highlight, idx) => (
                  <div
                    key={idx}
                    className="flex items-start gap-2 text-gray-700 dark:text-gray-300"
                  >
                    <div className="min-w-[6px] h-[6px] rounded-full bg-blue-600 mt-2" />
                    <p className="text-sm">{highlight}</p>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* Best Time to Visit */}
        {itinerary.recommendations?.bestTimeToVisit && (
          <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 p-2 md:p-4 rounded-xl mb-6">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              <span className="font-semibold text-gray-900 dark:text-white">
                Best Time to Visit:
              </span>{" "}
              {itinerary.recommendations.bestTimeToVisit}
            </p>
          </div>
        )}

        {/* Action Buttons */}
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={onViewDetails}
          className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold py-3 md:py-4 px-4 md:px-6 rounded-xl transition-all duration-300 shadow-lg hover:shadow-xl flex items-center justify-center gap-2 md:gap-3 group text-sm md:text-base"
        >
          <FaEye />
          <span className="text-lg">View Full Trip Details</span>
          <FaArrowRight className="group-hover:translate-x-1 transition-transform" />
        </motion.button>
      </div>
    </motion.div>
  );
};

export default TripResultCard;

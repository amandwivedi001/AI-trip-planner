import React, { useState } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { useApi } from "../hooks/useApi";
import { tripAPI } from "../services/api";
import { Card, Button, LoadingSpinner, Badge } from "../components/ui";
import {
  FaRoute,
  FaCalendarAlt,
  FaMapMarkedAlt,
  FaPlus,
  FaStar,
  FaUsers,
  FaDollarSign,
  FaFilter,
  FaSearch,
} from "react-icons/fa";

const Trips = () => {
  const [filter, setFilter] = useState("all"); // all, upcoming, past, draft
  const [searchQuery, setSearchQuery] = useState("");

  const { data: response, isLoading } = useApi(["trips"], () =>
    tripAPI.getTrips().then((res) => res.data)
  );

  const trips = response?.trips || [];

  const filteredTrips =
    trips?.filter((trip) => {
      // First apply search filter if there's a query
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const destinationStr = trip.destination?.city
          ? `${trip.destination.city} ${trip.destination.country}`.toLowerCase()
          : typeof trip.destination === "string"
          ? trip.destination.toLowerCase()
          : "";
        const matchesSearch =
          destinationStr.includes(query) ||
          trip.description?.toLowerCase().includes(query) ||
          trip.title?.toLowerCase().includes(query);

        if (!matchesSearch) return false;
      }

      // Then apply status/date filters
      if (filter === "draft") {
        // Show only drafts
        return trip.status === "draft";
      }

      if (filter === "all") {
        // Exclude drafts from "All Trips" and show upcoming/completed
        const now = new Date();
        const endDate = new Date(trip.endDate);
        // Show upcoming and completed trips
        return trip.status !== "draft";
      }

      // For upcoming and past filters
      const now = new Date();
      const startDate = new Date(trip.startDate);
      const endDate = new Date(trip.endDate);

      if (filter === "upcoming") {
        // Show only upcoming trips (not drafts, start date in future)
        return trip.status === "upcoming" && startDate >= now;
      }

      if (filter === "past") {
        // Show completed trips (end date has passed)
        return endDate < now;
      }

      return true;
    }) || [];

  const getStatusVariant = (trip) => {
    if (trip.status === "draft") return "secondary";

    const now = new Date();
    const startDate = new Date(trip.startDate);
    const endDate = new Date(trip.endDate);

    if (endDate < now) return "success";
    if (startDate <= now && endDate >= now) return "warning";
    return "primary";
  };

  const getStatusLabel = (trip) => {
    if (trip.status === "draft") return "Draft";

    const now = new Date();
    const startDate = new Date(trip.startDate);
    const endDate = new Date(trip.endDate);

    if (endDate < now) return "Completed";
    if (startDate <= now && endDate >= now) return "In Progress";
    return "Upcoming";
  };

  return (

    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 dark:from-gray-900 dark:via-blue-950/50 dark:to-gray-900 py-4 md:py-6">
      <div className="max-w-7xl mx-auto px-3 md:px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-3 md:mb-6"
        >
          <div className="bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 rounded-xl md:rounded-2xl p-3 md:p-6 shadow-xl text-white">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 md:gap-0">
              <div>
                <h1 className="text-xl md:text-3xl font-bold mb-1 flex items-center">
                  <FaRoute className="mr-2 md:mr-3 h-5 w-5 md:h-8 md:w-8" />
                  My Trips
                </h1>
                <p className="text-blue-100 text-xs md:text-base">
                  Manage and view all your travel plans
                </p>
              </div>
              <motion.div
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.95 }}
                className="w-full md:w-auto"
              >
                <Link to="/trip-planner" className="block w-full">
                  <Button className="w-full md:w-auto bg-white text-blue-600 hover:bg-blue-50 font-bold px-4 py-2 md:px-6 md:py-3 rounded-xl shadow-lg flex items-center justify-center text-sm md:text-base">
                    <FaPlus className="mr-2" />
                    Plan New Trip
                  </Button>
                </Link>
              </motion.div>
            </div>
          </div>
        </motion.div>

        {/* Filters and Search */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-4 md:mb-6"
        >
          <Card className="p-2 md:p-5 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-0 shadow-lg rounded-xl md:rounded-2xl">
            <div className="flex flex-col md:flex-row gap-2 md:gap-4">
              {/* Search */}
              <div className="flex-1">
                <div className="relative">
                  <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-3 w-3 md:h-4 md:w-4" />
                  <input
                    type="text"
                    placeholder="Search trips..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-8 md:pl-10 pr-3 md:pr-4 py-2 md:py-2.5 text-xs md:text-base border border-gray-300 dark:border-gray-600 rounded-lg md:rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                  />
                </div>
              </div>

              {/* Filters */}
              <div className="flex gap-2 overflow-x-auto pb-1 md:pb-0 scrollbar-hide justify-center md:justify-start">
                {[
                  { id: "all", label: "All" },
                  { id: "upcoming", label: "Upcoming" },
                  { id: "past", label: "Past" },
                  { id: "draft", label: "Drafts" },
                ].map((filterOption) => (
                  <button
                    key={filterOption.id}
                    onClick={() => setFilter(filterOption.id)}
                    className={`px-3 py-1.5 md:px-4 md:py-2 rounded-lg md:rounded-xl font-semibold text-xs md:text-sm whitespace-nowrap transition-all duration-300 flex-shrink-0 ${
                      filter === filterOption.id
                        ? "bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-md"
                        : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
                    }`}
                  >
                    {filterOption.label}
                  </button>
                ))}
              </div>
            </div>
          </Card>
        </motion.div>

        {/* Trips Grid */}
        {isLoading ? (
          <div className="flex justify-center py-20">
            <LoadingSpinner size="lg" />
          </div>
        ) : filteredTrips.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-6">
            {filteredTrips.map((trip, index) => (
              <motion.div
                key={trip._id || trip.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.1 }}
                whileHover={{ scale: 1.02 }}
              >
                <Link to={`/trips/${trip._id || trip.id}`}>
                  <Card className="h-full p-3 md:p-5 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-0 shadow-lg hover:shadow-2xl rounded-xl md:rounded-2xl transition-all duration-300">
                    {/* Destination Image Placeholder */}
                    <div className="relative h-28 md:h-40 -mx-3 md:-mx-5 -mt-3 md:-mt-5 mb-2 md:mb-4 rounded-t-xl md:rounded-t-2xl overflow-hidden bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500">
                      <div className="absolute inset-0 flex items-center justify-center">
                        <FaMapMarkedAlt className="h-12 w-12 md:h-16 md:w-16 text-white/30" />
                      </div>
                      <div className="absolute top-3 right-3">
                        <Badge
                          variant={getStatusVariant(trip)}
                          className="font-bold shadow-lg text-xs md:text-sm"
                        >
                          {getStatusLabel(trip)}
                        </Badge>
                      </div>
                    </div>

                    {/* Trip Details */}
                    <div className="space-y-2 md:space-y-3">
                      <div>
                        <h3 className="text-lg md:text-xl font-bold text-gray-900 dark:text-white mb-0.5 md:mb-1">
                          {trip.destination?.city ||
                            trip.title ||
                            trip.destination}
                          {trip.destination?.country &&
                            trip.destination.city !==
                              trip.destination.country &&
                            `, ${trip.destination.country}`}
                        </h3>
                        {(trip.description || trip.title) && (
                          <p className="text-xs md:text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                            {trip.description || trip.title}
                          </p>
                        )}
                        {trip.status === "draft" && (
                          <p className="text-[10px] md:text-xs text-gray-500 dark:text-gray-500 mt-0.5 md:mt-1 italic">
                            {trip.preferences?.duration || 0}-day trip to{" "}
                            {trip.destination?.city || trip.destination}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center text-xs md:text-sm text-gray-600 dark:text-gray-400">
                        <FaCalendarAlt className="mr-2" />
                        <span>
                          {new Date(trip.startDate).toLocaleDateString(
                            "en-US",
                            {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            }
                          )}{" "}
                          -{" "}
                          {new Date(trip.endDate).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </span>
                      </div>

                      <div className="flex items-center justify-between pt-2 md:pt-3 border-t border-gray-200 dark:border-gray-700">
                        <div className="flex items-center text-xs md:text-sm text-gray-600 dark:text-gray-400">
                          <FaUsers className="mr-2" />
                          <span>
                            {trip.preferences?.groupSize ||
                              trip.travelers ||
                              trip.groupSize ||
                              1}{" "}
                            travelers
                          </span>
                        </div>

                        {(trip.budget || trip.preferences?.budget) && (
                          <div className="flex items-center text-xs md:text-sm font-bold text-gray-900 dark:text-white">
                            <FaDollarSign className="mr-1" />
                            <span>
                              {trip.preferences?.budget?.max
                                ? `₹${trip.preferences.budget.max.toLocaleString()}`
                                : trip.budget?.max
                                ? `₹${trip.budget.max.toLocaleString()}`
                                : trip.budget}
                            </span>
                          </div>
                        )}
                      </div>

                      {trip.rating && (
                        <div className="flex items-center pt-1 md:pt-2">
                          <FaStar className="h-3 w-3 md:h-4 md:w-4 text-yellow-400 mr-1" />
                          <span className="text-xs md:text-sm font-semibold text-gray-900 dark:text-white">
                            {trip.rating}
                          </span>
                          <span className="text-[10px] md:text-xs text-gray-500 dark:text-gray-400 ml-1">
                            / 5.0
                          </span>
                        </div>
                      )}
                    </div>
                  </Card>
                </Link>
              </motion.div>
            ))}
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-10 md:py-20"
          >
            <Card className="p-6 md:p-12 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-0 shadow-xl rounded-2xl max-w-2xl mx-auto">
              <div className="relative inline-block mb-4 md:mb-6">
                <div className="absolute inset-0 bg-blue-400 rounded-full blur-2xl opacity-20 animate-pulse"></div>
                <FaRoute className="relative h-16 w-16 md:h-20 md:w-20 text-blue-500 dark:text-blue-400" />
              </div>
              <h3 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white mb-2 md:mb-3">
                {searchQuery || filter !== "all"
                  ? "No trips found"
                  : "No trips yet"}
              </h3>
              <p className="text-sm md:text-base text-gray-600 dark:text-gray-300 mb-6 md:mb-8 max-w-md mx-auto">
                {searchQuery || filter !== "all"
                  ? "Try adjusting your filters or search query"
                  : "Start planning your first adventure with AI assistance"}
              </p>
              {!searchQuery && filter === "all" && (
                <motion.div
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Link to="/trip-planner" className="block w-full">
                    <Button className="w-full md:w-auto bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 hover:from-blue-700 hover:via-purple-700 hover:to-pink-700 text-white font-bold px-6 md:px-8 py-3 rounded-xl shadow-xl flex items-center justify-center">
                      <FaPlus className="mr-2" />
                      Plan Your First Trip
                    </Button>
                  </Link>
                </motion.div>
              )}
            </Card>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default Trips;

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
// Clustering temporarily disabled until dependency installed
// import MarkerClusterGroup from "react-leaflet-cluster";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { toast } from "react-hot-toast";
import { mapsAPI } from "../services/api";
import {
  FaMapMarkedAlt,
  FaLocationArrow,
  FaSearch,
  FaStar,
  FaBookmark,
  FaTrash,
  FaMapPin,
  FaHeart,
} from "react-icons/fa";
import { LoadingSpinner } from "../components/ui";

// Fix default icon paths for Leaflet in bundlers
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: require("leaflet/dist/images/marker-icon-2x.png"),
  iconUrl: require("leaflet/dist/images/marker-icon.png"),
  shadowUrl: require("leaflet/dist/images/marker-shadow.png"),
});

const defaultCenter = { lat: 28.6139, lng: 77.209 }; // Delhi

const Recenter = ({ center }) => {
  const map = useMap();
  useEffect(() => {
    if (center) map.setView(center, 14);
  }, [center, map]);
  return null;
};

const Maps = () => {
  const [center, setCenter] = useState(defaultCenter);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [places, setPlaces] = useState([]);
  const [savedLocations, setSavedLocations] = useState([]);
  const [selectedPlace, setSelectedPlace] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [radiusKm, setRadiusKm] = useState(5);
  const [sortBy, setSortBy] = useState("distance");
  const [error, setError] = useState(null);
  const [placeType, setPlaceType] = useState("tourist_attraction");
  const [loading, setLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeTab, setActiveTab] = useState("nearby");

  // Get user's current location
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const userLocation = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          };
          setCurrentLocation(userLocation);
          setCenter(userLocation);
          toast.success("Location detected");
        },
        () => toast("Using default location", { icon: "ℹ️" }),
        { enableHighAccuracy: true }
      );
    }
  }, []);

  // Fetch nearby places when location/type/radius or sort changes
  useEffect(() => {
    if (currentLocation) {
      fetchNearbyPlaces();
      fetchSavedLocations();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentLocation, placeType, radiusKm, sortBy]);

  const haversineKm = (lat1, lon1, lat2, lon2) => {
    const toRad = (d) => (d * Math.PI) / 180;
    const R = 6371;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(lat1)) *
        Math.cos(toRad(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const fetchNearbyPlaces = async () => {
    try {
      setLoading(true);
      setError(null);
      const { data } = await mapsAPI.getNearbyPlaces({
        lat: currentLocation.lat,
        lng: currentLocation.lng,
        type: placeType,
        radius: Math.max(500, Math.floor(radiusKm * 1000)),
      });
      if (data.success) {
        const list = (data.data.places || []).map((p) => ({
          ...p,
          _distanceKm: haversineKm(
            currentLocation.lat,
            currentLocation.lng,
            p.geometry.location.lat,
            p.geometry.location.lng
          ),
        }));
        const sorted =
          sortBy === "distance"
            ? list.sort((a, b) => a._distanceKm - b._distanceKm)
            : list.sort((a, b) => a.name.localeCompare(b.name));
        setPlaces(sorted);
      } else {
        setPlaces([]);
      }
    } catch (e) {
      console.error(e);
      setError("Failed to load nearby places.");
    } finally {
      setLoading(false);
    }
  };

  const fetchSavedLocations = async () => {
    try {
      const res = await mapsAPI.getSavedLocations();
      if (res.data.success) {
        setSavedLocations(
          res.data.data?.savedDestinations || res.data.savedDestinations || []
        );
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    try {
      setLoading(true);
      const res = await mapsAPI.geocodeAddress({ address: searchQuery });
      const loc = res.data?.result?.location;
      if (loc) {
        setCenter(loc);
        setCurrentLocation(loc);
        toast.success("Location found");
      } else {
        toast.error("Location not found");
      }
    } catch (e) {
      console.error(e);
      toast.error("Search failed");
    } finally {
      setLoading(false);
    }
  };

  // Directions removed per user request

  const saveLocation = async (lat, lng, suggestedName) => {
    try {
      // Duplicate check within 100m
      const isDuplicate = savedLocations.some((loc) => {
        const d = haversineKm(
          lat,
          lng,
          loc.coordinates.lat,
          loc.coordinates.lng
        );
        return d <= 0.1; // 100 meters
      });
      if (isDuplicate) {
        toast("This location (or very close) is already saved.", {
          icon: "ℹ️",
        });
        return;
      }

      // Ask for a friendly name
      let name = window.prompt(
        "Save location as:",
        suggestedName || "Saved place"
      );
      if (!name || !name.trim()) return;
      name = name.trim();

      // Get human-readable address via free reverse geocode to avoid Google
      let address = `${lat}, ${lng}`;
      try {
        const rev = await mapsAPI.reverseGeocode({ lat, lng });
        address = rev.data?.result?.formatted_address || address;
      } catch {}
      const response = await mapsAPI.saveLocation({ name, lat, lng, address });
      if (response.data.success) {
        toast.success("Location saved");
        fetchSavedLocations();
      }
    } catch (error) {
      console.error("Save location error:", error);
      toast.error(error.response?.data?.message || "Failed to save location");
    }
  };

  const deleteLocation = async (id) => {
    try {
      const response = await mapsAPI.deleteSavedLocation(id);
      if (response.data.success) {
        toast.success("Location removed");
        fetchSavedLocations();
      }
    } catch (error) {
      console.error("Delete location error:", error);
      toast.error("Failed to remove location");
    }
  };

  // Directions removed - no polyline

  return (
    <div
      className="flex flex-col bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-gray-900 dark:via-slate-950 dark:to-gray-900"
      style={{ height: "calc(100vh - 64px)" }}
    >
      {/* Main Content */}
      <div className="flex-1 relative overflow-hidden">
        {/* Enhanced Sidebar */}
        <AnimatePresence>
          {sidebarOpen && (
            <motion.div
              initial={{ x: "-100%", opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: "-100%", opacity: 0 }}
              transition={{ type: "spring", damping: 20 }}
              className="absolute top-0 left-0 h-full z-30 w-full md:w-96 bg-white/95 dark:bg-gray-800/95 backdrop-blur-xl border-r border-gray-200/50 dark:border-gray-700/50 shadow-2xl overflow-y-auto"
            >
              {/* Enhanced Tabs */}
              <div className="flex gap-2 p-2 md:p-4 bg-gradient-to-r from-blue-50/80 via-purple-50/80 to-pink-50/80 dark:from-gray-800 dark:to-gray-800 border-b border-gray-200/50 dark:border-gray-700/50">
                {[
                  { id: "nearby", label: "Nearby", icon: FaMapPin },
                  { id: "saved", label: "Saved", icon: FaHeart },
                ].map((tab) => (
                  <motion.button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.97 }}
                    className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 md:px-6 md:py-3 text-sm font-bold rounded-2xl transition-all ${
                      activeTab === tab.id
                        ? "bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg shadow-blue-500/30"
                        : "text-gray-600 dark:text-gray-400 hover:bg-white dark:hover:bg-gray-700/70 shadow-sm"
                    }`}
                  >
                    <tab.icon className="h-5 w-5" />
                    <span>{tab.label}</span>
                  </motion.button>
                ))}
              </div>

              {/* Enhanced Nearby Places Tab */}
              {activeTab === "nearby" && (
                <div className="p-3 space-y-3 md:p-6 md:space-y-6">
                  <div>
                    <label className="flex items-center gap-2 text-sm font-bold text-gray-700 dark:text-gray-300 mb-3">
                      <FaMapPin className="h-4 w-4 text-blue-600" />
                      Place Type
                    </label>
                    <select
                      value={placeType}
                      onChange={(e) => setPlaceType(e.target.value)}
                      className="w-full px-3 py-2 md:px-4 md:py-3 border-2 border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 rounded-2xl focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 shadow-sm text-gray-900 dark:text-white font-semibold transition-all cursor-pointer"
                    >
                      <option value="tourist_attraction">
                        Tourist Attractions
                      </option>
                      <option value="restaurant">Restaurants</option>
                      <option value="lodging">Hotels</option>
                      <option value="museum">Museums</option>
                      <option value="park">Parks</option>
                      <option value="shopping_mall">Shopping</option>
                      <option value="cafe">Cafes</option>
                      <option value="hospital">Hospitals</option>
                      <option value="pharmacy">Pharmacies</option>
                    </select>
                  </div>

                  {/* Enhanced Radius and Sorting Controls */}
                  <div className="grid grid-cols-1 gap-6">
                    <div className="bg-gradient-to-br from-blue-50 to-purple-50 dark:from-gray-700 dark:to-gray-700 p-3 md:p-4 rounded-2xl">
                      <label className="flex items-center justify-between text-sm font-bold text-gray-700 dark:text-gray-300 mb-2 md:mb-3">
                        <span>Search Radius</span>
                        <span className="px-3 py-1 bg-blue-600 text-white rounded-full text-xs font-bold">
                          {radiusKm} km
                        </span>
                      </label>
                      <input
                        type="range"
                        min="1"
                        max="15"
                        step="1"
                        value={radiusKm}
                        onChange={(e) =>
                          setRadiusKm(parseInt(e.target.value, 10))
                        }
                        className="w-full h-2 rounded-full accent-blue-600 cursor-pointer"
                      />
                      <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-2">
                        <span>1 km</span>
                        <span>15 km</span>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-3">
                        Sort By
                      </label>
                      <select
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value)}
                        className="w-full px-3 py-2 md:px-4 md:py-3 border-2 border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 rounded-2xl focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 shadow-sm text-gray-900 dark:text-white font-semibold transition-all cursor-pointer"
                      >
                        <option value="distance">Distance</option>
                        <option value="name">Name</option>
                      </select>
                    </div>
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={fetchNearbyPlaces}
                      disabled={loading}
                      className="w-full bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 hover:from-blue-700 hover:via-purple-700 hover:to-pink-700 text-white font-bold px-6 py-4 rounded-2xl shadow-lg hover:shadow-2xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      <FaMapMarkedAlt className="h-5 w-5" />
                      {loading ? "Loading..." : "Refresh Nearby"}
                    </motion.button>
                  </div>

                  {error && (
                    <div className="mb-4 p-3 bg-red-50 text-red-700 rounded border border-red-200 dark:bg-red-900/20 dark:text-red-300 dark:border-red-800">
                      {error}
                    </div>
                  )}

                  {loading && (
                    <div className="flex justify-center py-8">
                      <LoadingSpinner />
                    </div>
                  )}

                  <div className="space-y-3 md:space-y-4">
                    {places.map((place, index) => (
                      <motion.div
                        key={place.place_id || index}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05, type: "spring" }}
                        whileHover={{
                          scale: 1.03,
                          y: -4,
                          boxShadow: "0 20px 40px rgba(0,0,0,0.1)",
                        }}
                        className="bg-white dark:bg-gray-700 rounded-2xl p-3 md:p-5 border-2 border-gray-100 dark:border-gray-600 shadow-md hover:shadow-2xl transition-all group"
                        onClick={() => {
                          setSelectedPlace(place);
                          setCenter({
                            lat: place.geometry.location.lat,
                            lng: place.geometry.location.lng,
                          });
                        }}
                      >
                        <div className="flex items-start gap-3">
                          <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                            <FaMapPin className="h-6 w-6 text-white" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-bold text-gray-900 dark:text-white text-base mb-1 line-clamp-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                              {place.name}
                            </h3>
                            <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2 mb-2">
                              {place.vicinity}
                            </p>
                            <div className="flex items-center gap-3 flex-wrap">
                              {place.rating && (
                                <div className="flex items-center gap-1 bg-yellow-50 dark:bg-yellow-900/20 px-2 py-1 rounded-lg">
                                  <FaStar className="h-4 w-4 text-yellow-500" />
                                  <span className="text-sm font-bold text-gray-900 dark:text-white">
                                    {place.rating}
                                  </span>
                                </div>
                              )}
                              {typeof place._distanceKm === "number" && (
                                <span className="text-xs font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 px-2 py-1 rounded-lg">
                                  {place._distanceKm.toFixed(2)} km away
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <motion.button
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={(e) => {
                            e.stopPropagation();
                            saveLocation(
                              place.geometry.location.lat,
                              place.geometry.location.lng,
                              place.name
                            );
                          }}
                          className="mt-3 w-full text-sm bg-gradient-to-r from-blue-600 to-purple-600 text-white px-4 py-2.5 rounded-xl hover:shadow-lg flex items-center justify-center gap-2 font-bold transition-all"
                        >
                          <FaBookmark className="h-4 w-4" />
                          Save Location
                        </motion.button>
                      </motion.div>
                    ))}
                  </div>
                </div>
              )}

              {/* Enhanced Saved Locations Tab */}
              {activeTab === "saved" && (
                <div className="p-3 md:p-6">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="p-3 bg-gradient-to-br from-pink-600 to-purple-600 rounded-xl shadow-lg">
                      <FaHeart className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-900 dark:text-white text-xl md:text-2xl">
                        Saved Locations
                      </h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {savedLocations.length} saved places
                      </p>
                    </div>
                  </div>
                  {savedLocations.length === 0 ? (
                    <div className="text-center py-6 md:py-12 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-800 rounded-2xl border-2 border-dashed border-gray-300 dark:border-gray-600">
                      <FaHeart className="h-12 w-12 md:h-16 md:w-16 mx-auto mb-3 md:mb-4 text-gray-300 dark:text-gray-600" />
                      <p className="text-gray-500 dark:text-gray-400 font-semibold">
                        No saved locations yet
                      </p>
                      <p className="text-sm text-gray-400 dark:text-gray-500 mt-2">
                        Save places from the Nearby tab
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3 md:space-y-4">
                      {savedLocations.map((location) => (
                        <motion.div
                          key={location._id}
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          whileHover={{ scale: 1.02 }}
                          className="bg-white dark:bg-gray-700 rounded-2xl p-3 md:p-5 border-2 border-gray-100 dark:border-gray-600 shadow-md hover:shadow-2xl transition-all group"
                        >
                          <div className="flex justify-between items-start gap-3">
                            <div
                              className="flex-1 cursor-pointer"
                              onClick={() =>
                                setCenter({
                                  lat: location.coordinates.lat,
                                  lng: location.coordinates.lng,
                                })
                              }
                            >
                              <div className="flex items-center gap-3 mb-0 md:mb-2">
                                <div className="w-8 h-8 md:w-10 md:h-10 bg-gradient-to-br from-pink-600 to-purple-600 rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                                  <FaHeart className="h-3.5 w-3.5 md:h-5 md:w-5 text-white" />
                                </div>
                                <h4 className="font-bold text-gray-900 dark:text-white text-sm md:text-base flex-1 line-clamp-2 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
                                  {location.name}
                                </h4>
                              </div>
                              {location.address && (
                                <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2 ml-13">
                                  {location.address}
                                </p>
                              )}
                            </div>
                            <motion.button
                              whileHover={{ scale: 1.02 }}
                              whileTap={{ scale: 0.9 }}
                              onClick={() => deleteLocation(location._id)}
                              className="p-3 text-red-600 hover:text-white hover:bg-red-600 rounded-xl transition-all"
                              title="Delete location"
                            >
                              <FaTrash className="h-4 w-4" />
                            </motion.button>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Enhanced Toggle Sidebar Button */}
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.9 }}
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className={`absolute ${
            sidebarOpen ? "left-0 md:left-96" : "left-0"
          } top-1/2 transform -translate-y-1/2 z-40 bg-black/40 backdrop-blur-md border-r border-y border-white/20 md:border-0 md:bg-gradient-to-r md:from-blue-600 md:to-purple-600 text-white px-2 py-4 md:py-6 rounded-r-2xl shadow-2xl hover:shadow-blue-500/50 font-bold transition-all duration-300`}
        >
          {sidebarOpen ? "◀" : "▶"}
        </motion.button>

        {/* Map Container */}
        <div className="absolute inset-0 w-full h-full z-0">
          {/* Mobile-Optimized Search & Controls */}
          <div className="absolute top-4 left-4 right-4 md:left-auto md:right-4 md:w-80 z-[1000] pointer-events-auto">
            <motion.div
              initial={{ y: -50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.4 }}
              className="md:bg-white/95 md:dark:bg-gray-800/95 md:backdrop-blur-xl md:rounded-2xl md:shadow-2xl md:border md:border-gray-200/50 md:dark:border-gray-700/50 md:p-4"
            >
              {/* Search Bar with Integrated Button */}
              <form onSubmit={handleSearch} className="relative shadow-lg md:shadow-none rounded-xl">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search for places..."
                  className="w-full h-11 pl-4 pr-12 bg-white md:bg-gray-50 dark:bg-gray-800 md:dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-sm text-gray-900 dark:text-white placeholder-gray-400 transition-all text-sm"
                />
                <button
                  type="submit"
                  disabled={loading || !searchQuery.trim()}
                  className="absolute right-1 top-1 bottom-1 w-9 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-lg shadow-sm hover:shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center p-0"
                >
                  <FaSearch className="h-3.5 w-3.5" />
                </button>
              </form>

              {/* Desktop Location Button */}
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => currentLocation && setCenter(currentLocation)}
                className="hidden md:flex w-full h-11 mt-3 bg-gradient-to-br from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white rounded-xl hover:shadow-lg transition-all shadow-md items-center justify-center gap-2 font-semibold text-sm"
                title="My Location"
              >
                <FaLocationArrow className="h-4 w-4" />
                Go to My Location
              </motion.button>
            </motion.div>
          </div>

          {/* Mobile Bottom-Right Location FAB */}
          <motion.button
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => currentLocation && setCenter(currentLocation)}
            className="absolute bottom-24 right-4 z-[1000] md:hidden w-12 h-12 bg-gradient-to-br from-indigo-600 to-blue-600 text-white rounded-full shadow-lg hover:shadow-xl flex items-center justify-center pointer-events-auto"
            title="My Location"
          >
            <FaLocationArrow className="h-5 w-5" />
          </motion.button>

          <MapContainer
            center={center}
            zoom={14}
            style={{ width: "100%", height: "100%" }}
          >
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution="&copy; OpenStreetMap contributors"
            />
            <Recenter center={center} />

            {/* Current Location Marker */}
            {currentLocation && (
              <Marker position={currentLocation}>
                <Popup>Your Location</Popup>
              </Marker>
            )}

            {/* Place Markers */}
            {places.map((place, index) => (
              <Marker
                key={place.place_id || index}
                position={{
                  lat: place.geometry.location.lat,
                  lng: place.geometry.location.lng,
                }}
                eventHandlers={{ click: () => setSelectedPlace(place) }}
              >
                <Popup>
                  <div className="p-1">
                    <h3 className="font-semibold text-gray-900">
                      {place.name}
                    </h3>
                    <p className="text-sm text-gray-600">{place.vicinity}</p>
                    {typeof place._distanceKm === "number" && (
                      <p className="text-xs text-gray-600 mt-1">
                        {place._distanceKm.toFixed(2)} km away
                      </p>
                    )}
                  </div>
                </Popup>
              </Marker>
            ))}

            {/* Saved Location Markers */}
            {savedLocations.map((loc) => (
              <Marker
                key={loc._id}
                position={{
                  lat: loc.coordinates.lat,
                  lng: loc.coordinates.lng,
                }}
              >
                <Popup>{loc.name}</Popup>
              </Marker>
            ))}

            {/* Directions removed - no polyline */}
          </MapContainer>
        </div>
      </div>
    </div>
  );
};

export default Maps;

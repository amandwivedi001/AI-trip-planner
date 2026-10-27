import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "react-hot-toast";
import { useAuth } from "../contexts/AuthContext";
import { useNotifications } from "../contexts/NotificationContext";
import { useApiMutation, useApi } from "../hooks/useApi";
import { useFormValidation } from "../hooks/useFormValidation";
import { Button, Input, Card, LoadingSpinner } from "../components/ui";
import { aiAPI, tripAPI } from "../services/api";
import TripResultCard from "../components/trip/TripResultCard";
import TripDetailView from "../components/trip/TripDetailView";
import { useSearchParams, useNavigate } from "react-router-dom";
import {
  FaPlane,
  FaMapMarkedAlt,
  FaCalendarAlt,
  FaUsers,
  FaDollarSign,
  FaRocket,
  FaHeart,
  FaMountain,
  FaCity,
  FaUmbrellaBeach,
  FaTree,
  FaUtensils,
  FaMusic,
  FaCamera,
  FaMagic,
  FaCheckCircle,
  FaArrowRight,
  FaArrowLeft,
  FaSpinner,
  FaSave,
} from "react-icons/fa";

const TripPlanner = () => {
  const { user, getRemainingAiRequests } = useAuth();
  const notifications = useNotifications();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const editTripId = searchParams.get("edit");

  const [currentStep, setCurrentStep] = useState(1);
  const [generatedItinerary, setGeneratedItinerary] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [showDetailView, setShowDetailView] = useState(false);

  const { values, errors, handleChange, handleBlur, isValid, setValues } =
    useFormValidation(
      {
        destination: "",
        startDate: "",
        endDate: "",
        travelers: 2,
        budget: "",
        interests: [],
        travelStyle: "",
        accommodationType: "",
        transportation: "",
        specialRequests: "",
      },
      {
        destination: { required: true, minLength: 3 },
        startDate: { required: true },
        endDate: { required: true },
        travelers: { required: true },
        budget: { required: true },
        travelStyle: { required: true },
      }
    );

  // Load trip data for editing
  const { data: editTrip } = useApi(
    ["trip", editTripId],
    () => tripAPI.getTripById(editTripId).then((res) => res.data.trip),
    { enabled: !!editTripId }
  );

  // Autofill form when editing
  useEffect(() => {
    if (editTrip) {
      const destination =
        editTrip.destination?.city || editTrip.destination || "";
      const startDate = editTrip.startDate
        ? new Date(editTrip.startDate).toISOString().split("T")[0]
        : "";
      const endDate = editTrip.endDate
        ? new Date(editTrip.endDate).toISOString().split("T")[0]
        : "";

      setValues({
        destination: destination,
        startDate: startDate,
        endDate: endDate,
        travelers: editTrip.preferences?.groupSize || editTrip.groupSize || 2,
        budget:
          editTrip.preferences?.budget?.max?.toString() ||
          editTrip.budget?.max?.toString() ||
          "",
        interests: editTrip.preferences?.interests || [],
        travelStyle: editTrip.preferences?.travelStyle || "",
        accommodationType: editTrip.preferences?.accommodation || "",
        transportation: Array.isArray(editTrip.preferences?.transport)
          ? editTrip.preferences.transport[0]
          : "",
        specialRequests: editTrip.specialRequests || "",
      });

      toast.success("Trip loaded for editing!");
    }
  }, [editTrip, setValues]);

  const generateItinerary = useApiMutation(aiAPI.generateItinerary, {
    onSuccess: (response) => {
      console.log("API Response:", response);
      console.log("Itinerary Data:", response.data);
      // The actual itinerary is in response.data.data
      const itinerary = response.data.data;
      console.log("Actual Itinerary:", itinerary);
      setGeneratedItinerary(itinerary);
      setCurrentStep(4);
      toast.success("Your AI-powered itinerary is ready!");
    },
    onError: (error) => {
      console.error("Full error:", error);
      toast.error(
        error.response?.data?.message ||
          "Failed to generate itinerary. Please try again."
      );
      console.error("Generation error:", error);
    },
  });

  const remainingRequests = getRemainingAiRequests();

  const interestOptions = [
    { id: "culture", label: "Culture & History", icon: FaCity },
    { id: "nature", label: "Nature & Wildlife", icon: FaTree },
    { id: "adventure", label: "Adventure Sports", icon: FaMountain },
    { id: "beach", label: "Beach & Relaxation", icon: FaUmbrellaBeach },
    { id: "food", label: "Food & Cuisine", icon: FaUtensils },
    { id: "nightlife", label: "Nightlife & Music", icon: FaMusic },
    { id: "photography", label: "Photography", icon: FaCamera },
    { id: "wellness", label: "Wellness & Spa", icon: FaHeart },
  ];

  const travelStyles = [
    { id: "luxury", label: "Luxury", description: "High-end experiences" },
    { id: "mid-range", label: "Mid-Range", description: "Comfortable travel" },
    { id: "budget", label: "Budget", description: "Cost-effective options" },
    { id: "adventure", label: "Adventure", description: "Off-the-beaten-path" },
  ];

  const accommodationTypes = [
    { id: "hotel", label: "Hotels" },
    { id: "resort", label: "Resorts" },
    { id: "airbnb", label: "Vacation Rentals" },
    { id: "hostel", label: "Hostels" },
    { id: "boutique", label: "Boutique Hotels" },
  ];

  const transportationOptions = [
    { id: "flight", label: "Flight" },
    { id: "train", label: "Train" },
    { id: "car", label: "Car Rental" },
    { id: "bus", label: "Bus" },
    { id: "mixed", label: "Mixed Options" },
  ];

  const handleInterestChange = (interestId) => {
    const currentInterests = values.interests || [];
    const newInterests = currentInterests.includes(interestId)
      ? currentInterests.filter((id) => id !== interestId)
      : [...currentInterests, interestId];

    setValues((prev) => ({ ...prev, interests: newInterests }));
  };

  const handleGenerateItinerary = async () => {
    if (!isValid) {
      toast.error("Please fill in all required fields.");
      return;
    }

    setIsGenerating(true);
    try {
      // Calculate duration in days
      const start = new Date(values.startDate);
      const end = new Date(values.endDate);
      const duration = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;

      // Map budget to numeric range
      const budgetRanges = {
        budget: { min: 8000, max: 80000 },
        "mid-range": { min: 80000, max: 240000 },
        luxury: { min: 240000, max: 800000 },
      };

      const budgetRange = budgetRanges[values.budget] || {
        min: 40000,
        max: 160000,
      };

      // Prepare data for AI itinerary generation
      const itineraryData = {
        destination: values.destination,
        duration,
        startDate: values.startDate,
        endDate: values.endDate,
        budget: {
          min: budgetRange.min,
          max: budgetRange.max,
          currency: "INR",
        },
        travelStyle: values.travelStyle || "mid-range",
        interests: values.interests || [],
        groupSize: parseInt(values.travelers) || 1,
        accommodation: values.accommodationType || "hotel",
        transport: values.transportation
          ? [values.transportation]
          : ["flexible"],
        specialRequests: values.specialRequests || "",
      };

      await generateItinerary.mutateAsync(itineraryData);
    } catch (error) {
      console.error("Error generating itinerary:", error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSaveDraft = async () => {
    if (!isValid) {
      toast.error("Please fill in all required fields.");
      return;
    }

    setIsSavingDraft(true);
    try {
      // Calculate duration in days
      const start = new Date(values.startDate);
      const end = new Date(values.endDate);
      const duration = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;

      // Map budget to numeric range
      const budgetRanges = {
        budget: { min: 8000, max: 80000 },
        "mid-range": { min: 80000, max: 240000 },
        luxury: { min: 240000, max: 800000 },
      };

      const budgetRange = budgetRanges[values.budget] || {
        min: 40000,
        max: 160000,
      };

      // Prepare trip data for saving as draft
      const tripData = {
        title: `Trip to ${values.destination}`,
        destination: {
          city: values.destination.split(",")[0].trim(),
          country:
            values.destination.split(",")[1]?.trim() || values.destination,
        },
        startDate: values.startDate,
        endDate: values.endDate,
        preferences: {
          duration,
          budget: {
            min: budgetRange.min,
            max: budgetRange.max,
            currency: "INR",
          },
          travelStyle: values.travelStyle || "mid-range",
          interests: values.interests || [],
          groupSize: parseInt(values.travelers) || 1,
          accommodation: values.accommodationType || "hotel",
          transport: values.transportation
            ? [values.transportation]
            : ["flexible"],
        },
        notes: values.specialRequests || "",
        status: "draft", // Save as draft status
      };

      // Save trip draft
      const response = await tripAPI.createTrip(tripData);

      if (response.data.success) {
        toast.success(
          "Trip draft saved successfully! You can view it in My Trips."
        );
        // Redirect to trips page after a short delay
        setTimeout(() => {
          navigate("/trips");
        }, 2000);
      }
    } catch (error) {
      console.error("Error saving trip draft:", error);
      toast.error(
        error.response?.data?.message ||
          "Failed to save trip draft. Please try again."
      );
    } finally {
      setIsSavingDraft(false);
    }
  };

  const nextStep = () => {
    if (currentStep < 3) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const stepTitles = [
    "Destination & Dates",
    "Travel Preferences",
    "Generate Itinerary",
    "Your Itinerary",
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 dark:from-gray-900 dark:via-blue-950/50 dark:to-gray-900 py-2 md:py-6">
      <div className="max-w-4xl mx-auto px-3 py-2 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-4 md:mb-6"
        >
          <div className="bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 rounded-xl md:rounded-2xl p-3 md:p-6 shadow-xl text-white mb-4 md:mb-6">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 200 }}
              className="flex justify-center mb-2 md:mb-3"
            >
              <div className="p-3 md:p-4 bg-white/20 backdrop-blur-sm rounded-xl md:rounded-2xl">
                <FaMagic className="h-6 w-6 md:h-10 md:w-10" />
              </div>
            </motion.div>
            <h1 className="text-2xl md:text-3xl font-bold mb-1 md:mb-2">AI Trip Planner</h1>
            <p className="text-blue-100 text-sm md:text-lg">
              Let our AI create the perfect itinerary for your next adventure
            </p>
            {remainingRequests !== -1 && (
              <div className="mt-2 md:mt-3 inline-flex items-center px-3 md:px-4 py-1.5 md:py-2 bg-white/20 backdrop-blur-sm rounded-lg md:rounded-xl text-xs md:text-sm font-semibold">
                <FaRocket className="mr-2" />
                {remainingRequests} AI requests remaining
              </div>
            )}
          </div>
        </motion.div>

        {/* Progress Steps */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="mb-4 md:mb-6"
        >
          <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-xl md:rounded-2xl p-3 md:p-5 shadow-lg">
            {/* Mobile View: Clean Progress Design */}
            <div className="md:hidden">
              <div className="flex items-end justify-between mb-3">
                <div>
                  <div className="flex items-center space-x-2 mb-1">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-100 text-[10px] font-bold text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
                      {currentStep}
                    </span>
                    <span className="text-xs font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wider">
                      Step {currentStep} of 4
                    </span>
                  </div>
                  <h2 className="text-lg font-bold text-gray-900 dark:text-white leading-tight">
                    {stepTitles[currentStep - 1]}
                  </h2>
                </div>
                <div className="text-right">
                   {/* Optional: Add percentage or next step text implies progress */}
                </div>
              </div>
              <div className="h-2 w-full bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${(currentStep / 4) * 100}%` }}
                  transition={{ duration: 0.5, ease: "easeOut" }}
                  className="h-full bg-gradient-to-r from-blue-600 to-purple-600 rounded-full"
                />
              </div>
            </div>

            {/* Desktop View: Detailed Stepper */}
            <div className="hidden md:block">
              <div className="grid grid-cols-7 items-center gap-0 mb-4">
                {stepTitles.map((title, index) => {
                  const stepNumber = index + 1;
                  const isActive = currentStep === stepNumber;
                  const isCompleted = currentStep > stepNumber;

                  return (
                    <React.Fragment key={stepNumber}>
                      <motion.div
                        className={`flex flex-col items-center justify-center px-3 py-3 rounded-2xl border-2 transition-all duration-300 text-center col-span-1 min-h-[80px] ${
                          isActive || isCompleted
                            ? "border-transparent bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg"
                            : "border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-400"
                        }`}
                      >
                        <div className="flex items-center justify-center mb-1">
                          {isCompleted ? (
                            <FaCheckCircle className="h-5 w-5" />
                          ) : (
                            <span className="text-sm font-bold">
                              {stepNumber}
                            </span>
                          )}
                        </div>
                        <span
                          className={`text-xs font-semibold leading-tight ${
                            isActive || isCompleted
                              ? "text-white"
                              : "text-gray-500 dark:text-gray-400"
                          }`}
                        >
                          {title}
                        </span>
                      </motion.div>
                      {index < stepTitles.length - 1 && (
                        <div
                          className={`h-1 mx-2 rounded-full transition-all duration-300 col-span-1 ${
                            isCompleted
                              ? "bg-gradient-to-r from-blue-600 to-purple-600"
                              : "bg-gray-300 dark:bg-gray-600"
                          }`}
                        />
                      )}
                    </React.Fragment>
                  );
                })}
              </div>
              <div className="text-center">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                  {stepTitles[currentStep - 1]}
                </h2>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Step Content */}
        {currentStep < 4 && (
          <Card className="p-2 md:p-8 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-0 shadow-xl rounded-xl md:rounded-2xl">
            {/* Step 1: Destination & Dates */}
            {currentStep === 1 && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="space-y-6"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Input
                  name="destination"
                  label="Where do you want to go?"
                  placeholder="e.g., Tokyo, Japan"
                  icon={FaMapMarkedAlt}
                  value={values.destination}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  error={errors.destination}
                  required
                />

                <Input
                  name="travelers"
                  type="number"
                  min="1"
                  max="20"
                  label="Number of travelers"
                  icon={FaUsers}
                  value={values.travelers}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  error={errors.travelers}
                  required
                />

                <Input
                  name="startDate"
                  type="date"
                  label="Start date"
                  icon={FaCalendarAlt}
                  value={values.startDate}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  error={errors.startDate}
                  min={new Date().toISOString().split("T")[0]}
                  required
                />

                <Input
                  name="endDate"
                  type="date"
                  label="End date"
                  icon={FaCalendarAlt}
                  value={values.endDate}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  error={errors.endDate}
                  min={values.startDate}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Budget per person (INR)
                </label>
                <select
                  name="budget"
                  value={values.budget}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  required
                >
                  <option value="">Select your budget</option>
                  <option value="budget">Under ₹80,000 (Budget)</option>
                  <option value="mid-range">
                    ₹80,000 - ₹240,000 (Mid-range)
                  </option>
                  <option value="luxury">₹240,000+ (Luxury)</option>
                </select>
                {errors.budget && (
                  <p className="mt-1 text-sm text-red-600">{errors.budget}</p>
                )}
              </div>
            </motion.div>
          )}

          {/* Step 2: Travel Preferences */}
          {currentStep === 2 && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="space-y-4 md:space-y-8"
            >
              {/* Interests */}
              <div>
                <h3 className="text-lg md:text-xl font-bold text-gray-900 dark:text-white mb-3 md:mb-5">
                  What are your interests?
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-3">
                  {interestOptions.map((interest) => (
                    <motion.button
                      key={interest.id}
                      type="button"
                      onClick={() => handleInterestChange(interest.id)}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.95 }}
                      className={`p-3 md:p-4 rounded-xl border-2 transition-all duration-300 text-center min-h-[44px] ${
                        values.interests?.includes(interest.id)
                          ? "border-transparent bg-gradient-to-br from-blue-500 to-purple-500 text-white shadow-lg"
                          : "border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 hover:border-blue-400 dark:hover:border-blue-500 hover:shadow-md"
                      }`}
                    >
                      <interest.icon
                        className={`h-5 w-5 md:h-7 md:w-7 mx-auto mb-1 md:mb-2 ${
                          values.interests?.includes(interest.id)
                            ? "text-white"
                            : "text-gray-400"
                        }`}
                      />
                      <span className="text-[10px] md:text-xs font-semibold">
                        {interest.label}
                      </span>
                    </motion.button>
                  ))}
                </div>
              </div>

              {/* Travel Style */}
              <div>
                <h3 className="text-lg md:text-xl font-bold text-gray-900 dark:text-white mb-3 md:mb-5">
                  Travel Style
                </h3>
                <div className="grid grid-cols-2 gap-3 md:gap-4">
                  {travelStyles.map((style) => (
                    <motion.button
                      key={style.id}
                      type="button"
                      onClick={() =>
                        setValues((prev) => ({
                          ...prev,
                          travelStyle: style.id,
                        }))
                      }
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className={`p-2 md:p-5 rounded-xl border-2 transition-all duration-300 text-left min-h-[44px] ${
                        values.travelStyle === style.id
                          ? "border-transparent bg-gradient-to-br from-blue-500 to-purple-500 text-white shadow-lg"
                          : "border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 hover:border-blue-400 dark:hover:border-blue-500 hover:shadow-md"
                      }`}
                    >
                      <h4
                        className={`font-bold text-base md:text-lg mb-0.5 md:mb-1 ${
                          values.travelStyle === style.id
                            ? "text-white"
                            : "text-gray-900 dark:text-white"
                        }`}
                      >
                        {style.label}
                      </h4>
                      <p
                        className={`text-xs md:text-sm ${
                          values.travelStyle === style.id
                            ? "text-blue-100"
                            : "text-gray-500 dark:text-gray-400"
                        }`}
                      >
                        {style.description}
                      </p>
                    </motion.button>
                  ))}
                </div>
              </div>

              {/* Accommodation & Transportation */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Accommodation Type
                  </label>
                  <select
                    name="accommodationType"
                    value={values.accommodationType}
                    onChange={handleChange}
                    className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white min-h-[44px]"
                  >
                    <option value="">Any preference</option>
                    {accommodationTypes.map((type) => (
                      <option key={type.id} value={type.id}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Transportation
                  </label>
                  <select
                    name="transportation"
                    value={values.transportation}
                    onChange={handleChange}
                    className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white min-h-[44px]"
                  >
                    <option value="">Any preference</option>
                    {transportationOptions.map((transport) => (
                      <option key={transport.id} value={transport.id}>
                        {transport.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Special Requests */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Special Requests (Optional)
                </label>
                <textarea
                  name="specialRequests"
                  value={values.specialRequests}
                  onChange={handleChange}
                  placeholder="Any special requirements, accessibility needs, or specific preferences..."
                  rows={4}
                  className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                />
              </div>
            </motion.div>
          )}

          {/* Step 3: Generate Itinerary */}
          {currentStep === 3 && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="text-center space-y-6 md:space-y-8"
            >
              <div className="bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 dark:from-blue-900/20 dark:via-purple-900/20 dark:to-pink-900/20 p-3 md:p-8 rounded-2xl border border-gray-200/50 dark:border-gray-700/50">
                <motion.div
                  animate={{ rotate: [0, 360] }}
                  transition={{
                    duration: 20,
                    repeat: Infinity,
                    ease: "linear",
                  }}
                  className="inline-block"
                >
                  <div className="p-3 md:p-5 bg-gradient-to-br from-blue-500 to-purple-500 rounded-2xl shadow-xl">
                    <FaRocket className="h-8 w-8 md:h-12 md:w-12 text-white" />
                  </div>
                </motion.div>
                <h3 className="text-lg md:text-2xl font-bold text-gray-900 dark:text-white mb-3 md:mb-4">
                  Ready to Create Your Perfect Itinerary?
                </h3>
                <p className="text-xs md:text-base text-gray-600 dark:text-gray-400 max-w-2xl mx-auto mb-4 md:mb-6">
                  Our AI will analyze your preferences and create a personalized
                  itinerary with activities, restaurants, and accommodations
                  tailored just for you.
                </p>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-6 md:mb-8">
                  <div className="text-center">
                    <FaMapMarkedAlt className="h-5 w-5 md:h-6 md:w-6 mx-auto text-blue-600 mb-1 md:mb-2" />
                    <p className="text-xs md:text-sm font-medium">{values.destination}</p>
                  </div>
                  <div className="text-center">
                    <FaCalendarAlt className="h-5 w-5 md:h-6 md:w-6 mx-auto text-blue-600 mb-1 md:mb-2" />
                    <p className="text-xs md:text-sm font-medium">
                      {values.startDate && values.endDate
                        ? `${Math.ceil(
                            (new Date(values.endDate) -
                              new Date(values.startDate)) /
                              (1000 * 60 * 60 * 24)
                          )} days`
                        : "Duration"}
                    </p>
                  </div>
                  <div className="text-center">
                    <FaUsers className="h-5 w-5 md:h-6 md:w-6 mx-auto text-blue-600 mb-1 md:mb-2" />
                    <p className="text-xs md:text-sm font-medium">
                      {values.travelers} travelers
                    </p>
                  </div>
                  <div className="text-center">
                    <FaDollarSign className="h-5 w-5 md:h-6 md:w-6 mx-auto text-blue-600 mb-1 md:mb-2" />
                    <p className="text-xs md:text-sm font-medium capitalize">
                      {values.budget}
                    </p>
                  </div>
                </div>

                <motion.div
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.95 }}
                  className="inline-block w-full md:w-auto"
                >
                  <Button
                    onClick={handleGenerateItinerary}
                    disabled={isGenerating || !isValid}
                    loading={isGenerating}
                    size="lg"
                    className="w-full md:w-auto bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 hover:from-blue-700 hover:via-purple-700 hover:to-pink-700 text-white font-bold text-base md:text-lg px-4 py-3 md:px-8 md:py-4 rounded-xl shadow-xl hover:shadow-2xl transition-all min-h-[56px]"
                    icon={isGenerating ? FaSpinner : FaMagic}
                  >
                    {isGenerating
                      ? "AI is crafting..."
                      : "Generate AI Itinerary"}
                  </Button>
                </motion.div>

                {isGenerating && (
                  <div className="mt-4 text-center">
                    <div className="flex items-center justify-center space-x-2 text-blue-600">
                      <FaSpinner className="animate-spin" />
                      <p className="text-xs md:text-sm">
                        Please wait... AI is analyzing...
                      </p>
                    </div>
                  </div>
                )}

                {!isGenerating && (
                  <p className="mt-3 text-xs md:text-sm text-gray-500">
                    This will use 1 AI request from your monthly balance
                  </p>
                )}
              </div>
            </motion.div>
          )}


          {/* Navigation Buttons */}
          {currentStep < 4 && (
            <div className="flex justify-between mt-4 md:mt-8 gap-3 md:gap-4">
              <motion.div
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.95 }}
                className="flex-1"
              >
                <Button
                  variant="outline"
                  onClick={prevStep}
                  disabled={currentStep === 1}
                  className="w-full px-3 md:px-6 py-2.5 md:py-3 rounded-xl border-2 border-gray-300 dark:border-gray-600 hover:border-blue-500 dark:hover:border-blue-400 font-semibold text-sm md:text-base min-h-[44px] flex items-center justify-center"
                >
                  <FaArrowLeft className="mr-2 shrink-0" />
                  Previous
                </Button>
              </motion.div>

              <motion.div
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.95 }}
                className="flex-1"
              >
                <Button
                  onClick={currentStep === 3 ? handleSaveDraft : nextStep}
                  disabled={
                    (currentStep === 1 && !values.destination) ||
                    (currentStep === 3 && (isGenerating || isSavingDraft))
                  }
                  loading={currentStep === 3 && isSavingDraft}
                  className="w-full px-3 md:px-6 py-2.5 md:py-3 rounded-xl bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 hover:from-blue-700 hover:via-purple-700 hover:to-pink-700 text-white font-bold shadow-lg text-sm md:text-base min-h-[44px] flex items-center justify-center"
                >
                  <span className="truncate">
                    {currentStep === 3 ? (
                      <>
                        <span className="md:hidden">Save Draft</span>
                        <span className="hidden md:inline">Save as Draft</span>
                      </>
                    ) : (
                      "Next"
                    )}
                  </span>
                  {currentStep === 3 ? (
                    <FaSave className="ml-2 shrink-0" />
                  ) : (
                    <FaArrowRight className="ml-2 shrink-0" />
                  )}
                </Button>
              </motion.div>
            </div>
          )}
          </Card>
        )}

        {/* Step 4: Generated Itinerary - Outside Card wrapper */}
        {currentStep === 4 && generatedItinerary && (
          <TripResultCard
            itinerary={generatedItinerary}
            formValues={values}
            onViewDetails={() => setShowDetailView(true)}
          />
        )}
      </div>

      {/* Full Trip Detail Modal */}
      <AnimatePresence>
        {showDetailView && generatedItinerary && (
          <TripDetailView
            itinerary={generatedItinerary}
            formValues={values}
            onClose={() => setShowDetailView(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default TripPlanner;

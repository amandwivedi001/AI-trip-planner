import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";
import { useQueryClient } from "@tanstack/react-query";
import { tripAPI } from "../../services/api";
import {
  FaMapMarkerAlt,
  FaClock,
  FaDollarSign,
  FaUtensils,
  FaHotel,
  FaPlane,
  FaStar,
  FaInfoCircle,
  FaChevronDown,
  FaChevronUp,
  FaDownload,
  FaShare,
  FaTimes,
  FaPlus,
} from "react-icons/fa";

const TripDetailView = ({ itinerary, formValues, onClose }) => {
  const [expandedDays, setExpandedDays] = useState([0]); // First day expanded by default
  const [imageErrors, setImageErrors] = useState({});
  const [isAddingTrip, setIsAddingTrip] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const handleDownloadPDF = async () => {
    try {
      setIsDownloading(true);
      toast.loading("Generating PDF...", { id: "pdf-download" });

      // Dynamic import of jsPDF to reduce initial bundle size
      const { default: jsPDF } = await import("jspdf");
      const doc = new jsPDF();

      // PDF Styling
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      let yPos = 20;

      // Header with gradient-like effect
      doc.setFillColor(59, 130, 246); // Blue
      doc.rect(0, 0, pageWidth, 40, "F");

      doc.setTextColor(255, 255, 255);
      doc.setFontSize(24);
      doc.setFont(undefined, "bold");
      doc.text(
        itinerary.destination || formValues.destination,
        pageWidth / 2,
        20,
        { align: "center" }
      );

      doc.setFontSize(12);
      doc.setFont(undefined, "normal");
      doc.text(`${itinerary.duration} Days Trip Itinerary`, pageWidth / 2, 30, {
        align: "center",
      });

      yPos = 50;
      doc.setTextColor(0, 0, 0);

      // Trip Details
      doc.setFontSize(16);
      doc.setFont(undefined, "bold");
      doc.text("Trip Details", 15, yPos);
      yPos += 10;

      doc.setFontSize(11);
      doc.setFont(undefined, "normal");
      doc.text(`Travelers: ${formValues.travelers}`, 15, yPos);
      yPos += 7;
      doc.text(`Budget: ${formValues.budget}`, 15, yPos);
      yPos += 7;
      doc.text(
        `Total Cost: ${itinerary.totalEstimatedCost?.currency} ${
          itinerary.totalEstimatedCost?.amount || "N/A"
        }`,
        15,
        yPos
      );
      yPos += 15;

      // Daily Itinerary
      doc.setFontSize(16);
      doc.setFont(undefined, "bold");
      doc.text("Daily Itinerary", 15, yPos);
      yPos += 10;

      itinerary.itinerary?.forEach((day, index) => {
        if (yPos > pageHeight - 40) {
          doc.addPage();
          yPos = 20;
        }

        doc.setFontSize(13);
        doc.setFont(undefined, "bold");
        doc.setTextColor(59, 130, 246);
        doc.text(`Day ${day.day}: ${day.title || day.theme || ""}`, 15, yPos);
        yPos += 8;

        doc.setFontSize(10);
        doc.setFont(undefined, "normal");
        doc.setTextColor(0, 0, 0);

        day.activities?.forEach((activity, actIdx) => {
          if (yPos > pageHeight - 30) {
            doc.addPage();
            yPos = 20;
          }

          const activityText = `• ${activity.time || ""} ${
            activity.title || activity.activity || activity.name || ""
          }`;
          const lines = doc.splitTextToSize(activityText, pageWidth - 30);
          doc.text(lines, 20, yPos);
          yPos += lines.length * 5;

          if (activity.location?.name) {
            doc.setTextColor(100, 100, 100);
            doc.text(`  Location: ${activity.location.name}`, 25, yPos);
            yPos += 5;
            doc.setTextColor(0, 0, 0);
          }
        });

        yPos += 5;
      });

      // Save PDF
      const fileName = `${(
        itinerary.destination || formValues.destination
      ).replace(/\s+/g, "-")}-Trip-Itinerary.pdf`;
      doc.save(fileName);

      toast.success("PDF downloaded successfully!", { id: "pdf-download" });
    } catch (error) {
      console.error("Error downloading PDF:", error);
      toast.error("Failed to generate PDF. Please try again.", {
        id: "pdf-download",
      });
    } finally {
      setIsDownloading(false);
    }
  };

  const handleAddTrip = async () => {
    try {
      setIsAddingTrip(true);
      toast.loading("Adding trip...", { id: "add-trip" });

      // Parse destination to get city and country
      const destinationStr = itinerary.destination || formValues.destination;
      const destParts = destinationStr.split(",").map((s) => s.trim());
      const city = destParts[0] || destinationStr;
      const country = destParts[1] || destParts[0] || destinationStr;

      // Transform itinerary structure to match backend schema
      const validActivityTypes = [
        "attraction",
        "restaurant",
        "transport",
        "accommodation",
        "activity",
      ];

      const transformedDays =
        itinerary.itinerary?.map((day, index) => ({
          day: day.day || index + 1,
          date: new Date(
            new Date(formValues.startDate).getTime() +
              index * 24 * 60 * 60 * 1000
          ),
          title: day.title || "",
          theme: day.theme || "",
          activities:
            day.activities?.map((activity) => {
              // Validate activity type against backend enum
              const activityType = validActivityTypes.includes(activity.type)
                ? activity.type
                : "activity";

              return {
                time: activity.time || "",
                activity:
                  activity.title || activity.activity || activity.name || "",
                location: {
                  name: activity.location?.name || activity.location || "",
                  address: activity.location?.address || "",
                  coordinates: activity.location?.coordinates || {},
                },
                duration: activity.duration || 2,
                cost: {
                  amount: activity.cost?.amount || 0,
                  currency:
                    activity.cost?.currency ||
                    itinerary.totalEstimatedCost?.currency ||
                    "INR",
                },
                description: activity.description || "",
                type: activityType,
                bookingRequired: activity.bookingRequired || false,
              };
            }) || [],
          totalCost: {
            amount: day.totalCost?.amount || 0,
            currency:
              day.totalCost?.currency ||
              itinerary.totalEstimatedCost?.currency ||
              "INR",
          },
        })) || [];

      // Validate travelStyle and accommodation against backend enums
      const validTravelStyles = [
        "budget",
        "luxury",
        "adventure",
        "relaxation",
        "cultural",
      ];
      const validAccommodationTypes = [
        "hotel",
        "hostel",
        "apartment",
        "resort",
      ];
      const validTransportTypes = ["flight", "train", "bus", "car", "walking"];
      const validInterests = [
        "culture",
        "nature",
        "food",
        "adventure",
        "relaxation",
        "shopping",
        "history",
        "nightlife",
      ];

      const travelStyle = validTravelStyles.includes(formValues.travelStyle)
        ? formValues.travelStyle
        : "budget";

      const accommodation = validAccommodationTypes.includes(
        formValues.accommodationType
      )
        ? formValues.accommodationType
        : "hotel";

      const transport = validTransportTypes.includes(formValues.transportation)
        ? [formValues.transportation]
        : ["flight"];

      const interests = Array.isArray(formValues.interests)
        ? formValues.interests.filter((interest) =>
            validInterests.includes(interest)
          )
        : [];

      // Prepare trip data matching backend schema
      const tripData = {
        title: `Trip to ${city}`,
        description: `${itinerary.duration}-day trip to ${destinationStr}`,
        destination: {
          city: city,
          country: country,
          coordinates: {
            lat: 0,
            lng: 0,
          },
        },
        preferences: {
          budget: {
            min: itinerary.totalEstimatedCost?.amount || 0,
            max: itinerary.totalEstimatedCost?.amount || 0,
            currency: itinerary.totalEstimatedCost?.currency || "INR",
          },
          duration: parseInt(itinerary.duration) || 1,
          travelStyle: travelStyle,
          groupSize: parseInt(formValues.travelers) || 1,
          interests: interests,
          accommodation: accommodation,
          transport: transport,
        },
        itinerary: {
          generatedBy: "AI",
          generatedAt: new Date(),
          days: transformedDays,
          totalCost: {
            amount: itinerary.totalEstimatedCost?.amount || 0,
            currency: itinerary.totalEstimatedCost?.currency || "INR",
          },
          summary:
            itinerary.recommendations?.summary ||
            `Amazing ${itinerary.duration}-day adventure in ${destinationStr}`,
        },
        startDate: formValues.startDate,
        endDate: formValues.endDate,
        // Don't send status - let backend auto-determine based on itinerary
        notes: formValues.specialRequests || "",
        isPublic: false,
        tags: [city.toLowerCase(), country.toLowerCase(), travelStyle],
        recommendations: {
          weather: {
            forecast:
              itinerary.recommendations?.weather || "Check local forecast",
            bestTime:
              itinerary.recommendations?.bestTimeToVisit || "Year-round",
          },
          localTips: itinerary.recommendations?.localTips || [],
          mustSee: itinerary.recommendations?.highlights || [],
          budgetTips: itinerary.recommendations?.budgetTips || [],
          safetyTips: itinerary.recommendations?.safetyTips || [],
        },
      };

      console.log("Sending trip data:", tripData);
      const response = await tripAPI.createTrip(tripData);
      console.log("Response:", response);

      if (response.data.success || response.data.trip) {
        toast.success("Trip added successfully!", { id: "add-trip" });
        // Invalidate trips cache to refresh the trips list
        queryClient.invalidateQueries({ queryKey: ["trips"] });
        onClose();
        setTimeout(() => {
          navigate("/trips");
        }, 500);
      } else {
        throw new Error(response.data.message || "Failed to add trip");
      }
    } catch (error) {
      console.error("Error adding trip:", error);
      console.error("Error details:", error.response?.data);
      const errorMessage =
        error.response?.data?.message || error.message || "Failed to add trip";
      toast.error(errorMessage, { id: "add-trip" });
    } finally {
      setIsAddingTrip(false);
    }
  };

  // Comprehensive list of activity images for different types
  const activityImages = {
    // Transportation
    airport:
      "https://images.pexels.com/photos/358319/pexels-photo-358319.jpeg?auto=compress&cs=tinysrgb&w=400&h=300&fit=crop",
    plane:
      "https://images.pexels.com/photos/358319/pexels-photo-358319.jpeg?auto=compress&cs=tinysrgb&w=400&h=300&fit=crop",
    train:
      "https://images.pexels.com/photos/3935702/pexels-photo-3935702.jpeg?auto=compress&cs=tinysrgb&w=400&h=300&fit=crop",
    bus: "https://images.pexels.com/photos/2199293/pexels-photo-2199293.jpeg?auto=compress&cs=tinysrgb&w=400&h=300&fit=crop",
    taxi: "https://images.pexels.com/photos/415708/pexels-photo-415708.jpeg?auto=compress&cs=tinysrgb&w=400&h=300&fit=crop",

    // Dining
    dinner:
      "https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg?auto=compress&cs=tinysrgb&w=400&h=300&fit=crop",
    lunch:
      "https://images.pexels.com/photos/1279330/pexels-photo-1279330.jpeg?auto=compress&cs=tinysrgb&w=400&h=300&fit=crop",
    breakfast:
      "https://images.pexels.com/photos/1640770/pexels-photo-1640770.jpeg?auto=compress&cs=tinysrgb&w=400&h=300&fit=crop",
    restaurant:
      "https://images.pexels.com/photos/262978/pexels-photo-262978.jpeg?auto=compress&cs=tinysrgb&w=400&h=300&fit=crop",
    cafe: "https://images.pexels.com/photos/1907227/pexels-photo-1907227.jpeg?auto=compress&cs=tinysrgb&w=400&h=300&fit=crop",
    food: "https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg?auto=compress&cs=tinysrgb&w=400&h=300&fit=crop",

    // Entertainment & Nightlife
    party:
      "https://images.pexels.com/photos/1763075/pexels-photo-1763075.jpeg?auto=compress&cs=tinysrgb&w=400&h=300&fit=crop",
    club: "https://images.pexels.com/photos/1190298/pexels-photo-1190298.jpeg?auto=compress&cs=tinysrgb&w=400&h=300&fit=crop",
    bar: "https://images.pexels.com/photos/274192/pexels-photo-274192.jpeg?auto=compress&cs=tinysrgb&w=400&h=300&fit=crop",
    nightlife:
      "https://images.pexels.com/photos/1190298/pexels-photo-1190298.jpeg?auto=compress&cs=tinysrgb&w=400&h=300&fit=crop",
    concert:
      "https://images.pexels.com/photos/1105666/pexels-photo-1105666.jpeg?auto=compress&cs=tinysrgb&w=400&h=300&fit=crop",
    music:
      "https://images.pexels.com/photos/1105666/pexels-photo-1105666.jpeg?auto=compress&cs=tinysrgb&w=400&h=300&fit=crop",
    show: "https://images.pexels.com/photos/713149/pexels-photo-713149.jpeg?auto=compress&cs=tinysrgb&w=400&h=300&fit=crop",
    theater:
      "https://images.pexels.com/photos/713149/pexels-photo-713149.jpeg?auto=compress&cs=tinysrgb&w=400&h=300&fit=crop",

    // Culture & Tourism
    museum:
      "https://images.pexels.com/photos/1579253/pexels-photo-1579253.jpeg?auto=compress&cs=tinysrgb&w=400&h=300&fit=crop",
    gallery:
      "https://images.pexels.com/photos/1045114/pexels-photo-1045114.jpeg?auto=compress&cs=tinysrgb&w=400&h=300&fit=crop",
    art: "https://images.pexels.com/photos/1045114/pexels-photo-1045114.jpeg?auto=compress&cs=tinysrgb&w=400&h=300&fit=crop",
    monument:
      "https://images.pexels.com/photos/1470502/pexels-photo-1470502.jpeg?auto=compress&cs=tinysrgb&w=400&h=300&fit=crop",
    landmark:
      "https://images.pexels.com/photos/1470502/pexels-photo-1470502.jpeg?auto=compress&cs=tinysrgb&w=400&h=300&fit=crop",
    tower:
      "https://images.pexels.com/photos/2363/france-landmark-lights-night.jpg?auto=compress&cs=tinysrgb&w=400&h=300&fit=crop",
    statue:
      "https://images.pexels.com/photos/1470502/pexels-photo-1470502.jpeg?auto=compress&cs=tinysrgb&w=400&h=300&fit=crop",

    // Religious Sites
    temple:
      "https://images.pexels.com/photos/2166553/pexels-photo-2166553.jpeg?auto=compress&cs=tinysrgb&w=400&h=300&fit=crop",
    church:
      "https://images.pexels.com/photos/1851481/pexels-photo-1851481.jpeg?auto=compress&cs=tinysrgb&w=400&h=300&fit=crop",
    cathedral:
      "https://images.pexels.com/photos/1851481/pexels-photo-1851481.jpeg?auto=compress&cs=tinysrgb&w=400&h=300&fit=crop",
    mosque:
      "https://images.pexels.com/photos/3209049/pexels-photo-3209049.jpeg?auto=compress&cs=tinysrgb&w=400&h=300&fit=crop",
    shrine:
      "https://images.pexels.com/photos/2166553/pexels-photo-2166553.jpeg?auto=compress&cs=tinysrgb&w=400&h=300&fit=crop",

    // Nature & Outdoors
    beach:
      "https://images.pexels.com/photos/189349/pexels-photo-189349.jpeg?auto=compress&cs=tinysrgb&w=400&h=300&fit=crop",
    park: "https://images.pexels.com/photos/1757656/pexels-photo-1757656.jpeg?auto=compress&cs=tinysrgb&w=400&h=300&fit=crop",
    garden:
      "https://images.pexels.com/photos/2132171/pexels-photo-2132171.jpeg?auto=compress&cs=tinysrgb&w=400&h=300&fit=crop",
    mountain:
      "https://images.pexels.com/photos/1266810/pexels-photo-1266810.jpeg?auto=compress&cs=tinysrgb&w=400&h=300&fit=crop",
    hiking:
      "https://images.pexels.com/photos/1365425/pexels-photo-1365425.jpeg?auto=compress&cs=tinysrgb&w=400&h=300&fit=crop",
    nature:
      "https://images.pexels.com/photos/1770809/pexels-photo-1770809.jpeg?auto=compress&cs=tinysrgb&w=400&h=300&fit=crop",
    forest:
      "https://images.pexels.com/photos/1179229/pexels-photo-1179229.jpeg?auto=compress&cs=tinysrgb&w=400&h=300&fit=crop",
    lake: "https://images.pexels.com/photos/1320684/pexels-photo-1320684.jpeg?auto=compress&cs=tinysrgb&w=400&h=300&fit=crop",
    river:
      "https://images.pexels.com/photos/1133505/pexels-photo-1133505.jpeg?auto=compress&cs=tinysrgb&w=400&h=300&fit=crop",
    waterfall:
      "https://images.pexels.com/photos/1670187/pexels-photo-1670187.jpeg?auto=compress&cs=tinysrgb&w=400&h=300&fit=crop",

    // Activities & Sports
    swimming:
      "https://images.pexels.com/photos/863988/pexels-photo-863988.jpeg?auto=compress&cs=tinysrgb&w=400&h=300&fit=crop",
    diving:
      "https://images.pexels.com/photos/1076758/pexels-photo-1076758.jpeg?auto=compress&cs=tinysrgb&w=400&h=300&fit=crop",
    snorkeling:
      "https://images.pexels.com/photos/2041396/pexels-photo-2041396.jpeg?auto=compress&cs=tinysrgb&w=400&h=300&fit=crop",
    surfing:
      "https://images.pexels.com/photos/390051/surfer-wave-sunset-the-indian-ocean-390051.jpeg?auto=compress&cs=tinysrgb&w=400&h=300&fit=crop",
    skiing:
      "https://images.pexels.com/photos/848618/pexels-photo-848618.jpeg?auto=compress&cs=tinysrgb&w=400&h=300&fit=crop",
    cycling:
      "https://images.pexels.com/photos/100582/pexels-photo-100582.jpeg?auto=compress&cs=tinysrgb&w=400&h=300&fit=crop",
    yoga: "https://images.pexels.com/photos/374632/pexels-photo-374632.jpeg?auto=compress&cs=tinysrgb&w=400&h=300&fit=crop",

    // Shopping & Markets
    shopping:
      "https://images.pexels.com/photos/1488467/pexels-photo-1488467.jpeg?auto=compress&cs=tinysrgb&w=400&h=300&fit=crop",
    market:
      "https://images.pexels.com/photos/1301856/pexels-photo-1301856.jpeg?auto=compress&cs=tinysrgb&w=400&h=300&fit=crop",
    mall: "https://images.pexels.com/photos/1488467/pexels-photo-1488467.jpeg?auto=compress&cs=tinysrgb&w=400&h=300&fit=crop",
    bazaar:
      "https://images.pexels.com/photos/2292919/pexels-photo-2292919.jpeg?auto=compress&cs=tinysrgb&w=400&h=300&fit=crop",

    // Accommodation
    hotel:
      "https://images.pexels.com/photos/271624/pexels-photo-271624.jpeg?auto=compress&cs=tinysrgb&w=400&h=300&fit=crop",
    checkin:
      "https://images.pexels.com/photos/271624/pexels-photo-271624.jpeg?auto=compress&cs=tinysrgb&w=400&h=300&fit=crop",
    checkout:
      "https://images.pexels.com/photos/271624/pexels-photo-271624.jpeg?auto=compress&cs=tinysrgb&w=400&h=300&fit=crop",

    // Sightseeing
    tour: "https://images.pexels.com/photos/1285625/pexels-photo-1285625.jpeg?auto=compress&cs=tinysrgb&w=400&h=300&fit=crop",
    sightseeing:
      "https://images.pexels.com/photos/1285625/pexels-photo-1285625.jpeg?auto=compress&cs=tinysrgb&w=400&h=300&fit=crop",
    cruise:
      "https://images.pexels.com/photos/163236/luxury-cruise-ship-cruise-ship-cruise-163236.jpeg?auto=compress&cs=tinysrgb&w=400&h=300&fit=crop",
    boat: "https://images.pexels.com/photos/163236/luxury-cruise-ship-cruise-ship-cruise-163236.jpeg?auto=compress&cs=tinysrgb&w=400&h=300&fit=crop",

    // Entertainment Venues
    casino:
      "https://images.pexels.com/photos/3968056/pexels-photo-3968056.jpeg?auto=compress&cs=tinysrgb&w=400&h=300&fit=crop",
    zoo: "https://images.pexels.com/photos/792381/pexels-photo-792381.jpeg?auto=compress&cs=tinysrgb&w=400&h=300&fit=crop",
    aquarium:
      "https://images.pexels.com/photos/3046629/pexels-photo-3046629.jpeg?auto=compress&cs=tinysrgb&w=400&h=300&fit=crop",
    amusement:
      "https://images.pexels.com/photos/163774/singapore-flyer-ferris-wheel-casino-163774.jpeg?auto=compress&cs=tinysrgb&w=400&h=300&fit=crop",

    // Spa & Wellness
    spa: "https://images.pexels.com/photos/3188/bath-bathroom-bathtub-candles.jpg?auto=compress&cs=tinysrgb&w=400&h=300&fit=crop",
    massage:
      "https://images.pexels.com/photos/3188/bath-bathroom-bathtub-candles.jpg?auto=compress&cs=tinysrgb&w=400&h=300&fit=crop",
    wellness:
      "https://images.pexels.com/photos/3188/bath-bathroom-bathtub-candles.jpg?auto=compress&cs=tinysrgb&w=400&h=300&fit=crop",

    // Default
    default:
      "https://images.pexels.com/photos/1285625/pexels-photo-1285625.jpeg?auto=compress&cs=tinysrgb&w=400&h=300&fit=crop",
  };

  const toggleDay = (index) => {
    setExpandedDays((prev) =>
      prev.includes(index) ? prev.filter((i) => i !== index) : [...prev, index]
    );
  };

  const getActivityImage = (activity, day) => {
    // Combine activity name and description for better matching
    const searchText = (
      (activity.activity || "") +
      " " +
      (activity.description || "") +
      " " +
      (activity.location?.name || "")
    ).toLowerCase();

    // Check each category keyword
    for (const [keyword, imageUrl] of Object.entries(activityImages)) {
      if (keyword !== "default" && searchText.includes(keyword)) {
        return imageUrl;
      }
    }

    return activityImages.default;
  };

  const handleImageError = (key) => {
    setImageErrors((prev) => ({ ...prev, [key]: true }));
  };

  // Get destination header image
  const getHeaderImage = () => {
    const destinationImages = {
      paris:
        "https://images.pexels.com/photos/2363/france-landmark-lights-night.jpg?auto=compress&cs=tinysrgb&w=1200&h=600&fit=crop",
      london:
        "https://images.pexels.com/photos/460672/pexels-photo-460672.jpeg?auto=compress&cs=tinysrgb&w=1200&h=600&fit=crop",
      tokyo:
        "https://images.pexels.com/photos/2506923/pexels-photo-2506923.jpeg?auto=compress&cs=tinysrgb&w=1200&h=600&fit=crop",
      newyork:
        "https://images.pexels.com/photos/466685/pexels-photo-466685.jpeg?auto=compress&cs=tinysrgb&w=1200&h=600&fit=crop",
      rome: "https://images.pexels.com/photos/1797161/pexels-photo-1797161.jpeg?auto=compress&cs=tinysrgb&w=1200&h=600&fit=crop",
      dubai:
        "https://images.pexels.com/photos/1470502/pexels-photo-1470502.jpeg?auto=compress&cs=tinysrgb&w=1200&h=600&fit=crop",
      bali: "https://images.pexels.com/photos/2166559/pexels-photo-2166559.jpeg?auto=compress&cs=tinysrgb&w=1200&h=600&fit=crop",
      sydney:
        "https://images.pexels.com/photos/1796736/pexels-photo-1796736.jpeg?auto=compress&cs=tinysrgb&w=1200&h=600&fit=crop",
      barcelona:
        "https://images.pexels.com/photos/1388030/pexels-photo-1388030.jpeg?auto=compress&cs=tinysrgb&w=1200&h=600&fit=crop",
      default:
        "https://images.pexels.com/photos/2263436/pexels-photo-2263436.jpeg?auto=compress&cs=tinysrgb&w=1200&h=600&fit=crop",
    };

    const destination = (itinerary.destination || "")
      .toLowerCase()
      .replace(/\s+/g, "");

    for (const [city, imageUrl] of Object.entries(destinationImages)) {
      if (destination.includes(city)) {
        return imageUrl;
      }
    }

    return destinationImages.default;
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="min-h-screen py-4 md:py-8 px-2 md:px-4"
        onClick={(e) => e.stopPropagation()}
      >
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 50 }}
          className="max-w-6xl mx-auto bg-white dark:bg-gray-900 rounded-2xl shadow-2xl overflow-hidden"
        >
          {/* Header */}
          <div className="relative h-64 md:h-80 bg-gradient-to-br from-blue-600 via-purple-600 to-pink-600">
            <div className="absolute inset-0 bg-black/20 md:bg-black/30" />
            <img
              src={getHeaderImage()}
              alt={itinerary.destination}
              className="w-full h-full object-cover mix-blend-overlay"
            />

            {/* Close Button */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 bg-white/90 hover:bg-white text-gray-900 p-2 md:p-3 rounded-full shadow-lg transition-all"
            >
              <FaTimes className="h-4 w-4 md:h-5 md:w-5" />
            </button>

            {/* Title */}
            <div className="absolute bottom-0 left-0 right-0 p-3 md:p-8 text-white">
              <div className="flex items-center gap-2 mb-2">
                <FaMapMarkerAlt className="h-5 w-5" />
                <span className="text-sm md:text-lg font-medium">Your Journey to</span>
              </div>
              <h1 className="text-2xl md:text-5xl font-bold mb-1 md:mb-2">
                {itinerary.destination}
              </h1>
              <p className="text-sm md:text-lg text-gray-200">
                {itinerary.duration} Days • {formValues.travelers} Travelers •{" "}
                {formValues.budget} Budget
              </p>
            </div>
          </div>

          <div className="p-3 md:p-8">
            {/* Trip Summary */}
            <div className="grid grid-cols-3 gap-2 md:gap-6 mb-4 md:mb-8">
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 p-2 md:p-6 rounded-xl">
                <div className="flex flex-col md:flex-row items-center gap-1 md:gap-3 mb-1 md:mb-2">
                  <div className="bg-blue-600 p-1.5 md:p-3 rounded-lg">
                    <FaDollarSign className="h-4 w-4 md:h-6 md:w-6 text-white" />
                  </div>
                  <div className="text-center md:text-left">
                    <p className="text-xs md:text-sm text-gray-600 dark:text-gray-400">
                      Total Cost
                    </p>
                    <p className="text-sm md:text-2xl font-bold text-gray-900 dark:text-white">
                      {itinerary.totalEstimatedCost?.currency}{" "}
                      {itinerary.totalEstimatedCost?.amount}
                    </p>
                  </div>
                </div>
                <p className="hidden md:block text-xs text-gray-500 text-center md:text-left">
                  Approximately{" "}
                  {Math.round(
                    itinerary.totalEstimatedCost?.amount / formValues.travelers
                  )}{" "}
                  per person
                </p>
              </div>

              <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 p-2 md:p-6 rounded-xl">
                <div className="flex flex-col md:flex-row items-center gap-1 md:gap-3 mb-1 md:mb-2">
                  <div className="bg-purple-600 p-1.5 md:p-3 rounded-lg">
                    <FaStar className="h-4 w-4 md:h-6 md:w-6 text-white" />
                  </div>
                  <div className="text-center md:text-left">
                    <p className="text-xs md:text-sm text-gray-600 dark:text-gray-400">
                      Activities
                    </p>
                    <p className="text-sm md:text-2xl font-bold text-gray-900 dark:text-white">
                      {itinerary.itinerary?.reduce(
                        (sum, day) => sum + (day.activities?.length || 0),
                        0
                      )}
                    </p>
                  </div>
                </div>
                <p className="hidden md:block text-xs text-gray-500 text-center md:text-left">
                  Handpicked experiences for you
                </p>
              </div>

              <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 p-2 md:p-6 rounded-xl">
                <div className="flex flex-col md:flex-row items-center gap-1 md:gap-3 mb-1 md:mb-2">
                  <div className="bg-green-600 p-1.5 md:p-3 rounded-lg">
                    <FaUtensils className="h-4 w-4 md:h-6 md:w-6 text-white" />
                  </div>
                  <div className="text-center md:text-left">
                    <p className="text-xs md:text-sm text-gray-600 dark:text-gray-400">
                      Meals Planned
                    </p>
                    <p className="text-sm md:text-2xl font-bold text-gray-900 dark:text-white">
                      {itinerary.itinerary?.reduce(
                        (sum, day) => sum + (day.meals?.length || 0),
                        0
                      )}
                    </p>
                  </div>
                </div>
                <p className="hidden md:block text-xs text-gray-500 text-center md:text-left">
                  Delicious dining experiences
                </p>
              </div>
            </div>

            {/* Recommendations */}
            {itinerary.recommendations && (
              <div className="bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 p-3 md:p-6 rounded-xl mb-4 md:mb-8">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                  <FaInfoCircle className="text-yellow-600" />
                  Important Travel Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {itinerary.recommendations.bestTimeToVisit && (
                    <div>
                      <p className="font-semibold text-gray-900 dark:text-white mb-1">
                        Best Time to Visit
                      </p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {itinerary.recommendations.bestTimeToVisit}
                      </p>
                    </div>
                  )}
                  {itinerary.recommendations.weather && (
                    <div>
                      <p className="font-semibold text-gray-900 dark:text-white mb-1">
                        Weather
                      </p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {itinerary.recommendations.weather}
                      </p>
                    </div>
                  )}
                  {itinerary.recommendations.packingTips && (
                    <div className="md:col-span-2">
                      <p className="font-semibold text-gray-900 dark:text-white mb-2">
                        Packing Tips
                      </p>
                      <ul className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {itinerary.recommendations.packingTips
                          .slice(0, 4)
                          .map((tip, idx) => (
                            <li
                              key={idx}
                              className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-400"
                            >
                              <span className="text-yellow-600">•</span>
                              <span>{tip}</span>
                            </li>
                          ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Daily Itinerary */}
            <div className="mb-8">
              <h3 className="text-lg md:text-2xl font-bold text-gray-900 dark:text-white mb-3 md:mb-6">
                Day-by-Day Itinerary
              </h3>
              <div className="space-y-4">
                {itinerary.itinerary?.map((day, dayIndex) => (
                  <motion.div
                    key={day.day}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: dayIndex * 0.1 }}
                    className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden"
                  >
                    {/* Day Header */}
                    <button
                      onClick={() => toggleDay(dayIndex)}
                      className="w-full bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-700 p-2 md:p-6 flex items-center justify-between hover:from-gray-100 hover:to-gray-200 dark:hover:from-gray-700 dark:hover:to-gray-600 transition-all"
                    >
                      <div className="flex items-center gap-2 md:gap-4">
                        <div className="bg-blue-600 text-white w-8 h-8 md:w-12 md:h-12 rounded-full flex items-center justify-center font-bold text-sm md:text-lg">
                          {day.day}
                        </div>
                        <div className="text-left">
                          <h4 className="text-xs md:text-lg font-bold text-gray-900 dark:text-white">
                            Day {day.day}:{" "}
                            {day.title ||
                              day.theme ||
                              day.activities?.[0]?.activity ||
                              day.activities?.[0]?.title ||
                              day.activities?.[0]?.name ||
                              "Activities planned"}
                          </h4>
                          <p className="text-xs md:text-sm text-gray-600 dark:text-gray-400">
                            {day.date} • {day.activities?.length || 0}{" "}
                            activities
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 md:gap-4">
                        <div className="text-right">
                          <p className="text-[10px] md:text-sm text-gray-600 dark:text-gray-400">
                            <span className="md:hidden">Budget </span>
                            <span className="hidden md:inline">Daily Budget</span>
                          </p>
                          <p className="text-xs md:text-base font-bold text-blue-600">
                            <span className="hidden md:inline">{day.totalDayCost?.currency}{" "}</span>
                            {day.totalDayCost?.amount}
                          </p>
                        </div>
                        {expandedDays.includes(dayIndex) ? (
                          <FaChevronUp className="hidden md:block text-gray-400" />
                        ) : (
                          <FaChevronDown className="hidden md:block text-gray-400" />
                        )}
                      </div>
                    </button>

                    {/* Day Content */}
                    <AnimatePresence>
                      {expandedDays.includes(dayIndex) && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.3 }}
                          className="bg-white dark:bg-gray-800"
                        >
                          <div className="p-2 md:p-6 space-y-3 md:space-y-6">
                            {/* Activities */}
                            <div>
                              <h5 className="font-semibold text-sm md:text-base text-gray-900 dark:text-white mb-2 md:mb-4 flex items-center gap-2">
                                <FaMapMarkerAlt className="text-blue-600" />
                                Activities
                              </h5>
                              <div className="space-y-4">
                                {day.activities?.map((activity, actIdx) => {
                                  const imageKey = `${dayIndex}-${actIdx}`;
                                  return (
                                    <div
                                      key={actIdx}
                                      className="flex gap-2 md:gap-4 bg-gray-50 dark:bg-gray-700 p-2 md:p-4 rounded-lg"
                                    >
                                      {/* Activity Image */}
                                      <div className="flex-shrink-0 w-16 h-16 md:w-24 md:h-24 rounded-lg overflow-hidden">
                                        <img
                                          src={getActivityImage(activity, day)}
                                          alt={activity.activity}
                                          onError={(e) => {
                                            e.target.src =
                                              activityImages.default;
                                          }}
                                          className="w-full h-full object-cover"
                                        />
                                      </div>

                                      {/* Activity Details */}
                                      <div className="flex-1 min-w-0">
                                        <div className="flex items-start justify-between mb-0.5 md:mb-2">
                                          <p className="font-semibold text-xs md:text-base text-gray-900 dark:text-white mr-2">
                                            {activity.activity}
                                          </p>
                                          <span className="flex-shrink-0 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 px-2 py-0.5 md:px-3 md:py-1 rounded-full text-[10px] md:text-sm font-medium">
                                            {activity.cost?.currency}{" "}
                                            {activity.cost?.amount}
                                          </span>
                                        </div>
                                        <p className="text-xs md:text-sm text-gray-600 dark:text-gray-400 truncate mb-1">
                                          📍 {activity.location?.name}
                                        </p>
                                        <p className="text-xs md:text-sm text-gray-600 dark:text-gray-400 mb-1 md:mb-2">
                                          {activity.description}
                                        </p>
                                        <div className="flex items-center gap-4 text-xs md:text-sm text-gray-500">
                                          <span className="flex items-center gap-1">
                                            <FaClock className="w-3 h-3 md:w-4 md:h-4" /> {activity.time}
                                          </span>
                                          
                                          <span>
                                            <span className="hidden md:inline">Duration: </span>
                                            {activity.duration}h
                                          </span>
                                        </div>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>

                            {/* Meals */}
                            {day.meals && day.meals.length > 0 && (
                              <div>
                                <h5 className="font-semibold text-sm md:text-base text-gray-900 dark:text-white mb-2 md:mb-4 flex items-center gap-2">
                                  <FaUtensils className="text-green-600" />
                                  <span className="md:hidden">Meals</span>
                                  <span className="hidden md:inline">Dining</span>
                                </h5>

                                <div className="grid grid-cols-2 md:grid-cols-3 gap-2 md:gap-4">
                                  {day.meals.map((meal, mealIdx) => (
                                      <div
                                        key={mealIdx}
                                        className="bg-green-50 dark:bg-green-900/20 p-2 md:p-4 rounded-lg"
                                      >
                                      <p className="font-semibold text-xs md:text-base text-gray-900 dark:text-white mb-0.5 md:mb-1">
                                        {meal.type}
                                      </p>
                                      <p className="text-[10px] md:text-sm text-gray-600 dark:text-gray-400 mb-1 md:mb-2 truncate">
                                        {meal.restaurant}
                                      </p>
                                      <p className="text-[10px] md:text-sm text-green-600 dark:text-green-400 font-medium truncate">
                                        {meal.cost?.currency}{" "}
                                        {meal.cost?.amount}
                                      </p>
                                      {meal.cuisine && (
                                        <p className="text-[10px] md:text-xs text-gray-500 mt-0.5 md:mt-1 truncate">
                                          {meal.cuisine}
                                        </p>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Accommodation */}
                            {day.accommodation && (
                              <div className="bg-purple-50 dark:bg-purple-900/20 p-2 md:p-4 rounded-lg">
                                <h5 className="font-semibold text-sm md:text-base text-gray-900 dark:text-white mb-2 md:mb-4 flex items-center gap-2">
                                  <FaHotel className="text-purple-600" />
                                  Accommodation
                                </h5>
                                <div className="flex items-center justify-between">
                                  <div>
                                    <p className="font-medium text-gray-900 dark:text-white">
                                      {day.accommodation.name}
                                    </p>
                                    <p className="text-sm text-gray-600 dark:text-gray-400">
                                      {day.accommodation.type}
                                    </p>
                                  </div>
                                  <p className="text-purple-600 dark:text-purple-400 font-semibold">
                                    {day.accommodation.cost?.currency}{" "}
                                    {day.accommodation.cost?.amount}
                                  </p>
                                </div>
                              </div>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                ))}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="grid grid-cols-2 gap-2 md:gap-4">
              {/* Download PDF Button */}
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleDownloadPDF}
                disabled={isDownloading}
                className="bg-gradient-to-r from-green-600 to-teal-600 hover:from-green-700 hover:to-teal-700 text-white font-semibold py-2 px-3 md:py-4 md:px-6 rounded-xl transition-all flex items-center justify-center gap-1 md:gap-3 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed text-xs md:text-base"
              >
                <FaDownload className={isDownloading ? "animate-bounce" : ""} />
                <span className="md:inline">{isDownloading ? "Generating..." : "Download PDF"}</span>
              </motion.button>

              {/* Add Trip Button */}
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleAddTrip}
                disabled={isAddingTrip}
                className="bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-700 hover:to-rose-700 text-white font-semibold py-2 px-3 md:py-4 md:px-6 rounded-xl transition-all flex items-center justify-center gap-1 md:gap-3 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed text-xs md:text-base"
              >
                <FaPlus className={isAddingTrip ? "animate-spin" : ""} />
                {isAddingTrip ? "Adding..." : "Add Trip"}
              </motion.button>
            </div>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
};

export default TripDetailView;

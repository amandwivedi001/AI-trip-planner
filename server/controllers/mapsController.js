const { validationResult } = require("express-validator");
const axios = require("axios");

// Mock places data - replace with Google Places API in production
const mockPlacesData = {
  restaurants: [
    {
      id: "rest_1",
      name: "Le Bernardin",
      category: "Fine Dining",
      cuisine: "French Seafood",
      rating: 4.8,
      priceLevel: 4,
      location: {
        address: "155 W 51st St, New York, NY 10019",
        coordinates: { lat: 40.7614, lng: -73.9776 },
      },
      hours: {
        monday: "5:30 PM - 10:30 PM",
        tuesday: "5:30 PM - 10:30 PM",
        wednesday: "5:30 PM - 10:30 PM",
        thursday: "5:30 PM - 10:30 PM",
        friday: "5:30 PM - 10:30 PM",
        saturday: "5:30 PM - 10:30 PM",
        sunday: "Closed",
      },
      photos: ["photo1.jpg", "photo2.jpg"],
      reviews: [
        {
          author: "John D.",
          rating: 5,
          text: "Exceptional seafood and impeccable service.",
          date: "2024-01-15",
        },
      ],
      phone: "+1 212-554-1515",
      website: "https://le-bernardin.com",
      amenities: ["Reservations Required", "Valet Parking", "Wine Pairing"],
    },
  ],
  attractions: [
    {
      id: "attr_1",
      name: "Statue of Liberty",
      category: "Monument",
      rating: 4.6,
      location: {
        address: "Liberty Island, New York, NY 10004",
        coordinates: { lat: 40.6892, lng: -74.0445 },
      },
      description: "Iconic symbol of freedom and democracy",
      hours: {
        monday: "9:00 AM - 5:00 PM",
        tuesday: "9:00 AM - 5:00 PM",
        wednesday: "9:00 AM - 5:00 PM",
        thursday: "9:00 AM - 5:00 PM",
        friday: "9:00 AM - 5:00 PM",
        saturday: "9:00 AM - 5:00 PM",
        sunday: "9:00 AM - 5:00 PM",
      },
      ticketPrice: {
        adult: 25,
        child: 12,
        currency: "USD",
      },
      photos: ["statue1.jpg", "statue2.jpg"],
      tags: ["History", "Monument", "Photography", "Iconic"],
      accessibility: true,
      estimatedVisitTime: "3-4 hours",
    },
  ],
  hotels: [
    {
      id: "hotel_1",
      name: "The Plaza",
      category: "Luxury Hotel",
      rating: 4.5,
      priceLevel: 4,
      location: {
        address: "768 5th Ave, New York, NY 10019",
        coordinates: { lat: 40.7648, lng: -73.9754 },
      },
      amenities: [
        "Spa",
        "Fitness Center",
        "Restaurant",
        "Room Service",
        "Concierge",
      ],
      photos: ["plaza1.jpg", "plaza2.jpg"],
      phone: "+1 212-759-3000",
      website: "https://theplazany.com",
    },
  ],
};

// Search places (restaurants, attractions, hotels)
const searchPlaces = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: "Validation errors",
        errors: errors.array(),
      });
    }

    const {
      query,
      location,
      radius = 5000, // meters
      type = "all", // restaurant, attraction, hotel, all
      minRating = 0,
      maxPrice = 5,
      openNow = false,
    } = req.query;

    let results = [];

    // Filter by type
    if (type === "all" || type === "restaurant") {
      results = [...results, ...mockPlacesData.restaurants];
    }
    if (type === "all" || type === "attraction") {
      results = [...results, ...mockPlacesData.attractions];
    }
    if (type === "all" || type === "hotel") {
      results = [...results, ...mockPlacesData.hotels];
    }

    // Filter by query
    if (query) {
      results = results.filter(
        (place) =>
          place.name.toLowerCase().includes(query.toLowerCase()) ||
          (place.category &&
            place.category.toLowerCase().includes(query.toLowerCase())) ||
          (place.cuisine &&
            place.cuisine.toLowerCase().includes(query.toLowerCase()))
      );
    }

    // Filter by rating
    if (minRating > 0) {
      results = results.filter(
        (place) => place.rating >= parseFloat(minRating)
      );
    }

    // Filter by price level
    if (maxPrice < 5) {
      results = results.filter(
        (place) => !place.priceLevel || place.priceLevel <= parseInt(maxPrice)
      );
    }

    // Sort by rating
    results.sort((a, b) => (b.rating || 0) - (a.rating || 0));

    res.json({
      success: true,
      data: {
        places: results,
        totalResults: results.length,
        searchParams: {
          query,
          location,
          radius,
          type,
          minRating,
          maxPrice,
          openNow,
        },
      },
    });
  } catch (error) {
    console.error("Search places error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to search places",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

// Get place details
const getPlaceDetails = async (req, res) => {
  try {
    const { placeId } = req.params;

    // Search in all categories
    let place = null;
    const allPlaces = [
      ...mockPlacesData.restaurants,
      ...mockPlacesData.attractions,
      ...mockPlacesData.hotels,
    ];

    place = allPlaces.find((p) => p.id === placeId);

    if (!place) {
      return res.status(404).json({
        success: false,
        message: "Place not found",
      });
    }

    // In production, fetch additional details from Google Places API
    const detailedPlace = {
      ...place,
      nearbyPlaces: [
        {
          id: "nearby_1",
          name: "Central Park",
          category: "Park",
          distance: "0.3 miles",
          walkingTime: "6 minutes",
        },
        {
          id: "nearby_2",
          name: "Times Square",
          category: "Tourist Attraction",
          distance: "0.5 miles",
          walkingTime: "10 minutes",
        },
      ],
      transportation: {
        subway: ["N, Q, R, W lines"],
        bus: ["M5, M7, M104"],
        parking: "Valet parking available",
        taxi: "Available 24/7",
      },
      weather: {
        current: "72°F",
        condition: "Partly cloudy",
        forecast: "Sunny, high 75°F",
      },
    };

    res.json({
      success: true,
      data: {
        place: detailedPlace,
      },
    });
  } catch (error) {
    console.error("Get place details error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get place details",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

// Get directions between two points
const getDirections = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: "Validation errors",
        errors: errors.array(),
      });
    }

    const {
      origin,
      destination,
      mode = "driving", // driving, walking, transit, bicycling
      waypoints,
      alternatives = false,
    } = req.query;

    // In production, use Google Directions API
    const directions = {
      routes: [
        {
          summary: "via FDR Dr",
          distance: "8.2 miles",
          duration: "22 minutes",
          steps: [
            {
              instruction: "Head north on 5th Ave toward E 59th St",
              distance: "0.3 miles",
              duration: "2 minutes",
              maneuver: "turn-right",
            },
            {
              instruction: "Turn right onto FDR Dr",
              distance: "5.8 miles",
              duration: "15 minutes",
              maneuver: "turn-right",
            },
            {
              instruction: "Take exit 18 for Brooklyn Bridge",
              distance: "2.1 miles",
              duration: "5 minutes",
              maneuver: "exit-right",
            },
          ],
          trafficCondition: "moderate",
          estimatedCost: {
            fuel: 2.5,
            tolls: 0,
            parking: 15,
            currency: "USD",
          },
        },
      ],
      alternatives: alternatives
        ? [
            {
              summary: "via West Side Hwy",
              distance: "9.1 miles",
              duration: "28 minutes",
              description: "Slightly longer but scenic route",
            },
          ]
        : [],
      origin: {
        name: origin,
        coordinates: { lat: 40.7648, lng: -73.9754 },
      },
      destination: {
        name: destination,
        coordinates: { lat: 40.7061, lng: -74.0087 },
      },
      mode,
      waypoints: waypoints ? waypoints.split("|") : [],
    };

    res.json({
      success: true,
      data: directions,
    });
  } catch (error) {
    console.error("Get directions error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get directions",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

// Get nearby places
const getNearbyPlaces = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: "Validation errors",
        errors: errors.array(),
      });
    }

    const {
      latitude,
      longitude,
      radius = 1000,
      type = "all",
      keyword,
    } = req.query;

    // In production, use Google Places Nearby Search API
    let nearbyPlaces = [];

    // Mock nearby places based on type
    if (type === "all" || type === "restaurant") {
      nearbyPlaces = [...nearbyPlaces, ...mockPlacesData.restaurants];
    }
    if (type === "all" || type === "attraction") {
      nearbyPlaces = [...nearbyPlaces, ...mockPlacesData.attractions];
    }
    if (type === "all" || type === "hotel") {
      nearbyPlaces = [...nearbyPlaces, ...mockPlacesData.hotels];
    }

    // Add distance calculation (mock)
    nearbyPlaces = nearbyPlaces.map((place) => ({
      ...place,
      distance: Math.round(Math.random() * parseInt(radius)),
      walkingTime: Math.round(Math.random() * 15) + 1,
    }));

    // Filter by keyword
    if (keyword) {
      nearbyPlaces = nearbyPlaces.filter(
        (place) =>
          place.name.toLowerCase().includes(keyword.toLowerCase()) ||
          (place.category &&
            place.category.toLowerCase().includes(keyword.toLowerCase()))
      );
    }

    // Sort by distance
    nearbyPlaces.sort((a, b) => a.distance - b.distance);

    res.json({
      success: true,
      data: {
        places: nearbyPlaces,
        center: {
          latitude: parseFloat(latitude),
          longitude: parseFloat(longitude),
        },
        radius: parseInt(radius),
        totalResults: nearbyPlaces.length,
      },
    });
  } catch (error) {
    console.error("Get nearby places error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get nearby places",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

// Geocode address
const geocodeAddress = async (req, res) => {
  try {
    const { address } = req.query;

    if (!address) {
      return res.status(400).json({
        success: false,
        message: "Address is required",
      });
    }

    // In production, use Google Geocoding API
    const geocodeResult = {
      results: [
        {
          formatted_address: "768 5th Ave, New York, NY 10019, USA",
          geometry: {
            location: { lat: 40.7648, lng: -73.9754 },
            location_type: "ROOFTOP",
            viewport: {
              northeast: { lat: 40.7661, lng: -73.9741 },
              southwest: { lat: 40.7635, lng: -73.9767 },
            },
          },
          place_id: "ChIJUxNHs4xZwokRCEtRWE04_Vw",
          types: ["street_address"],
          address_components: [
            { long_name: "768", short_name: "768", types: ["street_number"] },
            {
              long_name: "5th Avenue",
              short_name: "5th Ave",
              types: ["route"],
            },
            {
              long_name: "Manhattan",
              short_name: "Manhattan",
              types: ["sublocality"],
            },
            {
              long_name: "New York",
              short_name: "New York",
              types: ["locality"],
            },
            {
              long_name: "New York",
              short_name: "NY",
              types: ["administrative_area_level_1"],
            },
            {
              long_name: "United States",
              short_name: "US",
              types: ["country"],
            },
            { long_name: "10019", short_name: "10019", types: ["postal_code"] },
          ],
        },
      ],
      status: "OK",
    };

    res.json({
      success: true,
      data: geocodeResult,
    });
  } catch (error) {
    console.error("Geocode address error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to geocode address",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

// Reverse geocode coordinates
const reverseGeocode = async (req, res) => {
  try {
    const { latitude, longitude } = req.query;

    if (!latitude || !longitude) {
      return res.status(400).json({
        success: false,
        message: "Latitude and longitude are required",
      });
    }

    // In production, use Google Reverse Geocoding API
    const reverseGeocodeResult = {
      results: [
        {
          formatted_address: "768 5th Ave, New York, NY 10019, USA",
          types: ["street_address"],
          place_id: "ChIJUxNHs4xZwokRCEtRWE04_Vw",
        },
        {
          formatted_address: "Midtown Manhattan, New York, NY, USA",
          types: ["neighborhood", "political"],
        },
        {
          formatted_address: "New York, NY, USA",
          types: ["locality", "political"],
        },
      ],
      status: "OK",
    };

    res.json({
      success: true,
      data: reverseGeocodeResult,
    });
  } catch (error) {
    console.error("Reverse geocode error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to reverse geocode coordinates",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

// Get travel time matrix
const getTravelTimeMatrix = async (req, res) => {
  try {
    const {
      origins,
      destinations,
      mode = "driving",
      units = "metric",
    } = req.query;

    if (!origins || !destinations) {
      return res.status(400).json({
        success: false,
        message: "Origins and destinations are required",
      });
    }

    // In production, use Google Distance Matrix API
    const matrix = {
      origin_addresses: origins.split("|"),
      destination_addresses: destinations.split("|"),
      rows: [
        {
          elements: [
            {
              distance: { text: "8.2 mi", value: 13200 },
              duration: { text: "22 mins", value: 1320 },
              status: "OK",
            },
            {
              distance: { text: "12.1 mi", value: 19500 },
              duration: { text: "35 mins", value: 2100 },
              status: "OK",
            },
          ],
        },
      ],
      status: "OK",
    };

    res.json({
      success: true,
      data: matrix,
    });
  } catch (error) {
    console.error("Get travel time matrix error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get travel time matrix",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

module.exports = {
  searchPlaces,
  getPlaceDetails,
  getDirections,
  getNearbyPlaces,
  geocodeAddress,
  reverseGeocode,
  getTravelTimeMatrix,
};

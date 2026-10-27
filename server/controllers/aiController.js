
const { GoogleGenAI } = require("@google/genai");
const Trip = require("../models/Trip");
const { protect } = require("../middleware/auth");
const { logger } = require("../middleware/logging");

// Initialize Gemini AI
const genAI = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

const MODEL = "gemini-3.5-flash-lite";

// Reusable helper for Gemini requests
const generateAIText = async (prompt, maxOutputTokens = 8192) => {
  const result = await genAI.models.generateContent({
    model: MODEL,
    contents: prompt,
    config: {
      maxOutputTokens,
    },
  });

  const text = result.text || "";

  if (!text.trim()) {
    throw new Error("Gemini returned an empty response");
  }

  return text
    .replace(/```json\s*/gi, "")
    .replace(/```\s*/g, "")
    .trim();
};

// @desc    Generate AI-powered trip itinerary
// @route   POST /api/ai/generate-itinerary
// @access  Private
const generateItinerary = async (req, res) => {
  try {
    const {
      destination,
      duration,
      budget,
      travelStyle,
      interests,
      groupSize,
      accommodation,
      transport,
      startDate,
      endDate,
    } = req.body;

    if (!destination || !duration || !budget) {
      return res.status(400).json({
        success: false,
        message: "Destination, duration, and budget are required",
      });
    }

    const prompt = `Create a detailed ${duration}-day travel itinerary for ${destination} with the following preferences:

Travel Style: ${travelStyle || "balanced"}
Budget Range: ₹${budget.min || 0} - ₹${budget.max || 5000} ${
      budget.currency || "INR"
    }
Group Size: ${groupSize || 1} people
Accommodation Preference: ${accommodation || "hotel"}
Transport Preferences: ${transport?.join(", ") || "flexible"}
Interests: ${interests?.join(", ") || "general sightseeing"}
Start Date: ${startDate || "flexible"}
End Date: ${endDate || "flexible"}

Return ONLY valid JSON in the following structure:
{
  "destination": "${destination}",
  "duration": ${duration},
  "totalEstimatedCost": {
    "amount": 0,
    "currency": "${budget.currency || "INR"}"
  },
  "itinerary": [
    {
      "day": 1,
      "date": "${startDate || "flexible"}",
      "title": "Arrival and Local Exploration",
      "activities": [
        {
          "time": "09:00",
          "activity": "Activity name",
          "location": {
            "name": "Place name",
            "address": "Place address",
            "coordinates": {
              "lat": 0.0,
              "lng": 0.0
            }
          },
          "duration": 2,
          "cost": {
            "amount": 150,
            "currency": "INR"
          },
          "description": "Activity description",
          "type": "attraction"
        }
      ],
      "meals": [
        {
          "time": "12:00",
          "restaurant": "Restaurant name",
          "cuisine": "Local",
          "cost": {
            "amount": 250,
            "currency": "INR"
          },
          "location": {
            "name": "Restaurant name",
            "address": "Restaurant address"
          }
        }
      ],
      "totalDayCost": {
        "amount": 400,
        "currency": "INR"
      }
    }
  ],
  "recommendations": {
    "bestTimeToVisit": "November to March",
    "weather": "Weather description",
    "localTips": ["Local tip"],
    "mustSeeAttractions": ["Attraction name"],
    "budgetTips": ["Budget tip"],
    "safetyTips": ["Safety tip"]
  }
}

Requirements:
- Generate exactly ${duration} itinerary days.
- Give each day a concise, descriptive title of 3-6 words.
- Include realistic activities, restaurants, costs and locations for ${destination}.
- Include coordinates only when reasonably known; never invent precise coordinates.
- Use the requested currency: ${budget.currency || "INR"}.
- Keep the estimated total cost within the budget range of ${
      budget.min || 0
    } to ${budget.max || 5000}.
- Account for group size, travel style, interests and transport preferences.
- Return JSON only, without Markdown fences or additional commentary.`;

    const generatedText = await generateAIText(prompt);
    let itineraryData;

    try {
      itineraryData = JSON.parse(generatedText);
    } catch (parseError) {
      console.error("Failed to parse AI itinerary response:", parseError);
      return res.status(502).json({
        success: false,
        message: "AI returned an invalid itinerary. Please try again.",
      });
    }

    if (
      !itineraryData ||
      !Array.isArray(itineraryData.itinerary) ||
      itineraryData.itinerary.length === 0
    ) {
      return res.status(502).json({
        success: false,
        message: "AI returned an incomplete itinerary. Please try again.",
      });
    }

    if (
      !itineraryData.totalEstimatedCost ||
      !itineraryData.totalEstimatedCost.amount
    ) {
      const totalCost = itineraryData.itinerary.reduce(
        (sum, day) => sum + (Number(day.totalDayCost?.amount) || 0),
        0
      );

      itineraryData.totalEstimatedCost = {
        amount: totalCost,
        currency: budget.currency || "INR",
      };
    }

    return res.json({
      success: true,
      message: "Itinerary generated successfully",
      data: itineraryData,
    });
  } catch (error) {
    console.error("Generate itinerary error:", error);

    return res.status(500).json({
      success: false,
      message: "Error generating itinerary with AI",
      error:
        process.env.NODE_ENV === "development"
          ? error.message
          : "Internal server error",
    });
  }
};

// @desc    Optimize existing itinerary
// @route   POST /api/ai/optimize-itinerary
// @access  Private
const optimizeItinerary = async (req, res) => {
  try {
    const { itinerary, optimizationGoals } = req.body;

    if (!itinerary) {
      return res.status(400).json({
        success: false,
        message: "Itinerary data is required for optimization",
      });
    }

    const goals = optimizationGoals || ["cost", "time", "experience"];

    const prompt = `Optimize the following travel itinerary based on these goals: ${goals.join(
      ", "
    )}.

Current Itinerary:
${JSON.stringify(itinerary, null, 2)}

Please provide an optimized version that:
1. ${
      goals.includes("cost")
        ? "Reduces overall costs while maintaining quality"
        : "Preserves costs where appropriate"
    }
2. ${
      goals.includes("time")
        ? "Optimizes travel time and reduces unnecessary delays"
        : "Preserves the existing schedule where appropriate"
    }
3. ${
      goals.includes("experience")
        ? "Enhances the overall travel experience"
        : "Preserves the original experience"
    }
4. Maintains the same destination and duration.
5. Keeps the same JSON structure.
6. Includes an "optimizationNotes" array explaining key changes.

Return ONLY valid JSON, without Markdown fences or commentary.`;

    const optimizedText = await generateAIText(prompt);
    let optimizedData;

    try {
      optimizedData = JSON.parse(optimizedText);
    } catch (parseError) {
      console.error("Failed to parse optimization response:", parseError);

      return res.status(502).json({
        success: false,
        message: "AI returned invalid optimization data. Please try again.",
      });
    }

    return res.json({
      success: true,
      message: "Itinerary optimized successfully",
      data: optimizedData,
    });
  } catch (error) {
    console.error("Optimize itinerary error:", error);

    return res.status(500).json({
      success: false,
      message: "Error optimizing itinerary",
      error:
        process.env.NODE_ENV === "development"
          ? error.message
          : "Internal server error",
    });
  }
};

// @desc    Get travel suggestions based on preferences
// @route   POST /api/ai/travel-suggestions
// @access  Private
const getTravelSuggestions = async (req, res) => {
  try {
    const { preferences, currentLocation, travelHistory } = req.body;

    const user = req.user || {};
    const userPreferences = user.preferences || {};

    const prompt = `Based on the following user profile and preferences, suggest 5-10 travel destinations.

User Preferences:
- Travel Style: ${
      preferences?.travelStyle || userPreferences.travelStyle || "balanced"
    }
- Budget Range: ${
      preferences?.budgetRange || userPreferences.budgetRange || "moderate"
    }
- Preferred Activities: ${JSON.stringify(
      preferences?.interests || userPreferences.interests || ["sightseeing"]
    )}
- Accommodation Type: ${
      preferences?.accommodation ||
      userPreferences.preferredAccommodation ||
      "hotel"
    }
- Current Location: ${currentLocation || "Not specified"}
- Previous Destinations: ${
      travelHistory?.map((trip) => trip.destination).join(", ") || "None"
    }

Return ONLY valid JSON in this format:
{
  "suggestions": [
    {
      "destination": "Destination Name",
      "country": "Country",
      "category": "beach/mountain/city/cultural/adventure",
      "estimatedBudget": {
        "min": 60000,
        "max": 120000,
        "currency": "INR"
      },
      "bestTimeToVisit": "March to May",
      "highlights": ["Attraction 1", "Attraction 2"],
      "whyRecommended": "Reasons based on user preferences",
      "estimatedDuration": "5-7 days",
      "difficultyLevel": "easy/moderate/challenging",
      "uniqueExperiences": ["Experience 1", "Experience 2"]
    }
  ],
  "personalizedTips": [
    "Tip based on travel style",
    "Budget optimization tip",
    "Experience enhancement tip"
  ]
}

Focus on destinations matching the user's preferences and avoid destinations they have already visited when possible. Return JSON only, without Markdown fences.`;

    const suggestionsText = await generateAIText(prompt);
    let suggestionsData;

    try {
      suggestionsData = JSON.parse(suggestionsText);
    } catch (parseError) {
      console.error("Failed to parse suggestions response:", parseError);

      return res.status(502).json({
        success: false,
        message: "AI returned invalid travel suggestions. Please try again.",
      });
    }

    return res.json({
      success: true,
      message: "Travel suggestions generated successfully",
      data: suggestionsData,
    });
  } catch (error) {
    console.error("Get travel suggestions error:", error);

    return res.status(500).json({
      success: false,
      message: "Error generating travel suggestions",
      error:
        process.env.NODE_ENV === "development"
          ? error.message
          : "Internal server error",
    });
  }
};

// @desc    Generate destination insights
// @route   POST /api/ai/destination-insights
// @access  Private
const getDestinationInsights = async (req, res) => {
  try {
    const { destination, travelDates } = req.body;

    if (!destination) {
      return res.status(400).json({
        success: false,
        message: "Destination is required",
      });
    }

    const prompt = `Provide comprehensive travel insights for ${destination} for travel dates: ${
      travelDates || "flexible"
    }.

Return ONLY valid JSON in this format:
{
  "destination": "${destination}",
  "overview": "Brief description of the destination",
  "weather": {
    "currentSeason": "Season name",
    "averageTemperature": "Temperature range",
    "rainfall": "Rainfall information",
    "bestMonths": ["Month 1", "Month 2"]
  },
  "costOfLiving": {
    "level": "low/moderate/high",
    "averageMealCost": "Cost range",
    "accommodation": "Price range",
    "transport": "Cost information"
  },
  "culture": {
    "language": "Primary language",
    "currency": "Local currency",
    "religion": "Relevant cultural context",
    "customs": ["Custom 1", "Custom 2"],
    "etiquette": ["Tip 1", "Tip 2"]
  },
  "topAttractions": [
    {
      "name": "Attraction name",
      "type": "museum/landmark/nature",
      "description": "Brief description",
      "averageVisitTime": "Time needed"
    }
  ],
  "localCuisine": [
    {
      "dish": "Dish name",
      "description": "What it is",
      "where": "Where to find it"
    }
  ],
  "transportation": {
    "publicTransport": "Description",
    "ridesharing": "Availability",
    "walkability": "Walkability information",
    "tips": ["Tip 1", "Tip 2"]
  },
  "safety": {
    "level": "low/moderate/high risk",
    "commonIssues": ["Issue 1", "Issue 2"],
    "tips": ["Safety tip 1", "Safety tip 2"]
  },
  "packingTips": ["Item 1", "Item 2", "Item 3"]
}

Return JSON only, without Markdown fences or additional commentary.`;

    const insightsText = await generateAIText(prompt);
    let insightsData;

    try {
      insightsData = JSON.parse(insightsText);
    } catch (parseError) {
      console.error("Failed to parse insights response:", parseError);

      return res.status(502).json({
        success: false,
        message: "AI returned invalid destination insights. Please try again.",
      });
    }

    return res.json({
      success: true,
      message: "Destination insights generated successfully",
      data: insightsData,
    });
  } catch (error) {
    console.error("Get destination insights error:", error);

    return res.status(500).json({
      success: false,
      message: "Error generating destination insights",
      error:
        process.env.NODE_ENV === "development"
          ? error.message
          : "Internal server error",
    });
  }
};

// @desc    Get AI-powered trip recommendations
// @route   GET /api/ai/recommendations
// @route   POST /api/ai/recommendations/refresh
// @access  Private
const getRecommendations = async (req, res) => {
  try {
    const recommendations = getDummyRecommendations();

    return res.status(200).json({
      success: true,
      data: recommendations,
      refreshed: req.method === "POST",
    });
  } catch (error) {
    logger.error("Error getting recommendations:", error);

    return res.status(500).json({
      success: false,
      message:
        process.env.NODE_ENV === "development"
          ? error.message
          : "Internal server error",
    });
  }
};

// Helper: Get random dummy recommendations from a list of destinations
function getDummyRecommendations() {
  const allDestinations = [
    {
      destination: "Paris, France",
      highlights: "Eiffel Tower, Louvre Museum, Seine River Cruise",
      duration: 5,
      estimatedCost: { min: 80000, max: 150000, currency: "INR" },
    },
    {
      destination: "Tokyo, Japan",
      highlights: "Mount Fuji, Ancient Temples, Cherry Blossoms",
      duration: 6,
      estimatedCost: { min: 90000, max: 180000, currency: "INR" },
    },
    {
      destination: "Bali, Indonesia",
      highlights: "Pristine Beaches, Sacred Temples, Rice Terraces",
      duration: 4,
      estimatedCost: { min: 40000, max: 80000, currency: "INR" },
    },
    {
      destination: "Dubai, UAE",
      highlights: "Burj Khalifa, Desert Safari, Luxury Shopping",
      duration: 4,
      estimatedCost: { min: 60000, max: 120000, currency: "INR" },
    },
    {
      destination: "Goa, India",
      highlights: "Golden Beaches, Portuguese Heritage, Vibrant Nightlife",
      duration: 3,
      estimatedCost: { min: 15000, max: 35000, currency: "INR" },
    },
    {
      destination: "Maldives",
      highlights: "Overwater Villas, Coral Reefs, Luxury Resorts",
      duration: 5,
      estimatedCost: { min: 100000, max: 250000, currency: "INR" },
    },
    {
      destination: "Santorini, Greece",
      highlights: "White-washed Buildings, Sunset Views, Aegean Sea",
      duration: 4,
      estimatedCost: { min: 70000, max: 140000, currency: "INR" },
    },
    {
      destination: "New York, USA",
      highlights: "Statue of Liberty, Times Square, Central Park",
      duration: 6,
      estimatedCost: { min: 120000, max: 220000, currency: "INR" },
    },
    {
      destination: "Jaipur, India",
      highlights: "Pink City, Amber Fort, Royal Palaces",
      duration: 3,
      estimatedCost: { min: 12000, max: 30000, currency: "INR" },
    },
    {
      destination: "Barcelona, Spain",
      highlights: "Sagrada Familia, Gothic Quarter, Mediterranean Beaches",
      duration: 5,
      estimatedCost: { min: 75000, max: 145000, currency: "INR" },
    },
    {
      destination: "Singapore",
      highlights: "Marina Bay Sands, Gardens by the Bay, Hawker Centers",
      duration: 4,
      estimatedCost: { min: 55000, max: 110000, currency: "INR" },
    },
    {
      destination: "Kerala, India",
      highlights: "Backwaters, Hill Stations, Ayurvedic Retreats",
      duration: 5,
      estimatedCost: { min: 20000, max: 45000, currency: "INR" },
    },
    {
      destination: "London, England",
      highlights: "Big Ben, British Museum, Thames River",
      duration: 5,
      estimatedCost: { min: 95000, max: 175000, currency: "INR" },
    },
    {
      destination: "Phuket, Thailand",
      highlights: "Tropical Beaches, Island Hopping, Thai Cuisine",
      duration: 5,
      estimatedCost: { min: 45000, max: 90000, currency: "INR" },
    },
    {
      destination: "Manali, India",
      highlights: "Snow-capped Mountains, Adventure Sports, Himalayan Views",
      duration: 4,
      estimatedCost: { min: 18000, max: 40000, currency: "INR" },
    },
  ];

  return allDestinations
    .sort(() => Math.random() - 0.5)
    .slice(0, 3);
}

module.exports = {
  generateItinerary,
  optimizeItinerary,
  getTravelSuggestions,
  getDestinationInsights,
  getRecommendations,
};

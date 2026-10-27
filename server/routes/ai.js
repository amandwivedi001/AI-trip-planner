const express = require("express");
const { body } = require("express-validator");
const {
  generateItinerary,
  optimizeItinerary,
  getTravelSuggestions,
  getDestinationInsights,
  getRecommendations,
} = require("../controllers/aiController");
const { protect } = require("../middleware/auth");

const router = express.Router();

// Validation middleware for itinerary generation
const generateItineraryValidation = [
  body("destination").notEmpty().trim().withMessage("Destination is required"),
  body("duration")
    .isInt({ min: 1, max: 30 })
    .withMessage("Duration must be between 1 and 30 days"),
  body("budget.min")
    .optional()
    .isNumeric()
    .withMessage("Minimum budget must be a number"),
  body("budget.max").isNumeric().withMessage("Maximum budget must be a number"),
  body("groupSize")
    .optional()
    .isInt({ min: 1, max: 20 })
    .withMessage("Group size must be between 1 and 20"),
];

// @route   POST /api/ai/generate-itinerary
// @desc    Generate AI-powered trip itinerary
// @access  Private
router.post(
  "/generate-itinerary",
  protect,
  generateItineraryValidation,
  generateItinerary
);

// @route   POST /api/ai/optimize-itinerary
// @desc    Optimize existing itinerary
// @access  Private
router.post("/optimize-itinerary", protect, optimizeItinerary);

// @route   POST /api/ai/travel-suggestions
// @desc    Get AI-powered travel suggestions
// @access  Private
router.post("/travel-suggestions", protect, getTravelSuggestions);

// @route   POST /api/ai/destination-insights
// @desc    Get destination insights and information
// @access  Private
router.post("/destination-insights", protect, getDestinationInsights);

// @route   GET /api/ai/recommendations
// @desc    Get AI-powered trip recommendations
// @access  Private
router.get("/recommendations", protect, getRecommendations);

// @route   POST /api/ai/recommendations/refresh
// @desc    Refresh AI-powered trip recommendations (clears cache)
// @access  Private
router.post("/recommendations/refresh", protect, getRecommendations);

module.exports = router;

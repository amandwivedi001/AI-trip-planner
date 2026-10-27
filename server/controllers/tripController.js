const { validationResult } = require("express-validator");
const Trip = require("../models/Trip");
const User = require("../models/User");

// @desc    Create a new trip
// @route   POST /api/trips
// @access  Private
const createTrip = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: errors.array(),
      });
    }

    const {
      title,
      description,
      destination,
      preferences,
      itinerary,
      startDate,
      endDate,
      notes,
      isPublic,
      tags,
      status,
    } = req.body;

    // Determine status based on new rules
    // If status is explicitly provided, use it
    // If itinerary.days exists and has length > 0, set to 'upcoming', else 'draft'
    let tripStatus;
    if (status) {
      tripStatus = status;
    } else if (
      itinerary &&
      Array.isArray(itinerary.days) &&
      itinerary.days.length > 0
    ) {
      tripStatus = "upcoming";
    } else {
      tripStatus = "draft";
    }

    // Create trip
    const trip = await Trip.create({
      user: req.user.id,
      title,
      description,
      destination,
      preferences,
      itinerary,
      status: tripStatus,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      notes,
      isPublic: isPublic || false,
      tags: tags || [],
    });

    // Populate user information
    await trip.populate("user", "name email avatar");

    res.status(201).json({
      success: true,
      message: "Trip created successfully",
      trip,
    });
  } catch (error) {
    console.error("Create trip error:", error);
    console.error("Error stack:", error.stack);
    console.error("Error name:", error.name);
    res.status(500).json({
      success: false,
      message: "Error creating trip",
      error:
        process.env.NODE_ENV === "development"
          ? error.message
          : "Internal server error",
    });
  }
};

// @desc    Get all trips for logged in user
// @route   GET /api/trips
// @access  Private
const getTrips = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      status,
      destination,
      sortBy = "createdAt",
      sortOrder = "desc",
    } = req.query;

    console.log("GetTrips called for user:", req.user.id);

    // Build query
    const query = { user: req.user.id };

    if (status) {
      query.status = status;
    }

    if (destination) {
      query.$or = [
        { "destination.city": { $regex: destination, $options: "i" } },
        { "destination.country": { $regex: destination, $options: "i" } },
      ];
    }

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const sort = { [sortBy]: sortOrder === "desc" ? -1 : 1 };

    console.log("Query:", JSON.stringify(query));
    console.log("Sort:", sort);

    // Get trips with pagination
    const trips = await Trip.find(query)
      .populate("user", "name email avatar")
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    console.log(`Found ${trips.length} trips`);

    // Get total count for pagination
    const total = await Trip.countDocuments(query);

    // Calculate pagination info
    const totalPages = Math.ceil(total / parseInt(limit));
    const hasNextPage = parseInt(page) < totalPages;
    const hasPrevPage = parseInt(page) > 1;

    res.json({
      success: true,
      trips,
      pagination: {
        currentPage: parseInt(page),
        totalPages,
        totalTrips: total,
        hasNextPage,
        hasPrevPage,
        limit: parseInt(limit),
      },
    });
  } catch (error) {
    console.error("Get trips error:", error);
    console.error("Error stack:", error.stack);
    console.error("Error message:", error.message);
    res.status(500).json({
      success: false,
      message: "Error fetching trips",
      error:
        process.env.NODE_ENV === "development"
          ? error.message
          : "Internal server error",
    });
  }
};

// @desc    Get single trip by ID
// @route   GET /api/trips/:id
// @access  Private
const getTripById = async (req, res) => {
  try {
    console.log("GetTripById called for trip:", req.params.id);

    const trip = await Trip.findById(req.params.id)
      .populate("user", "name email avatar")
      .lean();

    console.log("Trip found:", trip ? "Yes" : "No");

    if (!trip) {
      return res.status(404).json({
        success: false,
        message: "Trip not found",
      });
    }

    // Check if user owns the trip or trip is public
    if (trip.user._id.toString() !== req.user.id && !trip.isPublic) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to access this trip",
      });
    }

    res.json({
      success: true,
      trip,
    });
  } catch (error) {
    console.error("Get trip by ID error:", error);
    console.error("Error stack:", error.stack);
    console.error("Error message:", error.message);

    if (error.name === "CastError") {
      return res.status(404).json({
        success: false,
        message: "Trip not found",
      });
    }

    res.status(500).json({
      success: false,
      message: "Error fetching trip",
      error:
        process.env.NODE_ENV === "development"
          ? error.message
          : "Internal server error",
    });
  }
};

// @desc    Update trip
// @route   PUT /api/trips/:id
// @access  Private
const updateTrip = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: errors.array(),
      });
    }

    let trip = await Trip.findById(req.params.id);

    if (!trip) {
      return res.status(404).json({
        success: false,
        message: "Trip not found",
      });
    }

    // Check if user owns the trip
    if (trip.user.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to update this trip",
      });
    }

    const {
      title,
      description,
      destination,
      preferences,
      itinerary,
      startDate,
      endDate,
      notes,
      isPublic,
      tags,
      status,
    } = req.body;

    // Update fields if provided
    const updateData = {};
    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (destination !== undefined) updateData.destination = destination;
    if (preferences !== undefined) updateData.preferences = preferences;
    if (itinerary !== undefined) updateData.itinerary = itinerary;
    if (startDate !== undefined)
      updateData.startDate = startDate ? new Date(startDate) : null;
    if (endDate !== undefined)
      updateData.endDate = endDate ? new Date(endDate) : null;
    if (notes !== undefined) updateData.notes = notes;
    if (isPublic !== undefined) updateData.isPublic = isPublic;
    if (tags !== undefined) updateData.tags = tags;
    
    // Determine status based on new rules
    // If status is explicitly provided, use it
    // If itinerary.days exists and has length > 0, set to 'upcoming', else 'draft'
    if (status !== undefined) {
      updateData.status = status;
    } else if (itinerary !== undefined) {
      // Auto-determine status when itinerary is being updated
      if (
        itinerary &&
        Array.isArray(itinerary.days) &&
        itinerary.days.length > 0
      ) {
        updateData.status = "upcoming";
      } else {
        updateData.status = "draft";
      }
    }

    trip = await Trip.findByIdAndUpdate(req.params.id, updateData, {
      new: true,
      runValidators: true,
    }).populate("user", "name email avatar");

    res.json({
      success: true,
      message: "Trip updated successfully",
      trip,
    });
  } catch (error) {
    console.error("Update trip error:", error);

    if (error.name === "CastError") {
      return res.status(404).json({
        success: false,
        message: "Trip not found",
      });
    }

    res.status(500).json({
      success: false,
      message: "Error updating trip",
      error:
        process.env.NODE_ENV === "development"
          ? error.message
          : "Internal server error",
    });
  }
};

// @desc    Delete trip
// @route   DELETE /api/trips/:id
// @access  Private
const deleteTrip = async (req, res) => {
  try {
    const trip = await Trip.findById(req.params.id);

    if (!trip) {
      return res.status(404).json({
        success: false,
        message: "Trip not found",
      });
    }

    // Check if user owns the trip
    if (trip.user.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to delete this trip",
      });
    }

    await Trip.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: "Trip deleted successfully",
    });
  } catch (error) {
    console.error("Delete trip error:", error);

    if (error.name === "CastError") {
      return res.status(404).json({
        success: false,
        message: "Trip not found",
      });
    }

    res.status(500).json({
      success: false,
      message: "Error deleting trip",
      error:
        process.env.NODE_ENV === "development"
          ? error.message
          : "Internal server error",
    });
  }
};

// @desc    Get public trips (for discovery)
// @route   GET /api/trips/public
// @access  Public
const getPublicTrips = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      destination,
      travelStyle,
      sortBy = "createdAt",
      sortOrder = "desc",
    } = req.query;

    // Build query for public trips
    const query = { isPublic: true };

    if (destination) {
      query.$or = [
        { "destination.city": { $regex: destination, $options: "i" } },
        { "destination.country": { $regex: destination, $options: "i" } },
      ];
    }

    if (travelStyle) {
      query["preferences.travelStyle"] = travelStyle;
    }

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const sort = { [sortBy]: sortOrder === "desc" ? -1 : 1 };

    // Get public trips
    const trips = await Trip.find(query)
      .populate("user", "name avatar")
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit));

    // Get total count
    const total = await Trip.countDocuments(query);

    // Calculate pagination info
    const totalPages = Math.ceil(total / parseInt(limit));
    const hasNextPage = parseInt(page) < totalPages;
    const hasPrevPage = parseInt(page) > 1;

    res.json({
      success: true,
      trips,
      pagination: {
        currentPage: parseInt(page),
        totalPages,
        totalTrips: total,
        hasNextPage,
        hasPrevPage,
        limit: parseInt(limit),
      },
    });
  } catch (error) {
    console.error("Get public trips error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching public trips",
      error:
        process.env.NODE_ENV === "development"
          ? error.message
          : "Internal server error",
    });
  }
};

// @desc    Clone/copy a public trip
// @route   POST /api/trips/:id/clone
// @access  Private
const cloneTrip = async (req, res) => {
  try {
    const originalTrip = await Trip.findById(req.params.id);

    if (!originalTrip) {
      return res.status(404).json({
        success: false,
        message: "Trip not found",
      });
    }

    // Check if trip is public or user owns it
    if (
      !originalTrip.isPublic &&
      originalTrip.user.toString() !== req.user.id
    ) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to clone this trip",
      });
    }

    // Create cloned trip
    const clonedTripData = {
      user: req.user.id,
      title: `${originalTrip.title} (Copy)`,
      description: originalTrip.description,
      destination: originalTrip.destination,
      preferences: originalTrip.preferences,
      itinerary: originalTrip.itinerary,
      recommendations: originalTrip.recommendations,
      notes: originalTrip.notes,
      tags: originalTrip.tags,
      status: "draft", // Reset status to draft
      isPublic: false, // Make private by default
    };

    const clonedTrip = await Trip.create(clonedTripData);
    await clonedTrip.populate("user", "name email avatar");

    res.status(201).json({
      success: true,
      message: "Trip cloned successfully",
      trip: clonedTrip,
    });
  } catch (error) {
    console.error("Clone trip error:", error);

    if (error.name === "CastError") {
      return res.status(404).json({
        success: false,
        message: "Trip not found",
      });
    }

    res.status(500).json({
      success: false,
      message: "Error cloning trip",
      error:
        process.env.NODE_ENV === "development"
          ? error.message
          : "Internal server error",
    });
  }
};

// @desc    Get trip statistics for user
// @route   GET /api/trips/stats
// @access  Private
const getTripStats = async (req, res) => {
  try {
    const userId = req.user.id;

    // Get trip statistics
    const stats = await Trip.aggregate([
      { $match: { user: userId } },
      {
        $group: {
          _id: null,
          totalTrips: { $sum: 1 },
          completedTrips: {
            $sum: { $cond: [{ $eq: ["$status", "completed"] }, 1, 0] },
          },
          ongoingTrips: {
            $sum: { $cond: [{ $eq: ["$status", "ongoing"] }, 1, 0] },
          },
          plannedTrips: {
            $sum: { $cond: [{ $eq: ["$status", "draft"] }, 1, 0] },
          },
          totalCost: {
            $sum: "$itinerary.totalCost.amount",
          },
          averageDuration: {
            $avg: "$preferences.duration",
          },
        },
      },
    ]);

    // Get trip by travel style
    const travelStyleStats = await Trip.aggregate([
      { $match: { user: userId } },
      {
        $group: {
          _id: "$preferences.travelStyle",
          count: { $sum: 1 },
        },
      },
    ]);

    // Get trips by destination (top 5)
    const destinationStats = await Trip.aggregate([
      { $match: { user: userId } },
      {
        $group: {
          _id: "$destination.country",
          count: { $sum: 1 },
        },
      },
      { $sort: { count: -1 } },
      { $limit: 5 },
    ]);

    const result = {
      overview: stats[0] || {
        totalTrips: 0,
        completedTrips: 0,
        ongoingTrips: 0,
        plannedTrips: 0,
        totalCost: 0,
        averageDuration: 0,
      },
      travelStyleBreakdown: travelStyleStats,
      topDestinations: destinationStats,
    };

    res.json({
      success: true,
      stats: result,
    });
  } catch (error) {
    console.error("Get trip stats error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching trip statistics",
      error:
        process.env.NODE_ENV === "development"
          ? error.message
          : "Internal server error",
    });
  }
};

module.exports = {
  createTrip,
  getTrips,
  getTripById,
  updateTrip,
  deleteTrip,
  getPublicTrips,
  cloneTrip,
  getTripStats,
};

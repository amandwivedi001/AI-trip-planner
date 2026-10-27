const express = require('express');
const User = require('../models/User');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

// @route   GET /api/users/profile
// @desc    Get current user profile
// @access  Private
router.get('/profile', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    res.json({
      success: true,
      user
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching profile'
    });
  }
});

// @route   PUT /api/users/profile
// @desc    Update user profile
// @access  Private
router.put('/profile', protect, async (req, res) => {
  try {
    const { name, phone, dateOfBirth, preferences } = req.body;

    const user = await User.findByIdAndUpdate(
      req.user.id,
      {
        ...(name && { name }),
        ...(phone && { phone }),
        ...(dateOfBirth && { dateOfBirth: new Date(dateOfBirth) }),
        ...(preferences && { preferences })
      },
      { new: true, runValidators: true }
    );

    res.json({
      success: true,
      message: 'Profile updated successfully',
      user
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating profile'
    });
  }
});

// @route   GET /api/users/saved-destinations
// @desc    Get user's saved destinations
// @access  Private
router.get('/saved-destinations', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    res.json({
      success: true,
      savedDestinations: user.savedDestinations
    });
  } catch (error) {
    console.error('Get saved destinations error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching saved destinations'
    });
  }
});

// @route   POST /api/users/saved-destinations
// @desc    Add saved destination
// @access  Private
router.post('/saved-destinations', protect, async (req, res) => {
  try {
    const { name, lat, lng } = req.body;

    if (!name || !lat || !lng) {
      return res.status(400).json({
        success: false,
        message: 'Name, latitude, and longitude are required'
      });
    }

    const user = await User.findById(req.user.id);
    user.savedDestinations.push({
      name,
      coordinates: { lat: parseFloat(lat), lng: parseFloat(lng) }
    });
    await user.save();

    res.json({
      success: true,
      message: 'Destination saved successfully',
      savedDestinations: user.savedDestinations
    });
  } catch (error) {
    console.error('Add saved destination error:', error);
    res.status(500).json({
      success: false,
      message: 'Error saving destination'
    });
  }
});

// @route   DELETE /api/users/saved-destinations/:id
// @desc    Remove saved destination
// @access  Private
router.delete('/saved-destinations/:id', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    user.savedDestinations = user.savedDestinations.filter(
      dest => dest._id.toString() !== req.params.id
    );
    await user.save();

    res.json({
      success: true,
      message: 'Destination removed successfully',
      savedDestinations: user.savedDestinations
    });
  } catch (error) {
    console.error('Remove saved destination error:', error);
    res.status(500).json({
      success: false,
      message: 'Error removing destination'
    });
  }
});

// Admin routes
// @route   GET /api/users
// @desc    Get all users (Admin only)
// @access  Private/Admin
router.get('/', protect, authorize('admin'), async (req, res) => {
  try {
    const { page = 1, limit = 10, search } = req.query;
    
    const filter = {};
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const users = await User.find(filter)
      .select('-password')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await User.countDocuments(filter);

    res.json({
      success: true,
      count: users.length,
      total,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / parseInt(limit)),
        hasNext: skip + users.length < total,
        hasPrev: parseInt(page) > 1
      },
      users
    });

  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching users'
    });
  }
});

// @route   GET /api/users/:id
// @desc    Get user by ID (Admin only)
// @access  Private/Admin
router.get('/:id', protect, authorize('admin'), async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      user
    });

  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching user'
    });
  }
});

// @route   PUT /api/users/:id
// @desc    Update user (Admin only)
// @access  Private/Admin
router.put('/:id', protect, authorize('admin'), async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      message: 'User updated successfully',
      user
    });

  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating user'
    });
  }
});

// @route   DELETE /api/users/:id
// @desc    Delete user (Admin only)
// @access  Private/Admin
router.delete('/:id', protect, authorize('admin'), async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      message: 'User deleted successfully'
    });

  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting user'
    });
  }
});

module.exports = router;

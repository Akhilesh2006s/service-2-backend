import express from 'express';
import { body, validationResult } from 'express-validator';
import User from '../models/User.js';
import Organization from '../models/Organization.js';
import Employee from '../models/Employee.js';
import { generateToken, verifyToken } from '../middleware/auth.js';

const router = express.Router();

// Validation rules
const registerValidation = [
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('role').isIn(['organization', 'employee']).withMessage('Role must be either organization or employee')
];

const loginValidation = [
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('password').notEmpty().withMessage('Password is required')
];

// @route   POST /api/auth/register
// @desc    Register a new user
// @access  Public
router.post('/register', registerValidation, async (req, res) => {
  try {
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        status: 'error',
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { email, password, role, ...additionalData } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        status: 'error',
        message: 'User already exists with this email'
      });
    }

    // Create user
    const user = new User({ email, password, role });
    await user.save();

    // Create profile based on role
    let profile;
    if (role === 'organization') {
      profile = new Organization({
        user: user._id,
        name: additionalData.name || 'New Organization',
        description: additionalData.description || 'Organization description',
        industry: additionalData.industry || 'Technology',
        size: additionalData.size || '1-10',
        location: {
          address: additionalData.address || 'Not specified',
          city: additionalData.city || 'Not specified',
          state: additionalData.state || 'Not specified',
          country: additionalData.country || 'Not specified'
        },
        contact: {
          email: email
        }
      });
    } else {
      profile = new Employee({
        user: user._id,
        personalInfo: {
          firstName: additionalData.firstName || 'User',
          lastName: additionalData.lastName || 'Name',
          dateOfBirth: additionalData.dateOfBirth || new Date('1990-01-01'),
          phone: additionalData.phone || 'Not specified'
        },
        location: {
          address: additionalData.address || 'Not specified',
          city: additionalData.city || 'Not specified',
          state: additionalData.state || 'Not specified',
          country: additionalData.country || 'Not specified'
        }
      });
    }

    await profile.save();

    // Generate token
    const token = generateToken(user._id);

    res.status(201).json({
      status: 'success',
      message: 'User registered successfully',
      data: {
        user: {
          id: user._id,
          email: user.email,
          role: user.role,
          emailVerified: user.emailVerified
        },
        profile: profile,
        token
      }
    });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Registration failed',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// @route   POST /api/auth/login
// @desc    Login user
// @access  Public
router.post('/login', loginValidation, async (req, res) => {
  try {
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        status: 'error',
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { email, password } = req.body;

    // Find user and include password for comparison
    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      return res.status(401).json({
        status: 'error',
        message: 'Invalid credentials'
      });
    }

    // Check if account is active
    if (!user.isActive) {
      return res.status(401).json({
        status: 'error',
        message: 'Account is deactivated'
      });
    }

    // Compare password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({
        status: 'error',
        message: 'Invalid credentials'
      });
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    // Get user profile
    let profile;
    if (user.role === 'organization') {
      profile = await Organization.findOne({ user: user._id });
    } else {
      profile = await Employee.findOne({ user: user._id });
    }

    // Generate token
    const token = generateToken(user._id);

    res.json({
      status: 'success',
      message: 'Login successful',
      data: {
        user: {
          id: user._id,
          email: user.email,
          role: user.role,
          emailVerified: user.emailVerified,
          lastLogin: user.lastLogin
        },
        profile: profile,
        token
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Login failed',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// @route   GET /api/auth/me
// @desc    Get current user profile
// @access  Private
router.get('/me', verifyToken, async (req, res) => {
  try {
    let profile;
    if (req.user.role === 'organization') {
      profile = await Organization.findOne({ user: req.user._id });
    } else {
      profile = await Employee.findOne({ user: req.user._id });
    }

    res.json({
      status: 'success',
      data: {
        user: req.user,
        profile: profile
      }
    });

  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to get profile',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// @route   POST /api/auth/logout
// @desc    Logout user (client-side token removal)
// @access  Private
router.post('/logout', verifyToken, (req, res) => {
  res.json({
    status: 'success',
    message: 'Logout successful'
  });
});

// @route   POST /api/auth/refresh
// @desc    Refresh JWT token
// @access  Private
router.post('/refresh', verifyToken, (req, res) => {
  try {
    const token = generateToken(req.user._id);
    
    res.json({
      status: 'success',
      message: 'Token refreshed successfully',
      data: {
        token
      }
    });

  } catch (error) {
    console.error('Token refresh error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Token refresh failed',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

export default router;


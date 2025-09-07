import express from 'express';
import { body, validationResult } from 'express-validator';
import Employee from '../models/Employee.js';
import Opportunity from '../models/Opportunity.js';
import Application from '../models/Application.js';
import Organization from '../models/Organization.js';
import { verifyToken, requireRole } from '../middleware/auth.js';
import { uploadSingle, uploadMultiple, handleUploadError } from '../middleware/upload.js';

const router = express.Router();

// Apply authentication and role check to all routes
router.use(verifyToken);
router.use(requireRole(['employee']));

// @route   GET /api/employees/dashboard
// @desc    Get employee dashboard data
// @access  Private (Employee)
router.get('/dashboard', async (req, res) => {
  try {
    const employee = await Employee.findOne({ user: req.user._id });
    
    if (!employee) {
      return res.status(404).json({
        status: 'error',
        message: 'Employee profile not found'
      });
    }

    // Get dashboard statistics
    const totalApplications = await Application.countDocuments({ 
      employee: employee._id,
      isActive: true 
    });
    
    const pendingApplications = await Application.countDocuments({ 
      employee: employee._id,
      status: { $in: ['submitted', 'under-review'] },
      isActive: true 
    });
    
    const shortlistedApplications = await Application.countDocuments({ 
      employee: employee._id,
      status: 'shortlisted',
      isActive: true 
    });
    
    const acceptedApplications = await Application.countDocuments({ 
      employee: employee._id,
      status: 'accepted',
      isActive: true 
    });

    // Get recent applications
    const recentApplications = await Application.find({ 
      employee: employee._id,
      isActive: true 
    })
    .populate('opportunity', 'title type organization')
    .populate('organization', 'name logo')
    .sort({ createdAt: -1 })
    .limit(10);

    // Get recommended opportunities based on skills and preferences
    const recommendedOpportunities = await Opportunity.find({
      status: 'active',
      isActive: true,
      'application.deadline': { $gt: new Date() }
    })
    .populate('organization', 'name logo industry')
    .sort({ createdAt: -1 })
    .limit(5);

    res.json({
      status: 'success',
      data: {
        employee,
        stats: {
          totalApplications,
          pendingApplications,
          shortlistedApplications,
          acceptedApplications
        },
        recentApplications,
        recommendedOpportunities
      }
    });

  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch dashboard data',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// @route   GET /api/employees/profile
// @desc    Get employee profile
// @access  Private (Employee)
router.get('/profile', async (req, res) => {
  try {
    const employee = await Employee.findOne({ user: req.user._id });
    
    if (!employee) {
      return res.status(404).json({
        status: 'error',
        message: 'Employee profile not found'
      });
    }

    res.json({
      status: 'success',
      data: { employee }
    });

  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch profile',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// @route   PUT /api/employees/profile
// @desc    Update employee profile
// @access  Private (Employee)
router.put('/profile', [
  body('personalInfo.firstName').optional().trim().isLength({ min: 1 }).withMessage('First name is required'),
  body('personalInfo.lastName').optional().trim().isLength({ min: 1 }).withMessage('Last name is required'),
  body('personalInfo.phone').optional().trim().isLength({ min: 10 }).withMessage('Valid phone number is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        status: 'error',
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const employee = await Employee.findOne({ user: req.user._id });
    
    if (!employee) {
      return res.status(404).json({
        status: 'error',
        message: 'Employee profile not found'
      });
    }

    // Update employee fields
    const allowedUpdates = ['personalInfo', 'location', 'education', 'experience', 'skills', 'preferences', 'socialProfiles'];
    allowedUpdates.forEach(field => {
      if (req.body[field] !== undefined) {
        if (field === 'education' || field === 'experience' || field === 'skills') {
          employee[field] = req.body[field];
        } else {
          Object.assign(employee[field], req.body[field]);
        }
      }
    });

    // Check if profile is complete
    const isComplete = employee.personalInfo.firstName && 
                      employee.personalInfo.lastName && 
                      employee.personalInfo.phone &&
                      employee.location.city &&
                      employee.skills.length > 0;
    
    employee.isProfileComplete = isComplete;
    await employee.save();

    res.json({
      status: 'success',
      message: 'Profile updated successfully',
      data: { employee }
    });

  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to update profile',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// @route   POST /api/employees/upload-profile-picture
// @desc    Upload profile picture
// @access  Private (Employee)
router.post('/upload-profile-picture', uploadSingle('profilePicture'), handleUploadError, async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        status: 'error',
        message: 'No file uploaded'
      });
    }

    const employee = await Employee.findOne({ user: req.user._id });
    
    if (!employee) {
      return res.status(404).json({
        status: 'error',
        message: 'Employee profile not found'
      });
    }

    // Update profile picture
    employee.personalInfo.profilePicture = {
      public_id: req.file.public_id,
      url: req.file.path
    };

    await employee.save();

    res.json({
      status: 'success',
      message: 'Profile picture uploaded successfully',
      data: { profilePicture: employee.personalInfo.profilePicture }
    });

  } catch (error) {
    console.error('Upload profile picture error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to upload profile picture',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// @route   POST /api/employees/upload-documents
// @desc    Upload documents (resume, certificates, etc.)
// @access  Private (Employee)
router.post('/upload-documents', uploadMultiple('documents', 5), handleUploadError, async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        status: 'error',
        message: 'No files uploaded'
      });
    }

    const employee = await Employee.findOne({ user: req.user._id });
    
    if (!employee) {
      return res.status(404).json({
        status: 'error',
        message: 'Employee profile not found'
      });
    }

    // Add new documents
    const newDocuments = req.files.map(file => ({
      name: file.originalname,
      type: req.body.type || 'other',
      public_id: file.public_id,
      url: file.path
    }));

    employee.documents.push(...newDocuments);
    await employee.save();

    res.json({
      status: 'success',
      message: 'Documents uploaded successfully',
      data: { documents: employee.documents }
    });

  } catch (error) {
    console.error('Upload documents error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to upload documents',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// @route   GET /api/employees/opportunities
// @desc    Search and filter opportunities
// @access  Private (Employee)
router.get('/opportunities', async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      search, 
      type, 
      location, 
      industry,
      compensation,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;
    
    const skip = (page - 1) * limit;

    // Build search filter
    const filter = { 
      status: 'active', 
      isActive: true,
      'application.deadline': { $gt: new Date() }
    };

    if (search) {
      filter.$text = { $search: search };
    }
    
    if (type) filter.type = type;
    if (industry) filter.organization = { $in: await Organization.find({ industry }).select('_id') };
    if (location) filter['location.city'] = new RegExp(location, 'i');
    if (compensation) filter['compensation.type'] = compensation;

    // Build sort object
    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    const opportunities = await Opportunity.find(filter)
      .populate('organization', 'name logo industry size location')
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Opportunity.countDocuments(filter);

    res.json({
      status: 'success',
      data: {
        opportunities,
        pagination: {
          current: parseInt(page),
          pages: Math.ceil(total / limit),
          total
        }
      }
    });

  } catch (error) {
    console.error('Search opportunities error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to search opportunities',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// @route   GET /api/employees/applications
// @desc    Get employee's applications
// @access  Private (Employee)
router.get('/applications', async (req, res) => {
  try {
    const employee = await Employee.findOne({ user: req.user._id });
    
    if (!employee) {
      return res.status(404).json({
        status: 'error',
        message: 'Employee profile not found'
      });
    }

    const { page = 1, limit = 10, status } = req.query;
    const skip = (page - 1) * limit;

    // Build filter
    const filter = { employee: employee._id, isActive: true };
    if (status) filter.status = status;

    const applications = await Application.find(filter)
      .populate('opportunity', 'title type organization')
      .populate('organization', 'name logo')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Application.countDocuments(filter);

    res.json({
      status: 'success',
      data: {
        applications,
        pagination: {
          current: parseInt(page),
          pages: Math.ceil(total / limit),
          total
        }
      }
    });

  } catch (error) {
    console.error('Get applications error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch applications',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// @route   GET /api/employees/saved-opportunities
// @desc    Get saved opportunities (favorites)
// @access  Private (Employee)
router.get('/saved-opportunities', async (req, res) => {
  try {
    const employee = await Employee.findOne({ user: req.user._id });
    
    if (!employee) {
      return res.status(404).json({
        status: 'error',
        message: 'Employee profile not found'
      });
    }

    // For now, we'll implement a simple saved opportunities system
    // In a real app, you might want a separate SavedOpportunity model
    const { page = 1, limit = 10 } = req.query;
    const skip = (page - 1) * limit;

    // This is a placeholder - you'd need to implement actual saving functionality
    const savedOpportunities = [];

    res.json({
      status: 'success',
      data: {
        opportunities: savedOpportunities,
        pagination: {
          current: parseInt(page),
          pages: 0,
          total: 0
        }
      }
    });

  } catch (error) {
    console.error('Get saved opportunities error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch saved opportunities',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// @route   GET /api/employees/recommendations
// @desc    Get personalized opportunity recommendations
// @access  Private (Employee)
router.get('/recommendations', async (req, res) => {
  try {
    const employee = await Employee.findOne({ user: req.user._id });
    
    if (!employee) {
      return res.status(404).json({
        status: 'error',
        message: 'Employee profile not found'
      });
    }

    // Get employee skills
    const employeeSkills = employee.skills.map(skill => skill.name);
    const employeeIndustries = employee.preferences?.industries || [];

    // Find opportunities that match employee skills and preferences
    const recommendations = await Opportunity.find({
      status: 'active',
      isActive: true,
      'application.deadline': { $gt: new Date() },
      $or: [
        { 'requirements.skills.name': { $in: employeeSkills } },
        { category: { $in: employeeIndustries } }
      ]
    })
    .populate('organization', 'name logo industry')
    .sort({ createdAt: -1 })
    .limit(10);

    res.json({
      status: 'success',
      data: { recommendations }
    });

  } catch (error) {
    console.error('Get recommendations error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch recommendations',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

export default router;


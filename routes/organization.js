import express from 'express';
import { body, validationResult } from 'express-validator';
import Organization from '../models/Organization.js';
import Opportunity from '../models/Opportunity.js';
import Application from '../models/Application.js';
import { verifyToken, requireRole } from '../middleware/auth.js';
import { uploadSingle, uploadMultiple, handleUploadError } from '../middleware/upload.js';

const router = express.Router();

// Apply authentication and role check to all routes
router.use(verifyToken);
router.use(requireRole(['organization']));

// @route   GET /api/organizations/dashboard
// @desc    Get organization dashboard data
// @access  Private (Organization)
router.get('/dashboard', async (req, res) => {
  try {
    const organization = await Organization.findOne({ user: req.user._id });
    
    if (!organization) {
      return res.status(404).json({
        status: 'error',
        message: 'Organization profile not found'
      });
    }

    // Get dashboard statistics
    const totalOpportunities = await Opportunity.countDocuments({ 
      organization: organization._id,
      isActive: true 
    });
    
    const activeOpportunities = await Opportunity.countDocuments({ 
      organization: organization._id,
      status: 'active',
      isActive: true 
    });
    
    const totalApplications = await Application.countDocuments({ 
      organization: organization._id,
      isActive: true 
    });
    
    const pendingApplications = await Application.countDocuments({ 
      organization: organization._id,
      status: 'submitted',
      isActive: true 
    });

    // Get recent applications
    const recentApplications = await Application.find({ 
      organization: organization._id,
      isActive: true 
    })
    .populate('employee', 'personalInfo.firstName personalInfo.lastName personalInfo.profilePicture')
    .populate('opportunity', 'title type')
    .sort({ createdAt: -1 })
    .limit(10);

    // Get opportunities with application counts
    const opportunitiesWithStats = await Opportunity.find({ 
      organization: organization._id,
      isActive: true 
    })
    .select('title type status metrics.applications metrics.views createdAt')
    .sort({ createdAt: -1 })
    .limit(5);

    res.json({
      status: 'success',
      data: {
        organization,
        stats: {
          totalOpportunities,
          activeOpportunities,
          totalApplications,
          pendingApplications
        },
        recentApplications,
        opportunitiesWithStats
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

// @route   GET /api/organizations/profile
// @desc    Get organization profile
// @access  Private (Organization)
router.get('/profile', async (req, res) => {
  try {
    const organization = await Organization.findOne({ user: req.user._id });
    
    if (!organization) {
      return res.status(404).json({
        status: 'error',
        message: 'Organization profile not found'
      });
    }

    res.json({
      status: 'success',
      data: { organization }
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

// @route   PUT /api/organizations/profile
// @desc    Update organization profile
// @access  Private (Organization)
router.put('/profile', [
  body('name').optional().trim().isLength({ min: 1 }).withMessage('Name is required'),
  body('description').optional().isLength({ max: 1000 }).withMessage('Description cannot exceed 1000 characters'),
  body('website').optional().isURL().withMessage('Invalid website URL'),
  body('industry').optional().trim().isLength({ min: 1 }).withMessage('Industry is required'),
  body('size').optional().isIn(['1-10', '11-50', '51-200', '201-500', '500+']).withMessage('Invalid organization size')
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

    const organization = await Organization.findOne({ user: req.user._id });
    
    if (!organization) {
      return res.status(404).json({
        status: 'error',
        message: 'Organization profile not found'
      });
    }

    // Update organization fields
    const allowedUpdates = ['name', 'description', 'website', 'industry', 'size', 'location', 'contact'];
    allowedUpdates.forEach(field => {
      if (req.body[field] !== undefined) {
        organization[field] = req.body[field];
      }
    });

    await organization.save();

    res.json({
      status: 'success',
      message: 'Profile updated successfully',
      data: { organization }
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

// @route   POST /api/organizations/upload-logo
// @desc    Upload organization logo
// @access  Private (Organization)
router.post('/upload-logo', uploadSingle('logo'), handleUploadError, async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        status: 'error',
        message: 'No file uploaded'
      });
    }

    const organization = await Organization.findOne({ user: req.user._id });
    
    if (!organization) {
      return res.status(404).json({
        status: 'error',
        message: 'Organization profile not found'
      });
    }

    // Update logo
    organization.logo = {
      public_id: req.file.public_id,
      url: req.file.path
    };

    await organization.save();

    res.json({
      status: 'success',
      message: 'Logo uploaded successfully',
      data: { logo: organization.logo }
    });

  } catch (error) {
    console.error('Upload logo error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to upload logo',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// @route   POST /api/organizations/upload-images
// @desc    Upload organization images
// @access  Private (Organization)
router.post('/upload-images', uploadMultiple('images', 10), handleUploadError, async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        status: 'error',
        message: 'No files uploaded'
      });
    }

    const organization = await Organization.findOne({ user: req.user._id });
    
    if (!organization) {
      return res.status(404).json({
        status: 'error',
        message: 'Organization profile not found'
      });
    }

    // Add new images
    const newImages = req.files.map(file => ({
      public_id: file.public_id,
      url: file.path,
      caption: ''
    }));

    organization.images.push(...newImages);
    await organization.save();

    res.json({
      status: 'success',
      message: 'Images uploaded successfully',
      data: { images: organization.images }
    });

  } catch (error) {
    console.error('Upload images error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to upload images',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// @route   GET /api/organizations/opportunities
// @desc    Get organization's opportunities
// @access  Private (Organization)
router.get('/opportunities', async (req, res) => {
  try {
    const organization = await Organization.findOne({ user: req.user._id });
    
    if (!organization) {
      return res.status(404).json({
        status: 'error',
        message: 'Organization profile not found'
      });
    }

    const { page = 1, limit = 10, status, type } = req.query;
    const skip = (page - 1) * limit;

    // Build filter
    const filter = { organization: organization._id, isActive: true };
    if (status) filter.status = status;
    if (type) filter.type = type;

    const opportunities = await Opportunity.find(filter)
      .populate('organization', 'name logo')
      .sort({ createdAt: -1 })
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
    console.error('Get opportunities error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch opportunities',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// @route   GET /api/organizations/applications
// @desc    Get applications for organization's opportunities
// @access  Private (Organization)
router.get('/applications', async (req, res) => {
  try {
    const organization = await Organization.findOne({ user: req.user._id });
    
    if (!organization) {
      return res.status(404).json({
        status: 'error',
        message: 'Organization profile not found'
      });
    }

    const { page = 1, limit = 10, status, opportunityId } = req.query;
    const skip = (page - 1) * limit;

    // Build filter
    const filter = { organization: organization._id, isActive: true };
    if (status) filter.status = status;
    if (opportunityId) filter.opportunity = opportunityId;

    const applications = await Application.find(filter)
      .populate('employee', 'personalInfo.firstName personalInfo.lastName personalInfo.profilePicture skills')
      .populate('opportunity', 'title type')
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

// @route   PUT /api/organizations/applications/:applicationId/status
// @desc    Update application status
// @access  Private (Organization)
router.put('/applications/:applicationId/status', [
  body('status').isIn(['submitted', 'under-review', 'shortlisted', 'interview-scheduled', 'interviewed', 'accepted', 'rejected']).withMessage('Invalid status'),
  body('note').optional().trim(),
  body('interviewData').optional().isObject().withMessage('Interview data must be an object')
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

    const organization = await Organization.findOne({ user: req.user._id });
    
    if (!organization) {
      return res.status(404).json({
        status: 'error',
        message: 'Organization profile not found'
      });
    }

    const application = await Application.findOne({
      _id: req.params.applicationId,
      organization: organization._id,
      isActive: true
    });

    if (!application) {
      return res.status(404).json({
        status: 'error',
        message: 'Application not found'
      });
    }

    // Update status and add to timeline
    const oldStatus = application.status;
    application.status = req.body.status;
    
    // Handle interview data
    if (req.body.status === 'interview-scheduled' && req.body.interviewData) {
      application.interviewData = {
        ...req.body.interviewData,
        datetime: new Date(req.body.interviewData.datetime),
        scheduledAt: new Date()
      };
    }
    
    application.timeline.push({
      status: req.body.status,
      note: req.body.note || '',
      updatedBy: req.user._id
    });

    await application.save();

    res.json({
      status: 'success',
      message: 'Application status updated successfully',
      data: { application }
    });

  } catch (error) {
    console.error('Update application status error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to update application status',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

export default router;


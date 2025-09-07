import express from 'express';
import { body, validationResult } from 'express-validator';
import Opportunity from '../models/Opportunity.js';
import Organization from '../models/Organization.js';
import Application from '../models/Application.js';
import { verifyToken, requireRole, optionalAuth } from '../middleware/auth.js';
import { uploadMultiple, handleUploadError } from '../middleware/upload.js';

const router = express.Router();

// @route   GET /api/opportunities
// @desc    Get all public opportunities (for employees and public access)
// @access  Public
router.get('/', optionalAuth, async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 12, 
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
      visibility: 'public',
      'application.deadline': { $gt: new Date() }
    };

    if (search) {
      // Enhanced search with multiple fields
      const searchRegex = new RegExp(search, 'i');
      filter.$or = [
        { title: searchRegex },
        { description: searchRegex },
        { category: searchRegex },
        { tags: { $in: [searchRegex] } },
        { 'requirements.skills.name': searchRegex },
        { 'organization.name': searchRegex }
      ];
    }
    
    if (type) filter.type = type;
    if (industry) {
      const orgs = await Organization.find({ industry }).select('_id');
      filter.organization = { $in: orgs.map(org => org._id) };
    }
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
    console.error('Get opportunities error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch opportunities',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// @route   GET /api/opportunities/:id
// @desc    Get single opportunity by ID
// @access  Public
router.get('/:id', optionalAuth, async (req, res) => {
  try {
    const opportunity = await Opportunity.findById(req.params.id)
      .populate('organization', 'name logo industry size location contact rating');

    if (!opportunity || !opportunity.isActive) {
      return res.status(404).json({
        status: 'error',
        message: 'Opportunity not found'
      });
    }

    // Increment view count
    opportunity.metrics.views += 1;
    await opportunity.save();

    res.json({
      status: 'success',
      data: { opportunity }
    });

  } catch (error) {
    console.error('Get opportunity error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch opportunity',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// Apply authentication to all routes below
router.use(verifyToken);

// @route   POST /api/opportunities
// @desc    Create new opportunity (Organization only)
// @access  Private (Organization)
router.post('/', requireRole(['organization']), [
  body('title').trim().isLength({ min: 1, max: 200 }).withMessage('Title is required and must be less than 200 characters'),
  body('description').trim().isLength({ min: 1, max: 2000 }).withMessage('Description is required and must be less than 2000 characters'),
  body('type').isIn(['job', 'internship', 'volunteer', 'project', 'mentorship']).withMessage('Invalid opportunity type'),
  body('category').trim().isLength({ min: 1 }).withMessage('Category is required'),
  body('location.type').isIn(['remote', 'on-site', 'hybrid']).withMessage('Invalid location type'),
  body('schedule.startDate').isISO8601().withMessage('Valid start date is required')
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

    const opportunityData = {
      ...req.body,
      organization: organization._id
    };

    const opportunity = new Opportunity(opportunityData);
    await opportunity.save();

    // Populate organization data
    await opportunity.populate('organization', 'name logo industry size location');

    res.status(201).json({
      status: 'success',
      message: 'Opportunity created successfully',
      data: { opportunity }
    });

  } catch (error) {
    console.error('Create opportunity error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to create opportunity',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// @route   PUT /api/opportunities/:id
// @desc    Update opportunity (Organization only)
// @access  Private (Organization)
router.put('/:id', requireRole(['organization']), [
  body('title').optional().trim().isLength({ min: 1, max: 200 }).withMessage('Title must be less than 200 characters'),
  body('description').optional().trim().isLength({ min: 1, max: 2000 }).withMessage('Description must be less than 2000 characters'),
  body('type').optional().isIn(['job', 'internship', 'volunteer', 'project', 'mentorship']).withMessage('Invalid opportunity type'),
  body('status').optional().isIn(['draft', 'active', 'paused', 'closed', 'filled']).withMessage('Invalid status')
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

    const opportunity = await Opportunity.findOne({
      _id: req.params.id,
      organization: organization._id,
      isActive: true
    });

    if (!opportunity) {
      return res.status(404).json({
        status: 'error',
        message: 'Opportunity not found'
      });
    }

    // Update opportunity fields
    const allowedUpdates = [
      'title', 'description', 'type', 'category', 'requirements', 
      'location', 'compensation', 'schedule', 'application', 
      'status', 'visibility', 'tags'
    ];
    
    allowedUpdates.forEach(field => {
      if (req.body[field] !== undefined) {
        opportunity[field] = req.body[field];
      }
    });

    await opportunity.save();
    await opportunity.populate('organization', 'name logo industry size location');

    res.json({
      status: 'success',
      message: 'Opportunity updated successfully',
      data: { opportunity }
    });

  } catch (error) {
    console.error('Update opportunity error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to update opportunity',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// @route   DELETE /api/opportunities/:id
// @desc    Delete opportunity (Organization only)
// @access  Private (Organization)
router.delete('/:id', requireRole(['organization']), async (req, res) => {
  try {
    const organization = await Organization.findOne({ user: req.user._id });
    
    if (!organization) {
      return res.status(404).json({
        status: 'error',
        message: 'Organization profile not found'
      });
    }

    const opportunity = await Opportunity.findOne({
      _id: req.params.id,
      organization: organization._id,
      isActive: true
    });

    if (!opportunity) {
      return res.status(404).json({
        status: 'error',
        message: 'Opportunity not found'
      });
    }

    // Soft delete
    opportunity.isActive = false;
    opportunity.status = 'closed';
    await opportunity.save();

    res.json({
      status: 'success',
      message: 'Opportunity deleted successfully'
    });

  } catch (error) {
    console.error('Delete opportunity error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to delete opportunity',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// @route   POST /api/opportunities/:id/upload-images
// @desc    Upload images for opportunity
// @access  Private (Organization)
router.post('/:id/upload-images', requireRole(['organization']), uploadMultiple('images', 5), handleUploadError, async (req, res) => {
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

    const opportunity = await Opportunity.findOne({
      _id: req.params.id,
      organization: organization._id,
      isActive: true
    });

    if (!opportunity) {
      return res.status(404).json({
        status: 'error',
        message: 'Opportunity not found'
      });
    }

    // Add new images
    const newImages = req.files.map(file => ({
      public_id: file.public_id,
      url: file.path,
      caption: ''
    }));

    opportunity.images.push(...newImages);
    await opportunity.save();

    res.json({
      status: 'success',
      message: 'Images uploaded successfully',
      data: { images: opportunity.images }
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

// @route   GET /api/opportunities/:id/applications
// @desc    Get applications for specific opportunity (Organization only)
// @access  Private (Organization)
router.get('/:id/applications', requireRole(['organization']), async (req, res) => {
  try {
    const organization = await Organization.findOne({ user: req.user._id });
    
    if (!organization) {
      return res.status(404).json({
        status: 'error',
        message: 'Organization profile not found'
      });
    }

    const opportunity = await Opportunity.findOne({
      _id: req.params.id,
      organization: organization._id,
      isActive: true
    });

    if (!opportunity) {
      return res.status(404).json({
        status: 'error',
        message: 'Opportunity not found'
      });
    }

    const { page = 1, limit = 10, status } = req.query;
    const skip = (page - 1) * limit;

    const filter = { 
      opportunity: opportunity._id,
      organization: organization._id,
      isActive: true 
    };
    if (status) filter.status = status;

    const applications = await Application.find(filter)
      .populate('employee', 'personalInfo.firstName personalInfo.lastName personalInfo.profilePicture skills')
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
    console.error('Get opportunity applications error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch applications',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

export default router;


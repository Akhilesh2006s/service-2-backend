import express from 'express';
import { body, validationResult } from 'express-validator';
import Application from '../models/Application.js';
import Opportunity from '../models/Opportunity.js';
import Organization from '../models/Organization.js';
import Employee from '../models/Employee.js';
import { verifyToken, requireRole } from '../middleware/auth.js';
import { uploadFields, handleUploadError } from '../middleware/upload.js';

const router = express.Router();

// @route   POST /api/applications
// @desc    Submit application for an opportunity
// @access  Private (Employee)
router.post('/', verifyToken, requireRole(['employee']), async (req, res) => {
  try {
    // Handle FormData validation differently
    const { opportunityId, applicationData } = req.body;
    
    if (!opportunityId) {
      return res.status(400).json({
        status: 'error',
        message: 'Opportunity ID is required'
      });
    }

    // Validate MongoDB ObjectId format
    if (!opportunityId.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid opportunity ID format'
      });
    }
    
    if (!applicationData) {
      return res.status(400).json({
        status: 'error',
        message: 'Application data is required'
      });
    }

    let applicationDataObj;
    try {
      applicationDataObj = JSON.parse(applicationData);
    } catch (parseError) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid application data format'
      });
    }

    // Get employee profile
    const employee = await Employee.findOne({ user: req.user._id });
    if (!employee) {
      return res.status(404).json({
        status: 'error',
        message: 'Employee profile not found'
      });
    }

    // Get opportunity
    const opportunity = await Opportunity.findById(opportunityId).populate('organization');
    if (!opportunity || !opportunity.isActive) {
      return res.status(404).json({
        status: 'error',
        message: 'Opportunity not found or no longer available'
      });
    }

    // Check if application deadline has passed
    if (opportunity.application?.deadline && new Date(opportunity.application.deadline) < new Date()) {
      return res.status(400).json({
        status: 'error',
        message: 'Application deadline has passed'
      });
    }

    // Check if user already applied
    const existingApplication = await Application.findOne({
      opportunity: opportunityId,
      employee: employee._id,
      isActive: true
    });

    if (existingApplication) {
      return res.status(400).json({
        status: 'error',
        message: 'You have already applied for this opportunity'
      });
    }

    // Process dates in application data
    const processedApplicationData = {
      ...applicationDataObj,
      personalInfo: {
        ...applicationDataObj.personalInfo,
        dateOfBirth: new Date(applicationDataObj.personalInfo.dateOfBirth)
      },
      education: applicationDataObj.education.map(edu => ({
        ...edu,
        startDate: new Date(edu.startDate),
        endDate: edu.endDate ? new Date(edu.endDate) : undefined
      })),
      experience: applicationDataObj.experience.map(exp => ({
        ...exp,
        startDate: new Date(exp.startDate),
        endDate: exp.endDate ? new Date(exp.endDate) : undefined
      })),
      availability: {
        ...applicationDataObj.availability,
        startDate: new Date(applicationDataObj.availability.startDate)
      }
    };

    // Create application
    const application = new Application({
      opportunity: opportunityId,
      employee: employee._id,
      organization: opportunity.organization._id,
      personalInfo: processedApplicationData.personalInfo,
      education: processedApplicationData.education,
      experience: processedApplicationData.experience,
      skills: processedApplicationData.skills,
      coverLetter: processedApplicationData.coverLetter,
      availability: processedApplicationData.availability,
      documents: {
        resume: null, // File upload disabled for now
        coverLetter: null, // File upload disabled for now
        portfolio: processedApplicationData.documents.portfolio,
        linkedin: processedApplicationData.documents.linkedin,
        github: processedApplicationData.documents.github
      },
      additionalInfo: processedApplicationData.additionalInfo,
      status: 'submitted',
      submittedAt: new Date()
    });

    await application.save();

    // Populate application with related data
    await application.populate([
      { path: 'opportunity', select: 'title type category' },
      { path: 'employee', select: 'personalInfo.firstName personalInfo.lastName' },
      { path: 'organization', select: 'name' }
    ]);

    res.status(201).json({
      status: 'success',
      message: 'Application submitted successfully',
      data: { application }
    });

  } catch (error) {
    console.error('Submit application error:', error);
    console.error('Request body:', req.body);
    console.error('Request files:', req.files);
    res.status(500).json({
      status: 'error',
      message: 'Failed to submit application',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// @route   GET /api/applications
// @desc    Get applications for current user (Employee) or organization (Organization)
// @access  Private
router.get('/', verifyToken, async (req, res) => {
  try {
    const { page = 1, limit = 10, status, opportunityId } = req.query;
    const skip = (page - 1) * limit;

    let filter = { isActive: true };

    if (req.user.role === 'employee') {
      // Get employee's applications
      const employee = await Employee.findOne({ user: req.user._id });
      if (!employee) {
        return res.status(404).json({
          status: 'error',
          message: 'Employee profile not found'
        });
      }
      filter.employee = employee._id;
    } else if (req.user.role === 'organization') {
      // Get organization's received applications
      const organization = await Organization.findOne({ user: req.user._id });
      if (!organization) {
        return res.status(404).json({
          status: 'error',
          message: 'Organization profile not found'
        });
      }
      filter.organization = organization._id;
    }

    if (status) filter.status = status;
    if (opportunityId) filter.opportunity = opportunityId;

    const applications = await Application.find(filter)
      .populate('opportunity', 'title type category location')
      .populate('employee', 'personalInfo.firstName personalInfo.lastName personalInfo.profilePicture skills')
      .populate('organization', 'name logo')
      .sort({ submittedAt: -1 })
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

// @route   GET /api/applications/:id
// @desc    Get single application by ID
// @access  Private
router.get('/:id', verifyToken, async (req, res) => {
  try {
    const application = await Application.findById(req.params.id)
      .populate('opportunity', 'title type category location compensation schedule requirements')
      .populate('employee', 'personalInfo skills interests location')
      .populate('organization', 'name logo industry size location');

    if (!application || !application.isActive) {
      return res.status(404).json({
        status: 'error',
        message: 'Application not found'
      });
    }

    // Check if user has access to this application
    if (req.user.role === 'employee') {
      const employee = await Employee.findOne({ user: req.user._id });
      if (!employee || application.employee.toString() !== employee._id.toString()) {
        return res.status(403).json({
          status: 'error',
          message: 'Access denied'
        });
      }
    } else if (req.user.role === 'organization') {
      const organization = await Organization.findOne({ user: req.user._id });
      if (!organization || application.organization.toString() !== organization._id.toString()) {
        return res.status(403).json({
          status: 'error',
          message: 'Access denied'
        });
      }
    }

    res.json({
      status: 'success',
      data: { application }
    });

  } catch (error) {
    console.error('Get application error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch application',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// @route   PUT /api/applications/:id/status
// @desc    Update application status (Organization only)
// @access  Private (Organization)
router.put('/:id/status', verifyToken, requireRole(['organization']), [
  body('status').isIn(['submitted', 'reviewing', 'shortlisted', 'interview', 'accepted', 'rejected']).withMessage('Invalid status'),
  body('note').optional().isString().withMessage('Note must be a string')
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

    const { status, note } = req.body;

    const organization = await Organization.findOne({ user: req.user._id });
    if (!organization) {
      return res.status(404).json({
        status: 'error',
        message: 'Organization profile not found'
      });
    }

    const application = await Application.findOne({
      _id: req.params.id,
      organization: organization._id,
      isActive: true
    });

    if (!application) {
      return res.status(404).json({
        status: 'error',
        message: 'Application not found'
      });
    }

    // Update application status
    application.status = status;
    if (note) {
      application.notes = application.notes || [];
      application.notes.push({
        note,
        addedBy: req.user._id,
        addedAt: new Date()
      });
    }

    // Set status-specific dates
    if (status === 'reviewing') {
      application.reviewedAt = new Date();
    } else if (status === 'shortlisted') {
      application.shortlistedAt = new Date();
    } else if (status === 'accepted') {
      application.acceptedAt = new Date();
    } else if (status === 'rejected') {
      application.rejectedAt = new Date();
    }

    await application.save();

    // Populate application with related data
    await application.populate([
      { path: 'opportunity', select: 'title' },
      { path: 'employee', select: 'personalInfo.firstName personalInfo.lastName' },
      { path: 'organization', select: 'name' }
    ]);

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

// @route   PUT /api/applications/:id/withdraw
// @desc    Withdraw application (Employee only)
// @access  Private (Employee)
router.put('/:id/withdraw', verifyToken, requireRole(['employee']), async (req, res) => {
  try {
    const employee = await Employee.findOne({ user: req.user._id });
    if (!employee) {
      return res.status(404).json({
        status: 'error',
        message: 'Employee profile not found'
      });
    }

    const application = await Application.findOne({
      _id: req.params.id,
      employee: employee._id,
      isActive: true
    });

    if (!application) {
      return res.status(404).json({
        status: 'error',
        message: 'Application not found'
      });
    }

    if (application.status === 'accepted') {
      return res.status(400).json({
        status: 'error',
        message: 'Cannot withdraw an accepted application'
      });
    }

    // Withdraw application
    application.status = 'withdrawn';
    application.withdrawnAt = new Date();
    await application.save();

    res.json({
      status: 'success',
      message: 'Application withdrawn successfully'
    });

  } catch (error) {
    console.error('Withdraw application error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to withdraw application',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

export default router;
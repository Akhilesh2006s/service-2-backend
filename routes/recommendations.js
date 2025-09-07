import express from 'express';
import { body, validationResult } from 'express-validator';
import { verifyToken, requireRole } from '../middleware/auth.js';
import matchingService from '../services/matchingService.js';
import Employee from '../models/Employee.js';
import Organization from '../models/Organization.js';

const router = express.Router();

/**
 * @route   GET /api/recommendations/opportunities
 * @desc    Get recommended opportunities for an employee
 * @access  Private (Employee)
 */
router.get('/opportunities', verifyToken, requireRole('employee'), async (req, res) => {
  try {
    const { limit = 10, type, category, location } = req.query;
    
    // Get employee profile
    const employee = await Employee.findOne({ user: req.user.id });
    if (!employee) {
      return res.status(404).json({
        status: 'error',
        message: 'Employee profile not found'
      });
    }

    let recommendations;
    
    if (type || category || location) {
      // Search with filters
      recommendations = await matchingService.searchOpportunities(employee._id, {
        type,
        category,
        location
      });
    } else {
      // Get general recommendations
      recommendations = await matchingService.getRecommendedOpportunities(employee._id, parseInt(limit));
    }

    res.json({
      status: 'success',
      data: {
        recommendations,
        total: recommendations.length,
        employee: {
          id: employee._id,
          name: `${employee.personalInfo.firstName} ${employee.personalInfo.lastName}`,
          skills: employee.skills,
          interests: employee.interests
        }
      }
    });

  } catch (error) {
    console.error('Error getting opportunity recommendations:', error);
    res.status(500).json({
      status: 'error',
      message: error.message || 'Failed to get recommendations'
    });
  }
});

/**
 * @route   GET /api/recommendations/employees
 * @desc    Get recommended employees for an organization
 * @access  Private (Organization)
 */
router.get('/employees', verifyToken, requireRole('organization'), async (req, res) => {
  try {
    const { limit = 10, experienceLevel, skills, interests } = req.query;
    
    // Get organization profile
    const organization = await Organization.findOne({ user: req.user.id });
    if (!organization) {
      return res.status(404).json({
        status: 'error',
        message: 'Organization profile not found'
      });
    }

    const recommendations = await matchingService.getRecommendedEmployees(organization._id, parseInt(limit));

    // Apply additional filters if provided
    let filteredRecommendations = recommendations;

    if (experienceLevel) {
      filteredRecommendations = filteredRecommendations.filter(rec => {
        const employee = rec.employee;
        const totalExperience = employee.experience?.reduce((total, exp) => {
          const start = new Date(exp.startDate);
          const end = exp.isCurrent ? new Date() : new Date(exp.endDate);
          return total + (end - start) / (1000 * 60 * 60 * 24 * 365); // Convert to years
        }, 0) || 0;

        switch (experienceLevel) {
          case 'entry-level': return totalExperience < 2;
          case 'mid-level': return totalExperience >= 2 && totalExperience < 5;
          case 'senior': return totalExperience >= 5 && totalExperience < 10;
          case 'executive': return totalExperience >= 10;
          default: return true;
        }
      });
    }

    if (skills) {
      const requiredSkills = skills.split(',').map(s => s.trim().toLowerCase());
      filteredRecommendations = filteredRecommendations.filter(rec => {
        const employeeSkills = rec.employee.skills?.map(s => s.name.toLowerCase()) || [];
        return requiredSkills.some(skill => employeeSkills.includes(skill));
      });
    }

    if (interests) {
      const requiredInterests = interests.split(',').map(i => i.trim().toLowerCase());
      filteredRecommendations = filteredRecommendations.filter(rec => {
        const employeeInterests = rec.employee.interests?.map(i => i.name.toLowerCase()) || [];
        return requiredInterests.some(interest => employeeInterests.includes(interest));
      });
    }

    res.json({
      status: 'success',
      data: {
        recommendations: filteredRecommendations,
        total: filteredRecommendations.length,
        organization: {
          id: organization._id,
          name: organization.name,
          requirements: organization.requirements
        }
      }
    });

  } catch (error) {
    console.error('Error getting employee recommendations:', error);
    res.status(500).json({
      status: 'error',
      message: error.message || 'Failed to get recommendations'
    });
  }
});

/**
 * @route   POST /api/recommendations/update-skills
 * @desc    Update employee skills and interests
 * @access  Private (Employee)
 */
router.post('/update-skills', 
  verifyToken, 
  requireRole('employee'),
  [
    body('skills').isArray().withMessage('Skills must be an array'),
    body('skills.*.name').notEmpty().withMessage('Skill name is required'),
    body('skills.*.level').isIn(['beginner', 'intermediate', 'advanced', 'expert']).withMessage('Invalid skill level'),
    body('skills.*.category').isIn(['technical', 'soft', 'language', 'other']).withMessage('Invalid skill category'),
    body('interests').isArray().withMessage('Interests must be an array'),
    body('interests.*.name').notEmpty().withMessage('Interest name is required'),
    body('interests.*.category').isIn(['technology', 'business', 'design', 'marketing', 'science', 'arts', 'sports', 'travel', 'food', 'music', 'gaming', 'fitness', 'education', 'environment', 'social-impact', 'other']).withMessage('Invalid interest category'),
    body('interests.*.level').isIn(['casual', 'moderate', 'passionate', 'professional']).withMessage('Invalid interest level')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          status: 'error',
          message: 'Validation failed',
          errors: errors.array()
        });
      }

      const { skills, interests } = req.body;

      const employee = await Employee.findOne({ user: req.user.id });
      if (!employee) {
        return res.status(404).json({
          status: 'error',
          message: 'Employee profile not found'
        });
      }

      // Update skills and interests
      employee.skills = skills;
      employee.interests = interests;
      employee.isProfileComplete = true;

      await employee.save();

      res.json({
        status: 'success',
        message: 'Skills and interests updated successfully',
        data: {
          employee: {
            id: employee._id,
            skills: employee.skills,
            interests: employee.interests,
            isProfileComplete: employee.isProfileComplete
          }
        }
      });

    } catch (error) {
      console.error('Error updating skills:', error);
      res.status(500).json({
        status: 'error',
        message: error.message || 'Failed to update skills'
      });
    }
  }
);

/**
 * @route   POST /api/recommendations/update-requirements
 * @desc    Update organization requirements and preferences
 * @access  Private (Organization)
 */
router.post('/update-requirements',
  verifyToken,
  requireRole('organization'),
  [
    body('requirements.preferredSkills').isArray().withMessage('Preferred skills must be an array'),
    body('requirements.preferredSkills.*.name').notEmpty().withMessage('Skill name is required'),
    body('requirements.preferredSkills.*.level').isIn(['beginner', 'intermediate', 'advanced', 'expert']).withMessage('Invalid skill level'),
    body('requirements.preferredSkills.*.category').isIn(['technical', 'soft', 'language', 'other']).withMessage('Invalid skill category'),
    body('requirements.preferredInterests').isArray().withMessage('Preferred interests must be an array'),
    body('requirements.preferredInterests.*.name').notEmpty().withMessage('Interest name is required'),
    body('requirements.preferredInterests.*.category').isIn(['technology', 'business', 'design', 'marketing', 'science', 'arts', 'sports', 'travel', 'food', 'music', 'gaming', 'fitness', 'education', 'environment', 'social-impact', 'other']).withMessage('Invalid interest category'),
    body('requirements.preferredInterests.*.importance').isIn(['nice-to-have', 'preferred', 'important', 'critical']).withMessage('Invalid importance level')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          status: 'error',
          message: 'Validation failed',
          errors: errors.array()
        });
      }

      const { requirements, culture } = req.body;

      const organization = await Organization.findOne({ user: req.user.id });
      if (!organization) {
        return res.status(404).json({
          status: 'error',
          message: 'Organization profile not found'
        });
      }

      // Update requirements and culture
      if (requirements) {
        organization.requirements = { ...organization.requirements, ...requirements };
      }
      if (culture) {
        organization.culture = { ...organization.culture, ...culture };
      }

      await organization.save();

      res.json({
        status: 'success',
        message: 'Requirements and culture updated successfully',
        data: {
          organization: {
            id: organization._id,
            requirements: organization.requirements,
            culture: organization.culture
          }
        }
      });

    } catch (error) {
      console.error('Error updating requirements:', error);
      res.status(500).json({
        status: 'error',
        message: error.message || 'Failed to update requirements'
      });
    }
  }
);

/**
 * @route   GET /api/recommendations/match-score/:employeeId/:organizationId
 * @desc    Get detailed match score between employee and organization
 * @access  Private
 */
router.get('/match-score/:employeeId/:organizationId', verifyToken, async (req, res) => {
  try {
    const { employeeId, organizationId } = req.params;

    const employee = await Employee.findById(employeeId);
    const organization = await Organization.findById(organizationId);

    if (!employee || !organization) {
      return res.status(404).json({
        status: 'error',
        message: 'Employee or organization not found'
      });
    }

    const skillScore = matchingService.calculateSkillMatch(
      employee.skills,
      organization.requirements?.preferredSkills || []
    );

    const interestScore = matchingService.calculateInterestMatch(
      employee.interests,
      organization.requirements?.preferredInterests || []
    );

    const locationScore = matchingService.calculateLocationMatch(
      employee.location,
      organization.location,
      'hybrid'
    );

    const overallScore = (skillScore * 0.5) + (interestScore * 0.3) + (locationScore * 0.2);

    res.json({
      status: 'success',
      data: {
        scores: {
          overall: Math.round(overallScore),
          skills: Math.round(skillScore),
          interests: Math.round(interestScore),
          location: Math.round(locationScore)
        },
        employee: {
          id: employee._id,
          name: `${employee.personalInfo.firstName} ${employee.personalInfo.lastName}`,
          skills: employee.skills,
          interests: employee.interests
        },
        organization: {
          id: organization._id,
          name: organization.name,
          requirements: organization.requirements
        }
      }
    });

  } catch (error) {
    console.error('Error calculating match score:', error);
    res.status(500).json({
      status: 'error',
      message: error.message || 'Failed to calculate match score'
    });
  }
});

export default router;

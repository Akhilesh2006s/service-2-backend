import express from 'express';
import Opportunity from '../models/Opportunity.js';
import Employee from '../models/Employee.js';
import Organization from '../models/Organization.js';
import Application from '../models/Application.js';
import { verifyToken, requireRole } from '../middleware/auth.js';

const router = express.Router();

// Apply authentication to all routes
router.use(verifyToken);

// @route   GET /api/matching/opportunities/:opportunityId/candidates
// @desc    Get matching candidates for an opportunity (Organization only)
// @access  Private (Organization)
router.get('/opportunities/:opportunityId/candidates', requireRole(['organization']), async (req, res) => {
  try {
    const organization = await Organization.findOne({ user: req.user._id });
    
    if (!organization) {
      return res.status(404).json({
        status: 'error',
        message: 'Organization profile not found'
      });
    }

    const opportunity = await Opportunity.findOne({
      _id: req.params.opportunityId,
      organization: organization._id,
      isActive: true
    });

    if (!opportunity) {
      return res.status(404).json({
        status: 'error',
        message: 'Opportunity not found'
      });
    }

    const { page = 1, limit = 10, minMatchScore = 0 } = req.query;
    const skip = (page - 1) * limit;

    // Get all employees who haven't applied to this opportunity
    const appliedEmployeeIds = await Application.find({
      opportunity: opportunity._id,
      isActive: true
    }).distinct('employee');

    // Build matching criteria
    const matchCriteria = {
      isActive: true,
      isProfileComplete: true,
      _id: { $nin: appliedEmployeeIds }
    };

    // Filter by location if specified
    if (opportunity.location.type === 'on-site' && opportunity.location.city) {
      matchCriteria['location.city'] = new RegExp(opportunity.location.city, 'i');
    }

    // Get potential candidates
    const candidates = await Employee.find(matchCriteria)
      .populate('user', 'email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    // Calculate match scores for each candidate
    const candidatesWithScores = await Promise.all(
      candidates.map(async (candidate) => {
        const matchScore = await calculateMatchScore(opportunity, candidate);
        return {
          candidate,
          matchScore,
          matchReasons: getMatchReasons(opportunity, candidate, matchScore)
        };
      })
    );

    // Filter by minimum match score and sort by score
    const filteredCandidates = candidatesWithScores
      .filter(item => item.matchScore >= minMatchScore)
      .sort((a, b) => b.matchScore - a.matchScore);

    const total = await Employee.countDocuments(matchCriteria);

    res.json({
      status: 'success',
      data: {
        candidates: filteredCandidates,
        pagination: {
          current: parseInt(page),
          pages: Math.ceil(total / limit),
          total
        }
      }
    });

  } catch (error) {
    console.error('Get matching candidates error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch matching candidates',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// @route   GET /api/matching/employees/:employeeId/opportunities
// @desc    Get matching opportunities for an employee (Employee only)
// @access  Private (Employee)
router.get('/employees/:employeeId/opportunities', requireRole(['employee']), async (req, res) => {
  try {
    const employee = await Employee.findOne({ user: req.user._id });
    
    if (!employee) {
      return res.status(404).json({
        status: 'error',
        message: 'Employee profile not found'
      });
    }

    const { page = 1, limit = 10, minMatchScore = 0 } = req.query;
    const skip = (page - 1) * limit;

    // Get opportunities the employee hasn't applied to
    const appliedOpportunityIds = await Application.find({
      employee: employee._id,
      isActive: true
    }).distinct('opportunity');

    // Build matching criteria
    const matchCriteria = {
      status: 'active',
      isActive: true,
      visibility: 'public',
      'application.deadline': { $gt: new Date() },
      _id: { $nin: appliedOpportunityIds }
    };

    // Filter by location if employee prefers specific location
    if (employee.preferences?.workMode?.length > 0) {
      matchCriteria['location.type'] = { $in: employee.preferences.workMode };
    }

    // Get potential opportunities
    const opportunities = await Opportunity.find(matchCriteria)
      .populate('organization', 'name logo industry size location rating')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    // Calculate match scores for each opportunity
    const opportunitiesWithScores = await Promise.all(
      opportunities.map(async (opportunity) => {
        const matchScore = await calculateMatchScore(opportunity, employee);
        return {
          opportunity,
          matchScore,
          matchReasons: getMatchReasons(opportunity, employee, matchScore)
        };
      })
    );

    // Filter by minimum match score and sort by score
    const filteredOpportunities = opportunitiesWithScores
      .filter(item => item.matchScore >= minMatchScore)
      .sort((a, b) => b.matchScore - a.matchScore);

    const total = await Opportunity.countDocuments(matchCriteria);

    res.json({
      status: 'success',
      data: {
        opportunities: filteredOpportunities,
        pagination: {
          current: parseInt(page),
          pages: Math.ceil(total / limit),
          total
        }
      }
    });

  } catch (error) {
    console.error('Get matching opportunities error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch matching opportunities',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// @route   GET /api/matching/analytics
// @desc    Get matching analytics (Both roles)
// @access  Private
router.get('/analytics', async (req, res) => {
  try {
    let analytics = {};

    if (req.user.role === 'organization') {
      const organization = await Organization.findOne({ user: req.user._id });
      
      if (!organization) {
        return res.status(404).json({
          status: 'error',
          message: 'Organization profile not found'
        });
      }

      // Organization analytics
      const totalOpportunities = await Opportunity.countDocuments({
        organization: organization._id,
        isActive: true
      });

      const totalApplications = await Application.countDocuments({
        organization: organization._id,
        isActive: true
      });

      const averageMatchScore = await calculateAverageMatchScore(organization._id);

      analytics = {
        totalOpportunities,
        totalApplications,
        averageMatchScore,
        matchRate: totalOpportunities > 0 ? (totalApplications / totalOpportunities) * 100 : 0
      };

    } else if (req.user.role === 'employee') {
      const employee = await Employee.findOne({ user: req.user._id });
      
      if (!employee) {
        return res.status(404).json({
          status: 'error',
          message: 'Employee profile not found'
        });
      }

      // Employee analytics
      const totalApplications = await Application.countDocuments({
        employee: employee._id,
        isActive: true
      });

      const acceptedApplications = await Application.countDocuments({
        employee: employee._id,
        status: 'accepted',
        isActive: true
      });

      const averageMatchScore = await calculateAverageMatchScoreForEmployee(employee._id);

      analytics = {
        totalApplications,
        acceptedApplications,
        averageMatchScore,
        successRate: totalApplications > 0 ? (acceptedApplications / totalApplications) * 100 : 0
      };
    }

    res.json({
      status: 'success',
      data: { analytics }
    });

  } catch (error) {
    console.error('Get matching analytics error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch matching analytics',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// Helper function to calculate match score between opportunity and employee
async function calculateMatchScore(opportunity, employee) {
  let score = 0;
  let maxScore = 0;

  // Skills matching (40% weight)
  if (opportunity.requirements?.skills?.length > 0) {
    const requiredSkills = opportunity.requirements.skills.map(skill => skill.name.toLowerCase());
    const employeeSkills = employee.skills.map(skill => skill.name.toLowerCase());
    
    const matchingSkills = requiredSkills.filter(skill => 
      employeeSkills.some(empSkill => empSkill.includes(skill) || skill.includes(empSkill))
    );
    
    const skillsScore = (matchingSkills.length / requiredSkills.length) * 40;
    score += skillsScore;
  }
  maxScore += 40;

  // Experience matching (25% weight)
  if (opportunity.requirements?.experience?.minYears) {
    const requiredExperience = opportunity.requirements.experience.minYears;
    const employeeExperience = calculateTotalExperience(employee.experience);
    
    if (employeeExperience >= requiredExperience) {
      score += 25;
    } else {
      score += (employeeExperience / requiredExperience) * 25;
    }
  }
  maxScore += 25;

  // Location matching (15% weight)
  if (opportunity.location.type === 'on-site' && opportunity.location.city) {
    if (employee.location.city.toLowerCase() === opportunity.location.city.toLowerCase()) {
      score += 15;
    } else if (employee.location.state === opportunity.location.state) {
      score += 10;
    } else if (employee.location.country === opportunity.location.country) {
      score += 5;
    }
  } else if (opportunity.location.type === 'remote') {
    if (employee.preferences?.workMode?.includes('remote')) {
      score += 15;
    }
  }
  maxScore += 15;

  // Education matching (10% weight)
  if (opportunity.requirements?.education?.length > 0) {
    const requiredEducation = opportunity.requirements.education[0];
    const employeeEducation = getHighestEducation(employee.education);
    
    if (isEducationMatch(requiredEducation.level, employeeEducation)) {
      score += 10;
    }
  }
  maxScore += 10;

  // Preferences matching (10% weight)
  if (employee.preferences?.industries?.length > 0) {
    const organization = await Organization.findById(opportunity.organization);
    if (organization && employee.preferences.industries.includes(organization.industry)) {
      score += 10;
    }
  }
  maxScore += 10;

  return Math.round((score / maxScore) * 100);
}

// Helper function to get match reasons
function getMatchReasons(opportunity, employee, matchScore) {
  const reasons = [];

  if (matchScore >= 80) {
    reasons.push('Excellent match');
  } else if (matchScore >= 60) {
    reasons.push('Good match');
  } else if (matchScore >= 40) {
    reasons.push('Moderate match');
  } else {
    reasons.push('Basic match');
  }

  // Add specific reasons
  if (opportunity.requirements?.skills?.length > 0) {
    const requiredSkills = opportunity.requirements.skills.map(skill => skill.name.toLowerCase());
    const employeeSkills = employee.skills.map(skill => skill.name.toLowerCase());
    const matchingSkills = requiredSkills.filter(skill => 
      employeeSkills.some(empSkill => empSkill.includes(skill) || skill.includes(empSkill))
    );
    
    if (matchingSkills.length > 0) {
      reasons.push(`${matchingSkills.length} matching skills`);
    }
  }

  if (opportunity.location.type === 'remote' && employee.preferences?.workMode?.includes('remote')) {
    reasons.push('Remote work preference match');
  }

  return reasons;
}

// Helper function to calculate total experience
function calculateTotalExperience(experience) {
  return experience.reduce((total, exp) => {
    const startDate = new Date(exp.startDate);
    const endDate = exp.isCurrent ? new Date() : new Date(exp.endDate);
    const years = (endDate - startDate) / (1000 * 60 * 60 * 24 * 365);
    return total + Math.max(0, years);
  }, 0);
}

// Helper function to get highest education level
function getHighestEducation(education) {
  const levels = ['high-school', 'associate', 'bachelor', 'master', 'phd'];
  let highestLevel = 'high-school';
  
  education.forEach(edu => {
    if (levels.indexOf(edu.degree.toLowerCase()) > levels.indexOf(highestLevel)) {
      highestLevel = edu.degree.toLowerCase();
    }
  });
  
  return highestLevel;
}

// Helper function to check education match
function isEducationMatch(required, employee) {
  const levels = ['high-school', 'associate', 'bachelor', 'master', 'phd'];
  return levels.indexOf(employee) >= levels.indexOf(required);
}

// Helper function to calculate average match score for organization
async function calculateAverageMatchScore(organizationId) {
  const opportunities = await Opportunity.find({
    organization: organizationId,
    isActive: true
  });

  let totalScore = 0;
  let count = 0;

  for (const opportunity of opportunities) {
    const applications = await Application.find({
      opportunity: opportunity._id,
      isActive: true
    }).populate('employee');

    for (const application of applications) {
      const score = await calculateMatchScore(opportunity, application.employee);
      totalScore += score;
      count++;
    }
  }

  return count > 0 ? Math.round(totalScore / count) : 0;
}

// Helper function to calculate average match score for employee
async function calculateAverageMatchScoreForEmployee(employeeId) {
  const employee = await Employee.findById(employeeId);
  const applications = await Application.find({
    employee: employeeId,
    isActive: true
  }).populate('opportunity');

  let totalScore = 0;
  let count = 0;

  for (const application of applications) {
    const score = await calculateMatchScore(application.opportunity, employee);
    totalScore += score;
    count++;
  }

  return count > 0 ? Math.round(totalScore / count) : 0;
}

export default router;


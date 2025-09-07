import Employee from '../models/Employee.js';
import Organization from '../models/Organization.js';
import Opportunity from '../models/Opportunity.js';

class MatchingService {
  /**
   * Calculate skill match score between employee and organization requirements
   */
  calculateSkillMatch(employeeSkills, orgRequirements) {
    if (!employeeSkills || !orgRequirements || orgRequirements.length === 0) {
      return 0;
    }

    let totalScore = 0;
    let maxPossibleScore = 0;

    orgRequirements.forEach(req => {
      const employeeSkill = employeeSkills.find(skill => 
        skill.name.toLowerCase() === req.name.toLowerCase()
      );

      if (employeeSkill) {
        // Skill level scoring (beginner=1, intermediate=2, advanced=3, expert=4)
        const levelScores = { beginner: 1, intermediate: 2, advanced: 3, expert: 4 };
        const employeeLevel = levelScores[employeeSkill.level] || 0;
        const requiredLevel = levelScores[req.level] || 0;
        
        // Calculate match score (higher is better)
        let skillScore = 0;
        if (employeeLevel >= requiredLevel) {
          skillScore = 1.0; // Perfect match
        } else {
          skillScore = employeeLevel / requiredLevel; // Partial match
        }

        // Weight by importance
        const weight = req.isRequired ? 2 : 1;
        totalScore += skillScore * weight;
        maxPossibleScore += weight;
      } else if (req.isRequired) {
        // Required skill not found
        maxPossibleScore += 2;
      }
    });

    return maxPossibleScore > 0 ? (totalScore / maxPossibleScore) * 100 : 0;
  }

  /**
   * Calculate interest match score between employee and organization preferences
   */
  calculateInterestMatch(employeeInterests, orgInterests) {
    if (!employeeInterests || !orgInterests || orgInterests.length === 0) {
      return 0;
    }

    let totalScore = 0;
    let maxPossibleScore = 0;

    orgInterests.forEach(orgInterest => {
      const employeeInterest = employeeInterests.find(interest => 
        interest.name.toLowerCase() === orgInterest.name.toLowerCase() ||
        interest.category === orgInterest.category
      );

      if (employeeInterest) {
        // Interest level scoring
        const levelScores = { casual: 1, moderate: 2, passionate: 3, professional: 4 };
        const employeeLevel = levelScores[employeeInterest.level] || 0;
        
        // Importance scoring
        const importanceScores = { 'nice-to-have': 1, preferred: 2, important: 3, critical: 4 };
        const importance = importanceScores[orgInterest.importance] || 1;
        
        const interestScore = (employeeLevel / 4) * (importance / 4);
        totalScore += interestScore;
        maxPossibleScore += importance / 4;
      } else {
        maxPossibleScore += 0.25; // Small penalty for missing interests
      }
    });

    return maxPossibleScore > 0 ? (totalScore / maxPossibleScore) * 100 : 0;
  }

  /**
   * Calculate location compatibility score
   */
  calculateLocationMatch(employeeLocation, orgLocation, workMode) {
    if (!employeeLocation || !orgLocation) return 50; // Neutral score

    const employeeCity = employeeLocation.city?.toLowerCase();
    const orgCity = orgLocation.city?.toLowerCase();
    const employeeState = employeeLocation.state?.toLowerCase();
    const orgState = orgLocation.state?.toLowerCase();

    // Remote work - high compatibility
    if (workMode === 'remote') return 100;
    
    // Same city - perfect match
    if (employeeCity === orgCity) return 100;
    
    // Same state - good match
    if (employeeState === orgState) return 80;
    
    // Same country - moderate match
    if (employeeLocation.country === orgLocation.country) return 60;
    
    // Different country - lower match
    return 30;
  }

  /**
   * Get recommended opportunities for an employee
   */
  async getRecommendedOpportunities(employeeId, limit = 10) {
    try {
      const employee = await Employee.findById(employeeId).populate('user');
      if (!employee) throw new Error('Employee not found');

      const opportunities = await Opportunity.find({ 
        status: 'active',
        visibility: 'public'
      }).populate('organization');

      const recommendations = [];

      for (const opportunity of opportunities) {
        const org = opportunity.organization;
        if (!org) continue;

        // Calculate match scores
        const skillScore = this.calculateSkillMatch(
          employee.skills, 
          opportunity.requirements?.skills || []
        );
        
        const interestScore = this.calculateInterestMatch(
          employee.interests,
          org.requirements?.preferredInterests || []
        );

        const locationScore = this.calculateLocationMatch(
          employee.location,
          org.location,
          opportunity.location?.type
        );

        // Weighted overall score
        const overallScore = (skillScore * 0.5) + (interestScore * 0.3) + (locationScore * 0.2);

        if (overallScore > 30) { // Only include relevant matches
          recommendations.push({
            opportunity,
            scores: {
              overall: Math.round(overallScore),
              skills: Math.round(skillScore),
              interests: Math.round(interestScore),
              location: Math.round(locationScore)
            },
            matchReasons: this.generateMatchReasons(employee, opportunity, org)
          });
        }
      }

      // Sort by overall score and return top matches
      return recommendations
        .sort((a, b) => b.scores.overall - a.scores.overall)
        .slice(0, limit);

    } catch (error) {
      throw new Error(`Failed to get recommendations: ${error.message}`);
    }
  }

  /**
   * Get recommended employees for an organization
   */
  async getRecommendedEmployees(organizationId, limit = 10) {
    try {
      const organization = await Organization.findById(organizationId).populate('user');
      if (!organization) throw new Error('Organization not found');

      const employees = await Employee.find({ isActive: true }).populate('user');

      const recommendations = [];

      for (const employee of employees) {
        // Calculate match scores
        const skillScore = this.calculateSkillMatch(
          employee.skills,
          organization.requirements?.preferredSkills || []
        );

        const interestScore = this.calculateInterestMatch(
          employee.interests,
          organization.requirements?.preferredInterests || []
        );

        const locationScore = this.calculateLocationMatch(
          employee.location,
          organization.location,
          'hybrid' // Default to hybrid for general recommendations
        );

        // Weighted overall score
        const overallScore = (skillScore * 0.5) + (interestScore * 0.3) + (locationScore * 0.2);

        if (overallScore > 30) { // Only include relevant matches
          recommendations.push({
            employee,
            scores: {
              overall: Math.round(overallScore),
              skills: Math.round(skillScore),
              interests: Math.round(interestScore),
              location: Math.round(locationScore)
            },
            matchReasons: this.generateEmployeeMatchReasons(employee, organization)
          });
        }
      }

      // Sort by overall score and return top matches
      return recommendations
        .sort((a, b) => b.scores.overall - a.scores.overall)
        .slice(0, limit);

    } catch (error) {
      throw new Error(`Failed to get employee recommendations: ${error.message}`);
    }
  }

  /**
   * Generate human-readable match reasons for opportunities
   */
  generateMatchReasons(employee, opportunity, organization) {
    const reasons = [];

    // Skill matches
    if (employee.skills && opportunity.requirements?.skills) {
      const matchingSkills = employee.skills.filter(empSkill =>
        opportunity.requirements.skills.some(reqSkill =>
          empSkill.name.toLowerCase() === reqSkill.name.toLowerCase() &&
          ['intermediate', 'advanced', 'expert'].includes(empSkill.level)
        )
      );

      if (matchingSkills.length > 0) {
        reasons.push(`Strong skills in: ${matchingSkills.map(s => s.name).join(', ')}`);
      }
    }

    // Interest matches
    if (employee.interests && organization.requirements?.preferredInterests) {
      const matchingInterests = employee.interests.filter(empInterest =>
        organization.requirements.preferredInterests.some(orgInterest =>
          empInterest.name.toLowerCase() === orgInterest.name.toLowerCase() ||
          empInterest.category === orgInterest.category
        )
      );

      if (matchingInterests.length > 0) {
        reasons.push(`Shared interests: ${matchingInterests.map(i => i.name).join(', ')}`);
      }
    }

    // Location match
    if (employee.location?.city === organization.location?.city) {
      reasons.push(`Same location (${employee.location.city})`);
    } else if (opportunity.location?.type === 'remote') {
      reasons.push('Remote work opportunity');
    }

    return reasons;
  }

  /**
   * Generate human-readable match reasons for employees
   */
  generateEmployeeMatchReasons(employee, organization) {
    const reasons = [];

    // Skill matches
    if (employee.skills && organization.requirements?.preferredSkills) {
      const matchingSkills = employee.skills.filter(empSkill =>
        organization.requirements.preferredSkills.some(reqSkill =>
          empSkill.name.toLowerCase() === reqSkill.name.toLowerCase() &&
          ['intermediate', 'advanced', 'expert'].includes(empSkill.level)
        )
      );

      if (matchingSkills.length > 0) {
        reasons.push(`Strong skills in: ${matchingSkills.map(s => s.name).join(', ')}`);
      }
    }

    // Interest matches
    if (employee.interests && organization.requirements?.preferredInterests) {
      const matchingInterests = employee.interests.filter(empInterest =>
        organization.requirements.preferredInterests.some(orgInterest =>
          empInterest.name.toLowerCase() === orgInterest.name.toLowerCase() ||
          empInterest.category === orgInterest.category
        )
      );

      if (matchingInterests.length > 0) {
        reasons.push(`Shared interests: ${matchingInterests.map(i => i.name).join(', ')}`);
      }
    }

    // Location match
    if (employee.location?.city === organization.location?.city) {
      reasons.push(`Same location (${employee.location.city})`);
    }

    return reasons;
  }

  /**
   * Search opportunities with smart matching
   */
  async searchOpportunities(employeeId, searchCriteria = {}) {
    try {
      const employee = await Employee.findById(employeeId).populate('user');
      if (!employee) throw new Error('Employee not found');

      let query = { status: 'active', visibility: 'public' };

      // Apply search filters
      if (searchCriteria.type) {
        query.type = searchCriteria.type;
      }
      if (searchCriteria.category) {
        query.category = searchCriteria.category;
      }
      if (searchCriteria.location) {
        query['location.type'] = searchCriteria.location;
      }

      const opportunities = await Opportunity.find(query).populate('organization');
      const recommendations = await this.getRecommendedOpportunities(employeeId, 50);

      // Merge search results with recommendations
      const searchResults = opportunities.map(opportunity => {
        const recommendation = recommendations.find(rec => 
          rec.opportunity._id.toString() === opportunity._id.toString()
        );

        return {
          opportunity,
          scores: recommendation?.scores || { overall: 0, skills: 0, interests: 0, location: 0 },
          matchReasons: recommendation?.matchReasons || []
        };
      });

      // Sort by relevance (recommendation score) and then by date
      return searchResults.sort((a, b) => {
        if (b.scores.overall !== a.scores.overall) {
          return b.scores.overall - a.scores.overall;
        }
        return new Date(b.opportunity.createdAt) - new Date(a.opportunity.createdAt);
      });

    } catch (error) {
      throw new Error(`Failed to search opportunities: ${error.message}`);
    }
  }
}

export default new MatchingService();

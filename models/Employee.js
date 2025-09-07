import mongoose from 'mongoose';

const employeeSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  personalInfo: {
    firstName: {
      type: String,
      required: [true, 'First name is required'],
      trim: true
    },
    lastName: {
      type: String,
      required: [true, 'Last name is required'],
      trim: true
    },
    dateOfBirth: {
      type: Date,
      required: [true, 'Date of birth is required']
    },
    gender: {
      type: String,
      enum: ['male', 'female', 'other', 'prefer-not-to-say']
    },
    phone: {
      type: String,
      required: [true, 'Phone number is required']
    },
    profilePicture: {
      public_id: String,
      url: String
    }
  },
  location: {
    address: {
      type: String,
      required: [true, 'Address is required']
    },
    city: {
      type: String,
      required: [true, 'City is required']
    },
    state: {
      type: String,
      required: [true, 'State is required']
    },
    country: {
      type: String,
      required: [true, 'Country is required']
    },
    coordinates: {
      latitude: Number,
      longitude: Number
    }
  },
  education: [{
    institution: {
      type: String,
      required: true
    },
    degree: {
      type: String,
      required: true
    },
    fieldOfStudy: {
      type: String,
      required: true
    },
    startDate: {
      type: Date,
      required: true
    },
    endDate: Date,
    isCurrent: {
      type: Boolean,
      default: false
    },
    description: String
  }],
  experience: [{
    title: {
      type: String,
      required: true
    },
    company: {
      type: String,
      required: true
    },
    location: String,
    startDate: {
      type: Date,
      required: true
    },
    endDate: Date,
    isCurrent: {
      type: Boolean,
      default: false
    },
    description: String,
    skills: [String]
  }],
  skills: [{
    name: {
      type: String,
      required: true
    },
    level: {
      type: String,
      enum: ['beginner', 'intermediate', 'advanced', 'expert'],
      default: 'intermediate'
    },
    category: {
      type: String,
      enum: ['technical', 'soft', 'language', 'other']
    },
    yearsOfExperience: {
      type: Number,
      default: 0
    }
  }],
  interests: [{
    name: {
      type: String,
      required: true
    },
    category: {
      type: String,
      enum: ['technology', 'business', 'design', 'marketing', 'science', 'arts', 'sports', 'travel', 'food', 'music', 'gaming', 'fitness', 'education', 'environment', 'social-impact', 'other']
    },
    level: {
      type: String,
      enum: ['casual', 'moderate', 'passionate', 'professional'],
      default: 'moderate'
    }
  }],
  preferences: {
    jobTypes: [{
      type: String,
      enum: ['full-time', 'part-time', 'contract', 'internship', 'volunteer']
    }],
    industries: [String],
    workMode: [{
      type: String,
      enum: ['remote', 'on-site', 'hybrid']
    }],
    salaryRange: {
      min: Number,
      max: Number,
      currency: {
        type: String,
        default: 'USD'
      }
    },
    availability: {
      startDate: Date,
      endDate: Date,
      hoursPerWeek: Number
    }
  },
  socialProfiles: {
    linkedin: String,
    github: String,
    portfolio: String,
    twitter: String
  },
  documents: [{
    name: String,
    type: {
      type: String,
      enum: ['resume', 'cover-letter', 'certificate', 'portfolio', 'other']
    },
    public_id: String,
    url: String,
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }],
  isActive: {
    type: Boolean,
    default: true
  },
  isProfileComplete: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Index for search functionality
employeeSchema.index({ 
  'personalInfo.firstName': 'text', 
  'personalInfo.lastName': 'text',
  'skills.name': 'text',
  'experience.title': 'text',
  'location.city': 'text',
  'location.country': 'text'
});

export default mongoose.model('Employee', employeeSchema);


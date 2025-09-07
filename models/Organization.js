import mongoose from 'mongoose';

const organizationSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  name: {
    type: String,
    required: [true, 'Organization name is required'],
    trim: true
  },
  description: {
    type: String,
    required: [true, 'Organization description is required'],
    maxlength: [1000, 'Description cannot exceed 1000 characters']
  },
  website: {
    type: String,
    trim: true
  },
  industry: {
    type: String,
    required: [true, 'Industry is required']
  },
  size: {
    type: String,
    enum: ['1-10', '11-50', '51-200', '201-500', '500+'],
    required: [true, 'Organization size is required']
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
  contact: {
    phone: String,
    email: {
      type: String,
      required: [true, 'Contact email is required']
    },
    linkedin: String,
    twitter: String
  },
  logo: {
    public_id: String,
    url: String
  },
  images: [{
    public_id: String,
    url: String,
    caption: String
  }],
  verification: {
    isVerified: {
      type: Boolean,
      default: false
    },
    verifiedAt: Date,
    documents: [{
      type: String,
      public_id: String,
      url: String
    }]
  },
  rating: {
    average: {
      type: Number,
      default: 0,
      min: 0,
      max: 5
    },
    count: {
      type: Number,
      default: 0
    }
  },
  requirements: {
    preferredSkills: [{
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
      isRequired: {
        type: Boolean,
        default: false
      }
    }],
    preferredInterests: [{
      name: {
        type: String,
        required: true
      },
      category: {
        type: String,
        enum: ['technology', 'business', 'design', 'marketing', 'science', 'arts', 'sports', 'travel', 'food', 'music', 'gaming', 'fitness', 'education', 'environment', 'social-impact', 'other']
      },
      importance: {
        type: String,
        enum: ['nice-to-have', 'preferred', 'important', 'critical'],
        default: 'preferred'
      }
    }],
    candidatePreferences: {
      experienceLevel: {
        type: String,
        enum: ['entry-level', 'mid-level', 'senior', 'executive', 'any'],
        default: 'any'
      },
      educationLevel: {
        type: String,
        enum: ['high-school', 'associate', 'bachelor', 'master', 'phd', 'any'],
        default: 'any'
      },
      workMode: [{
        type: String,
        enum: ['remote', 'on-site', 'hybrid']
      }],
      availability: {
        startDate: Date,
        endDate: Date,
        hoursPerWeek: Number
      }
    }
  },
  culture: {
    values: [String],
    workEnvironment: {
      type: String,
      enum: ['startup', 'corporate', 'non-profit', 'government', 'academic', 'other']
    },
    teamSize: {
      type: String,
      enum: ['small', 'medium', 'large', 'varies']
    },
    benefits: [String],
    perks: [String]
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Index for search functionality
organizationSchema.index({ 
  name: 'text', 
  description: 'text', 
  industry: 'text',
  'location.city': 'text',
  'location.country': 'text'
});

export default mongoose.model('Organization', organizationSchema);


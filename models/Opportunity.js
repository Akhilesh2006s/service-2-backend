import mongoose from 'mongoose';

const opportunitySchema = new mongoose.Schema({
  organization: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    required: true
  },
  title: {
    type: String,
    required: [true, 'Opportunity title is required'],
    trim: true
  },
  description: {
    type: String,
    required: [true, 'Opportunity description is required'],
    maxlength: [2000, 'Description cannot exceed 2000 characters']
  },
  type: {
    type: String,
    enum: ['job', 'internship', 'volunteer', 'project', 'mentorship'],
    required: [true, 'Opportunity type is required']
  },
  category: {
    type: String,
    required: [true, 'Category is required']
  },
  requirements: {
    education: [{
      level: {
        type: String,
        enum: ['high-school', 'associate', 'bachelor', 'master', 'phd', 'any']
      },
      field: String
    }],
    experience: {
      minYears: {
        type: Number,
        default: 0
      },
      maxYears: Number,
      required: [String]
    },
    skills: [{
      name: String,
      level: {
        type: String,
        enum: ['beginner', 'intermediate', 'advanced', 'expert']
      },
      required: {
        type: Boolean,
        default: false
      }
    }],
    languages: [{
      language: String,
      proficiency: {
        type: String,
        enum: ['basic', 'conversational', 'professional', 'native']
      }
    }]
  },
  location: {
    type: {
      type: String,
      enum: ['remote', 'on-site', 'hybrid'],
      required: [true, 'Location type is required']
    },
    address: String,
    city: String,
    state: String,
    country: String,
    coordinates: {
      latitude: Number,
      longitude: Number
    }
  },
  compensation: {
    type: {
      type: String,
      enum: ['paid', 'unpaid', 'stipend', 'equity', 'other']
    },
    amount: {
      min: Number,
      max: Number,
      currency: {
        type: String,
        default: 'USD'
      },
      period: {
        type: String,
        enum: ['hourly', 'daily', 'weekly', 'monthly', 'yearly', 'project']
      }
    },
    benefits: [String]
  },
  schedule: {
    startDate: {
      type: Date,
      required: [true, 'Start date is required']
    },
    endDate: Date,
    duration: {
      type: String,
      enum: ['1-week', '2-weeks', '1-month', '2-months', '3-months', '6-months', '1-year', 'ongoing']
    },
    hoursPerWeek: Number,
    flexibility: {
      type: String,
      enum: ['fixed', 'flexible', 'part-time']
    }
  },
  application: {
    deadline: Date,
    process: [{
      step: String,
      description: String,
      estimatedTime: String
    }],
    requirements: [String],
    documents: [{
      type: {
        type: String,
        enum: ['resume', 'cover-letter', 'portfolio', 'certificate', 'other']
      },
      required: {
        type: Boolean,
        default: true
      }
    }]
  },
  status: {
    type: String,
    enum: ['draft', 'active', 'paused', 'closed', 'filled'],
    default: 'draft'
  },
  visibility: {
    type: String,
    enum: ['public', 'private', 'invite-only'],
    default: 'public'
  },
  tags: [String],
  images: [{
    public_id: String,
    url: String,
    caption: String
  }],
  metrics: {
    views: {
      type: Number,
      default: 0
    },
    applications: {
      type: Number,
      default: 0
    },
    shortlisted: {
      type: Number,
      default: 0
    },
    hired: {
      type: Number,
      default: 0
    }
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Index for search functionality
opportunitySchema.index({ 
  title: 'text', 
  description: 'text', 
  category: 'text',
  tags: 'text',
  'location.city': 'text',
  'location.country': 'text'
});

// Compound indexes for filtering
opportunitySchema.index({ type: 1, status: 1, isActive: 1 });
opportunitySchema.index({ 'location.type': 1, 'location.country': 1 });
opportunitySchema.index({ 'compensation.type': 1, 'schedule.startDate': 1 });

export default mongoose.model('Opportunity', opportunitySchema);


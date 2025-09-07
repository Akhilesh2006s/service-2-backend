import mongoose from 'mongoose';

const applicationSchema = new mongoose.Schema({
  opportunity: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Opportunity',
    required: true
  },
  employee: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee',
    required: true
  },
  organization: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    required: true
  },
  personalInfo: {
    firstName: {
      type: String,
      required: true
    },
    lastName: {
      type: String,
      required: true
    },
    email: {
      type: String,
      required: true
    },
    phone: {
      type: String,
      required: true
    },
    address: {
      type: String,
      required: true
    },
    city: {
      type: String,
      required: true
    },
    state: {
      type: String,
      required: true
    },
    country: {
      type: String,
      required: true
    },
    dateOfBirth: {
      type: Date,
      required: true
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
    gpa: String
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
    description: String
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
    yearsOfExperience: {
      type: Number,
      default: 0
    }
  }],
  coverLetter: {
    type: String,
    required: true
  },
  availability: {
    startDate: {
      type: Date,
      required: true
    },
    hoursPerWeek: {
      type: Number,
      required: true
    },
    workMode: {
      type: String,
      enum: ['remote', 'on-site', 'hybrid'],
      required: true
    }
  },
  documents: {
    resume: {
      public_id: String,
      url: String,
      name: String
    },
    coverLetter: {
      public_id: String,
      url: String,
      name: String
    },
    portfolio: String,
    linkedin: String,
    github: String
  },
  additionalInfo: {
    whyInterested: String,
    relevantExperience: String,
    questions: String
  },
  status: {
    type: String,
    enum: ['submitted', 'reviewing', 'shortlisted', 'interview', 'accepted', 'rejected', 'withdrawn'],
    default: 'submitted'
  },
  submittedAt: {
    type: Date,
    default: Date.now
  },
  reviewedAt: Date,
  shortlistedAt: Date,
  acceptedAt: Date,
  rejectedAt: Date,
  withdrawnAt: Date,
  notes: [{
    note: String,
    addedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    addedAt: {
      type: Date,
      default: Date.now
    }
  }],
  interviewData: {
    date: String,
    time: String,
    datetime: Date,
    duration: Number,
    type: {
      type: String,
      enum: ['video', 'phone', 'in-person']
    },
    location: String,
    meetingLink: String,
    notes: String,
    interviewer: String,
    interviewerEmail: String,
    status: {
      type: String,
      enum: ['scheduled', 'completed', 'cancelled'],
      default: 'scheduled'
    },
    scheduledAt: {
      type: Date,
      default: Date.now
    }
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Index for efficient queries
applicationSchema.index({ opportunity: 1, employee: 1 });
applicationSchema.index({ organization: 1, status: 1 });
applicationSchema.index({ employee: 1, status: 1 });
applicationSchema.index({ submittedAt: -1 });

export default mongoose.model('Application', applicationSchema);
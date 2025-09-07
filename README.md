# Inkaranya Backend API

A comprehensive backend API for Inkaranya - A Platform for Experiential Learning, connecting organizations with employees for various opportunities including jobs, internships, volunteer work, and projects.

## Features

### 🏢 Organization Dashboard
- **Profile Management**: Complete organization profile with logo, images, and verification
- **Opportunity Management**: Create, update, and manage job postings, internships, and projects
- **Application Management**: Review, shortlist, and manage candidate applications
- **Analytics**: Track application metrics, match scores, and hiring success rates
- **Interview Scheduling**: Schedule and manage interviews with candidates
- **Offer Management**: Make offers and track offer responses

### 👤 Employee Dashboard
- **Profile Management**: Comprehensive employee profile with skills, experience, and preferences
- **Opportunity Discovery**: Search and filter opportunities based on skills, location, and preferences
- **Application Tracking**: Track application status and manage multiple applications
- **Document Management**: Upload and manage resumes, portfolios, and certificates
- **Recommendations**: Get personalized opportunity recommendations based on profile
- **Saved Opportunities**: Save interesting opportunities for later application

### 🤝 Matching System
- **Smart Matching**: AI-powered matching between opportunities and candidates
- **Match Scoring**: Calculate compatibility scores based on skills, experience, and preferences
- **Recommendation Engine**: Suggest relevant opportunities and candidates
- **Analytics**: Track matching success rates and performance metrics

## Tech Stack

- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: JWT (JSON Web Tokens)
- **File Upload**: Cloudinary integration
- **Validation**: Express Validator
- **Security**: Helmet, CORS, Rate Limiting

## API Endpoints

### Authentication (`/api/auth`)
- `POST /register` - Register new user (organization/employee)
- `POST /login` - User login
- `GET /me` - Get current user profile
- `POST /logout` - User logout
- `POST /refresh` - Refresh JWT token

### Organization Dashboard (`/api/organizations`)
- `GET /dashboard` - Get organization dashboard data
- `GET /profile` - Get organization profile
- `PUT /profile` - Update organization profile
- `POST /upload-logo` - Upload organization logo
- `POST /upload-images` - Upload organization images
- `GET /opportunities` - Get organization's opportunities
- `GET /applications` - Get applications for organization's opportunities
- `PUT /applications/:id/status` - Update application status

### Employee Dashboard (`/api/employees`)
- `GET /dashboard` - Get employee dashboard data
- `GET /profile` - Get employee profile
- `PUT /profile` - Update employee profile
- `POST /upload-profile-picture` - Upload profile picture
- `POST /upload-documents` - Upload documents (resume, certificates)
- `GET /opportunities` - Search and filter opportunities
- `GET /applications` - Get employee's applications
- `GET /saved-opportunities` - Get saved opportunities
- `GET /recommendations` - Get personalized recommendations

### Opportunities (`/api/opportunities`)
- `GET /` - Get all public opportunities (with search/filter)
- `GET /:id` - Get single opportunity details
- `POST /` - Create new opportunity (organization only)
- `PUT /:id` - Update opportunity (organization only)
- `DELETE /:id` - Delete opportunity (organization only)
- `POST /:id/upload-images` - Upload opportunity images
- `GET /:id/applications` - Get applications for opportunity

### Applications (`/api/applications`)
- `POST /` - Submit application for opportunity
- `POST /:id/upload-documents` - Upload application documents
- `GET /:id` - Get application details
- `PUT /:id/status` - Update application status (organization only)
- `PUT /:id/interview` - Schedule interview (organization only)
- `PUT /:id/offer` - Make offer (organization only)
- `PUT /:id/withdraw` - Withdraw application (employee only)

### Matching System (`/api/matching`)
- `GET /opportunities/:id/candidates` - Get matching candidates for opportunity
- `GET /employees/:id/opportunities` - Get matching opportunities for employee
- `GET /analytics` - Get matching analytics

## Installation & Setup

### Prerequisites
- Node.js (v16 or higher)
- MongoDB Atlas account or local MongoDB instance
- Cloudinary account (for file uploads)

### 1. Clone and Install Dependencies
```bash
cd backend
npm install
```

### 2. Environment Configuration
Create a `.env` file in the backend directory:
```env
# Database
MONGO_URI=mongodb+srv://akhileshsamayamanthula:rxvIPIT4Bzobk9Ne@cluster0.4ej8ne2.mongodb.net/INKARANYA?retryWrites=true&w=majority&appName=Cluster0

# JWT
JWT_SECRET=your_super_secret_jwt_key_here
JWT_EXPIRE=7d

# Server
PORT=5000
NODE_ENV=development

# Cloudinary (for image uploads)
CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_API_SECRET=your_cloudinary_api_secret

# Frontend URL
FRONTEND_URL=http://localhost:5173
```

### 3. Start the Server
```bash
# Development mode
npm run dev

# Production mode
npm start
```

The server will start on `http://localhost:5000`

## Database Models

### User
- Basic authentication information
- Role-based access (organization/employee)
- Email verification and password reset

### Organization
- Company information and verification
- Location and contact details
- Logo and images
- Rating and reviews

### Employee
- Personal information and profile
- Education and experience
- Skills and preferences
- Documents and portfolio

### Opportunity
- Job/internship/project details
- Requirements and compensation
- Application process and timeline
- Metrics and analytics

### Application
- Application status and timeline
- Documents and cover letter
- Interview scheduling
- Offer management

## Security Features

- **JWT Authentication**: Secure token-based authentication
- **Role-based Access Control**: Different permissions for organizations and employees
- **Input Validation**: Comprehensive validation using express-validator
- **Rate Limiting**: Protection against brute force attacks
- **CORS Configuration**: Secure cross-origin resource sharing
- **Helmet**: Security headers for Express
- **Password Hashing**: Bcrypt for secure password storage

## File Upload

The API supports file uploads through Cloudinary integration:
- Profile pictures and logos
- Organization images
- Opportunity images
- Documents (resumes, certificates, portfolios)

## Error Handling

Comprehensive error handling with:
- Validation errors
- Authentication errors
- Database errors
- File upload errors
- Custom error messages

## API Response Format

All API responses follow a consistent format:
```json
{
  "status": "success|error",
  "message": "Response message",
  "data": { ... },
  "errors": [ ... ] // Only for validation errors
}
```

## Development

### Scripts
- `npm run dev` - Start development server with nodemon
- `npm start` - Start production server
- `npm test` - Run tests (when implemented)

### Code Structure
```
backend/
├── models/          # Database models
├── routes/          # API routes
├── middleware/      # Custom middleware
├── server.js        # Main server file
├── package.json     # Dependencies
└── README.md        # Documentation
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

MIT License - see LICENSE file for details

## Support

For support and questions, please contact the development team or create an issue in the repository.

#   s e r v i c e - 2 - b a c k e n d  
 
# Quick Start Guide - Inkaranya Backend

## 🚀 Get Started in 5 Minutes

### 1. Install Dependencies
```bash
cd backend
npm install
```

### 2. Setup Environment
```bash
# Run the setup script
npm run setup

# Or manually copy the environment file
cp env.example .env
```

### 3. Configure Environment Variables
Edit the `.env` file with your settings:

```env
# Database (already configured)
MONGO_URI=mongodb+srv://akhileshsamayamanthula:rxvIPIT4Bzobk9Ne@cluster0.4ej8ne2.mongodb.net/INKARANYA?retryWrites=true&w=majority&appName=Cluster0

# JWT Secret (generate a strong secret)
JWT_SECRET=your_super_secret_jwt_key_here_make_it_long_and_random

# Server
PORT=5000
NODE_ENV=development

# Cloudinary (optional - for file uploads)
CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_API_SECRET=your_cloudinary_api_secret

# Frontend URL
FRONTEND_URL=http://localhost:5173
```

### 4. Test Setup
```bash
npm run test-setup
```

### 5. Start Development Server
```bash
npm run dev
```

The server will start at `http://localhost:5000`

## 🧪 Test the API

### Health Check
```bash
curl http://localhost:5000/api/health
```

### Register a New Organization
```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "org@example.com",
    "password": "password123",
    "role": "organization",
    "name": "Tech Corp",
    "description": "A technology company",
    "industry": "Technology",
    "size": "51-200"
  }'
```

### Register a New Employee
```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "employee@example.com",
    "password": "password123",
    "role": "employee",
    "firstName": "John",
    "lastName": "Doe",
    "phone": "+1234567890"
  }'
```

### Login
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "org@example.com",
    "password": "password123"
  }'
```

## 📱 Frontend Integration

The backend is designed to work with your existing React frontend. Update your frontend API calls to point to:

```
http://localhost:5000/api/
```

### Example API Integration
```javascript
// In your React app
const API_BASE_URL = 'http://localhost:5000/api';

// Login function
const login = async (email, password) => {
  const response = await fetch(`${API_BASE_URL}/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email, password }),
  });
  
  const data = await response.json();
  if (data.status === 'success') {
    localStorage.setItem('token', data.data.token);
    return data.data;
  }
  throw new Error(data.message);
};

// Get opportunities
const getOpportunities = async () => {
  const token = localStorage.getItem('token');
  const response = await fetch(`${API_BASE_URL}/opportunities`, {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });
  
  return response.json();
};
```

## 🎯 Key Features

### Organization Dashboard
- ✅ Create and manage opportunities
- ✅ Review applications
- ✅ Schedule interviews
- ✅ Make offers
- ✅ Analytics and metrics

### Employee Dashboard
- ✅ Search opportunities
- ✅ Apply for positions
- ✅ Track applications
- ✅ Upload documents
- ✅ Get recommendations

### Matching System
- ✅ Smart candidate matching
- ✅ Opportunity recommendations
- ✅ Match scoring
- ✅ Analytics

## 🔧 Troubleshooting

### Common Issues

1. **MongoDB Connection Error**
   - Check if the MONGO_URI is correct
   - Ensure MongoDB Atlas allows connections from your IP

2. **JWT Secret Error**
   - Make sure JWT_SECRET is set in .env
   - Use a long, random string

3. **Port Already in Use**
   - Change PORT in .env file
   - Or kill the process using port 5000

4. **File Upload Issues**
   - Configure Cloudinary credentials
   - Or disable file upload features temporarily

### Getting Help

- Check the full README.md for detailed documentation
- Review the API endpoints in the routes/ directory
- Test individual endpoints using the test-setup script

## 🎉 You're Ready!

Your Inkaranya backend is now running and ready to power your experiential learning platform!


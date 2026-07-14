import express from 'express';
import cors from 'cors';
import {
  cloudinary,
  configureSocket,
  rateLimits,
  sapConfig
} from './config/index.js';

// Route imports
import authRoutes from './routes/authRoutes.js';
import userRoutes from './routes/userRoutes.js';
import shopCardRoutes from './routes/shopCardRoutes.js';
import auctionRoutes from './routes/auctionRoutes.js';
import cartRoutes from './routes/cartRoutes.js';
import paymentRoutes from './routes/paymentRoutes.js';
import orderRoutes from './routes/orderRoutes.js';
import subscriptionRoutes from './routes/subscriptionRoutes.js';
import analyticsRoutes from './routes/analyticsRoutes.js'
import sapAnalyticsRoutes from './routes/sapAnalyticsRoutes.js';
import sapLegacyRoutes from './routes/sapLegacyRoutes.js';  // Add this import
import cloudinaryRoutes from './routes/cloudinaryRoutes.js';
import resaleRoutes from './routes/resaleRoutes.js';
import storyRoutes from './routes/storyRoutes.js';
import auctionRequestRoutes from './routes/auctionRequestRoutes.js';
import { User } from './models/userModel.js';
const app = express();

// Enhanced CORS configuration
const corsOptions = {
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'] // Added 'PATCH'
};

app.use(cors(corsOptions));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health check endpoint
app.get('/', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    message: 'Artisan Marketplace API',
    version: process.env.npm_package_version || '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    services: {
      database: 'connected',
      cloudinary: cloudinary.config().cloud_name ? 'configured' : 'disabled',
      sapAnalytics: sapConfig.groq ? 'available' : 'disabled',
      paymentGateway: 'cashfree'
    },
    timestamp: new Date().toISOString()
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/user', userRoutes);
app.use('/api/shopcards', shopCardRoutes);
app.use('/api/auctions', auctionRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/payment', paymentRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/subscription', subscriptionRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api', sapAnalyticsRoutes);        
app.use('/api/analytics', sapLegacyRoutes);   
app.use('/api/cloudinary', cloudinaryRoutes);
app.use('/api/resale', resaleRoutes);
app.use('/api/stories', storyRoutes);
app.use('/api/auction-requests', auctionRequestRoutes);
// Error handling middleware
app.use((err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  const isProduction = process.env.NODE_ENV === 'production';
  
  console.error(`API Error [${req.method} ${req.path}]:`, {
    error: err.message,
    stack: isProduction ? undefined : err.stack,
    body: req.body,
    params: req.params,
    user: req.user?.id
  });

  res.status(statusCode).json({
    success: false,
    error: isProduction && statusCode === 500 ? 'Internal Server Error' : err.message,
    code: err.code || 'INTERNAL_ERROR',
    ...(!isProduction && { stack: err.stack })
  });
});

// 404 Handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found',
    code: 'ENDPOINT_NOT_FOUND',
    suggestedEndpoints: [
      '/api/user',
      '/api/shopcards',
      '/api/analytics'
    ]
  });
});

export default app;
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import morgan from 'morgan';
import connectDB from './config/db.js';

// Load environment variables FIRST
dotenv.config();

// Force console output (sometimes buffering causes issues)
process.stdout.write('\n=== SERVER STARTING ===\n');
console.log('🔧 Node Environment:', process.env.NODE_ENV || 'NOT SET');
console.log('🔧 Port:', process.env.PORT || 5000);

// Import routes
import authRoutes from './routes/authRoutes.js';
import donationRoutes from './routes/donationRoutes.js';
import campaignRoutes from './routes/campaignRoutes.js';
import receiptRoutes from './routes/receiptRoutes.js';
import dashboardRoutes from './routes/dashboardRoutes.js';
import paymentRoutes from './routes/paymentRoutes.js';

// Initialize Express app
const app = express();

// Connect to MongoDB
connectDB();

console.log('\n🔧 SETTING UP MIDDLEWARE...\n');

// ============================================
// FIRST: RAW LOGGING (NO DEPENDENCIES)
// ============================================
app.use((req, res, next) => {
    const timestamp = new Date().toISOString();
    const log = `[${timestamp}] ${req.method} ${req.url} - IP: ${req.ip}`;

    // Force immediate output
    process.stdout.write('\n' + '='.repeat(60) + '\n');
    process.stdout.write(`🌐 ${log}\n`);
    process.stdout.write('='.repeat(60) + '\n');

    console.log('📍 Headers:', JSON.stringify(req.headers, null, 2));

    next();
});

console.log('✅ Raw logging middleware installed');

// ============================================
// MORGAN LOGGING
// ============================================
// Use the simplest morgan format first
app.use(morgan('dev'));
console.log('✅ Morgan logging installed');

// ============================================
// SECURITY & PARSING MIDDLEWARE
// ============================================

// CORS Configuration (BEFORE helmet)
const frontendUrl = (process.env.FRONTEND_URL || 'https://saylani-donation-zakat-system.vercel.app').replace(/\/$/, '');
app.use(cors({
    origin: frontendUrl,
    credentials: true
}));
console.log('✅ CORS installed for origin:', frontendUrl);

// Security Middleware
app.use(helmet());
console.log('✅ Helmet installed');

// Body Parser Middleware
app.use((req, res, next) => {
    if (req.originalUrl === '/api/payment/webhook') {
        next(); // Skip JSON parsing for webhook
    } else {
        express.json()(req, res, next);
    }
});
app.use(express.urlencoded({ extended: true }));
console.log('✅ Body parser installed');

// Rate Limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: 'Too many requests from this IP, please try again later.'
});
app.use('/api/auth', limiter);
console.log('✅ Rate limiter installed');

// ============================================
// RESPONSE LOGGING
// ============================================
app.use((req, res, next) => {
    const originalSend = res.send;

    res.send = function (data) {
        console.log(`📤 RESPONSE: ${res.statusCode} for ${req.method} ${req.url}`);
        originalSend.call(this, data);
    };

    next();
});
console.log('✅ Response logging installed');

// ============================================
// API ROUTES
// ============================================
console.log('\n🔧 REGISTERING ROUTES...\n');

app.use('/api/auth', (req, res, next) => {
    console.log('🔐 Auth route hit:', req.method, req.url);
    next();
}, authRoutes);

app.use('/api/donations', (req, res, next) => {
    console.log('💰 Donations route hit:', req.method, req.url);
    next();
}, donationRoutes);

app.use('/api/campaigns', (req, res, next) => {
    console.log('📢 Campaigns route hit:', req.method, req.url);
    next();
}, campaignRoutes);

app.use('/api/receipts', (req, res, next) => {
    console.log('🧾 Receipts route hit:', req.method, req.url);
    next();
}, receiptRoutes);

app.use('/api/dashboard', (req, res, next) => {
    console.log('📊 Dashboard route hit:', req.method, req.url);
    next();
}, dashboardRoutes);

app.use('/api/payment', (req, res, next) => {
    console.log('💳 Payment route hit:', req.method, req.url);
    next();
}, paymentRoutes);

console.log('✅ All routes registered');

// Health Check Route
app.get('/api/health', (req, res) => {
    console.log('❤️ Health check endpoint called');
    res.status(200).json({
        success: true,
        message: 'Server is running',
        timestamp: new Date().toISOString()
    });
});

// Root Route
app.get('/', (req, res) => {
    console.log('🏠 Root endpoint called');
    res.status(200).json({
        success: true,
        message: 'Welcome to Donation & Zakat Management System API',
        version: '1.0.0',
        endpoints: {
            auth: '/api/auth',
            donations: '/api/donations',
            campaigns: '/api/campaigns',
            receipts: '/api/receipts',
            dashboard: '/api/dashboard',
            payment: '/api/payment'
        }
    });
});

// ============================================
// ERROR HANDLERS
// ============================================

// 404 Handler
app.use((req, res) => {
    console.log(`❌ 404 NOT FOUND: ${req.method} ${req.url}`);
    res.status(404).json({
        success: false,
        message: 'Route not found'
    });
});

// Global Error Handler
app.use((err, req, res, next) => {
    console.error('❌ GLOBAL ERROR HANDLER TRIGGERED:');
    console.error('Error:', err.message);
    console.error('Stack:', err.stack);

    res.status(err.status || 500).json({
        success: false,
        message: err.message || 'Internal Server Error',
        ...(process.env.NODE_ENV === 'development' && { error: err })
    });
});

// ============================================
// START SERVER
// ============================================

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log('\n' + '='.repeat(60));
    console.log('🚀 SERVER IS RUNNING!');
    console.log('='.repeat(60));
    console.log(`📡 Mode: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🌍 Port: ${PORT}`);
    console.log(`🔗 URL: http://localhost:${PORT}`);
    console.log(`🔗 API: http://localhost:${PORT}/api`);
    console.log(`❤️ Health: http://localhost:${PORT}/api/health`);
    console.log('='.repeat(60));
    console.log('\n⏳ WAITING FOR REQUESTS...\n');

    // Test if console is working
    setTimeout(() => {
        console.log('✅ Console output is working! Make a request now.');
    }, 1000);
});

export default app;
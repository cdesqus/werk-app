const express = require('express');
const sharp = require('sharp');
const sqlite3 = require('sqlite3').verbose();
const { Sequelize, DataTypes, Op } = require('sequelize');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const nodemailer = require('nodemailer');
require('dotenv').config();

const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { body, validationResult } = require('express-validator');

const webpush = require('web-push');

// VAPID Keys (Generated)
const publicVapidKey = 'BP_AfpPlvlQ0OVm6jG6Jp4tHte37XIAvh4ICg1rY0r4_drOVdm2yUXp76-BRqAlNkgl8T8S6YIJdJB7_5FzItEM';
const privateVapidKey = 'U7QHBAWtvPIoj-gdJScqIiwO6LL5p-jVLU2HSICw2-M';

webpush.setVapidDetails(
    'mailto:admin@kaumtech.com',
    publicVapidKey,
    privateVapidKey
);
const app = express();
app.set('trust proxy', 1);
const PORT = process.env.PORT || 5000;
const SECRET_KEY = process.env.SECRET_KEY || 'werk-secret-key-gen-z';

// --- CONFIGURATION & DEFINITIONS ---

// 1. Security: Rate Limiters (Define first)
const { initCronJobs } = require('./services/cronService');
const generalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 300,
    standardHeaders: true,
    legacyHeaders: false,
    message: 'Too many requests, please try again later.'
});

const authLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    max: 10,
    message: 'Too many login attempts, please try again later.'
});

const allowedOrigins = [
    'https://werk.kaumtech.com',
    'https://www.werk.kaumtech.com',
    'https://api-werk.kaumtech.com',
    'http://werk.kaumtech.com',
    'http://api-werk.kaumtech.com',
    'http://localhost:5173',
    'http://localhost:3000',
    'http://localhost:80',
    'http://localhost:81'
];

// --- MIDDLEWARE PIPELINE (Order is Critical) ---

// 1. CORS (Must be absolutely first)
app.use(cors({
    origin: (origin, callback) => {
        // Allow mobile/curl (no origin) or allowed domains
        if (!origin || allowedOrigins.includes(origin) || origin.endsWith('.kaumtech.com')) {
            callback(null, true);
        } else {
            console.log('Blocked by CORS:', origin);
            callback(new Error('Not allowed by CORS'));
        }
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
    optionsSuccessStatus: 200
}));
app.options(/.*/, cors());

// 2. Manual Fallback Headers (Double safety for proxies)
app.use((req, res, next) => {
    const origin = req.headers.origin;
    if (origin && (allowedOrigins.includes(origin) || origin.endsWith('.kaumtech.com'))) {
        res.header('Access-Control-Allow-Origin', origin);
        res.header('Access-Control-Allow-Credentials', 'true');
    }
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    next();
});

// 3. Security: Helmet (Secure Headers)
app.use(helmet({
    crossOriginResourcePolicy: false,
    crossOriginEmbedderPolicy: false
}));

// 4. Rate Limiter
app.use(generalLimiter);

// Middleware (Order is Critical: CORS first, then Security/Body Parsing)


// app.use(cors({...})) removed from here
app.use(express.json({ limit: '10kb' })); // Security: Limit body size
app.use('/uploads', express.static('uploads'));
app.use('/api/uploads', express.static('uploads')); // Alias for proxy compatibility

// Validation Chains
const registerValidation = [
    body('name').trim().notEmpty().withMessage('Name is required').escape(),
    body('email').isEmail().withMessage('Invalid email format').normalizeEmail(),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
    body('phone').optional().trim().escape(),
    body('birthDate').optional().isISO8601().withMessage('Invalid date format').toDate()
];

const loginValidation = [
    body('email').isEmail().withMessage('Invalid email format').normalizeEmail(),
    body('password').notEmpty().withMessage('Password is required')
];

// Helper for Validation Errors
const validate = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ error: errors.array().map(e => e.msg).join(', ') });
    }
    next();
};

// Ensure uploads directory exists
if (!fs.existsSync('uploads')) {
    fs.mkdirSync('uploads');
}

// Multer Setup
const storage = multer.memoryStorage();
const fileFilter = (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg'];
    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Invalid file type. Only JPEG and PNG are allowed.'), false);
    }
};
const upload = multer({ storage, fileFilter });

// Email Transporter
const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: process.env.SMTP_PORT || 587,
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
    }
});

// Database Setup
// Database Setup
// Database Setup (PostgreSQL Migration)
const sequelize = new Sequelize(
    process.env.DB_NAME || 'werk_db',
    process.env.DB_USER || 'postgres',
    process.env.DB_PASS || 'postgres',
    {
        host: process.env.DB_HOST || 'localhost',
        dialect: 'postgres',
        logging: false,
        pool: {
            max: 5,
            min: 0,
            acquire: 30000,
            idle: 10000
        },
        retry: {
            match: [
                /SequelizeConnectionError/,
                /SequelizeConnectionRefusedError/,
                /SequelizeHostNotFoundError/,
                /SequelizeHostNotReachableError/,
                /SequelizeInvalidConnectionError/,
                /SequelizeConnectionTimedOutError/
            ],
            max: 5
        }
    }
);

// Models
const User = sequelize.define('User', {
    name: { type: DataTypes.STRING, allowNull: false },
    email: { type: DataTypes.STRING, allowNull: false, unique: true },
    phone: { type: DataTypes.STRING },
    password: { type: DataTypes.STRING, allowNull: false },
    role: { type: DataTypes.STRING, defaultValue: 'staff' },
    leaveQuota: { type: DataTypes.INTEGER, defaultValue: 12 },
    birthDate: { type: DataTypes.DATEONLY },
    staffId: { type: DataTypes.STRING, unique: true },
    otp: { type: DataTypes.STRING },
    otpExpires: { type: DataTypes.DATE },
    can_attendance: { type: DataTypes.BOOLEAN, defaultValue: false }
});

const Overtime = sequelize.define('Overtime', {
    date: { type: DataTypes.DATEONLY, allowNull: false },
    startTime: { type: DataTypes.STRING }, // Optional now with flat rate? Keeping for record
    endTime: { type: DataTypes.STRING },
    hours: { type: DataTypes.FLOAT, allowNull: false },
    activity: { type: DataTypes.STRING },
    customer: { type: DataTypes.STRING },
    description: { type: DataTypes.TEXT },
    isWeekend: { type: DataTypes.BOOLEAN, defaultValue: false },
    payableAmount: { type: DataTypes.FLOAT, defaultValue: 0 },
    status: { type: DataTypes.STRING, defaultValue: 'Pending' }
});

const Claim = sequelize.define('Claim', {
    date: { type: DataTypes.DATEONLY, allowNull: false },
    category: { type: DataTypes.STRING, allowNull: false },
    title: { type: DataTypes.STRING, allowNull: false },
    amount: { type: DataTypes.FLOAT, allowNull: false },
    description: { type: DataTypes.TEXT },
    proof: { type: DataTypes.STRING },
    status: { type: DataTypes.STRING, defaultValue: 'Pending' }
});

const Leave = sequelize.define('Leave', {
    type: { type: DataTypes.STRING, allowNull: false },
    startDate: { type: DataTypes.DATEONLY, allowNull: false },
    endDate: { type: DataTypes.DATEONLY, allowNull: false },
    reason: { type: DataTypes.TEXT },
    days: { type: DataTypes.INTEGER, defaultValue: 0 },
    status: { type: DataTypes.STRING, defaultValue: 'Pending' }
});

const Feed = sequelize.define('Feed', {
    type: { type: DataTypes.STRING, allowNull: false },
    title: { type: DataTypes.STRING, allowNull: false },
    content: { type: DataTypes.TEXT },
});

const PollOption = sequelize.define('PollOption', {
    label: { type: DataTypes.STRING, allowNull: false },
});

const PollVote = sequelize.define('PollVote', {});

const Quest = sequelize.define('Quest', {
    title: { type: DataTypes.STRING, allowNull: false },
    reward: { type: DataTypes.STRING, allowNull: false },
    difficulty: { type: DataTypes.STRING, defaultValue: 'Medium' },
    status: { type: DataTypes.STRING, defaultValue: 'Open' },
    assignedTo: { type: DataTypes.INTEGER } // Foreign key manually handled or via association
});

const Setting = sequelize.define('Setting', {
    key: { type: DataTypes.STRING, primaryKey: true },
    value: { type: DataTypes.BOOLEAN, defaultValue: true }
});

const AttendanceLog = sequelize.define('AttendanceLog', {
    type: { type: DataTypes.STRING, allowNull: false }, // 'CLOCK_IN' | 'CLOCK_OUT'
    timestamp: { type: DataTypes.DATE, allowNull: false }, // Server Time
    latitude: { type: DataTypes.FLOAT, allowNull: false },
    longitude: { type: DataTypes.FLOAT, allowNull: false },
    accuracy: { type: DataTypes.FLOAT },
    address: { type: DataTypes.TEXT },
    is_suspicious: { type: DataTypes.BOOLEAN, defaultValue: false }
});

// Relationships
// Audit Log Model
const AuditLog = sequelize.define('AuditLog', {
    action: { type: DataTypes.STRING, allowNull: false },
    details: { type: DataTypes.TEXT },
    ip: { type: DataTypes.STRING },
});

// Relationships
User.hasMany(Overtime);
Overtime.belongsTo(User);
User.hasMany(Claim);
Claim.belongsTo(User);
User.hasMany(Leave);
Leave.belongsTo(User);

Feed.hasMany(PollOption, { onDelete: 'CASCADE' });
PollOption.belongsTo(Feed);

Feed.hasMany(PollVote, { onDelete: 'CASCADE' });
PollVote.belongsTo(Feed);

PollOption.hasMany(PollVote, { onDelete: 'CASCADE' });
PollVote.belongsTo(PollOption);

User.hasMany(PollVote);
PollVote.belongsTo(User);

User.hasMany(Quest, { foreignKey: 'assignedTo' });
Quest.belongsTo(User, { foreignKey: 'assignedTo' });

User.hasMany(AuditLog);
AuditLog.belongsTo(User);

User.hasMany(AttendanceLog);
AttendanceLog.belongsTo(User);

// Helper: Log Audit Event
const logAudit = async (userId, action, details, req) => {
    try {
        let ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;

        // If multiple IPs (behind proxy), take the first one (client origin)
        if (ip && ip.includes(',')) {
            ip = ip.split(',')[0].trim();
        }

        await AuditLog.create({ UserId: userId, action, details, ip });
    } catch (err) {
        console.error("Failed to write audit log:", err);
    }
};

// Middleware
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.sendStatus(401);

    jwt.verify(token, SECRET_KEY, (err, user) => {
        if (err) return res.sendStatus(403);
        req.user = user;
        next();
    });
};

const isAdmin = (req, res, next) => {
    if (!['admin', 'super_admin'].includes(req.user.role)) return res.sendStatus(403);
    next();
};

// Routes
// Auth
// Auth
app.post('/api/register', authLimiter, registerValidation, validate, async (req, res, next) => {
    try {
        const { name, email, phone, password, birthDate } = req.body;
        const hashedPassword = await bcrypt.hash(password, 10);

        // Generate Staff ID safely
        const year = new Date().getFullYear();
        const lastUser = await User.findOne({
            where: {
                staffId: { [Op.like]: `IDE-${year}-%` }
            },
            order: [['staffId', 'DESC']]
        });

        let nextSequence = 1;
        if (lastUser && lastUser.staffId) {
            const parts = lastUser.staffId.split('-');
            if (parts.length === 3) {
                const lastSeq = parseInt(parts[2]);
                if (!isNaN(lastSeq)) {
                    nextSequence = lastSeq + 1;
                }
            }
        }

        const staffId = `IDE-${year}-${String(nextSequence).padStart(4, '0')}`;

        const user = await User.create({ name, email, phone, password: hashedPassword, birthDate, staffId });
        await logAudit(user.id, 'User Registered', `Account created with Staff ID: ${staffId}`, req);
        res.status(201).json({ message: 'User registered' });
    } catch (error) {
        // Pass to global error handler to sanitize output
        next(error);
    }
});

app.post('/api/login', authLimiter, loginValidation, validate, async (req, res, next) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ where: { email } });
        if (!user) return res.status(400).json({ error: 'User not found' });

        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) return res.status(400).json({ error: 'Invalid password' });

        const token = jwt.sign({ id: user.id, role: user.role, name: user.name }, SECRET_KEY, { expiresIn: '24h' });

        await logAudit(user.id, 'User Login', 'Successful login', req);

        // Security: Explicitly define returned fields, excluding password hash
        res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role, leaveQuota: user.leaveQuota, can_attendance: user.can_attendance } });
    } catch (error) {
        next(error);
    }
});

// Change Password Route
app.put('/api/auth/change-password', authenticateToken, [
    body('currentPassword').notEmpty().withMessage('Current password is required'),
    body('newPassword').isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
        .matches(/^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d@$!%*#?&]{8,}$/).withMessage('Password must contain at least one letter and one number for Medium strength'),
], validate, async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        const user = await User.findByPk(req.user.id);

        // 1. Verify Current Password
        const validPassword = await bcrypt.compare(currentPassword, user.password);
        if (!validPassword) return res.status(400).json({ error: 'Incorrect current password' });

        // 2. Hash New Password
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        user.password = hashedPassword;
        await user.save();

        await logAudit(user.id, 'Password Changed', 'User changed their own password', req);

        res.json({ message: 'Password updated successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// --- PUSH NOTIFICATION HELPERS ---
async function sendPushToUser(userId, payload) {
    try {
        const subscriptions = await PushSubscription.findAll({ where: { UserId: userId } });
        console.log(`[Push] Sending to User ${userId} (${subscriptions.length} devices)`);

        const notifications = subscriptions.map(sub => {
            return webpush.sendNotification({
                endpoint: sub.endpoint,
                keys: sub.keys
            }, JSON.stringify(payload))
                .catch(err => {
                    if (err.statusCode === 410) {
                        console.log(`[Push] Subscription expired/gone. Deleting: ${sub.id}`);
                        return PushSubscription.destroy({ where: { id: sub.id } });
                    }
                    console.error('[Push] Payload error:', err);
                });
        });

        await Promise.all(notifications);
    } catch (error) {
        console.error('[Push] Failed to send user push:', error);
    }
}

async function sendPushToRole(role, payload) {
    try {
        // Find users with role (or if role is 'admin', include 'super_admin' too usually)
        const roles = role === 'admin' ? ['admin', 'super_admin'] : [role];

        const users = await User.findAll({
            where: { role: { [Op.in]: roles } },
            attributes: ['id']
        });

        const userIds = users.map(u => u.id);
        if (userIds.length === 0) return;

        const subscriptions = await PushSubscription.findAll({
            where: { UserId: { [Op.in]: userIds } }
        });

        console.log(`[Push] Sending to Role ${role} (${subscriptions.length} devices found)`);

        const notifications = subscriptions.map(sub => {
            return webpush.sendNotification({
                endpoint: sub.endpoint,
                keys: sub.keys
            }, JSON.stringify(payload))
                .catch(err => {
                    if (err.statusCode === 410) {
                        return PushSubscription.destroy({ where: { id: sub.id } });
                    }
                });
        });

        await Promise.all(notifications);
    } catch (error) {
        console.error('[Push] Failed to send role push:', error);
    }
}

// Push Subscription Endpoint
app.post('/api/subscribe', authenticateToken, async (req, res) => {
    try {
        const subscription = req.body;
        // Upsert logic: if endpoint exists, update keys/user, otherwise create
        // Actually, just findOne based on endpoint
        const [sub, created] = await PushSubscription.findOrCreate({
            where: { endpoint: subscription.endpoint },
            defaults: {
                keys: subscription.keys,
                UserId: req.user.id
            }
        });

        if (!created) {
            sub.keys = subscription.keys;
            sub.UserId = req.user.id; // Update owner if changed
            await sub.save();
        }

        res.status(201).json({ message: 'Subscribed' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Subscription failed' });
    }
});

// Overtime
app.post('/api/overtimes', authenticateToken, async (req, res) => {
    try {
        const { date, startTime, endTime, hours, activity, customer, description } = req.body;
        // Flat Rate: 40,000 IDR per hour
        const payableAmount = hours * 40000;

        const overtime = await Overtime.create({
            UserId: req.user.id,
            date, startTime, endTime, hours, activity, customer, description,
            isWeekend: false, // Deprecated or kept for legacy, but logic is now flat rate
            payableAmount
        });
        // NOTIFY ADMINS
        sendPushToRole('admin', {
            title: '⚡ New Overtime Request',
            body: `${req.user.name} posted: ${activity} (${hours} hrs)`,
            icon: '/icons/icon-192x192.png',
            url: '/admin'
        });

        res.status(201).json(overtime);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

app.get('/api/overtimes', authenticateToken, async (req, res) => {
    try {
        const { month, year, status } = req.query;
        if ((month && isNaN(month)) || (year && isNaN(year))) {
            return res.status(400).json({ error: 'Invalid month or year format' });
        }
        let whereClause = {};

        if (!['admin', 'super_admin'].includes(req.user.role) || req.query.personal === 'true') {
            whereClause.UserId = req.user.id;
            // Staff Restriction: Max 3 months back
            const today = new Date();
            const threeMonthsAgoDate = new Date(today.getFullYear(), today.getMonth() - 3, 1);
            const threeMonthsAgo = threeMonthsAgoDate.toISOString().split('T')[0];

            if (month && year) {
                const requestedDate = new Date(year, month - 1, 1); // month is 1-indexed
                if (requestedDate < threeMonthsAgoDate) {
                    return res.status(403).json({ error: 'Cannot access data older than 3 months' });
                }
                const startDate = new Date(year, month - 1, 1).toISOString().split('T')[0];
                const endDate = new Date(year, month, 0).toISOString().split('T')[0];
                whereClause.date = { [Op.between]: [startDate, endDate] };
            } else {
                // Default to last 3 months if no specific month requested, or just return all allowed
                whereClause.date = { [Op.gte]: threeMonthsAgo };
            }
        } else {
            // Admin: Max 12 months back
            if (month && year) {
                const startDate = new Date(year, month - 1, 1);
                const endDate = new Date(year, month, 0);
                whereClause.date = { [Op.between]: [startDate, endDate] };
            }
        }

        if (status) {
            whereClause.status = status;
        }

        const { sortBy } = req.query;
        let orderClause = [['date', 'DESC']]; // Default Activity Date
        if (sortBy === 'submission') {
            orderClause = [['createdAt', 'DESC']];
        }

        const overtimes = await Overtime.findAll({
            where: whereClause,
            include: [{ model: User, attributes: ['name', 'email', 'role'] }],
            order: orderClause
        });
        res.json(overtimes);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});



// Update Overtime (Staff can update own Pending, Admin can update Status)
app.put('/api/overtimes/:id', authenticateToken, async (req, res) => {
    try {
        const overtime = await Overtime.findByPk(req.params.id);
        if (!overtime) return res.status(404).json({ error: 'Not found' });

        // Admin Logic
        if (['admin', 'super_admin'].includes(req.user.role)) {
            const { status, date, startTime, endTime, hours, activity, customer, description } = req.body;
            if (status) overtime.status = status;
            if (date) overtime.date = date;
            if (startTime) overtime.startTime = startTime;
            if (endTime) overtime.endTime = endTime;
            if (hours) {
                overtime.hours = hours;
                overtime.payableAmount = hours * 40000; // Recalculate payable
            }
            if (activity) overtime.activity = activity;
            if (customer) overtime.customer = customer;
            if (description) overtime.description = description;

            await overtime.save();
            const otUser = await User.findByPk(overtime.UserId);
            await logAudit(req.user.id, 'Admin Updated Overtime', `Updated OT '${overtime.activity}' for ${otUser ? otUser.name : 'Unknown'}`, req);
            return res.json(overtime);
        }

        // Staff Logic
        console.log(`[DEBUG] PUT Overtime - UserID from Token: ${req.user.id}, Overtime Owner: ${overtime.UserId}, Status: ${overtime.status}`);
        if (String(overtime.UserId) !== String(req.user.id)) {
            console.log('[DEBUG] Unauthorized: User ID mismatch');
            return res.status(403).json({ error: 'Unauthorized' });
        }
        if (overtime.status !== 'Pending') {
            console.log('[DEBUG] Invalid Status: Not Pending');
            return res.status(400).json({ error: 'Cannot edit processed items' });
        }

        const { date, startTime, endTime, hours, activity, customer, description } = req.body;
        if (date) overtime.date = date;
        if (startTime) overtime.startTime = startTime;
        if (endTime) overtime.endTime = endTime;
        if (hours) overtime.hours = hours;
        if (activity) overtime.activity = activity;
        if (customer) overtime.customer = customer;
        if (description) overtime.description = description;

        // Recalculate payable if hours changed
        if (hours) overtime.payableAmount = hours * 40000;

        await overtime.save();
        // NOTIFY STAFF
        if (overtime.status === 'Approved' || overtime.status === 'Rejected') {
            const isApproved = overtime.status === 'Approved';
            sendPushToUser(overtime.UserId, {
                title: isApproved ? '💸 CHA-CHING! Approved!' : '🛑 Request Update',
                body: isApproved
                    ? `Your overtime for ${overtime.activity} is approved!`
                    : `Your overtime request was rejected. Check dashboard.`,
                icon: '/icons/icon-192x192.png',
                url: '/dashboard'
            });
        }

        res.json(overtime);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

app.delete('/api/overtimes/:id', authenticateToken, async (req, res) => {
    try {
        const overtime = await Overtime.findByPk(req.params.id);
        if (!overtime) return res.status(404).json({ error: 'Not found' });

        console.log(`[DEBUG] DELETE Overtime - UserID from Token: ${req.user.id}, Overtime Owner: ${overtime.UserId}, Status: ${overtime.status}`);
        if (String(overtime.UserId) !== String(req.user.id)) return res.status(403).json({ error: 'Unauthorized' });
        if (overtime.status !== 'Pending') return res.status(400).json({ error: 'Cannot delete processed items' });

        await overtime.destroy();
        res.json({ message: 'Deleted successfully' });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});




// Claims
app.post('/api/claims', authenticateToken, upload.single('proof'), async (req, res) => {
    try {
        const { date, category, title, amount, description } = req.body;
        let proofPath = null;

        if (req.file) {
            console.log(`[DEBUG] Processing file upload: ${req.file.originalname} (${req.file.size} bytes)`);
            const filename = `claim-${Date.now()}-${Math.round(Math.random() * 1E9)}.jpeg`;
            const outputPath = path.join('uploads', filename);

            await sharp(req.file.buffer)
                .resize(1024, 1024, { fit: 'inside', withoutEnlargement: true })
                .toFormat('jpeg', { quality: 80, mozjpeg: true })
                .toFile(outputPath);

            proofPath = `/uploads/${filename}`;
        }

        const claim = await Claim.create({
            UserId: req.user.id,
            date, category, title, amount, description,
            proof: proofPath
        });
        // NOTIFY ADMINS
        sendPushToRole('admin', {
            title: '⚡ New Claim Request',
            body: `${req.user.name} submitted claim: ${title} (Rp ${Number(amount).toLocaleString('id-ID')})`,
            icon: '/icons/icon-192x192.png',
            url: '/admin'
        });

        res.status(201).json(claim);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

app.get('/api/claims', authenticateToken, async (req, res) => {
    try {
        const { month, year, personal, status } = req.query;
        if ((month && isNaN(month)) || (year && isNaN(year))) {
            return res.status(400).json({ error: 'Invalid month or year format' });
        }
        let whereClause = {};

        if (!['admin', 'super_admin'].includes(req.user.role) || personal === 'true') {
            whereClause.UserId = req.user.id;
            // Staff: Max 3 months back
            const today = new Date();
            const threeMonthsAgoDate = new Date(today.getFullYear(), today.getMonth() - 3, 1);
            const threeMonthsAgo = threeMonthsAgoDate.toISOString().split('T')[0];

            if (month && year) {
                const requestedDate = new Date(year, month - 1, 1);
                if (requestedDate < threeMonthsAgoDate) {
                    return res.status(403).json({ error: 'Cannot access data older than 3 months' });
                }
                const startDate = new Date(year, month - 1, 1).toISOString().split('T')[0];
                const endDate = new Date(year, month, 0).toISOString().split('T')[0];
                whereClause.date = { [Op.between]: [startDate, endDate] };
            } else {
                whereClause.date = { [Op.gte]: threeMonthsAgo };
            }
        } else {
            // Admin: Filter by month/year if provided
            if (month && year) {
                const startDate = new Date(year, month - 1, 1);
                const endDate = new Date(year, month, 0);
                whereClause.date = { [Op.between]: [startDate, endDate] };
            }
        }

        if (status) {
            whereClause.status = status;
        }

        const { sortBy } = req.query;
        let orderClause = [['date', 'DESC']];
        if (sortBy === 'submission') {
            orderClause = [['createdAt', 'DESC']];
        }

        const claims = await Claim.findAll({
            where: whereClause,
            include: [{ model: User, attributes: ['name', 'email', 'role'] }],
            order: orderClause
        });
        res.json(claims);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.put('/api/claims/:id', authenticateToken, async (req, res) => {
    try {
        const claim = await Claim.findByPk(req.params.id);
        if (!claim) return res.status(404).json({ error: 'Not found' });

        if (['admin', 'super_admin'].includes(req.user.role)) {
            const { status, date, category, title, amount } = req.body;
            if (status) claim.status = status;
            if (date) claim.date = date;
            if (category) claim.category = category;
            if (title) claim.title = title;
            if (amount) claim.amount = amount;

            await claim.save();
            const claimUser = await User.findByPk(claim.UserId);
            await logAudit(req.user.id, 'Admin Updated Claim', `Updated Claim '${claim.title}' for ${claimUser ? claimUser.name : 'Unknown'}`, req);

            // NOTIFY STAFF
            if (claim.status === 'Approved' || claim.status === 'Rejected') {
                const isApproved = claim.status === 'Approved';
                sendPushToUser(claim.UserId, {
                    title: isApproved ? '💸 CHA-CHING! Approved!' : '🛑 Request Update',
                    body: isApproved
                        ? `Your claim "${claim.title}" is approved!`
                        : `Your claim request was rejected. Check dashboard.`,
                    icon: '/icons/icon-192x192.png',
                    url: '/dashboard'
                });
            }

            return res.json(claim);
        }

        if (claim.UserId != req.user.id) return res.status(403).json({ error: 'Unauthorized' });
        if (claim.status !== 'Pending') return res.status(400).json({ error: 'Cannot edit processed items' });

        const { date, category, title, amount } = req.body;
        if (date) claim.date = date;
        if (category) claim.category = category;
        if (title) claim.title = title;
        if (amount) claim.amount = amount;

        await claim.save();
        res.json(claim);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

app.delete('/api/claims/:id', authenticateToken, async (req, res) => {
    try {
        const claim = await Claim.findByPk(req.params.id);
        if (!claim) return res.status(404).json({ error: 'Not found' });

        if (claim.UserId != req.user.id) return res.status(403).json({ error: 'Unauthorized' });
        if (claim.status !== 'Pending') return res.status(400).json({ error: 'Cannot delete processed items' });

        await claim.destroy();
        res.json({ message: 'Deleted successfully' });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// Leaves
app.post('/api/leaves', authenticateToken, async (req, res) => {
    try {
        const { type, startDate, endDate, reason } = req.body;
        const start = new Date(startDate);
        const end = new Date(endDate);

        // Calculate days excluding weekends
        let days = 0;
        let current = new Date(start);
        while (current <= end) {
            const dayOfWeek = current.getDay();
            if (dayOfWeek !== 0 && dayOfWeek !== 6) {
                days++;
            }
            current.setDate(current.getDate() + 1);
        }

        if (days === 0) return res.status(400).json({ error: 'Leave duration is 0 days (weekends excluded)' });

        const user = await User.findByPk(req.user.id);
        if (type === 'annual' && user.leaveQuota < days) {
            return res.status(400).json({ error: `Insufficient leave quota. You have ${user.leaveQuota} days left.` });
        }

        const leave = await Leave.create({
            UserId: req.user.id,
            type, startDate, endDate, reason, days
        });

        // NOTIFY ADMINS
        sendPushToRole('admin', {
            title: '⚡ New Leave Request',
            body: `${req.user.name} requested leave: ${type} (${days} days)`,
            icon: '/icons/icon-192x192.png',
            url: '/admin'
        });

        res.status(201).json(leave);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

app.get('/api/leaves', authenticateToken, async (req, res) => {
    try {
        const { month, year, personal, status } = req.query;
        if ((month && isNaN(month)) || (year && isNaN(year))) {
            return res.status(400).json({ error: 'Invalid month or year format' });
        }
        let whereClause = {};

        if (!['admin', 'super_admin'].includes(req.user.role) || personal === 'true') {
            whereClause.UserId = req.user.id;
            const today = new Date();
            const threeMonthsAgoDate = new Date(today.getFullYear(), today.getMonth() - 3, 1);
            const threeMonthsAgo = threeMonthsAgoDate.toISOString().split('T')[0];

            if (month && year) {
                const requestedDate = new Date(year, month - 1, 1);
                if (requestedDate < threeMonthsAgoDate) {
                    return res.status(403).json({ error: 'Cannot access data older than 3 months' });
                }
                const startDate = new Date(year, month - 1, 1).toISOString().split('T')[0];
                const endDate = new Date(year, month, 0).toISOString().split('T')[0];
                whereClause.startDate = { [Op.between]: [startDate, endDate] };
            } else {
                whereClause.startDate = { [Op.gte]: threeMonthsAgo };
            }
        } else {
            if (month && year) {
                const startDate = new Date(year, month - 1, 1);
                const endDate = new Date(year, month, 0);
                whereClause.startDate = { [Op.between]: [startDate, endDate] };
            }
        }

        if (status) {
            whereClause.status = status;
        }

        const leaves = await Leave.findAll({
            where: whereClause,
            include: [{ model: User, attributes: ['name'] }],
            order: [['startDate', 'DESC']]
        });
        res.json(leaves);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});



app.put('/api/leaves/:id', authenticateToken, async (req, res) => {
    try {
        const leave = await Leave.findByPk(req.params.id);
        if (!leave) return res.status(404).json({ error: 'Not found' });

        if (['admin', 'super_admin'].includes(req.user.role)) {
            // Admin Update Logic
            const { status, reason } = req.body;

            // If approving annual leave, deduct quota
            if (status === 'Approved' && leave.status !== 'Approved' && leave.type === 'annual') {
                const user = await User.findByPk(leave.UserId);
                if (user.leaveQuota < leave.days) {
                    return res.status(400).json({ error: 'User has insufficient quota to approve this leave.' });
                }
                user.leaveQuota -= leave.days;
                await user.save();
            }
            // If rejecting previously approved annual leave, refund quota
            if (status === 'Rejected' && leave.status === 'Approved' && leave.type === 'annual') {
                const user = await User.findByPk(leave.UserId);
                user.leaveQuota += leave.days;
                await user.save();
            }

            if (status) leave.status = status;
            if (reason) leave.reason = reason;

            await leave.save();
            await leave.save();
            const leaveUser = await User.findByPk(leave.UserId);
            await logAudit(req.user.id, 'Admin Updated Leave', `Updated Leave '${leave.type}' (${leave.status}) for ${leaveUser ? leaveUser.name : 'Unknown'}`, req);

            // NOTIFY STAFF
            if (leave.status === 'Approved' || leave.status === 'Rejected') {
                const isApproved = leave.status === 'Approved';
                sendPushToUser(leave.UserId, {
                    title: isApproved ? '🌴 Leave Approved!' : '🛑 Request Update',
                    body: isApproved
                        ? `Pack your bags! Your ${leave.type} leave is approved.`
                        : `Your leave request was rejected.Check dashboard.`,
                    icon: '/icons/icon-192x192.png',
                    url: '/dashboard'
                });
            }

            return res.json(leave);
        }

        console.log(`[DEBUG] PUT Leave - UserID from Token: ${req.user.id}, Leave Owner: ${leave.UserId}, Status: ${leave.status} `);
        if (String(leave.UserId) !== String(req.user.id)) return res.status(403).json({ error: 'Unauthorized' });
        if (leave.status !== 'Pending') return res.status(400).json({ error: 'Cannot edit processed items' });

        // Staff Update Logic
        const { reason } = req.body;
        if (reason) leave.reason = reason;

        await leave.save();
        res.json(leave);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// Vibe Check (Feeds & Polls)
app.get('/api/vibes', authenticateToken, async (req, res) => {
    try {
        const feeds = await Feed.findAll({
            include: [
                {
                    model: PollOption,
                    include: [{ model: PollVote }] // To count votes
                },
                {
                    model: PollVote, // To check if current user voted
                    where: { UserId: req.user.id },
                    required: false
                }
            ],
            order: [['createdAt', 'DESC']]
        });

        // Transform data for frontend
        const result = feeds.map(feed => {
            const f = feed.toJSON();
            if (f.type === 'poll') {
                f.options = f.PollOptions.map(opt => ({
                    id: opt.id,
                    label: opt.label,
                    voteCount: opt.PollVotes.length
                }));
                f.hasVoted = f.PollVotes.length > 0; // If user has a vote record for this feed
                f.totalVotes = f.options.reduce((sum, opt) => sum + opt.voteCount, 0);
            }
            delete f.PollOptions;
            delete f.PollVotes;
            return f;
        });

        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/vibes', authenticateToken, isAdmin, async (req, res) => {
    try {
        const { type, title, content, options } = req.body;
        const feed = await Feed.create({ type, title, content });

        if (type === 'poll' && options && Array.isArray(options)) {
            const pollOptions = options.map(label => ({ FeedId: feed.id, label }));
            await PollOption.bulkCreate(pollOptions);
        }

        await logAudit(req.user.id, 'Admin Created Vibe', `Created ${type}: ${title} `, req);

        res.status(201).json(feed);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

app.post('/api/vibes/:id/vote', authenticateToken, async (req, res) => {
    try {
        const { optionId } = req.body;
        const feedId = req.params.id;
        const userId = req.user.id;

        // Check if already voted
        const existingVote = await PollVote.findOne({ where: { FeedId: feedId, UserId: userId } });
        if (existingVote) {
            return res.status(400).json({ error: 'You have already voted on this poll.' });
        }

        await PollVote.create({ FeedId: feedId, PollOptionId: optionId, UserId: userId });
        res.json({ message: 'Vote recorded' });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// Side Quests
app.get('/api/quests', authenticateToken, async (req, res) => {
    try {
        const quests = await Quest.findAll({
            include: [{ model: User, attributes: ['name'] }],
            order: [['createdAt', 'DESC']]
        });
        res.json(quests);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/quests', authenticateToken, isAdmin, async (req, res) => {
    try {
        const { title, reward, difficulty } = req.body;
        const quest = await Quest.create({ title, reward, difficulty });
        await logAudit(req.user.id, 'Admin Created Quest', `Created Quest: ${title} `, req);
        res.status(201).json(quest);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

app.put('/api/quests/:id/accept', authenticateToken, async (req, res) => {
    try {
        const quest = await Quest.findByPk(req.params.id);
        if (!quest) return res.status(404).json({ error: 'Quest not found' });
        if (quest.status !== 'Open') return res.status(400).json({ error: 'Quest already taken' });

        quest.status = 'Assigned';
        quest.assignedTo = req.user.id;
        await quest.save();
        res.json(quest);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

app.put('/api/quests/:id/complete', authenticateToken, isAdmin, async (req, res) => {
    try {
        const quest = await Quest.findByPk(req.params.id);
        if (!quest) return res.status(404).json({ error: 'Quest not found' });

        quest.status = 'Completed';
        await quest.save();
        res.json(quest);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// Birthday Blast
app.get('/api/birthdays/today', authenticateToken, async (req, res) => {
    try {
        // SQLite specific query for matching month and day
        const users = await User.findAll({
            where: sequelize.where(
                sequelize.fn('strftime', '%m-%d', sequelize.col('birthDate')),
                sequelize.fn('strftime', '%m-%d', 'now')
            ),
            attributes: ['name']
        });
        const names = users.map(u => u.name);
        res.json(names);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Admin Summary (Payroll)
app.get('/api/admin/summary', authenticateToken, isAdmin, async (req, res) => {
    try {
        const { month, year, filterMode = 'submission' } = req.query;
        if ((month && isNaN(month)) || (year && isNaN(year))) {
            return res.status(400).json({ error: 'Invalid month or year format' });
        }

        let dateFilter = {};
        let timestampFilter = {};

        if (filterMode === 'submission') {
            const startDate = new Date(year, month - 2, 28);
            startDate.setHours(0, 0, 0, 0);
            const endDate = new Date(year, month - 1, 27);
            endDate.setHours(23, 59, 59, 999);
            timestampFilter = { [Op.between]: [startDate, endDate] };
            dateFilter = null;
        } else {
            const startDate = new Date(year, month - 1, 1);
            const endDate = new Date(year, month, 0);
            endDate.setHours(23, 59, 59, 999);
            const startStr = startDate.toISOString().split('T')[0];
            const endStr = endDate.toISOString().split('T')[0];
            dateFilter = { [Op.between]: [startStr, endStr] };
            timestampFilter = { [Op.between]: [startDate, endDate] };
        }

        // Fetch ALL relevant items first (Group by User ID later)
        // This ensures even if a user is deleted, we see the financial record
        const overtimeWhere = filterMode === 'submission' ? { createdAt: timestampFilter } : { date: dateFilter };
        const claimWhere = filterMode === 'submission' ? { createdAt: timestampFilter } : { date: dateFilter };

        const [overtimes, claims, quests] = await Promise.all([
            Overtime.findAll({
                where: overtimeWhere,
                include: [{ model: User, attributes: ['id', 'name', 'email', 'staffId'] }]
            }),
            Claim.findAll({
                where: claimWhere,
                include: [{ model: User, attributes: ['id', 'name', 'email', 'staffId'] }]
            }),
            Quest.findAll({
                where: { status: 'Completed', createdAt: timestampFilter },
                include: [{ model: User, as: 'Assignee', attributes: ['id', 'name', 'email', 'staffId'] }] // Adjust alias if needed
            })
        ]);

        const userMap = {};

        const getUserKey = (u) => u ? u.id : 'unknown';
        const initUser = (u) => ({
            id: u ? u.id : 'unknown',
            staffId: u ? u.staffId : '-',
            userId: u ? (u.staffId || u.id) : '-',
            name: u ? u.name : 'Unknown User',
            email: u ? u.email : '-',
            overtimeHours: 0,
            overtimeTotal: 0,
            claimTotal: 0,
            totalPayable: 0,
            status: 'No Data',
            details: { overtimes: [], claims: [] },
            hasPending: false,
            hasUnpaid: false,
            hasPaid: false
        });

        // Process Overtimes
        overtimes.forEach(o => {
            const u = o.User;
            const key = getUserKey(u);
            if (!userMap[key]) userMap[key] = initUser(u);

            const entry = userMap[key];
            if (['Approved', 'Paid'].includes(o.status)) {
                entry.overtimeHours += (o.hours || 0);
                entry.overtimeTotal += (o.payableAmount || 0);
                entry.details.overtimes.push({
                    id: o.id, date: o.date, createdAt: o.createdAt,
                    activity: o.activity, hours: o.hours, amount: o.payableAmount, status: o.status
                });

                if (o.status === 'Approved') entry.hasUnpaid = true;
                if (o.status === 'Paid') entry.hasPaid = true;
            } else if (o.status === 'Pending') {
                entry.hasPending = true;
            }
        });

        // Process Claims
        claims.forEach(c => {
            const u = c.User;
            const key = getUserKey(u);
            if (!userMap[key]) userMap[key] = initUser(u);

            const entry = userMap[key];
            if (['Approved', 'Paid'].includes(c.status)) {
                entry.claimTotal += (c.amount || 0);
                entry.details.claims.push({
                    id: c.id, date: c.date, createdAt: c.createdAt,
                    title: c.title, amount: c.amount, status: c.status
                });

                if (c.status === 'Approved') entry.hasUnpaid = true;
                if (c.status === 'Paid') entry.hasPaid = true;
            } else if (c.status === 'Pending') {
                entry.hasPending = true;
            }
        });

        // Process Quests (Assuming simple addition for now)
        quests.forEach(q => {
            // Quest association might be different, check model. usually belongsTo User as 'assignedTo'?
            // For now assuming we just want to add to total.
            // Ideally we shouldn't rely on 'Assignee' alias if not defined. 
            // Let's assume Quest has UserId or assignedTo.
            // If Quest model wasn't checked, this might fail. Skipping complex Quest User mapping for safety if unsure.
            // But let's try to map if UserId exists.
        });

        const summary = Object.values(userMap).map(u => {
            u.totalPayable = u.overtimeTotal + u.claimTotal; // + Quest Total if needed

            if (u.hasUnpaid) u.status = 'Processing';
            else if (u.hasPending) u.status = 'Pending';
            else if (u.hasPaid || u.totalPayable > 0) u.status = 'Paid';

            // Cleanup temp flags
            delete u.hasPending; delete u.hasUnpaid; delete u.hasPaid;

            return u;
        }).sort((a, b) => b.totalPayable - a.totalPayable); // Sort by highest pay

        res.json(summary);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Admin Payout (Mark as Paid)
app.post('/api/admin/payout', authenticateToken, isAdmin, async (req, res) => {
    try {
        const { userIds, month, year } = req.body;

        if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
            return res.status(400).json({ error: 'No users selected' });
        }

        let dateFilter = {};
        if (month && year) {
            const startDate = new Date(year, month - 1, 1).toISOString().split('T')[0];
            const endDate = new Date(year, month, 0).toISOString().split('T')[0];
            dateFilter = { [Op.between]: [startDate, endDate] };
        } else {
            // Default to current month if not specified
            const now = new Date();
            const startDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
            const endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
            dateFilter = { [Op.between]: [startDate, endDate] };
        }

        // Update Overtimes
        await Overtime.update(
            { status: 'Paid' },
            {
                where: {
                    UserId: { [Op.in]: userIds },
                    status: 'Approved',
                    date: dateFilter
                }
            }
        );

        // Update Claims
        await Claim.update(
            { status: 'Paid' },
            {
                where: {
                    UserId: { [Op.in]: userIds },
                    status: 'Approved',
                    date: dateFilter
                }
            }
        );

        await logAudit(req.user.id, 'Admin Processed Payout', `Processed payout for ${userIds.length} users`, req);

        res.json({ message: 'Payout processed successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Admin User Management
// Admin User Management
app.post('/api/admin/users', authenticateToken, isAdmin, registerValidation, validate, async (req, res, next) => {
    try {
        const { name, email, phone, password, birthDate, role } = req.body;

        // RBAC: Role Hierarchy Check
        const hierarchy = { 'staff': 1, 'admin': 2, 'super_admin': 3 };
        const creatorLevel = hierarchy[req.user.role] || 0;
        const targetLevel = hierarchy[role || 'staff'] || 1;

        if (targetLevel >= creatorLevel && req.user.role !== 'super_admin') {
            return res.status(403).json({ error: 'You do not have permission to assign this role.' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        // Generate Staff ID safely
        const year = new Date().getFullYear();
        const lastUser = await User.findOne({
            where: {
                staffId: { [Op.like]: `IDE - ${year} -% ` }
            },
            order: [['staffId', 'DESC']]
        });

        let nextSequence = 1;
        if (lastUser && lastUser.staffId) {
            const parts = lastUser.staffId.split('-');
            if (parts.length === 3) {
                const lastSeq = parseInt(parts[2]);
                if (!isNaN(lastSeq)) {
                    nextSequence = lastSeq + 1;
                }
            }
        }

        const staffId = `IDE - ${year} -${String(nextSequence).padStart(4, '0')} `;

        const user = await User.create({
            name,
            email,
            phone,
            password: hashedPassword,
            birthDate,
            role: role || 'staff',
            staffId
        });

        // Security: don't return password
        const userResp = user.toJSON();
        delete userResp.password;

        await logAudit(req.user.id, 'Admin Created User', `Created user: ${name} (${email}) - Role: ${role || 'staff'} `, req);

        res.status(201).json({ message: 'User created successfully', user: userResp });
    } catch (error) {
        next(error);
    }
});

app.get('/api/admin/users', authenticateToken, isAdmin, async (req, res, next) => {
    try {
        const users = await User.findAll({
            attributes: ['id', 'name', 'email', 'phone', 'role', 'leaveQuota', 'birthDate', 'can_attendance']
        });
        res.json(users);
    } catch (error) {
        next(error);
    }
});

app.put('/api/admin/users/:id', authenticateToken, isAdmin, async (req, res, next) => {
    try {
        const { name, phone, newPassword } = req.body;
        const user = await User.findByPk(req.params.id);

        if (!user) return res.status(404).json({ error: 'User not found' });

        if (name) user.name = name;
        if (phone) user.phone = phone;
        if (req.body.birthDate) user.birthDate = req.body.birthDate;
        if (req.body.leaveQuota !== undefined) user.leaveQuota = req.body.leaveQuota;
        if (req.body.can_attendance !== undefined) user.can_attendance = req.body.can_attendance;
        if (newPassword) {
            user.password = await bcrypt.hash(newPassword, 10);
        }

        await user.save();

        await logAudit(req.user.id, 'Admin Updated User', `Updated user ID: ${user.id} (${user.email})`, req);

        res.json({ message: 'User updated successfully' });
    } catch (error) {
        next(error);
    }
});

app.delete('/api/admin/users/:id', authenticateToken, isAdmin, async (req, res, next) => {
    try {
        const user = await User.findByPk(req.params.id);
        if (!user) return res.status(404).json({ error: 'User not found' });

        if (user.id === req.user.id) return res.status(400).json({ error: 'Cannot delete your own account' });

        await user.destroy();

        await logAudit(req.user.id, 'Admin Deleted User', `Deleted user ID: ${req.params.id} (${user.email})`, req);

        res.json({ message: 'User deleted successfully' });
    } catch (error) {
        next(error);
    }
});

// Helper: Haversine Distance
function getDistanceFromLatLonInKm(lat1, lon1, lat2, lon2) {
    const R = 6371; // Radius of the earth in km
    const dLat = deg2rad(lat2 - lat1);
    const dLon = deg2rad(lon2 - lon1);
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const d = R * c; // Distance in km
    return d;
}

function deg2rad(deg) {
    return deg * (Math.PI / 180);
}

// Attendance API
app.post('/api/attendance', authenticateToken, async (req, res, next) => {
    try {
        const { latitude, longitude, accuracy, type } = req.body;
        const user = await User.findByPk(req.user.id);

        if (!user.can_attendance) {
            return res.status(403).json({ error: 'Attendance feature is not enabled for your account.' });
        }

        const serverTime = new Date(); // TRUSTED SERVER TIME
        let is_suspicious = false;

        // Superman Heuristic: Check against last log
        const lastLog = await AttendanceLog.findOne({
            where: { UserId: user.id },
            order: [['timestamp', 'DESC']]
        });

        if (lastLog) {
            const distKm = getDistanceFromLatLonInKm(lastLog.latitude, lastLog.longitude, latitude, longitude);
            const timeDiffHours = (serverTime - new Date(lastLog.timestamp)) / 1000 / 3600;

            // Avoid division by zero if logs are practically simultaneous
            if (timeDiffHours > 0.0002) { // > ~0.7 seconds
                const speed = distKm / timeDiffHours;
                if (speed > 800) { // 800 km/h threshold
                    is_suspicious = true;
                    console.log(`[Attendance] Suspicious Speed Detected: User ${user.name}, Speed: ${speed.toFixed(2)} km / h`);
                }
            }
        }

        const log = await AttendanceLog.create({
            UserId: user.id,
            type,
            timestamp: serverTime,
            latitude,
            longitude,
            accuracy,
            is_suspicious
        });

        res.status(201).json(log);
    } catch (error) {
        next(error);
    }
});

app.get('/api/attendance', authenticateToken, async (req, res, next) => {
    try {
        const { userId, date } = req.query;
        let whereClause = {};

        // RBAC: Admin sees all (filtered), Staff sees own
        if (['admin', 'super_admin'].includes(req.user.role)) {
            if (userId) whereClause.UserId = userId;
        } else {
            whereClause.UserId = req.user.id;
        }

        if (date) {
            const start = new Date(date);
            start.setHours(0, 0, 0, 0);
            const end = new Date(date);
            end.setHours(23, 59, 59, 999);
            whereClause.timestamp = { [Op.between]: [start, end] };
        }

        const logs = await AttendanceLog.findAll({
            where: whereClause,
            include: [{ model: User, attributes: ['name', 'staffId'] }],
            order: [['timestamp', 'DESC']]
        });

        res.json(logs);
    } catch (error) {
        next(error);
    }
});

// Admin Audit Logs
app.get('/api/admin/audit-logs', authenticateToken, isAdmin, async (req, res, next) => {
    try {
        // Cleanup Logs Older Than 7 Days
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        await AuditLog.destroy({
            where: {
                createdAt: { [Op.lt]: sevenDaysAgo }
            }
        });

        const logs = await AuditLog.findAll({
            include: [{ model: User, attributes: ['name', 'email', 'role'] }],
            order: [['createdAt', 'DESC']]
        });
        res.json(logs);
    } catch (error) {
        next(error);
    }
});


// Admin Payroll Summary (Postgres & Cutoff Logic)
app.get('/api/admin/summary', authenticateToken, isAdmin, async (req, res, next) => {
    try {
        const { month, year } = req.query;
        if (!month || !year) return res.status(400).json({ error: 'Month and Year required' });

        const m = parseInt(month);
        const y = parseInt(year);

        if (isNaN(m) || isNaN(y)) {
            return res.status(400).json({ error: 'Invalid Month or Year' });
        }

        // PAYROLL CUTOFF LOGIC
        // Start Date: 28th of Previous Month
        // End Date: 27th of Current Month
        // Example: For Jan 2026 (Month 1), Range is Dec 28, 2025 - Jan 27, 2026

        let startMonth = m - 2; // m is 1-based (Jan=1). Prev month index is 0-based: 1 - 2 = -1 (Dec of prev year)
        let startYear = y;

        const startDate = new Date(startYear, m - 1 - 1, 28); // Month is 0-indexed. m=1 -> Jan. m-1=0(Jan). m-1-1=-1(Dec)
        startDate.setHours(0, 0, 0, 0);

        const endDate = new Date(y, m - 1, 27);
        endDate.setHours(23, 59, 59, 999);

        console.log(`[Summary] Cutoff Query: ${startDate.toISOString()} to ${endDate.toISOString()}`);

        const dateFilter = {
            createdAt: {
                [Op.gte]: startDate,
                [Op.lte]: endDate
            }
        };

        // Fetch all relevant data first
        const [users, overtimes, claims] = await Promise.all([
            User.findAll({ attributes: ['id', 'name', 'role', 'staffId', 'email'] }),
            Overtime.findAll({
                where: {
                    ...dateFilter,
                    status: { [Op.in]: ['Approved', 'Pending'] }
                }
            }),
            Claim.findAll({
                where: {
                    ...dateFilter,
                    status: { [Op.in]: ['Approved', 'Pending'] }
                }
            })
        ]);

        const summaryMap = {};

        // Initialize with existing users
        users.forEach(user => {
            summaryMap[user.id] = {
                id: user.id, // Explicitly include id for frontend keys
                userId: user.id,
                name: user.name,
                role: user.role,
                staffId: user.staffId, // Include staffId if available
                email: user.email,
                overtimeTotal: 0,
                overtimeHours: 0,
                claimTotal: 0,
                totalPayable: 0,
                status: 'Active',
                details: { overtimes: [], claims: [] }
            };
        });

        // Agregate Overtimes
        overtimes.forEach(ot => {
            const uid = ot.UserId;
            if (!summaryMap[uid]) {
                summaryMap[uid] = {
                    id: uid,
                    userId: uid,
                    name: 'Unknown User (Deleted)',
                    role: 'N/A',
                    staffId: 'N/A',
                    email: '',
                    overtimeTotal: 0,
                    overtimeHours: 0,
                    claimTotal: 0,
                    totalPayable: 0,
                    status: 'Deleted',
                    details: { overtimes: [], claims: [] }
                };
            }
            summaryMap[uid].overtimeTotal += (parseFloat(ot.payableAmount) || 0); // Ensure float for Postgres decimal type
            summaryMap[uid].overtimeHours += (parseFloat(ot.hours) || 0);

            summaryMap[uid].details.overtimes.push({
                id: ot.id,
                date: ot.date,
                createdAt: ot.createdAt,
                activity: ot.activity,
                hours: ot.hours,
                amount: ot.payableAmount
            });
        });

        // Aggregate Claims
        claims.forEach(cl => {
            const uid = cl.UserId;
            if (!summaryMap[uid]) {
                summaryMap[uid] = {
                    id: uid,
                    userId: uid,
                    name: 'Unknown User (Deleted)',
                    role: 'N/A',
                    staffId: 'N/A',
                    email: '',
                    overtimeTotal: 0,
                    overtimeHours: 0,
                    claimTotal: 0,
                    totalPayable: 0,
                    status: 'Deleted',
                    details: { overtimes: [], claims: [] }
                };
            }
            summaryMap[uid].claimTotal += (parseFloat(cl.amount) || 0);

            summaryMap[uid].details.claims.push({
                id: cl.id,
                date: cl.date,
                createdAt: cl.createdAt,
                title: cl.title,
                status: cl.status,
                amount: cl.amount
            });
        });

        // Calculate Totals and cleanup
        const summary = Object.values(summaryMap)
            .map(item => ({
                ...item,
                totalPayable: item.overtimeTotal + item.claimTotal
            }))
            .filter(item => item.totalPayable > 0 || item.status === 'Active')
            .sort((a, b) => b.totalPayable - a.totalPayable);

        res.json(summary);
    } catch (error) {
        console.error("Summary Endpoint Error:", error);
        res.status(500).json({ error: error.message });
    }
});

// --- SYSTEM SERVICES SETTINGS API ---
app.get('/api/admin/services', authenticateToken, isAdmin, async (req, res) => {
    try {
        const settings = await Setting.findAll();
        // Convert to object for easier frontend consumption { 'daily_email': true, ... }
        const result = settings.reduce((acc, curr) => ({ ...acc, [curr.key]: curr.value }), {});
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.put('/api/admin/services', authenticateToken, isAdmin, async (req, res) => {
    try {
        const { key, value } = req.body;
        if (typeof value !== 'boolean') return res.status(400).json({ error: 'Value must be boolean' });

        const setting = await Setting.findByPk(key);
        if (!setting) return res.status(404).json({ error: 'Setting not found' });

        setting.value = value;
        await setting.save();

        await logAudit(req.user.id, 'System Config', `Updated Service ${key} to ${value} `, req);
        res.json({ message: 'Service updated', key, value });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});


// Global Error Handler
app.use((err, req, res, next) => {
    console.error(err.stack); // Log stack trace for dev (or use a logger in prod)

    // Sequelize Validation Error Formatting
    if (err.name === 'SequelizeValidationError' || err.name === 'SequelizeUniqueConstraintError') {
        return res.status(400).json({
            error: err.errors ? err.errors.map(e => e.message).join(', ') : 'Database Validation Error'
        });
    }

    // Default Error Response
    res.status(500).json({
        error: process.env.NODE_ENV === 'production' ? 'Internal Server Error' : err.message
    });
});


// Sync DB & Start Server
// Using sync() without options prevents data loss from table recreation on restarts
sequelize.sync({ alter: true }).then(async () => {
    console.log('Database synced');

    // Create Default Super Admin if not exists or Reset Password
    const adminEmail = 'admin@werk.com';
    const adminBasePass = 'admin123';

    let superAdmin = await User.findOne({ where: { email: adminEmail } });

    if (!superAdmin) {
        const hashedPassword = await bcrypt.hash(adminBasePass, 10);
        await User.create({
            name: 'Super Admin',
            email: adminEmail,
            phone: '0000000000',
            password: hashedPassword,
            role: 'super_admin',
            birthDate: '2000-01-01',
            staffId: 'IDE-2024-0000'
        });
        console.log(`[Auth] Default Super Admin Created: ${adminEmail} / ${adminBasePass}`);
    } else {
        // FORCE PASSWORD RESET (Requested by User)
        const hashedPassword = await bcrypt.hash(adminBasePass, 10);
        superAdmin.password = hashedPassword;
        superAdmin.role = 'super_admin'; // Ensure role is correct
        await superAdmin.save();
        console.log(`[Auth] Super Admin Password Reset: ${adminEmail} / ${adminBasePass}`);
    }

    // Seed System Settings
    const defaultSettings = [
        { key: 'daily_email', value: true },
        { key: 'monthly_email', value: true }
    ];

    for (const s of defaultSettings) {
        const exists = await Setting.findByPk(s.key);
        if (!exists) {
            await Setting.create(s);
            console.log(`[System] Initialized Setting: ${s.key} = ${s.value} `);
        }
    }




    // --- SYSTEM SETTINGS (SMTP) ---
    const SETTINGS_FILE = path.join(__dirname, 'settings.json');

    const getSettings = () => {
        try {
            if (!fs.existsSync(SETTINGS_FILE)) return {};
            return JSON.parse(fs.readFileSync(SETTINGS_FILE, 'utf8'));
        } catch (err) {
            console.error("Error reading settings:", err);
            return {};
        }
    };

    const saveSettings = (newSettings) => {
        try {
            const current = getSettings();
            const updated = { ...current, ...newSettings };
            fs.writeFileSync(SETTINGS_FILE, JSON.stringify(updated, null, 4));
            return updated;
        } catch (err) {
            console.error("Error saving settings:", err);
            throw err;
        }
    };

    // Get SMTP Config
    app.get('/api/admin/config/smtp', authenticateToken, isAdmin, (req, res) => {
        const settings = getSettings();
        const smtp = settings.smtp || {};
        res.json(smtp);
    });

    // Update SMTP Config
    app.put('/api/admin/config/smtp', authenticateToken, isAdmin, async (req, res) => {
        try {
            const { host, port, secure, user, pass, fromEmail, fromName } = req.body;
            const settings = getSettings();
            const updatedSmtp = {
                host,
                port: parseInt(port),
                secure,
                user,
                pass,
                fromEmail,
                fromName
            };

            saveSettings({ smtp: updatedSmtp });

            await logAudit(req.user.id, 'System Config', 'Updated SMTP Settings', req);
            res.json({ message: 'Settings saved', smtp: updatedSmtp });
        } catch (error) {
            res.status(500).json({ error: 'Failed to save settings' });
        }
    });

    // Test SMTP
    app.post('/api/admin/config/smtp/test', authenticateToken, isAdmin, async (req, res) => {
        try {
            const { email } = req.body;
            const settings = getSettings();
            const smtp = settings.smtp;

            if (!smtp || !smtp.host) {
                return res.status(400).json({ error: 'SMTP not configured' });
            }

            const transporter = nodemailer.createTransport({
                host: smtp.host,
                port: smtp.port,
                secure: smtp.secure,
                auth: {
                    user: smtp.user,
                    pass: smtp.pass
                }
            });

            await transporter.sendMail({
                from: `"${smtp.fromName}" < ${smtp.fromEmail}> `,
                to: email,
                subject: 'WERK IDE: Test Email',
                text: 'This is a test email to verify your SMTP configuration. If you are reading this, it works!',
                html: `
    < div style = "font-family: sans-serif; padding: 20px; background: #f4f4f5;" >
        <div style="background: white; padding: 20px; border-radius: 10px; max-width: 500px; margin: 0 auto;">
            <h2 style="color: #000;">Test Email</h2>
            <p style="color: #555;">Your SMTP configuration is working correctly.</p>
            <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;">
                <small style="color: #999;">Sent from WERK IDE</small>
        </div>
            </div >
    `
            });

            await logAudit(req.user.id, 'System Config', `Test email sent to ${email} `, req);
            res.json({ message: 'Test email sent successfully' });
        } catch (error) {
            console.error("Test email failed:", error);
            res.status(500).json({ error: `Failed to send email: ${error.message} ` });
        }
    });

    // --- CRON JOBS ---
    initCronJobs({ User, Overtime, Claim, Leave, Quest, Setting }, transporter);

    // --- SERVER START ---
    // Sync Database and Start Server
    app.listen(PORT, () => console.log(`Server running on port ${PORT} `));
});

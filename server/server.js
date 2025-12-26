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

const app = express();
const PORT = process.env.PORT || 5000;
const SECRET_KEY = process.env.SECRET_KEY || 'werk-secret-key-gen-z';

// --- CONFIGURATION & DEFINITIONS ---

// 1. Security: Rate Limiters (Define first)
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
    'http://localhost:5173',
    'http://localhost:3000'
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


app.use(cors({
    origin: function (origin, callback) {
        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin) return callback(null, true);

        if (allowedOrigins.indexOf(origin) !== -1 || origin.endsWith('.kaumtech.com')) {
            return callback(null, true);
        } else {
            // For debugging production issues, we log the blocked origin
            console.log('Blocked by CORS:', origin);
            // Fail safe: reject if really unknown
            return callback(new Error('Not allowed by CORS'));
        }
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
    optionsSuccessStatus: 204
}));
app.options(/.*/, cors()); // FIX CRASH (Duplicate)

// Security: Rate Limiters




app.use(generalLimiter);
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
const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir);
}

const dbPath = path.join(dataDir, 'database.sqlite');
console.log(`[DB] Using database file at: ${dbPath}`);

const sequelize = new Sequelize({
    dialect: 'sqlite',
    storage: dbPath,
    logging: false
});

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
    otpExpires: { type: DataTypes.DATE }
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
        res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role, leaveQuota: user.leaveQuota } });
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
        res.status(201).json(overtime);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

app.get('/api/overtimes', authenticateToken, async (req, res) => {
    try {
        const { month, year } = req.query;
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
        res.status(201).json(claim);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

app.get('/api/claims', authenticateToken, async (req, res) => {
    try {
        const { month, year, personal } = req.query;
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
        res.status(201).json(leave);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

app.get('/api/leaves', authenticateToken, async (req, res) => {
    try {
        const { month, year, personal } = req.query;
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
            const leaveUser = await User.findByPk(leave.UserId);
            await logAudit(req.user.id, 'Admin Updated Leave', `Updated Leave '${leave.type}' (${leave.status}) for ${leaveUser ? leaveUser.name : 'Unknown'}`, req);
            return res.json(leave);
        }

        console.log(`[DEBUG] PUT Leave - UserID from Token: ${req.user.id}, Leave Owner: ${leave.UserId}, Status: ${leave.status}`);
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

        await logAudit(req.user.id, 'Admin Created Vibe', `Created ${type}: ${title}`, req);

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
        await logAudit(req.user.id, 'Admin Created Quest', `Created Quest: ${title}`, req);
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
            // Payroll Cycle: 28th Previous Month to 27th Current Month
            // Example: Dec Payroll = Nov 28 - Dec 27
            // JS Date Month is 0-indexed.

            // Start: 28th of Previous Month
            // (month - 1) is current month index. (month - 2) is previous.
            const startDate = new Date(year, month - 2, 28);
            startDate.setHours(0, 0, 0, 0);

            // End: 27th of Current Month
            const endDate = new Date(year, month - 1, 27);
            endDate.setHours(23, 59, 59, 999);

            // Filter for createdAt (Submission Date)
            timestampFilter = { [Op.between]: [startDate, endDate] };

            // For Date-based fields that are just YYYY-MM-DD (like Overtime.date), keep a loose filter 
            // OR we should filter them by createdAt as per checking user requirement.
            // User: "Include Items where... created_at is between 28th... and 27th..."
            // So we primarily filter by createdAt for Overtimes and Claims.
            dateFilter = null; // We won't use the 'date' column for filtering in this mode
        } else {
            // Activity Date Mode (Traditional Calendar Month)
            // 1st to Last Day of Month
            const startDate = new Date(year, month - 1, 1);
            const endDate = new Date(year, month, 0);
            endDate.setHours(23, 59, 59, 999);

            const startStr = startDate.toISOString().split('T')[0];
            const endStr = endDate.toISOString().split('T')[0];

            dateFilter = { [Op.between]: [startStr, endStr] }; // For 'date' column
            timestampFilter = { [Op.between]: [startDate, endDate] }; // For 'createdAt' column (Quests)
        }

        const users = await User.findAll({
            where: {
                role: { [Op.or]: ['staff', 'admin'] }
            }
        });
        const summary = [];

        for (const user of users) {
            // Fetch items based on filter mode
            let overtimeWhere = { UserId: user.id };
            let claimWhere = { UserId: user.id };

            if (filterMode === 'submission') {
                overtimeWhere.createdAt = timestampFilter;
                claimWhere.createdAt = timestampFilter;
            } else {
                overtimeWhere.date = dateFilter;
                claimWhere.date = dateFilter;
            }

            // Fetch ALL items for the period to determine status correctly
            const overtimes = await Overtime.findAll({
                where: overtimeWhere
            });
            const claims = await Claim.findAll({
                where: claimWhere
            });

            const quests = await Quest.findAll({
                where: {
                    assignedTo: user.id,
                    status: 'Completed',
                    createdAt: timestampFilter
                }
            });

            // Calculate Totals
            const approvedOvertimes = overtimes.filter(o => o.status === 'Approved');
            const paidOvertimes = overtimes.filter(o => o.status === 'Paid');

            const approvedClaims = claims.filter(c => c.status === 'Approved');
            const paidClaims = claims.filter(c => c.status === 'Paid');

            const unpaidAmount = approvedOvertimes.reduce((sum, o) => sum + o.payableAmount, 0) +
                approvedClaims.reduce((sum, c) => sum + c.amount, 0);

            const paidAmount = paidOvertimes.reduce((sum, o) => sum + o.payableAmount, 0) +
                paidClaims.reduce((sum, c) => sum + c.amount, 0);

            const questTotal = quests.reduce((sum, q) => {
                const val = parseInt(q.reward.replace(/\D/g, ''));
                return sum + (isNaN(val) ? 0 : val);
            }, 0);

            // Assuming Quests are paid externally or auto-handled, we just add them to total payable for visibility, 
            // but for Status logic, we focus on Overtime and Claims which have explicit 'Paid' status states.
            // If Quests need 'Paid' status tracking, that would require schema changes. 
            // For now, let's assume if there are unpaid Overtimes/Claims, it's Processing.

            const totalPayable = unpaidAmount + paidAmount + questTotal;

            // Calculate Totals for Display (Both Unpaid and Paid)
            const overtimeHours = approvedOvertimes.reduce((sum, o) => sum + o.hours, 0) +
                paidOvertimes.reduce((sum, o) => sum + o.hours, 0);

            const overtimeTotal = approvedOvertimes.reduce((sum, o) => sum + o.payableAmount, 0) +
                paidOvertimes.reduce((sum, o) => sum + o.payableAmount, 0);

            const claimTotal = approvedClaims.reduce((sum, c) => sum + c.amount, 0) +
                paidClaims.reduce((sum, c) => sum + c.amount, 0);

            // Determine Status
            let status = 'No Data';
            const hasPendingItems = overtimes.some(o => o.status === 'Pending') || claims.some(c => c.status === 'Pending');

            if (unpaidAmount > 0) {
                status = 'Processing'; // Ready to Pay
            } else if (hasPendingItems) {
                status = 'Pending'; // Waiting Approval
            } else if (paidAmount > 0 || questTotal > 0) {
                status = 'Paid'; // All settled
            }

            if (overtimes.length > 0 || claims.length > 0 || quests.length > 0) {
                summary.push({
                    id: user.id,
                    staffId: user.staffId,
                    userId: user.staffId || user.id, // Kept for text filter search compatibility if any
                    name: user.name,
                    email: user.email,
                    overtimeHours,
                    overtimeTotal,
                    claimTotal,
                    totalPayable,
                    status,
                    details: {
                        overtimes: overtimes.filter(o => ['Approved', 'Paid'].includes(o.status)).map(o => ({
                            id: o.id,
                            date: o.date,
                            createdAt: o.createdAt,
                            activity: o.activity,
                            hours: o.hours,
                            amount: o.payableAmount,
                            status: o.status
                        })),
                        claims: claims.filter(c => ['Approved', 'Paid'].includes(c.status)).map(c => ({
                            id: c.id,
                            date: c.date,
                            createdAt: c.createdAt,
                            title: c.title,
                            amount: c.amount,
                            status: c.status
                        }))
                    }
                });
            }
        }

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

        await logAudit(req.user.id, 'Admin Created User', `Created user: ${name} (${email}) - Role: ${role || 'staff'}`, req);

        res.status(201).json({ message: 'User created successfully', user: userResp });
    } catch (error) {
        next(error);
    }
});

app.get('/api/admin/users', authenticateToken, isAdmin, async (req, res, next) => {
    try {
        const users = await User.findAll({
            attributes: ['id', 'name', 'email', 'phone', 'role', 'leaveQuota', 'birthDate']
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
sequelize.sync().then(async () => {
    console.log('Database synced');

    // Create Default Admin if not exists
    // Create Default Super Admin if not exists
    const adminExists = await User.findOne({ where: { role: 'super_admin' } });
    const oldAdmin = await User.findOne({ where: { role: 'admin', email: 'admin@werk.com' } });

    if (!adminExists) {
        if (oldAdmin) {
            // Upgrade old default admin to super_admin
            oldAdmin.role = 'super_admin';
            oldAdmin.name = 'Super Admin';
            const hashedPassword = await bcrypt.hash('admin123', 10);
            oldAdmin.password = hashedPassword;
            await oldAdmin.save();
            console.log('Upgraded existing default admin to Super Admin');
        } else {
            const hashedPassword = await bcrypt.hash('admin123', 10);
            await User.create({
                name: 'Super Admin',
                email: 'admin@werk.com',
                phone: '0000000000',
                password: hashedPassword,
                role: 'super_admin',
                birthDate: '2000-01-01'
            });
            console.log('Default Super Admin Created: admin@werk.com / admin123');
        }
    } else {
        console.log('Super Admin already exists');
    }

    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
});

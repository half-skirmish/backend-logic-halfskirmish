const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const User = require('../models/User');

const JWT_SECRET = process.env.JWT_SECRET || 'supersecret';
const JWT_EXPIRY = process.env.JWT_EXPIRY || '1d'; // Token expires in 1 day

/**
 * Generate JWT token for a user
 * @param {Object} user - Must contain at least { _id, name }
 */
exports.generateToken = (user) => {
    return jwt.sign({ id: user._id, name: user.name }, JWT_SECRET, { expiresIn: JWT_EXPIRY });
};

/**
 * Middleware: Authenticate JWT token
 * Attaches full user document to req.userDoc for convenience
 */
exports.authenticateToken = async (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) return res.status(401).json({ error: true, message: 'Access Denied: No Token Provided' });

    try {
        const payload = jwt.verify(token, JWT_SECRET);

        // Fetch the full user from DB
        const userDoc = await User.findById(payload.id).select('-password');
        if (!userDoc) return res.status(401).json({ error: true, message: 'User not found' });

        req.user = payload;      // JWT payload { id, name }
        req.userDoc = userDoc;   // Full user document without password
        next();
    } catch (err) {
        return res.status(403).json({ error: true, message: 'Invalid or Expired Token' });
    }
};

/**
 * Middleware: Authorize blog author
 * Must be used **after attachBlog middleware**
 * Expects req.blog to exist with blog.author field containing ObjectId
 */
exports.authorizeAuthor = (req, res, next) => {
    const blog = req.blog;
    if (!blog) return res.status(400).json({ error: true, message: 'Blog not found for authorization' });

    if (!req.user || req.user.id !== blog.author.toString()) {
        return res.status(403).json({ error: true, message: 'Access Denied: Not the author' });
    }

    next();
};

/**
 * Helper: Hash password
 */
exports.hashPassword = async (password) => {
    const salt = await bcrypt.genSalt(10);
    return await bcrypt.hash(password, salt);
};

/**
 * Helper: Verify password
 */
exports.verifyPassword = async (password, hashedPassword) => {
    return await bcrypt.compare(password, hashedPassword);
};

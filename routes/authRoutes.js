const express = require('express');
const router = express.Router();
const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'supersecret';
const JWT_EXPIRY = process.env.JWT_EXPIRY || '1d';

// -----------------
// REGISTER
// -----------------
router.post('/register', async (req, res) => {
    const { name, username, email, password } = req.body;

    if (!name || !username || !email || !password) {
        return res.status(400).json({ error: true, message: 'All fields are required' });
    }

    try {
        // Check if user exists
        const existingUser = await User.findOne({ $or: [{ username }, { email }] });
        if (existingUser) return res.status(400).json({ error: true, message: 'Username or email already exists' });

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        const newUser = await new User({
            name,
            username,
            email,
            password: hashedPassword
        }).save();

        const token = jwt.sign({ id: newUser._id, name: newUser.name }, JWT_SECRET, { expiresIn: JWT_EXPIRY });

        res.status(201).json({ error: false, user: { id: newUser._id, name: newUser.name, username, email }, token });
    } catch (err) {
        console.error('Register error:', err);
        res.status(500).json({ error: true, message: 'Internal Server Error' });
    }
});

// -----------------
// LOGIN
// -----------------
router.post('/login', async (req, res) => {
    const { usernameOrEmail, password } = req.body;

    if (!usernameOrEmail || !password) {
        return res.status(400).json({ error: true, message: 'All fields are required' });
    }

    try {
        // Find user by username or email
        const user = await User.findOne({ $or: [{ username: usernameOrEmail }, { email: usernameOrEmail }] });
        if (!user) return res.status(400).json({ error: true, message: 'Invalid credentials' });

        const validPass = await bcrypt.compare(password, user.password);
        if (!validPass) return res.status(400).json({ error: true, message: 'Invalid credentials' });

        const token = jwt.sign({ id: user._id, name: user.name }, JWT_SECRET, { expiresIn: JWT_EXPIRY });

        res.json({ error: false, user: { id: user._id, name: user.name, username: user.username, email: user.email }, token });
    } catch (err) {
        console.error('Login error:', err);
        res.status(500).json({ error: true, message: 'Internal Server Error' });
    }
});

module.exports = router;

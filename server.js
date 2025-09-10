require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const slugify = require('slugify');

// Models
const User = require('./models/User');
const Blog = require('./models/Blog');

// Middleware
const { authenticateToken } = require('./middleware/auth');

mongoose.set('strictQuery', false);

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'supersecret';
const JWT_EXPIRY = process.env.JWT_EXPIRY || '1d';

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB Connection
mongoose.connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
})
.then(() => console.log('MongoDB connected'))
.catch(err => console.error('MongoDB connection error:', err));

// ========================
// AUTH ROUTES
// ========================

// Create Account
app.post("/create-account", async (req, res) => {
    const { name, username, email, password } = req.body;

    if (!name || !username || !email || !password) {
        return res.status(400).json({ error: true, message: 'All fields are required' });
    }

    try {
        const existingUser = await User.findOne({ $or: [{ username }, { email }] });
        if (existingUser) {
            return res.status(400).json({ error: true, message: 'Username or email already exists' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = await new User({
            name,
            username,
            email,
            password: hashedPassword
        }).save();

        const token = jwt.sign({ id: newUser._id, name: newUser.name }, JWT_SECRET, { expiresIn: JWT_EXPIRY });

        res.status(201).json({ 
            error: false, 
            user: { 
                id: newUser._id, 
                name: newUser.name, 
                username, 
                email 
            }, 
            token,
            message: 'Account created successfully'
        });
    } catch (err) {
        console.error('Create account error:', err);
        res.status(500).json({ error: true, message: 'Internal Server Error' });
    }
});

// Login
app.post("/login", async (req, res) => {
    const { usernameOrEmail, password } = req.body;

    if (!usernameOrEmail || !password) {
        return res.status(400).json({ error: true, message: 'All fields are required' });
    }

    try {
        const user = await User.findOne({ 
            $or: [{ username: usernameOrEmail }, { email: usernameOrEmail }] 
        });
        
        if (!user) {
            return res.status(400).json({ error: true, message: 'Invalid credentials' });
        }

        const validPass = await bcrypt.compare(password, user.password);
        if (!validPass) {
            return res.status(400).json({ error: true, message: 'Invalid credentials' });
        }

        const token = jwt.sign({ id: user._id, name: user.name }, JWT_SECRET, { expiresIn: JWT_EXPIRY });

        res.json({ 
            error: false, 
            user: { 
                id: user._id, 
                name: user.name, 
                username: user.username, 
                email: user.email 
            }, 
            token,
            message: 'Login successful'
        });
    } catch (err) {
        console.error('Login error:', err);
        res.status(500).json({ error: true, message: 'Internal Server Error' });
    }
});

// Get User Info after Login
app.get("/get-user", authenticateToken, async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select('-password');
        if (!user) {
            return res.status(404).json({ error: true, message: 'User not found' });
        }

        res.json({
            error: false,
            user: {
                id: user._id,
                name: user.name,
                username: user.username,
                email: user.email,
                createdAt: user.createdAt
            },
            message: 'User info retrieved successfully'
        });
    } catch (err) {
        console.error('Get user error:', err);
        res.status(500).json({ error: true, message: 'Internal Server Error' });
    }
});

// ========================
// BLOG ROUTES
// ========================

// Get All Blogs
app.get("/get-all-blogs/", authenticateToken, async (req, res) => {
    try {
        const blogs = await Blog.find().sort({ createdAt: -1 });
        res.json({ 
            error: false, 
            blogs, 
            message: 'Blogs retrieved successfully' 
        });
    } catch (err) {
        console.error('Get blogs error:', err);
        res.status(500).json({ error: true, message: 'Internal Server Error' });
    }
});

// Get Single Blog by ID (Authenticated)
app.get("/get-blog/:blogId", authenticateToken, async (req, res) => {
    const blogId = req.params.blogId;

    try {
        const blog = await Blog.findById(blogId);
        if (!blog) {
            return res.status(404).json({ 
                error: true, 
                message: 'Blog not found' 
            });
        }

        res.json({ 
            error: false, 
            blog, 
            message: 'Blog retrieved successfully' 
        });
    } catch (err) {
        console.error('Get blog error:', err);
        // Handle invalid ObjectId format
        if (err.name === 'CastError') {
            return res.status(400).json({ 
                error: true, 
                message: 'Invalid blog ID format' 
            });
        }
        res.status(500).json({ error: true, message: 'Internal Server Error' });
    }
});

// Get Blog by Slug (Public - No Authentication)
app.get("/blog/:slug", async (req, res) => {
    const slug = req.params.slug;

    try {
        const blog = await Blog.findOne({ slug });
        if (!blog) {
            return res.status(404).json({ 
                error: true, 
                message: 'Blog not found' 
            });
        }

        res.json({ 
            error: false, 
            blog, 
            message: 'Blog retrieved successfully' 
        });
    } catch (err) {
        console.error('Get blog by slug error:', err);
        res.status(500).json({ error: true, message: 'Internal Server Error' });
    }
});

// Add Blog
app.post("/add-blog", authenticateToken, async (req, res) => {
    const { title, content, coverImageUrl, tags } = req.body;
    
    if (!title || !content) {
        return res.status(400).json({ 
            error: true, 
            message: 'Title and content are required' 
        });
    }

    try {
        const blog = await new Blog({
            title,
            slug: slugify(title, { lower: true, strict: true }),
            content,
            coverImageUrl: coverImageUrl || '',
            tags: Array.isArray(tags) ? tags : tags?.split(',').map(t => t.trim()) || [],
            author: { 
                id: req.user.id, 
                name: req.user.name 
            }
        }).save();

        res.status(201).json({ 
            error: false, 
            blog, 
            message: 'Blog added successfully' 
        });
    } catch (err) {
        console.error('Create blog error:', err);
        res.status(500).json({ error: true, message: 'Internal Server Error' });
    }
});

// Edit Blog
app.put("/edit-blog/:blogId", authenticateToken, async (req, res) => {
    console.log('Edit blog route hit with ID:', req.params.blogId); // Debug log
    
    const { title, content, coverImageUrl, tags } = req.body;
    const blogId = req.params.blogId;

    if (!title && !content && !coverImageUrl && !tags) {
        return res.status(400).json({ 
            error: true, 
            message: 'No changes provided' 
        });
    }

    try {
        const blog = await Blog.findById(blogId);
        if (!blog) {
            return res.status(404).json({ 
                error: true, 
                message: 'Blog not found' 
            });
        }

        // Check if user is the author
        if (blog.author.id !== req.user.id) {
            return res.status(403).json({ 
                error: true, 
                message: 'Access Denied: Not the author' 
            });
        }

        // Update fields
        if (title) {
            blog.title = title;
            blog.slug = slugify(title, { lower: true, strict: true });
        }
        if (content) blog.content = content;
        if (coverImageUrl !== undefined) blog.coverImageUrl = coverImageUrl;
        if (tags) {
            blog.tags = Array.isArray(tags) ? tags : tags.split(',').map(t => t.trim());
        }

        const updatedBlog = await blog.save();
        res.json({ 
            error: false, 
            blog: updatedBlog, 
            message: 'Blog updated successfully' 
        });
    } catch (err) {
        console.error('Update blog error:', err);
        res.status(500).json({ error: true, message: 'Internal Server Error' });
    }
});

// Delete Blog
app.delete("/delete-blog/:blogId", authenticateToken, async (req, res) => {
    const blogId = req.params.blogId;

    try {
        const blog = await Blog.findById(blogId);
        if (!blog) {
            return res.status(404).json({ 
                error: true, 
                message: 'Blog not found' 
            });
        }

        // Check if user is the author
        if (blog.author.id !== req.user.id) {
            return res.status(403).json({ 
                error: true, 
                message: 'Access Denied: Not the author' 
            });
        }

        await Blog.deleteOne({ _id: blogId });
        res.json({ 
            error: false, 
            message: 'Blog deleted successfully' 
        });
    } catch (err) {
        console.error('Delete blog error:', err);
        res.status(500).json({ error: true, message: 'Internal Server Error' });
    }
});

// Default route
app.get('/', (req, res) => {
    res.send({ message: 'Welcome to the Blog API', status: 'running' });
});

// 404 handler
app.use((req, res) => {
    console.log('404 - Route not found:', req.method, req.path); // Debug log
    res.status(404).json({ error: true, message: 'Route not found' });
});

// Global error handler
app.use((err, req, res, next) => {
    console.error('Global error:', err);
    res.status(500).json({ error: true, message: 'Internal Server Error' });
});

app.listen(PORT, (err) => {
    if (err) return console.error('Server failed to start:', err);
    console.log(`Server running on http://localhost:${PORT}`);
});

module.exports = app;
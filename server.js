require('dotenv').config(); // Load .env variables
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const slugify = require('slugify');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json()); // built-in body parser

// MongoDB Connection
mongoose.connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
})
.then(() => console.log('MongoDB connected'))
.catch(err => console.error('MongoDB connection error:', err));

// Blog Schema
const blogSchema = new mongoose.Schema({
    title: { type: String, required: true },
    slug: { type: String, required: true, unique: true },
    content: { type: String, required: true },
    coverImageUrl: { type: String, default: '' },
    tags: { type: [String], default: [] },
    author: {
        id: { type: String, required: true },
        name: { type: String, required: true }
    },
}, { timestamps: true });

const Blog = mongoose.model('Blog', blogSchema);

// ----- CRUD ROUTES -----

// Add Blog
app.post('/api/blogs', async (req, res) => {
    const { title, content, coverImageUrl, tags, author } = req.body;

    if (!title || !content || !author?.id || !author?.name) {
        return res.status(400).json({ error: true, message: 'Missing required fields' });
    }

    try {
        const slug = slugify(title, { lower: true, strict: true });

        const newBlog = new Blog({
            title,
            slug,
            content,
            coverImageUrl: coverImageUrl || '',
            tags: Array.isArray(tags) ? tags : tags?.split(',').map(t => t.trim()) || [],
            author
        });

        const savedBlog = await newBlog.save();

        res.status(201).json({
            error: false,
            blog: savedBlog,
            message: 'Blog added successfully'
        });
    } catch (err) {
        console.error('Add blog error:', err);
        res.status(500).json({ error: true, message: 'Internal Server Error' });
    }
});

// Edit Blog
app.put('/api/blogs/:blogId', async (req, res) => {
    const blogId = req.params.blogId;
    const { title, content, coverImageUrl, tags } = req.body;

    if (!title && !content && !tags && !coverImageUrl) {
        return res.status(400).json({ error: true, message: 'No changes provided' });
    }

    try {
        const blog = await Blog.findById(blogId);
        if (!blog) return res.status(404).json({ error: true, message: 'Blog not found' });

        if (title) {
            blog.title = title;
            blog.slug = slugify(title, { lower: true, strict: true });
        }
        if (content) blog.content = content;
        if (coverImageUrl) blog.coverImageUrl = coverImageUrl;
        if (tags) blog.tags = Array.isArray(tags) ? tags : tags.split(',').map(t => t.trim());

        await blog.save();

        res.json({ error: false, blog, message: 'Blog updated successfully' });
    } catch (err) {
        console.error('Edit blog error:', err);
        res.status(500).json({ error: true, message: 'Internal Server Error' });
    }
});

// Get All Blogs
app.get('/api/blogs', async (req, res) => {
    try {
        const blogs = await Blog.find().sort({ createdAt: -1 });
        res.json({ error: false, blogs, message: 'Blogs retrieved successfully' });
    } catch (err) {
        console.error('Get blogs error:', err);
        res.status(500).json({ error: true, message: 'Internal Server Error' });
    }
});

// Delete Blog
app.delete('/api/blogs/:blogId', async (req, res) => {
    const blogId = req.params.blogId;

    try {
        const blog = await Blog.findById(blogId);
        if (!blog) return res.status(404).json({ error: true, message: 'Blog not found' });

        await Blog.deleteOne({ _id: blogId });
        res.json({ error: false, message: 'Blog deleted successfully' });
    } catch (err) {
        console.error('Delete blog error:', err);
        res.status(500).json({ error: true, message: 'Internal Server Error' });
    }
});

// Start server
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));

module.exports = app;

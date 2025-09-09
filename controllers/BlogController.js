const Blog = require('../models/Blog');
const slugify = require('slugify');

// Create a new blog
exports.createBlog = async (req, res) => {
    const { title, content, coverImageUrl, tags } = req.body;
    if (!title || !content) return res.status(400).json({ error: true, message: 'Title and content are required' });

    try {
        const blog = await new Blog({
            title,
            slug: slugify(title, { lower: true, strict: true }),
            content,
            coverImageUrl: coverImageUrl || '',
            tags: Array.isArray(tags) ? tags : tags?.split(',').map(t => t.trim()) || [],
            author: { id: req.user.id, name: req.user.name }
        }).save();

        res.status(201).json({ error: false, blog, message: 'Blog added successfully' });
    } catch (err) {
        console.error('Create blog error:', err);
        res.status(500).json({ error: true, message: 'Internal Server Error' });
    }
};

// Get all blogs (public)
exports.getAllBlogs = async (req, res) => {
    try {
        const blogs = await Blog.find().sort({ createdAt: -1 });
        res.json({ error: false, blogs, message: 'Blogs retrieved successfully' });
    } catch (err) {
        console.error('Get blogs error:', err);
        res.status(500).json({ error: true, message: 'Internal Server Error' });
    }
};

// Update blog (req.blog already attached, authorizeAuthor ensures author)
exports.updateBlog = async (req, res) => {
    const { title, content, coverImageUrl, tags } = req.body;
    const blog = req.blog;

    if (!title && !content && !coverImageUrl && !tags)
        return res.status(400).json({ error: true, message: 'No changes provided' });

    try {
        if (title) { blog.title = title; blog.slug = slugify(title, { lower: true, strict: true }); }
        if (content) blog.content = content;
        if (coverImageUrl) blog.coverImageUrl = coverImageUrl;
        if (tags) blog.tags = Array.isArray(tags) ? tags : tags.split(',').map(t => t.trim());

        const updatedBlog = await blog.save();
        res.json({ error: false, blog: updatedBlog, message: 'Blog updated successfully' });
    } catch (err) {
        console.error('Update blog error:', err);
        res.status(500).json({ error: true, message: 'Internal Server Error' });
    }
};

// Delete blog (req.blog already attached, authorizeAuthor ensures author)
exports.deleteBlog = async (req, res) => {
    try {
        await Blog.deleteOne({ _id: req.blog._id });
        res.json({ error: false, message: 'Blog deleted successfully' });
    } catch (err) {
        console.error('Delete blog error:', err);
        res.status(500).json({ error: true, message: 'Internal Server Error' });
    }
};

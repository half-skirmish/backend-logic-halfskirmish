const express = require('express');
const router = express.Router();
const BlogController = require('../controllers/BlogController');
const { authenticateToken, authorizeAuthor } = require('../middleware/auth');
const { attachBlog } = require('../middleware/blogMiddleware');

const Blog = require('../models/Blog');

// --------------------
// BLOG ROUTES
// --------------------

// Create blog (auth required)
router.post('/', authenticateToken, BlogController.createBlog);

// Get all blogs (public)
router.get('/', BlogController.getAllBlogs);

// Attach blog automatically for :blogId routes
router.use('/:blogId', attachBlog(Blog));

// Update blog (auth + author check)
router.put('/:blogId', authenticateToken, authorizeAuthor, BlogController.updateBlog);

// Delete blog (auth + author check)
router.delete('/:blogId', authenticateToken, authorizeAuthor, BlogController.deleteBlog);

module.exports = router;

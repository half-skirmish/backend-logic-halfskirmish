/**
 * Middleware: Attach blog to request based on :blogId
 * @param {MongooseModel} BlogModel - The Blog model
 */
exports.attachBlog = (BlogModel) => async (req, res, next) => {
    const blogId = req.params.blogId;
    if (!blogId) return next(); // skip if no blogId param

    try {
        const blog = await BlogModel.findById(blogId);
        if (!blog) return res.status(404).json({ error: true, message: 'Blog not found' });

        req.blog = blog; // attach blog to request
        next();
    } catch (err) {
        console.error('Attach blog error:', err);
        res.status(500).json({ error: true, message: 'Internal Server Error' });
    }
};

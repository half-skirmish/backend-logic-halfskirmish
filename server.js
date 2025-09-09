require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

mongoose.set('strictQuery', false);

// Routes
const blogRoutes = require('./routes/blogRoutes');
const authRoutes = require('./routes/authRoutes');

const app = express();
const PORT = process.env.PORT || 5000;

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

// Routes
app.use('/api/auth', authRoutes); // authentication routes
app.use('/api/blogs', blogRoutes); // blog routes

// 404 handler
app.use((req, res) => {
    res.status(404).json({ error: true, message: 'Route not found' });
});


// Default route
app.get('/', (req, res) => {
    res.send({ message: 'Welcome to the Blog API', status: 'running' });
});

// Global error handler (optional, for scalability)
app.use((err, req, res, next) => {
    console.error('Global error:', err);
    res.status(500).json({ error: true, message: 'Internal Server Error' });
});

app.listen(PORT, (err) => {
    if (err) return console.error('Server failed to start:', err);
    console.log(`Server running on http://localhost:${PORT}`);
});

module.exports = app;

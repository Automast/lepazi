const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');


const app = express();
const PORT = process.env.PORT || 3000;
const ADMIN_PASSWORD = 'dimehook';

// Middleware
app.use(cors({
    origin: [
        'http://localhost:3000',
        'http://127.0.0.1:3000',
        'https://lepazi.com',  // Replace with your actual Netlify URL
        /\.netlify\.app$/  // This allows all netlify.app domains
    ],
    credentials: true
}));
app.use(express.json());

// Serve the frontend statically from ../frontend
app.use(express.static(path.join(__dirname, '../frontend')));


// MongoDB Atlas Connection
// Replace YOUR_MONGODB_CONNECTION_STRING with your actual MongoDB Atlas connection string
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://dimehook:dunamis@cluster0.to3wqg8.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';

mongoose.connect(MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
}).then(() => {
    console.log('Connected to MongoDB Atlas');
}).catch(err => {
    console.error('MongoDB connection error:', err);
});

// Content Schema
const contentSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true
    },
    description: {
        type: String,
        required: true
    },
    icon: {
        type: String,
        required: true
    },
    slug: {
        type: String,
        required: true,
        unique: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

const Content = mongoose.model('Content', contentSchema);

// Helper: sequential slug royale<number>
async function generateNextSlug() {
  const last = await Content.find({ slug: /^royale\d+$/ })
    .sort({ createdAt: -1 })
    .limit(1);

  let n = 1;
  if (last[0]) {
    const match = (last[0].slug || '').match(/royale(\d+)/);
    if (match) n = parseInt(match[1], 10) + 1;
  }
  return `royale${n}`;
}


// Routes

// Admin authentication
app.post('/api/admin/login', (req, res) => {
    const { password } = req.body;
    if (password === ADMIN_PASSWORD) {
        res.json({ success: true, message: 'Login successful' });
    } else {
        res.status(401).json({ success: false, message: 'Invalid password' });
    }
});

// Get all content (sorted by newest first by default)
app.get('/api/content', async (req, res) => {
    try {
        const sortOrder = req.query.sort === 'oldest' ? 1 : -1;
        const content = await Content.find().sort({ createdAt: sortOrder });
        res.json(content);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch content' });
    }
});

// Get single content by slug
app.get('/api/content/:slug', async (req, res) => {
    try {
        const content = await Content.findOne({ slug: req.params.slug });
        if (!content) {
            return res.status(404).json({ error: 'Content not found' });
        }
        res.json(content);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch content' });
    }
});

// Add new content (admin only)
app.post('/api/content', async (req, res) => {
    try {
        const { title, description, icon, password } = req.body;

        // Verify admin password
        if (password !== ADMIN_PASSWORD) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        // Validate required fields
        if (!title || !description || !icon) {
            return res.status(400).json({ error: 'All fields are required' });
        }

// Generate sequential slug: royale<number>
const slug = await generateNextSlug();


        // Create new content
        const content = new Content({
            title,
            description,
            icon,
            slug
        });

        await content.save();
        res.status(201).json(content);
    } catch (error) {
        res.status(500).json({ error: 'Failed to create content' });
    }
});

// Delete content (admin only)
app.delete('/api/content/:id', async (req, res) => {
    try {
        const { password } = req.body;

        // Verify admin password
        if (password !== ADMIN_PASSWORD) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const content = await Content.findByIdAndDelete(req.params.id);
        if (!content) {
            return res.status(404).json({ error: 'Content not found' });
        }

        res.json({ message: 'Content deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete content' });
    }
});

// Frontend fallbacks so /others and /others/royale<number> serve index.html
app.get('/others', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});
app.get('/others/*', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// Health check

app.get('/health', (req, res) => {
    res.json({ status: 'OK', message: 'Server is running' });
});

// Start server
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);

});



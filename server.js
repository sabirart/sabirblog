const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config();
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' })); // Allow larger payloads for base64 images
app.use(express.static('public')); // Serve frontend files

// MongoDB Schema
const postSchema = new mongoose.Schema({
    id: { type: String, required: true, unique: true },
    title: { type: String, required: true },
    category: { type: String, required: true },
    date: { type: String, required: true },
    readTime: { type: String, required: true },
    image: { type: String, required: true },
    content: { type: String, required: true },
    excerpt: { type: String, required: true },
    lastModified: { type: String, required: true },
    creator: {
        name: { type: String, required: true },
        email: { type: String, default: '' },
        social: { type: String, default: '' }
    },
    links: [String]
});

const Post = mongoose.model('Post', postSchema);

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
}).then(() => {
    console.log('Connected to MongoDB');
}).catch(err => {
    console.error('MongoDB connection error:', err);
});

// Routes
app.get('/api/posts', async (req, res) => {
    try {
        const posts = await Post.find();
        res.json(posts);
    } catch (error) {
        console.error('Error fetching posts:', error);
        res.status(500).json({ error: 'Failed to fetch posts' });
    }
});

app.get('/api/posts/:id', async (req, res) => {
    try {
        const post = await Post.findOne({ id: req.params.id });
        if (!post) return res.status(404).json({ error: 'Post not found' });
        res.json(post);
    } catch (error) {
        console.error('Error fetching post:', error);
        res.status(500).json({ error: 'Failed to fetch post' });
    }
});

app.post('/api/posts', async (req, res) => {
    try {
        const postData = req.body;
        if (!postData.title || !postData.category || !postData.content || !postData.creator?.name) {
            return res.status(400).json({ error: 'Missing required fields' });
        }
        const newPost = new Post({
            ...postData,
            id: Date.now().toString(), // Ensure unique ID
            lastModified: new Date().toISOString()
        });
        await newPost.save();
        res.status(201).json({ message: 'Post created', post: newPost });
    } catch (error) {
        console.error('Error creating post:', error);
        res.status(500).json({ error: 'Failed to create post' });
    }
});

app.delete('/api/posts/:id', async (req, res) => {
    try {
        const result = await Post.deleteOne({ id: req.params.id });
        if (result.deletedCount === 0) {
            return res.status(404).json({ error: 'Post not found' });
        }
        res.json({ message: 'Post deleted' });
    } catch (error) {
        console.error('Error deleting post:', error);
        res.status(500).json({ error: 'Failed to delete post' });
    }
});

// Serve frontend
app.get('*', (req, res) => {
    res.sendFile(__dirname + '/public/index.html');
});

// Start server
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
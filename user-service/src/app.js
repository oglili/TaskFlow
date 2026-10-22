const express = require('express');
const { MongoClient } = require('mongodb');

const app = express();
const PORT = process.env.PORT || 3001;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const DATABASE_NAME = process.env.DATABASE_NAME || 'taskflow';

// Allow the service to receive JSON request bodies.
app.use(express.json());
app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', 'http://localhost:3002');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.sendStatus(204);
    }

    next();
});

app.get('/', (req, res) => {
    res.json({
        message: 'Welcome to the TaskFlow User Service',
        endpoints: [
            'GET /health',
            'GET /api/users',
            'GET /api/users/:id',
            'POST /api/users'
        ]
    });
});

let usersCollection;

// Health endpoint for checking whether the service is running.
app.get('/health', (req, res) => {
    res.json({ status: 'ok', service: 'user-service' });
});

// GET /api/users - return all users.
app.get('/api/users', async (req, res) => {
    try {
        const users = await usersCollection.find({}).toArray();

        res.json(users.map(user => ({
            id: user._id.toString(),
            name: user.name,
            email: user.email
        })));
    } catch (error) {
        console.error('Failed to fetch users:', error);
        res.status(500).json({ error: 'Failed to fetch users' });
    }
});


// GET /api/users/:id - return one user.
app.get('/api/users/:id', async (req, res) => {
    const { ObjectId } = require('mongodb');

    if (!ObjectId.isValid(req.params.id)) {
        return res.status(404).json({ error: 'User not found' });
    }

    try {
        const user = await usersCollection.findOne({
            _id: new ObjectId(req.params.id)
        });

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.json({
            id: user._id.toString(),
            name: user.name,
            email: user.email
        });
    } catch (error) {
        console.error('Failed to fetch user:', error);
        res.status(500).json({ error: 'Failed to fetch user' });
    }
});


// POST /api/users - create a user.
app.post('/api/users', async (req, res) => {
    const { name, email } = req.body;

    if (
        typeof name !== 'string' || !name.trim() ||
        typeof email !== 'string' || !email.trim()
    ) {
        return res.status(400).json({
            error: 'Name and email are required'
        });
    }

    const cleanName = name.trim();
    const cleanEmail = email.trim();

    try {
        const emailExists = await usersCollection.findOne({
            email: { $regex: `^${cleanEmail.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, $options: 'i' }
        });

        if (emailExists) {
            return res.status(409).json({
                error: 'A user with this email already exists'
            });
        }

        const user = {
            name: cleanName,
            email: cleanEmail
        };

        const result = await usersCollection.insertOne(user);

        res.status(201).json({
            id: result.insertedId.toString(),
            ...user
        });
    } catch (error) {
        console.error('Failed to create user:', error);
        res.status(500).json({ error: 'Failed to create user' });
    }
});

async function startServer() {
    const client = new MongoClient(MONGODB_URI);

    try {
        await client.connect();

        const database = client.db(DATABASE_NAME);
        usersCollection = database.collection('users');

        await usersCollection.createIndex(
            { email: 1 },
            { unique: true }
        );

        app.listen(PORT, '0.0.0.0', () => {
            console.log(`User Service listening on port ${PORT}`);
        });
    } catch (error) {
        console.error('Failed to connect to MongoDB:', error);
        process.exit(1);
    }
}

startServer();


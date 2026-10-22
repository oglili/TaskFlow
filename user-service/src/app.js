const express = require('express');

const app = express();
const PORT = process.env.PORT || 3001;

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

// We will replace this with MongoDB later.
const users = [
    {
        id: '1',
        name: 'Alex Johnson',
        email: 'alex@example.com'
    },
    {
        id: '2',
        name: 'Sam Taylor',
        email: 'sam@example.com'
    }
];

// Health endpoint for checking whether the service is running.
app.get('/health', (req, res) => {
    res.json({ status: 'ok', service: 'user-service' });
});

// GET /api/users - return all users.
app.get('/api/users', (req, res) => {
    res.json(users);
});

// GET /api/users/:id - return one user.
app.get('/api/users/:id', (req, res) => {
    const user = users.find((item) => item.id === req.params.id);

    if (!user) {
        return res.status(404).json({ error: 'User not found' });
    }

    res.json(user);
});

// POST /api/users - create a user.
app.post('/api/users', (req, res) => {
    const { name, email } = req.body;

    if (
        typeof name !== 'string' || !name.trim() ||
        typeof email !== 'string' || !email.trim()
    ) {
        return res.status(400).json({
            error: 'Name and email are required'
        });
    }

    const emailExists = users.some(
        user => user.email.toLowerCase() === email.trim().toLowerCase()
    );

    if (emailExists) {
        return res.status(409).json({
            error: 'A user with this email already exists'
        });
    }

    const user = {
    id: String(
        users.length > 0
            ? Math.max(...users.map(user => Number(user.id))) + 1
            : 1
    ),
        name: name.trim(),
        email: email.trim()
    };  

    users.push(user);

    res.status(201).json(user);
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`User Service listening on port ${PORT}`);
});

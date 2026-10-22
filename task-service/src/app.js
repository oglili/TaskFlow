const express = require('express');
const path = require('path');
const { MongoClient, ObjectId } = require('mongodb');

const app = express();
const PORT = process.env.PORT || 3002;
const USER_SERVICE_URL = process.env.USER_SERVICE_URL || 'http://localhost:3001';
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const DATABASE_NAME = process.env.DATABASE_NAME || 'taskflow';

app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

let tasksCollection;

// Welcome endpoint.
app.get('/', (req, res) => {
    res.json({
        message: 'Welcome to the TaskFlow Task Service',
        endpoints: [
            'GET /health',
            'GET /api/tasks',
            'GET /api/tasks/:id',
            'POST /api/tasks',
            'PATCH /api/tasks/:id/status'
        ]
    });
});

// Health endpoint.
app.get('/health', (req, res) => {
    res.json({ status: 'ok', service: 'task-service' });
});

app.get('/api/users', async (req, res) => {
    try {
        const response = await fetch(`${USER_SERVICE_URL}/api/users`);

        if (!response.ok) {
            return res.status(502).json({
                error: 'Failed to retrieve users from User Service'
            });
        }

        const users = await response.json();
        res.json(users);
    } catch (error) {
        console.error('Failed to retrieve users:', error);
        res.status(503).json({
            error: 'User Service is unavailable'
        });
    }
});


// Return all tasks.
app.get('/api/tasks', async (req, res) => {
    try {
        const tasks = await tasksCollection.find({}).toArray();

        res.json(tasks.map(task => ({
            id: task._id.toString(),
            title: task.title,
            description: task.description,
            priority: task.priority,
            status: task.status,
            assignedTo: task.assignedTo
        })));
    } catch (error) {
        console.error('Failed to fetch tasks:', error);
        res.status(500).json({ error: 'Failed to fetch tasks' });
    }
});


// Return one task.
app.get('/api/tasks/:id', async (req, res) => {
    if (!ObjectId.isValid(req.params.id)) {
        return res.status(404).json({ error: 'Task not found' });
    }

    try {
        const task = await tasksCollection.findOne({
            _id: new ObjectId(req.params.id)
        });

        if (!task) {
            return res.status(404).json({ error: 'Task not found' });
        }

        res.json({
            id: task._id.toString(),
            title: task.title,
            description: task.description,
            priority: task.priority,
            status: task.status,
            assignedTo: task.assignedTo
        });
    } catch (error) {
        console.error('Failed to fetch task:', error);
        res.status(500).json({ error: 'Failed to fetch task' });
    }
});


// Create a task.
app.post('/api/tasks', async (req, res) => {
    const {
        title,
        description = '',
        priority = 'medium',
        assignedTo = null
    } = req.body;

    if (typeof title !== 'string' || !title.trim()) {
        return res.status(400).json({
            error: 'Task title is required'
        });
    }

    if (!['low', 'medium', 'high'].includes(priority)) {
        return res.status(400).json({
            error: 'Priority must be low, medium, or high'
        });
    }

    if (
        typeof description !== 'string' ||
        !(assignedTo === null || (
            typeof assignedTo === 'string' && assignedTo.trim()
        ))
    ) {
        return res.status(400).json({
            error: 'Invalid description or assigned user'
        });
    }

    if (assignedTo !== null) {
        try {
            const userResponse = await fetch(
                `${USER_SERVICE_URL}/api/users/${encodeURIComponent(assignedTo)}`
            );

            if (userResponse.status === 404) {
                return res.status(400).json({
                    error: 'Assigned user does not exist'
                });
            }

            if (!userResponse.ok) {
                return res.status(502).json({
                    error: 'User Service returned an unexpected response'
                });
            }
        } catch (error) {
            return res.status(503).json({
                error: 'User Service is unavailable'
            });
        }
    }

    try {
        const task = {
            title: title.trim(),
            description: description.trim(),
            priority,
            status: 'todo',
            assignedTo
        };

        const result = await tasksCollection.insertOne(task);

        res.status(201).json({
            id: result.insertedId.toString(),
            ...task
        });
    } catch (error) {
        console.error('Failed to create task:', error);
        res.status(500).json({ error: 'Failed to create task' });
    }
});

// Change a task's status.
app.patch('/api/tasks/:id/status', async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;

    if (!ObjectId.isValid(id)) {
        return res.status(404).json({ error: 'Task not found' });
    }

    if (!['todo', 'in-progress', 'done'].includes(status)) {
        return res.status(400).json({ error: 'Invalid task status' });
    }

    try {
        const result = await tasksCollection.updateOne(
            { _id: new ObjectId(id) },
            { $set: { status } }
        );

        if (result.matchedCount === 0) {
            return res.status(404).json({ error: 'Task not found' });
        }

        const task = await tasksCollection.findOne({
            _id: new ObjectId(id)
        });

        res.json({
            id: task._id.toString(),
            title: task.title,
            description: task.description,
            priority: task.priority,
            status: task.status,
            assignedTo: task.assignedTo
        });
    } catch (error) {
        console.error('Failed to update task:', error);
        res.status(500).json({ error: 'Failed to update task' });
    }
});


async function startServer() {
    const client = new MongoClient(MONGODB_URI);

    try {
        await client.connect();

        const database = client.db(DATABASE_NAME);
        tasksCollection = database.collection('tasks');

        app.listen(PORT, '0.0.0.0', () => {
            console.log(`Task Service listening on port ${PORT}`);
        });
    } catch (error) {
        console.error('Failed to connect to MongoDB:', error);
        process.exit(1);
    }
}

startServer();

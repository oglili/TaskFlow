const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3002;

const USER_SERVICE_URL = process.env.USER_SERVICE_URL || 'http://localhost:3001';

app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

// We will replace this with MongoDB later.
const tasks = [
    {
        id: '1',
        title: 'Complete Kubernetes assignment',
        description: 'Build and deploy the TaskFlow application',
        priority: 'high',
        status: 'in-progress',
        assignedTo: '1'
    },
    {
        id: '2',
        title: 'Review project documentation',
        description: 'Prepare the project README',
        priority: 'medium',
        status: 'todo',
        assignedTo: '2'
    }
];

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

// Return all tasks.
app.get('/api/tasks', (req, res) => {
    res.json(tasks);
});

// Return one task.
app.get('/api/tasks/:id', (req, res) => {
    const task = tasks.find(item => item.id === req.params.id);

    if (!task) {
        return res.status(404).json({ error: 'Task not found' });
    }

    res.json(task);
});

// Create a task.
app.post('/api/tasks', async (req, res) => {
    const { title, description = '', priority = 'medium', assignedTo = null } = req.body;

    if (typeof title !== 'string' || !title.trim()) {
        return res.status(400).json({ error: 'Task title is required' });
    }

    if (!['low', 'medium', 'high'].includes(priority)) {
        return res.status(400).json({
            error: 'Priority must be low, medium, or high'
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


    const task = {
        id: String(
            tasks.length > 0
                ? Math.max(...tasks.map(item => Number(item.id))) + 1
                : 1
        ),
        title: title.trim(),
        description: typeof description === 'string' ? description.trim() : '',
        priority,
        status: 'todo',
        assignedTo
    };

    tasks.push(task);

    res.status(201).json(task);
});

// Change a task's status.
app.patch('/api/tasks/:id/status', (req, res) => {
    const task = tasks.find(item => item.id === req.params.id);

    if (!task) {
        return res.status(404).json({ error: 'Task not found' });
    }

    const { status } = req.body;

    if (!['todo', 'in-progress', 'done'].includes(status)) {
        return res.status(400).json({
            error: 'Status must be todo, in-progress, or done'
        });
    }

    task.status = status;

    res.json(task);
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`Task Service listening on port ${PORT}`);
});

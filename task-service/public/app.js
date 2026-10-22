const taskForm = document.getElementById('task-form');
const tasksList = document.getElementById('tasks-list');
const formMessage = document.getElementById('form-message');
const assignedToSelect = document.getElementById('assignedTo');
const refreshButton = document.getElementById('refresh-button');

async function loadUsers() {
    try {
        const response = await fetch('http://localhost:3001/api/users');

        if (!response.ok) {
            throw new Error('Could not load users');
        }

        const users = await response.json();

        assignedToSelect.replaceChildren(
            new Option('Unassigned', '')
        );

        users.forEach(user => {
            assignedToSelect.add(
                new Option(`${user.name} (${user.email})`, user.id)
            );
        });
    } catch (error) {
        formMessage.textContent =
            'Could not load users. Check that the User Service is running.';
    }
}

async function loadTasks() {
    tasksList.textContent = 'Loading tasks...';

    try {
        const response = await fetch('/api/tasks');

        if (!response.ok) {
            throw new Error('Could not load tasks');
        }

        const tasks = await response.json();
        tasksList.replaceChildren();

        if (tasks.length === 0) {
            tasksList.textContent = 'No tasks yet. Create your first task!';
            return;
        }

        tasks.forEach(task => {
            const card = document.createElement('article');
            card.className = 'task-card';

            const title = document.createElement('h3');
            title.textContent = task.title;

            const description = document.createElement('p');
            description.textContent = task.description || 'No description';

            const meta = document.createElement('div');
            meta.className = 'task-meta';

            const priorityTag = document.createElement('span');
            priorityTag.className = 'tag';
            priorityTag.textContent = `Priority: ${task.priority}`;

            const statusTag = document.createElement('span');
            statusTag.className = 'tag';
            statusTag.textContent = `Status: ${task.status}`;

            const assignedTag = document.createElement('span');
            assignedTag.className = 'tag';
            assignedTag.textContent = `Assigned user: ${task.assignedTo || 'Unassigned'}`;

            meta.append(priorityTag, statusTag, assignedTag);

            const statusLabel = document.createElement('label');
            statusLabel.textContent = 'Update status: ';

            const statusSelect = document.createElement('select');

            [
                ['todo', 'To do'],
                ['in-progress', 'In progress'],
                ['done', 'Done']
            ].forEach(([value, label]) => {
                statusSelect.add(new Option(label, value));
            });

            statusSelect.value = task.status;

            const updateButton = document.createElement('button');
            updateButton.type = 'button';
            updateButton.textContent = 'Save status';

            updateButton.addEventListener('click', async () => {
                try {
                    const response = await fetch(
                        `/api/tasks/${encodeURIComponent(task.id)}/status`,
                        {
                            method: 'PATCH',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ status: statusSelect.value })
                        }
                    );

                    if (!response.ok) {
                        throw new Error('Could not update task status');
                    }

                    await loadTasks();
                } catch (error) {
                    alert(error.message);
                }
            });

            statusLabel.appendChild(statusSelect);

            card.append(
                title,
                description,
                meta,
                statusLabel,
                document.createTextNode(' '),
                updateButton
            );

            tasksList.appendChild(card);
        });
    } catch (error) {
        tasksList.textContent =
            'Could not load tasks. Check that the Task Service is running.';
    }
}

taskForm.addEventListener('submit', async event => {
    event.preventDefault();
    formMessage.textContent = 'Creating task...';

    const formData = new FormData(taskForm);
    const assignedTo = formData.get('assignedTo');

    const task = {
        title: formData.get('title'),
        description: formData.get('description'),
        priority: formData.get('priority'),
        assignedTo: assignedTo || null
    };

    try {
        const response = await fetch('/api/tasks', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(task)
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.error || 'Could not create task');
        }

        taskForm.reset();
        formMessage.textContent = 'Task created successfully!';
        await loadTasks();
    } catch (error) {
        formMessage.textContent = error.message;
    }
});

refreshButton.addEventListener('click', loadTasks);

loadUsers();
loadTasks();

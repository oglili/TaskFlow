# TaskFlow

TaskFlow is a task management application built with Node.js, Express, MongoDB, and Kubernetes.

## Architecture

The application consists of three services:

- **Task Service:** Provides REST APIs for creating, retrieving, and updating tasks. It also serves the browser-based user interface.
- **User Service:** Provides REST APIs for creating and retrieving users.
- **MongoDB:** Stores users and tasks persistently.

The Task Service communicates with the User Service through HTTP REST APIs to validate task assignments. Both services connect to MongoDB.

## Technology Stack

- Node.js
- Express.js
- MongoDB
- Docker
- Kubernetes
- HTML, CSS, and JavaScript

## Kubernetes

Kubernetes configuration files are located in the `kubernetes/` directory.

Both application services are configured with two replicas to demonstrate independent horizontal scaling. MongoDB runs as a separate, single-instance service using persistent storage.

## Project Status

The application code and initial Kubernetes configurations are under development. Container images, deployment testing, and final documentation will be completed as the project progresses.

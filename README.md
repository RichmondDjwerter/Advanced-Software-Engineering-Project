<img alt="ultron logo" src="ultron-app/public/ultron/logo.png" width=500/>

## Description
Ultron is a project developed as part of the Advanced Software Engineering course.

For a detailed description of the project, its objectives, and features, please refer to project_description.md.

## Technology stack

<table>
  <thead>
    <tr>
      <th align="left">Scope</th>
      <th align="left">Technology</th>
    </tr>
  </thead>
  <tbody>
    <tr><td>Frontend</td><td>React, Next.js, TypeScript</td></tr>
    <tr><td>Backend</td><td>Python, FastAPI</td></tr>
    <tr><td>Database</td><td>PostgreSQL, Docker</td></tr>
     <tr><td>UI Components</td><td>shadcn/ui</td></tr>
    <tr><td>Dependency Management</td><td>UV</td></tr>
    <tr><td>Package Manager (Frontend)</td><td>npm</td></tr>
  </tbody>
</table>

## Getting Started 

### Requirements
- Node.js >= 26.8.2
- npm >= 12.0.2
- Python (version specified in the backend configuration)
- UV – Python package and project manager
- Docker and Docker Compose
- Git

## Installing and deploying project locally

### 1. Clone the Repository

git clone [the project](https://github.com/RichmondDjwerter/Advanced-Software-Engineering-Project.git)

    
```
    cd backend Advanced-Software-Engineering-Project
```


### 2. Set Up and Start the Backend

Navigate to the `backend` directory and start the database using Docker:

```
    cd backend
    docker compose up
```

### 3. Setu Up and Start the Backend

Install the backend dependencies using UV:
   
   ```
    uv sync --frozen
   ```
Start the backend: 

```
    uv run main.py
```

The `--frozen` flag ensures that dependencies are installed according to the committed uv.lock file without modifying it.

### 4. Set UP und Start the Frontend

Open a new terminal and navigate to the frontend directory 

```
    cd ultron-app
```

Install the dependencies: 

```
    npm install
```

Start the Next.js server:
``` 
    npm run build
    npm run start
```

Or use

```
    npm run dev 
```

This command will build and start the application

### 5. Access the Application 
 Check if the server is running locally by following this URL: http://localhost:3000/

## Frontend UI with shadcn/ui**

The frontend uses [shadcn/ui](https://ui.shadcn.com/) for UI components. When adding new features or pages, shadcn/ui components should be used wherever possible to keep the design consistent across the application.

If a suitable component is not available, a custom component can be created when needed.


## Backend Development with UV 

The backend uses UV, a fast Python package and project manager, to manage dependencies and the development environment.

### 1. Install UV

Windows (PowerShell)

irm https://astral.sh/uv/install.ps1 | iex

macOS / Linux / Git Bash

curl -LsSf https://astral.sh/uv/install.sh | sh

After installation, reopen your terminal and verify that UV is available:

uv --version

### 2. Install Dependencies

Synchronize the environment with the project's lock file:

uv sync --frozen

This installs the dependencies in the backend folder defined in pyproject.toml and locked in uv.lock, ensuring that team members use consistent package versions.

### 4. Add a New Library

To add a new Python dependency, use:

uv add <library-name>

UV updates the project configuration and lock file.
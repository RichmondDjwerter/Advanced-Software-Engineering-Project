<img alt="ultron logo" src="ultron-app/public/ultron/logo.png" width=500/>

## Description
Ultron is a project developed as part of the Advanced Software Engineering course.

For a detailed description of the project, its objectives, and features, please refer to project_description.md.

## Technology stack

| Scope | Technology |
|---|---|
| Frontend | React, Next.js, TypeScript |
| Backend | Python, FastAPI |
| Database | PostgreSQL, Docker |
| UI components | shadcn/ui |
| Dependency Management | uv |
| Package Manager (Frontend) | npm |

## Getting Started 

### Requirements
- Node.js >= 26.8.2
- npm >= 12.0.2
- Python (version specified in the backend configuration)
- uv – Python package and project manager
- Docker and Docker Compose
- Git

## Installing and deploying the project locally

### 1. Clone the repository


Git clone the project:
```
git clone https://github.com/RichmondDjwerter/Advanced-Software-Engineering-Project.git
```

### 2. Set up the database

Navigate to the `backend` directory and start the database using Docker:

```
docker compose up
```

### 3. Set up and start the backend

Still in the `backend` directory, install the backend dependencies using uv:
   
```
uv sync --frozen
```

Start the backend: 

```
uv run main.py
```

The `--frozen` flag ensures that dependencies are installed according to the committed `uv.lock` file without modifying it.

### 4. Set up and start the frontend

Open a new terminal and navigate to the `frontend` directory. 

Install the dependencies: 

```
npm install
```

Start the Next.js server:
``` 
npm run build
npm run start
```

Or use:

```
npm run dev 
```

This command will build and start the application.

### 5. Access the application 
 Check if the server is running locally by following this URL: http://localhost:3000/

## Frontend UI with shadcn/ui

The frontend uses [shadcn/ui](https://ui.shadcn.com/) for UI components. When adding new features or pages, shadcn/ui components should be used wherever possible to keep the design consistent across the application.

If a suitable component is not available, a custom component can be created when needed.


## Backend development with uv 

The backend uses uv, a fast Python package and project manager, to manage dependencies and the development environment.

### 1. Install uv

Windows (PowerShell)
```
irm https://astral.sh/uv/install.ps1 | iex
```

macOS / Linux / Git Bash
```
curl -LsSf https://astral.sh/uv/install.sh | sh
```

After installation, reopen your terminal and verify that uv is available:
```
uv --version
```

### 2. Install dependencies

Synchronize the environment with the project's lock file:

```
uv sync --frozen`
```

This installs the dependencies in the backend folder defined in `pyproject.toml` and locked in `uv.lock`, ensuring that team members use consistent package versions.

### 4. Add a new library

To add a new Python dependency, use:
```
uv add <library-name>
```

uv updates the project configuration and lock file.

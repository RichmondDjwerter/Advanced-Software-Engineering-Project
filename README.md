<img alt="ultron logo" src="ultron-app/public/ultron/logo.png" width=500/>

## Description
Historical manuscripts analysis and transcription tool.

## Requirements
- Node.js >= 26.8.2
- npm >= 12.0.2

## Installing and deploying project locally
1. Git clone the project
2. Start the database using Docker by running the following command in the folder `backend`:
   
    ```
    docker compose up
    ```

3. Start the backend by running the followings commands in the folder `backend`:
   
   ```
    uv sync --frozen
    uv run main.py
   ```

4. Run the following commands at the root of the folder `ultron-app` in order to start the Next.js server:
    ```
    npm install
    npm run build
    npm run start
    ```

5. Check if the server is running locally by following this URL: http://localhost:3000/

## Technology stack
- Full-stack React framework with Next.js

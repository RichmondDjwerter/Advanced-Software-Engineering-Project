# BACKEND SETUP 

## QUICK SETUP UV (Windows / Mac / Linux)


### 1\. INSTALL UV (one time)

Windows PowerShell:
```
irm https://astral.sh/uv/install.ps1 | iex
```


Mac / Linux / Git Bash:
```
curl -LsSf https://astral.sh/uv/install.sh | sh
```


Then reopen your terminal and check:
```
uv --version
```
### 2\. CLONE THE REPOSITORY


```
git clone https://github.com/RichmondDjwerter/Advanced-Software-Engineering-Project.git
```
```
cd Advanced-Software-Engineering-Project/backend
```


### 3\. CREATE THE ENVIRONMENT (from lock file)


```
uv sync --frozen
```


(This installs the exact Python version and packages like eveeryone else. Defined in pyproject.toml and uv.lock)



### 4\. RUN BACKEND

```

uv run main.py
```

## ADD A NEW LIBRARY

```
uv add <library-name>

uv lock

git add pyproject.toml uv.lock

git commit -m "Add <library-name> dependency"

git p

Sync or update environment (use frozen to match exact versions):
```
uv sync --frozen
```


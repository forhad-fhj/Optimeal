---
description: Auto-push changes to the git repo after every code modification
---

After making any code changes to the project, always commit and push to the repository:

// turbo-all

1. Stage all changes:
```
git add -A
```

2. Commit with a descriptive message:
```
git commit -m "<type>: <description>"
```
Use conventional commit types: `feat`, `fix`, `refactor`, `style`, `chore`, `docs`.

3. Push to remote:
```
git push
```

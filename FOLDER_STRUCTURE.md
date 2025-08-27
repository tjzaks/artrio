# Artrio Folder Structure

## Main Folders:

### Code & Development
- **src/** - Source code (components, pages, hooks, etc.)
- **ios/** - iOS/Xcode project files
- **dist/** - Built production files
- **public/** - Static assets served directly
- **assets/** - Images, logos, icons

### Configuration
- **config/** - Various config files (capacitor, nixpacks, etc.)
- **supabase/** - Database migrations and Supabase config

### Documentation
- **documentation/** - All project documentation and guides
- **docs/** - API documentation and deployment guides
- **Claude_Conversations/** - Session logs with Claude

### Scripts & SQL
- **scripts/** - Build and deployment scripts
- **project_scripts/** - One-off scripts and fixes
- **sql_archive/** - SQL files (run then archive here)
- **sql/** - Active SQL workspace

### Other
- **node_modules/** - Dependencies (git-ignored)
- **_archive/** - Old/deprecated files

## Root Files (These stay in root):
- **.env files** - Environment variables
- **package.json** - Project dependencies
- **capacitor.config.ts** - Main Capacitor config
- **README.md** - Project readme
- **.gitignore** - Git ignore rules
- **LICENSE** - Project license
- **railway.json** - Railway deployment config
- **components.json** - shadcn/ui config
- **index.html** - Main HTML entry
- **postcss/tailwind/tsconfig** - Build configs
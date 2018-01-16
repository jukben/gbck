module.exports = () =>
  console.log(`Usage: syncy [projects]

Options:
-i, --init                Create new project  
-f, --force               Along with -i create new project even if already exists
-l, --list                List all project sorted by its latest updates 
-v, --version             Print version
-h, --help                Show this help
--auto-commit             Don't ask for commit message and use default one 
`);

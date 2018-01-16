const inquirer = require('inquirer');
const fs = require('fs-extra');
const path = require('path');
const ora = require('ora');

const { getSyncyPath, printError, urlRegex } = require('../util');
const { gitCloneProject } = require('../git');

const questions = [
  {
    type: 'input',
    name: 'name',
    message: "What's the project name?",
  },
  {
    type: 'input',
    name: 'url',
    message: "What's the Git Repository?",
    validate(value) {
      return (
        urlRegex.test(value) || 'Please enter a valid repository SSH address'
      );
    },
  },
];

async function init(force) {
  const { name, url } = await inquirer.prompt(questions);

  const syncyPath = await getSyncyPath();
  const projectPath = `${syncyPath}/${name}`;

  if (!force && (await fs.pathExists(projectPath))) {
    printError(
      new Error(
        'Project already exists.\nRun this command with --force or -f to reinitialize'
      )
    );
    return;
  }

  const configFile = `${projectPath}/config`;
  const readmeFile = `${projectPath}/README.md`;

  const config = {
    url,
    readme: path.basename(readmeFile),
    entities: [],
  };

  await fs.ensureFile(configFile);
  await fs.writeJson(configFile, config);
  await fs.writeFile(
    readmeFile,
    `# ${name}
  Synced with Syncy.
  `
  );

  const spinner = ora('Creating project').start();

  try {
    await gitCloneProject(name);
    spinner.succeed(`Project "${name}" was successfully initialized.`);
  } catch (e) {
    await fs.remove(projectPath);
    spinner.stop();
    printError(e);
  }
}

module.exports = init;

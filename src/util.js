const fs = require('fs-extra');
const os = require('os');
const path = require('path');
const chalk = require('chalk');
const boxen = require('boxen');
const joi = require('joi');

const urlRegex = /(?:git|ssh|https?|git@[-\w.]+):(\/\/)?(.*?)(\.git)(\/?|#[-\d\w._]+?)$/;

const configSchema = joi.object().keys({
  url: joi.string().regex(urlRegex),
  readme: joi.string(),
  syncConfig: joi.boolean().default(true),
  branch: joi.string().default('master'),
  entities: joi
    .array()
    .items(
      joi.string(),
      joi.array().items(joi.string(), joi.string()),
      joi.object().keys({
        i: joi.string().required(),
        o: joi.string().required(),
        options: joi.object().keys({
          symlinks: joi.boolean(),
          include: joi.array().items(joi.string()),
          exclude: joi.array().items(joi.string()),
        }),
      })
    )
    .required(),
});

/**
 * Print plaintext error
 * @param {string} e
 */
function plainErrorMessage(e) {
  console.log(chalk.red(e));
}

/**
 * Print error message in box
 * @param {Error} e
 */
function printError(e) {
  if (!(e instanceof Error)) {
    plainErrorMessage(
      'Error: Argument of printError has to be an Error instance'
    );
    return;
  }
  console.log(boxen(chalk.red(e.message), { padding: 1, borderColor: 'red' }));
}

async function log(message, level = 'error') {
  const gbckPath = await getGbckPath();
  const file = `${gbckPath}/${level}.log`;

  await fs.ensureFile(file);
  await fs.appendFile(file, `> ${new Date().toUTCString()}\n${message}\n\n`);
}

/**
 * Print success message
 * @param {string} message
 */
function printSuccess(message) {
  console.log(
    boxen(chalk.green(message), { padding: 1, borderColor: 'green' })
  );
}

async function getGbckPath() {
  const syncPath = `${os.homedir()}/.gbck`;
  await fs.ensureDir(syncPath);
  return syncPath;
}

const getProjectPath = async projectName => {
  const gbckPath = await getGbckPath();
  const projectPath = `${gbckPath}/${projectName}`;
  if (!await fs.pathExists(projectPath)) {
    throw new Error('Project path is invalid!');
  }
  return projectPath;
};

const getProjectConfig = async projectName => {
  const projectPath = await getProjectPath(projectName);
  const configPath = `${projectPath}/config`;

  if (!await fs.pathExists(configPath)) {
    throw new Error(`No config for project "${projectName}" has found`);
  }

  let config;
  try {
    config = await fs.readJson(configPath);
  } catch (e) {
    await log(e);
    throw new Error(
      `Project "${projectName}" has invalid configuration. JSON is not valid.`
    );
  }

  const result = configSchema.validate(config);

  if (result.error) {
    await log(result.error);
    throw new Error(`Project "${projectName}" has invalid configuration`);
  }

  return result.value;
};

async function getAvailableProjects() {
  const gbckPath = await getGbckPath();
  const files = await fs.readdir(gbckPath);
  return files.filter(a =>
    fs.lstatSync(path.resolve(gbckPath, a)).isDirectory()
  );
}

module.exports = {
  getAvailableProjects,
  plainErrorMessage,
  printError,
  log,
  printSuccess,
  getGbckPath,
  getProjectPath,
  getProjectConfig,
  urlRegex,
};

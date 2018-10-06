const fs = require('fs-extra');
const path = require('path');
const git = require('simple-git/promise');
const inquirer = require('inquirer');
const ora = require('ora');

const { getProjectPath, getProjectConfig, log } = require('./util');

async function getProjectRepositoryPath(projectName) {
  const projectPath = await getProjectPath(projectName);
  return `${projectPath}/.vsc`;
}

async function gitCloneProject(projectName) {
  const dir = await getProjectRepositoryPath(projectName);

  await fs.ensureDir(dir);

  const { url } = await getProjectConfig(projectName);

  try {
    await git().clone(dir, [url]);
  } catch (e) {
    await log(e);
    throw new Error(
      `Repository is unreachable. Are you sure that you have permissions?`
    );
  }
}

class ProjectFactory {
  constructor(projectName) {
    this.projectName = projectName;
    this.files = [];
  }

  get readme() {
    return this.config.readme;
  }

  get entities() {
    return this.config.entities;
  }

  get dir() {
    return path.resolve(this.vsc, '..');
  }

  async open() {
    this.vsc = await getProjectRepositoryPath(this.projectName);

    if (!await fs.pathExists(this.vsc)) {
      throw new Error(
        `VSC root folder didn't found. Try to re-init the project!`
      );
    }

    this.config = await getProjectConfig(this.projectName);
    this.repo = git(this.vsc).silent(true);
  }

  async reset() {
    await this.repo.fetch();
    await this.repo.reset('hard');
  }

  async add(file) {
    this.files.push(file);
  }

  async diff() {
    const { created, deleted, modified, renamed } = await this.repo.status();
    return {
      created,
      deleted,
      modified,
      renamed,
    };
  }

  async update(autoCommit = false) {
    let message = 'Updated by Gbck';

    if (!autoCommit) {
      const answer = await inquirer.prompt([
        {
          type: 'input',
          name: 'message',
          message: `Commit message for project "${this.projectName}"?`,
          default: 'Updated by Gbck',
        },
      ]);
      message = answer.message;
    }

    const spinner = ora(`Updating project "${this.projectName}"`).start();

    try {
      await this.repo.commit(message);
      await this.repo.push('origin', 'master', ['-f']);
      spinner.succeed(
        `Project "${this.projectName}" has been successfully updated.`
      );
    } catch (e) {
      spinner.stop();
      await log(e);
      throw new Error(
        'Error occurs when updating your repository. Please create an issue. :('
      );
    }
  }

  async isUpToDate() {
    let currentFiles;

    try {
      currentFiles = await this.repo.raw([
        'ls-tree',
        '--name-only',
        '-r',
        'HEAD',
      ]);
    } catch (e) {
      // if there is error in processing the last command, most likely it's a fresh repo, so we don't have any file yet
      currentFiles = '';
    }

    currentFiles = currentFiles.split('\n').filter(ab => ab);

    const removedFiles = currentFiles
      .filter(currFile => !this.files.includes(currFile))
      .map(currFile => path.resolve(this.vsc, currFile))
      .filter(currFile => !fs.lstatSync(currFile).isDirectory());

    if (removedFiles.length) {
      await this.repo.rm(removedFiles);
    }

    if (this.files.length) {
      await this.repo.add(this.files);
    }

    const diff = await this.diff();

    return Object.values(diff).reduce((a, v) => a.concat(v), []).length === 0;
  }

  async getLastChange() {
    const date = await this.repo.raw([
      'log',
      '-1',
      '--format=%cd',
      '--date=relative',
    ]);

    return date.replace('\n', '');
  }

  async getLastChangeRow() {
    const date = await this.repo.raw(['log', '-1', "--format=format:'%ci'"]);
    return new Date(date);
  }
}

module.exports = {
  gitCloneProject,
  getProjectRepositoryPath,
  ProjectFactory,
};

const fs = require('fs-extra');
const path = require('path');
const untildify = require('untildify');
const util = require('util');
const recursive = require('recursive-readdir');
const exec = util.promisify(require('child_process').exec);
const Listr = require('listr');
const chalk = require('chalk');
const minimatch = require('minimatch');

const { printError, getAvailableProjects } = require('../util');
const { ProjectFactory } = require('../git');

function printChangesInFiles(changes) {
  console.log(`\nChanges:\n`);
  const { created, deleted, modified, renamed } = changes;

  /**
   * Print styled messages
   */
  created.forEach(filePath => console.log(chalk.green(filePath)));
  deleted.forEach(filePath => console.log(chalk.red(filePath)));
  modified.forEach(filePath => console.log(chalk.yellow(filePath)));
  renamed.forEach(({ from, to }) =>
    console.log(chalk`{yellow ${from}} -> {yellow ${to}}`)
  );
}

async function copyFiles(project) {
  const entities = project.entities;
  const dir = project.dir;
  const vsc = project.vsc;

  const entitiesToSync = [...entities, project.readme];

  /**
   * Does user want to sync the config as well?
   */
  if (project.config.syncConfig) {
    entitiesToSync.push({
      i: `${dir}/config`,
      o: '.gbck/config',
    });
  }

  const syncEntities = entitiesToSync.map((entity, i) => {
    if (Array.isArray(entity)) {
      if (entity.length !== 2) {
        throw new Error(`Wrong syntax of entities at index ${i}!`);
      }

      const [name, command] = entity;

      return {
        title: `Sync "${name}" from command`,
        task: async () => {
          const { stdout, stderr } = await exec(command);

          if (stderr) {
            throw new Error(`Command "${name}" returned stderr`);
          }

          const targetPath = path.resolve(vsc, name);

          try {
            await fs.outputFile(targetPath, stdout);
          } catch (e) {
            throw new Error(`Error occurred in writing "${targetPath}"`);
          }

          project.add(name);
        },
      };
    }

    let entityObject = {
      i: null,
      o: null,
      options: {
        include: null,
        exclude: null,
        symlinks: true,
      },
    };

    if (typeof entity === 'string') {
      entityObject.i = entity;
    } else if (typeof entity === 'object') {
      entityObject = { ...entityObject, ...entity };
    } else {
      throw new Error('Unknown type of entity');
    }

    let file = untildify(entityObject.i);
    if (!path.isAbsolute(file)) {
      file = path.resolve(dir, file);
    }
    const name = entityObject.o || path.basename(file);

    return {
      title: `Sync "${file}"`,
      task: async () => {
        try {
          await fs.copy(file, path.resolve(vsc, name), { dereference: true });
          if (fs.lstatSync(file).isDirectory()) {
            recursive(file, (err, files) => {
              files.forEach(f => {
                if (
                  fs.lstatSync(f).isSymbolicLink() &&
                  !entityObject.options.symlinks
                ) {
                  return;
                }

                if (entityObject.options.include) {
                  const isFileIncluded = entityObject.options.include.some(
                    includeFile => minimatch(path.basename(f), includeFile)
                  );

                  if (!isFileIncluded) return;
                }

                if (entityObject.options.exclude) {
                  let excludeCurrFile;
                  const excludeFiles = [...entityObject.options.exclude];
                  while ((excludeCurrFile = excludeFiles.pop())) {
                    if (minimatch(path.basename(f), excludeCurrFile)) {
                      return;
                    }
                  }
                }

                project.add(f.replace(file, name));
              });
            });
          } else {
            project.add(name);
          }
        } catch (e) {
          throw new Error(`Error occurred with "${name}", entity index ${i}"`);
        }
      },
    };
  });

  return new Listr(syncEntities, { concurrent: true });
}

async function syncProject(projectName) {
  const project = new ProjectFactory(projectName);

  await project.open();

  return new Listr([
    {
      title: 'Prepare project to sync',
      task: async () => {
        try {
          await project.reset();
        } catch (e) {
          throw new Error(e);
        }
      },
    },
    {
      title: 'Synchronize the files',
      task: async (ctx, task) => {
        if (project.entities.length === 0) {
          task.skip(`You don't have any entities to synchronize`);
        }
        return copyFiles(project);
      },
    },
    {
      title: 'Check the project',
      enabled: () => project.entities.length,
      task: async (ctx, task) => {
        if (await project.isUpToDate()) {
          const lastChangeTime = await project.getLastChange();
          ctx.upToDate = true;
          task.skip(`Project is up to date. Updated: ${lastChangeTime}`);
        } else {
          ctx.upToDate = false;
          ctx.container[projectName] = project;
        }
      },
    },
  ]);
}

function runTask(projects, task, autoCommit) {
  task
    .run({
      container: {},
      upToDate: true,
    })
    .catch(err => {
      printError(err);
    })
    .then(async ctx => {
      if (!ctx) return;

      if (ctx.upToDate) return;

      const { container: projectContainer } = ctx;

      /**
       * Do we have any changes?
       */
      const hasChanges = diff =>
        Object.values(diff).reduce((a, b) => a.concat(b), []).length;

      /**
       * Print legend
       */
      console.log(
        '\n',
        chalk.green('added'),
        chalk.red('removed'),
        chalk.yellow('updated/renamed')
      );

      /**
       * Print legend for all project
       */
      for (const p of projects) {
        /**
         * If the project is without changes, skip it
         */
        const diff = await projectContainer[p].diff();

        if (!hasChanges(diff)) {
          return;
        }

        if (projects.length !== 1) console.log(chalk.bold(`\nProject "${p}"`));

        printChangesInFiles(diff);

        console.log('\n');

        try {
          await projectContainer[p].update(autoCommit);
        } catch (e) {
          printError(e);
        }
      }
    });
}

module.exports = async (projects, autoCommit = false) => {
  const availableProject = await getAvailableProjects();
  const projectsToRun = projects.filter(p => availableProject.includes(p));

  if (projects.length === 0) {
    printError(new Error("You don't have any project. Try to run `--init`."));
    return;
  }

  if (projectsToRun.length !== projects.length) {
    printError(
      projects.length === 1
        ? new Error("The project doesn't exist.")
        : new Error(
            "One or many of the required projects doesn't exist. It has been ignored."
          )
    );
  }

  let tasks;
  if (projectsToRun.length === 1) {
    try {
      tasks = await syncProject(projectsToRun);
    } catch (e) {
      printError(e);
      return;
    }
  } else {
    tasks = new Listr(
      projectsToRun.map(p => ({
        title: `Sync project ${p}`,
        task: () => syncProject(p),
      })),
      { concurrent: true }
    );
  }

  runTask(projectsToRun, tasks, autoCommit);
};

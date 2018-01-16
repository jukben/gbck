const chalk = require('chalk');
const ora = require('ora');

const { getAvailableProjects } = require('../util');
const { ProjectFactory } = require('../git');

async function list() {
  const spinner = ora('Loading').start();
  const projects = await getAvailableProjects();
  spinner.stop();

  const projectList = await Promise.all(
    projects.map(async p => {
      const project = new ProjectFactory(p);
      await project.open();
      const change = await project.getLastChange();
      const date = await project.getLastChangeRow();
      return {
        date,
        text: chalk`- {bold ${p}} [${change}]`,
      };
    })
  );

  projectList
    .sort((a, b) => b.date > a.date)
    .forEach(({ text }) => console.log(text));
}

module.exports = list;

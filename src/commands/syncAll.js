const { getAvailableProjects } = require('../util');

const syncProject = require('./syncProject');

module.exports = async autoCommit => {
  const availableProject = await getAvailableProjects();
  syncProject(availableProject, autoCommit);
};

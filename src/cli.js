const argv = require('minimist')(process.argv.slice(2));
const updateNotifier = require('update-notifier');
const pkg = require('../package.json');

const syncAll = require('./commands/syncAll');
const syncProject = require('./commands/syncProject');
const init = require('./commands/init');
const list = require('./commands/list');
const help = require('./commands/help');

/**
 * Notify user about a new version if there is any
 */
updateNotifier({ pkg }).notify();

const autoCommit = !!argv['auto-commit'];

if (argv.init || argv.i) {
  init(argv.force || argv.f);
} else if (argv.list || argv.l) {
  list();
} else if (argv.help || argv.h) {
  help();
} else if (argv.version || argv.v) {
  console.log(pkg.version);
} else if (argv._.length) {
  syncProject(argv._, autoCommit);
} else {
  syncAll(autoCommit);
}

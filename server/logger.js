/*
    logs things to the console
*/

// deps
const chalk = require("chalk");

function base(a, b) {
    console.log(`[${a}] ${b} (${new Date()})`);
}

function info(msg) {
    base(chalk.blue("INFO"), msg);
}

function error(msg) {
    base(chalk.red("ERROR"), msg);
}

function misc(msg) {
    base(chalk.green("MISC"), msg);
}

module.exports = {
    info,
    misc,
    error
}
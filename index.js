#!/usr/bin/env node

const chalk       = require('chalk')
const clear       = require('clear')
const figlet      = require('figlet')
const config      = require('./config')
const minimist    = require('minimist')

const createProcess = require('./packs/createProcess')

clear();

console.log(
  chalk.green(
    figlet.textSync(config.public.name, { horizontalLayout: 'full' })
  )
);

// console.log(chalk.yellow("\n> - - - - -\n"))
// console.log(chalk.yellow("configuration:"))
// console.log(chalk.yellow(JSON.stringify(config, null, 2)))
// console.log(chalk.yellow("\n> - - - - -\n"))


const run = async () => {
  try {

    //TODO: check if we are in a git repository - We cannot proceed then :-(
    //      or can we? 
    
    // if (files.directoryExists('.git')) {
    //   console.log(chalk.red('Already a git repository!'));
    //   process.exit();
    // }

    const args = minimist(process.argv.slice(2))
    // console.log(chalk.yellow("caught arguments are: " + args._))
    done = await createProcess.execute(args._[0], args._[1], args._[2])
    
    if(done) {
      console.log(chalk.green('All done!\n'));
    }

  } catch(err) {
    console.log(chalk.red('Error!'));
    console.log(err)
    console.log("\n")
  }
}

run();

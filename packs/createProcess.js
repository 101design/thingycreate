const CLI         = require('clui');
const Spinner     = CLI.Spinner;
const chalk       = require('chalk');
const inquirer    = require('inquirer');
const cfg         = require('../config')

const github = require("./githubHandler")
const githubRemoteHandler = require("./githubRemoteHandler")
const repositoryTreeHandler = require("./repositoryTreeHandler")
const thingy = require("./thingy")
const utl = require("./util")
const pathChecker = require("./creationPathChecker")

//Relevant Variables for this scope
const defaultToolsetRemote = githubRemoteHandler.createRemoteFromURL(cfg.public.defaultToolsetURL)
const defaultSourceRemote = githubRemoteHandler.createRemoteFromURL(cfg.public.defaultSourceURL)


const askThingyName = [
    {
        name: "thingyName",
        type: "input",
        message: "What is the name of the thingy?",
        validate: (value) => {
            if (value.length) {
                return true;
                } else {
                return 'Please enter a name for the thingy!';
                }   
        },
        when: function () {
            return !thingy.hasName()
        }
    }
]

const askThingyType = [
    {
        name: "thingyType",
        type: "list",
        message: "...creating what type of thingy?",
        choices: ["Website", "App", "Service", "Machine"],
        default: "Website",
        when: function () {
            return !thingy.hasType()
        }
    }
]

const askForToolset = [
    {
        type: 'confirm',
        name: 'useDefaultToolset',
        message: 'Use default toolset? (' + defaultToolsetRemote.getHTTPS() + ')',
        when: function() {
            return defaultToolsetRemote.isReachable()
        }
    },
    {
        type: 'input',
        name: 'toolsetRepo',
        message: "What should be the toolset repo?",
        validate: (value) => {
            if (value.length) {
                if(utl.isFullURL(value)) {
                    var providedRemote = githubRemoteHandler.createRemoteFromURL(value)
                    return providedRemote.checkReachability()
                } else {
                    return github.checkIfUserHasRepo(value)
                }                
            } else {
                return 'Please!';
            }   
        },
        when: function(answers) {
            return !answers.useDefaultToolset;
        }
    }
]

const askForSource = [
    {
        type: 'confirm',
        name: 'copyDefaultSource',
        message: 'Copy from the default sources repository? (' + defaultSourceRemote.getHTTPS() + ')',
        when: function() {
            return defaultSourceRemote.isReachable()
        }
    },
    {
        type: 'confirm',
        name: 'copySpecificSource',
        message: 'Copy from another sources repository?',
        when: function(answers) {
            return !answers.copyDefaultSource
        }
    },
    {
        type: 'confirm',
        name: 'useSpecificSource',
        message: 'Directly use a sources repository?',
        when: function(answers) {
            return (!answers.copyDefaultSource) && (!answers.copySpecificSource)
        }
    },
    {
        type: 'input',
        name: 'specificSource',
        message: "What should be the sources repository?",
        validate: (value, answers) => {
            if (value.length) {

                if(answers.copySpecificSource) {
                    if(utl.isFullURL(value)) {
                        var providedRemote = githubRemoteHandler.createRemoteFromURL(value)
                        return providedRemote.checkReachability()
                    } else {
                        return github.checkIfUserHasRepo(value)
                    }     
                }

                if(answers.useSpecificSource) {
                    if(utl.isFullURL(value)) {
                        var providedRemote = githubRemoteHandler.createRemoteFromURL(value)
                        return providedRemote.checkReachability()
                    } else {
                        return github.checkIfUserHasRepo(value)
                    }     
                }

                return true

              } else {
                return 'Please!';
              }   
        },
        when: function(answers) {
          return (!answers.copyDefaultSource) && (answers.useSpecificSource || answers.copySpecificSource);
        }
    }
]


const useArguments = (arg1, arg2) => {
    //arg1 = thingy type
    if(typeof arg1 == "string") {
        thingy.setType(arg1)
    }

    //arg2 = thingy name
    if(typeof arg2 == "string") {
        thingy.setName(arg2)
    }

}

const getToolsetRepo = async () => {
    await defaultToolsetRemote.checkReachability()
    var answer = await inquirer.prompt(askForToolset)
    repositoryTreeHandler.evaluateToolsetAnswer(answer)
}

const getSourceRepo = async () => {
    await defaultSourceRemote.checkReachability()
    var answer = await inquirer.prompt(askForSource)
    repositoryTreeHandler.evaluateSourceAnswer(answer)
}

const getAcceptableThingyName = async () => {
    var acceptable = false
    var answer = null
    while(!acceptable) {
        if(!thingy.hasName()) {
            answer = await inquirer.prompt(askThingyName)
            if(answer.thingyName)
                thingy.setName(answer.thingyName)
        }
        var status = new Spinner('Checking thingy name "' + thingy.getName() + '"...');
        try {
            status.start()
            var repoNames = thingy.getRepos()            
            await pathChecker.checkCreatability(repoNames)

            let promises = repoNames.map( 
                repo => github.assertUserHasNotThatRepo(repo)
                )
            await Promise.all(promises)
            
            console.log(chalk.green("All relevant repositories for " + thingy.getName() + " may be created :-)"))
            acceptable = true
        } catch(err) {
            console.log(chalk.red(err))
            console.log(chalk.red("Thingy name \"" + thingy.getName() + "\" is unacceptable!"))
            thingy.setName("")
        } finally {
            status.stop()
        }
    }

}

module.exports = {

    execute: async (arg1, arg2, path) => {

        useArguments(arg1, arg2)
        await pathChecker.checkPath(path)
        await github.buildConnection()

        var answer = await inquirer.prompt(askThingyType)
        if(typeof answer.thingyType == "string" && answer.thingyType)
            thingy.setType(answer.thingyType)
        
        await getAcceptableThingyName()
        thingy.createRepositoryTree()
        
        await getToolsetRepo()
        await getSourceRepo()
        
        const thingyPath = await repositoryTreeHandler.initializeRepositories(path)
        await thingy.prepare(thingyPath)
        
        // await repositoryTreeHandler.cleanGithub()
        return true
    }

};

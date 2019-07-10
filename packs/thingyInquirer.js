const inquirer = require("inquirer")

const utl = require("./util")
const github = require("./githubHandler")
const githubRemoteHandler = require("./githubRemoteHandler")

const createTypeQuestion = (allTypes) => {
    const allTypesFancy = allTypes.map(type => utl.capitaliseFirstLetter(type))
    return [
        {
            name: "thingyType",
            type: "list",
            message: "...creating what type of thingy?",
            choices: allTypesFancy,
            default: allTypesFancy[0]
        }
    ]

}

const createNameQuestion = () => {
    return [
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
            }
        }
    ]
}

const generateRepoOptions = (templateURL, defaultBehaviour, negotiableBehaviours) => {
    var options = []

    if(templateURL) {
        if(defaultBehaviour != "create")
            options.push(defaultBehaviour + " " + templateURL)
        
        if(negotiableBehaviours[0] && (negotiableBehaviours[0] != "create"))
            options.push(negotiableBehaviours[0] + " " + templateURL)
        if(negotiableBehaviours[1] && (negotiableBehaviours[1] != "create"))
            options.push(negotiableBehaviours[1] + " " + templateURL)
        if(negotiableBehaviours[2] && (negotiableBehaviours[2] != "create"))
            options.push(negotiableBehaviours[2] + " " + templateURL)
    }
 
    options.push(defaultBehaviour + " " + "new")

    
    if(negotiableBehaviours[0])
        options.push(negotiableBehaviours[0] + " " + "new")
    if(negotiableBehaviours[1])
        options.push(negotiableBehaviours[1] + " " + "new")
    if(negotiableBehaviours[2])
        options.push(negotiableBehaviours[2] + " " + "new")
    
    return options
}

const createRepositoryQuestion = (node) => {
    // console.log("\nShould ask about new node:")
    // console.log(JSON.stringify(node, null, 4))
    var options = generateRepoOptions(node.templateURL, node.defaultBehaviour, node.negotiableBehaviours)
    // console.log(options)
    if(options.length == 1) {
        node.answers = {
            option: options[0]
        }
        return []
    }

    return [
        {
            name: "option",
            type: "list",
            message: "'" + node.repo  + "' - repository...  How shall it be initialized?",
            choices: options,
            default: options[0]
        },
        {
            type: 'input',
            name: 'newRepo',
            message: "What repository to take?",
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
                if(answers.option.indexOf("create") == 0)
                    return false
                if(answers.option.indexOf("new") == (answers.option.length - 3))
                    return true
                return false
            }
        }
    ]
}

module.exports = {
    inquireThingyType: async (allTypes) => {
        var typeQuestion = createTypeQuestion(allTypes)
        var answer = await inquirer.prompt(typeQuestion)
        return answer.thingyType
    }, 
    inquireThingyName: async () => {
        var nameQuestion = createNameQuestion()
        var answer = await inquirer.prompt(nameQuestion)
        return answer.thingyName
    },
    inquireRepositoryTreatment: async (node) => {
        var repositoryQuestion = createRepositoryQuestion(node)
        var answers = await inquirer.prompt(repositoryQuestion)
        return answers
    } 

}
const c           = require("chalk")
const CLI         = require('clui');
const Spinner     = CLI.Spinner;

const remoteHandler = require("./githubRemoteHandler")
const repositoryTreeHandler = require("./repositoryTreeHandler")
const pathHandler = require("./pathHandler")
const thingyInquirer = require("./thingyInquirer")
const github = require("./githubHandler")
const utl = require("./util")


var allThingies = null
var allTypes = []
var type = ""
var typeIndex = -1
var name = ""

var typeSpecificRepos = null
var allRepos = null



const getPreparationScript = () => {
    if(typeof type == "string" && type) {
        const t = utl.capitaliseFirstLetter(type)
        return "prepareThingyFor" + t + ".pl"
    } else {
        throw new Error("Cannot greate preparation Script without type!")
    }
}


const setType = (newType) => {
    checkAndAssignType(newType)
    setCurrentThoughtRepos()
}

const setName = (newName) =>  {
    name = newName
    setCurrentThoughtRepos()
}

const checkAndAssignType = (newType) => {
    newType = newType.toLowerCase()
    
    typeIndex = -1

    allTypes.forEach( (e,i) => {
        if(e == newType)
            typeIndex = i
    })

    if(typeIndex < 0)
        throw Error("Unexpected Thingy Type: " + newType)
    
    type = allTypes[typeIndex]
}

const setCurrentThoughtRepos = () => {
    allRepos = reposForType()
    if(name) {
        allRepos.unshift(name)
        typeSpecificRepos = reposForType()
    } else {
        typeSpecificRepos = allRepos
    }

    // console.log("allRepos")
    // console.log(allRepos)
    // console.log("typeSpecificRepos")
    // console.log(typeSpecificRepos)

}

const extractAllPostfixes = (thingy) => {
    // console.log("extracting all Postfixes for: ")
    // console.log(JSON.stringify(thingy, null, 4))
    
    var result = []
    thingy.submodules.forEach(sub => result = result.concat(extractAllPostfixes(sub)))
    if(thingy.postfix)
        result.push(thingy.postfix)        
    return result
} 

const reposForType = () => {
    var thingy = allThingies[type]
    var allPostfixes = extractAllPostfixes(thingy)
    // console.log("allPostfixes:")
    // console.log(allPostfixes)

    var repos = allPostfixes.map(postfix => name + postfix)
    // console.log("corresponding repos:")
    // console.log(repos)
    return repos
}


const createChildPairings = (child) => {
    return {
        node: child,
        treeNode: repositoryTreeHandler.createRepositoryNode(child)
    }
}

var recurseInitChildren = (node, treeParent) => {
    // console.log("node: " + node.repo)
    var childPairings = node.submodules.map(createChildPairings)
    childPairings.forEach(pairing => treeParent.addSubrepository(pairing.treeNode))
    childPairings.forEach(pairing => recurseInitChildren(pairing.node, pairing.treeNode))
}


const retrieveAcceptableThingyName = async () => {
    var acceptable = false
    var newName = name

    while(!acceptable) {

        if(!newName) {
            newName = await thingyInquirer.inquireThingyName()
            setName(newName)
        }

        var status = new Spinner('Checking thingy name "' + newName + '"...');
        try {
            status.start()
            
            await pathHandler.checkCreatability(newName)
            await pathHandler.checkCreatability(newName + "-init")

            let promises = allRepos.map( 
                repo => github.assertUserHasNotThatRepo(repo)
                )
            await Promise.all(promises)
            

            console.log(c.green(" acceptable!"))
            console.log(c.green("All relevant repositories for " + newName + " may be created :-)"))
            acceptable = true
        } catch(err) {
            console.log(c.red(" unacceptable!"))
            console.log(c.red(err))
            newName = ""
        } finally {
            status.stop()
        }
    }

}

const retrieveRepositoryAnswers = async (node) => {
    var repoURL = node.templateURL
    var defaultRemote = null
    node.repo = name + node.postfix    
    // console.log("retrieveing Repository Answers for: " + node.repo)
    if(repoURL)
        defaultRemote = remoteHandler.createRemoteFromURL(repoURL)
    
    try {
        if(defaultRemote)
            await defaultRemote.checkReachability()
    } catch(err) {
        node.templateURL = ""
    }

     var answers = await thingyInquirer.inquireRepositoryTreatment(node)
     if(answers.option)
        node.answers = answers
    
    digestAnswerForNode(node)

    //BFS recursion
    for(var i = 0; i < node.submodules.length; i++) {
        await retrieveRepositoryAnswers(node.submodules[i])
    }

}

const digestAnswerForNode = (node) => {
    const answers = node.answers
    const tokens = answers.option.split(" ")
    var sourceRemote = null
    var initialized = false
    if(tokens[0] == "create")
        return

    if (tokens[1] == "new") {
        if(utl.isFullURL(answers.newRepo)) {
            sourceRemote = remoteHandler.createRemoteFromURL(answers.newRepo)
        } else {
            sourceRemote = remoteHandler.createOwnRemote(answers.newRepo)
        }
    } else {
        sourceRemote = remoteHandler.createRemoteFromURL(tokens[1])
    }
    if(tokens[0] == "use")
        initialized = true

    node.sourceRemote = sourceRemote
    node.initialized = initialized
}



module.exports = {
    digestConfig: (thingies) => {
        allThingies = thingies
        // console.log(JSON.stringify(thingies, null, 4))
        allTypes = Object.keys(thingies)
        // console.log(allTypes)
    },
    setType: setType,
    setName: setName,
    getType: () => {
        return type
    },
    getName: () => {
        return name
    },
    hasName: () => {
        return ((typeof name == "string") && name )
    },
    getRepos: () => {
        return allRepos
    },
    doUserInquiry: async () => {

        if(!type) {
            var inquiredType = await thingyInquirer.inquireThingyType(allTypes)
            setType(inquiredType)
        }
        
        // console.log(c.yellow("type: " + type))
        // console.log(c.yellow("having name: " + name))
        // console.log(c.yellow("having allRepos"))
        // console.log(allRepos)
        
        await retrieveAcceptableThingyName()

        // console.log(c.yellow("now we have the name: " + name))
        // console.log(c.yellow("having allRepos"))
        // console.log(allRepos)
        await retrieveRepositoryAnswers(allThingies[type])
        // console.log(JSON.stringify(allThingies[type], null, 4))
        // throw "Death on purpose!"
                
        // await getToolsetRepo()
        // await getSourceRepo()

    },
    prepare: async() => {
        const scriptFileName = getPreparationScript()
        const scriptPath = pathHandler.getPreparationScriptPath(scriptFileName)         
        const options = {
            cwd: pathHandler.getToolsetPath()
        }

        // console.log(c.yellow("preparationScriptPath: " + scriptPath))
        // console.log(c.yellow("exec options: " + JSON.stringify(options, null, 2)))

        console.log(c.green("Running " + scriptPath))
        const output = await utl.execScriptPromise(scriptPath, options)
        console.log(c.green(output))
    },
    createRepositoryTree: () => {
        //TODO update this
        if(name) {
            var thingyRootNode = allThingies[type]
            repositoryTreeHandler.createRootRepository(thingyRootNode)
            var treeRootNode = repositoryTreeHandler.getRootRepository()
            recurseInitChildren(thingyRootNode, treeRootNode)
            // addTypeSpecificRepositories(rootNode)
        } else {
            throw new Error("Trying to create the RepositoryTree while we don't even have a thingy name...")
        }
            
    }

}
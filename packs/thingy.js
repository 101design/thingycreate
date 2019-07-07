const c = require("chalk")

const repositoryTreeHandler = require("./repositoryTreeHandler")
const pathHandler = require("./pathHandler")
const utl = require("./util")

// - - - - -  - - - - - -  - - - - --- - - - - - - - - - - - - - - - -  
// STATIC TYPE SPECIFIC STUFF
// - - - - -  - - - - - -  - - - - --- - - - - - - - - - - - - - - - -  

const allTypes = [
    "app",
    "website",
    "service",
    "machine"
]

const allAppRepoPostfixes = [
    "-sources",
    "-android-source",
    "-ios-source",
    "-output",
    "-testing"
]

const allWebsiteRepoPostfixes = [
    "-sources",
    "-output",
    "-testing"
]

const allServiceRepoPostfixes = [
    "-sources",
    "-output",
    "-testing"
]

const allMachineRepoPostfixes = [
    "-config"
]

// - - - - -  - - - - - -  - - - - --- - - - - - - - - - - - - - - - -  
// - - - - -  - - - - - -  - - - - --- - - - - - - - - - - - - - - - -  

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

const reposForType = () => {
    switch(type) {
        case "app":
            return allAppRepoPostfixes.map(postfix => name + postfix)
        case "website":
            return allWebsiteRepoPostfixes.map(postfix => name + postfix)
        case "service":
            return allServiceRepoPostfixes.map(postfix => name + postfix)
        case "machine":
            return allMachineRepoPostfixes.map(postfix => name + postfix)
        default:
            return []
    }
}

const setCurrentThoughtRepos = () => {
    allRepos = reposForType()
    if(name) {
        allRepos.unshift(name)
        typeSpecificRepos = reposForType()
    } else {
        typeSpecificRepos = allRepos
    }
}

const checkAndAssignType = (newType) => {
    newType = newType.toLowerCase()

    allTypes.forEach( (e,i) => {
        if(e == newType)
            typeIndex = i
    })

    if(typeIndex < 0)
        throw Error("Unexpected Thingy Type: " + newType)
    
    type = allTypes[typeIndex]
}

const getFirstLevelReposForType = () => {
    if(!typeSpecificRepos)
        throw Error("Trying to get First Level Repos while we don't even have the Type specific repos ready!")

    switch(type) {
        case "app":
            return typeSpecificRepos.slice(3) 
        case "website":
            return typeSpecificRepos.slice(1)
        case "service":
            return typeSpecificRepos.slice(1)
        case "machine":
            return []
        default:
            return []
    }
}

const getOutputRepos = () => {
    switch(type) {
        case "app":
            return typeSpecificRepos.slice(1,3)
        case "website":
            return []
        case "service":
            return []
        case "machine":
            return []
        default:
            return []
    }

}

const getNextLevelReposForRepo = (repo) => {
    if(typeof repo != "string" || !repo)
        return []
    //checking for output repo    
    var totalLength = repo.length
    var postfixLength = 7
    var expectedIndex = totalLength - postfixLength
    var index = repo.indexOf("-output")
    // console.log(c.yellow("repo is: " + repo))
    // console.log(c.yellow("expectedIndex is: " + expectedIndex))
    // console.log(c.yellow("index is: " + index))
    
    if(index == expectedIndex) {
        return getOutputRepos()
    }
    //Check for other repos with subrepos
    // currently we don't have any other ones :-)
    return []
} 

const addNextLevelReposForRepository = (repository) => {
    var repo = repository.getRepo()
    // console.log(c.yellow("retrieveing next Level Repos for repo: " + repo))
    var nextLevelRepos = getNextLevelReposForRepo(repo)

    var nextLevelRepositories = nextLevelRepos.map( repo => repositoryTreeHandler.createOwnRepository(repo))

    nextLevelRepositories.forEach(subRepository => repository.addSubrepository(subRepository))
    nextLevelRepositories.forEach(repository => addNextLevelReposForRepository(repository))
}


const addTypeSpecificRepositories = (rootNode) => {
    // console.log(c.yellow("addTypeSpecificRepositories"))
    const firstLevelRepos = getFirstLevelReposForType()
    // console.log(c.yellow("Response for first Level Repos was:"))
    // console.log(c.yellow(firstLevelRepos))

    const firstLevelRepositories = firstLevelRepos.map(repo => repositoryTreeHandler.createOwnRepository(repo))

    firstLevelRepositories.forEach(subRepository => rootNode.addSubrepository(subRepository))
    firstLevelRepositories.forEach(repository => addNextLevelReposForRepository(repository))

}


module.exports = {

    setType: (newType) => {
        checkAndAssignType(newType)
        setCurrentThoughtRepos()
    },
    getType: () => {
        return type
    },
    setName: (newName) =>  {
        name = newName
        setCurrentThoughtRepos()
    },
    getName: () => {
        return name
    },
    hasType: () => {
        return ((typeof type == "string") && type )
    },
    hasName: () => {
        return ((typeof name == "string") && name )
    },
    getTypeSpecificRepoNames: () => {
        return typeSpecificRepos
    },
    getRepos: () => {
        return allRepos
    },
    prepare: async() => {
        const scriptFileName = getPreparationScript()
        const scriptPath = pathHandler.getPreparationScriptPath(scriptFileName)         
        const options = {
            cwd: pathHandler.getToolsetPath()
        }

        console.log(c.yellow("preparationScriptPath: " + scriptPath))
        console.log(c.yellow("exec options: " + JSON.stringify(options, null, 2)))
        


        const output = await utl.execScriptPromise(scriptPath, options)
        console.log(c.green(output))
    },
    createRepositoryTree: () => {
        if(name) {
            repositoryTreeHandler.createRootRepository(name, typeSpecificRepos[0])
            var rootNode = repositoryTreeHandler.getRootRepository()
            addTypeSpecificRepositories(rootNode)
        } else {
            throw new Error("Trying to create the RepositoryTree while we don't even have a thingy name...")
        }
            
    }

}
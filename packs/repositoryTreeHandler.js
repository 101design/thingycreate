const CLI         = require('clui');
const Spinner     = CLI.Spinner;
const c           = require("chalk")
const git = require("simple-git/promise")
const fs = require("fs-extra")

const githubRemoteHandler = require("./githubRemoteHandler")
const github = require("./githubHandler")
const pathHandler = require("./pathHandler")
const cfg = require("../config")
const utl = require("./util")


var treeRoot = null
var sourcesRepoName = ""

var createdRepos = []

class RepositoryNode {
    constructor(constructorObject) {
        Object.assign(this, constructorObject)
        
        if(!this.remote) {
            if(this.owner &&  this.repo)
                this.remote = githubRemoteHandler.createRemote(this.owner, this.repo)
        } else if(!this.repo || !this.owner) {
            this.repo = this.remote.getRepo()
            this.owner = this.remote.getOwner()
        }

        if(this.sourceRemote) {        
            
            this.toBeCopied = true
            this.initialized = false
            this.repositoryType = "NewCopiedRepository"

        } else if(this.initialized) {
            
            this.repositoryType = "UsedRepository"

        } else {

            this.initialized = false
            this.repositoryType = "NewRepository"

        }
        
        if((!this.remote) && (!this.repo || !this.owner)) {
            this.repositoryType = "NoRepository"
        }

        if(!this.name)
            this.name = this.repo

        if(!this.name)
            throw new Error("Bug!! There is no name for the directory of the repository!")

        this.submodules = []
        // console.log(c.green("\nAfter Constructor Ran:"))
        // console.log(c.yellow(JSON.stringify(this, null, 2)))
    }

    getRemote() {
        return this.remote
    }

    getRepo() {
        return this.repo
    }

    getName() {
        return this.name
    }

    addSubrepository(node) {
        // console.log(" -   - - - - - -  - - -")
        // console.log("at " + this.repo)
        // console.log(" adding submodule: " + node.getRepo())
        this.submodules.push(node)
    }

    printToConsole(prefix) {
        console.log(prefix + this.repo)
        this.submodules.forEach(node => node.printToConsole(prefix + "  "))
    }

    getReposToCreate() {
        var repos = []
        
        this.submodules.forEach(node => {
            var subRepos = node.getReposToCreate()
            subRepos.forEach(subRepo => repos.push(subRepo))
        })

        if(!this.initialized)
            repos.push(this.repo)
   
        return repos
    }

    async initialize() {

        if(this.initialized)
            return

        if(this.isRoot) {
            await pathHandler.createInitializationBase(this.name)
        }

        for (var i = 0; i < this.submodules.length; i++) {
            await this.submodules[i].initialize()            
        }

        const base = pathHandler.getBasePath()
        const gitPaths = pathHandler.getGitPaths(this.name)
        const gitDir = gitPaths.gitDir
        const repoDir = gitPaths.repoDir
        // console.log(c.yellow("Initializing " + this.name))
        // console.log(c.yellow("basePath " + base))
        // console.log(c.yellow("repoDir " + repoDir))
        // console.log(c.yellow("gitDir " + gitDir))

        if(this.toBeCopied) {            
            await git(base).clone(this.sourceRemote.getSSH(), this.name)
            await fs.remove(gitDir)
        } else {
            await fs.mkdirs(repoDir)
        }

        await git(repoDir).init()
        await git(repoDir).addRemote("origin", this.remote.getSSH())
        
        for (var i = 0; i < this.submodules.length; i++) {
            var remote = this.submodules[i].getRemote().getSSH()
            var name = this.submodules[i].getName()
            await git(repoDir).submoduleAdd(remote, name)            
        }

        const source = pathHandler.getLicenseSourcePaths() 
        const dest = pathHandler.getLicenseDestinationPaths(repoDir)
        // console.log(c.yellow("copying " + source.unlicensePath + " to " + dest.unlicensePath))
        // console.log(c.yellow("copying " + source.licensePath + " to " + dest.licensePath))
        await fs.copy(source.licensePath, dest.licensePath)
        await fs.copy(source.unlicensePath, dest.unlicensePath)

        await git(repoDir).add(".")
        result = await git(repoDir).commit("initial commit")
        // console.log(c.yellow(JSON.stringify(result, null, 2)))
        // throw "Death on purpose!"
        await git(repoDir).push("origin", "master")

        if(!this.isRoot) {
            await fs.remove(repoDir)
        } else {
            await pathHandler.cleanInitializationBase()
        }

    }
}

const printRepositoryTree = () => {
    console.log("\nRepository Tree:")
    treeRoot.printToConsole(">")
}

const createRepos = async (repos) => {
    var status = new Spinner("Creating all repositories...")
    try {
        status.start()
        promises = repos.map(
            repo => github.createRepository(repo)
        )
        await Promise.all(promises)
        createdRepos = createdRepos.concat(repos)

        console.log(c.green("created!"))
    } finally {
        status.stop()
    }
}

const deleteCreatedRepos = async () => {
    var status = new Spinner("Deleting all repositories...")
    try {
        status.start()
        promises = createdRepos.map(
            repo => github.deleteUserRepository(repo)
        )
        await Promise.all(promises)
        console.log(c.green("deleted!"))
    } finally {
        status.stop()
    }
}


module.exports = {

    createRootRepository: (rootNode) => {
        // console.log(JSON.stringify(rootNode, null, 4))
        const constructorObject = {
            repo: rootNode.repo,
            owner: github.user(),
            sourceRemote: rootNode.sourceRemote,
            isRoot: true
        }
        treeRoot = new  RepositoryNode(constructorObject)
        // sourcesRepoName = sourcesRepo
    },

    getRootRepository: () => {
        return treeRoot
    },

    createRepositoryNode: (node) => {
        const constructorObject = {
            name: node.name,
            repo: node.repo
        }
        if(node.initialized) {
            constructorObject.remote = node.sourceRemote
            constructorObject.initialized = true
        } else {
            constructorObject.owner = github.user()
            constructorObject.sourceRemote = node.sourceRemote

        }
        
        return new RepositoryNode(constructorObject)
    },

    initializeRepositories: async () => {
        // printRepositoryTree()
        var status = new Spinner("Initializing all repositories...")
        try {
            status.start()
            const reposToCreate = treeRoot.getReposToCreate()
            // console.log(reposToCreate)
            await createRepos(reposToCreate)
            await treeRoot.initialize()
            console.log(c.green("initialized!"))
        } finally {
            status.stop()
        }
        
    },

    cleanGithub: async () => {
            await deleteCreatedRepos()
    }
}
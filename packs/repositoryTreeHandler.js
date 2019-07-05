const CLI         = require('clui');
const Spinner     = CLI.Spinner;
const c           = require("chalk")
const git = require("simple-git/promise")
const fs = require("fs-extra")

const githubRemoteHandler = require("./githubRemoteHandler")
const github = require("./githubHandler")
const cfg = require("../config")
const utl = require("./util")

const baseTemplateRemote = githubRemoteHandler.createRemoteFromURL(cfg.public.baseTemplateURL)
const defaultToolsetRemote = githubRemoteHandler.createRemoteFromURL(cfg.public.defaultToolsetURL)
const defaultSourceRemote = githubRemoteHandler.createRemoteFromURL(cfg.public.defaultSourceURL)

var rootNode = null
var sourcesRepoName = ""

var createdRepos = []

class RepositoryNode {
    constructor(constructorObject) {
        Object.assign(this, constructorObject)
        
        if(!this.name)
            this.name = this.repo

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

    async initialize(path) {

        if(this.initialized)
            return

        for (var i = 0; i < this.submodules.length; i++) {
            await this.submodules[i].initialize(path)            
        }

        // console.log(c.yellow("Initializing " + this.name))

        var result = ""
        var repoDir = path + "/" + this.name
        var gitDir = repoDir + "/.git"

        if(this.toBeCopied) {            
            await git(path).clone(this.sourceRemote.getSSH(), this.name)
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

        var licensePath = __dirname + "/../UNLICENSE"
        var destination = repoDir + "/UNLICENSE"
        await fs.copy(licensePath, destination)

        await git(repoDir).add(".")
        result = await git(repoDir).commit("initial commit")
        // console.log(c.yellow(JSON.stringify(result, null, 2)))
        // throw "Death on purpose!"
        await git(repoDir).push("origin", "master")

        if(!this.isRoot)
            await fs.remove(repoDir)

        return repoDir
    }
}

const printRepositoryTree = () => {
    console.log("\nRepository Tree:")
    rootNode.printToConsole(">")
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

    createRootRepository: (repo, sourcesRepo) => {
        const constructorObject = {
            name: repo,
            repo: repo,
            owner: github.user(),
            sourceRemote: baseTemplateRemote,
            isRoot: true
        }
        rootNode = new  RepositoryNode(constructorObject)
        sourcesRepoName = sourcesRepo
    },

    getRootRepository: () => {
        return rootNode
    },

    evaluateToolsetAnswer: (answer) => {
        // console.log(answer)
        
        if(!rootNode) {
            throw new Error("Evaluating ToolsetAnswer but we have no rootRepository yet :-/")
        }

        var toolsetRemote = null

        if(answer.useDefaultToolset) {
            toolsetRemote = defaultToolsetRemote
        } else {
            if(utl.isFullURL(answer.toolsetRepo)) {
                toolsetRemote = githubRemoteHandler.createRemoteFromURL(answer.toolsetRepo)
            } else {
                toolsetRemote = githubRemoteHandler.createOwnRemote(answer.toolsetRepo)
            }
        }

        const constructorObject = {
            name: "toolset",
            initialized: true,
            remote: toolsetRemote
        }

        const repoNode = new RepositoryNode(constructorObject)
        rootNode.addSubrepository(repoNode)
     
    },

    evaluateSourceAnswer: (answer) => {
        // console.log(answer)

        if(!rootNode) {
            throw new Error("Evaluating ToolsetAnswer but we have no rootRepository yet :-/")
        }

        if((!answer.copyDefaultSource) && (!answer.useSpecificSource) && (!answer.copySpecificSource))
            return

        var repoNode = null

        var constructorObject = {
            name: "sources",
            owner: github.user(),
            repo: sourcesRepoName
        }

        if (answer.useSpecificSource) {
        
            if(utl.isFullURL(answer.specificSource)) {
                constructorObject.remote = githubRemoteHandler.createRemoteFromURL(answer.specificSource)
            } else {
                constructorObject.remote = githubRemoteHandler.createOwnRemote(answer.specificSource)
            }

            constructorObject.owner = constructorObject.remote.getOwner()
            constructorObject.repo = constructorObject.remote.getRepo()
            constructorObject.initialized = true

            repoNode = new RepositoryNode(constructorObject)
            rootNode.addSubrepository(repoNode)    
        
        } else if(answer.copyDefaultSource) {

            constructorObject.sourceRemote = defaultSourceRemote
            
            repoNode = new RepositoryNode(constructorObject)
            rootNode.addSubrepository(repoNode)            
        
        } else {

            if(utl.isFullURL(answer.specificSource)) {
                constructorObject.sourceRemote = githubRemoteHandler.createRemoteFromURL(answer.specificSource)
            } else {
                constructorObject.sourceRemote = githubRemoteHandler.createOwnRemote(answer.specificSource)
            }
            
            repoNode = new RepositoryNode(constructorObject)
            rootNode.addSubrepository(repoNode)            
        }
    
    },

    createOwnRepository: (repo) => {
        const constructorObject = {
            owner: github.user(),
            repo: repo
        }
        return new RepositoryNode(constructorObject)
    },

    initializeRepositories: async (path) => {
        // printRepositoryTree()
        var status = new Spinner("Initializing all repositories...")
        try {
            status.start()
            const reposToCreate = rootNode.getReposToCreate()
            // console.log(reposToCreate)
            await createRepos(reposToCreate)
            
            const thingyPath = await rootNode.initialize(path)
            console.log(c.green("initialized!"))
            return thingyPath
        } finally {
            status.stop()
        }
        
    },

    cleanGithub: async () => {
            await deleteCreatedRepos()
    }
}
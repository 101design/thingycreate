const inquirer    = require("inquirer")
const git         = require("simple-git") 
const c           = require('chalk');
const CLI         = require('clui');
const Spinner     = CLI.Spinner;
const fs          = require("fs").promises
const pathModule  = require("path")

const utl = require("./util")

const authQuestions = [ 
    {
        name: "username",
        type: "input",
        message: "Github username:",
        validate: (value) => {
            if (value.length) {
                return true;
                } else {
                return 'Please! The Github username!';
                }   
        }    
    },
    {
        name: "password",
        type: "password",
        message: "Github password:",
        validate: (value) => {
            if (value.length) {
                return true;
                } else {
                return 'Please! The Github password!';
                }   
        }    

    }
]

var currentBasePath = ""
var thingyPath = ""

const checkDirectoryExists = async (path) => {
    try{
        var stats = await fs.lstat(path)
        return stats.isDirectory()
    } catch (err) {
        // console.log(c.red(err.message))
        return false
    }
}

const checkDirectoryIsInGit = async (path) => {
    try{
        await utl.execGitCheckPromise(path)
        return true
    } catch (err) {
        // console.log(c.red(err.message))
        return false
    }

} 

module.exports = {
    tryUse: async (providedPath) => {
        
        if(providedPath) {
            if(pathModule.isAbsolute(providedPath)) {
                currentBasePath = providedPath
            } else {
                currentBasePath = pathModule.resolve(process.cwd(), providedPath)
            }
        } else {
            currentBasePath = process.cwd()
        }

        console.log(c.yellow("using path: " + currentBasePath))
        //check if path is in git repository
        
        //check if path exists
        var exists = await checkDirectoryExists(currentBasePath)
        // console.log(c.yellow("directory exists: " + exists))

        if(!exists) {
            throw new Error("Provided directory does not exist!")
        }

        var isInGit = await checkDirectoryIsInGit(currentBasePath)
        // console.log(c.yellow("Directory is in git: " + isInGit))
        if(isInGit) {
            throw new Error("Provided directory is already in a git subtree!")
        }

    },

    checkCreatability: async (directoryNames) => {
        // console.log(directoryNames)
        var paths = directoryNames.map(dir => pathModule.resolve(currentBasePath, dir))
        // console.log(paths)
        
        var promises = paths.map(path => checkDirectoryExists(path))
        var results = await Promise.all(promises)

        // console.log(results)

        results.forEach(exists => {
            if(exists)
                throw "At least one directory is not creatable for thingyname!"
        })

    },

    getBasePath: () => {
        return currentBasePath
    },
    
    getGitPaths: (name) => {
        var r = {}
        r.repoDir = pathModule.resolve(currentBasePath, name)
        r.gitDir = pathModule.resolve(r.repoDir, ".git")
        return r
    },  

    getLicenseSourcePaths: () => {
        var r =  {}
        r.licensePath = pathModule.resolve(__dirname, "../LICENSE")
        r.unlicensePath = pathModule.resolve(__dirname, "../UNLICENSE")
        return r
    },
    getLicenseDestinationPaths: (repoDir) => {
        var r =  {}
        r.licensePath = pathModule.resolve(repoDir, "LICENSE")
        r.unlicensePath = pathModule.resolve(repoDir, "UNLICENSE")
        return r
    },

    setThingyPath: (path) => {
        thingyPath = path
    },

    getThingyPath: () => {
        return thingyPath
    },

    getToolsetPath: ()  => {
        return pathModule.resolve(thingyPath, "toolset")
    },
    
    getPreparationScriptPath: (scriptFileName) => {
        return pathModule.resolve(thingyPath, "toolset", scriptFileName)
    }
 
} 
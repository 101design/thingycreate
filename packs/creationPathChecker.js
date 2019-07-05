const inquirer    = require("inquirer")
const git         = require("simple-git") 
const c           = require('chalk');
const CLI         = require('clui');
const Spinner     = CLI.Spinner;
const fs          = require("fs").promises

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
var currentPath = ""

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
    checkPath: async (path) => {
        
        if(path) {
            if(path.charAt(0) == "/") {
                currentPath = path
            } else {
                currentPath = process.cwd() + "/" + path
            }
        } else {
            currentPath = process.cwd()
        }

        // console.log(c.yellow("using path: " + currentPath))
        //check if path is in git repository
        
        //check if path exists
        var exists = await checkDirectoryExists(currentPath)
        // console.log(c.yellow("directory exists: " + exists))

        if(!exists) {
            throw new Error("Provided directory does not exist!")
        }

        var isInGit = await checkDirectoryIsInGit(currentPath)
        // console.log(c.yellow("Directory is in git: " + isInGit))
        if(isInGit) {
            throw new Error("Provided directory is already in a git subtree!")
        }

    },

    checkCreatability: async (directoryNames) => {
        // console.log(directoryNames)
        var paths = directoryNames.map(dir => currentPath + "/" + dir)
        // console.log(paths)
        
        var promises = paths.map(path => checkDirectoryExists(path))
        var results = await Promise.all(promises)

        // console.log(results)

        results.forEach(exists => {
            if(exists)
                throw "At least one directory is not creatable for thingyname!"
        })

    }
} 
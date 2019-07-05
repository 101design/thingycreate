const execFile  = require('child_process').execFile
const exec = require("child_process").exec

const isFullURL = (url) => {
    
    if(url.length < 20)
        return false
    
    const checker = url.substr(0,8)
    
    if(checker == "https://") {
        return true
    } else if (checker == "git@gith") {
        return true
    } else {
        return false
    }

}

const capitaliseFirstLetter = (string) => {
    return string.charAt(0).toUpperCase() + string.slice(1);
}

const execScriptPromise = (script, options) => {
    
    return new Promise((resolve, reject) => {
        
        execFile(script, options, (error, stdout, stderr) => {
            if (error) {
                reject(error)
            }
            if(stderr) {
                reject(new Error(stderr))
            }
            
            resolve(stdout)
        })
    })
}

const execGitCheckPromise = (path) => {
    const options = {
        cwd: path
    }
    
    return new Promise((resolve, reject) => {
        
        exec("git rev-parse --is-inside-work-tree", options, (error, stdout, stderr) => {
            if (error) {
                reject(error)
            }
            if(stderr) {
                reject(new Error(stderr))
            }
            
            resolve(stdout)
        })
    })
}

module.exports = {
    isFullURL,
    capitaliseFirstLetter,
    execScriptPromise,
    execGitCheckPromise
}


const github      = require("./githubHandler")
const CLI         = require('clui');
const Spinner     = CLI.Spinner;
const request     = require("request-promise")
const c           = require("chalk")


const minURLLength = 20
const githubSSHBase = "git@github.com"
const githubHTTPSBase = "https://github.com"


// //     const repoBase = 'github.com/'+ username +'/';
    
// //     const templateRepo = repoBase + "root-template"
// //     const templateRemote = `https://${username}:${password}@${templateRepo}`;

// //     const rootRepo = repoBase + thingyName
// //     const rootRemote = `https://${username}:${password}@${rootRepo}`;


const extractRepoDataFromURL = (url) => {
    const repo = {}

    if(typeof url != "string")
        throw new Error("URL to Extract Repo from not a string!")
    if(!url)
        throw new Error("URL to Extract Repo from was an empty String!")
    if(url.length < minURLLength)
        throw new Error("URL to Extract Repo was smaller than the minimum of " + minURLLength + " characters!")

    const endPoint = url.lastIndexOf(".")

    if(endPoint < 0)
        throw new Error("Unexpectd URL for github repository: " + url)
    const lastSlash = url.lastIndexOf("/")
    if(lastSlash < 0)
        throw new Error("Unexpectd URL for github repository: " + url)

    repo.repoName = url.substring(lastSlash + 1, endPoint)
    // console.log(c.green("found repoName: " + repo.repoName))
    
    const checker = url.substr(0,8)
    if(checker == "https://") {

        const secondLastSlash = url.lastIndexOf("/", lastSlash - 1)
        if (secondLastSlash < 8)
            throw new Error("Unexpectd URL for github repository: " + url)
        repo.owner = url.substring(secondLastSlash + 1, lastSlash)
        // console.log(c.green("found owner: " + repo.owner))

    } else if(checker == "git@gith") {

        const lastColon = url.lastIndexOf(":", lastSlash - 1)
        if (lastColon < 14)
            throw new Error("Unexpectd URL for github repository: " + url)
        repo.owner = url.substring(lastColon + 1, lastSlash)
        // console.log(c.green("found owner: " + repo.owner))

    } else {
        throw new Error("Unexpectd URL for github repository: " + url)
    }

    // console.log(c.yellow(JSON.stringify(repo, null, 2)))
    return repo
}

class githubRemoteObject {
    constructor(owner, repoName) {
            this.owner = owner
            this.repoName = repoName
            this.httpsURL = githubHTTPSBase + "/" + owner + "/" + repoName + ".git"
            this.sshURL = githubSSHBase + ":" + owner + "/" + repoName + ".git"
            this.reachability = false
            this.reachabilityChecked = false

            // console.log(c.yellow("created Github Remote Object for user: " + owner + " and repository name: " + repoName))
            // console.log(c.yellow("HTTPS URL is: " + this.httpsURL))
            // console.log(c.yellow("SSH URL is: " + this.sshURL))
    }

    async checkReachability() {

        const options = {
            method: 'HEAD',
            uri: this.httpsURL
        };

        const status = new Spinner("Checking if " + this.httpsURL + " is reachable...")
        
        try {
            status.start()
            await request(options)
            console.log(c.green("Reachable!"))
            this.reachability = true
            return true
        } catch(err) {
            console.log(c.red("Not Reachable!"))
            this.reachability = false
            return false
        } finally {
            status.stop()
            this.reachabilityChecked = true
        }
    
    }

    getOwner() {
        return this.owner
    }

    getRepo() {
        return this.repoName
    }

    getHTTPS() {
        return this.httpsURL
    }

    getSSH() {
        return this.sshURL
    }

    isReachable() {
        if(!this.reachabilityChecked)
            console.log(c.yellow("warning! reachability has not been checked yet!"))
    
        return this.reachability
    }

}


module.exports = {
    createOwnRemote: (repoName) => {
        return new githubRemoteObject(github.user(), repoName)

    },
    createRemoteFromURL: (url) => {
        const repo = extractRepoDataFromURL(url)
        return new githubRemoteObject(repo.owner, repo.repoName)
    },
    createRemote: (ownerOrURL, repoName) => {
        if(repoName) {
            return new githubRemoteObject(ownerOrURL, repoName)
        } else {
            const repo = extractRepoDataFromURL(ownerOrURL)
            return new githubRemoteObject(repo.owner, repo.repoName)    
        }
    },

}
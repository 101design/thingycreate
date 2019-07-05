const OctokitREST = require("@octokit/rest")
const inquirer = require("inquirer")
const chalk       = require('chalk');
const CLI         = require('clui');
const Spinner     = CLI.Spinner;

var octokit = null
var username = ""
var password = ""

const authQuestions = [ 
    {
        name: "username",
        type: "input",
        message: "Github username:",
        validate: (value) => {
            if (value.length) {
                return true;
                } else {
                return 'Please!';
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
                return 'Please!';
                }   
        }    

    }
    
]

const twoFactorAuthentification = [
    {
        name: "twoFactorAuthenticationCode",
        type: "input",
        message: "2fa Code:",
        validate: (value) => {
            if (value.length) {
                return true;
                } else {
                return 'Please!';
                }   
        }    
    }
]

const buildOctokit = async () => {    
    var authenticated = false
    
    while (!authenticated) {
        var answers = await inquirer.prompt(authQuestions)
        octokit = new OctokitREST({
            auth: {
                username: answers.username,
                password: answers.password,
                async on2fa () { 
                    status.stop()
                    var answer = await inquirer.prompt(twoFactorAuthentification)
                    status.start()
                    return answer.twoFactorAuthenticationCode
                } 
            },
            userAgent:"thingycreate v0.1.0",
            baseUrl: "https://api.github.com"
        })
        var status = new Spinner('Checking credentials...');
        try {
            status.start();
            var info = await octokit.users.getAuthenticated()
            console.log(chalk.green("Credentials Check succeeded!"))
            username = answers.username
            password = answers.password
            authenticated = true
        } catch (err) {
            console.log(chalk.red("Credentials Check failed!"))
        } finally {
            status.stop()
        }
    }
}

module.exports = {
    user: () => {
        return username
    },

    password: () => {
        return password
    },

    buildConnection: async () => {
        if (octokit == null)
            await buildOctokit()
    },

    assertUserHasNotThatRepo: async (repo) => {
        if (octokit == null)
            await buildOctokit()
        // console.log(chalk.yellow("checking repo: " + repo))
        
        try {
            await octokit.repos.get({owner:username, repo:repo})
            throw "Repository: " + repo + " did Exist for user:" + username + "!"
        } catch(err) {
            if(err.status == 404) {
                // console.log(chalk.green("repo " + repo + " did not exist!"))
                return
            }
            throw err
        }
    },

    checkIfUserHasRepo: async (repo) => {
        if(octokit == null)
            await buildOctokit()

        var status = new Spinner("Checking if repo exists (" + username + "/" + repo + ")...")
        try {
            status.start()
            await octokit.repos.get({owner:username, repo:repo})
            return true
        } catch(err) {
            return "Repository " + username + "/" + repo + " does not exist!"
        } finally {
            status.stop()
        }
    },

    createRepository: async (repo) => {
        if (octokit == null)
            await buildOctokit()
        
        result = await octokit.repos.createForAuthenticatedUser({name:repo, private:true})
        // console.log(result)
    },

    deleteUserRepository: async (repo) => {
        if (octokit == null)
            await buildOctokit()
        
        result = await octokit.repos.delete({owner:username,repo:repo})
        // console.log(result)
    },
}
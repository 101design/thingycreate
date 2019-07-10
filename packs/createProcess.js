const CLI         = require('clui');
const cfg         = require('../config')

const github = require("./githubHandler")
const repositoryTreeHandler = require("./repositoryTreeHandler")
const thingy = require("./thingy")
const pathHandler = require("./pathHandler")

const useArguments = (arg1, arg2) => {
    //arg1 = thingy type
    if(typeof arg1 == "string") {
        thingy.setType(arg1)
    }

    //arg2 = thingy name
    if(typeof arg2 == "string") {
        thingy.setName(arg2)
    }

}
module.exports = {

    execute: async (arg1, arg2, path) => {

        thingy.digestConfig(cfg.public.thingies)
        useArguments(arg1, arg2)
        await pathHandler.tryUse(path)
        // await pathHandler.checkForToolsetAndSources()
        await github.buildConnection()

        await thingy.doUserInquiry()

        thingy.createRepositoryTree()
        
        await repositoryTreeHandler.initializeRepositories()
        await thingy.prepare()
        // await repositoryTreeHandler.cleanGithub()
        return true
    }

};

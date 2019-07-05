const config = {}

config.secret = {}
config.public = {}

try {
    const publicConfig = require("./publicConfig.json")
    Object.assign(config.public, publicConfig)
} catch(err) {
    console.error(err.message)
}

try {
    const secretConfig = require("./secretConfig.json")
    Object.assign(config.secret, secretConfig)    
} catch (err) {
    // console.error(err.message)
}

module.exports = config


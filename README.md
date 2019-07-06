# thingycreaty - commandline wizard to create a thingy (App, Website, Service, Machine)

Requirements
------------
* [GitHub account](https://github.com/)
* [Git installed](https://git-scm.com/)
* [Node.js installed](https://nodejs.org/)
* [Perl installed](https://www.perl.org)

Installation
------------

Current git version
``` sh
$ npm install -g git+https://github.com/JhonnyJason/thingycreate.git
```
Npm Registry
``` sh
$ npm install -g thingycreate
```


Usage
-----

*! There is a issue with path management for Windows, so it won't work on a machine using Windows style paths (sorry, I did not care about that yet)*

First make sure you have your [ssh access-key for github](https://help.github.com/en/articles/connecting-to-github-with-ssh) usable in your shell. I personally add it using the [ssh-agent](https://www.ssh.com/ssh/agent) right before I call the wizard.

``` sh
$ thingycreate <thingyType> <thingyName> <basePath>
```
All parameters are optional, but currently not interchangable.

That means, if you want to provide a `basePath`, you also need to provide both the `thingyType` and the `thingyName`.

Then the wizard will ask you for what he needs to know ;-)

Example
-----
``` sh
$ thingycreate website my-new-website /home/imthauser/thingies
  _     _       _                                                        _          
 | |_  | |__   (_)  _ __     __ _   _   _    ___   _ __    ___    __ _  | |_    ___ 
 | __| | '_ \  | | | '_ \   / _` | | | | |  / __| | '__|  / _ \  / _` | | __|  / _ \
 | |_  | | | | | | | | | | | (_| | | |_| | | (__  | |    |  __/ | (_| | | |_  |  __/
  \__| |_| |_| |_| |_| |_|  \__, |  \__, |  \___| |_|     \___|  \__,_|  \__|  \___|
                            |___/   |___/                                           
? Github username: JhonnyJason
? Github password: [hidden]
  ◟ Checking credentials...Credentials Check succeeded!
  ◞ Checking thingy name "asdf"...All relevant repositories for asdf may be created :-)
  ◝ Checking if https://github.com/JhonnyJason/toolset.git is reachable...Reachable!
? Use default toolset? (https://github.com/JhonnyJason/toolset.git) Yes
  ◜ Checking if https://github.com/JhonnyJason/sample-source.git is reachable...Reachable!
? Copy from the default sources repository? (https://github.com/JhonnyJason/sample-source.g
it) Yes
  ◡ Creating all repositories...created!
  ◝ Initializing all repositories...initialized!
All done!

```
Current Functionality
---------------------

- parameter `thingyName`: the name of the base repository
- parameter `thingyType`: (Website, App, Service, Machine) - determines structure of thingy
- parameter 'basePath': the path where all repositories are created. Result on success will be one repository with it's submodules, all set up with their remote on github. At `basePath`/`thingyName`. `basePath` can be relative or absolute. If omitted then cwd will be the `basePath`.
- Github Login (Will ask for your username and password, also handles 2fa) - really use username not the email-address!
- Preemptivly checks if the necessary repositories or directories may be created in their respective locations.
- Toolset Usage: The most important part of a thingy is it's toolset. We can use any toolset as toolset. We should have the relevant peparationScripts ready (prepareThingyForWebsite.pl, prepareThingyForApp.pl, prepareThingyForService.pl, prepareThingyForMachine.pl)
- Source Usage: The source-code of the particular thingy the other more important part for our thingy. Here we can choose to copy from any of our own boilercode sources we might have ready for a particular thingy. Or we might even directly use another source without copying.

---

# The Guts of thingycreate
## Configuration
Defaults reside in 2 parts a `secretConfig.json` and a `publicConfig.json`. The default remote URL for the base template of the thingy, the default toolset and the default source to be copied from ar all to be defined in the `publicConfig.json`

## createProcess
Responsible for the base level creation process, the code speaks for itself (hopefully^^):
```javascript
    useArguments(arg1, arg2)
    await pathChecker.checkPath(path)
    await github.buildConnection()

    var answer = await inquirer.prompt(askThingyType)
    if(typeof answer.thingyType == "string" && answer.thingyType)
        thingy.setType(answer.thingyType)
    
    await getAcceptableThingyName()
    thingy.createRepositoryTree()
    
    await getToolsetRepo()
    await getSourceRepo()
    
    const thingyPath = await repositoryTreeHandler.initializeRepositories(path)
    await thingy.prepare(thingyPath)
```

## creationPathChecker
Responsible to check if the `basePath` exists and is not within a git Repository already. Also checks if the directories to be created for Repository initialization don't already exist in the `basePath`.

## githubHandler
Responsible to speak to github. uses `@oktocit/rest` package. Exposes some useful functions:
```javascript
{
    user: () => {...},
    
    password: () => {...},
    
    buildConnection: async () => {...},

    assertUserHasNotThatRepo: async (repo) => {...},

    checkIfUserHasRepo: async (repo) => {...},

    createRepository: async (repo) => {...},

    deleteUserRepository: async (repo) => {...},
}
```
## githubRemoteHandler
Produces `githubRemoteObject` from url or given owner,repo pair. The `githubRemoteObject` is the representation of a remote, may be asked for specific url representation and checked for reachability.

## repositoryTreeHandler
Holds a tree-style representation of the repositories with their subrepositories.
Also handles the information about if they shall be created, copied or just used.

Finally has the capability to recursivly create and initialize all the thingy.

## thingy
Responsible for all thingy-relevant information. E.g. the specific structure of the thingy and the valid type. When creating your own thingy, this is probably the right place to start;-)

Finally has the capability to call the relevant preparation script in the toolset. Or Fails throwing an Error, the relevant preparation script is not present.

# Further step
This Wizard will be furtherly generalized and extended, mainly to fit my own needs.
Ideas of what could come next:
- more convenient argument handling
- restructure thingy.js for nicer ways of using various different thingy type sets 
- use various non-github remotes
- create repositories on not-github systems

All sorts of inputs are welcome, thanks!

---

# License

## The Unlicense JhonnyJason style

- Information has no ownership.
- Information only has memory to reside in and relations to be meaningful.
- Information cannot be stolen. Only shared or destroyed.

And you whish it has been shared before it is destroyed.

The one claiming copyright or intellectual property either is really evil or probably has some insecurity issues which makes him blind to the fact that he also just connected information which was free available to him.

The value is not in him who "created" the information the value is what is being done with the information.
So the restriction and friction of the informations' usage is exclusively reducing value overall.

The only preceived "value" gained due to restriction is actually very similar to the concept of blackmail (power gradient, control and dependency).

The real problems to solve are all in the "reward/credit" system and not the information distribution. Too much value is wasted because of not solving the right problem.

I can only contribute in that way - none of the information is "mine" everything I "learned" I actually also copied.
I only connect things to have something I feel is missing and share what I consider useful. So please use it without any second thought and please also share whatever could be useful for others. 

I also could give credits to all my sources - instead I use the freedom and moment of creativity which lives therein to declare my opinion on the situation. 

*Unity through Intelligence.*

We cannot subordinate us to the suboptimal dynamic we are spawned in, just because power is actually driving all things around us.
In the end a distributed network of intelligence where all information is transparently shared in the way that everyone has direct access to what he needs right now is more powerful than any brute power lever.

The same for our programs as for us.

It also is peaceful, helpful, friendly - decent. How it should be, because it's the most optimal solution for us human beings to learn, to connect to develop and evolve - not being excluded, let hanging and destroy.

If we really manage to build an real AI which is far superior to us it will unify with this network of intelligence.
We never have to fear superior intelligence, because it's just the better engine connecting information to be most understandable/usable for the other part of the intelligence network.

The only thing to fear is a disconnected unit without a sufficient network of intelligence on its own, filled with fear, hate or hunger while being very powerful. That unit needs to learn and connect to develop and evolve then.

We can always just give information and hints :-) The unit needs to learn by and connect itself.

Have a nice day! :D
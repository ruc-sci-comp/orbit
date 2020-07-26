var auth = require('../auth')
var config = require('../config')
var github = require('../github')
var githubConfig = config.githubConfig

async function main() {
    console.log(githubConfig)
    var graphqlWithAuth = await auth.getGraphqlWithAuth(githubConfig.appID, githubConfig.installationID, githubConfig.privateKeyPath)
    console.log(graphqlWithAuth)
    var orgRepositories = await github.getRepos(graphqlWithAuth, 'ruc-sci-comp')
    for (repo of orgRepositories) {
        console.log(repo)
}

main()

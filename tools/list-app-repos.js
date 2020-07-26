var auth = require('../auth')
var config = require('../config')
var github = require('../github')
var githubConfig = config.githubConfig

async function main() {
    console.log(githubConfig)
    var token = await auth.getToken(githubConfig.appID, githubConfig.installationID, githubConfig.clientID, githubConfig.clientSecret, githubConfig.privateKeyPath)
    console.log(token)
    var orgRepositories = await github.getOrgRepos(token, 'ruc-sci-comp')
    for (repo of orgRepositories) {
        console.log(repo.ssh_url)
    }
}

main()

var auth = require('../auth')
var github = require('../github')


async function main() {
    var token = await auth.getToken(githubConfig.appID, githubConfig.installationID, githubConfig.clientID, githubConfig.clientSecret, githubConfig.privateKeyPath)
    var orgRepositories = await github.getOrgRepos(token, 'ruc-sci-comp')
    for (repo of orgRepositories) {
        console.log(repo)
    }
}

main()

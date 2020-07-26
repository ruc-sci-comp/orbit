var auth = require('../auth')
var github = require('../github')

auth.getToken(githubConfig.appID, githubConfig.installationID, githubConfig.clientID, githubConfig.clientSecret, githubConfig.privateKeyPath).then( (token) => {
    github.getOrgRepos(token, 'ruc-sci-comp').then( (orgRepositories) => {
        for (repo of orgRepositories) {
            console.log(repo)
        }
}
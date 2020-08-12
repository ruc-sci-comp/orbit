var fs = require('fs');

module.exports = {
    getProjectIdQuery: fs.readFileSync('github/queries/get_project_id.graphql', 'utf8'),
    getCardsQuery: fs.readFileSync('github/queries/get_cards.graphql', 'utf8'),
    getReposQuery: fs.readFileSync('github/queries/get_repos.graphql', 'utf8'),
    getReposForTeamQuery: fs.readFileSync('github/queries/get_repos_for_team.graphql', 'utf8'),
    getGradeIssuesForUserQuery: fs.readFileSync('github/queries/get_grade_issues_for_user.graphql', 'utf8')
}

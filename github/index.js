const { request } = require("@octokit/request");
var GitHub = require('github-api');

module.exports = 
{
    getHomeworkProject: async function(token, organization, assignmentProject) {
        var gh = new GitHub({
            token: token
         });
        org = gh.getOrganization(organization);
        var { data } = await org.listProjects();
        for (var project of data) {
            if (project.name == assignmentProject) {
                return project.id;
            }
        }
    },

    getAssignments: async function(token, projectID, assignmentType) {
        var gh = new GitHub({
            token: token
        });
        var project = gh.getProject(projectID);
        var { data } = await project.listProjectColumns()
        for (column of data) {
            if (column.name == assignmentType) {
                var { data } = await project.listColumnCards(column.id)
                var assignments = [];
                for (card of data) {
                    assignments.push(card.note);
                }
                return assignments;
            }
        }
    },

    getUserRepos: async function(token, organization, user) {
        var gh = new GitHub({
            token: token
        });
        org = gh.getOrganization(organization);
        const { data } = await org.getRepos();
        userRepositories = [];
        for (var repo of data) {
            if (repo.name.endsWith(user)) {
                userRepositories.push(repo.name);
            }
        }
        return userRepositories;
    }
}
const { request } = require("@octokit/request");

module.exports = 
{
    getHomeworkProject: async function(token, organization, assignmentProject) {
        const { data } = await request(`GET /orgs/${organization}/projects`, {
            headers: {
            authorization: `token ${token}`,
            accept: "application/vnd.github.inertia-preview+json",
            },
        });
        for (var project of data) {
            if (project.name == assignmentProject) {
                return project.id;
            }
        }
    },

    getAssignments: async function(token, projectID, assignmentType) {
        const { data } = await request(`GET /projects/${projectID}/columns`, {
            headers: {
            authorization: `token ${token}`,
            accept: "application/vnd.github.inertia-preview+json",
            },
        });
        for (var column of data) {
            if (column.name == assignmentType) {
                var cards = (await request(`GET /projects/columns/${column.id}/cards`, {
                    headers: {
                    authorization: `token ${token}`,
                    accept: "application/vnd.github.inertia-preview+json",
                    },
                })).data;
                var assignments = [];
                for (card of cards) {
                    assignments.push(card.note);
                }
                return assignments;
            }
        }
    },

    getUserRepos: async function(token, organization, user) {
        const { data } = await request(`GET /orgs/${organization}/repos`, {
            headers: {
            authorization: `token ${token}`,
            accept: "application/json",
            },
        });
        userRepositories = [];
        for (var repo of data) {
            if (repo.name.endsWith(user)) {
                userRepositories.push(repo.name);
            }
        }
        return userRepositories;
    }
}
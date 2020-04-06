const { request } = require("@octokit/request");
var GitHub = require('github-api');
const { Octokit } = require("@octokit/rest");

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
                userRepositories.push(repo);
            }
        }
        return userRepositories;
    },

    getGrades: async function(token, user, repositories, gradeIssueTitle) {
        var gh = new GitHub({
            token: token
        });
        grades = []
        for (repository of repositories) {
            issues = gh.getIssues(user, repository.name);
            const { data } = await issues.listIssues({
                state: 'all'
            });
            for (var issue of data) {
                if (issue.title == gradeIssueTitle) {
                    var [score, total] = issue.body.split('\n')[1].replace(/```/g, '').trim().split('/');
                    grades.push(new Grade(repository.name, parseFloat(score), parseFloat(total)));
                }
            }
        }
        return grades;
    },

    getReposWithTopics: async function(token, organization, topics) {
        const octokit = new Octokit({
            auth: token,
            userAgent: 'orbt v0.0.1',
            previews: ["mercy-preview"]
        });

        // TODO this code we want, but it does not work
        // https://github.com/octokit/rest.js/issues/1662
        // const { data } = await octokit.teams.listReposInOrg({
        //     org: organization,
        //     team_slug: 'Students',
        // });
        // repos = [];
        // for (var repo of data) {
        //     for (repoTopic of repo.topics) {
        //         if (topics.includes(repoTopic)) {
        //             repos.push(repo.name);
        //             break;
        //         }
        //     }
        // }

        const { data } = await octokit.repos.listForOrg({
            org: organization,
            headers: {
                accept: 'application/vnd.github.+json'
            },
        });
        repos = [];
        for (var repo of data) {
            // we only care about class repositories
            if (!repo.name.startsWith('cpp-class-')) {
                continue;
            }
            for (repoTopic of repo.topics) {
                if (topics.includes(repoTopic)) {
                    repos.push(new Repository(repo.name, repo.html_url));
                    break;
                }
            }
        }
        return repos;
    }
}

class Grade {
    constructor(a, s, t) {
        this.assignment = a;
        this.score = s;
        this.total = t;
    }

    toString() {
        return `Grade { assignment: '${this.assignment}', score: ${this.score}, total: ${this.total} }`
    }
}

class Repository {
    constructor(r, u) {
        this.name = r;
        this.html_url = u
    }

    toString() {
        return `\`${this.name}:\` ${this.html_url}`
    }
}

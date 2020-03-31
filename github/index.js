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
                userRepositories.push(repo);
            }
        }
        return userRepositories;
    },

    getRepoIssues: async function(token, user, repository, gradeIssueTitle) {
        var gh = new GitHub({
            token: token
        });
        issues = gh.getIssues(user, repository);
        const { data } = await issues.listIssues();
        for (var issue of data) {
            if (issue.title == gradeIssueTitle) {
                var [score, total] = issue.body.split('\n')[1].replace(/```/g, '').trim().split('/');
                return new Grade(repository, parseFloat(score), parseFloat(total));
            }
        }
    },

    getGrades: async function(token, user, repositories, gradeIssueTitle) {
        var gh = new GitHub({
            token: token
        });
        grades = []
        for (repository of repositories) {
            issues = gh.getIssues(user, repository.name);
            const { data } = await issues.listIssues();
            for (var issue of data) {
                if (issue.title == gradeIssueTitle) {
                    var [score, total] = issue.body.split('\n')[1].replace(/```/g, '').trim().split('/');
                    grades.push(new Grade(repository.name, parseFloat(score), parseFloat(total)));
                }
            }
        }
        return grades;
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

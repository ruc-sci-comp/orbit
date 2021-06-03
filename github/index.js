var config = require('../config')
var queries = require('./queries')
var githubConfig = config.githubConfig

module.exports =
{
    getProjectId: async function (graphqlWithAuth) {
        var query = queries.getProjectIdQuery
        args = {
            o: githubConfig.organization,
            p: githubConfig.course
        };
        const result = await graphqlWithAuth(query, args);
        if (result.organization.projects.nodes.length) {
            return result.organization.projects.nodes[0].id;
        }
    },

    getCards: async function (graphqlWithAuth, column) {
        var query = queries.getCardsQuery;
        var cards = []
        var columnCursor = null;
        var cardCursor = null;
        var hasNextColumnPage = false;
        var hasNextCardPage = false;
        do {
            do {
                args = {
                    o: githubConfig.organization,
                    p: githubConfig.course,
                    c1: columnCursor,
                    c2: cardCursor
                };
                const result = await graphqlWithAuth(query, args);
                const proj = result.organization.projects.nodes[0]
                const col = proj.columns.nodes.filter(c => c.name == column)[0]
                cards = [...cards, ...col.cards.nodes]
                if (hasNextCardPage = col.cards.pageInfo.hasNextPage) {
                    cardCursor = col.cards.pageInfo.endCursor;
                }
                else {
                    cardCursor = null;
                    if (hasNextColumnPage = proj.columns.pageInfo.hasNextPage) {
                        columnCursor = proj.columns.pageInfo.endCursor;
                    }
                    else {
                        columnCursor = null;
                    }
                }
            } while (hasNextCardPage);
        } while (hasNextColumnPage);
        return cards;
    },

    getRepos: async function (graphqlWithAuth) {
        repos = []
        var query = queries.getReposQuery;
        var cursor = null;
        var hasNextPage = false;
        do {
            args = {
                l: githubConfig.organization,
                c: cursor
            };
            const data = await graphqlWithAuth(query, args)
            for (repo of data.organization.repositories.nodes) {
                var topics = repo.repositoryTopics.nodes.map( topicObject => topicObject.topic.name )
                repos.push(new Repository(repo.name, repo.url, topics));
            }
            if (hasNextPage = data.organization.repositories.pageInfo.hasNextPage) {
                cursor = data.organization.repositories.pageInfo.endCursor
            }
        } while(hasNextPage)

        return [...new Set(repos)];
    },

    getReposForTeam: async function (graphqlWithAuth, team) {
        repos = []
        var query = queries.getReposForTeam;
        var cursor = null;
        var hasNextPage = false;
        do {
            args = {
                l: githubConfig.organization,
                ts: team,
                c: cursor
            };
            const {data} = await graphqlWithAuth(query, args)
            for (repo of data.organization.team.repositories.nodes) {
                var topics = repo.repositoryTopics.nodes.map( topicObject => topicObject.topic.name )
                repos.push(new Repository(repo.name, repo.url, topics));
            }
            if (hasNextPage =  data.organization.team.repositories.pageInfo.hasNextPage) {
                cursor =  data.organization.team.repositories.pageInfo.endCursor
            }
        } while(hasNextPage)

        return [...new Set(repos)];
    },

    getReposWithTopics: async function (graphqlWithAuth, searchTopics) {
        repos = []
        var query = queries.getReposQuery;
        var cursor = null;
        var hasNextPage = false;
        do {
            args = {
                l: githubConfig.organization,
                c: cursor
            };
            const data = await graphqlWithAuth(query, args)
            for (repo of data.organization.repositories.nodes) {
                var topics = repo.repositoryTopics.nodes.map( topicObject => topicObject.topic.name )
                let topicIntersection = topics.filter(x => searchTopics.includes(x));
                if (topicIntersection && topicIntersection.length) {
                    repos.push(new Repository(repo.name, repo.url, topics));
                }
            }
            if (hasNextPage = data.organization.repositories.pageInfo.hasNextPage) {
                cursor = data.organization.repositories.pageInfo.endCursor
            }
        } while(hasNextPage)

        return [...new Set(repos)];
    },

    getReposWithTopicsV2: async function (graphqlWithAuth, searchTopics) {
        repos = []
        for (topic of searchTopics) {
            var query = queries.getReposForTopicQuery;
            var cursor = null;
            var hasNextPage = false;
            do {
                args = {
                    q: `org:${githubConfig.organization} topic:${topic}`,
                    c: cursor
                };
                const data = await graphqlWithAuth(query, args)
                for (repo of data.search.nodes) {
                    var topics = repo.repositoryTopics.nodes.map( topicObject => topicObject.topic.name )
                    repos.push(new Repository(repo.name, repo.url, topics));
                }
                if (data.search.pageInfo.hasNextPage) {
                    cursor = data.search.pageInfo.endCursor
                }
            } while(hasNextPage)
        }
        return [...new Set(repos)];
    },

    getGradeIssuesForUser: async function (graphqlWithAuth, user, label) {
        var query = queries.getGradeIssuesForUserQuery;
        grades = []
        var cursor = null;
        var hasNextPage = false;
        do {
            args = {
                q: `org:${githubConfig.organization} ${user} in:name`,
                l: label,
                c: cursor
            };
            const result = await graphqlWithAuth(query, args)
            for (var repository of result.search.nodes) {
                if (!repository.issues.nodes.length) {
                    continue;
                }
                const issue = repository.issues.nodes[0]
                var [score, total] = issue.body.split('\n')[1].replace(/```/g, '').trim().split('/');
                grades.push(new Grade(repository.name, parseFloat(score), parseFloat(total)));
            }
            if (hasNextPage = result.search.pageInfo.hasNextPage) {
                cursor = result.search.pageInfo.endCursor
            }
        } while (hasNextPage);

        return grades;
    },

    getActionAnnotation: async function (restWithAuth, owner, repo) {
      var result = await restWithAuth.checks.listForRef({
          owner: owner,
          repo: repo,
          ref: 'master'
      })
      return result.data.check_runs[0].output.text;
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
    constructor(r, u, t) {
        this.name = r;
        this.url = u;
        this.topics = t;
    }

    toString() {
        return `\`${this.name}:\` ${this.url}`
    }
}

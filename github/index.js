var queries = require('./queries')

module.exports =
{
    getProjectId: async function (graphqlWithAuth, organization, project) {
        var query = queries.getProjectIdQuery
        args = {
            o: organization,
            p: project
        };
        const result = await graphqlWithAuth(query, args);
        if (result.organization.projects.nodes.length) {
            return result.organization.projects.nodes[0].id;
        }
    },

    getCards: async function (graphqlWithAuth, organization, project, column) {
        var query = queries.getCardsQuery;
        var cards = []
        var columnCursor = null;
        var cardCursor = null;
        var hasNextColumnPage = false;
        var hasNextCardPage = false;
        do {
            do {
                args = {
                    o: organization,
                    p: project,
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

    getRepos: async function (graphqlWithAuth, organization, topic=undefined) {
        repos = []
        var query = queries.getReposQuery;
        var cursor = null;
        var hasNextPage = false;
        do {
            args = {
                q: `org:${organization}`,
                c: cursor
            };
            if (topics !== undefined) {
                args.q += 
            }

            const result = await graphqlWithAuth(query, args)
            for (repo of result.search.nodes) {
                var topics = repo.repositoryTopics.nodes.map( topic => topic.name )
                repos.push(new Repository(repo.name, repo.url, topics));
            }
            if (hasNextPage = result.search.pageInfo.hasNextPage) {
                cursor = result.search.pageInfo.endCursor
            }
        } while(hasNextPage)

        return [...new Set(repos)];
    },

    getReposForTeam: async function (graphqlWithAuth, organization, team) {
        repos = []
        var query = queries.getReposQuery;
        var cursor = null;
        var hasNextPage = false;
        do {
            args = {
                l: organization,
                ts: team,
                c: cursor
            };
            const result = await graphqlWithAuth(query, args)
            for (repo of result.search.nodes) {
                var topics = repo.repositoryTopics.nodes.map( topic => topic.name )
                repos.push(new Repository(repo.name, repo.url, topics));
            }
            if (hasNextPage = result.search.pageInfo.hasNextPage) {
                cursor = result.search.pageInfo.endCursor
            }
        } while(hasNextPage)

        return [...new Set(repos)];
    },

    getReposWithTopics: async function (graphqlWithAuth, organization, searchTopics) {
        repos = []
        var query = queries.getReposQuery;
        var cursor = null;
        var hasNextPage = false;
        do {
            args = {
                q: `org:${organization}`,
                c: cursor
            };
            const result = await graphqlWithAuth(query, args)
            for (repo of result.search.nodes) {
                var topics = repo.repositoryTopics.nodes.map( topic => topic.name )
                let topicItersection = topics.filter(x => searchTopics.includes(x));
                if (topicItersection && topicItersection.length) {
                    repos.push(new Repository(repo.name, repo.url, topics));
                }
            }
            if (hasNextPage = result.search.pageInfo.hasNextPage) {
                cursor = result.search.pageInfo.endCursor
            }
        } while(hasNextPage)

        return [...new Set(repos)];
    },

    getGradeIssuesForUser: async function (graphqlWithAuth, organization, user, label) {
        var query = queries.getGradeIssuesForUserQuery;
        grades = []
        var cursor = null;
        var hasNextPage = false;
        do {
            args = {
                q: `org:${organization} ${user} in:name`,
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

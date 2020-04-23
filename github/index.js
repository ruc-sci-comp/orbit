module.exports =
{
    getProjectId: async function (graphqlWithAuth, organization, project) {
        var query = `query ($o: String!, $p: String!) {
            organization(login: $o) {
              projects(search: $p, first: 1) {
                nodes {
                  id
                }
              }
            }
          }`;
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
        var query = `query ($o: String!, $p: String!, $c1: String, $c2: String) {
            organization(login: $o) {
              projects(search: $p, first: 1) {
                nodes {
                  columns(first: 10, after: $c1) {
                    nodes {
                      name
                      cards(first: 10, after: $c2) {
                        nodes {
                          note
                        }
                        pageInfo {
                          hasNextPage
                          endCursor
                        }
                      }
                    }
                    pageInfo {
                      hasNextPage
                      endCursor
                    }
                  }
                }
              }
            }
          }`;
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

    getGradeIssuesForUser: async function (graphqlWithAuth, organization, user, label) {
        var query = `query ($q: String!, $l: String!, $c: String) {
            search(query: $q, type: REPOSITORY, first: 10, after: $c) {
              nodes {
                ... on Repository {
                  name
                  issues(filterBy: {labels: $l}, first: 1) {
                    nodes {
                      title
                      body
                    }
                  }
                }
              }
              pageInfo {
                endCursor
                hasNextPage
              }
            }
          }`;

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

    getReposWithTopics: async function (graphqlWithAuth, organization, topics) {
        repos = []
        for (topic of topics) {
            var query = `query ($q: String!, $c: String) {
                search(query: $q, type: REPOSITORY, first: 10, after: $c) {
                  nodes {
                    ... on Repository {
                      name
                      url
                    }
                  }
                  pageInfo {
                    hasNextPage
                    endCursor
                  }
                }
              }`;
            var cursor = null;
            var hasNextPage = false;
            do {
                args = {
                    q: `org:${organization} topic:${topic}`,
                    c: cursor
                };
                const result = await graphqlWithAuth(query, args)
                for (repo of result.search.nodes) {
                    repos.push(new Repository(repo.name, repo.url));
                }
                if (result.search.pageInfo.hasNextPage) {
                    cursor = result.search.pageInfo.endCursor
                }
            } while(hasNextPage)
        }
        return [...new Set(repos)];
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
        this.url = u
    }

    toString() {
        return `\`${this.name}:\` ${this.url}`
    }
}

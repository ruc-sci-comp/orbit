module.exports = 
{
    getProjectId: async function(graphqlWithAuth, organization, project) {
        var query = `query ($organization: String!, $project: String!) {
            organization(login: $organization) {
                projects(search: $project, first: 1) {
                    nodes {
                        id
                    }
                }
            }
        }`;
        args = {
            organization:organization,
            project:project
        };
        const result = await graphqlWithAuth(query, args);
        return result.organization.projects.nodes[0].id;
    },

    getCards: async function(graphqlWithAuth, organization, project, column) {
        var query = `query ($organization: String!, $project: String!) {
            organization(login: $organization) {
              projects(search: $project, first: 1) {
                nodes {
                  columns(first: 10) {
                    nodes {
                      name
                      cards(first: 10) {
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
        args = {
            organization:organization,
            project:project
        };
        const result = await graphqlWithAuth(query, args);
        return result.organization.projects.nodes[0].columns.nodes.filter(c => c.name == column)[0].cards.nodes;
    },

    getIssuesForUserWithLabel: async function(graphqlWithAuth, organization, user, label) {
        var query = `query ($q: String!, $l: String!) {
            search(query: $q, type: REPOSITORY, first: 10) {
              nodes {
                ... on Repository {
                  name
                  issues(filterBy: {labels: $l}, first:10) {
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
        args = {
            q: `org:${organization} ${user} in:name`,
            l: label
        };
        const result = await graphqlWithAuth(query, args)
        grades = []
        for (var repository of result.search.nodes) {
            if (!repository.issues.nodes.length) {
                continue;
            }
            const issue = repository.issues.nodes[0]
            var [score, total] = issue.body.split('\n')[1].replace(/```/g, '').trim().split('/');
            grades.push(new Grade(repository.name, parseFloat(score), parseFloat(total)));

        }
        return grades;
    },

    getReposWithTopics: async function(graphqlWithAuth, organization, topics) {
        repos = []
        for (topic of topics) {
            var query = `query ($q: String!) {
                search(query: $q, type: REPOSITORY, first: 10) {
                nodes {
                    ... on Repository {
                    name
                    url
                    }
                }
                }
            }`;
            args = {
                q: `org:${organization} topic:${topic}`,
            };
            const result = await graphqlWithAuth(query, args)
            for (repo of result.search.nodes) {
                repos.push(new Repository(repo.name, repo.url));
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
        this.url = u
    }

    toString() {
        return `\`${this.name}:\` ${this.url}`
    }
}

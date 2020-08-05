const fs = require('fs');

const { createAppAuth: createRestAppAuth } = require("@octokit/auth-app");
const { Octokit } = require("@octokit/rest");
const octokit = new Octokit();

const { createAppAuth: createGraphQLAppAuth } = require("@octokit/auth-app");
const { graphql } = require("@octokit/graphql");

module.exports = 
{
    getRestWithAuth: async function(applicationID, installationId, clientId, clientSecret, privateKeyFile) {
        var privateKey = fs.readFileSync(privateKeyFile, 'utf8');

        const auth = createRestAppAuth({
            id: applicationID,
            privateKey: privateKey,
            installationId: installationId,
            clientId: clientId,
            clientSecret: clientSecret,
        });
        const installationAuthentication = await auth({ type: "installation" });
        const octokit = new Octokit({
            auth: installationAuthentication.token,
            userAgent: 'orbit v0.0.1'
        });

        return octokit;
    },

    getGraphqlWithAuth: async function(applicationID, installationId, privateKeyFile) {
        var privateKey = fs.readFileSync(privateKeyFile, 'utf8');
        const auth = createGraphQLAppAuth({
            id: applicationID,
            privateKey: privateKey,
            installationId: installationId
        });
        const graphqlWithAuth = graphql.defaults({
            request: {
                hook: auth.hook
            }
        });
        return graphqlWithAuth;
    }
}

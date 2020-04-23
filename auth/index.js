const fs = require('fs');
const { createAppAuth } = require("@octokit/auth-app");
const { graphql } = require("@octokit/graphql");

module.exports = 
{
    getGraphqlWithAuth: async function(applicationID, installationId, privateKeyFile) {
        var privateKey = fs.readFileSync(privateKeyFile, 'utf8');
        const auth = createAppAuth({
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

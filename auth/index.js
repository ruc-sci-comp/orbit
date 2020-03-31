const fs = require('fs');
const { createAppAuth } = require("@octokit/auth-app");

module.exports = 
{
    getToken: async function(applicationID, installationId, clientId, clientSecret, privateKeyFile) {
        var privateKey = fs.readFileSync(privateKeyFile, 'utf8');

        const auth = createAppAuth({
            id: applicationID,
            privateKey: privateKey,
            installationId: installationId,
            clientId: clientId,
            clientSecret: clientSecret,
        });
        const installationAuthentication = await auth({ type: "installation" });
        return installationAuthentication.token;
    }
}
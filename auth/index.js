const fs = require('fs');
const { App } = require("@octokit/app");
const { request } = require("@octokit/request");


module.exports = 
{
    getToken: async function(applicationID, privateKeyFile) {
        var privateKey = fs.readFileSync(privateKeyFile, 'utf8');
        const app = new App({ id: applicationID, privateKey: privateKey });
        const jwt = app.getSignedJsonWebToken();
        const installation_data = (await request("GET /app/installations", {
            headers: {
            authorization: `Bearer ${jwt}`,
            accept: "application/vnd.github.machine-man-preview+json",
            },
        })).data[0];
        const access_tokens_url = installation_data.access_tokens_url.replace('https://api.github.com', '')
        const { data } = await request(`POST ${access_tokens_url}`, {
            headers: {
            authorization: `Bearer ${jwt}`,
            accept: "application/vnd.github.machine-man-preview+json",
            },
        });
        return data.token;
    },

    validateToken: async function(token) {
        return false;
    }
}
module.exports = 
{
    registerUser: async function(pool, name, discordID, githubUserName) {
        var res = await pool.query(`INSERT INTO students(name, discord_id, github_username) VALUES( '${name}', '${discordID}', '${githubUserName}');`);
        return res.rows[0];
    },

    getGitHubUserName: async function(pool, discordID) {
        var res = await pool.query(`SELECT github_username FROM students WHERE discord_id='${discordID}';`);
        return res.rows[0].github_username;
    }
}
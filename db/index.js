module.exports = 
{
    getGitHubUserName: async function(pool, discordID) {
        var res = await pool.query(`SELECT github_username FROM students WHERE discord_id='${discordID}';`);
        return res.rows[0].github_username;
    }
}
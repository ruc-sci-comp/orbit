module.exports = 
{
    registerUser: async function(pool, name, discordID, githubUserName) {
        var res = await pool.query(`INSERT INTO students(name, discord_id, github_username) VALUES( $1, $2, $3 );`, [name, discordID, githubUserName]);
        return res.rowCount;
    },

    getGitHubUserName: async function(pool, discordID) {
        var res = await pool.query(`SELECT github_username FROM students WHERE discord_id=$1;`, [discordID]);
        return res.rows[0].github_username;
    },

    countUser: async function(pool, discordID) {
        var res = await pool.query(`SELECT COUNT(*) FROM students WHERE discord_id=$1;`, [discordID]);
        return res.rows[0].count;
    },

    getGrades: async function(pool, discordID) {
        var res = await pool.query(`SELECT assignments.name, assignments.type, grades.points as score, assignments.points FROM grades
            INNER JOIN students ON students.id=student
            INNER JOIN assignments ON assignments.id=assignment
            WHERE students.discord_id = $1
            ORDER BY assignments.name;`, [discordID]
        );
        return res.rows;
    },

    getSpecificGrades: async function(pool, discordID, gradeNames) {
        var res = await pool.query(`SELECT assignments.name, assignments.type, grades.points as score, assignments.points FROM grades
            INNER JOIN students ON students.id=student
            INNER JOIN assignments ON assignments.id=assignment
            WHERE students.discord_id = $1 AND
                assignments.type = ANY($2)
            ORDER BY assignments.name;`, [discordID, gradeNames]
        );
        return res.rows;
    }

}
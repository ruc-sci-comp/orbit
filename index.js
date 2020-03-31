var Discord = require('discord.js');
var pg = require('pg');

var auth = require('./auth')
var config = require('./config')
var db = require('./db')
var github = require('./github')

var db_config = config.db_config
var discord_config = config.discord_config
var github_config = config.github_config

const div = '\`\`\`';

const pool = new pg.Pool({
    user: db_config.user,
    host: db_config.host,
    database: db_config.database,
    password: db_config.password,
    port: db_config.port,
});

var token = '';

const client = new Discord.Client();

client.on('ready', () => {
    console.log(`Logged in as ${client.user.tag}!`);
});

client.on('message', msg => {
    if (msg.content === 'ping') {
        msg.channel.send('pong');
    }
    if (msg.content.startsWith('!assignment')) {
        [_, ...assignmentType] = msg.content.split(' ');
        if (assignmentType.length == 0) {
            assignmentType = 'current'
        }
        else {
            assignmentType = assignmentType[0].trim().toLowerCase();
        }
        auth.getToken(github_config.app_id, github_config.private_key_path).then((new_token) => {
            token = new_token;
            github.getHomeworkProject(token, github_config.organization, github_config.assignmentProject).then((projectID) => {
                github.getAssignments(token, projectID, assignmentType).then((assignments) => {
                    for (assignment of assignments) {
                        msg.channel.send(assignment);
                    }
                })
            });
        })
    }

    if (msg.content.startsWith('!grade')) {
        auth.getToken(github_config.app_id, github_config.private_key_path).then((new_token) => {
            token = new_token;
            db.getGitHubUserName(pool, msg.author.id).then( (githubUserName) => {
                github.getUserRepos(token, github_config.organization, githubUserName).then( (userRepositories) => {
                    github.getGrades(token, github_config.organization, userRepositories, github_config.gradeIssueTitle).then( (grades) => {
                        score = 0.0;
                        total = 0.0;
                        reply = '```'
                        for (var grade of grades) {
                            reply += grade + '\n'
                            score += grade.score;
                            total += grade.total;
                        }
                        reply += `${div}${div}Course Grade: ${score}/${total} = ${100.0 * score/total}${div}`;
                        msg.author.send(reply);
                        msg.delete();
                    })
                })
            })
        })
    }
});

client.login(discord_config.token);

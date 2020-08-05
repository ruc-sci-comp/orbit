var Discord = require('discord.js');
var pg = require('pg');

var auth = require('./auth')
var config = require('./config')
var db = require('./db')
var github = require('./github')
var utilities = require('./utilities')

var dbConfig = config.dbConfig
var discordConfig = config.discordConfig
var githubConfig = config.githubConfig

const B = '\`\`\`';
const BB = B + B;

const pool = new pg.Pool({
    user: dbConfig.user,
    host: dbConfig.host,
    database: dbConfig.database,
    password: dbConfig.password,
    port: dbConfig.port,
});

var guild = undefined;

const client = new Discord.Client();

createChannel = async function(channels, name, type, parent=undefined) {
    for (var channel of channels.cache.values()) {
        if (channel.name == name && channel.type == type) {
            return channel.id;
        }
    }
    return (await guild.channels.create(name, {type: type, parent: parent})).id
}

prepareChannels = function(channels) {
    createChannel(channels, 'orbit', 'category').then( (orbitCategoryID) => {
        createChannel(channels, 'sandbox', 'text', orbitCategoryID);
        createChannel(channels, 'orbit-comms', 'text', orbitCategoryID);
    })

    for (course of githubConfig.courses) {
        createChannel(channels, course, 'category').then( (courseID) => {
            createChannel(channels, course + '-general', 'text', courseID);
            createChannel(channels, 'assignments', 'text', courseID);
            createChannel(channels, 'grades', 'text', courseID);
        });
    }
}

client.on('ready', () => {
    console.log(`Logged in as ${client.user.tag}!`);
    guild = client.guilds.cache.values().next().value;
    prepareChannels(guild.channels);
})

client.on('message', msg => {
    var send = undefined;

    if (msg.channel.type == "dm") {
        send = msg.author.send;
    }
    else {
        send = msg.channel.send;
    }


    if (msg.content === 'ping') {
        send('pong');
    }

    var [command, ...args] = msg.content.split(' ');
    command = command.trim()

    if (!['!assignments', '!grades', '!info'].includes(command)) {
        return;
    }

    var courseID = guild.channels.cache.get(msg.channel.id).parent.name;

    auth.getGraphqlWithAuth(githubConfig.appID, githubConfig.installationID, githubConfig.privateKeyPath).then( (graphqlWithAuth) => {
        if (msg.content.startsWith('!assignments') && msg.channel.name == 'assignments') {
            if (args.length == 0) {
                assignmentType = 'current'
            }
            else {
                assignmentType = assignmentType[0].trim().toLowerCase();
            }

            github.getCards(graphqlWithAuth, githubConfig.organization, courseID, assignmentType).then((cards) => {
                reply = '';
                for (card of cards) {
                    reply += card.note + '\n';
                }
                send(reply)
                    .then(_ => {})
                    .catch(console.error);
            })
        }
        if (msg.content.startsWith('!grades') && msg.channel.name == 'grades') {
            db.getGitHubUserName(pool, msg.author.id).then( (githubUserName) => {
                github.getGradeIssuesForUser(graphqlWithAuth, githubConfig.organization, githubUserName, 'grade').then( (grades) => {
                    score = 0.0;
                    total = 0.0;
                    reply = B;
                    for (var grade of grades) {
                        reply += grade + '\n';
                        score += grade.score;
                        total += grade.total;
                    }
                    reply += `${BB}Course Grade: ${score}/${total} = ${100.0 * score/total}${B}`;
                    msg.author.send(reply)
                        .then(_ => {msg.delete();})
                        .catch(console.error);
                })
            })
        }
        if (msg.content.startsWith('!info')) {
            if (args.length == 0) {
                send('I need more information! Provide some keywords and I will find some repositories that match!');
                return;
            }
            github.getReposWithTopics(graphqlWithAuth, githubConfig.organization, args)
                .then(information => {
                    reply = `The following repositories are tagged with \`${args.join('\`, or \`')}\`\n`
                    reply += information.join('\n')
                    send(reply)
                        .then(_ => {})
                        .catch(console.error);
            });
        }
    })
});

client.login(discordConfig.token);

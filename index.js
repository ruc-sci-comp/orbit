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

async function send_dm(msg, content) {
    return msg.author.send(content);
}

async function send_text(msg, content) {
    return msg.channel.send(content);
}

async function send_message(msg, content) {
    if (msg.channel.type == 'dm') {
        return send_dm(msg, content);
    }
    else {
        return send_text(msg, content);
    }
}

async function createChannel(channels, name, type, parent=undefined) {
    for (var channel of channels.cache.values()) {
        if (channel.name == name && channel.type == type) {
            return channel.id;
        }
    }
    return (await guild.channels.create(name, {type: type, parent: parent})).id
}

function prepareChannels(channels) {
    createChannel(channels, 'orbit', 'category').then( (orbitCategoryID) => {
        createChannel(channels, 'sandbox', 'text', orbitCategoryID);
        createChannel(channels, 'orbit-comms', 'text', orbitCategoryID);
    })

    createChannel(channels, githubConfig.course, 'category').then( (courseID) => {
        createChannel(channels, githubConfig.course + '-general', 'text', courseID);
        createChannel(channels, 'assignments', 'text', courseID);
        createChannel(channels, 'grades', 'text', courseID);
    });

}

client.on('ready', () => {
    console.log(`Logged in as ${client.user.tag}!`);
    guild = client.guilds.cache.values().next().value;
    prepareChannels(guild.channels);
})

client.on('message', async msg => {

    if (msg.content === 'ping') {
        send_message(msg, 'pong!');
        return;
    }

    var [command, ...args] = msg.content.split(' ');
    command = command.trim()

    if (!['!assignments', '!grades', '!info'].includes(command)) {
        return;
    }

    var graphqlWithAuth = await auth.getGraphqlWithAuth(githubConfig.appID, githubConfig.installationID, githubConfig.privateKeyPath);
    var restWithAuth = await auth.getRestWithAuth(githubConfig.appID, githubConfig.installationID, githubConfig.clientID, githubConfig.clientSecret, githubConfig.privateKeyPath);

    if (msg.content.startsWith('!assignments')) {
        if (args.length == 0) {
            assignmentType = 'current';
        }
        else {
            assignmentType = assignmentType[0].trim().toLowerCase();
            if (assignmentType == 'unreleased') {
                assignmentType = 'current';
            }
        }

        var cards = await github.getCards(graphqlWithAuth, githubConfig.organization, githubConfig.course, assignmentType)
            reply = '';
            for (card of cards) {
                reply += card.note + '\n';
            }
            send_dm(msg, reply)
                .then(_ => {})
                .catch(console.error);
    }
    if (msg.content.startsWith('!grades')) {
        var githubUserName = await db.getGitHubUserName(pool, msg.author.id);
        var cards = await github.getCards(graphqlWithAuth, githubConfig.organization, githubConfig.course, 'completed')
        score = 0.0;
        total = 0.0;
        reply = B;

        for (var card of cards) {
            var c = JSON.parse(card.note);
            var repo = c.name + '-' + githubUserName
            var raw_grade = await github.getActionAnnotation(restWithAuth, 'ruc-sci-comp', repo);
            console.log(raw_grade)
            var [score, total] = raw_grade.replace(/```/g, '').trim().split('/');
            reply += c.name + ': ' + raw_grade
            score += grade.score * githubConfig.gradeWeights[c.category];
            total += grade.total * githubConfig.gradeWeights[c.category];
        }

        if (total > 0) {
            reply += `${BB}Course Grade: ${score}/${total} = ${100.0 * score/total}${B}`;
            send_dm(msg, reply)
                .then(_ => {
                    if (msg.channel.type == 'text') {
                        msg.delete();
                    }
                })
                .catch(console.error);
        }
        else {
            send_dm(msg, "No assignments have been released for grading!")
        }
    }

    if (msg.content.startsWith('!info')) {
        if (args.length == 0) {
            send_message(msg, 'I need more information! Provide some keywords and I will find some repositories that match!');
            return;
        }
        var information = await github.getReposWithTopics(graphqlWithAuth, githubConfig.organization, args);
        reply = `The following repositories are tagged with \`${args.join('\`, or \`')}\`\n`
        reply += information.join('\n')
        send_message(msg, reply)
            .then(_ => {})
            .catch(console.error);
    }
});

client.login(discordConfig.token);

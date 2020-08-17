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

client.on('ready', () => {
    console.log(`Logged in as ${client.user.tag}!`);
    guild = client.guilds.cache.values().next().value;

    utilities.createChannel(guild, githubConfig.course, 'category').then( (textChannels) => {
        utilities.createChannel(guild, 'general', 'text', textChannels);
        utilities.createChannel(guild, 'assignments', 'text', textChannels);
    });

    utilities.createChannel(guild, githubConfig.course + ' Voice Channels', 'category').then( (voiceChannels) => {
        utilities.createChannel(guild, 'general-voice', 'voice', voiceChannels);
        utilities.createChannel(guild, 'virtual-classroom', 'voice', voiceChannels);
    });

    utilities.createChannel(guild, 'orbit', 'category').then( (orbitChannels) => {
        utilities.createChannel(guild, 'sandbox', 'text', orbitChannels);
        utilities.createChannel(guild, 'orbit-comms', 'text', orbitChannels);
    })
})

client.on('message', async msg => {

    if (msg.content === '!ping') {
        utilities.send_dm(msg, 'pong!');
        return;
    }

    var [command, ...args] = msg.content.split(' ');
    command = command.trim()

    if (!['!assignments', '!grades', '!info', '!register'].includes(command)) {
        return;
    }

    if (msg.channel.type == 'text' && ['!assignments', '!grades', '!info'].includes(command) && msg.channel.name != 'orbit-comms') {
        return;
    }

    var graphqlWithAuth = await auth.getGraphqlWithAuth(githubConfig.appID, githubConfig.installationID, githubConfig.privateKeyPath);
    var restWithAuth = await auth.getRestWithAuth(githubConfig.appID, githubConfig.installationID, githubConfig.clientID, githubConfig.clientSecret, githubConfig.privateKeyPath);

    if (command === '!assignments') {
        if (args.length == 0) {
            assignmentType = 'current';
        }
        else {
            assignmentType = assignmentType[0].trim().toLowerCase();
            if (assignmentType == 'unreleased') {
                assignmentType = 'current';
            }
        }

        var cards = await github.getCards(graphqlWithAuth, assignmentType)
        reply = '';
        for (card of cards) {
            reply += card.note + '\n';
        }
        utilities.send_dm(msg, reply)
            .then(_ => {})
            .catch(console.error);
    }
    if (command === '!grades') {
        var githubUserName = await db.getGitHubUserName(pool, msg.author.id);
        var cards = await github.getCards(graphqlWithAuth, 'completed')
        score = 0.0;
        total = 0.0;
        reply = B;

        for (var card of cards) {
            var c = JSON.parse(card.note);
            var repo = c.name + '-' + githubUserName
            try {
                var raw_grade = await github.getActionAnnotation(restWithAuth, repo);
            }
            catch (error) {
                var raw_grade = `Points 0/${c.points}`
            }
            var [grade_score, grade_total] = raw_grade.split(' ')[1].trim().split('/');
            reply += c.name + ': ' + grade_score.padStart(3, ' ') + '/' + grade_total.padStart(3, ' ') + '\n';
            if (c.points > 0) {
                score += grade_score * githubConfig.gradeWeights[c.category];
                total += grade_total * githubConfig.gradeWeights[c.category];
            }
        }

        if (total > 0) {
            reply += `${BB}Weighted Course Grade: ${score}/${total} = ${100.0 * score/total}${B}`;
            utilities.send_dm(msg, reply)
                .then(_ => {
                    if (msg.channel.type == 'text') {
                        msg.delete();
                    }
                })
                .catch(console.error);
        }
        else {
            utilities.send_dm(msg, "No assignments have been released for grading!")
        }
    }

    if (command === '!info') {
        if (args.length == 0) {
            utilities.send_message(msg, 'I need more information! Provide some keywords and I will find some repositories that match!');
            return;
        }
        var information = await github.getReposWithTopicsV2(graphqlWithAuth, args);
        reply = `The following repositories are tagged with \`${args.join('\`, or \`')}\`\n`
        reply += information.join('\n')
        utilities.send_message(msg, reply)
            .then(_ => {})
            .catch(console.error);
    }

    if (command === '!register') {
        var dmChannel = await msg.author.createDM();
        var filter = m => m.content.length != 0;
        var messageAwaitObject = { max: 1, time: 30000, errors: ['time'] };
        var count = await db.countUser(pool, msg.author.id);
        if (count > 0) {
            dmChannel.send('`This Discord account is already registered! Contact your instructor.`')
            return;
        }
        dmChannel.send('`Enter your full name (First Last) / [or cancel to quit]`').then(() => {
            dmChannel.awaitMessages(filter, messageAwaitObject).then(name => {
                if (name.first().content.toLowerCase() == 'cancel') {
                    return;
                }
                dmChannel.send('`Enter your GitHub Username / [or cancel to quite]`').then(() => {
                    dmChannel.awaitMessages(filter, messageAwaitObject).then(githubUserName => {
                        if (githubUserName.first().content.toLowerCase() == 'cancel') {
                            return;
                        }
                        dmChannel.send(`\`Are you sure you want to proceed? This cannot be undone! [yes/no]\`\n\`Name: ${name.first().content}\`\n\`GitHub: ${githubUserName.first().content}\``).then(() => {
                            dmChannel.awaitMessages(filter, messageAwaitObject).then(confirmation => {
                                if (confirmation.first().content.toLowerCase() == 'yes') {
                                    db.registerUser(pool, name.first().content, msg.author.id, githubUserName.first().content).then( rowCount => {
                                        if (rowCount == 1) {
                                            let studentRole = utilities.getRoleByName(guild, "Student");
                                            let member = utilities.getMemberById(guild, msg.author.id);
                                            member.roles.add(studentRole).catch(console.error);
                                            dmChannel.send(`Registered!`)
                                        }
                                        else {
                                            dmChannel.send('`Something went wrong while trying to register! Contact your instructor!`');
                                        }
                                    })
                                }
                            })
                        })
                    })
                });
            })
        })
    }
});

client.login(discordConfig.token);

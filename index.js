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

    // utilities.createChannel(guild, githubConfig.course, 'category').then( (textChannels) => {
    //     utilities.createChannel(guild, 'general', 'text', textChannels);
    //     utilities.createChannel(guild, 'assignments', 'text', textChannels);
    // });

    // utilities.createChannel(guild, githubConfig.course + ' Voice Channels', 'category').then( (voiceChannels) => {
    //     utilities.createChannel(guild, 'general-voice', 'voice', voiceChannels);
    //     utilities.createChannel(guild, 'virtual-classroom', 'voice', voiceChannels);
    // });

    // utilities.createChannel(guild, 'orbit', 'category').then( (orbitChannels) => {
    //     utilities.createChannel(guild, 'sandbox', 'text', orbitChannels);
    //     utilities.createChannel(guild, 'orbit-comms', 'text', orbitChannels);
    // })
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

    if (msg.channel.type == 'text' && ['!assignments', '!grades', '!info'].includes(command) && !['orbit-comms', 'sandbox'].includes(msg.channel.name) ) {
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
        score = 0.0;
        total = 0.0;
        reply = B;

        var grades = args.length === 0 ?
            await db.getGrades(pool, msg.author.id) :
            await db.getSpecificGrades(pool, msg.author.id, args);

        for (var task of grades) {
            if (task.type === 'extra-credit') {
                continue;
            }

            reply += task.name.padEnd(26, ' ') + '| ' + task.score + '/' + task.points + '\n';
            if (task.points > 0 && task.type) {
                score += task.score * githubConfig.gradeWeights[task.type];
                total += task.points * githubConfig.gradeWeights[task.type];
            }
        }

        reply += BB;
        var ecTotal = 0.0;
        for (var task of grades) {
            if (task.type === 'extra-credit') {
                reply += task.name.padEnd(26, ' ') + '| ' + task.score + '/' + task.points + '\n';
                ecTotal += parseFloat(task.score);
            }
        }

        if (total > 0) {
            reply = B + 'Grade'.padEnd(26, ' ') + '| Score/Total\n' + B
                + reply;

            console.log(ecTotal);

            var weightedGrade = 100.0 * score / total;
            var finalGrade = weightedGrade + ecTotal;
            var letterGrade = 'F';
            if (finalGrade > 59.49) letterGrade = 'D';
            if (finalGrade > 69.49) letterGrade = 'C';
            if (finalGrade > 74.49) letterGrade = 'C+';
            if (finalGrade > 79.49) letterGrade = 'B';
            if (finalGrade > 84.49) letterGrade = 'B+';
            if (finalGrade > 89.49) letterGrade = 'A';

            reply += `${BB}Weighted Course Grade = ${weightedGrade} + ${ecTotal}EC  =  ${finalGrade} (${letterGrade}) ${B}`;
            utilities.send_dm(msg, reply)
                .then(_ => {
                    if (msg.channel.type == 'text') {
                        msg.delete();
                    }
                })
                .catch(console.error);
        }
        else {
            utilities.send_dm(msg, "No assignments found!")
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
        dmChannel.send('`Enter your full name (preferred first name and last name) / [or cancel to quit]`').then(() => {
            dmChannel.awaitMessages(filter, messageAwaitObject).then(name => {
                name = name.first().content;
                if (name == 'cancel') {
                    return;
                }
                dmChannel.send('`Enter your GitHub Username / [or cancel to quit]`').then(() => {
                    dmChannel.awaitMessages(filter, messageAwaitObject).then(githubUserName => {
                        githubUserName = githubUserName.first().content;
                        if (githubUserName == 'cancel') {
                            return;
                        }
                        dmChannel.send(`\`Are you sure you want to proceed? This cannot be undone! [yes/no]\`\n\` - Name:   ${name}\`\n\` - GitHub: ${githubUserName}\``).then(() => {
                            dmChannel.awaitMessages(filter, messageAwaitObject).then(confirmation => {
                                confirmation = confirmation.first().content;
                                if (confirmation.toLowerCase() == 'yes') {
                                    db.registerUser(pool, name, msg.author.id, githubUserName).then( rowCount => {
                                        if (rowCount == 1) {
                                            let studentRole = utilities.getRoleByName(guild, "Student");
                                            let member = utilities.getMemberById(guild, msg.author.id);
                                            var nickname = name.split(' ')[0] + ' ' + '<' + githubUserName + '>'
                                            member.roles.add(studentRole).catch(console.error);
                                            member.setNickname(nickname)
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

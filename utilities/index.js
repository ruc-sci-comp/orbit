function getMemberById(guild, id) {
    return guild.members.cache.find(member => member.id === id);
}

function getRoleByName(guild, role) {
    return guild.roles.cache.find(r => r.name === role);
}

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

async function createChannel(guild, name, type, parent=undefined) {
    for (var channel of guild.channels.cache.values()) {
        if (channel.name == name && channel.type == type) {
            return channel.id;
        }
    }
    var new_channel = await guild.channels.create(
        name,
        {
            type: type,
            parent: parent,
            permissionOverwrites: [
                {
                    id: guild.roles.everyone,
                    deny: ['VIEW_CHANNEL'],
                },
                {
                    id: getRoleByName("Student").id,
                    allow: ['VIEW_CHANNEL'],
                },
            ],
        }
    )
    return new_channel.id
}

exports.getMemberById = getMemberById;
exports.getRoleByName = getRoleByName;
exports.send_dm = send_dm;
exports.send_text = send_text;
exports.send_message = send_message;
exports.createChannel = createChannel;
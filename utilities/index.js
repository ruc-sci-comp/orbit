module.exports = 
{
    getMemberById: function(guild, id) {
        return guild.members.cache.find(member => member.id === id);
    },

    getRoleByName: function(guild, role) {
        return guild.roles.cache.find(role => role.name === role);
    },

    send_dm: async function(msg, content) {
        return msg.author.send(content);
    },
    
    send_text: async function(msg, content) {
        return msg.channel.send(content);
    },
    
    send_message: async function(msg, content) {
        if (msg.channel.type == 'dm') {
            return send_dm(msg, content);
        }
        else {
            return send_text(msg, content);
        }
    },

    createChannel: async function(guild, name, type, parent=undefined) {
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
    },
}

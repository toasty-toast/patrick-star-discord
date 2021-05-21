const Discord = require('discord.js');
const fs = require('fs');

const LeedleAudioFilePath = 'res/leedle.mp3';
const CommandPrefix = '!';

const client = new Discord.Client();

const leedleMap = {};

const disconnectVoice = async (botGuildMember) => {
    if (botGuildMember.voice.connection) {
        if (botGuildMember.voice.connection.dispatcher) {
            botGuildMember.voice.connection.dispatcher.destroy();
        }
        botGuildMember.voice.connection.disconnect();
    }
};

const beginLeedle = async (channelID, targetUserID, isInitialConnection, botGuildMember) => {
    const newChannel = await client.channels.fetch(channelID);
    const connection = await newChannel.join();
    connection.setSpeaking(0);

    if (isInitialConnection) {
        connection.on('speaking', (user, speaking) => {
            if (user.id !== targetUserID) {
                return;
            }

            if (speaking.bitfield) {
                const dispatcher = connection.play(fs.createReadStream(LeedleAudioFilePath));
                dispatcher.on('error', console.error);
            } else {
                if (botGuildMember.voice.connection.dispatcher) {
                    botGuildMember.voice.connection.dispatcher.destroy();
                }
            }
        });
    }
}

client.once('ready', async () => {
    await client.user.setPresence({
        activity: {
            type: 'LISTENING',
            name: 'Leedle Leedle Leedle Lee'
        }
    });
});

client.on('message', async (message) => {
    if (!message.content.startsWith(CommandPrefix) || message.author.bot || message.author == client.user) {
        return;
    }

    const guild = message.guild;
    const command = message.content.slice(CommandPrefix.length).trim().split(/ +/)[0];
    const commandArg = message.content.slice(CommandPrefix.length + command.length).trim();

    if (command === 'leedle') {
        if (guild.id in leedleMap) {
            await message.channel.send(`Sorry, I'm already leedling someone. Type !unleedle to free them before leedling someone else.`);
            return;
        }

        const members = await guild.members.fetch();
        const target = members.filter(member => member.displayName.toLowerCase() === commandArg.toLowerCase()).first();
        if (!target) {
            await message.channel.send(`There's nobody here named ${commandArg} to leedle.`);
            return;
        }

        leedleMap[guild.id] = target.user.id;
        console.log(`${target.displayName} has been leedled by ${message.author.username}`);
        await message.channel.send(`${target.user}, you have been leedled by ${message.author}. Someone can type ${CommandPrefix}unleedle to free you from this, but you can't unleedle yourself.`);

        let targetChannelID = null;
        const channels = guild.channels.cache.filter(c => c.type == 'voice');
        for (const [channelID, channel] of channels) {
            for (const [memberID, member] of channel.members) {
                if (memberID == target.user.id) {
                    targetChannelID = channelID;
                    break;
                }
            }
        }

        if (targetChannelID) {
            disconnectVoice(guild.me);
            beginLeedle(targetChannelID, target.user.id, true, guild.me);
        }

    } else if (command === 'unleedle') {
        if (!(guild.id in leedleMap)) {
            await message.channel.send('No one is being leedled here.');
            return;
        }

        if (message.author.id === leedleMap[guild.id]) {
            await message.channel.send(`Sorry, ${message.author}. You can't unleedle yourself.`);
            return;
        }

        const members = await guild.members.fetch();
        const target = members.filter(member => member.id === leedleMap[guild.id]).first();
        if (target) {
            console.log(`${target.displayName} has been unleedled by ${message.author.username}.`);
            await message.channel.send(`Congratulations, ${target.user}. You have been unleedled by ${message.author}.`);
        }

        delete leedleMap[guild.id];
        disconnectVoice(guild.me);
    }
});

client.on('voiceStateUpdate', async (oldState, newState) => {
    const guild = newState.guild;

    if (!(guild.id in leedleMap)) {
        return;
    }

    const targetUserID = leedleMap[guild.id];
    if (newState.id !== targetUserID) {
        return;
    }

    const me = newState.guild.me;
    const wasAlreadyConnected = me.voice.connection != null;

    if (newState.channelID !== oldState.channelID) {
        if (!newState.channelID) {
            disconnectVoice(me);
        }

        if (newState.channelID) {
            beginLeedle(newState.channelID, targetUserID, !wasAlreadyConnected, me);
        }
    }
});

if (process.env.DISCORD_BOT_TOKEN) {
    client.login(process.env.DISCORD_BOT_TOKEN);
} else {
    console.error('Missing required environment variable DISCORD_BOT_TOKEN.');
    process.exit(1);
}

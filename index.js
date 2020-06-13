const Discord = require('discord.js');
const { Attachment } = require('discord.js');
var MusicFunctions = require('./music.js');
var XMLHttpRequest = require("xmlhttprequest").XMLHttpRequest;
var fs = require('fs');
global.commandPref = "-";
const bot = new Discord.Client();
const youtubeApiKey = process.env.YOUTUBE_API_TOKEN;
const youtubeSearchKeywordsLink = 'https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=1&q=';

function httpGetYoutubeVideo(keywords, callback)
{
    var xmlHttp = new XMLHttpRequest();
    xmlHttp.onreadystatechange = function() { 
        if (xmlHttp.readyState == 4 && xmlHttp.status == 200)
            callback(xmlHttp.responseText);
    }
    xmlHttp.open("GET", youtubeSearchKeywordsLink + keywords + '&type=video&key=' + youtubeApiKey, true); // true for asynchronous 
    xmlHttp.send(null);
}

bot.on('message', async function(message)
{
    try {
        if (message.content.startsWith(global.commandPref))
        {
            if (message.content === global.commandPref + "rejoin")
            {
                // User leaves a voice channel, check if bot needs to leave also
                var guild = bot.guilds.get('268822100737785856');
                bot.fetchUser('721388056732762163').then((user) => {
                    guild.fetchMember(user).then((member) => {
                        var voiceChannel = member.voiceChannel;
                        if (voiceChannel != null) {
                            var queue = MusicFunctions.queue;
                            var serverQueue = queue.get(guild.id);
                            if (serverQueue != null && serverQueue.connection != null && serverQueue.connection.dispatcher != null) {
                                serverQueue.connection.dispatcher.end();
                            }
                            queue.delete(guild.id);
                            serverQueue = null;
                            voiceChannel.leave();
                            voiceChannel.join();
                            return;
                        }
                    });
                });
            }
            else if (message.content === global.commandPref + "help")
            {
                var files = fs.readdirSync('./');

                const nameArray = [];

                // Filter audio files
                for (var i = 0; i < files.length; i++) {
                    if (files[i].endsWith(".mp3") || files[i].endsWith(".m4a"))
                    {
                        nameArray.push({
                            name: files[i]
                        });
                    }
                }

                var customAudios = "";
                var x = 1;
                for (var file of nameArray)
                {
                    if (!file.name.includes("theme"))
                    {
                        var name = file.name.split(".");
                        customAudios += "-" + name[0] + (x % 3 === 0 && x !== 0 ? "\n" : "          ");
                        x++;
                    }
                }

                message.channel.send("\nUseful commands:\n"
                    + "-remove <x>" + "        | removes x amount of past messages on the channel (without x parameter removes only one)" + "\n"
                    + "-rejoin" + "        | rejoins the bot to current voicechannel (can use if bot is lagging)" + "\n"
                    + "\nCustom sounds:\n"
                    + customAudios
                );
            }
            else if (message.content.startsWith(global.commandPref + "play")) // PLAY
            {
                if (message.author.bot) return;
                if (!message.content.startsWith(global.commandPref + 'play http'))
                {
                    var keywords = message.content.split(' ')[1];

                    httpGetYoutubeVideo(keywords, (response) => {
                        var object = JSON.parse(response);
                        var videoId = object.items[0].id.videoId;
                        var youtubeLink = 'https://www.youtube.com/watch?v=' + videoId;
                        
                        message.content = '-play ' + youtubeLink;
                        const serverQueue = MusicFunctions.queue.get(message.guild.id);
                        MusicFunctions.execute(message, serverQueue);
                    });
                }
                else 
                {
                    const serverQueue = MusicFunctions.queue.get(message.guild.id);
                    MusicFunctions.execute(message, serverQueue);
                }
            }
            else if (message.content.startsWith(global.commandPref + "skip")) // SKIP
            {
                if (message.author.bot) return;
                const serverQueue = MusicFunctions.queue.get(message.guild.id);
                MusicFunctions.skip(message, serverQueue);
            }
            else if (message.content.startsWith(global.commandPref + "clear")) // CLEAR
            {
                if (message.author.bot) return;
                const serverQueue = MusicFunctions.queue.get(message.guild.id);
                MusicFunctions.clear(message, serverQueue);
            }
            else if (message.content.startsWith(global.commandPref + "remove")) // REMOVE
            {
                var args = message.content.split(" ");

                if (args.length == 1)
                {
                    const fetched = await message.channel.fetchMessages({limit: 2});
                    message.channel.bulkDelete(fetched);
                }
                else
                {
                    try 
                    {
                        var integ = parseInt(args[1], 10) + 1;
                        if (integ > 0 && integ < 101)
                        {
                            const fetched = await message.channel.fetchMessages({limit: integ});
                            var response = message.channel.bulkDelete(fetched);
                            console.log("----> " + response);
                        }
                        else if (integ >= 101) 
                        {
                            message.channel.send("Maximum amount of messages to remove is 99!");
                        }
                    }
                    catch(err) {
                        message.channel.send(err);
                    }
                }
            }
            else {
                console.log("==> " + message.content);

                if (MusicFunctions.queue != null && MusicFunctions.queue.songs != null && MusicFunctions.queue.songs.length >= 5) {
                    return;
                }

                // Get filenames in the directory
                var files = fs.readdirSync('./');

                const nameArray = [];

                // Filter audio files
                for (var i = 0; i < files.length; i++) {
                    if ((files[i].endsWith(".mp3") || files[i].endsWith(".m4a")) && !files[i].includes("theme"))
                    {
                        nameArray.push({
                            name: files[i]
                        });
                    }
                }

                var itemQuantity = nameArray.length;
                if (message.content === global.commandPref + "r" && itemQuantity > 0)
                {
                    var index = Math.floor(Math.random() * Math.floor(itemQuantity));
                    message.content = global.commandPref + nameArray[index].name.split('.')[0];
                }

                // Check which audio file's name matches command
                for (var file of nameArray)
                {
                    if (file.name.split('.')[0] === message.content.replace(global.commandPref, ""))
                    {
                        const serverQueue = MusicFunctions.queue.get(message.guild.id);
                        MusicFunctions.execute(message, serverQueue, file.name);
                        break;
                    }
                }
            }
        }
    }
    catch(err)
    {
        console.log(err);
    }
});

// User join events
bot.on('voiceStateUpdate', (oldMember, newMember) => {
    var newUserChannel = newMember.voiceChannel;
    var oldUserChannel = oldMember.voiceChannel;
  
    if (oldUserChannel === undefined && newUserChannel !== undefined)
    {
        // Sami joined a voice channel
        /*if (newMember.id === '134346505921363969'){
            var guildId = newMember.guild.id;
            const serverQueue = MusicFunctions.queue.get(guildId);
            var message = {
                content: '-play',
                member: newMember,
                channel: newMember.voiceChannel,
                client: newMember.client,
                guild: newMember.guild
            }
            var rand = Math.floor(Math.random() * Math.floor(1));
            if (rand === 0) {
                MusicFunctions.execute(message, serverQueue, 'samitheme.mp3', 1);
            }
        }*/
        
    } 
    else if (newUserChannel === undefined)
    {
    }

    // User leaves a voice channel, check if bot needs to leave also
    var guild = bot.guilds.get('268822100737785856');
    bot.fetchUser('721388056732762163').then((user) => {
        guild.fetchMember(user).then((member) => {
            var voiceChannel = member.voiceChannel;
            if (voiceChannel != null && voiceChannel.members.array().length <= 1) {
                voiceChannel.leave();
                return;
            }
        });
    });
})

bot.on('ready', function(){
    console.log('Bot is ready!');
});

bot.login(process.env.BOT_TOKEN);
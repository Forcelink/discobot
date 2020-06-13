const ytdl = require('ytdl-core');
const queue = new Map();
var isPlaying = false;
var timeout = null;

function skip(message, serverQueue) {
	if (!message.member.voiceChannel) return message.channel.send('You have to be in a voice channel to stop the music!');
	if (!serverQueue) return message.channel.send('There is no song that I could skip!');
	serverQueue.connection.dispatcher.end();
}

function clear(message, serverQueue) {
	if (!message.member.voiceChannel) return message.channel.send('You have to be in a voice channel to clear the music queue!');
	serverQueue.songs = [];
	serverQueue.connection.dispatcher.end();
}

function play(guild, song, volume = 1) {
	const serverQueue = queue.get(guild.id);

	if (!song) {
		queue.delete(guild.id);
		return;
	}
	/*if (!song) 
	{
		timeout = setTimeout(() => {
			if (!isPlaying)
			{
				serverQueue.voiceChannel.leave();
				queue.delete(guild.id);
			}
		}, 60 * 60 * 1000); // 10 minutes delay to disconnect
		
		isPlaying = false;
		return;
	}
	else
	{
		clearTimeout(timeout);
		isPlaying = true;
	}*/

	if (song.title === 'serverFile')
	{
		const dispatcher = serverQueue.connection.playFile(song.url)
			.on('end', () => {
				console.log('Music ended!');
				serverQueue.songs.shift();
				play(guild, serverQueue.songs[0]);
			})
			.on('error', error => {
				console.error(error);
			});

		dispatcher.setVolume(volume);
	}
	else 
	{
		const dispatcher = serverQueue.connection.playStream(ytdl(song.url))
			.on('end', () => {
				console.log('Music ended!');
				serverQueue.songs.shift();
				play(guild, serverQueue.songs[0]);
			})
			.on('error', error => {
				console.error(error);
			});

		dispatcher.setVolume(volume);
		//dispatcher.setVolumeLogarithmic(serverQueue.volume / 5);
	}
}

async function execute(message, serverQueue, localFileName = "", volume = 1) {
	const args = message.content.split(' ');
	var playCommand = false;

	const voiceChannel = message.member.voiceChannel;
	if (!voiceChannel) return message.channel.send('You need to be in a voice channel to play music!');
	const permissions = voiceChannel.permissionsFor(message.client.user);
	if (!permissions.has('CONNECT') || !permissions.has('SPEAK')) {
		return message.channel.send('I need the permissions to join and speak in your voice channel!');
	}

	var song;
	if (localFileName !== "")
	{
		song = {
			title: 'serverFile',
			url: localFileName
		}
		console.log(song);
	}
	else 
	{
		const songInfo = await ytdl.getInfo(args[1]);
		song = {
			title: songInfo.title,
			url: songInfo.video_url,
		};

		playCommand = true;
	}

	if (!serverQueue) {
		const queueConstruct = {
			textChannel: message.channel,
			voiceChannel: voiceChannel,
			connection: null,
			songs: [],
			volume: 5,
			playing: true,
		};

		queue.set(message.guild.id, queueConstruct);

		queueConstruct.songs.push(song);

		try {
			var connection = await voiceChannel.join();
			queueConstruct.connection = connection;
			play(message.guild, queueConstruct.songs[0], volume);
		} catch (err) {
			console.log(err);
			queue.delete(message.guild.id);
			return message.channel.send(err);
		}
	} else {
		if (serverQueue.songs.length === 0)
		{
			serverQueue.songs.push(song);
			play(message.guild, serverQueue.songs[0], volume);
		}
		else 
		{
			serverQueue.songs.push(song);
		}
		
		if (playCommand)
		{
			return message.channel.send(`${song.title} has been added to the queue!`);
		}

		return;
	}
}

module.exports = {
	isPlaying,
    queue,
    execute,
    clear,
    skip
}
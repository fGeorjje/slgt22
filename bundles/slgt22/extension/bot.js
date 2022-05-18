const fs = require('fs');
const path = require("path");
const prism = require('prism-media');
const WebSocket = require('ws');
const { Mixer } = require('audio-mixer');
const { Client, Intents } = require('discord.js');
const { joinVoiceChannel, EndBehaviorType, createAudioPlayer, createAudioResource, StreamType } = require('@discordjs/voice');

module.exports = (nodecg) => {
  const volumeData = nodecg.Replicant('volumeData', { defaultValue: {} });
  function getVolume(userID) {
    const result = volumeData.value[userID];
    if (result === undefined) {
      return 50;
    }
    return result;
  }
  
  let connection, channel, player;
  function isConnected() {
    return !!connection && !!channel;
  }
  
  let currentlyPlaying = null;
  function playAudio(file) {
    if (!player) return;
    const resource = createAudioResource(fs.createReadStream(path.join(__dirname, file), { inputType: StreamType.OggOpus }));
    player.play(resource);
    currentlyPlaying = file;
    setTimeout(function() {
      currentlyPlaying = null;
    }, resource.playbackDuration);
  }
  
  nodecg.listenFor('botPlayAudioFile', (value) => {
    playAudio(value)
  });
  
  setInterval(() => {
    if (currentlyPlaying) return;
    playAudio('silence.ogg');
  }, 60000)
  
  const botData = nodecg.Replicant('botData', { defaultValue: {
    users: {},
  }});
  const botSettings = nodecg.Replicant('botSettings', { defaultValue: {
    channel: null,
    channels: {},
  }});
  nodecg.log.info('Setup currentlySpeaking');
  const currentlySpeaking = nodecg.Replicant('currentlySpeaking');
  currentlySpeaking.value = {};
  let lastSpeakTimes = {};
  setInterval(function() {
    for (let speaker in lastSpeakTimes) {
      const time = lastSpeakTimes[speaker];
      const difference = Date.now() - time;
      if (difference > 100) {
        delete lastSpeakTimes[speaker];
        delete currentlySpeaking.value[speaker];
      }
    }
  }, 50);

  const client = new Client({ intents: [
    Intents.FLAGS.GUILDS,
    Intents.FLAGS.GUILD_VOICE_STATES,
    Intents.FLAGS.GUILD_MEMBERS
  ] });
  
  const websocketPort = parseInt(nodecg.bundleConfig.websocketPort);
  const wss = new WebSocket.WebSocketServer({port: websocketPort});
  
  function broadcastWss(data, binary) {
    wss.clients.forEach(function each(client) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(data, { 'binary': binary });
      }
    });
  }
  
  function log(string) {
    nodecg.log.info(string);
    nodecg.log.info('Bot data: ' + JSON.stringify(botData.value))
  }

  client.once('ready', () => {
    // Get all channels.
    botSettings.value.channels = {};
    client.channels.cache.forEach(channel => {
      if (channel.type === 'GUILD_VOICE')
        botSettings.value.channels[channel.id] = channel.name;
    })

    botData.value.users = {};
    log('Bot has been started!')

    botData.on('change', (newVal, oldVal) => {
      if (!isConnected()) return;
      
      for (const user in newVal.users) {
        if (JSON.stringify(newVal.users[user]) !== JSON.stringify(oldVal.users[user])) {
          channel.members.get(user).voice.setMute(newVal.users[user].mute)
          channel.members.get(user).voice.setDeaf(newVal.users[user].deaf)
        }
      }
    })

    botSettings.on('change', async (newVal, oldVal) => {
      if (oldVal === undefined || (newVal.channel !== oldVal.channel)) { 
        joinChannel(newVal.channel);
      }
    })

    // Join the specified voice channel.
    function joinChannel(value) {
      channel = null;
      if (connection) {
        connection.destroy();
        connection = null;
        botData.value.users = {};
      }
      
      if (!value) return;
      channel = client.channels.cache.get(value);
      if (!channel) return;
      connection = joinVoiceChannel({
        channelId: channel.id,
        guildId: channel.guildId,
        selfDeaf: false,
        selfMute: true,
        adapterCreator: channel.guild.voiceAdapterCreator,
      });

      // Play silent audio to not get auto kicked for inactivity,
      if (player) {
        player.stop();
      }
      player = createAudioPlayer();
      connection.subscribe(player);

      // Start recording each user in VC.
      channel.members.forEach(member => { 
        if (member.user.id !== client.user.id && !member.user.bot)
          subscribeToUser(member.user, member.voice.serverMute, member.voice.serverDeaf)
      })
      
      log('Joined channel: ' + channel.id);
    }

    // Add user to mixer.
    function subscribeToUser(user, muted, deafened) {
      const discordStream = connection.receiver.subscribe(user.id, { end: { behavior: EndBehaviorType.Manual, }, });
      const tag = user.tag;
      discordStream.on('data', (chunk) => {
        if (!currentlySpeaking.value[tag]) {
          currentlySpeaking.value[tag] = true;
        }
        lastSpeakTimes[tag] = Date.now();
        broadcastWss(user.id, false);
        broadcastWss(chunk, true);
      });
      botData.value.users[user.id] = { id: user.id, name: user.username, avatar: user.displayAvatarURL({ format: 'png' }), mute: muted, deaf: deafened }
      log(`Subscribed ${user.id} ${tag} (${user.username})`);
    }

    // Remove user from mixer.
    function endUserSubscription(userID) {
      delete botData.value.users[userID];
      log(`Unsubscribed ${userID}`);
    }

    // Listen for VC changes.
    client.on('voiceStateUpdate', (oldVal, newVal) => {
      if (newVal.id === client.user.id) {
        return;
      }
      
      if (!channel) return;
      
      let wasInChannel = oldVal && oldVal.channelId === channel.id;
      let nowInChannel = newVal && newVal.channelId === channel.id;
      
      if (!wasInChannel && nowInChannel) {
        subscribeToUser(newVal.member.user, newVal.serverMute, newVal.serverDeaf);
      } else if (wasInChannel && !nowInChannel) {
        endUserSubscription(newVal.member.user.id);
      } else if (!wasInChannel && !nowInChannel) {
        return;
      } else if (oldVal.serverMute !== newVal.serverMute) {
        try { botData.value.users[newVal.member.id].mute = newVal.serverMute } catch { }
      } else if (oldVal.serverDeaf !== newVal.serverDeaf) {
        try { botData.value.users[newVal.member.id].deaf = newVal.serverDeaf } catch { }
      }
    })
  });

  client.login(nodecg.bundleConfig.botToken);
}
const uuid = Date.now().toString(36) + Math.random().toString(36).substr(2);
const vdoNinjaUsers = [{
  iframe: document.getElementById('george_vdo'),
  discord_id: '211125016467603456',
  volume: 1
}];

function log(str) {
  nodecg.sendMessage('log', `[discordAudioPlayer-${uuid}] ${str}`);
  console.log(str);
}

const timerDuration = nodecg.Replicant('timer-duration');
const timer = nodecg.Replicant('timer', 'nodecg-speedcontrol');
const volumeData = nodecg.Replicant('volumeData');

let isLive;
function calculateIsLive() {
  if (timer.value.state == 'stopped' || timer.value.state == 'finished') return true;
  let remainingMillis = (timerDuration.value * 60000) - timer.value.milliseconds;
  return remainingMillis < 0;
}
NodeCG.waitForReplicants(timerDuration, timer, volumeData).then(() => {
  setInterval(function() {
    let wasLive = isLive;
    isLive = calculateIsLive();
    
    for (const vdoNinjaUser of vdoNinjaUsers) {
      let volume;
      if (isLive) {
        let stored = volumeData.value[vdoNinjaUser.discord_id];
        if (stored === undefined) 
          stored = 100;
        volume = stored / 100;
      } else {
        volume = 0;
      }
      if (volume === vdoNinjaUser.volume) continue;
      vdoNinjaUser.volume = volume;
      vdoNinjaUser.iframe.contentWindow.postMessage({volume}, '*');
    }
  }, 500);
});

let pcmPlayers = {};

volumeData.on('change', (newVal) => {
  for (const userId in pcmPlayers) {
    updateVolume(userId, newVal);
  }
});

function updateVolume(userId, source) {
  if (!source) {
    source = volumeData.value;
  }
  
  let newVolume = source[userId];
  if (newVolume === undefined) {
    newVolume = 100;
  }
  
  if (!pcmPlayers[userId]) {
    log(`Attempted to update volume for non-existing pcm player ${userId}`)
    return;
  }
  
  let exp = (x) => Math.pow(2, x*5/100)-1;
  newVolume = exp(newVolume)/exp(50);
  
  log(`Volume ${newVolume} for ${userId}`);
  pcmPlayers[userId].volume(newVolume);
}

let audioContext = new AudioContext();
let compressionFilter = audioContext.createDynamicsCompressor();
compressionFilter.threshold.value = -20;
compressionFilter.knee.value = 0;
compressionFilter.ratio.value = 2;
compressionFilter.attack.value = 0;
compressionFilter.release.value = 0.01;
compressionFilter.connect(audioContext.destination);

function getPcmPlayer(userId, sampleRate) {
  if (userId in pcmPlayers) {
    let pcmPlayer = pcmPlayers[userId];
    let oldSampleRate = pcmPlayer.option.sampleRate
    if (oldSampleRate == sampleRate) {
      return pcmPlayer;
    }
    pcmPlayer.destroy();
    delete pcmPlayers[userId];
    log(`Mismatched sample rate for ${userId}: ${oldSampleRate} vs ${sampleRate}`);
  }
  
  log('Creating pcm player for ' + userId);
  let pcmPlayer = new PCMPlayer({
    inputCodec: 'Float32',
    audioCtx: audioContext,
    destination: compressionFilter,
    channels: 2,
    sampleRate: sampleRate,
    flushTime: 100
  });
  pcmPlayers[userId] = pcmPlayer;
  updateVolume(userId);
  return pcmPlayer;
}

let opusDecoders = {};
function getOpusDecoder(userId) {
  if (userId in opusDecoders) {
    return opusDecoders[userId];
  }
  
  log('Creating opus decoder for ' + userId);
  let opusDecoder = new OpusToPCM({
    channels: 2,
    fallback: false
  });
  opusDecoders[userId] = opusDecoder;
  opusDecoder.on('decode', (pcmData) => {
    if (!isLive) return;
    let sampleRate = opusDecoder.getSampleRate();
    //log(`Decoded data for ${userId} with sampleRate ${sampleRate}`);
    getPcmPlayer(userId, opusDecoder.getSampleRate()).feed(pcmData);
  });
  return opusDecoder;
}

let reconnectDelay = 250;
let userId;

function connect() {
  log('Connecting');
  let ws = new WebSocket(nodecg.bundleConfig.websocketExternalUrl);
  ws.binaryType = 'arraybuffer';
  ws.onopen = function() {
    reconnectDelay = 250;
    log('Connected');
  }
  ws.onmessage = function(event) {
    if (event.data instanceof ArrayBuffer) {
      if (!userId) {
        log('Received data without user id?');
        return;
      }
      
      for (const vdoNinjaUser of vdoNinjaUsers) {
        if (userId === vdoNinjaUser.discord_id) {
          userId = null;
          return;
        }
      }

      //log(`Feeding data for ${userId}, length ${event.data.byteLength}`);
      getOpusDecoder(userId).decode(new Uint8Array(event.data));
      userId = null;
    } else {
      userId = event.data;
      //log(`Switched user to ${userId}`);
    }
  };
  ws.onclose = function() {
    log('Connection lost, reconnecting in ' + reconnectDelay + 'ms');
    setTimeout(function() {
      connect();
    }, reconnectDelay);
    reconnectDelay = reconnectDelay * 2;
    if (reconnectDelay > 10000) {
      reconnectDelay = 10000;
    }
  }
}
connect();
let logger = new DualLogger();
let streamPlayerData = nodecg.Replicant('streamPlayerData');
let num = parseInt(document.location.hash.substring(1, 2));
logger.info('Initialized page #' + num);

const MODE_RESTREAMER = 'restreamer';
const MODE_COMMENTARY = 'commentary';
let mode = MODE_RESTREAMER;
if (document.location.hash.length > 3) {
  mode = document.location.hash.substring(3);
  if (![MODE_RESTREAMER, MODE_COMMENTARY].includes(mode)) {
    logger.warn(`Invalid mode ${mode}, defaulting to ${MODE_COMMENTARY}`);
    mode = MODE_COMMENTARY;
  }
}

nodecg.listenFor('reload-player', (data) => {
  if (data == num) {
    location.reload();
  }
});

streamPlayerData.on('change', (newVal, oldVal) => {
  let ourNewVal;
  let ourOldVal;
  if (newVal) ourNewVal = newVal[num];
  if (oldVal) ourOldVal = oldVal[num];
  update(ourNewVal, ourOldVal);
});

let videoContainer = document.getElementById('video-container');
let twitchEmbed = document.getElementById('twitch-embed');
let player;

function update(newVal, oldVal) {
  if (!newVal) {
    twitchEmbed.innerHTML = '';
    player = null;
    return;
  }
  
  function ifChanged(attr, callback) {
    if (!oldVal || (oldVal[attr] !== newVal[attr])) {
      callback();
    }
  }
  
  function updateVolume() {
    if (newVal.activeAudio)
      player.setVolume(newVal.volume * 1.0 / 100);
    else
      player.setVolume(0);
  }
  
  ifChanged('target', () => {
    twitchEmbed.innerHTML = '';
    player = null;
    let options = {
      width: '100%',
      height: '100%',
      channel: newVal.target,
      parent: ["nodecg.speedyliminal.tk"]
    };
    player = new Twitch.Player('twitch-embed', options);
    player.addEventListener(Twitch.Player.READY, () => {
      updateVolume();
    });
  });
  
  ifChanged('console', () => {
    if (newVal.console)
      twitchEmbed.className = 'console-' + mode;
    else 
      twitchEmbed.className = 'standard-' + mode;
  });
  
  ifChanged('activeAudio', () => {
    updateVolume();
  });
  
  ifChanged('volume', () => {
    updateVolume();
  });
}
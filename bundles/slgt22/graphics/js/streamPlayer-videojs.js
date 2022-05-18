let player = videojs('video-player');
let num = parseInt(document.location.hash.substring(1, 2));
const MODE_RESTREAMER = 'restreamer';
const MODE_COMMENTARY = 'commentary';
let mode = MODE_RESTREAMER;
if (document.location.hash.length > 3) {
  mode = document.location.hash.substring(3);
  if (![MODE_RESTREAMER, MODE_COMMENTARY].includes(mode)) {
    console.log(`Invalid mode ${mode}, defaulting to ${MODE_COMMENTARY}`);
    mode = MODE_COMMENTARY;
  }
}

let streamTimes = nodecg.Replicant('streamTimes', { defaultValue: [] });
player.ready(() => {
  if (mode == MODE_RESTREAMER) {
    NodeCG.waitForReplicants(streamTimes).then(() => {
      setInterval(() => {
        let value = streamTimes.value;
        value[num] = player.currentTime()
        streamTimes.value = value;
      }, 1000);
    });
  } else if (mode == MODE_COMMENTARY) {
    streamTimes.on('change', (newVal) => {
      // this doesn't account for network delay, meaning in true time, commentators are ahead
      // this should be roughly nulled out by discord delay
      let actual = player.currentTime();
      let expected = streamTimes[num];
      if (!expected) {
        console.log('couldnt find stream time from restream page?');
        return;
      }
      
      let difference = actual - expected;
      if (100 > Math.abs(difference)) {
        console.log('difference too small: ' + difference);
        return;
      }
      
      let speed = 1 + (actual - expected)/1000
    });
  }
  
  nodecg.listenFor('player-control', (data) => {
    if (data.num !== num) {
      return;
    }
    
    let command = player[data.command];
    if (!command) {
      return;
    }
    
    let args = data.args;
    if (args === undefined) {
      args = [];
    } else if (args.constructor !== Array) {
      args = [args];
    }
    
    if (!data.relative) {
      command.call(player, ...args);
    } else {
      let base = command.call(player);
      command.call(player, base + args[0]);
    }
  });
  
  console.log('Initializing with num='+num);
  let streamPlayerData = nodecg.Replicant('streamPlayerData');
  streamPlayerData.on('change', (newVal, oldVal) => {
    let ourNewVal;
    let ourOldVal;
    if (newVal) ourNewVal = newVal[num];
    if (oldVal) ourOldVal = oldVal[num];
    update(ourNewVal, ourOldVal);
  });

  function update(newVal, oldVal) {
    if (!newVal) {
      player.pause();
      player.src('');
      return;
    }
    
    function ifChanged(attr, callback) {
      if (!oldVal || (oldVal[attr] !== newVal[attr])) {
        callback();
      }
    }
    
    ifChanged('target', () => {
      nodecg.sendMessage('getStreamUrl', newVal.target, (error, result) => {
        if (error) {
          console.log(error);
          return;
        }
        
        player.src({src: result});
        player.play();
      });
    });
    
    ifChanged('console', () => {
      if (newVal.console)
        document.getElementById('video-container').className = 'console';
      else 
        document.getElementById('video-container').className = 'standard';
    });
    
    ifChanged('activeAudio', () => {
      if (newVal.activeAudio)
        player.volume(newVal.volume * 1.0 / 100);
      else
        player.volume(0);
    });
    
    ifChanged('volume', () => {
      if (newVal.activeAudio)
        player.volume(newVal.volume * 1.0 / 100);
      else
        player.volume(0);
    });
  }
});
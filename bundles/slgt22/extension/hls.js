const { spawn: os_spawn } = require('child_process');
const crypto = require("crypto");

const HLS_STREAM_IDENTIFIER = 'hls/';
const RAW_STREAM_IDENTIFIER = 'raw:';
const MAX_BACKOFF = 15 * 60 * 1000;
let validUsernames = /^[a-zA-Z0-9]{1,25}$/;
let shortChannelRemaps = /^1[a-d]$/;
let nodecg;

let activeStreams = {};
let backoff = {};
let respawning = {};
let streamPlayerData;
let inUpdate = false;

module.exports = (_nodecg) => {
  nodecg = _nodecg;
  
  const app = nodecg.Router();
  app.get('/time', (req, res) => {
    res.json({ time: Date.now() });
  });
  
  nodecg.mount(app);
  streamPlayerData = nodecg.Replicant('streamPlayerData');
  
  streamPlayerData.on('change', (newVal) => {
    updateAll(newVal);
  });
  
  nodecg.listenFor('getStreamUrl', (value, ack) => {
    let str = String(value);
    str = mapShortReference(str);
    if (str.startsWith(RAW_STREAM_IDENTIFIER)) {
      ack(null, str.substring(RAW_STREAM_IDENTIFIER.length));
      return;
    }
    
    let activeStream = activeStreams[str];
    if (!activeStream) {
      ack(new Error(`${str} is not an active stream`), null);
      return;
    }
    
    let hls_id = activeStream['hls_id'];
    ack(null, `https://tournament.speedyliminal.tk/hls/${hls_id}/index.m3u8`);
  });
}

function mapShortReference(target) {
  if (shortChannelRemaps.test(target)) 
    return `noglitchesrunner${target}`;
  else
    return target;
}

function getExpectedStreams(source) {
  return source.map(e => e.target)
    .filter(target => target.startsWith(HLS_STREAM_IDENTIFIER))
    .map(target => target.substring(HLS_STREAM_IDENTIFIER.length))
    .filter(target => !target.startsWith(RAW_STREAM_IDENTIFIER))
    .filter(target => validUsernames.test(target))
    .map(mapShortReference);
}

function updateAll(newVal) {
  let expected = getExpectedStreams(newVal);
  let actual = Object.keys(activeStreams);
  [...new Set(expected.concat(actual))].forEach(username => {
    updateSingle(username, expected, actual)
  });
}

function updateSingle(username, expected, actual) {
  if (!expected) {
    expected = getExpectedStreams(streamPlayerData.value);
  }
  if (!actual) {
    actual = Object.keys(activeStreams);
  }
  let shouldBeActive = expected.includes(username);
  let isActive = actual.includes(username);
  delete respawning[username];
  if (shouldBeActive == isActive) {
    return;
  } else if (shouldBeActive) {
    launchTwitchPull(username);
  } else {
    killTwitchPull(username);
  }
}

function killTwitchPull(username) {
  let activeStream = activeStreams[username];
  if (!activeStream) {
    return;
  }
  
  let tasks = activeStream.tasks;
  for (const key of Object.keys(tasks)) {
    let task = tasks[key];
    if (task && !task.exitCode) {
      delete tasks[key];
      task.kill();
    }
  }
  
  delete activeStreams[username];
}

function launchTwitchPull(username) {
  if (activeStreams[username]) {
    throw new Error('duplicate stream start for ' + username);
  }
  
  let uuid = crypto.randomBytes(16).toString("hex");
  let hls_id = `${username}_${uuid}`;
  activeStreams[username] = { 'hls_id': hls_id }
  activeStreams[username].tasks = {};
  
  function log(type, task, msg) {
    nodecg.log[type](`[${task.spawnfile}@${task.pid}/${username}@${hls_id}] ${msg}`)
  }
  
  function spawn(cmd, args) {
    let task = os_spawn(cmd, args);
    activeStreams[username].tasks[cmd] = task;
    task.on('spawn', () => {
      log('info', task, 'spawned');
    });
    
    const {stdin, stdout, stderr} = task;
    for (let [name, pipe] of Object.entries({stdin, stdout, stderr})) {
      pipe.on('error', (err) => {
        log('error', task, `ERRPIPE ${name} ${err}`);
      });
    }
    
    task.stderr.on('data', (data) => {
      log('error', task, 'stderr: ' + data);
    });
    
    task.on('exit', (code, signal) => {
      killTwitchPull(username);
      log('info', task, `exit: code=${code} signal=${signal}`);
      if (respawning[username]) {
        return;
      }
      respawning[username] = true;
      if (!backoff[username]) {
        backoff[username] = 5000;
      } else {
        backoff[username] = backoff[username] * 2;
        if (backoff[username] > MAX_BACKOFF) {
          backoff[username] = MAX_BACKOFF;
        }
      }
      
      setTimeout(function() {
        if (!respawning[username]) {
          // cancelled
          return;
        }
        delete respawning[username];
        updateSingle(username);
      }, backoff[username]);
    });
    return task;
  }
  
  let streamlink = spawn('./streamlink',
    ['--loglevel','warning','--twitch-low-latency', '-O', 'https://www.twitch.tv/' + username, 'best']);

  let ffmpeg;
  streamlink.stdout.on('data', (data) => {
    // reset backoff on received data
    delete backoff[username];
    
    if (!ffmpeg) {
      ffmpeg = spawn('ffmpeg', 
        ['-loglevel','warning','-i', 'pipe:0', '-c', 'copy', '-f', 'flv', 'rtmp://127.0.0.1/live/' + hls_id]);
      ffmpeg.stdout.on('data', (data) => {
        // no-op
      });
    }
    try {
      ffmpeg.stdin.write(data);
    } catch (error) {
      log('error', task, `pipe error $error`);
      killTwitchPull(username);
    }
  });

}

// temp code for ozmourn
/*
let logging = false;
let oldConsole = console.log;
let logId = 'log-qw39tq3tuwgbhiuzaeswghouaesg'
let logNodecg = function(...args) {
  if (logging) return;
  logging = true;
  try {
    let message = JSON.stringify(args);
    if (message.includes('Received message')) {
      return;
    }
    oldConsole(message);
    nodecg.sendMessage(logId, message);
  } finally {
    logging = false;
  }
}*/

let logger = new DualLogger();


let video = document.getElementById('video-player');
let lastVideoTime;
let errors = 0;
/*
setInterval(function() {
  if (lastVideoTime === undefined) {
    return;
  }
  
  if (lastVideoTime != video.currentTime)  {
    lastVideoTime = video.currentTime;
    errors = 0;
    return;
  }
  errors++;
  logger.warn('Playback error #'+errors);
  if (errors < 45) {
    return;
  }
  
  location.reload();
}, 200);*/

/** setup compressor filter **/
const audioContext = new AudioContext();
const audioSource = audioContext.createMediaElementSource(video);
const gainFilter = audioContext.createGain();
audioSource.connect(gainFilter);

let lastFilter = gainFilter;
for (let i = 0; i < 3; i++) {
  let compressionFilter = audioContext.createDynamicsCompressor();
  const afterGainFilter = audioContext.createGain();
  const replicant = nodecg.Replicant('compressorSettings'+i);
  replicant.on('change', (newVal, oldVal) => {
    compressionFilter.threshold.value = newVal.threshold;
    compressionFilter.knee.value = newVal.knee;
    compressionFilter.ratio.value = newVal.ratio;
    compressionFilter.attack.value = newVal.attack;
    compressionFilter.release.value = newVal.release;
    afterGainFilter.gain.value = newVal.aftergain;
  });
  lastFilter.connect(compressionFilter);
  compressionFilter.connect(afterGainFilter);
  lastFilter = afterGainFilter;
}
lastFilter.connect(audioContext.destination);

let streamPlayerData = nodecg.Replicant('streamPlayerData');
let num = parseInt(document.location.hash.substring(1, 2));
logger.info('Initialized page #' + num);
let hls;
if (!Hls.isSupported()) {
  logger.error('no hls');
  throw new Error('no hls');
}

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

nodecg.listenFor('player-speed', (data) => {
  if (data.num != num) {
    return;
  }
  
  if (data.mode && data.mode != mode) {
    return;
  }
  
  if (data.speed !== undefined && data.duration) {
    video.playbackRate = data.speed;
    if (data.duration < 0) return;
    setTimeout(function() {
      video.playbackRate = 1;
    }, data.duration);
  }
  
  if (data.seek) {
    video.currentTime = data.seek;
  }

});

streamPlayerData.on('change', (newVal, oldVal) => {
  let ourNewVal;
  let ourOldVal;
  if (newVal) ourNewVal = newVal[num];
  if (oldVal) ourOldVal = oldVal[num];
  update(ourNewVal, ourOldVal);
});

function update(newVal, oldVal) {
  if (!newVal) {
    if (hls) {
      hls.detachMedia();
      hls = null;
    }
    return;
  }
  
  function ifChanged(attr, callback) {
    if (!oldVal || (oldVal[attr] !== newVal[attr])) {
      callback();
    }
  }
  
  ifChanged('target', () => {
    loadStream(newVal.target);
  });
  
  ifChanged('console', () => {
    if (newVal.console)
      video.className = 'console-' + mode;
    else 
      video.className = 'standard-' + mode;
  });
  
  function updateVolume() {
    let exp = (x) => Math.pow(2, x*5/100)-1
    if (newVal.activeAudio)
      gainFilter.gain.value = exp(newVal.volume)/exp(50);
    else
      gainFilter.gain.value = 0;
  }
  
  ifChanged('activeAudio', () => {
    updateVolume();
  });
  
  ifChanged('volume', () => {
    updateVolume();
  });
}

function loadStream(_target) {
  let target = _target;
  if (!target) 
    target = streamPlayerData.value[num].target;
  if (!target)
    return;
  nodecg.sendMessage('getStreamUrl', target, loadHls);
}

function loadHls(error, result) {
  if (error) {
    loadStream();
    return;
  }
  
  if (hls) {
    hls.detachMedia();
  }
  
  // bind them together
  hls = new Hls();
  hls.attachMedia(video);
  hls.on(Hls.Events.MEDIA_ATTACHED, function () {
    logger.trace('video and hls.js are now bound together !');
    hls.loadSource(result);
    hls.on(Hls.Events.MANIFEST_PARSED, function (event, data) {
      logger.trace(
        'manifest loaded, found ' + data.levels.length + ' quality level'
      );
      video.play();
      if (result.startsWith('videos/')) {
        video.playbackRate = 0;
      }
      
      lastVideoTime = 0;
      recoveryDelay = 0;
    });spe
    hls.on(Hls.Events.ERROR, recoverError);
    //hls.on(Hls.Events.FRAG_CHANGED, onFragmentChange);
    //hls.on(Hls.Events.INIT_PTS_FOUND, onFragmentChange);
  });
}

let recoveryDelay = 0;
let recovering = false;
function recoverError(event, data) {
  logger.error('stream error', data.type);
  
  if (!data.fatal || recovering) {
    return;
  }
 
  recovering = true;
  setTimeout(() => {
    recovering = false;
    loadStream();
  }, 500);
}

/**
  OCR
*/


let ocr;
(async () => {
  let { createWorker, PSM } = Tesseract;
  const worker = createWorker();
  await worker.load();
  await worker.loadLanguage('eng');
  await worker.initialize('eng');
  await worker.setParameters({
    tessjs_create_hocr: 0,
    tessjs_create_tsv: 0,
    tessjs_create_box: 0,
    tessjs_create_unlv: 0,
    tessjs_create_osd: 0,
  });
  ocr = async function(image) {
    let ocrResult = await worker.recognize(image, 'eng');
    return ocrResult;
  }
  logger.info('tesseract.js init');
})();

nodecg.listenFor('timer-ocr-init-request', (syncId) => {
  let isMaster = num == 0 && mode == MODE_RESTREAMER;
  if (!isMaster) {
    nodecg.sendMessage('timer-ocr-init-response', {isMaster, syncId});
    return;
  }
  let currentTime = Date.now() + timer.offset;
  nodecg.sendMessage('timer-ocr-init-response', {isMaster, syncId, currentTime});
  logger.info(`Sending init response with ${currentTime}`);
});

nodecg.listenFor('timer-ocr-request', (data) => {
  if (mode != MODE_RESTREAMER) return;
  logger.info(`Timer OCR request`);
  let targetTime = data.targetTime;
  let currentTime = Date.now() + timer.offset;
  let delay = targetTime - currentTime;
  if (delay < 0) delay = 0;
  logger.info(`Performing OCR in ${delay}`);
  setTimeout(async () => performOCR(data.syncId, data.mode, Date.now()), delay);
});

function parseTime(text, mode) {
  if (!text) {
    return undefined;
  }
 
  let digits = text.replace(/[^0-9\:\.]/g, '')
    .split(/[\:\.]/g)
    .reverse()
    .map(d => parseInt(d));
  if (digits.some(d => isNaN(d) || d > 100)) {
    return undefined;
  }
  
  let [hundreds=0, seconds=0, minutes=0, hours=0] = digits;
  let time = 0;
  if (hundreds < 10) {
    // only showing one digit -> gotta be a decisecond
    hundreds *= 10;
  }
  
  if (mode == 'rta') {
    // only get first digit of minutes in RTA mode and ignore others
    minutes = minutes % 10;
    hours = 0;
  }
  
  time += hundreds  * 10              ;
  time += seconds   * 1000            ;
  time += minutes   * 1000 * 60       ;
  time += hours     * 1000 * 60 * 60  ;
  return time;
}

function getRect(mode) {
  let isConsole = video.className.includes('console');
  if (mode == 'rta' && !isConsole) return { x: 1320, y: 920, w: 600, h: 160};
  if (mode == 'igt' && !isConsole) return { x: 0, y: 900, w: 966, h: 180};
  if (mode == 'igt' && isConsole) return { x: 30, y: 60, w: 210, h: 50};
  return undefined;
}

function median(values){
  
}

async function performOCR(syncId, mode, startTime, results=[], errors=[]) {
  let thisInvocationStartedAt = Date.now();
  
  function replyGeneric(result) {
    let latency;
    if (hls) latency = hls.latency;
    let response = {num, syncId, latency, result};
    logger.info(`Reply OCR ${JSON.stringify(response)}`);
    nodecg.sendMessage('timer-ocr-response', response);
  }

  let replySuccess = (time, confidence) => replyGeneric({time, confidence});
  let replyError = (error) => replyGeneric({error});

  if (errors.length >= 20) {
    replyError('20xParse fail: ' + errors.join('|'));
    return;
  }
  
  if (results.length >= 20) {
    results.sort((a, b) => a.confidence - b.confidence);
    var half = Math.floor(results.length / 2);
    let result = results[half];
    replySuccess(result.time, result.confidence);
    return;
  }
  
  let rect = getRect(mode);
  if (!rect) return replyError('No rectangle');
  
  if (video.currentTime <= 0 || video.paused || video.ended || video.readyState < 3) {
    replyError('Video not playing');
    return;
  }
  
  let canvas = document.createElement('canvas');
  /**
  let canvasScale = 1 / Math.min(1, rect.w/256, rect.h/257);
  canvas.width = Math.floor(rect.w * canvasScale);
  canvas.height = Math.floor(rect.h * canvasScale);
  */
  canvas.width = rect.w;
  canvas.height = rect.h;
  canvas.style.position = 'absolute';
  canvas.style.top = '-9999px';
  canvas.style.left = '-9999px';
  document.body.appendChild(canvas);
  let ctx = canvas.getContext('2d');
  logger.info(JSON.stringify({w: canvas.width, h: canvas.height}));
  
  let videoWidth = video.videoWidth;
  let videoHeight = video.videoHeight;
  let scaleX = videoWidth / 1920;
  let scaleY = videoHeight / 1080;
  
  let sx = Math.floor(rect.x * scaleX);
  let sy = Math.floor(rect.y * scaleY);
  let sWidth = Math.floor(rect.w * scaleX);
  let sHeight = Math.floor(rect.h * scaleY);
  let dx = 0;
  let dy = 0;
  let dWidth = canvas.width;
  let dHeight = canvas.height;
  ctx.drawImage(video, sx, sy, sWidth, sHeight, dx, dy, dWidth, dHeight);
  let endTime = Date.now();
  let duration = endTime - startTime;
  let image = canvas.toDataURL();
  canvas.remove();
  
  let ocrResult = await ocr(image);
  
  let text = ocrResult.data.text;
  let confidence = ocrResult.data.confidence;
  let time = parseTime(text);
  if (time !== undefined) {
    time = time - duration;
    results.push({time, confidence});
    logger.info(`Recognized ${text} as time`);
  } else {
    errors.push(text);
    logger.error(`Did not recognize ${text}`);
  }

  nodecg.sendMessage('timer-ocr-progress', JSON.stringify({num, results: results.length, errors: errors.length}));
  
  let thisInvocationDuration = Date.now() - thisInvocationStartedAt;
  let waitFor = 50 - thisInvocationDuration;
  if (waitFor > 0) {
    await new Promise(r => setTimeout(r, waitFor));
  }
  
  performOCR(syncId, mode, startTime, results, errors);
}

/**
  shamely taken from sync timer
*/
let timer = (function() {
  let result = {};
  let offsets = [];
  function requestOffset() {
    let request = new XMLHttpRequest();
    let sentAt, receivedAt;

    request.open("GET", "/time");
    request.onreadystatechange = function() {
      if ((this.status == 200) && (this.readyState == this.HEADERS_RECEIVED)) {
        receivedAt = Date.now();
      }
    };

    request.onload = function() {
      if (this.status == 200) {
        try {
          receivedOffset(JSON.parse(this.response).time + ((receivedAt - sentAt) / 2) - receivedAt);
        } catch (e) {
          console.log(e);
        }
      }
    };

    sentAt = Date.now();
    request.send();
  }

  function receivedOffset(offset) {
    // keep only last 20
    offsets.push(offset);
    if (offsets.length > 20) {
      offsets.shift();
    }

    // remove outliers
    let sortedOffsets = offsets.slice().sort(function(a, b) {
      return a - b;
    });
    if (sortedOffsets.length > 10) {
      sortedOffsets = sortedOffsets.slice(1, -1);
    }
    if (sortedOffsets.length > 2) {
      sortedOffsets = sortedOffsets.slice(1, -1);
    }

    let sum = 0;
    for(var i = 0; i < sortedOffsets.length; i++) {
      sum += sortedOffsets[i];
    }
    let newOffset = Math.floor(sum/sortedOffsets.length);
    result.offset = newOffset;
  }

  setInterval(requestOffset, 1000);
  return result;
})();






/**
  Commentary sync
*/

/**
let selfFragments = {};
let restreamerFragments = {};
if (mode == MODE_COMMENTARY) {
  nodecg.listenFor('streamTime-'+num, (value) => {
    restreamerFragments[value.relurl] = value.time;
    syncOnFragment(value.relurl);
  });
}

function onFragmentChange(event, data) {
  let now = Date.now() + timer.offset;
  logger.trace(`onFragmentChange: relurl=${data.frag.relurl}, time=${now}`);
  if (mode == MODE_RESTREAMER) {
    let result = {};
    nodecg.sendMessage('streamTime-'+num, {
      relurl: data.frag.relurl,
      time: now
    });
  } else {
    selfFragments[data.frag.relurl] = now;
    syncOnFragment(data.frag.relurl);
  }
}

let isSyncing = false;
const SYNC_TIME = 2000;
const SYNC_MAX_SPEED = 2;
const SYNC_MIN_SPEED = 0.2;
function syncOnFragment(relurl) {
  let actual = selfFragments[relurl];
  let expected = restreamerFragments[relurl];
  if (!actual || !expected) {
    return;
  }
  
  // YES this can memory leak on the commentary end
  // in practice it's going to need to store to be a problem:
  // 10k+ fragments = ~40k seconds = ~10 hours
  // if you keep up the page for 10 hours, that's your problem, not mine
  
  //delete selfFragments[relurl];
  //delete restreamerFragments[relurl];
  if (!hls) {
    return;
  }
  
  if (isSyncing) {
    return;
  }
  
  let difference = Math.abs(actual - expected);
  isSyncing = true;
  setTimeout(function() {
    isSyncing = false;
    video.playbackRate = 1;
  }, 2000);
  let speed = 1 + (actual - expected)/SYNC_TIME;
  speed = Math.min(speed, SYNC_MAX_SPEED);
  speed = Math.max(SYNC_MIN_SPEED, speed);
  logger.info(`sync: speed=${speed}, difference=${difference}`);
  video.playbackRate = speed;
}
*/
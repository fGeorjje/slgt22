let nodecg;
let streamPlayerData;
let syncId = 0;
let responses, options;
let successCount, errorCount;

module.exports = (_nodecg) => {
  nodecg = _nodecg;
  streamPlayerData = nodecg.Replicant('streamPlayerData');
  nodecg.listenFor('stream-sync', (data) => startSync(data));
  nodecg.listenFor('timer-ocr-init-response', (data) => onInitResponse(data));
  nodecg.listenFor('timer-ocr-response', (data) => onResponse(data));
};

function checkId(id) {
  return syncId == id;
}

function debug(str) {
  nodecg.log.info(`[stream-sync-debug] ${str}`);
}

function progress(str) {
  nodecg.sendMessage('timer-ocr-progress', str);
  nodecg.log.info(`[stream-sync] ${str}`);
}

function startSync(_options) {
  syncId++;
  responses = [];
  options = _options
  if (!options) options = {};
  if (!options.delay) options.delay = 2000;
  if (!options.mode) options.mode = 'rta';
  if (!options.duration) options.duration = 30000;
  if (!options.minStreamBuffer) options.minStreamBuffer = 1000;
  successCount = 0;
  errorCount = 0;
  nodecg.sendMessage('timer-ocr-init-request', syncId);
  progress(`streamSync start with ID ${syncId} and options ${JSON.stringify(options)}`);
}

function onInitResponse(data) {
  if (!checkId(data.syncId)) return;
  responses.push(null);
  if (!data.isMaster) return;
  let targetTime = data.currentTime + options.delay;
  let mode = options.mode;
  nodecg.sendMessage('timer-ocr-request', {targetTime, syncId, mode});
  progress(`Initial response received. OCR scheduled for target time ${targetTime}`);
}

function difference(time1, time2) {
  debug(`Calculating difference - ${time1} - ${time2}`);
  let diff = time2 - time1;
  let absDiff = Math.abs(diff);
  if (absDiff > 540000 && options.mode == 'rta') {
    debug(`Calculating difference - ${time1} - ${time2} - WRAPAROUND`);
    // assume wraparound
    // if difference was positive (time2 > time1), then time2 is behind (so report negative)
    // if difference was negative (time2 < time1), then time2 is ahead (so report positive)
    // -> invert sign of diff
    return -Math.sign(diff) * (600000 - absDiff);
  }
    
  if (absDiff > 120000) {
    debug(`Calculating difference - ${time1} - ${time2} - ERROR`);
    // assume something has gone wrong if absDiff is over 2 minutes
    return 'ERR-DIFF-TOO-BIG: ' + diff;
  }
  
  debug(`Calculating difference - ${time1} - ${time2} - SUCCESS - ${diff}`);
  return diff;
}

function onResponse(data) {
  if (!checkId(data.syncId)) return;
  progress(`Received OCR response: ${JSON.stringify(data)}`);
  responses[data.num] = data;
  if (responses.every(d => !!d)) onAllDataReceived();
}

function computeBufferedDiffs(diffs, buffers) {
  debug('Computing buffered diffs from raw: ' + JSON.stringify(diffs));
  let buffersAfter = diffs.map((diff, i) => diff + buffers[i]);
  debug('buffersAfter=' + JSON.stringify(buffersAfter));
  let minBufferAfter = Math.min(...buffersAfter);
  debug('minBufferAfter=' + minBufferAfter);
  let canReduceBy = minBufferAfter - options.minStreamBuffer;
  debug('canReduceBy=' + canReduceBy);
  let reducedDiffs = diffs.map(diff => diff - canReduceBy);
  debug('reducedDiffs=' + JSON.stringify(reducedDiffs));
  
  let minReducedDiff = Math.min(...reducedDiffs);
  debug('minReducedDiff=' + minReducedDiff);
  if (minReducedDiff > 0) {
    reducedDiffs = reducedDiffs.map(diff => diff - minReducedDiff);
    debug('reducedDiffs=' + JSON.stringify(reducedDiffs));
  }
  
  let maxReducedDiff = Math.max(...reducedDiffs);
  debug('maxReducedDiff=' + maxReducedDiff);
  if (maxReducedDiff < 0) {
    reducedDiffs = reducedDiffs.map(diff => diff - maxReducedDiff);
    debug('reducedDiffs=' + JSON.stringify(reducedDiffs));
  }
  
  return reducedDiffs;
}

function computeSync(diff) {
  debug('Computing sync for ' + diff);
  if (diff == 0) {
    debug('null sync');
    return {duration: 0, speed: 1};
  }
  let absDiff = Math.abs(diff);
  let duration = Math.abs(diff * 10);
  if (duration > options.duration) {
    duration = options.duration;
  }
  // math:
  // 1(duration) - (speed)(duration) = (diff)
  // (1 - (speed))(duration) = (diff)
  // 1 - (speed) = (diff)/(duration)
  // 0 - (speed) = (diff)/(duration) - 1
  // (speed) - 0 = 1 - (diff)/(duration)
  speed = 1 - diff/duration;
  
  if (speed < 0) {
    speed = 0;
    duration = diff;
  }
  
  let result = {duration, speed};
  debug('Computing sync for ' + diff + ': ' + JSON.stringify(result));
  return result;
}

function handleAudio(syncs) {
  debug('Handling audio using ' + JSON.stringify(syncs));
  let oldAudio = streamPlayerData.value.map((data, i) => {
    if (data.activeAudio)
      return i;
    else
      return undefined;
  }).filter(num => num !== undefined)[0];
  
  let pDiffs = syncs.map(sync => sync.speed).map(speed => {
    if (speed > 1) 
      return speed;
    else 
      return 1/speed;
  });
  
  if (oldAudio === undefined || pDiffs[oldAudio] < 1.15) return undefined;

  debug('pDiffs=' + JSON.stringify(pDiffs));
  let bestAudio = pDiffs.indexOf(Math.min(...pDiffs));
  debug('bestAudio=' + JSON.stringify(bestAudio));
  switchAudio(bestAudio);
  setTimeout(() => switchAudio(oldAudio), syncs[oldAudio].duration);
}

function switchAudio(num) {
  debug('Switching audio to' + num);
  let data = JSON.parse(JSON.stringify(streamPlayerData.value));
  data.forEach(d => d.activeAudio = false);
  data[num].activeAudio = true;
  streamPlayerData.value = data;
}

function executeSync(sync, num) {
  debug('Executing sync on ' + num + ': ' + JSON.stringify(sync));
  nodecg.sendMessage('player-speed', Object.assign({}, sync, {num}));
}

function onAllDataReceived() {
  let errors = [];
  for (const response of responses) {
    if (response.result.error) {
      errors.push(response.result.error);
    }
  }
  
  if (errors.length > 0) {
    progress(`All data received. Errors: ${errors}`);
    return;
  }
  
  let times = responses.map(r => r.result.time);
  let buffers = responses.map(r => r.buffer * 1000);
  let rawDiffs = times.map(time => difference(times[0], time));
  errors = rawDiffs.filter(diff => typeof diff !== 'number');
  if (errors.length > 0) {
    progress(`All data received. Errors: ${errors}`);
    return;
  }
  
  let bufferedDiffs = computeBufferedDiffs(rawDiffs, buffers);
  let syncs = bufferedDiffs.map(diff => computeSync(diff));
  
  handleAudio(syncs);
  syncs.forEach(executeSync);
  progress('SYNC ACTIVE: ' + syncs.map((sync, num) => {
    return `#${num}/${(sync.duration/1000).toFixed(1)}s/${sync.speed.toFixed(2)}x`
  }).join('|'));
}



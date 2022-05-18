let modules = [HlsModule, TwitchModule, VdoNinjaModule].map(m => new m());
let currentModule;

let logger = new DualLogger();

let streamPlayerData = nodecg.Replicant('streamPlayerData');
let num = parseInt(document.location.hash.substring(1, 2));
logger.info('Loading stream player #' + num);

nodecg.listenFor('reload-player', (data) => {
  if (data == num) {
    location.reload();
  }
});

// https://stackoverflow.com/a/37643453
function currentModuleSupports(prop) {
  let obj = currentModule;
  let desc;
  do {
    desc = Object.getOwnPropertyDescriptor(obj, prop);
  } while (!desc && (obj = Object.getPrototypeOf(obj)));
  return !!desc;
}

nodecg.listenFor('player-speed', (data) => {
  if (data.num != num) return;
  if (data.speed !== undefined && data.duration) {
    if (!currentModuleSupports('playbackRate'))
      return;
    
    currentModule.playbackRate = data.speed;
    if (data.duration < 0) return;
    setTimeout(function() {
      currentModule.playbackRate = 1;
    }, data.duration);
  }
  
  if (data.seek && currentModuleSupports('currentTime')) {
    video.currentTime = data.seek;
  }
});

let cheeseMeme = document.getElementById('cheese-meme');
cheeseMeme.onended = () => {
  cheeseMeme.style.display = 'none';
};
nodecg.listenFor('cheese-meme', (data) => {
  if (data.num !== num) return;
  cheeseMeme.currentTime = 0;
  cheeseMeme.play();
  cheeseMeme.style.display = 'block';
});

streamPlayerData.on('change', async (newVal, oldVal) => {
  let ourNewVal;
  let ourOldVal;
  if (newVal) ourNewVal = newVal[num];
  if (oldVal) ourOldVal = oldVal[num];
  await update(ourNewVal, ourOldVal);
});

async function update(newVal, oldVal) {
  async function ifChanged(attr, callback) {
    if (!oldVal || (oldVal[attr] !== newVal[attr])) {
      await callback();
    }
  }
  
  function updateClassForElements() {
    let elements = [
      [currentModule.element, false], 
      [document.getElementById('background-video-player'), false],
    ];
    elements.forEach(e => updateClassForElement(e[0], e[1]));
  }
  
  function updateClassForElement(el, reverse) {
    let console = newVal.console;
    if (reverse) console = !console;
    if (console) {
      el.classList.remove(`standard`);
      el.classList.add(`console`);
    } else {
      el.classList.remove(`console`);
      el.classList.add(`standard`);
    }
  }
  
  function updateVolume() {
    if (!newVal.activeAudio) {
      currentModule.volume = 0;
      return;
    }
    
    let volume = newVal.volume/100;
    if (currentModule === HlsModule)
      volume = Math.pow(2, volume*5)-1

    currentModule.volume = volume;
  }
  
  await ifChanged('target', async () => {
    let [modulePrefix, ...stream] = newVal.target.split('/');
    stream = stream.join('/');
    let module = modules.find(m => m.prefix === modulePrefix);
    
    if (currentModule !== module) {
      if (currentModule) {
        currentModule.destroy();
        currentModule.element.innerHTML = '';
        currentModule.element.remove();
      }
      currentModule = module;
      await module.init((e) => {
        e.classList.add('video-player');
        e.classList.add(module.prefix.replace('.', '_'));
        e.style.opacity = 0;
        document.body.appendChild(e);
      });
    }
    
    await module.loadStream(stream);
    updateClassForElements();
    updateVolume();
    module.element.style.opacity = 1;
  });
  
  ifChanged('console', updateClassForElements);
  ifChanged('activeAudio', updateVolume);
  ifChanged('volume', updateVolume);
}

nodecg.listenFor('timer-ocr-init-request', (syncId) => {
  let isMaster = num == 0;
  if (!isMaster) {
    nodecg.sendMessage('timer-ocr-init-response', {isMaster, syncId});
    return;
  }
  let currentTime = Date.now() + Timer.offset;
  nodecg.sendMessage('timer-ocr-init-response', {isMaster, syncId, currentTime});
  logger.info(`Sending init response with ${currentTime}`);
});

nodecg.listenFor('timer-ocr-request', (data) => {
  logger.info(`Timer OCR request`);
  let targetTime = data.targetTime;
  let currentTime = Date.now() + Timer.offset;
  let delay = targetTime - currentTime;
  if (delay < 0) delay = 0;
  logger.info(`Performing OCR in ${delay}`);
  setTimeout(async () => performOCR(data.syncId, data.mode, Date.now()), delay);
});

function parseTime(text, mode) {
  if (!text) {
    return undefined;
  }
 
  let rawDigits = text.replace(/[^0-9\:\.]/g, '')
    .split(/[\:\.]/g)
    .reverse();
  let digits = rawDigits.map(d => parseInt(d));
  if (digits.some(d => isNaN(d) || d >= 100)) {
    return undefined;
  }
  
  let [decis=0, seconds=0, minutes=0, hours=0] = digits;
  let time = 0;
  if (rawDigits[0].length == 2) {
    decis = Math.floor(decis/10);
  }
  
  if (mode == 'rta') {
    // only get first digit of minutes in RTA mode and ignore others
    minutes = minutes % 10;
    hours = 0;
  }
  
  time += decis     * 100             ;
  time += seconds   * 1000            ;
  time += minutes   * 1000 * 60       ;
  time += hours     * 1000 * 60 * 60  ;
  return time;
}

function getRect(mode) {
  let isConsole = currentModule.element.className.includes('console');
  if (mode == 'rta' && !isConsole) return { x: 1320, y: 920, w: 600, h: 160};
  if (mode == 'igt' && !isConsole) return { x: 0, y: 900, w: 966, h: 180};
  if (mode == 'igt' && isConsole) return { x: 30, y: 60, w: 210, h: 50};
  return undefined;
}

let ocr;
async function performOCR(syncId, mode, startTime, results=[], errors=[]) {
  function reply(result) {
    let buffer = currentModule.buffer;
    let response = {num, syncId, buffer, result};
    logger.info(`Reply OCR ${JSON.stringify(response)}`);
    nodecg.sendMessage('timer-ocr-response', response);
  }

  let replyError = (error) => reply({error});
  
  if (!currentModuleSupports('playbackRate')) {
    replyError('current module does not support changing speed');
    return;
  }
  
  if (!currentModuleSupports('capture')) {
    replyError('current module does not support capture');
    return;
  }

  if (errors.length >= 25) {
    replyError('25xParse fail: ' + errors.join('|'));
    return;
  }
  
  if (results.length >= 10) {
    results.sort((a, b) => a.confidence - b.confidence);
    var half = Math.floor(results.length / 2);
    let result = results[half];
    reply(result);
    return;
  }
  
  let rect = getRect(mode);
  if (!rect) return replyError('No rectangle');
  
  let image;
  try {
    image = await currentModule.capture(rect);
  } catch (error) {
    replyError(`error during capture: ${error}`);
    return;
  }
  
  let endTime = Date.now();
  let duration = endTime - startTime;
  
  if (!ocr) {
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
  }

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
  
  performOCR(syncId, mode, startTime, results, errors);
}
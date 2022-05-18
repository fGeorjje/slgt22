// create DOM for player control
const NUM_PLAYERS = 4;
let defaultStreamPlayerData = [];
let streamPlayerData = nodecg.Replicant('streamPlayerData', { defaultValue: defaultStreamPlayerData });
let container = document.getElementById('controls');
for (let i = -1; i < NUM_PLAYERS; i++) {
  function createElement(html, type) {
    let element = document.createElement(html);
    let id = type + '-' + i;
    element.id = id;
    element.className = type;
    return element;
  }
  
  function createLabelFor(element, text) {
    let label = createElement('label', 'label-' + element.className);
    label.for = element.id;
    label.innerHTML = text;
    return label;
  }

  if (i == -1) {
    function createLabel(text, start, end) {
      let element = createElement('span');
      element.innerText = text;
      element.style.gridColumnStart = start;
      element.style.gridColumnEnd = end;
      container.appendChild(element);
    } 

    createLabel('Target Stream / Is Console', 1, 4);
    createLabel('Active Audio / Audio Levels', 4, 6);
    continue;
  }

  defaultStreamPlayerData.push({ target: '', volume: 0, console: false, activeAudio: i == 0 });

  
  
  
  let target = createElement('input', 'target');
  target.keyup = function(event) {
    if (event.key === "Enter") {
      streamPlayerData.value[i].target = target.value;
    }
  }
  
  let activeAudio = createElement('input', 'activeAudio');
  activeAudio.type = 'radio';
  activeAudio.name = 'activeAudio';
  activeAudio.onchange = function() {
    // need to change all at once
    let data = JSON.parse(JSON.stringify(streamPlayerData.value));
    for (let i = 0; i < NUM_PLAYERS; i++) {
      data[i].activeAudio = activeAudioElements[i].checked;
    }
    streamPlayerData.value = data;
  }
  let audioLabel = createLabelFor(activeAudio, 'Audio');
  //audioLabel.style.margin = "0px 0px 0px 10px";
  
  let volume = createElement('input', 'volume');
  volume.type = 'range';
  volume.min = 0;
  volume.max = 100;
  volume.value = 0;
  volume.onchange = function() {
    streamPlayerData.value[i].volume = volume.value;
  }
  
  let console = createElement('input', 'console');
  let consoleLabel = createLabelFor(console, 'Console');
  //consoleLabel.style.margin = "0px 0px 0px 10px";
  console.type = 'checkbox';
  console.onclick = function() {
    streamPlayerData.value[i].console = console.checked;
  }

  let reload = createElement('button', 'console');
  reload.innerText = '🔄';
  reload.onclick = function() {
    nodecg.sendMessage('reload-player', i);
  }
  
  container.appendChild(target);
  container.appendChild(console);
  container.appendChild(reload);
  //container.appendChild(audioLabel);
  container.appendChild(volume);
  container.appendChild(activeAudio);
  //container.appendChild(consoleLabel);
  //container.appendChild(document.createElement('br'));
  //document.getElementById('controls').appendChild(container);
}

// initialize update button & update listeners
let targetElements = document.getElementsByClassName('target');
let volumeElements = document.getElementsByClassName('volume');
let consoleElements = document.getElementsByClassName('console');
let activeAudioElements = document.getElementsByClassName('activeAudio');
document.getElementById('update-all').onclick = function() {
  let targets = Array.from(targetElements, e => e.value);
  let volumes = Array.from(volumeElements, e => e.value);
  let consoles = Array.from(consoleElements, e => e.checked);
  let activeAudio = Array.from(activeAudioElements, e => e.checked);
  let result = [];
  for (let i = 0; i < targets.length; i++) {
    result.push({
      'target': targets[i],
      'volume': volumes[i],
      'console': consoles[i],
      'activeAudio': activeAudio[i]
    });
  }
  streamPlayerData.value = result;
}
streamPlayerData.on('change', (newVal, oldVal) => {
  if (newVal.length != NUM_PLAYERS) {
    console.log(JSON.stringify(newVal));
    console.log(NUM_PLAYERS);
    streamPlayerData.value = defaultStreamPlayerData;
    return;
  }
  
  for (let i = 0; i < newVal.length; i++) {
    targetElements[i].value = newVal[i].target;
    volumeElements[i].value = newVal[i].volume;
    consoleElements[i].checked = newVal[i].console;
    activeAudioElements[i].checked = newVal[i].activeAudio;
  }
});


document.getElementById('reload-all').onclick = function() {
  for (let i = 0; i < NUM_PLAYERS; i++) {
    nodecg.sendMessage('reload-player', i);
  }
}

document.getElementById('play-all').onclick = function() {
  for (let num = 0; num < NUM_PLAYERS; num++) {
    nodecg.sendMessage('player-speed', {num, speed: 1, duration: -1});
  }
}

document.getElementById('sync-rta').onclick = function() {
  nodecg.sendMessage('stream-sync', {mode: 'rta'});
}
document.getElementById('sync-igt').onclick = function() {
  nodecg.sendMessage('stream-sync', {mode: 'igt'});
}
nodecg.listenFor('timer-ocr-progress', (value) => {
  document.getElementById('sync-message').innerText = value;
});
document.getElementById('player-speed').onclick = function() {
  let input = document.getElementById('player-speed-input');
  let [num, speed, duration, mode] = input.value.split('/');
  num = parseInt(num);
  speed = parseFloat(speed);
  duration = parseInt(duration);
  if ([num, speed, duration].some(n => isNaN(n))) {
    input.value = 'num/speed/duration/[mode]';
    setTimeout(() => input.value = '0/1.25/10000', 2000);
    return;
  }
  nodecg.sendMessage('player-speed', {num, speed, duration, mode});
}

for (let i = 0; i < 4; i++) {
  document.getElementById('cheese'+i).onclick = function() {
    nodecg.sendMessage('cheese-meme', {num: i});
  }
}
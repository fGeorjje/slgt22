// create DOM for compressor filters
const compressorControls = document.getElementById('compressorControls');
for (let i = 0; i < 3; i++) {
  compressorControls.appendChild(document.createElement('br'));
  
  let topDiv = document.createElement('div');
  topDiv.innerText = 'Compressor #'+(i+1);
  compressorControls.appendChild(topDiv);
  
  let replicant = nodecg.Replicant('compressorSettings'+i, { defaultValue: {
    threshold: -50,
    knee: 0,
    ratio: 1,
    attack: 0,
    release: 0.1,
    aftergain: 1
  }});
  function createInput(name, min, max, scale=1, displayname) {
    if (!displayname) displayname = name;
    
    let id = 'compressorControl' + i + name;
    let input = document.createElement('input');
    let label = document.createElement('label');
    input.id = id;
    label.for = id;
    label.id = id + '-label';
    label.innerText = min*scale + ' | ' + name;
    input.scale = scale;
    input.min = min;
    input.max = max;
    input.value = min;
    input.type = 'range';
    input.onchange = function() {
      replicant.value[name] = input.value*scale;
    }
    input.oninput = function() {
      label.innerText = input.value*scale + ' | ' + displayname;
    }
    compressorControls.appendChild(label);
    compressorControls.appendChild(document.createElement('br'));
    compressorControls.appendChild(input);
    compressorControls.appendChild(document.createElement('br'));
  }
  
  createInput('threshold', -100, 0);
  createInput('knee', 0, 50);
  createInput('ratio', 0, 100, 0.1);
  createInput('attack', 0, 100, 0.01);
  createInput('release', 0, 100, 0.01);
  createInput('aftergain', 0, 100, 0.02);
  
  replicant.on('change', (newVal) => {
    for (const key in newVal) {
      let input = document.querySelector('#compressorControl' + i + key);
      let label = document.querySelector('#compressorControl' + i + key + '-label');
      let scale = parseFloat(input.scale);
      input.value = Math.floor(newVal[key] / scale);
      label.innerText = newVal[key] + ' | ' + key;
    }
  });
}
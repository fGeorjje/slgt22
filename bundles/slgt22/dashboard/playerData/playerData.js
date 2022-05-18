let nextRowId = 0;
let playerData = nodecg.Replicant('player-data');
playerData.on('change', (newValue, oldValue) => {
  setup(newValue);
});

function setup(playerData) {
  document.body.innerHTML = '';
  
  let inputRows = [];
  
  let submitEditsButton = document.createElement('button');
  submitEditsButton.innerHTML = 'Submit edits';
  submitEditsButton.onclick = function() {
    let result = [];
    for (const inputRow of inputRows) {
      let name = inputRow[0].value;
      let discord = inputRow[1].value;
      let pronouns = inputRow[2].value;
      let twitch = inputRow[3].value;
      let twitter = inputRow[4].value;
      let isRunner = inputRow[5].checked;
      let isCommentator = inputRow[6].checked;
      
      if (!name) {
        continue;
      }
      
      let obj = {};
      obj.name = name;
      obj.discord = discord;
      if (pronouns) {
        obj.pronouns = pronouns;
      }
      if (twitch) {
        obj.twitch = twitch;
      }
      if (twitter) {
        obj.twitter = twitter;
      }
      obj.isRunner = isRunner;
      obj.isCommentator = isCommentator;
      result.push(obj);
    }
    
    result.sort(function(a, b) {
      var nameA = a.name.toLowerCase();
      var nameB = b.name.toLowerCase();
      if (nameA < nameB) {
        return -1;
      }
      if (nameA > nameB) {
        return 1;
      }

      return 0;
    });
    
    nodecg.sendMessage('update-player-data', result);
  }
  document.body.appendChild(submitEditsButton);
  
  let addEntryButton = document.createElement('button');
  let firstLineBreak = document.createElement('br');
  addEntryButton.innerHTML = 'Add Entry';
  addEntryButton.onclick = function() {
    let row = createRow({
      'name': '',
      'discord': '',
      
    });
    inputRows.push(row.inputs);
    document.body.insertBefore(row.container, firstLineBreak.nextSibling);
  }
  

  document.body.appendChild(addEntryButton);
  document.body.appendChild(firstLineBreak);
  document.body.appendChild(firstLineBreak);
  
  for (const player of playerData) {
    let row = createRow(player);
    inputRows.push(row.inputs);
    document.body.appendChild(row.container);
  }
  
}

function createRow(player) {
  let inputs = [];
  let elements = [];
  function createInput(id, value, isCheckbox=false) {
    let input = document.createElement('input');
    let label = document.createElement('label');
    let adjustedId = id + '-' + nextRowId;
    input.id = adjustedId;
    if (!isCheckbox) {
      if (value) {
        input.value = value;
      }
    } else {
      input.type = 'checkbox';
      input.checked = value;
    }
    label.for = adjustedId;
    label.innerHTML = id;
    elements.push(label);
    elements.push(input);
    inputs.push(input);
  }

  createInput('name', player.name);
  createInput('discord', player.discord);
  createInput('pronouns', player.pronouns);
  createInput('twitch', player.twitch);
  createInput('twitter', player.twitter);
  createInput('runner', player.isRunner, true);
  createInput('commentator', player.isCommentator, true);
  elements.push(document.createElement('br'));
  nextRowId++;
  
  let container = document.createElement('span');
  for (const element of elements) {
    container.appendChild(element);
  }
  return {
    'inputs': inputs,
    'container': container
  }
}


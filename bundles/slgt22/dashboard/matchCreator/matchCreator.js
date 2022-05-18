let playerData = nodecg.Replicant('player-data');
playerData.on('change', (newValue, oldValue) => {
  setup(newValue);
});

let runnerSelects = ['runner-1', 'runner-2', 'runner-3', 'runner-4'];
let commentatorSelects = ['commentator-1', 'commentator-2', 'commentator-3']
let button = document.getElementById('button');
button.onclick = function() {
  let runners = getPlayers(runnerSelects);
  let commentators = getPlayers(commentatorSelects);
  let bracketAndRound = document.getElementById('bracketAndRound').value;
  let time = document.getElementById('time').value;
  let runData = {};
  runData.game = bracketAndRound;
  runData.category = time;
  runData.teams = [];
  runners.forEach((runner) => runData.teams.push(toSpeedcontrolTeam(runner)));
  runData.teams.push(createCommentaryTeam(commentators, 'Commentators'));
  runData.id = 'match-' + (bracketAndRound + '--' + time).replace(/[^A-Za-z0-9-_:\.]/g, '-');
  nodecg.sendMessageToBundle('modifyRun', 'nodecg-speedcontrol', {
    'runData': runData
  });
}

function createCommentaryTeam(commentators, teamName) {
  if (commentators.length == 0) {
    commentators = [{name: 'N/A'}];
  }
  let result = {};
  result.name = teamName;
  result.id = teamName;
  result.players = commentators.map((c) => toSpeedcontrolPlayer(c, teamName));
  return result;
}

function toSpeedcontrolTeam(player) {
  let result = {};
  result.name = player.name;
  result.id = player.name;
  result.players = [toSpeedcontrolPlayer(player, player.name)];
  return result;
}

function toSpeedcontrolPlayer(player, teamID) {
    let result = {};
    result.name = player.name;
    result.id = player.name;
    result.teamID = player.name;
    result.pronouns = player.pronouns;
    if (player.twitch) {
      result.social = {};
      result.social.twitch = player.twitch;
    }
    result.customData = {};
    result.customData.discord = player.discord;
    if (player.twitter) {
      result.customData.twitter = player.twitter;
    }
    return result;
}

function getPlayers(selectIds) {
  let result = [];
  for (const selectId of selectIds) {
    let name = document.getElementById(selectId).value;
    let player = getPlayer(name);
    if (player) {
      result.push(player);
    }
  }
  return result;
}

function setupSelections(ids, choices) {
  for (const id of ids) {
    setupSelection(id, choices);
  }
}

function getPlayer(name) {
  for (const player of playerData.value) {
    if (player.name == name) {
      return player;
    }
  }
  alert(`Could not find player with name ${name}!`);
  return null;
}

function setup(playerData) {
  let runners = ['N/A'];
  let commentators = ['N/A'];
  
  for (const player of playerData) {
    if (player.isRunner) {
      runners.push(player.name);
    }
    if (player.isCommentator) {
      commentators.push(player.name);
    }
  }
  
  setupSelections(runnerSelects, runners);
  setupSelections(commentatorSelects, commentators);
}



function setupSelection(id, choices) {
  let selectElement = document.getElementById(id);
  selectElement.innerHTML = '';
  for (const choice of choices) {
    let option = document.createElement('option');
    option.value = choice;
    option.innerHTML = choice;
    selectElement.appendChild(option);
  }
}

document.getElementById('massimport-button').onclick = function() {
  const text = document.getElementById('massimport').value;
  const lines = text.split(/\r?\n/);
  lines.forEach(line => {
    console.log(line);
    let [round, time, p1, p2, p3, p4, c1, c2] = line.split(/\t/);
    round = round.replace(/\s+Bracket/, '');
    let [,month, day, hour, minute] = /(\d+)\/(\d+)\/\d+ (\d+):(\d+)/.exec(time);
    
    month = parseInt(month)-1;
    hour = parseInt(hour);
    minute = parseInt(minute);
    
    month = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", 
             "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][month];

    let suffix = hour < 12 ? 'am' : 'pm';
    hour = hour.toFixed(0).padStart(2, '0');
    minute = minute.toFixed(0).padStart(2, '0');
    
    time = `${month} ${day}, ${hour}:${minute}${suffix} EST`;

    let runners = [p1, p2, p3, p4].filter(p => !!p).map(p => getPlayer(p)).filter(p => !!p);
    if (runners.length == 4) {
      runners = [runners[0], runners[2], runners[1], runners[3]];
    }
    const commentators = [c1, c2].filter(p => !!p).map(p => getPlayer(p)).filter(p => !!p);
    let runData = {};
    runData.game = round;
    runData.category = time;
    runData.teams = [];
    runners.forEach((runner) => runData.teams.push(toSpeedcontrolTeam(runner)));
    runData.teams.push(createCommentaryTeam(commentators, 'Commentators'));
    runData.id = `${round}${time}`.replace(/[^A-Za-z0-9]/g, 'xxx').toLowerCase();
    nodecg.sendMessageToBundle('modifyRun', 'nodecg-speedcontrol', {
      'runData': runData
    });
    console.log(JSON.stringify(runData));
  });
}
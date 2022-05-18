function setupTimerDuration() {
  let replicant = nodecg.Replicant('timer-duration');
  let element = document.getElementById('timer-duration');
  replicant.on('change', (newVal, oldVal) => {
    if (!newVal) return;
    element.value = newVal;
  });

  document.getElementById('timer-duration-button').onclick = function() {
    let parsed = parseInt(element.value);
    if (isNaN(parsed)) {
      element.value = 'Must be a number';
      setTimeout(function() {
        element.value = '10';
      }, 1000);
      return;
    }
    replicant.value = parsed;
  }
}

function setupTimerMode() {
  let replicant = nodecg.Replicant('timer-mode');
  let element = document.getElementById('timer-mode');
  replicant.on('change', (newVal, oldVal) => {
    if (!newVal) return;
    element.value = newVal;
  });

  element.onchange = function() {
    replicant.value = element.value;
  }
}

function setupInfoText() {
  let replicant = nodecg.Replicant('info-text');
  let element = document.getElementById('info-text');
  replicant.on('change', (newVal, oldVal) => {
    if (!newVal) return;
    element.value = newVal;
  });

  document.getElementById('info-text-button').onclick = function() {
    replicant.value = element.value;
  }
  
  const speedcontrolBundle = 'nodecg-speedcontrol';

  // setup next run / on deck
  let runDataActiveRun = nodecg.Replicant('runDataActiveRun', speedcontrolBundle);

  document.getElementById('info-text-default').onclick = function() {
    let run = runDataActiveRun.value;
    let players = run.teams.slice(0, -1).map(team => team.players[0].name);
    let separator;
    let infoText;
    if (players.length == 2) {
      infoText = players.join(' vs ');
    } else {
      infoText = players.join(', ');
    }
    infoText = run.game + ' - ' + infoText;
    replicant.value = infoText;
  }
}

setupTimerDuration();
setupTimerMode();
setupInfoText();
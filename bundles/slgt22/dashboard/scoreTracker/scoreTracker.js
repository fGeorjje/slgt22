const runDataActiveRun = nodecg.Replicant('runDataActiveRun', 'nodecg-speedcontrol');
const scoreData = nodecg.Replicant('scoreData', { defaultValue: {
  scores: [0, 0, 0, 0],
  needed: 2
} });

NodeCG.waitForReplicants(runDataActiveRun, scoreData).then(() => {
  const scores = document.getElementsByClassName('score');

  function updateScore(i,delta) {
    let oldScore = parseInt(scores[i].innerText);
    let newScore = oldScore + delta;
    newScore = Math.max(0, newScore);
    if (i != 4) newScore = Math.min(newScore, parseInt(scores[4].innerText));
    if (oldScore == newScore) return;
    setScore(i, newScore);
  }
  
  function setScore(i,newScore) {
    scores[i].innerText = newScore;
    if (i != 4) {
      scoreData.value.scores[i] = newScore;
    } else {
      scoreData.value.needed = newScore;
    }
  }

  for (let i = 0; i < 5; i++) {
    document.getElementsByClassName('add')[i].onclick = function() {
      updateScore(i, 1);
    }
    document.getElementsByClassName('minus')[i].onclick = function() {
      updateScore(i, -1);
    }
  }

  function updateAll(scoreDataVal, runDataActiveRunVal) {
    if (!scoreDataVal) scoreDataVal = scoreData.value;
    if (!runDataActiveRunVal) runDataActiveRunVal = runDataActiveRun.value;
    let playerCount = runDataActiveRunVal.teams.length - 1
    for (let i = 0; i < 4; i++) {
      scores[i].innerText = scoreDataVal.scores[i];
      function setDisplay(value) {
        document.querySelectorAll(`[data-row="${i}"]`).forEach(e => e.style.display = value);
      }
      
      if (i < playerCount) {
        setDisplay('block');
        document.getElementsByClassName('player')[i].innerText = runDataActiveRunVal.teams[i].players[0].name;
      } else {
        setDisplay('none');
      }
      
    }
    scores[4].innerText = scoreDataVal.needed;
  }
  runDataActiveRun.on('change', (newVal) => {
    updateAll(null, newVal);
  });

  scoreData.on('change', (newVal) => {
    updateAll(newVal, null);
  });
  document.getElementById('reset').onclick = function() {
    for (let i = 0; i < 4; i++) {
      setScore(i, 0);
    }
    setScore(4, 2);
  }
});

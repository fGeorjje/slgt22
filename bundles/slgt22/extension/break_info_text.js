module.exports = function(nodecg) {
  let runDataActiveRun = nodecg.Replicant('runDataActiveRun', 'nodecg-speedcontrol');
  let infoText = nodecg.Replicant('info-text');
  let timerMode = nodecg.Replicant('timer-mode');
  nodecg.Replicant('scoreData').on('change', (scoreData) => {
    if (scoreData.scores.some(score => score == scoreData.needed)) {
      timerMode.value = 'off';
    } else if (scoreData.scores.some(score => score > 0)) {
      timerMode.value = 'break';
    } else {
      timerMode.value = 'starting';
    }
    
    function matchResultString(i1, i2) {
      let name1 = runDataActiveRun.value.teams[i1].players[0].name;
      let name2 = runDataActiveRun.value.teams[i2].players[0].name;
      let score1 = scoreData.scores[i1];
      let score2 = scoreData.scores[i2];
      name1 = name1 + ' ' + score1;
      name2 = score2 + ' ' + name2;
      return name1 + '-' + name2; 
    }
    
    if (runDataActiveRun.value.teams.length == 3) {
      infoText.value = runDataActiveRun.value.game + ' - ' + matchResultString(0, 1);
    } else if (runDataActiveRun.value.teams.length == 5) {
      infoText.value = matchResultString(0, 2) + ' // ' + matchResultString(1, 3);
    }
  });
}
$(() => {
	// setup info text
	let infoText = nodecg.Replicant('info-text');
	infoText.on('change', (newVal, oldVal) => {
    $('#info-text').text(newVal);
	});
  
  // setup timer
  let timerDuration = nodecg.Replicant('timer-duration');
  let timerMode = nodecg.Replicant('timer-mode');
	let timer = nodecg.Replicant('timer', 'nodecg-speedcontrol');
	timer.on('change', (newVal, oldVal) => {
		if (newVal)
			updateTimer(newVal);
	});
  
  function updateTimer(timer) {
    let remainingMillis = (timerDuration.value * 60000) - timer.milliseconds;
    if (remainingMillis < 0) {
      remainingMillis = 0;
    }
    
    let minutes = Math.floor(remainingMillis / 60000);
    remainingMillis = remainingMillis - minutes * 60000;
    let seconds = Math.floor(remainingMillis / 1000);
    remainingMillis = remainingMillis - seconds * 1000;
    let deciseconds = Math.floor(remainingMillis / 100);
    
    function pad(value, pad) {
      let result = '' + value;
      let neededPadding = pad - result.length;
      if (neededPadding > 0) {
        result = '0'.repeat(neededPadding) + result;
      }
      return result;
    }
    
    let currentMode = timerMode.value;
    
    function setEnding(ending) {
      if (ending) {
        $('#timer-container').hide();
        $('#end-container').show();
      } else {
        $('#timer-container').show();
        $('#end-container').hide();
      }
    }
    
    if (currentMode == 'starting') {
      $('#timer-pretext').text('Starting in');
      setEnding(false);
    } else if (currentMode == 'break') {
      $('#timer-pretext').text('Resuming in');
      setEnding(false);
    } else if (currentMode == 'off') {
      setEnding(true);
    } else {
      $('#timer-pretext').text(currentMode);
      setEnding(false);
    }
    $('#timer').text(pad(minutes, 2) + ':' + pad(seconds, 2) + '.' + deciseconds);
  }
});
let timer, timerDuration, nodecg;
module.exports = function(_nodecg) {
  nodecg = _nodecg;
  // setup countdown beep
  timerDuration = nodecg.Replicant('timer-duration');
	timer = nodecg.Replicant('timer', 'nodecg-speedcontrol');
	timer.on('change', timerUpdate);
}

function timerUpdate(newVal, oldVal) {
  if (!newVal || !oldVal) return;
  if (newVal.state != 'running') return;
  let oldRemMillis = (timerDuration.value * 60000) - oldVal.milliseconds;
  let newRemMillis = (timerDuration.value * 60000) - newVal.milliseconds;
  if (oldRemMillis < 10000 || newRemMillis >= 10000) {
    return;
  }
  nodecg.sendMessage('botPlayAudioFile', 'countdown.ogg');
}
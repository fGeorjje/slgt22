module.exports = function(nodecg) {
  require('./bot')(nodecg);
  require('./hls')(nodecg);
  require('./init-player-data')(nodecg);
  require('./twitch-title')(nodecg);
  require('./stream-sync')(nodecg);
  require('./countdown_beep')(nodecg);
  require('./break_info_text')(nodecg);
  
  nodecg.listenFor('reboot-nodecg', () => {
    nodecg.log.info('REBOOT REQUESTED, TERMINATING!');
    process.exit(1);
  });
  
  nodecg.listenFor('log', (v) => {
    try {
      nodecg.log[v.level](...v.args);
    } catch (error) {
      nodecg.log.info(JSON.stringify(v));
    } 
  });
  
  nodecg.listenFor('tempfix', () => {
    let runs = nodecg.Replicant('runDataArray', 'nodecg-speedcontrol').value;
    let newRuns = [];
    for (const run of runs.slice(-11, 0)) {
      let newRun = JSON.parse(JSON.stringify(run));
      newRun.id = newRun.id.replace(/\s/g, '').toLowerCase().replace('//', '--');
      newRuns.push(newRun);
    }
    
    nodecg.sendMessageToBundle('removeAllRuns', 'nodecg-speedcontrol');
    for (const newRun of newRuns) {
      nodecg.sendMessageToBundle('modifyRun', 'nodecg-speedcontrol', {
        'runData': newRun
      });
    }
  });
}
module.exports = function(nodecg) {
  let runDataActiveRun = nodecg.Replicant('runDataActiveRun', 'nodecg-speedcontrol');
  runDataActiveRun.on('change', (newValue, oldValue) => {
    updateChannelInfo(sanitize(getTitle(newValue)), 'Superliminal');
  });
  
  function getTitle(run) {
    if (!run) return 'Glitchless Tournament 2022';
    let title = '' + run.game + ' // ';
    let rounds = run.game.split(' & ');
    let names = run.teams.slice(0, -1).map((team) => team.players[0].name);
    if (!isNaN(parseInt(rounds[1]))) {
      rounds[1] = rounds[0].slice(0, -1) + rounds[1];
    }
    
    if (rounds.length == 1 && names.length == 2) {
      return `Glitchless Tournament 2022 // ${run.game} // ${names[0]} vs ${names[1]}`;
    } else if (rounds.length == 1 && names.length == 4) {
      return `Glitchless Tournament 2022 // ${run.game} // ${names[0]} vs ${names[2]} // ${names[1]} vs ${names[3]}`;
    } else if (rounds.length == 2 && names.length == 2) {
      return `Glitchless Tournament 2022 // ${rounds[0]} // ${names[0]} vs ${names[2]}`;
    } else if (rounds.length == 2 && names.length == 4) {
      rounds = rounds.map(round => shortenRound(round));
      return `Glitchless Tournament 2022 // ${rounds[0]}: ${names[0]} vs ${names[2]} // ${rounds[1]}: ${names[1]} vs ${names[3]}`;
    } else {
      return `Glitchless Tournament 2022 // ${run.game} // ${names.join(', ')}`;
    }
  }
  
  function shortenRound(round) {
    return round.replace(/Winners Round /, 'WB R')
      .replace(/Losers Round /, 'LB R');
  }
  
  function sanitize(title) {
    // gotta make sure we dont use these
    // DIRTY words like 'Losers' on twitch (:
    return title.replace(/Losers?/, 'LB');
  }
  
  function updateChannelInfo(title, game) {
    nodecg.sendMessageToBundle('twitchUpdateChannelInfo', 'nodecg-speedcontrol', {
      status: title,
      game: game
    });
  }
}
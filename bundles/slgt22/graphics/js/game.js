const layout = window.location.hash.substr(1);
loadCss('css/' + layout + '.css');
if (layout.includes('commentary')) {
  loadCss('css/commentary.css');
  for (let i = 0; i < 4; i++) {
    let iframe = document.createElement('iframe');
    iframe.src = `stream-player.html#${i}-commentary`;
    iframe.id = `commentary-player-${i}`;
    iframe.scrolling = 'no';
    iframe.className = 'commentary-player';
    iframe.frameBorder = 0;
    document.body.append(iframe);
  }
} else {
  loadCss('css/game.css');
}

function loadCss(path) {
  var head  = document.getElementsByTagName('head')[0];
  var link  = document.createElement('link');
  link.rel  = 'stylesheet';
  link.type = 'text/css';
  link.href = path;
  link.media = 'all';
  head.appendChild(link);
}

const RUNNER_PLATES_AMOUNT = parseInt(layout.charAt(layout.length - 1));
const NAMEPLATES_AMOUNT = RUNNER_PLATES_AMOUNT + 4;

function createElement(tag, id, parent, className) {
  const element = document.createElement(tag);
  element.id = id;
  if(className) {
    element.className = className;
  }
  parent.appendChild(element);
  return element;
}

const matchCountainer = createElement('div', 'match-container', document.body, 'flex');
const match = createElement('div', 'match', matchCountainer, 'info-text');
const commentaryPlatesContainer = createElement('div', 'commentary-plates-container', document.body, 'flex');

if (RUNNER_PLATES_AMOUNT == 4 || RUNNER_PLATES_AMOUNT == 2) {
  for (let i = 0; i < RUNNER_PLATES_AMOUNT; i++) {
    let activeAudio = createElement('img', 'activeAudio-' + i, document.body, 'activeAudio');
    activeAudio.src = 'img/audio.png';
    $(activeAudio).hide();
  }
}
  
for (let i = 0; i < NAMEPLATES_AMOUNT; i++) {
  let plate;
  if (i < RUNNER_PLATES_AMOUNT) {
    plate = createElement('div', 'plate-' + i, document.body, 'plate plate-runner');
  } else {
    plate = createElement('div', 'plate-' + i, commentaryPlatesContainer, 'plate plate-commentator');
  }
  
  ['name', 'twitch', 'twitter'].forEach(element => {
      const container = createElement('div', element + '-container-' + i, plate, 'flex plate-container ' + element+'-container');
      if (i < RUNNER_PLATES_AMOUNT) {
        createElement('span', 'score-' + i, container, 'score score-'+i);
      }
      const logo = createElement('img', 'logo-' + element + '-' + i, container, 'logo');
      createElement('span', element + '-' + i, container, 'info-text info-text-' + element);
      if (element == 'name') {
        createElement('span', 'pronouns-' + element + '-' + i, container, 'pronouns pronouns-'+i);
      }
      
      if (element == 'name') {
        $(logo).hide();
      } else {
        logo.src = 'img/nameplate-logos/' + element + '.png';
      }
  });
}

/**
 * Handle audio changes
 */
let streamPlayerData = nodecg.Replicant('streamPlayerData');
streamPlayerData.on('change', (newVal) => {
  for (let i = 0; i < newVal.length; i++) {
    if (newVal[i].activeAudio && newVal[i].volume > 0) {
      $('#activeAudio-'+i).show();
    } else {
      $('#activeAudio-'+i).hide();
    }
  }
});

/**
 * Nameplate animation render cycle
 */

const SOCIALS_RENDER_TIME = 15000;
const NAME_RENDER_TIME = 30000;
$('.twitch-container, .twitter-container').hide();
function animateNameplate(i) {
  function isEmpty( el ){
    return !$.trim(el.html());
  }

  const name = $('#name-' + i);
  if (isEmpty(name)) {
    return;
  }

  const twitch = $('#twitch-' + i);
  const twitter = $('#twitter-' + i);
  const elements = [name, twitch, twitter].filter(e => !isEmpty(e));
  if (elements.length <= 1) {
    return;
  }
  
  for (let j = 1; j < elements.length + 1; j++) {
    const prev = elements[j-1];
    let current = elements[j];
    if (!current) {
      current = elements[0];
    }
    setTimeout(function() {
      prev.parent().fadeOut(250, function() {
        current.parent().fadeIn(250);
      });
    }, j * SOCIALS_RENDER_TIME / elements.length)
  }
}

setTimeout(function() {
  function cycle() {
    for (let i = 0; i < NAMEPLATES_AMOUNT; i++) {
      animateNameplate(i);
    }
  }

  cycle();
  setInterval(cycle, NAME_RENDER_TIME + SOCIALS_RENDER_TIME);
}, NAME_RENDER_TIME);


if (!layout.includes('commentary')) {
  document.body.style.backgroundImage = 'url("img/bg/' + layout + '.png")';
  document.body.style.backgroundRepeat = 'no-repeat';
} else {
  let background = document.createElement('div');
  background.id = 'background';
  document.body.appendChild(background);
  let backgroundImage = document.createElement('img');
  backgroundImage.src = 'img/bg/' + layout + '.png'
  backgroundImage.className = 'stretch';
  background.appendChild(backgroundImage);
}


let COMMENTARY_NAME = 'Commentators';
let discordsToPlateNum = {};
function setParticipant(i, participant, score, needed) {
  console.log('Setting participant ' + i);
  const nameplate = $('#plate-' + i);
  nameplate.show();
  function setElement(id, value, prefix="") {
    const elementId = id + '-' + i;
    
    const element = $(elementId);
    if (value) {
      console.log(elementId + '=' + prefix + value);
      element.text(prefix + value);
      element.show();
    } else {
      console.log(elementId + ' EMPTY');
      element.empty();
      element.hide();
    }
  }

  setElement('#name', participant.name);
  if (participant.social) {
    setElement('#twitch', participant.social.twitch, '/');
  }
  
  setElement('.pronouns', participant.pronouns)
  setElement('.score', score + '/' + needed)
  
  if (participant.customData) {
    if (participant.customData.discord) {
      let discord = participant.customData.discord;
      discordsToPlateNum[discord] = i;
    }
    if (participant.customData.twitter) {
      setElement('#twitter', participant.customData.twitter, '@');
    }
  }
}

const runDataActiveRun = nodecg.Replicant('runDataActiveRun', 'nodecg-speedcontrol');
const scoreData = nodecg.Replicant('scoreData');
const currentlySpeaking = nodecg.Replicant('currentlySpeaking');

runDataActiveRun.on('change', (newVal) => {
  onDataChange(newVal, null);
});

scoreData.on('change', (newVal) => {
  onDataChange(null, newVal);
});

currentlySpeaking.on('change', (newVal) => {
  for (let discord in discordsToPlateNum) {
    let num = discordsToPlateNum[discord];
    let element = document.getElementById('plate-' + num);
    if (!element) continue;
    let isSpeaking = !!newVal[discord];
    setTimeout(() => {
      if (isSpeaking) {
        element.classList.add("is-speaking");
      } else {
        element.classList.remove("is-speaking");
      }
    }, 500);
  }
});

function onDataChange(run, score) {
  if (!run) {
    run = runDataActiveRun.value;
    if (!run) return;
  }
  
  if (!score) {
    score = scoreData.value;
    if (!score) return;
  }

  $('.plate').hide();
  $('.info-text').text('');
  $('.pronouns').text('');

  let rounds = run.game.split(' & ');
  if (rounds.length == 1) {
    $('#match').text(run.game);
  } else {
    if (!isNaN(parseInt(rounds[1]))) {
      rounds[1] = rounds[0].slice(0, -1) + rounds[1];
    }
    let shorten = (t) => t.replace(/(osers|inners) Round /, 'B R');
    $('#match').text(`<-- ${shorten(rounds[0])} | ${shorten(rounds[1])} -->`);
  }
  

  let teams = run.teams;
  let runners = teams.slice(0, -1).map(team => team.players[0]).slice(0, RUNNER_PLATES_AMOUNT);
  // worst hack i've ever done - treating the commentary title like a nameplate :/
  let commentatorsTitle = [{'name': COMMENTARY_NAME}];
  let commentators = teams[teams.length - 1].players;
  let participants = runners.concat(commentatorsTitle, commentators);
  discordsToPlateNum = {};
  for (let i = 0; i < participants.length; i++) {
    setParticipant(i, participants[i], score.scores[i], score.needed);
  }
}
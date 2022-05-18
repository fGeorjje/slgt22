'use strict';

$(() => {
	
	var currentState = -1;
	var lastState = 6;
	var runDataArray = nodecg.Replicant('runDataArray', 'nodecg-speedcontrol');
	var runDataActiveRun = nodecg.Replicant('runDataActiveRun', 'nodecg-speedcontrol');
	
	function nextStateIn(delay) {
    if (delay && delay > 0) {
      setTimeout(function() {
        nextStateIn(0);
      }, delay);
      return;
    }
    
		var infoBar = $('#info-bar');
		function appendText(text, options) {
			var spanElement = document.createElement('span');
      if (options && options.color) {
        spanElement.style.color = options.color;
      } else {
        spanElement.style.color = '#ffffff';
      }
			
      if (options && options.margin) {
				spanElement.style.margin = options.margin;
			} else {
        spanElement.style.margin = '5px 10px 5px';
      }
			
			if (options && options.color == '#000000') {
				spanElement.style['text-shadow'] = '0px 0px #000000';
			}
      if (options && options.fontSize) {
				spanElement.style['font-size'] = fontSize;
			}
			var textElement = document.createTextNode(text);
			spanElement.append(textElement);
      if (options && options.container) {
        options.container.append(spanElement);
      } else {
        infoBar.append(spanElement);
      }
		}
		
		function selectRandom(items) {
			return items[Math.floor(Math.random() * items.length)];
		}
    
    function incState(reason) {
      currentState++;
      if (currentState > lastState) currentState = -1;
      console.log('Increasing state, now ' +currentState + ': ' + reason);
    }
		
		infoBar.fadeOut(1000, function() {
			infoBar.empty();
			incState('Default increase at start');;
      console.log(currentState);
			
      if (currentState < 0) {
        nextStateIn(7500);
        return;
			}
      
			if (currentState == 0) {
				appendText('You are watching the 2022 Superliminal Glitchless Tournament');
        appendText('#SLGT22', {color: '#00ACEE'});
				infoBar.fadeIn(1000);
        nextStateIn(20000);
        return;
			}
      
      if (currentState == 1) {
				appendText('Bracket Stage Results:');
        appendText('challonge.com/sgtournament2022', {color: '#00ACEE'});
				infoBar.fadeIn(1000);
        nextStateIn(20000);
        return;
			}
			
			if (currentState == 2) {
				appendText('Get involved in future broadcasts:');
        appendText('tournament.speedyliminal.tk/volunteer', {color: '#00ACEE'});
				infoBar.fadeIn(1000);
        nextStateIn(20000);
        return;
			}
      
      function displayMultiLine(prefix, texts) {
        appendText(prefix);
        var container = document.createElement('div');
        container.style.display = 'flex';
        container.style.margin = '0px 50px';
        container.style['flex-direction'] = 'column';
        container.style['align-items'] = 'center';
        container.style['justify-content'] = 'center';
        container.style['font-size'] = Math.floor(40/texts.length) + 'px';
        texts.forEach(text => {
          appendText(text, {'container': container, 'margin': '0px 5px'});
        });
        infoBar.append(container);
        infoBar.fadeIn(1000);
        nextStateIn(20000);
      }
      
      function displayNextRun(prefix, offset) {
        var runDataArrayNow = runDataArray.value;
				var runDataActiveRunNow = runDataActiveRun.value;
				let i;
				for (i = 0; i < runDataArrayNow.length; i++) {
					if (runDataArrayNow[i].id == runDataActiveRunNow.id) {
						break;
					}
				}
				
				if (i+offset >= runDataArrayNow.length) {
					incState('Cannot find run offset ' + offset + ' into the future');; // skip next
				} else {
					var nextRun = runDataArrayNow[i+offset];
          
          let players = nextRun.teams.slice(0, -1).map(team => team.players[0].name).join(', ');
          let matchDescription = nextRun.game + ': ' + players + ' (' + nextRun.category + ')';
          if (false) {
            //displayMultiLine(prefix, [matchDescription]);
          } else {
            appendText(prefix + matchDescription);
            infoBar.fadeIn(1000);
            nextStateIn(20000);
          }
				}
      }
			
			if (currentState == 3) {
        displayNextRun('Scheduled match: ', 1);
			}
      
      if (currentState == 4) {
        displayNextRun('Scheduled match: ', 2);
			}
			
			if (currentState == 5) {
				appendText('Join the Superliminal speedrunning community hub:');
        let image = document.createElement('img');
        image.src = 'img/nameplate-logos/discord.png';
        image.style.height = '32px';
        image.style.width = '44px';
        image.style.margin = '0px 0px 0px 20px';
        infoBar.append(image);
        appendText('discord.speedyliminal.tk', {color: '#00ACEE'});
        infoBar.fadeIn(1000);
        nextStateIn(20000);
			}
      
      if (currentState == 6) {
				appendText('Follow us on twitter and stay updated on community news:');
        let image = document.createElement('img');
        image.src = 'img/nameplate-logos/twitter.png';
        image.style.height = '40px';
        image.style.width = '40px';
        image.style.margin = '0px 0px 0px 20px';
        infoBar.append(image);
        appendText('@speedyliminal', {color: '#00ACEE'});
        infoBar.fadeIn(1000);
        nextStateIn(20000);
			}
		});
	}
	
	nextStateIn(0);
});
const volumeData = nodecg.Replicant('volumeData');
const botData = nodecg.Replicant('botData')
const botSettings = nodecg.Replicant('botSettings');
        
window.onload = () => {
    NodeCG.waitForReplicants(botData, botSettings, volumeData).then(() => {
        botSettings.on('change', (newVal, oldVal) => {
            if (oldVal === undefined || Object.keys(newVal.channels).length !== Object.keys(oldVal.channels).length) {
                let channelList = document.getElementById('channel');
                let sortedChannels = [];
                sortedChannels.push(['', 'Disable Bot']);
                for (let channel in newVal.channels) { sortedChannels.push([channel, newVal.channels[channel]]) }
                sortedChannels.sort((a, b) => { return a[0] - b[0]; });
                channelList.innerHTML = '';
                sortedChannels.forEach(channel => channelList.innerHTML = channelList.innerHTML + `<option value=${channel[0]}>${channel[1]}</option>`);
                channelList.value = newVal.channel;
            } else if (newVal.channel !== oldVal.channel)
                document.getElementById('channel').value = newVal.channel;
        })
        
        volumeData.on('change', (newVal, oldVal) => {
            for (const userId in botData.value.users) {
                let user = botData.value.users[userId];
                function getVolume(val) {
                    if (val === undefined || val[user.id] === undefined) return 100;
                    return val[user.id];
                }
                
                let newVolume = getVolume(newVal);
                let oldVolume = getVolume(oldVal);
                
                if (newVolume === oldVolume) {
                    continue;
                }
                
                let element = document.querySelector(`#volume-${user.id}`);
                if (element == null) {
                    // can be called before element exist, ignore
                    continue;
                }
                element.value = newVolume;
            }
        });
        
        botData.on('change', (newVal, oldVal) => {
            if (oldVal === undefined || newVal.users === {} || Object.keys(newVal.users).length !== Object.keys(oldVal.users).length) {
                document.getElementById('userDiv').innerHTML = '';
                for (const user in newVal.users) { createUser(newVal.users[user]) }
            }
            else if (JSON.stringify(newVal.users) !== JSON.stringify(oldVal.users)) {
                for (const user in newVal.users) {
                    if (JSON.stringify(newVal.users[user]) !== JSON.stringify(oldVal.users[user])) changeButtons(newVal.users[user])
                };
            }
        })
    });
}

function createUser(user) {
    let containerDiv = createElement('div', {
        class: 'userContainer'
    })

    let avatar = createElement('img', {
        class: 'avatar',
        user: user.id,
        src: user.avatar
    })

    let username = createElement('div', {
        class: 'username',
        innerHTML: `<b>${user.name}</b>`,
    })

    let muteButton = createElement('button', {
        class: 'muteButton',
        user: user.id,
        onClick: `botData.value.users['${user.id}'].mute = !botData.value.users['${user.id}'].mute`
    })

    let muteState = createElement('span', {
        class: 'material-icons',
        id: `mute-${user.id}`,
        user: user.id,
    })

    switch (user.mute) {
        case true: muteState.style.color = 'red'; muteState.innerHTML = 'mic_off'; break;
        case false: muteState.style.color = 'white'; muteState.innerHTML = 'mic'; break;
    }

    let deafButton = createElement('button', {
        class: 'deafButton',
        user: user.id,
        onClick: `botData.value.users['${user.id}'].deaf = !botData.value.users['${user.id}'].deaf`
    })

    let deafState = createElement('span', {
        class: 'material-icons',
        id: `deaf-${user.id}`,
        user: user.id,
    })

    switch (user.deaf) {
        case true: deafState.style.color = 'red'; deafState.innerHTML = 'headset_off'; break;
        case false: deafState.style.color = 'white'; deafState.innerHTML = 'headset'; break;
    }

    let inputDiv = createElement('div', {
        class: 'input'
    })

    let volumeValue = volumeData.value[user.id];
    if (volumeValue === undefined) {
        volumeValue = 50;
    }
    let volume = createElement('input', {
        type: 'number',
        id: `volume-${user.id}`,
        user: user.id,
        value: volumeValue,
        min: 0,
        max: 200,
        onchange: `volumeData.value['${user.id}'] = this.value`
    })

    let volumeLabel = createElement('label', {
        innerHTML: 'Volume'
    })

    let volumeBorder = createElement('div', {
        class: 'inputBorder'
    })

    muteButton.appendChild(muteState)
    deafButton.appendChild(deafState)
    inputDiv.appendChild(volume)
    inputDiv.appendChild(volumeLabel)
    inputDiv.appendChild(volumeBorder)
    containerDiv.appendChild(avatar)
    containerDiv.appendChild(username)
    containerDiv.appendChild(muteButton)
    containerDiv.appendChild(deafButton)
    containerDiv.appendChild(inputDiv)
    document.getElementById('userDiv').appendChild(containerDiv)
}

function createElement(type, attributes) {
    let element = document.createElement(type);
    for (let attr in attributes) {
        if (attr === 'innerHTML')
            element.innerHTML = attributes[attr];
        else
            element.setAttribute(attr, attributes[attr]);
    }
    return element;
}

function changeButtons(user) {
    let muteState = document.querySelector(`#mute-${user.id}`)
    let deafState = document.querySelector(`#deaf-${user.id}`)
    switch (user.mute) {
        case true: muteState.style.color = 'red'; muteState.innerHTML = 'mic_off'; break;
        case false: muteState.style.color = 'white'; muteState.innerHTML = 'mic'; break;
    }
    switch (user.deaf) {
        case true: deafState.style.color = 'red'; deafState.innerHTML = 'headset_off'; break;
        case false: deafState.style.color = 'white'; deafState.innerHTML = 'headset'; break;
    }
}
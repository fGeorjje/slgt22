class TwitchModule {
  get prefix() {
    return 'ttv';
  }
  
  get element() {
    return this.state.twitchVideoDiv;
  }
  
  async init(setupElement) {
    this.state = {};
    
    let twitchVideoDiv = document.createElement('div');
    setupElement(twitchVideoDiv);
    this.state.twitchVideoDiv = twitchVideoDiv;
    twitchVideoDiv.id = 'twitch-video-div';
    twitchVideoDiv.preload = 'auto';
    
    let player = new Twitch.Player(twitchVideoDiv.id, {
      width: '100%',
      height: '200%',
      channel: 'noglitchesrunner1a'
    });
    this.state.player = player;
    
    await new Promise((resolve, reject) => {
      player.addEventListener(Twitch.Player.READY, () => {
        resolve();
      });
    });
  }
  
  async destroy() {

  }
  
  async loadStream(stream) {
    if (/^1[a-d]$/.test(stream)) {
      stream = `noglitchesrunner${stream}`
    }
    this.state.player.setChannel(stream);
  }
  
  get buffer() {
    return this.state.player.getPlaybackStats().bufferSize;
  }
  
  set volume(value) {
    this.state.player.setVolume(value);
  }
}
class VdoNinjaModule {
  get prefix() {
    return 'vdo.ninja';
  }
  
  get element() {
    return this.state.iframe;
  }
  
  sendMessage(m) {
    this.state.iframe.contentWindow.postMessage(m, '*');
  }
  
  async init(setupElement) {
    this.state = {};
    this.state.volume = 0;
    
    let iframe = document.createElement('iframe');
    setupElement(iframe);
    this.state.iframe = iframe;
    
    let updateVolumeJob = setInterval(() => this.sendMessage({
      volume: this.state.volume
    }), 1000);
    this.state.jobs = [updateVolumeJob];
  }
  
  async destroy() {
    jobs.forEach(job => clearInterval(job));
  }
  
  async loadStream(stream) {
    this.state.iframe.src = `https://vdo.ninja/${stream}`;
  }
  
  get buffer() {
    return 0;
  }
  
  set volume(value) {
    this.state.volume = value;
    this.sendMessage({ volume: value });
  }
}
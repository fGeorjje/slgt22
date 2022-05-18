class HlsModule {
  get prefix() {
    return 'hls';
  }
  
  get element() {
    return this.state.video;
  }
  
  async init(setupElement) {
    this.state = {};
    
    if (!Hls.isSupported()) {
      throw new Error('no hls support for browser');
    }
    
    let video = document.createElement('video');
    setupElement(video);
    this.state.video = video;
    video.preload = 'auto';
    
    let audio = {};
    this.state.audio = audio;
    
    let ctx = new AudioContext();
    audio.ctx = ctx;
    
    let nodes = {}
    audio.nodes = nodes;
    
    let sourceNode = ctx.createMediaElementSource(video);
    nodes.source = sourceNode;
    let gainNode = ctx.createGain();
    nodes.gain = gainNode;
    sourceNode.connect(gainNode);
    let lastNode = gainNode;
    for (let i = 0; i < 3; i++) {
      const compressionNode = audio.ctx.createDynamicsCompressor();
      const afterGainNode = audio.ctx.createGain();
      const replicant = nodecg.Replicant('compressorSettings'+i);
      replicant.on('change', (newVal, oldVal) => {
        compressionNode.threshold.value = newVal.threshold;
        compressionNode.knee.value = newVal.knee;
        compressionNode.ratio.value = newVal.ratio;
        compressionNode.attack.value = newVal.attack;
        compressionNode.release.value = newVal.release;
        afterGainNode.gain.value = newVal.aftergain;
      });
      lastNode.connect(compressionNode);
      compressionNode.connect(afterGainNode);
      lastNode = afterGainNode;
    }
    lastNode.connect(audio.ctx.destination);
  }
  
  async destroy() {
    if (this.state.hls) this.state.hls.detachMedia();
    this.state.audio.ctx.close();
  }
  
  hlsEventPromise(event) {
    return new Promise((resolve, reject) => {
      let timeout = setTimeout(() => reject(`did not trigger: ${event}`), 5000);
      this.state.hls.on(event, (_event, data) => {
        resolve(data);
        clearTimeout(timeout);
      });
    });
  }
  
  async loadStream(stream) {
    let url;
    if (stream) 
      url = await nodecg.sendMessage('getStreamUrl', stream);
    
    if (url === this.state.url) return;
    await this.loadUrl(url);
  }
  
  async loadUrl(url) {
    let state = this.state;
    let audio = state.audio;
    
    if (state.hls) {
      state.hls.detachMedia();
      state.hls = null;
    }
      
    if (!url) return;
    
    let hls = new Hls();
    state.hls = hls;
    
    hls.attachMedia(this.state.video);
    await this.hlsEventPromise(Hls.Events.MEDIA_ATTACHED);
    
    hls.loadSource(url);
    await this.hlsEventPromise(Hls.Events.MANIFEST_PARSED);
    
    let video = state.video;
    video.play();
    if (url.startsWith('async_recordings/'))
      video.playbackRate = 0;
    
    hls.on(Hls.Events.ERROR, (event, data) => {
      if (!data.fatal) return;
      let recoveryUrl = this.state.url;
      this.loadUrl(recoveryUrl);
    });
  }
  
  get buffer() {
    return this.state.hls.latency - 6;
  }
  
  set volume(value) {
    this.state.audio.nodes.gain.gain.value = value;
  }
  
  set playbackRate(value) {
    this.state.video.playbackRate = value;
  }
  
  set currentTime(value) {
    this.state.video.currentTime = value;
  }
  
  async capture(rect) {
    let video = this.state.video;
    if (video.currentTime <= 0 || video.paused || video.ended || video.readyState < 3) {
      throw new Error('Video not playing');
    }
    
    let scaleX = video.videoWidth / 1920;
    let scaleY = video.videoHeight / 1080;
    
    let sx = Math.floor(rect.x * scaleX);
    let sy = Math.floor(rect.y * scaleY);
    let sWidth = Math.floor(rect.w * scaleX);
    let sHeight = Math.floor(rect.h * scaleY);
    let dx = 0;
    let dy = 0;
    let dWidth = rect.w * 3;
    let dHeight = rect.h * 3;
    
    let canvas = document.createElement('canvas');
    canvas.width = dWidth;
    canvas.height = dHeight;
    canvas.style.position = 'absolute';
    canvas.style.left = `-${dWidth}px`;
    canvas.style.top = `-${dHeight}px`;
    document.body.appendChild(canvas);
    canvas.getContext('2d').drawImage(video, sx, sy, sWidth, sHeight, dx, dy, dWidth, dHeight);
    let dataURL = canvas.toDataURL();
    canvas.remove();
    return dataURL;
  }
}
class DualLogger {
  constructor(desc, id) {
    if (!nodecg) {
      throw new Error('needs to be ran from a nodecg injected graphic');
    }
    if (desc) {
      this.desc = desc;
    } else {
      this.desc = window.location.pathname.split('/').pop();
    }
    
    if (id) {
      this.id = id;
    } else {
      this.id = Date.now().toString(36) + Math.random().toString(36).substr(2);
    }
  }
  
  log(level, args) {
    nodecg.log[level](this.desc, this.id, ...args);
    nodecg.sendMessage('log', {
      'level': level,
      'args': [this.desc, this.id, ...args]
    });
  }
  
  trace(...args) {
    this.log('trace', args);
  }
  
  debug(...args) {
    this.log('debug', args);
  }
  
  info(...args) {
    this.log('info', args);
  }
  
  warn(...args) {
    this.log('warn', args);
  }
  
  error(...args) {
    this.log('error', args);
  }
}
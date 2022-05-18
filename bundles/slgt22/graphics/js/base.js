const page = location.href.split("/").slice(-1);
const id = Date.now().toString(36) + Math.random().toString(36).substr(2);
window.logger = {
  log: function(level, args) {
    nodecg.log[level](page, id, ...args);
    nodecg.sendMessage('log', {
      'level': level,
      'args': [page, id, ...args]
    });
  }
  
  trace: function(...args) {
    this.log('trace', args);
  }
  
  debug: function(...args) {
    this.log('debug', args);
  }
  
  info: function(...args) {
    this.log('info', args);
  }
  
  warn: function(...args) {
    this.log('warn', args);
  }
  
  error: function(...args) {
    this.log('error', args);
  }
}
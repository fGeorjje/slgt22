class VolumeMeterProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    // number of 128-sample frames to reach 300ms
    let frames = Math.floor(sampleRate * 0.3 / 128); 
    let runningSumOfSquares = new RunningTotal(112);
    this.runningSumOfSquares = runningSumOfSquares;
    this.port.onmessage = (e) => {
      let sumOfSquares = runningSumOfSquares.getRunningTotal();
      let amount = runningSumOfSquares.getAmount();
      let volume = Math.sqrt(sumOfSquares / amount);
      this.port.postMessage({sumOfSquares, amount, volume});
    };
  }
  
  process(inputs, outputs, parameters) {
    let sumOfSquares = 0.0;
    let channelCount = 0;
    for (let n = 0; n < inputs.length; n++) {
      let input = inputs[n];
      let output = outputs[n];
      for (let m = 0; m < input.length; m++) {
        let inputChannel = input[m];
        let outputChannel = output[m];
        for (let i = 0; i < inputChannel.length; i++) {
          let val = inputChannel[i];
          outputChannel[i] = val;
          sumOfSquares += val * val;
        }
      }
      channelCount += input.length;
    }
    
    this.runningSumOfSquares.push(sumOfSquares / channelCount);
    return true;
  }
}

registerProcessor('volume-meter-processor', VolumeMeterProcessor)

class RunningTotal {
  constructor(windowSize, defaultValue=0, recalculateThreshold=100) {
    this.values = new Array(windowSize).fill(defaultValue);
    this.recalculateThreshold = recalculateThreshold;
    this.currentIndex = 0;
    this.rollovers = 0;
    this.filled = false;
    this.currentTotal = windowSize * defaultValue;
  }
  
  push(value) {
    let oldestIndex = this.currentIndex + 1;
    if (oldestIndex >= this.values.length)
      oldestIndex = 0;
    
    this.values[this.currentIndex] = value;
    this.currentTotal = this.currentTotal + value - this.values[oldestIndex];
    this.currentIndex = this.currentIndex + 1;
    if (this.currentIndex >= this.values.length) {
      this.currentIndex = 0;
      this.filled = true;
      this.rollover();
    }
  }
  
  getWindowSize() {
    return this.values.length;
  }
  
  getAmount() {
    if (this.filled)
      return this.values.length;
    else
      return this.currentIndex;
  }
  
  getRunningTotal() {
    return this.currentTotal;
  }
  
  rollover() {
    this.rollovers = this.rollovers + 1;
    if (this.rollovers > this.recalculateThreshold) {
      this.rollovers = 0;
      this.recalculate();
    }
  }
  
  recalculate() {
    this.currentTotal = 0.0;
    for (const value of this.values) {
      this.currentTotal += value;
    }
  }
}


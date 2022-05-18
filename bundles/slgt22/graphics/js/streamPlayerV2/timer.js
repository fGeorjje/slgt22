var Timer = {
  offset: 0,
  offsets: []
};

  function requestOffset() {
    let request = new XMLHttpRequest();
    let sentAt, receivedAt;

    request.open("GET", "/time");
    request.onreadystatechange = function() {
      if ((this.status == 200) && (this.readyState == this.HEADERS_RECEIVED)) {
        receivedAt = Date.now();
      }
    };

    request.onload = function() {
      if (this.status == 200) {
        try {
          receivedOffset(JSON.parse(this.response).time + ((receivedAt - sentAt) / 2) - receivedAt);
        } catch (e) {
          console.log(e);
        }
      }
    };

    sentAt = Date.now();
    request.send();
  }

  function receivedOffset(offset) {
    // keep only last 20
    Timer.offsets.push(offset);
    if (Timer.offsets.length > 20) {
      Timer.offsets.shift();
    }

    // remove outliers
    let sortedOffsets = Timer.offsets.slice().sort(function(a, b) {
      return a - b;
    });
    if (sortedOffsets.length > 10) {
      sortedOffsets = sortedOffsets.slice(1, -1);
    }
    if (sortedOffsets.length > 2) {
      sortedOffsets = sortedOffsets.slice(1, -1);
    }

    let sum = 0;
    for(var i = 0; i < sortedOffsets.length; i++) {
      sum += sortedOffsets[i];
    }
    let newOffset = Math.floor(sum/sortedOffsets.length);
    Timer.offset = newOffset;
  }

  setInterval(requestOffset, 1000);
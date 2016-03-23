var net = require('net');

var EverSocket = require('eversocket').EverSocket;

module.exports = function connectionManager(deviceConfig) {
    var self = this;

    var serialClient;
    var auxClient;
    var queuedReads = [];
    var alreadyRead = [];

    self.connect = function connect() {
        self.disconnect();
        serialClient = new EverSocket({
            reconnectWait: 100,
            timeout: 15000,
            reconnectOnTimeout: true
        });
        serialClient.on('error', function(err) {
            console.log('got error on serial connection', err);
        });
        serialClient.on('reconnect', function() {
            console.log('the serial socket reconnected following a close or timeout event');
        });
        serialClient.on('data', function (data) {
            data = new Buffer(data);
            console.log('serial data: ', data);
            if(!queuedReads.length) {
                console.log('no queued reads');
                if(alreadyRead.length) {
                    alreadyRead = []; // discard any existing read buffer
                }
                return;
            }
            
            // add this data to the buffer
            for(var i=0; i<data.length; i++) {
                alreadyRead.push(data[i]);
            }
            console.log('Added incoming data to buffer', data.length, alreadyRead.length);

            // see if the buffer fulfills our needs
            var qr = queuedReads[0];
            if(qr.length >= alreadyRead.length) {
                // got enough data - remove it from the buffer and trigger the callback 
                var readData = alreadyRead.splice(0, qr.length);
                qr.callback(readData);
                queuedReads.shift();
                console.log('Fulfilled queued read', qr.length, alreadyRead.length, queuedReads.length);
            }
        });
        auxClient = new EverSocket({
            reconnectWait: 100,
            timeout: 15000,
            reconnectOnTimeout: true
        });
        auxClient.on('error', function(err) {
            console.log('got error on aux connection', err);
        });
        auxClient.on('reconnect', function() {
            console.log('the serial socket reconnected following a close or timeout event');
        });
        auxClient.on('data', function (data) {
            console.log('aux data: ', new Buffer(data));
        });

        var keepAlive = null;
        var sc = serialClient;
        serialClient.on('connect', function() {
            serialClient.write(new Buffer([173, 173])); // stop
            setTimeout(function() {
                serialClient.write(new Buffer([129])); // start
                setTimeout(function() {
                    serialClient.write(new Buffer([132])); // safe mode
                    keepAlive = setInterval(function() {
                        self.serialWriteAndRead(new Buffer([149, 1, 2, 3, 5]), 28, function(data) {
                            // 28 bytes
                            var status = {
                                irOpCode = data[0],
                                buttons = data[1],
                                distance = (((data[2] << 8) | data[3]) << 16) >> 16,
                                angle = (((data[4] << 8) | data[5]) << 16) >> 16,
                                chargingState = data[6],
                                voltage = data[7] << 8 | data[8],
                                current = (((data[9] << 8) | data[10]) << 16) >> 16,
                                temperature = (data[11] << 24) >> 24,
                                batteryCharge = data[12] << 8 | data[13],
                                batteryCapacity = data[14] << 8 | data[15],
                                oiMode = data[16],
                                song = data[17],
                                isPlayingSong = data[18] == 1,
                                ioStreamPackets = data[19],
                                velocity = (((data[20] << 8) | data[21]) << 16) >> 16,
                                radius = (((data[22] << 8) | data[23]) << 16) >> 16,
                                velocityLeft = (((data[24] << 8) | data[25]) << 16) >> 16,
                                velocityRight = (((data[26] << 8) | data[27]) << 16) >> 16,
                            };
                            
                            self.emit('status', status);
                        }, 2000);
                    }, 7000);

                }, 200);
            }, 200)
        });
        serialClient.on('disconnect', function() {
            if(keepAlive) {
                clearInterval(keepAlive);
                keepAlive = null;
            }
        });

        serialClient.connect(deviceConfig.serialPort, deviceConfig.host);
        auxClient.connect(deviceConfig.auxPort, deviceConfig.host);
    };

    self.disconnect = function disconnect() {
        if(serialClient) {
            serialClient.cancel();
            serialClient.end();
            serialClient.destroy();
            serialClient = null;
        }
        if(auxClient) {
            auxClient.cancel();
            auxClient.end();
            auxClient.destroy();
            auxClient = null;
        }
    }

    self.writeSerial = function writeSerial(data) {
        serialClient.write(data);
    };
    self.writeAux = function writeAux(data) {
        auxClient.write(data);
    };

    function cmd() {
        var args = Array.prototype.slice.call(arguments);
        return function() { self.writeSerial(new Buffer(args)); }
    }
    self.wakeup = function() {
        self.writeAux(new Buffer([2, 0]));
    }
    self.start = cmd(128);
    self.reset = cmd(7);
    self.stop = cmd(173, 173);
    self.safe = cmd(131);
    self.dock = cmd(143);
    self.off = cmd(133);
    self.beep = cmd(140, 3, 1, 64, 16, 141, 3);
    
    self.fire = function() {
        self.writeAux(new Buffer([0, 0]));
    };
    self.setElevation = function(value) {
        self.writeAux(new Buffer([1, value]));
    };

    self.serialWriteAndRead = function serialWriteAndRead(data, expected, callback, timeout) {
        var read = {
            length: expected,
            callback: callback
        };
        setTimeout(function() {
            queuedReads = queuedReads.filter(function(i) { return i == read; });
        }, timeout);
        queuedReads.push(read);
        self.writeSerial(data);
    }
}
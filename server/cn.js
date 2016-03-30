var net = require('net');
const EventEmitter = require('events');
const util = require('util');

var EverSocket = require('eversocket').EverSocket;

function ConnectionManager(deviceConfig) {
    EventEmitter.call(this);
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
            if(qr.length <= alreadyRead.length) {
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
                    if(keepAlive) {
                        clearInterval(keepAlive);
                    }
                    keepAlive = setInterval(function() {
                        // serialClient.write(new Buffer([149, 1, 35]));
                        // return;
                        self.serialWriteAndRead(new Buffer([149, 3, 2, 3, 5]), 28, function(data) {
                            // 28 bytes
                            var status = {
                                irOpCode: data[0],
                                buttons: data[1],
                                distance: (((data[2] << 8) | data[3]) << 16) >> 16,
                                angle: (((data[4] << 8) | data[5]) << 16) >> 16,
                                chargingState: data[6],
                                voltage: data[7] << 8 | data[8],
                                current: (((data[9] << 8) | data[10]) << 16) >> 16,
                                temperature: (data[11] << 24) >> 24,
                                batteryCharge: data[12] << 8 | data[13],
                                batteryCapacity: data[14] << 8 | data[15],
                                oiMode: data[16],
                                song: data[17],
                                isPlayingSong: data[18] == 1,
                                ioStreamPackets: data[19],
                                velocity: (((data[20] << 8) | data[21]) << 16) >> 16,
                                radius: (((data[22] << 8) | data[23]) << 16) >> 16,
                                velocityLeft: (((data[24] << 8) | data[25]) << 16) >> 16,
                                velocityRight: (((data[26] << 8) | data[27]) << 16) >> 16,
                            };
                            
                            self.emit('status', status);
                        }, 500);
                    }, 1000);

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
    self.chargeSong = cmd(140, 2, 6, 67, 10, 72, 10, 76, 10, 79, 24, 76, 8, 79, 64, 141, 2);  // G/C/E, G, E, G - https://en.wikipedia.org/wiki/Charge_(fanfare)
    self.ironManSong = cmd(140, 1, 14, 47, 64, 50, 64, 50, 32, 52, 32, 52, 48, 55, 16, 54, 16, 55, 16, 54, 16, 55, 32, 50, 32, 50, 32, 52, 32, 52, 64, 141, 1);  // B D DE E GF#GF# GD DE E - http://www.onlinesheetmusic.com/iron-man-p370899.aspx
    self.mario11 = cmd(140, 1, 11, 64, 8, 64, 8, 1, 8, 64, 8, 1, 8, 60, 8, 64, 8, 1, 8, 67, 8, 1, 24, 55, 8, 141, 1);  // http://www.mariopiano.com/mario-sheet-music-overworld-main-theme.html
    self.mario12 = cmd(140, 1, 6, 48, 8, 50, 8, 45, 8, 57, 8, 46, 8, 58, 8, 141, 1);  // http://www.mariopiano.com/mario-sheet-music-underworld-theme.html
    self.marioOver = cmd(140, 1, 14, 62, 8, 1, 16, 55, 8, 1, 16, 52, 16, 57, 11, 59, 11, 57, 11, 56, 16, 58, 16, 56, 16, 55, 8, 53, 8, 55, 32, 141, 1);  // CRRG RRE 3HABA HA@B@A@ GFHG     http://www.mariopiano.com/mario-sheet-music-game-over-sound.html
    self.auxPowerOn = cmd(138, 2);
    self.auxPowerOff = cmd(138, 0);
    
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

util.inherits(ConnectionManager, EventEmitter);
module.exports = ConnectionManager;
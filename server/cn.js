var net = require('net');

var EverSocket = require('eversocket').EverSocket;

module.exports = function connectionManager(deviceConfig) {
    var self = this;
    
    var serialClient;
    var auxClient;

    self.connect = function connect() {
        self.disconnect();
        serialClient = new EverSocket({
            reconnectWait: 100,
            timeout: 15000,
            reconnectOnTimeout: true
        });
        serialClient.on('reconnect', function() {
            console.log('the serial socket reconnected following a close or timeout event');
        });
        serialClient.on('data', function (data) {
            console.log('serial data: ', new Buffer(data));
        });
        auxClient = new EverSocket({
            reconnectWait: 100,
            timeout: 15000,
            reconnectOnTimeout: true
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
                        serialClient.write(new Buffer([149, 1, 35]));
                        console.log('requested status');
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
}
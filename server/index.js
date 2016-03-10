var net = require('net');

var express = require('express');
var app = express();
var server = require('http').Server(app);
var io = require('socket.io')(server);

app.use(express.static('public'));
server.listen(9000);

io.on('connection', function(socket) {
    console.log('socket.io got connection');
  socket.on('drive', function (data) {
    console.log('drive', data);
  });
  socket.on('mode', function (data) {
    console.log('mode', data);
  });
  socket.on('start', function (data) {
    console.log('start', data);
  });
  socket.on('stop', function (data) {
    console.log('stop', data);
  });
});


var host = '192.168.25.123';
var serialPort = '900';
var controlPort = '901';

var serialClient = new net.Socket();
serialClient.on('error', function(err) {
    console.log('err serial', err);
});
serialClient.connect(serialPort, host, function () {
    console.log('connected serial');
    // serialClient.write(new Buffer([128]));
    // console.log('wrote start');
    // setTimeout(function() {
    //     serialClient.write(new Buffer([131]));
    //     console.log('wrote safe');
    //     setTimeout(function() {
    //         serialClient.write(new Buffer([137, 1, 0, 0, 0]));
    //         console.log('wrote drive');
    //         setTimeout(function() {
    //             serialClient.write(new Buffer([137, 0, 0, 0, 0]));
    //             console.log('wrote no drive');
    //             setTimeout(function() {
    //                 serialClient.write(new Buffer([173]));
    //                 console.log('wrote stop');
                    
    //             }, 500);
    //         }, 500);
    //     }, 100);
    // }, 100);
});
serialClient.on('data', function (data) {
    console.log('got data: ' + data);
});
serialClient.on('close', function () {
    console.log('disconnected serial');
});


var controlClient = new net.Socket();
controlClient.on('error', function(err) {
    console.log('err cmd', err);
});
controlClient.connect(controlPort, host, function () {
    console.log('connected cmd');
    controlClient.write(new Buffer([0,0,1,0]));
    console.log('wrote');
});
controlClient.on('data', function (data) {
    console.log('got data cmd: ' + data);
});
controlClient.on('close', function () {
    console.log('disconnected cmd');
});


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
    var drive = Math.floor(data.drive * 500);
    var turn = data.turn === 0 ? 32768 : -Math.floor(data.turn * 2000);
    if(data.drive == 0 && data.turn) {
        // spin in place - set speed based on how far turn is set
        drive = Math.floor(Math.abs(data.turn) * 500);
        turn = data.turn > 0 ? -1 : 1; 
    }
    // var send = '137 ' + (drive >> 8) + ' ' + (drive % 256) + ' ' + (turn >> 8) + ' ' + (turn  % 256);
    var send = new Buffer([ 137, drive >> 8, drive, turn >> 8, turn ]);
    console.log(send);
    serialClient.write(send);
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
    
    serialClient.write(new Buffer([149, 1, 35]));
    console.log('requested status');
    setInterval(function() {
        serialClient.write(new Buffer([149, 1, 35]));
        console.log('requested status');
    }, 7000);
    
    // console.log('waiting for BRC wakeup to finish');
    // setTimeout(function() {
        // // 16 nulls to clear out any pending commands,then a reset
        // serialClient.write(new Buffer([0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,7]));
        // console.log('wrote reset');
        // setTimeout(function() {
        //     serialClient.write(new Buffer([128]));
        //     console.log('wrote start');
        //     setTimeout(function() {
                // serialClient.write(new Buffer([149, 35]));
                // console.log('requested status');
                // setTimeout(function() {
                //     serialClient.write(new Buffer([131]));
                //     console.log('wrote safe');
                // //     setTimeout(function() {
                // //         serialClient.write(new Buffer([137, 1, 0, 0, 0]));
                // //         console.log('wrote drive');
                // //         setTimeout(function() {
                // //             serialClient.write(new Buffer([137, 0, 0, 0, 0]));
                // //             console.log('wrote no drive');
                // //             // setTimeout(function() {
                // //             //     serialClient.write(new Buffer([173]));
                // //             //     console.log('wrote stop');
                // //             //     
                // //             // }, 500);
                // //         }, 500);
                // //     }, 100);
                // }, 100);
    //         }, 2000);
    //     }, 10000);
    // }, 2000);
});
serialClient.on('data', function (data) {
    console.log('got data: ', new Buffer(data));
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
    // controlClient.write(new Buffer([0,0,1,0,2,0]));
    // console.log('wrote startup');
    // setTimeout(function() {
    //     controlClient.write(new Buffer([2,1]));
    //     console.log('pulled BRC back up');
    // }, 1000);
});
controlClient.on('data', function (data) {
    console.log('got data cmd: ' + new Buffer(data));
});
controlClient.on('close', function () {
    console.log('disconnected cmd');
});


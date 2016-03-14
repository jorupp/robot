var fs = require('fs');

var config = JSON.parse(fs.readFileSync('config.json'));
var cn = require('./cn')(config.device);

var net = require('net');

var express = require('express');
var app = express();
var server = require('http').Server(app);
var io = require('socket.io')(server);

app.use(express.static('public'));
server.listen(9000);

function updateConnection() {
    if(io.engine.clientsCount > 0) {
        cn.connect();
    } else {
        cn.disconnect();
    }
}

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

io.on('connection', updateConnection);
io.on('disconnect', updateConnection);

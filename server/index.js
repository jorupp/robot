var net = require('net');
var express = require('express');
var SignalRJS = require('signalrjs');
 
var signalR = SignalRJS();

//Create the hub connection 
//NOTE: Server methods are defined as an object on the second argument 
var hub = signalR.hub('robotHub', {
    control: function (speed, angle) {
        // send speed/angle to serial port
        console.log('recieved', speed, angle);
	}
});

 
var server = express();
server.use(signalR.createListener())
server.use(express.static(__dirname));
server.listen(3000);
 
signalR.on('CONNECTED',function(){
	console.log('connected');
	setInterval(function () {
		signalR.send({time:new Date()});
	},1000)
});

var host = '192.168.10.25';
var serialPort = '900';
var controlPort = '901';

var serialClient = new net.Socket();
serialClient.connect(host, serialPort, function () {
    console.log('connected');
});
serialClient.on('data', function (data) {
    console.log('got data: ' + data);
    hub.clients.all.invoke('sensorState').withArgs([])
});
serialClient.on('close', function () {
    console.log('disconnected');
});


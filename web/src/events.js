(function() {
    'use strict;'

    angular.module('app').service('EventService', [function() {
        var socket = io.connect('ws://' + window.location.host);
        return {
            send: function(event, data) {
                socket.emit(event, data);
            },
            on: function(event, callback) {
                return socket.on('status', callback);
            }
        }
    }]);
})();
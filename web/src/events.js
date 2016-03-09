(function() {
    'use strict;'

    angular.module('app').service('EventService', [function() {
        var socket = io.connect('http://localhost');
        return {
            send: function(event, data) {
                socket.emit(event, data);
            }
        }
    }]);
})();
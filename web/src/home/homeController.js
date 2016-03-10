(function() {
    'use strict;'

    angular.module('app').controller('HomeController', ['EventService', '$interval', '$scope', function(eventService, $interval, $scope) {
        var self = this;
        self.drive = 0;
        self.turn = 0;

        function applyDeadzone(value, oldValue) {
            if (!value) {
                return value;
            }
            var dz = 0.1;
            value = Math.max(Math.abs(value) - 0.1, 0) / 0.9 * Math.abs(value) / value;
            
            if(Math.abs(value - oldValue) < 0.05 && value !== 1 && value !== -1 && value !== 0) {
                // eh, value didn't change much and isn't at the limit - don't bother telling the server about it
                return oldValue;
            }
            return value;
        }

        $interval(function() {
            var gp = navigator.getGamepads()[0];
            if (gp && gp.connected) {
                self.turn = applyDeadzone(gp.axes[0], self.turn);
                self.drive = -applyDeadzone(gp.axes[1], -self.drive);
            } else {
                if (self.drive || self.turn) {
                    self.drive = 0;
                    self.turn = 0;
                }
            }
        }, 100);

        $scope.$watchCollection('[c.drive, c.turn]', function() {
            eventService.send('drive', { drive: self.drive, turn: self.turn });
        });

    }]);
})();
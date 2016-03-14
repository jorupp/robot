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
            var dz = 0.3;
            value = Math.max(Math.abs(value) - dz, 0) / (1-dz) * Math.abs(value) / value;
            
            if(Math.abs(value - oldValue) < 0.05 && value !== 1 && value !== -1 && value !== 0) {
                // eh, value didn't change much and isn't at the limit - don't bother telling the server about it
                console.log(value, oldValue);
                return oldValue;
            }
            return value;
        }
        
        var interval = 25;
        var maxDeltaPerSec = 2;
        var maxDeltaPerInterval = maxDeltaPerSec / 1000 * interval; 
        function applySmooth(value, oldValue) {
            if(value == oldValue) {
                return oldValue;
            }
            var delta = Math.min(Math.max(value - oldValue, -maxDeltaPerInterval), maxDeltaPerInterval);
            return oldValue + delta;
        }

        var targetTurn = 0, targetDrive = 0;
        $interval(function() {
            var gp = navigator.getGamepads()[0];
            if (gp && gp.connected) {
                targetTurn = applyDeadzone(gp.axes[0], targetTurn);
                targetDrive = -applyDeadzone(gp.axes[1], -targetDrive);
                self.turn = applySmooth(targetTurn, self.turn);
                self.drive = applySmooth(targetDrive, self.drive);
            } else {
                if (self.drive || self.turn) {
                    self.drive = 0;
                    self.turn = 0;
                }
            }
        }, 25);

        $scope.$watchCollection('[c.drive, c.turn]', function() {
            eventService.send('drive', { drive: self.drive, turn: self.turn });
        });

    }]);
})();
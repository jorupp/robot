(function() {
    'use strict;'

    angular.module('app').controller('HomeController', ['EventService', '$interval', '$scope', function(eventService, $interval, $scope) {
        var self = this;
        self.drive = 0;
        self.turn = 0;

        function applyDeadzone(value) {
            if (!value) {
                return value;
            }
            var dz = 0.1;
            return Math.max(Math.abs(value) - 0.1, 0) / 0.9 * Math.abs(value) / value;
        }

        $interval(function() {
            var gp = navigator.getGamepads()[0];
            if (gp && gp.connected) {
                self.drive = applyDeadzone(gp.axes[0]);
                self.turn = applyDeadzone(gp.axes[1]);
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
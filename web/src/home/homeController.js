(function() {
    'use strict;'

    angular.module('app').controller('HomeController', ['EventService', '$interval', '$scope', function(eventService, $interval, $scope) {
        var self = this;
        self.drive = 0;
        self.turn = 0;

        $interval(function() {
            var gp = navigator.getGamepads()[0];
            if (gp && gp.connected) {
                $scope.apply(function() {
                    self.drive = gp.axes[0];
                    self.turn = gp.axes[1];
                });
            } else {
                if (self.drive || self.turn) {
                    $scope.apply(function() {
                        self.drive = 0;
                        self.turn = 0;
                    });
                }
            }
        }, 100);

        $scope.$watchCollection('[drive, turn]', function() {
            eventService.send('drive', self.drive, self.turn);
        });

    }]);
})();
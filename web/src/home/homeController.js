(function() {
    'use strict;'

    angular.module('app').controller('HomeController', ['EventService', '$interval', '$scope', function(eventService, $interval, $scope) {
        var self = this;
        self.drive = 0;
        self.turn = 0;
        self.isFiring = false;
        self.elevation = 0;
        var elevationDelta = 0.025;

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
        
        var buttons = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15];
        self.buttons = {};
        buttons.forEach(function(i) {
            self.buttons[''+i] = false;
        });

        var targetTurn = 0, targetDrive = 0;
        $interval(function() {
            var gp = navigator.getGamepads()[0];
            if (gp && gp.connected) {
                targetTurn = applyDeadzone(gp.axes[2], targetTurn);
                targetDrive = -applyDeadzone(gp.axes[1], -targetDrive);
                self.turn = applySmooth(targetTurn, self.turn);
                self.drive = applySmooth(targetDrive, self.drive);
                // if(gp.buttons[12].pressed) {
                //     self.elevation += elevationDelta;
                // }
                // if(gp.buttons[13].pressed) {
                //     self.elevation -= elevationDelta;
                // }
                buttons.forEach(function(i) {
                    self.buttons[''+i] = gp.buttons[i].pressed;
                });
                self.elevation = Math.min(1, Math.max(-1, self.elevation));
                self.isFiring = gp.buttons[7].pressed;
                if(self.isFiring) {
                    eventService.send('fire', {} );
                }
            } else {
                self.drive = 0;
                self.turn = 0;
                self.elevation = 0;
                self.isFiring = false;
            }
        }, 25);

        $scope.$watchCollection('[c.drive, c.turn]', function() {
            eventService.send('drive', { drive: self.drive, turn: self.turn });
        });
        $scope.$watch('c.elevation', function() {
            eventService.send('setElevation', { value: self.elevation });
        });
        $scope.$watch('c.buttons["6"]', function(v) {
            if(v) eventService.send('stop', { });
        });
        $scope.$watch('c.buttons["4"]', function(v) {
            if(v) eventService.send('start', { });
        });
        $scope.$watch('c.buttons["5"]', function(v) {
            if(v) eventService.send('safe', { });
        });
        $scope.$watch('c.buttons["0"]', function(v) {
            if(v) eventService.send('beep', { });
        });
        $scope.$watch('c.buttons["1"]', function(v) {
            if(v) eventService.send('chargeSong', { });
        });
        $scope.$watch('c.buttons["2"]', function(v) {
            if(v) eventService.send('mario11', { });
        });
        $scope.$watch('c.buttons["3"]', function(v) {
            if(v) eventService.send('marioOver', { });
        });
        self.status = {};
        $scope.$on('destroy', eventService.on('status', function(status) {
            self.status = status;
        }));
        
        ['wakeup', 'start', 'reset', 'stop', 'safe', 'dock', 'off', 'beep', 'auxPowerOn', 'auxPowerOff', 'chargeSong', 'ironManSong', 'mario11', 'mario12', 'marioOver'].forEach(function(cmd) {
            self[cmd] = function() {
                eventService.send(cmd, {});
            };
        });
    }]);
})();
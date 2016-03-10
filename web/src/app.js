(function() {
    'use strict;'

    angular.module('app', ['ng', 'ngTouch', 'ui.router', 'matchmedia-ng', 'ui.bootstrap']).config(['$urlRouterProvider', function($urlRouterProvider) {
        $urlRouterProvider.otherwise('/');
    }])
})();
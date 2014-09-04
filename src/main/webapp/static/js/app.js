/** --- Main configuration --- */

var reportModule = angular.module('report', []);

var openApp = angular.module('open', ['ngRoute', 'ngResource', reportModule.name]);
openApp.constant('appProps', {
    ctxPath: window.ctxPath
});

openApp.config(['$routeProvider', '$locationProvider', function($routeProvider, $locationProvider) {

    /** --- Reports --- */

    $routeProvider.when(ctxPath + '/report', {
        redirectTo: ctxPath + '/report/daybreak'
    });

    $routeProvider.when(ctxPath + '/report/daybreak', {
        templateUrl: ctxPath + '/static/partial/report/daybreak-report-summary.html',
        controller: 'DaybreakSummaryCtrl'
    });

    $locationProvider.html5Mode(true);
    $locationProvider.hashPrefix('!');
}]);



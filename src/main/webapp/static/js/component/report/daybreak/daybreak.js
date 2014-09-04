var reportModule = angular.module('report');

var dateOutputFormat = "M/DD/YYYY H:mm";
var ISODateFormat = "YYYY-MM-DD";

reportModule.filter('default', ['$filter', function($filter) {
    return function(input, defaultVal) {
        return (!input) ? defaultVal : input;
    };
}]);

reportModule.filter('moment', ['$filter', function($filter) {
    return function(input, format) {
        return moment(input).format(format);
    };
}]);

/** --- REST resource for retrieving daybreak summaries within a date range --- */

reportModule.factory('DaybreakSummary', ['$resource', function($resource) {
    return $resource(apiPath + "/spotcheck/daybreaks/:startDate/:endDate", {
        startDate: '@startDate', endDate: '@endDate'
    });
}]);

/** --- REST resource for retrieving a single daybreak report --- */

reportModule.factory('DaybreakDetail', ['$resource', function($resource) {
    return $resource(apiPath + "/spotcheck/daybreaks/:reportDateTime", {
        reportDateTime: '@reportDateTime'
    });
}]);

/** --- Controller that handles report summary page --- */

reportModule.controller('DaybreakSummaryCtrl', ['$scope', '$filter', 'DaybreakSummary',
                        function($scope, $filter, DaybreakSummary) {
    $scope.title = 'LBDC Daybreak Reports';

    // Date filter properties
    $scope.startDate = moment().subtract(6, 'months').startOf('month');
    $scope.endDate = moment().endOf('month');
    $scope.yearList = getValidYears();
    $scope.monthList = getMonths();

    // Used for binding to the select menus
    $scope.dateRange = {
        startMonth: $scope.monthList[$scope.startDate.get('month')],
        startYear: $scope.yearList[$scope.startDate.get('year')],
        endMonth: $scope.monthList[$scope.endDate.get('month')],
        endYear: $scope.yearList[$scope.endDate.get('year')]
    };

    $scope.reportChartStatus = "openClosed";

    $scope.$watch('dateRange', function() {
        // Adjust the start and end month/years accordingly such that they represent a valid range
        if ($scope.dateRange.endMonth.value < $scope.dateRange.startMonth.value) {
            $scope.dateRange.startMonth = $scope.dateRange.endMonth;
        }
        else if ($scope.dateRange.startMonth.value > $scope.dateRange.endMonth.value) {
            $scope.dateRange.endMonth = $scope.dateRange.startMonth;
        }
        if ($scope.dateRange.endYear.value < $scope.dateRange.startYear.value) {
            $scope.dateRange.startYear = $scope.dateRange.endYear;
        }
        else if ($scope.dateRange.startYear.value > $scope.dateRange.endYear.value) {
            $scope.dateRange.endYear = $scope.dateRange.startYear;
        }
        // Update the start and end moments as well
        $scope.startDate.set('month', $scope.dateRange.startMonth.value).set('year', $scope.dateRange.startYear.value);
        $scope.endDate.set('month', $scope.dateRange.endMonth.value).set('year', $scope.dateRange.endYear.value);
    }, true);

    // Obtain the initial summaries
    $scope.summaries = DaybreakSummary.get({startDate: $scope.startDate.format(ISODateFormat),
                                          endDate: $scope.endDate.format(ISODateFormat)}, function() {
        console.log($scope.getMismatchStatusSeries());
        console.log($scope.getReportDateSeries());
        drawMismatchStatusGraph($scope.getReportDateSeries(), $scope.getMismatchStatusSeries());
    });

    // Compute the total number of mismatches for a given type.
    $scope.computeMismatchCount = function(summaryItem, type) {
        var defaultFilter = $filter('default');
        var mismatchType = summaryItem['mismatchTypes'][type];
        if (!mismatchType) return 0;
        return (defaultFilter(mismatchType['NEW'], 0) +
            defaultFilter(mismatchType['EXISTING'], 0) +
            defaultFilter(mismatchType['REGRESSION'], 0));
    };

    $scope.computeMismatchDiff = function(summaryItem, type, abs) {
        var defaultFilter = $filter('default');
        var mismatchType = summaryItem['mismatchTypes'][type];
        var diff = (defaultFilter(mismatchType['NEW'], 0) +
                defaultFilter(mismatchType['REGRESSION'], 0) -
                defaultFilter(mismatchType['RESOLVED'], 0));
        return (abs) ? Math.abs(diff) : diff;
    };

    // Return a css class based on whether the mismatch count is positive or negative
    $scope.mismatchDiffClass = function(summaryItem, type) {
        var val = $scope.computeMismatchDiff(summaryItem, type, false);
        if (val > 0) {
            return "postfix-icon icon-arrow-up2 new-error";
        }
        else if (val < 0) {
            return "postfix-icon icon-arrow-down2 closed-error";
        }
        return "postfix-icon icon-minus3 existing-error";
    };

    // Obtains an array containing mismatch status series to be consumed by the chart
    $scope.getMismatchStatusSeries = function() {
        if ($scope.summaries && $scope.summaries.reports.size > 0) {
            var existing = [], newRegr = [], resolved = [];
            angular.forEach($scope.summaries.reports.items, function(value, key) {
                existing.push(value.mismatchStatuses['EXISTING']);
                newRegr.push(value.mismatchStatuses['NEW'] + value.mismatchStatuses['REGRESSION']);
                resolved.push(value.mismatchStatuses['RESOLVED']);
            });
            return [{ name: 'Resolved', data: resolved.reverse()},
                    { name: 'New/Regression', data: newRegr.reverse()},
                    { name: 'Existing', data: existing.reverse()}];
        }
        return [];
    };

    // Obtains an array containing nicely formatted report dates to be used in the x-axis of the chart
    $scope.getReportDateSeries = function() {
        var reportDates = [];
        if ($scope.summaries && $scope.summaries.reports.size > 0) {
            angular.forEach($scope.summaries.reports.items, function(value, key) {
                reportDates.push(moment(value.reportDateTime).format('lll'));
            });
        }
        return reportDates.reverse();
    };
//    $scope.updateReports = function() {
//        console.log("Updating reports...");
//        $scope.reports = getReports($scope.startDate.date, $scope.endDate.date);
//        $scope.errorCounts = getErrorCounts($scope.reports);
//        $scope.updateReportChart();
//    };

    $scope.updateReportChart = function() {
        if ($scope.reportChartStatus === 'openClosed'){
            unHideReportChart();
            drawMismatchStatusGraph();
        }
//        else if($scope.reportChartStatus === 'errorType'){
//            unHideReportChart();
//            drawErrorTypeChart($scope.errorCounts);
//        }
//        else if($scope.reportChartStatus === 'hidden'){
//            hideReportChart();
//        }
        else {
            console.log("Invalid chart view option: " + $scope.reportChartStatus);
        }
    };

    $scope.getEntryDiffClass = function(currentCount, previousCount){
        return getEntryDiffClass(currentCount, previousCount);
    };

//    $scope.$watch('reportChartStatus', $scope.updateReportChart );
//
//    $scope.$watch('startDate.month', function() { updateStartDate($scope.startDate); $scope.updateReports(); }, true);
//    $scope.$watch('endDate', function() { updateEndDate($scope.endDate); $scope.updateReports(); }, true);

//    $scope.updateReports();

}]);

function drawMismatchStatusGraph(reportDates, dataSeries) {
    $('#report-chart-area').highcharts({
        chart: {
            type: 'area',
            height: 300
        },
        title: {
            text: ''
        },
        xAxis: {
            categories: reportDates,
            title: {
                text: 'Report Date'
            }
        },
        yAxis: {
            min: 0,
            title: {
                text: 'Error Count'
            },
            stackLabels: {
                enabled: true,
                style: {
                    fontWeight: 'bold',
                    color: (Highcharts.theme && Highcharts.theme.textColor) || 'gray'
                }
            },
            gridLineColor: '#ddd',
            gridLineDashStyle: 'longdash'
        },
        legend: {
            borderWidth: 0
        },
        tooltip: {
            formatter: function() {
                return '<b>'+ this.x +'</b><br/>'+
                    this.series.name +': '+ this.y +'<br/>'+
                    'Total: '+ this.point.stackTotal;
            }
        },
        plotOptions: {
            area: { stacking: 'normal'},
            column: {
                stacking: 'normal',
                dataLabels: {
                    enabled: false
                }
            }
        },
        colors: ['#6BFFF5', '#FF6B75', '#FFB44A'],
        series: dataSeries
    });
}

function drawErrorTypeChart(errorCounts){
    $('#report-chart-area').highcharts({
        chart: {
            type: 'area',
            height: 300
        },
        title: {
            text: ''
        },
        xAxis: {
            categories: errorCounts.reportDates,
            title: {
                text: 'Report Date'
            }
        },
        yAxis: {
            min: 0,
            title: {
                text: 'Error Count'
            },
            stackLabels: {
                enabled: true,
                style: {
                    fontWeight: 'bold',
                    color: (Highcharts.theme && Highcharts.theme.textColor) || 'gray'
                }
            },
            gridLineColor: '#ddd',
            gridLineDashStyle: 'longdash'
        },
        legend: {
            borderWidth: 0
        },
        tooltip: {
            formatter: function() {
                return '<b>'+ this.x +'</b><br/>'+
                    this.series.name +': '+ this.y +'<br/>'+
                    'Total: '+ this.point.stackTotal;
            }
        },
        plotOptions: {
            area: { stacking: 'normal'},
            column: {
                stacking: 'normal',
                dataLabels: {
                    enabled: false
                }
            }
        },
        series: [{
            name: 'Sponsor',
            data: errorCounts.sponsorErrorCounts
        }, {
            name: 'Co/Multi Sponsor',
            data: errorCounts.coSponsorErrorCounts
        }, {
            name: 'Title',
            data: errorCounts.titleErrorCounts
        }, {
            name: 'Law / Summary',
            data: errorCounts.lawSummaryErrorCounts
        }, {
            name: 'Action',
            data: errorCounts.actionErrorCounts
        }, {
            name: 'Page',
            data: errorCounts.pageErrorCounts
        }, {
            name: 'Versions',
            data: errorCounts.versionErrorCounts
        }]
    });
}

function unHideReportChart(){
    $(".reportChart").css("height", "300px")
        .css("width", "100%")
        .css("visibility", "visible");
}

function hideReportChart(){
    $(".reportChart").css("height", "0px")
        .css("width", "0%")
        .css("visibility", "hidden");
}

function getEntryDiff(currentCount, previousCount) {
    var difference = currentCount - previousCount;
    var numberSign = "";
    if(difference==0 || isNaN(difference)) {
        return "";
    }
    else if(difference>0){
        numberSign = "+";
    }
    return numberSign + difference;
}

function getEntryDiffClass(currentCount, previousCount) {
    var difference = currentCount - previousCount;
    var elementClass = "";
    if(difference === 0 || isNaN(difference)) {
        return "reportEntryDiffHidden";
    }
    else if(difference>0){
        return "reportEntryDiffPositive";
    }
    return "reportEntryDiffNegative";
}

function getValidYears() {
    var years = {};
    var currentYear = moment().get('year');
    for (var year = 2014; year <= currentYear; year++) {
        years[year] = {value: year};
    }
    return years
}

function getMonths() {
    return [{value: 0, name: "Jan"}, {value: 1, name: "Feb"}, {value: 2, name: "Mar"}, {value: 3, name: "Apr"},
            {value: 4, name: "May"}, {value: 5, name: "Jun"}, {value: 6, name: "Jul"}, {value: 7, name: "Aug"},
            {value: 8, name: "Sep"}, {value: 9, name: "Oct"}, {value: 10, name: "Nov"}, {value: 11, name: "Dec"}];
}

function sortByIntValue(input){

}

function getDefaultEndDate(){
    var now = moment();
    return { date: now, month: (now.month()+1), year: now.year() };
}

function getDefaultStartDate(startDate){
    var offsetDate = moment(startDate).subtract('2', 'months');
    return { date: offsetDate, month: (offsetDate.month()+1), year: offsetDate.year() };
}

function updateStartDate(startDate){
    var dateString = startDate.year + "-" + startDate.month;
    startDate.date = moment(dateString, "YYYY-MM");
    console.log("updated start date object: " + startDate.date.format(dateOutputFormat));
}

function updateEndDate(endDate){
    var dateString = endDate.year + "-" + endDate.month;
    endDate.date = moment(dateString, "YYYY-MM").endOf('month');
    console.log("updated end date object: " + endDate.date.format(dateOutputFormat));
}
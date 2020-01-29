var app = angular.module('reportingApp', []);

//<editor-fold desc="global helpers">

var isValueAnArray = function (val) {
    return Array.isArray(val);
};

var getSpec = function (str) {
    var describes = str.split('|');
    return describes[describes.length - 1];
};
var checkIfShouldDisplaySpecName = function (prevItem, item) {
    if (!prevItem) {
        item.displaySpecName = true;
    } else if (getSpec(item.description) !== getSpec(prevItem.description)) {
        item.displaySpecName = true;
    }
};

var getParent = function (str) {
    var arr = str.split('|');
    str = "";
    for (var i = arr.length - 2; i > 0; i--) {
        str += arr[i] + " > ";
    }
    return str.slice(0, -3);
};

var getShortDescription = function (str) {
    return str.split('|')[0];
};

var countLogMessages = function (item) {
    if ((!item.logWarnings || !item.logErrors) && item.browserLogs && item.browserLogs.length > 0) {
        item.logWarnings = 0;
        item.logErrors = 0;
        for (var logNumber = 0; logNumber < item.browserLogs.length; logNumber++) {
            var logEntry = item.browserLogs[logNumber];
            if (logEntry.level === 'SEVERE') {
                item.logErrors++;
            }
            if (logEntry.level === 'WARNING') {
                item.logWarnings++;
            }
        }
    }
};

var convertTimestamp = function (timestamp) {
    var d = new Date(timestamp),
        yyyy = d.getFullYear(),
        mm = ('0' + (d.getMonth() + 1)).slice(-2),
        dd = ('0' + d.getDate()).slice(-2),
        hh = d.getHours(),
        h = hh,
        min = ('0' + d.getMinutes()).slice(-2),
        ampm = 'AM',
        time;

    if (hh > 12) {
        h = hh - 12;
        ampm = 'PM';
    } else if (hh === 12) {
        h = 12;
        ampm = 'PM';
    } else if (hh === 0) {
        h = 12;
    }

    // ie: 2013-02-18, 8:35 AM
    time = yyyy + '-' + mm + '-' + dd + ', ' + h + ':' + min + ' ' + ampm;

    return time;
};

var defaultSortFunction = function sortFunction(a, b) {
    if (a.sessionId < b.sessionId) {
        return -1;
    } else if (a.sessionId > b.sessionId) {
        return 1;
    }

    if (a.timestamp < b.timestamp) {
        return -1;
    } else if (a.timestamp > b.timestamp) {
        return 1;
    }

    return 0;
};

//</editor-fold>

app.controller('ScreenshotReportController', ['$scope', '$http', 'TitleService', function ($scope, $http, titleService) {
    var that = this;
    var clientDefaults = {};

    $scope.searchSettings = Object.assign({
        description: '',
        allselected: true,
        passed: true,
        failed: true,
        pending: true,
        withLog: true
    }, clientDefaults.searchSettings || {}); // enable customisation of search settings on first page hit

    this.warningTime = 1400;
    this.dangerTime = 1900;
    this.totalDurationFormat = clientDefaults.totalDurationFormat;
    this.showTotalDurationIn = clientDefaults.showTotalDurationIn;

    var initialColumnSettings = clientDefaults.columnSettings; // enable customisation of visible columns on first page hit
    if (initialColumnSettings) {
        if (initialColumnSettings.displayTime !== undefined) {
            // initial settings have be inverted because the html bindings are inverted (e.g. !ctrl.displayTime)
            this.displayTime = !initialColumnSettings.displayTime;
        }
        if (initialColumnSettings.displayBrowser !== undefined) {
            this.displayBrowser = !initialColumnSettings.displayBrowser; // same as above
        }
        if (initialColumnSettings.displaySessionId !== undefined) {
            this.displaySessionId = !initialColumnSettings.displaySessionId; // same as above
        }
        if (initialColumnSettings.displayOS !== undefined) {
            this.displayOS = !initialColumnSettings.displayOS; // same as above
        }
        if (initialColumnSettings.inlineScreenshots !== undefined) {
            this.inlineScreenshots = initialColumnSettings.inlineScreenshots; // this setting does not have to be inverted
        } else {
            this.inlineScreenshots = false;
        }
        if (initialColumnSettings.warningTime) {
            this.warningTime = initialColumnSettings.warningTime;
        }
        if (initialColumnSettings.dangerTime) {
            this.dangerTime = initialColumnSettings.dangerTime;
        }
    }


    this.chooseAllTypes = function () {
        var value = true;
        $scope.searchSettings.allselected = !$scope.searchSettings.allselected;
        if (!$scope.searchSettings.allselected) {
            value = false;
        }

        $scope.searchSettings.passed = value;
        $scope.searchSettings.failed = value;
        $scope.searchSettings.pending = value;
        $scope.searchSettings.withLog = value;
    };

    this.isValueAnArray = function (val) {
        return isValueAnArray(val);
    };

    this.getParent = function (str) {
        return getParent(str);
    };

    this.getSpec = function (str) {
        return getSpec(str);
    };

    this.getShortDescription = function (str) {
        return getShortDescription(str);
    };
    this.hasNextScreenshot = function (index) {
        var old = index;
        return old !== this.getNextScreenshotIdx(index);
    };

    this.hasPreviousScreenshot = function (index) {
        var old = index;
        return old !== this.getPreviousScreenshotIdx(index);
    };
    this.getNextScreenshotIdx = function (index) {
        var next = index;
        var hit = false;
        while (next + 2 < this.results.length) {
            next++;
            if (this.results[next].screenShotFile && !this.results[next].pending) {
                hit = true;
                break;
            }
        }
        return hit ? next : index;
    };

    this.getPreviousScreenshotIdx = function (index) {
        var prev = index;
        var hit = false;
        while (prev > 0) {
            prev--;
            if (this.results[prev].screenShotFile && !this.results[prev].pending) {
                hit = true;
                break;
            }
        }
        return hit ? prev : index;
    };

    this.convertTimestamp = convertTimestamp;


    this.round = function (number, roundVal) {
        return (parseFloat(number) / 1000).toFixed(roundVal);
    };


    this.passCount = function () {
        var passCount = 0;
        for (var i in this.results) {
            var result = this.results[i];
            if (result.passed) {
                passCount++;
            }
        }
        return passCount;
    };


    this.pendingCount = function () {
        var pendingCount = 0;
        for (var i in this.results) {
            var result = this.results[i];
            if (result.pending) {
                pendingCount++;
            }
        }
        return pendingCount;
    };

    this.failCount = function () {
        var failCount = 0;
        for (var i in this.results) {
            var result = this.results[i];
            if (!result.passed && !result.pending) {
                failCount++;
            }
        }
        return failCount;
    };

    this.totalDuration = function () {
        var sum = 0;
        for (var i in this.results) {
            var result = this.results[i];
            if (result.duration) {
                sum += result.duration;
            }
        }
        return sum;
    };

    this.passPerc = function () {
        return (this.passCount() / this.totalCount()) * 100;
    };
    this.pendingPerc = function () {
        return (this.pendingCount() / this.totalCount()) * 100;
    };
    this.failPerc = function () {
        return (this.failCount() / this.totalCount()) * 100;
    };
    this.totalCount = function () {
        return this.passCount() + this.failCount() + this.pendingCount();
    };


    var results = [
    {
        "description": "1.Given a GUEST: And I am on Homepage|Scenario 3: Guest filters shore excursions results using price range",
        "passed": true,
        "pending": false,
        "os": "Mac OS X",
        "instanceId": 47935,
        "browser": {
            "name": "chrome",
            "version": "79.0.3945.130"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "https://www.ncl.com/ 0 The value \"device-320\" for key \"width\" is invalid, and has been ignored.",
                "timestamp": 1580275801191,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://www.ncl.com/ - [DOM] Found 2 elements with non-unique id #Amsterdam, Netherlands: (More info: https://goo.gl/9p2vKq) %o %o",
                "timestamp": 1580275802912,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://www.ncl.com/ - [DOM] Found 2 elements with non-unique id #Athens (Piraeus), Greece: (More info: https://goo.gl/9p2vKq) %o %o",
                "timestamp": 1580275802912,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://www.ncl.com/ - [DOM] Found 2 elements with non-unique id #Auckland, New Zealand: (More info: https://goo.gl/9p2vKq) %o %o",
                "timestamp": 1580275802912,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://www.ncl.com/ - [DOM] Found 2 elements with non-unique id #Barcelona, Spain: (More info: https://goo.gl/9p2vKq) %o %o",
                "timestamp": 1580275802912,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://www.ncl.com/ - [DOM] Found 2 elements with non-unique id #Boston, Massachusetts: (More info: https://goo.gl/9p2vKq) %o %o",
                "timestamp": 1580275802913,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://www.ncl.com/ - [DOM] Found 2 elements with non-unique id #Buenos Aires, Argentina: (More info: https://goo.gl/9p2vKq) %o %o",
                "timestamp": 1580275802913,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://www.ncl.com/ - [DOM] Found 2 elements with non-unique id #Cape Town, South Africa: (More info: https://goo.gl/9p2vKq) %o %o",
                "timestamp": 1580275802913,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://www.ncl.com/ - [DOM] Found 2 elements with non-unique id #Copenhagen, Denmark: (More info: https://goo.gl/9p2vKq) %o %o",
                "timestamp": 1580275802913,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://www.ncl.com/ - [DOM] Found 2 elements with non-unique id #Dubai, United Arab Emirates: (More info: https://goo.gl/9p2vKq) %o %o",
                "timestamp": 1580275802914,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://www.ncl.com/ - [DOM] Found 2 elements with non-unique id #Hong Kong, China: (More info: https://goo.gl/9p2vKq) %o %o",
                "timestamp": 1580275802914,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://www.ncl.com/ - [DOM] Found 2 elements with non-unique id #Honolulu, Oahu: (More info: https://goo.gl/9p2vKq) %o %o",
                "timestamp": 1580275802914,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://www.ncl.com/ - [DOM] Found 2 elements with non-unique id #Lisbon, Portugal: (More info: https://goo.gl/9p2vKq) %o %o",
                "timestamp": 1580275802914,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://www.ncl.com/ - [DOM] Found 2 elements with non-unique id #London (Southampton), England: (More info: https://goo.gl/9p2vKq) %o %o",
                "timestamp": 1580275802914,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://www.ncl.com/ - [DOM] Found 2 elements with non-unique id #Los Angeles, California: (More info: https://goo.gl/9p2vKq) %o %o",
                "timestamp": 1580275802915,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://www.ncl.com/ - [DOM] Found 2 elements with non-unique id #Miami, Florida: (More info: https://goo.gl/9p2vKq) %o %o",
                "timestamp": 1580275802915,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://www.ncl.com/ - [DOM] Found 2 elements with non-unique id #New Orleans, Louisiana: (More info: https://goo.gl/9p2vKq) %o %o",
                "timestamp": 1580275802915,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://www.ncl.com/ - [DOM] Found 2 elements with non-unique id #New York, New York: (More info: https://goo.gl/9p2vKq) %o %o",
                "timestamp": 1580275802915,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://www.ncl.com/ - [DOM] Found 2 elements with non-unique id #Orlando & Beaches (Port Canaveral): (More info: https://goo.gl/9p2vKq) %o %o",
                "timestamp": 1580275802916,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://www.ncl.com/ - [DOM] Found 2 elements with non-unique id #Papeete, Tahiti, French Polynesia: (More info: https://goo.gl/9p2vKq) %o %o",
                "timestamp": 1580275802916,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://www.ncl.com/ - [DOM] Found 2 elements with non-unique id #Port Kembla, Australia: (More info: https://goo.gl/9p2vKq) %o %o",
                "timestamp": 1580275802916,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://www.ncl.com/ - [DOM] Found 2 elements with non-unique id #Québec City, Québec: (More info: https://goo.gl/9p2vKq) %o %o",
                "timestamp": 1580275802916,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://www.ncl.com/ - [DOM] Found 2 elements with non-unique id #Rome (Civitavecchia), Italy: (More info: https://goo.gl/9p2vKq) %o %o",
                "timestamp": 1580275802916,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://www.ncl.com/ - [DOM] Found 2 elements with non-unique id #San Diego, California: (More info: https://goo.gl/9p2vKq) %o %o",
                "timestamp": 1580275802917,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://www.ncl.com/ - [DOM] Found 2 elements with non-unique id #San Juan, Puerto Rico: (More info: https://goo.gl/9p2vKq) %o %o",
                "timestamp": 1580275802917,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://www.ncl.com/ - [DOM] Found 2 elements with non-unique id #Santiago (San Antonio), Chile: (More info: https://goo.gl/9p2vKq) %o %o",
                "timestamp": 1580275802917,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://www.ncl.com/ - [DOM] Found 2 elements with non-unique id #Seattle, Washington: (More info: https://goo.gl/9p2vKq) %o %o",
                "timestamp": 1580275802918,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://www.ncl.com/ - [DOM] Found 2 elements with non-unique id #Seward, Alaska: (More info: https://goo.gl/9p2vKq) %o %o",
                "timestamp": 1580275802918,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://www.ncl.com/ - [DOM] Found 2 elements with non-unique id #Singapore, Singapore: (More info: https://goo.gl/9p2vKq) %o %o",
                "timestamp": 1580275802918,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://www.ncl.com/ - [DOM] Found 2 elements with non-unique id #Sydney, Australia: (More info: https://goo.gl/9p2vKq) %o %o",
                "timestamp": 1580275802918,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://www.ncl.com/ - [DOM] Found 2 elements with non-unique id #Tampa, Florida: (More info: https://goo.gl/9p2vKq) %o %o",
                "timestamp": 1580275802919,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://www.ncl.com/ - [DOM] Found 2 elements with non-unique id #Tokyo (Yokohama), Japan: (More info: https://goo.gl/9p2vKq) %o %o",
                "timestamp": 1580275802919,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://www.ncl.com/ - [DOM] Found 2 elements with non-unique id #Tokyo, Japan: (More info: https://goo.gl/9p2vKq) %o %o",
                "timestamp": 1580275802920,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://www.ncl.com/ - [DOM] Found 2 elements with non-unique id #Vancouver, British Columbia: (More info: https://goo.gl/9p2vKq) %o %o",
                "timestamp": 1580275802920,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://www.ncl.com/ - [DOM] Found 2 elements with non-unique id #Venice, Italy: (More info: https://goo.gl/9p2vKq) %o %o",
                "timestamp": 1580275802920,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://www.ncl.com/ - [DOM] Found 2 elements with non-unique id #signup-fiel-email: (More info: https://goo.gl/9p2vKq) %o %o",
                "timestamp": 1580275802921,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://www.ncl.com/ - [DOM] Found 2 elements with non-unique id #your-email-address: (More info: https://goo.gl/9p2vKq) %o %o",
                "timestamp": 1580275802921,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://www.ncl.com/ - A cookie associated with a cross-site resource at http://mpeasylink.com/ was set without the `SameSite` attribute. A future release of Chrome will only deliver cookies with cross-site requests if they are set with `SameSite=None` and `Secure`. You can review cookies in developer tools under Application>Storage>Cookies and see more details at https://www.chromestatus.com/feature/5088147346030592 and https://www.chromestatus.com/feature/5633521622188032.",
                "timestamp": 1580275803182,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://www.ncl.com/ - A cookie associated with a cross-site resource at http://norwegiancruiseline.mpeasylink.com/ was set without the `SameSite` attribute. A future release of Chrome will only deliver cookies with cross-site requests if they are set with `SameSite=None` and `Secure`. You can review cookies in developer tools under Application>Storage>Cookies and see more details at https://www.chromestatus.com/feature/5088147346030592 and https://www.chromestatus.com/feature/5633521622188032.",
                "timestamp": 1580275803446,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://www.ncl.com/ - A cookie associated with a cross-site resource at http://bing.com/ was set without the `SameSite` attribute. A future release of Chrome will only deliver cookies with cross-site requests if they are set with `SameSite=None` and `Secure`. You can review cookies in developer tools under Application>Storage>Cookies and see more details at https://www.chromestatus.com/feature/5088147346030592 and https://www.chromestatus.com/feature/5633521622188032.",
                "timestamp": 1580275803792,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://www.ncl.com/ - A cookie associated with a cross-site resource at http://bat.bing.com/ was set without the `SameSite` attribute. A future release of Chrome will only deliver cookies with cross-site requests if they are set with `SameSite=None` and `Secure`. You can review cookies in developer tools under Application>Storage>Cookies and see more details at https://www.chromestatus.com/feature/5088147346030592 and https://www.chromestatus.com/feature/5633521622188032.",
                "timestamp": 1580275803792,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://www.ncl.com/ - A cookie associated with a cross-site resource at http://www.facebook.com/ was set without the `SameSite` attribute. A future release of Chrome will only deliver cookies with cross-site requests if they are set with `SameSite=None` and `Secure`. You can review cookies in developer tools under Application>Storage>Cookies and see more details at https://www.chromestatus.com/feature/5088147346030592 and https://www.chromestatus.com/feature/5633521622188032.",
                "timestamp": 1580275804166,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://www.ncl.com/ - A cookie associated with a resource at http://doubleclick.net/ was set with `SameSite=None` but without `Secure`. A future release of Chrome will only deliver cookies marked `SameSite=None` if they are also marked `Secure`. You can review cookies in developer tools under Application>Storage>Cookies and see more details at https://www.chromestatus.com/feature/5633521622188032.",
                "timestamp": 1580275804302,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://www.ncl.com/ - A cookie associated with a cross-site resource at http://yahoo.com/ was set without the `SameSite` attribute. A future release of Chrome will only deliver cookies with cross-site requests if they are set with `SameSite=None` and `Secure`. You can review cookies in developer tools under Application>Storage>Cookies and see more details at https://www.chromestatus.com/feature/5088147346030592 and https://www.chromestatus.com/feature/5633521622188032.",
                "timestamp": 1580275804401,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://www.ncl.com/ - A cookie associated with a cross-site resource at https://yahoo.com/ was set without the `SameSite` attribute. A future release of Chrome will only deliver cookies with cross-site requests if they are set with `SameSite=None` and `Secure`. You can review cookies in developer tools under Application>Storage>Cookies and see more details at https://www.chromestatus.com/feature/5088147346030592 and https://www.chromestatus.com/feature/5633521622188032.",
                "timestamp": 1580275804401,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://www.ncl.com/ - A cookie associated with a cross-site resource at http://adsrvr.org/ was set without the `SameSite` attribute. A future release of Chrome will only deliver cookies with cross-site requests if they are set with `SameSite=None` and `Secure`. You can review cookies in developer tools under Application>Storage>Cookies and see more details at https://www.chromestatus.com/feature/5088147346030592 and https://www.chromestatus.com/feature/5633521622188032.",
                "timestamp": 1580275804747,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://www.ncl.com/ - A cookie associated with a resource at http://adnxs.com/ was set with `SameSite=None` but without `Secure`. A future release of Chrome will only deliver cookies marked `SameSite=None` if they are also marked `Secure`. You can review cookies in developer tools under Application>Storage>Cookies and see more details at https://www.chromestatus.com/feature/5633521622188032.",
                "timestamp": 1580275804755,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://www.ncl.com/ - A cookie associated with a cross-site resource at http://bh.contextweb.com/ was set without the `SameSite` attribute. A future release of Chrome will only deliver cookies with cross-site requests if they are set with `SameSite=None` and `Secure`. You can review cookies in developer tools under Application>Storage>Cookies and see more details at https://www.chromestatus.com/feature/5088147346030592 and https://www.chromestatus.com/feature/5633521622188032.",
                "timestamp": 1580275804756,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://www.ncl.com/ - A cookie associated with a cross-site resource at http://contextweb.com/ was set without the `SameSite` attribute. A future release of Chrome will only deliver cookies with cross-site requests if they are set with `SameSite=None` and `Secure`. You can review cookies in developer tools under Application>Storage>Cookies and see more details at https://www.chromestatus.com/feature/5088147346030592 and https://www.chromestatus.com/feature/5633521622188032.",
                "timestamp": 1580275804757,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://www.ncl.com/ - A cookie associated with a cross-site resource at http://doubleclick.net/ was set without the `SameSite` attribute. A future release of Chrome will only deliver cookies with cross-site requests if they are set with `SameSite=None` and `Secure`. You can review cookies in developer tools under Application>Storage>Cookies and see more details at https://www.chromestatus.com/feature/5088147346030592 and https://www.chromestatus.com/feature/5633521622188032.",
                "timestamp": 1580275804793,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://www.ncl.com/ - A cookie associated with a resource at http://adsrvr.org/ was set with `SameSite=None` but without `Secure`. A future release of Chrome will only deliver cookies marked `SameSite=None` if they are also marked `Secure`. You can review cookies in developer tools under Application>Storage>Cookies and see more details at https://www.chromestatus.com/feature/5633521622188032.",
                "timestamp": 1580275805100,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://www.ncl.com/ - A cookie associated with a cross-site resource at http://skimresources.com/ was set without the `SameSite` attribute. A future release of Chrome will only deliver cookies with cross-site requests if they are set with `SameSite=None` and `Secure`. You can review cookies in developer tools under Application>Storage>Cookies and see more details at https://www.chromestatus.com/feature/5088147346030592 and https://www.chromestatus.com/feature/5633521622188032.",
                "timestamp": 1580275805192,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://idsync.rlcdn.com/394499.gif?partner_uid=2021956007759 - Failed to load resource: net::ERR_CONNECTION_TIMED_OUT",
                "timestamp": 1580275880699,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://www.ncl.com/ - A cookie associated with a cross-site resource at http://twitter.com/ was set without the `SameSite` attribute. A future release of Chrome will only deliver cookies with cross-site requests if they are set with `SameSite=None` and `Secure`. You can review cookies in developer tools under Application>Storage>Cookies and see more details at https://www.chromestatus.com/feature/5088147346030592 and https://www.chromestatus.com/feature/5633521622188032.",
                "timestamp": 1580275880984,
                "type": ""
            }
        ],
        "screenShotFile": "images/001100c2-0055-0039-0020-008b0054007f.png",
        "timestamp": 1580275881188,
        "duration": 78
    },
    {
        "description": "2.And: I navigate to \"Shore Excursion\" page|Scenario 3: Guest filters shore excursions results using price range",
        "passed": true,
        "pending": false,
        "os": "Mac OS X",
        "instanceId": 47935,
        "browser": {
            "name": "chrome",
            "version": "79.0.3945.130"
        },
        "message": "Passed",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "https://www.ncl.com/ - A cookie associated with a cross-site resource at https://d.la3-c2-ia2.salesforceliveagent.com/ was set without the `SameSite` attribute. A future release of Chrome will only deliver cookies with cross-site requests if they are set with `SameSite=None` and `Secure`. You can review cookies in developer tools under Application>Storage>Cookies and see more details at https://www.chromestatus.com/feature/5088147346030592 and https://www.chromestatus.com/feature/5633521622188032.",
                "timestamp": 1580275881584,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://www.ncl.com/ - A cookie associated with a cross-site resource at http://iperceptions.com/ was set without the `SameSite` attribute. A future release of Chrome will only deliver cookies with cross-site requests if they are set with `SameSite=None` and `Secure`. You can review cookies in developer tools under Application>Storage>Cookies and see more details at https://www.chromestatus.com/feature/5088147346030592 and https://www.chromestatus.com/feature/5633521622188032.",
                "timestamp": 1580275882568,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://www.ncl.com/shore-excursions - A cookie associated with a cross-site resource at http://norwegiancruiseline.mpeasylink.com/ was set without the `SameSite` attribute. A future release of Chrome will only deliver cookies with cross-site requests if they are set with `SameSite=None` and `Secure`. You can review cookies in developer tools under Application>Storage>Cookies and see more details at https://www.chromestatus.com/feature/5088147346030592 and https://www.chromestatus.com/feature/5633521622188032.",
                "timestamp": 1580275885512,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://www.ncl.com/shore-excursions - A cookie associated with a cross-site resource at http://mpeasylink.com/ was set without the `SameSite` attribute. A future release of Chrome will only deliver cookies with cross-site requests if they are set with `SameSite=None` and `Secure`. You can review cookies in developer tools under Application>Storage>Cookies and see more details at https://www.chromestatus.com/feature/5088147346030592 and https://www.chromestatus.com/feature/5633521622188032.",
                "timestamp": 1580275885569,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://www.ncl.com/shore-excursions - A cookie associated with a cross-site resource at http://bing.com/ was set without the `SameSite` attribute. A future release of Chrome will only deliver cookies with cross-site requests if they are set with `SameSite=None` and `Secure`. You can review cookies in developer tools under Application>Storage>Cookies and see more details at https://www.chromestatus.com/feature/5088147346030592 and https://www.chromestatus.com/feature/5633521622188032.",
                "timestamp": 1580275885742,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://www.ncl.com/shore-excursions - A cookie associated with a cross-site resource at http://bat.bing.com/ was set without the `SameSite` attribute. A future release of Chrome will only deliver cookies with cross-site requests if they are set with `SameSite=None` and `Secure`. You can review cookies in developer tools under Application>Storage>Cookies and see more details at https://www.chromestatus.com/feature/5088147346030592 and https://www.chromestatus.com/feature/5633521622188032.",
                "timestamp": 1580275885742,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://www.ncl.com/shore-excursions - A cookie associated with a cross-site resource at http://doubleclick.net/ was set without the `SameSite` attribute. A future release of Chrome will only deliver cookies with cross-site requests if they are set with `SameSite=None` and `Secure`. You can review cookies in developer tools under Application>Storage>Cookies and see more details at https://www.chromestatus.com/feature/5088147346030592 and https://www.chromestatus.com/feature/5633521622188032.",
                "timestamp": 1580275885757,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://www.ncl.com/shore-excursions - A cookie associated with a cross-site resource at http://bh.contextweb.com/ was set without the `SameSite` attribute. A future release of Chrome will only deliver cookies with cross-site requests if they are set with `SameSite=None` and `Secure`. You can review cookies in developer tools under Application>Storage>Cookies and see more details at https://www.chromestatus.com/feature/5088147346030592 and https://www.chromestatus.com/feature/5633521622188032.",
                "timestamp": 1580275885894,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://www.ncl.com/shore-excursions - A cookie associated with a cross-site resource at http://contextweb.com/ was set without the `SameSite` attribute. A future release of Chrome will only deliver cookies with cross-site requests if they are set with `SameSite=None` and `Secure`. You can review cookies in developer tools under Application>Storage>Cookies and see more details at https://www.chromestatus.com/feature/5088147346030592 and https://www.chromestatus.com/feature/5633521622188032.",
                "timestamp": 1580275885894,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://www.ncl.com/shore-excursions - A cookie associated with a resource at http://adnxs.com/ was set with `SameSite=None` but without `Secure`. A future release of Chrome will only deliver cookies marked `SameSite=None` if they are also marked `Secure`. You can review cookies in developer tools under Application>Storage>Cookies and see more details at https://www.chromestatus.com/feature/5633521622188032.",
                "timestamp": 1580275886079,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://www.ncl.com/shore-excursions - A cookie associated with a cross-site resource at http://www.facebook.com/ was set without the `SameSite` attribute. A future release of Chrome will only deliver cookies with cross-site requests if they are set with `SameSite=None` and `Secure`. You can review cookies in developer tools under Application>Storage>Cookies and see more details at https://www.chromestatus.com/feature/5088147346030592 and https://www.chromestatus.com/feature/5633521622188032.",
                "timestamp": 1580275886140,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://www.ncl.com/shore-excursions - A cookie associated with a resource at http://adfarm.mediaplex.com/ was set with `SameSite=None` but without `Secure`. A future release of Chrome will only deliver cookies marked `SameSite=None` if they are also marked `Secure`. You can review cookies in developer tools under Application>Storage>Cookies and see more details at https://www.chromestatus.com/feature/5633521622188032.",
                "timestamp": 1580275886140,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://www.ncl.com/shore-excursions - A cookie associated with a cross-site resource at http://adsrvr.org/ was set without the `SameSite` attribute. A future release of Chrome will only deliver cookies with cross-site requests if they are set with `SameSite=None` and `Secure`. You can review cookies in developer tools under Application>Storage>Cookies and see more details at https://www.chromestatus.com/feature/5088147346030592 and https://www.chromestatus.com/feature/5633521622188032.",
                "timestamp": 1580275886143,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://www.ncl.com/shore-excursions - A cookie associated with a resource at http://rundsp.com/ was set with `SameSite=None` but without `Secure`. A future release of Chrome will only deliver cookies marked `SameSite=None` if they are also marked `Secure`. You can review cookies in developer tools under Application>Storage>Cookies and see more details at https://www.chromestatus.com/feature/5633521622188032.",
                "timestamp": 1580275886143,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://www.ncl.com/shore-excursions - A cookie associated with a resource at http://adsrvr.org/ was set with `SameSite=None` but without `Secure`. A future release of Chrome will only deliver cookies marked `SameSite=None` if they are also marked `Secure`. You can review cookies in developer tools under Application>Storage>Cookies and see more details at https://www.chromestatus.com/feature/5633521622188032.",
                "timestamp": 1580275886145,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://www.ncl.com/shore-excursions - A cookie associated with a cross-site resource at https://yahoo.com/ was set without the `SameSite` attribute. A future release of Chrome will only deliver cookies with cross-site requests if they are set with `SameSite=None` and `Secure`. You can review cookies in developer tools under Application>Storage>Cookies and see more details at https://www.chromestatus.com/feature/5088147346030592 and https://www.chromestatus.com/feature/5633521622188032.",
                "timestamp": 1580275886304,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://www.ncl.com/shore-excursions - A cookie associated with a cross-site resource at http://yahoo.com/ was set without the `SameSite` attribute. A future release of Chrome will only deliver cookies with cross-site requests if they are set with `SameSite=None` and `Secure`. You can review cookies in developer tools under Application>Storage>Cookies and see more details at https://www.chromestatus.com/feature/5088147346030592 and https://www.chromestatus.com/feature/5633521622188032.",
                "timestamp": 1580275886304,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://www.ncl.com/shore-excursions - A cookie associated with a resource at http://mediaplex.com/ was set with `SameSite=None` but without `Secure`. A future release of Chrome will only deliver cookies marked `SameSite=None` if they are also marked `Secure`. You can review cookies in developer tools under Application>Storage>Cookies and see more details at https://www.chromestatus.com/feature/5633521622188032.",
                "timestamp": 1580275886324,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://www.ncl.com/shore-excursions - A cookie associated with a cross-site resource at http://iperceptions.com/ was set without the `SameSite` attribute. A future release of Chrome will only deliver cookies with cross-site requests if they are set with `SameSite=None` and `Secure`. You can review cookies in developer tools under Application>Storage>Cookies and see more details at https://www.chromestatus.com/feature/5088147346030592 and https://www.chromestatus.com/feature/5633521622188032.",
                "timestamp": 1580275886678,
                "type": ""
            }
        ],
        "screenShotFile": "images/0037009c-0091-00fa-00d2-001e009900c0.png",
        "timestamp": 1580275882674,
        "duration": 3999
    },
    {
        "description": "3.And: I click \"Find Excursions\" button|Scenario 3: Guest filters shore excursions results using price range",
        "passed": true,
        "pending": false,
        "os": "Mac OS X",
        "instanceId": 47935,
        "browser": {
            "name": "chrome",
            "version": "79.0.3945.130"
        },
        "message": "Passed",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "https://www.ncl.com/shore-excursions/search - A cookie associated with a cross-site resource at http://norwegiancruiseline.mpeasylink.com/ was set without the `SameSite` attribute. A future release of Chrome will only deliver cookies with cross-site requests if they are set with `SameSite=None` and `Secure`. You can review cookies in developer tools under Application>Storage>Cookies and see more details at https://www.chromestatus.com/feature/5088147346030592 and https://www.chromestatus.com/feature/5633521622188032.",
                "timestamp": 1580275890304,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://www.ncl.com/shore-excursions/search - A cookie associated with a cross-site resource at http://mpeasylink.com/ was set without the `SameSite` attribute. A future release of Chrome will only deliver cookies with cross-site requests if they are set with `SameSite=None` and `Secure`. You can review cookies in developer tools under Application>Storage>Cookies and see more details at https://www.chromestatus.com/feature/5088147346030592 and https://www.chromestatus.com/feature/5633521622188032.",
                "timestamp": 1580275890307,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://s.go-mpulse.net/boomerang/TCZKH-A3E5K-R7UEE-8AYTU-FWV9Y 15:23872 ",
                "timestamp": 1580275890496,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://www.ncl.com/shore-excursions/search - A cookie associated with a cross-site resource at http://bing.com/ was set without the `SameSite` attribute. A future release of Chrome will only deliver cookies with cross-site requests if they are set with `SameSite=None` and `Secure`. You can review cookies in developer tools under Application>Storage>Cookies and see more details at https://www.chromestatus.com/feature/5088147346030592 and https://www.chromestatus.com/feature/5633521622188032.",
                "timestamp": 1580275890574,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://www.ncl.com/shore-excursions/search - A cookie associated with a cross-site resource at http://bat.bing.com/ was set without the `SameSite` attribute. A future release of Chrome will only deliver cookies with cross-site requests if they are set with `SameSite=None` and `Secure`. You can review cookies in developer tools under Application>Storage>Cookies and see more details at https://www.chromestatus.com/feature/5088147346030592 and https://www.chromestatus.com/feature/5633521622188032.",
                "timestamp": 1580275890574,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://www.ncl.com/shore-excursions/search - A cookie associated with a cross-site resource at http://doubleclick.net/ was set without the `SameSite` attribute. A future release of Chrome will only deliver cookies with cross-site requests if they are set with `SameSite=None` and `Secure`. You can review cookies in developer tools under Application>Storage>Cookies and see more details at https://www.chromestatus.com/feature/5088147346030592 and https://www.chromestatus.com/feature/5633521622188032.",
                "timestamp": 1580275890580,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://www.ncl.com/shore-excursions/search - A cookie associated with a cross-site resource at http://www.facebook.com/ was set without the `SameSite` attribute. A future release of Chrome will only deliver cookies with cross-site requests if they are set with `SameSite=None` and `Secure`. You can review cookies in developer tools under Application>Storage>Cookies and see more details at https://www.chromestatus.com/feature/5088147346030592 and https://www.chromestatus.com/feature/5633521622188032.",
                "timestamp": 1580275890879,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://www.ncl.com/shore-excursions/search - A cookie associated with a cross-site resource at http://adsrvr.org/ was set without the `SameSite` attribute. A future release of Chrome will only deliver cookies with cross-site requests if they are set with `SameSite=None` and `Secure`. You can review cookies in developer tools under Application>Storage>Cookies and see more details at https://www.chromestatus.com/feature/5088147346030592 and https://www.chromestatus.com/feature/5633521622188032.",
                "timestamp": 1580275890879,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://www.ncl.com/shore-excursions/search - A cookie associated with a resource at http://adsrvr.org/ was set with `SameSite=None` but without `Secure`. A future release of Chrome will only deliver cookies marked `SameSite=None` if they are also marked `Secure`. You can review cookies in developer tools under Application>Storage>Cookies and see more details at https://www.chromestatus.com/feature/5633521622188032.",
                "timestamp": 1580275890920,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://www.ncl.com/shore-excursions/search - A cookie associated with a cross-site resource at http://iperceptions.com/ was set without the `SameSite` attribute. A future release of Chrome will only deliver cookies with cross-site requests if they are set with `SameSite=None` and `Secure`. You can review cookies in developer tools under Application>Storage>Cookies and see more details at https://www.chromestatus.com/feature/5088147346030592 and https://www.chromestatus.com/feature/5633521622188032.",
                "timestamp": 1580275891584,
                "type": ""
            }
        ],
        "screenShotFile": "images/00da0061-0051-00b2-00e5-00f300000041.png",
        "timestamp": 1580275888572,
        "duration": 3003
    },
    {
        "description": "4.And: Shore Excursion page is present|Scenario 3: Guest filters shore excursions results using price range",
        "passed": true,
        "pending": false,
        "os": "Mac OS X",
        "instanceId": 47935,
        "browser": {
            "name": "chrome",
            "version": "79.0.3945.130"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [],
        "screenShotFile": "images/00230069-00ea-00d6-005c-00ac001c0072.png",
        "timestamp": 1580275892906,
        "duration": 32
    },
    {
        "description": "5.When: Price range is filtered to \"0-$30\"|Scenario 3: Guest filters shore excursions results using price range",
        "passed": true,
        "pending": false,
        "os": "Mac OS X",
        "instanceId": 47935,
        "browser": {
            "name": "chrome",
            "version": "79.0.3945.130"
        },
        "message": "Passed",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "https://www.ncl.com/shore-excursions/search?sort=searchWeight&perPage=12&priceRange=0+2000 - A cookie associated with a cross-site resource at http://norwegiancruiseline.mpeasylink.com/ was set without the `SameSite` attribute. A future release of Chrome will only deliver cookies with cross-site requests if they are set with `SameSite=None` and `Secure`. You can review cookies in developer tools under Application>Storage>Cookies and see more details at https://www.chromestatus.com/feature/5088147346030592 and https://www.chromestatus.com/feature/5633521622188032.",
                "timestamp": 1580275894855,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://www.ncl.com/shore-excursions/search?sort=searchWeight&perPage=12&priceRange=0+2000 - A cookie associated with a cross-site resource at http://mpeasylink.com/ was set without the `SameSite` attribute. A future release of Chrome will only deliver cookies with cross-site requests if they are set with `SameSite=None` and `Secure`. You can review cookies in developer tools under Application>Storage>Cookies and see more details at https://www.chromestatus.com/feature/5088147346030592 and https://www.chromestatus.com/feature/5633521622188032.",
                "timestamp": 1580275894909,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://www.ncl.com/shore-excursions/search?sort=searchWeight&perPage=12&priceRange=0+2000 - A cookie associated with a cross-site resource at http://bing.com/ was set without the `SameSite` attribute. A future release of Chrome will only deliver cookies with cross-site requests if they are set with `SameSite=None` and `Secure`. You can review cookies in developer tools under Application>Storage>Cookies and see more details at https://www.chromestatus.com/feature/5088147346030592 and https://www.chromestatus.com/feature/5633521622188032.",
                "timestamp": 1580275895525,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://www.ncl.com/shore-excursions/search?sort=searchWeight&perPage=12&priceRange=0+2000 - A cookie associated with a cross-site resource at http://bat.bing.com/ was set without the `SameSite` attribute. A future release of Chrome will only deliver cookies with cross-site requests if they are set with `SameSite=None` and `Secure`. You can review cookies in developer tools under Application>Storage>Cookies and see more details at https://www.chromestatus.com/feature/5088147346030592 and https://www.chromestatus.com/feature/5633521622188032.",
                "timestamp": 1580275895525,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://www.ncl.com/shore-excursions/search?sort=searchWeight&perPage=12&priceRange=0+2000 - A cookie associated with a cross-site resource at http://doubleclick.net/ was set without the `SameSite` attribute. A future release of Chrome will only deliver cookies with cross-site requests if they are set with `SameSite=None` and `Secure`. You can review cookies in developer tools under Application>Storage>Cookies and see more details at https://www.chromestatus.com/feature/5088147346030592 and https://www.chromestatus.com/feature/5633521622188032.",
                "timestamp": 1580275895530,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://www.ncl.com/shore-excursions/search?sort=searchWeight&perPage=12&priceRange=0+2000 - A cookie associated with a cross-site resource at http://www.facebook.com/ was set without the `SameSite` attribute. A future release of Chrome will only deliver cookies with cross-site requests if they are set with `SameSite=None` and `Secure`. You can review cookies in developer tools under Application>Storage>Cookies and see more details at https://www.chromestatus.com/feature/5088147346030592 and https://www.chromestatus.com/feature/5633521622188032.",
                "timestamp": 1580275895830,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://www.ncl.com/shore-excursions/search?sort=searchWeight&perPage=12&priceRange=0+2000 - A cookie associated with a resource at http://adsrvr.org/ was set with `SameSite=None` but without `Secure`. A future release of Chrome will only deliver cookies marked `SameSite=None` if they are also marked `Secure`. You can review cookies in developer tools under Application>Storage>Cookies and see more details at https://www.chromestatus.com/feature/5633521622188032.",
                "timestamp": 1580275895831,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://www.ncl.com/shore-excursions/search?sort=searchWeight&perPage=12&priceRange=0+2000 - A cookie associated with a cross-site resource at http://iperceptions.com/ was set without the `SameSite` attribute. A future release of Chrome will only deliver cookies with cross-site requests if they are set with `SameSite=None` and `Secure`. You can review cookies in developer tools under Application>Storage>Cookies and see more details at https://www.chromestatus.com/feature/5088147346030592 and https://www.chromestatus.com/feature/5633521622188032.",
                "timestamp": 1580275896581,
                "type": ""
            }
        ],
        "screenShotFile": "images/007b00a8-00b9-006d-006b-000a0004002b.png",
        "timestamp": 1580275893922,
        "duration": 2654
    },
    {
        "description": "6.Then: Only shore excursions within range are displayed|Scenario 3: Guest filters shore excursions results using price range",
        "passed": false,
        "pending": false,
        "os": "Mac OS X",
        "instanceId": 47935,
        "browser": {
            "name": "chrome",
            "version": "79.0.3945.130"
        },
        "message": [
            "Expected '.' to be greater than 0.",
            "Expected '.' to be less than 30."
        ],
        "trace": [
            "Error: Failed expectation\n    at browser.sleep.then (/Users/edilmasimov/Desktop/NCL/Tests/Scenario3.spec.js:54:41)\n    at ManagedPromise.invokeCallback_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:1376:14)\n    at TaskQueue.execute_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3084:14)\n    at TaskQueue.executeNext_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3067:27)\n    at asyncRun (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2927:27)\n    at /usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:668:7",
            "Error: Failed expectation\n    at browser.sleep.then (/Users/edilmasimov/Desktop/NCL/Tests/Scenario3.spec.js:55:41)\n    at ManagedPromise.invokeCallback_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:1376:14)\n    at TaskQueue.execute_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3084:14)\n    at TaskQueue.executeNext_ (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:3067:27)\n    at asyncRun (/usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:2927:27)\n    at /usr/local/lib/node_modules/protractor/node_modules/selenium-webdriver/lib/promise.js:668:7"
        ],
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "https://www.ncl.com/shore-excursions/search?sort=searchWeight&perPage=12&priceRange=0+2000 - A cookie associated with a cross-site resource at http://adsrvr.org/ was set without the `SameSite` attribute. A future release of Chrome will only deliver cookies with cross-site requests if they are set with `SameSite=None` and `Secure`. You can review cookies in developer tools under Application>Storage>Cookies and see more details at https://www.chromestatus.com/feature/5088147346030592 and https://www.chromestatus.com/feature/5633521622188032.",
                "timestamp": 1580275896636,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://www.ncl.com/shore-excursions/search?sort=searchWeight&perPage=12&priceRange=0+2000 - A cookie associated with a resource at http://truoptik.com/ was set with `SameSite=None` but without `Secure`. A future release of Chrome will only deliver cookies marked `SameSite=None` if they are also marked `Secure`. You can review cookies in developer tools under Application>Storage>Cookies and see more details at https://www.chromestatus.com/feature/5633521622188032.",
                "timestamp": 1580275897075,
                "type": ""
            }
        ],
        "screenShotFile": "images/003700de-0066-0067-0026-00e300a00094.png",
        "timestamp": 1580275898026,
        "duration": 3196
    }
];

    this.sortSpecs = function () {
        this.results = results.sort(function sortFunction(a, b) {
    if (a.sessionId < b.sessionId) return -1;else if (a.sessionId > b.sessionId) return 1;

    if (a.timestamp < b.timestamp) return -1;else if (a.timestamp > b.timestamp) return 1;

    return 0;
});

    };

    this.setTitle = function () {
        var title = $('.report-title').text();
        titleService.setTitle(title);
    };

    // is run after all test data has been prepared/loaded
    this.afterLoadingJobs = function () {
        this.sortSpecs();
        this.setTitle();
    };

    this.loadResultsViaAjax = function () {

        $http({
            url: './combined.json',
            method: 'GET'
        }).then(function (response) {
                var data = null;
                if (response && response.data) {
                    if (typeof response.data === 'object') {
                        data = response.data;
                    } else if (response.data[0] === '"') { //detect super escaped file (from circular json)
                        data = CircularJSON.parse(response.data); //the file is escaped in a weird way (with circular json)
                    } else {
                        data = JSON.parse(response.data);
                    }
                }
                if (data) {
                    results = data;
                    that.afterLoadingJobs();
                }
            },
            function (error) {
                console.error(error);
            });
    };


    if (clientDefaults.useAjax) {
        this.loadResultsViaAjax();
    } else {
        this.afterLoadingJobs();
    }

}]);

app.filter('bySearchSettings', function () {
    return function (items, searchSettings) {
        var filtered = [];
        if (!items) {
            return filtered; // to avoid crashing in where results might be empty
        }
        var prevItem = null;

        for (var i = 0; i < items.length; i++) {
            var item = items[i];
            item.displaySpecName = false;

            var isHit = false; //is set to true if any of the search criteria matched
            countLogMessages(item); // modifies item contents

            var hasLog = searchSettings.withLog && item.browserLogs && item.browserLogs.length > 0;
            if (searchSettings.description === '' ||
                (item.description && item.description.toLowerCase().indexOf(searchSettings.description.toLowerCase()) > -1)) {

                if (searchSettings.passed && item.passed || hasLog) {
                    isHit = true;
                } else if (searchSettings.failed && !item.passed && !item.pending || hasLog) {
                    isHit = true;
                } else if (searchSettings.pending && item.pending || hasLog) {
                    isHit = true;
                }
            }
            if (isHit) {
                checkIfShouldDisplaySpecName(prevItem, item);

                filtered.push(item);
                prevItem = item;
            }
        }

        return filtered;
    };
});

//formats millseconds to h m s
app.filter('timeFormat', function () {
    return function (tr, fmt) {
        if(tr == null){
            return "NaN";
        }

        switch (fmt) {
            case 'h':
                var h = tr / 1000 / 60 / 60;
                return "".concat(h.toFixed(2)).concat("h");
            case 'm':
                var m = tr / 1000 / 60;
                return "".concat(m.toFixed(2)).concat("min");
            case 's' :
                var s = tr / 1000;
                return "".concat(s.toFixed(2)).concat("s");
            case 'hm':
            case 'h:m':
                var hmMt = tr / 1000 / 60;
                var hmHr = Math.trunc(hmMt / 60);
                var hmMr = hmMt - (hmHr * 60);
                if (fmt === 'h:m') {
                    return "".concat(hmHr).concat(":").concat(hmMr < 10 ? "0" : "").concat(Math.round(hmMr));
                }
                return "".concat(hmHr).concat("h ").concat(hmMr.toFixed(2)).concat("min");
            case 'hms':
            case 'h:m:s':
                var hmsS = tr / 1000;
                var hmsHr = Math.trunc(hmsS / 60 / 60);
                var hmsM = hmsS / 60;
                var hmsMr = Math.trunc(hmsM - hmsHr * 60);
                var hmsSo = hmsS - (hmsHr * 60 * 60) - (hmsMr*60);
                if (fmt === 'h:m:s') {
                    return "".concat(hmsHr).concat(":").concat(hmsMr < 10 ? "0" : "").concat(hmsMr).concat(":").concat(hmsSo < 10 ? "0" : "").concat(Math.round(hmsSo));
                }
                return "".concat(hmsHr).concat("h ").concat(hmsMr).concat("min ").concat(hmsSo.toFixed(2)).concat("s");
            case 'ms':
                var msS = tr / 1000;
                var msMr = Math.trunc(msS / 60);
                var msMs = msS - (msMr * 60);
                return "".concat(msMr).concat("min ").concat(msMs.toFixed(2)).concat("s");
        }

        return tr;
    };
});


function PbrStackModalController($scope, $rootScope) {
    var ctrl = this;
    ctrl.rootScope = $rootScope;
    ctrl.getParent = getParent;
    ctrl.getShortDescription = getShortDescription;
    ctrl.convertTimestamp = convertTimestamp;
    ctrl.isValueAnArray = isValueAnArray;
    ctrl.toggleSmartStackTraceHighlight = function () {
        var inv = !ctrl.rootScope.showSmartStackTraceHighlight;
        ctrl.rootScope.showSmartStackTraceHighlight = inv;
    };
    ctrl.applySmartHighlight = function (line) {
        if ($rootScope.showSmartStackTraceHighlight) {
            if (line.indexOf('node_modules') > -1) {
                return 'greyout';
            }
            if (line.indexOf('  at ') === -1) {
                return '';
            }

            return 'highlight';
        }
        return '';
    };
}


app.component('pbrStackModal', {
    templateUrl: "pbr-stack-modal.html",
    bindings: {
        index: '=',
        data: '='
    },
    controller: PbrStackModalController
});

function PbrScreenshotModalController($scope, $rootScope) {
    var ctrl = this;
    ctrl.rootScope = $rootScope;
    ctrl.getParent = getParent;
    ctrl.getShortDescription = getShortDescription;

    /**
     * Updates which modal is selected.
     */
    this.updateSelectedModal = function (event, index) {
        var key = event.key; //try to use non-deprecated key first https://developer.mozilla.org/de/docs/Web/API/KeyboardEvent/keyCode
        if (key == null) {
            var keyMap = {
                37: 'ArrowLeft',
                39: 'ArrowRight'
            };
            key = keyMap[event.keyCode]; //fallback to keycode
        }
        if (key === "ArrowLeft" && this.hasPrevious) {
            this.showHideModal(index, this.previous);
        } else if (key === "ArrowRight" && this.hasNext) {
            this.showHideModal(index, this.next);
        }
    };

    /**
     * Hides the modal with the #oldIndex and shows the modal with the #newIndex.
     */
    this.showHideModal = function (oldIndex, newIndex) {
        const modalName = '#imageModal';
        $(modalName + oldIndex).modal("hide");
        $(modalName + newIndex).modal("show");
    };

}

app.component('pbrScreenshotModal', {
    templateUrl: "pbr-screenshot-modal.html",
    bindings: {
        index: '=',
        data: '=',
        next: '=',
        previous: '=',
        hasNext: '=',
        hasPrevious: '='
    },
    controller: PbrScreenshotModalController
});

app.factory('TitleService', ['$document', function ($document) {
    return {
        setTitle: function (title) {
            $document[0].title = title;
        }
    };
}]);


app.run(
    function ($rootScope, $templateCache) {
        //make sure this option is on by default
        $rootScope.showSmartStackTraceHighlight = true;
        
  $templateCache.put('pbr-screenshot-modal.html',
    '<div class="modal" id="imageModal{{$ctrl.index}}" tabindex="-1" role="dialog"\n' +
    '     aria-labelledby="imageModalLabel{{$ctrl.index}}" ng-keydown="$ctrl.updateSelectedModal($event,$ctrl.index)">\n' +
    '    <div class="modal-dialog modal-lg m-screenhot-modal" role="document">\n' +
    '        <div class="modal-content">\n' +
    '            <div class="modal-header">\n' +
    '                <button type="button" class="close" data-dismiss="modal" aria-label="Close">\n' +
    '                    <span aria-hidden="true">&times;</span>\n' +
    '                </button>\n' +
    '                <h6 class="modal-title" id="imageModalLabelP{{$ctrl.index}}">\n' +
    '                    {{$ctrl.getParent($ctrl.data.description)}}</h6>\n' +
    '                <h5 class="modal-title" id="imageModalLabel{{$ctrl.index}}">\n' +
    '                    {{$ctrl.getShortDescription($ctrl.data.description)}}</h5>\n' +
    '            </div>\n' +
    '            <div class="modal-body">\n' +
    '                <img class="screenshotImage" ng-src="{{$ctrl.data.screenShotFile}}">\n' +
    '            </div>\n' +
    '            <div class="modal-footer">\n' +
    '                <div class="pull-left">\n' +
    '                    <button ng-disabled="!$ctrl.hasPrevious" class="btn btn-default btn-previous" data-dismiss="modal"\n' +
    '                            data-toggle="modal" data-target="#imageModal{{$ctrl.previous}}">\n' +
    '                        Prev\n' +
    '                    </button>\n' +
    '                    <button ng-disabled="!$ctrl.hasNext" class="btn btn-default btn-next"\n' +
    '                            data-dismiss="modal" data-toggle="modal"\n' +
    '                            data-target="#imageModal{{$ctrl.next}}">\n' +
    '                        Next\n' +
    '                    </button>\n' +
    '                </div>\n' +
    '                <a class="btn btn-primary" href="{{$ctrl.data.screenShotFile}}" target="_blank">\n' +
    '                    Open Image in New Tab\n' +
    '                    <span class="glyphicon glyphicon-new-window" aria-hidden="true"></span>\n' +
    '                </a>\n' +
    '                <button type="button" class="btn btn-default" data-dismiss="modal">Close</button>\n' +
    '            </div>\n' +
    '        </div>\n' +
    '    </div>\n' +
    '</div>\n' +
     ''
  );

  $templateCache.put('pbr-stack-modal.html',
    '<div class="modal" id="modal{{$ctrl.index}}" tabindex="-1" role="dialog"\n' +
    '     aria-labelledby="stackModalLabel{{$ctrl.index}}">\n' +
    '    <div class="modal-dialog modal-lg m-stack-modal" role="document">\n' +
    '        <div class="modal-content">\n' +
    '            <div class="modal-header">\n' +
    '                <button type="button" class="close" data-dismiss="modal" aria-label="Close">\n' +
    '                    <span aria-hidden="true">&times;</span>\n' +
    '                </button>\n' +
    '                <h6 class="modal-title" id="stackModalLabelP{{$ctrl.index}}">\n' +
    '                    {{$ctrl.getParent($ctrl.data.description)}}</h6>\n' +
    '                <h5 class="modal-title" id="stackModalLabel{{$ctrl.index}}">\n' +
    '                    {{$ctrl.getShortDescription($ctrl.data.description)}}</h5>\n' +
    '            </div>\n' +
    '            <div class="modal-body">\n' +
    '                <div ng-if="$ctrl.data.trace.length > 0">\n' +
    '                    <div ng-if="$ctrl.isValueAnArray($ctrl.data.trace)">\n' +
    '                        <pre class="logContainer" ng-repeat="trace in $ctrl.data.trace track by $index"><div ng-class="$ctrl.applySmartHighlight(line)" ng-repeat="line in trace.split(\'\\n\') track by $index">{{line}}</div></pre>\n' +
    '                    </div>\n' +
    '                    <div ng-if="!$ctrl.isValueAnArray($ctrl.data.trace)">\n' +
    '                        <pre class="logContainer"><div ng-class="$ctrl.applySmartHighlight(line)" ng-repeat="line in $ctrl.data.trace.split(\'\\n\') track by $index">{{line}}</div></pre>\n' +
    '                    </div>\n' +
    '                </div>\n' +
    '                <div ng-if="$ctrl.data.browserLogs.length > 0">\n' +
    '                    <h5 class="modal-title">\n' +
    '                        Browser logs:\n' +
    '                    </h5>\n' +
    '                    <pre class="logContainer"><div class="browserLogItem"\n' +
    '                                                   ng-repeat="logError in $ctrl.data.browserLogs track by $index"><div><span class="label browserLogLabel label-default"\n' +
    '                                                                                                                             ng-class="{\'label-danger\': logError.level===\'SEVERE\', \'label-warning\': logError.level===\'WARNING\'}">{{logError.level}}</span><span class="label label-default">{{$ctrl.convertTimestamp(logError.timestamp)}}</span><div ng-repeat="messageLine in logError.message.split(\'\\\\n\') track by $index">{{ messageLine }}</div></div></div></pre>\n' +
    '                </div>\n' +
    '            </div>\n' +
    '            <div class="modal-footer">\n' +
    '                <button class="btn btn-default"\n' +
    '                        ng-class="{active: $ctrl.rootScope.showSmartStackTraceHighlight}"\n' +
    '                        ng-click="$ctrl.toggleSmartStackTraceHighlight()">\n' +
    '                    <span class="glyphicon glyphicon-education black"></span> Smart Stack Trace\n' +
    '                </button>\n' +
    '                <button type="button" class="btn btn-default" data-dismiss="modal">Close</button>\n' +
    '            </div>\n' +
    '        </div>\n' +
    '    </div>\n' +
    '</div>\n' +
     ''
  );

    });

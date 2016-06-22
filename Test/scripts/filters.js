/* global $ */
angular.module('Test').filter('capitalize', function() {
    return function(input) {
      return (!!input) ? input.charAt(0).toUpperCase() + input.substr(1).toLowerCase() : '';
    }
})
.filter('secondsToDateTime', function() {
    return function(seconds) {
        return new Date(1970, 0, 1).setSeconds(seconds);
    };
})
.filter('insertBlank', function() {
    return function(input) {
      if(input!=undefined && input.indexOf("<<Answer>>")!=-1)
      return input.replace(/<<Answer>>/g, "____________");      
      return input;
    }
})
.filter('unsafe', [ '$sce', function($sce) {
      return function(input) {
        if(input!=undefined && input.indexOf("**")!=-1)
          return $sce.trustAsHtml(input.replace(/\*\*/g, "<br>"));
        return $sce.trustAsHtml(input);
      }
}])
.filter('epochToDate', function() {
    return function(epoch_time) {
        return new Date(0).setSeconds(epoch_time);
    };
});
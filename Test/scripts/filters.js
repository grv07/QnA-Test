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
      if(input!=undefined && input.indexOf("<>")!=-1)
      return input.replace(/<>/g, "____________");      
      return input;
    }
});
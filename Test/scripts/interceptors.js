
appmodule.factory('APIInterceptor', [ '$cookies', '$q', function($cookies, $q){
	return {	
		    request: function(config) {
		    	if($cookies.get('key')){
		    	config.headers.authorization = 'Authorization '+$cookies.get('key');
		    	}else{
		    	}
		     	return config;
		    },
		    requestError: function(config) {
		       	return config;
		    },

		    response: function(res) {
		      	return res;
		      	// return $q.reject(res);
		    },

		    responseError: function(res) {
		      	return $q.reject(res);
		    }
			  }

}]);

appmodule.config(function($httpProvider) {
  	$httpProvider.interceptors.push('APIInterceptor');
});

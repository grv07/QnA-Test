/* global $ */
appmodule.config(function($stateProvider, $urlRouterProvider, $httpProvider) {
  		// $httpProvider.interceptors.push('APIInterceptor');
        $stateProvider	        
            // route for the home page
            .state('app', {
                url:'/open/test/:quizKey',
                views: {
                    'header': {
                        templateUrl : 'views/header.html'
                    },
                    'content': {
                        controller : 'UserDataController',
                    },
                    'footer': { 
                        templateUrl : 'views/footer.html'
                    }
                },
            })
            .state('app.load-questions', {
                url:'/start',
                views :{
                    'content@': {
                        controller  : 'LoadQuestionsController',
                        templateUrl : 'views/load_questions.html'
                    }
                },
                params: {obj: null},
            })
            .state('app.start-test', {
                url:'/load',
                views :{
                    'header@': {
                        controller  : 'TestPageHeaderController',
                        templateUrl : 'views/test_page_header.html'
                    },
                    'content@': {
                        controller  : 'TestPageController',
                        templateUrl : 'views/test_page.html'
                    }
                },
                params: {obj: null},
            })
            .state('app.finish-test', {
                url:'/finish',
                views :{
                    'header@': {
                        templateUrl : 'views/header.html'
                    },
                    'content@': {
                        controller  : 'TestFinishController',
                        templateUrl : 'views/test_finish.html'
                    }
                },
                params: {obj: null},
            })
            .state('thirdpartytest', {          // State name should not be changed
                url:'/start/test/:quizKey/:testID/:token',
                views: {
                    'header@': {
                        templateUrl : 'views/header.html'
                    },
                    'content@': {
                        controller : 'UserDataThirdPartyController',
                        templateUrl : 'views/third_party_test.html'
                    },
                },
            })


		// $locationProvider.html5Mode(true);
		$urlRouterProvider.otherwise('/');
	});

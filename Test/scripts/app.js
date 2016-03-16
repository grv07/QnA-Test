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
                        templateUrl : 'index.html'
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
            });


		// $locationProvider.html5Mode(true);
		// $urlRouterProvider.otherwise('/');
	});

/* global $ */
appmodule.config(function($stateProvider, $urlRouterProvider, $httpProvider) {
  		// $httpProvider.interceptors.push('APIInterceptor');
        $stateProvider	        
            // route for the home page
            .state('index', {
                url:'/',
                views: {
                    'header': {
                        templateUrl : 'views/header.html'
                    },
                    'content': {
                        controller: 'IndexController',
                    },
                    'footer': { 
                        templateUrl : 'views/footer.html'
                    }
                },
                params: {obj: null},
            })
            .state('app', {
                url:'/allow/test/:quizKey',
                views: {
                    'header@': {
                        templateUrl : 'views/header.html'
                    },
                    'content@': {
                        controller : 'IndexController',
                        templateUrl : 'views/home.html'
                    },
                },
                params: {obj: null},
            })
            .state('app.open-test', {
                url:'/open',
                views: {
                    'content@': {
                        controller : 'UserDataController',
                        templateUrl : 'views/open_test.html'

                    },
                },
                params: {obj: null},
            })
            .state('app.load-questions', {
                url:'/load',
                views :{
                    'content@': {
                        controller  : 'LoadQuestionsController',
                        templateUrl : 'views/load_questions.html'
                    }
                },
                params: {obj: null},
            })
            .state('app.start-test', {
                url:'/start',
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
            .state('thirdpartytest-allow', {
                url:'/allow/test/:quizKey/:testID/:token',
                views: {
                    'header@': {
                        templateUrl : 'views/header.html'
                    },
                    'content@': {
                        controller : 'IndexThirdPartyController',
                        templateUrl : 'views/open_test_live.html'
                    },
                },
            })
            .state('thirdpartytest-open', {
                url:'/open/test/:quizKey/:testID/:token',
                views: {
                    'content@': {
                        controller : 'UserDataThirdPartyController',
                        templateUrl : 'views/third_party_test.html'
                    },
                },
            })
            .state('thirdpartytest-load', {
                url:'/load/test/:quizKey/:testID/:token',
                views :{
                    'content@': {
                        controller  : 'LoadQuestionsThirdPartyController',
                        templateUrl : 'views/load_questions.html'
                    }
                },
                params: {obj: null},
            })
            .state('thirdpartytest-start', {
                url:'/start/test/:quizKey/:testID/:token',
                views :{
                    'header@': {
                        controller  : 'TestPageHeaderThirdPartyController',
                        templateUrl : 'views/test_page_header.html'
                    },
                    'content@': {
                        controller  : 'TestPageThirdPartyController',
                        templateUrl : 'views/test_page.html'
                    }
                },
                params: {obj: null},
            })
            .state('result', {
                url:'/view/report/:testUserID/:quizKey/:attemptNo',
                views :{
                    'header@': {
                        templateUrl : 'views/report_header.html'
                    },
                    'content@': {
                        controller  : 'ViewReportContoller',
                        templateUrl : 'views/view_report.html'
                    }
                },
                params: {obj: null},
            });

		$urlRouterProvider.otherwise('/');
	});

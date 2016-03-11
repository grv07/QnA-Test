/* global $ */
appmodule
    .controller('CookiesController', ['$scope', '$rootScope', '$cookies', '$state', function($scope, $rootScope, $cookies, $state) {
        $rootScope.user = $cookies.get('user');
        $rootScope.username = $cookies.get('username');
        $rootScope.token = $cookies.get('token');
        if($rootScope.token === undefined){    
            $state.go('app.login-user');
        }
    }])
    .controller('UserDataController',['$scope','$state', '$http', '$cookies', 'testUserDataFactory','$controller', '$window', function($scope, $state, $http, $cookies, testUserDataFactory, $controller, $window) {
            $cookies.put('KEY', 'abcd1234');
            $cookies.put('SITENAME', 'equest');
            $scope.quizName = 'maths';
            $scope.userData = { name:'', email:'', quiz_id: "13", quiz_name: 'Maths', test_key: 'f86d61d474de2b13499c' };
            $scope.postUserDetails = function(){
                testUserDataFactory.saveTestUser($cookies.get('KEY')).save($scope.data).$promise.then(
                function(response){
                    $scope.isFormInvalid = false;
                    // $cookies.put('token', response.token);
                    $window.data = $scope.userData;
                    $window.open($state.href('app.load-questions', {parameter: "parameter"}), "Test Window", "width=1280,height=890,resizable=0");
                    // $state.go('app.load-questions', {obj:{'quizName':$scope.quizName }});                     
                },
                function(response) {
                    $scope.isFormInvalid = true;
                    $scope.alertType = "danger";
                    $scope.alertMsg = "Unable to find the user - please try again.";
                });
            }
    }])
    .controller('LoadQuestionsController', ['$scope', '$window', '$state', 'LoadQuestionsFactory', function($scope, $window, $state, LoadQuestionsFactory) {
        $scope.questions = 'ppppp';
        var allQuestions = {};
        var allSections = [];
        data = { test_key: 'f86d61d474de2b13499c', 'quiz': $window.opener.data.quiz_id , 'quizName': $window.opener.data.quiz_name, 'quizStacks' : [], 'details' : {} };
        $scope.closeTestWindow = function(){
            $window.close();
        }
        var currentSectionCount = 0;
        LoadQuestionsFactory.getQuizStack($window.opener.data.quiz_id, 'all').query(
            function(response) {
                data['quizStacks'] = response;
                console.log('pppp');
            },
            function(response) {
                $scope.unableToGetAllSavedStacks= true;
        });
        console.log(data['quizStacks'], typeof(data['quizStacks']));
        // for(i=0;i<data['quizStacks'].length;i++){
        //     if(allSections.indexOf(response[i].section_name)===-1){
        //         data['details'][response[i].section_name] = { 'duration': 0, 'questions' : 0};
        //         allSections[currentSectionCount]=response[i].section_name;
        //         currentSectionCount += 1;
        //     }
        //     data['details'][response[i].section_name]['duration'] += parseInt(response[i].duration);
        //     data['details'][response[i].section_name]['questions'] += parseInt(response[i].no_questions);
        // }
}])  
    .controller('TestPageHeaderController', ['$scope', '$controller', '$window', '$stateParams', function($scope, $controller, $window, $stateParams) {
            // console.log($window.opener.data.quiz)
            if(isNotEmpty($stateParams.obj)){
                $scope.quizName = $stateParams.obj.quizName;
                $scope.closePreviewWindow = function(){
                    $window.close();
                }
                $scope.dataPresent = true;      
            }
            else{
                $scope.dataPresent = false;
            }   
        }])
    .controller('TestPageController', ['$scope', '$controller', '$window', '$interval', '$stateParams', 'TestPageFactory', function($scope, $controller, $window, $interval, $stateParams, TestPageFactory) {
        $scope.allQuestions = {};
        var firstItemVisited= false;
        $scope.serverURL = 'http://localhost:8000';
        $scope.getQuestionsBasedOnSection = function(sectionName, quizid){
            console.log($stateParams.obj,'888');
            console.log($scope.questions,'9999');

            // TestPageFactory.getQuestionsBasedOnSection(quizid, sectionName).query(
            //     function(response){
            //         $scope.total_questions = response.total_questions;
            //         $scope.sliced_questions = $scope.total_questions.slice(0,15);
            //         $scope.sliceFactor = 0;
            //         $scope.slicingLimit = Math.floor($scope.total_questions.length/15);
            //         $scope.answersModel = {};
            //         firstItemVisited = false;
            //         $scope.progressValuesModel = {};
            //         var questionsAdded = TestPageFactory.addQuestionsForSection(sectionName, response.questions);
            //         for(var i=0;i<questionsAdded.length;i++){
            //             $scope.answersModel[questionsAdded[i][i+1].id] = { value:null };
            //             $scope.progressValuesModel[questionsAdded[i][i+1].id] = { status:'NV' };
            //         }
            //         TestPageFactory.saveSectionQuestion(sectionName, $scope.answersModel);
            //         TestPageFactory.saveProgressValues(sectionName, $scope.progressValuesModel);
            //         $scope.changeQuestion(1);
            //     },
            //     function(response){
            //         alert('Problem in getting questions from server-side.');
            // });
        }
        $scope.openWarningModal = function(action){
            $scope.action = action;
            switch(action){
                case "sectionChangeRequestInitiated":
                    toggleWarningModal('show', 'Do you really want to move to next section.<br><br><b>You cannot revisit this section again.</b>', 'Yes I am sure.');
                    break;
                case "sectionChangeRequestCancelled":
                    toggleWarningModal('hide', '', '');
                    $scope.selectedSection = $scope.currentSection;
                    break;
                case "submitTestRequestInitiated":
                    toggleWarningModal('show', '<b>Are you sure you want to submit the answers?</b>', 'Yes I am sure.');
                    break;
                case "submitTestRequestCancelled":
                    toggleWarningModal('hide', '', '');
                    break;
            }
        }
        $scope.changeSection = function(currentSection){
            $scope.submitTestDetails(true, currentSection);
            $scope.nextSection = $scope.selectedSection;
            if($scope.sectionNames.indexOf($scope.selectedSection)<$scope.sectionNames.length){
                if($scope.currentSection === $scope.nextSection){
                    $scope.selectedSection = $scope.sectionNames[$scope.sectionNames.indexOf($scope.selectedSection)+1];
                }else{
                    $scope.selectedSection = $scope.sectionNames[$scope.sectionNames.indexOf($scope.nextSection)];
                }
                $scope.sectionNames.splice($scope.sectionNames.indexOf($scope.currentSection), 1);
                $scope.addQuestions($scope.selectedSection);
                if($scope.sectionNames.indexOf($scope.selectedSection)===$scope.sectionNames.length-1){
                    $scope.hideNextSectionButton = true;
                }
                $scope.currentSection = $scope.selectedSection;                
            }
            else{
                $scope.hideNextSectionButton = true;
            }
        }
        $scope.addQuestions = function(sectionName){
            $scope.sliceFactor = 0;
            $scope.getQuestionsBasedOnSection(sectionName, $scope.quiz);
        }
        $scope.getQuestionsForThisSection = function(sectionName){
            console.log(TestPageFactory.getQuestionsForASection(sectionName));
        }
        $scope.show = function(){
            console.log(TestPageFactory.saveQuestionsAnsweredSectionWise());
        }
        $scope.changeQuestion = function(count){
            if(count>=1 && count<=$scope.total_questions.length)
            {
                // var question = TestPageFactory.getAQuestion($scope.selectedSection, count);
                $scope.currentCount = count;
                $scope.currentQuestion = TestPageFactory.getAQuestion($scope.selectedSection, count);
                if(isMCQ($scope.currentQuestion.que_type)){
                    $scope.currentOptions = $scope.currentQuestion.options;
                }else{
                    $scope.currentOptions = [];
                }
            }
            if($scope.progressValuesModel[$scope.currentQuestion.id].status==='NV'){
                $scope.progressValuesModel[$scope.currentQuestion.id].status = 'NA';
                $scope.progressValues = changeProgressValues($scope.progressValuesModel);
                TestPageFactory.saveProgressValues($scope.selectedSection, $scope.progressValuesModel);
            }
        }
        $scope.saveAnswer = function(count, answerId){
            if(isMCQ($scope.currentQuestion.que_type))
            {
                if($scope.answersModel[$scope.currentQuestion.id].value===answerId){
                }else{
                    $scope.answersModel[$scope.currentQuestion.id].value = answerId;
                    TestPageFactory.saveOrChangeAnswer($scope.selectedSection, count, answerId, true);
                }
            }
            else{
            }
        }
        // Watch for a change in answersModel
        $scope.$watch(function() {
           return $scope.answersModel;
         },                       
          function(newVal, oldVal) {
            try{ 
                if($scope.currentCount > 1 || ($scope.currentCount > 1 && $scope.currentQuestion.que_type === 'mcq')){
                    if($scope.progressValuesModel[$scope.currentQuestion.id].status === 'NV'){
                        $scope.progressValuesModel[$scope.currentQuestion.id].status = 'NA';
                    }
                    else if($scope.progressValuesModel[$scope.currentQuestion.id].status === 'NA'){
                        $scope.progressValuesModel[$scope.currentQuestion.id].status = 'A';
                    }
                }else if($scope.currentCount === 1){
                    if($scope.currentQuestion.que_type === 'objective'){
                        if(!firstItemVisited){
                            firstItemVisited = true;
                        }else{
                            if($scope.progressValuesModel[$scope.currentQuestion.id].status === 'NA'){
                            $scope.progressValuesModel[$scope.currentQuestion.id].status = 'A';
                            }
                        }
                    }
                    if($scope.currentQuestion.que_type === 'mcq'){
                        if(!firstItemVisited){
                            firstItemVisited = true;
                        }else{
                            if($scope.progressValuesModel[$scope.currentQuestion.id].status === 'NA'){
                            $scope.progressValuesModel[$scope.currentQuestion.id].status = 'A';
                            }
                        }
                    }   
                }
                $scope.progressValues = changeProgressValues($scope.progressValuesModel);
                TestPageFactory.saveProgressValues($scope.selectedSection, $scope.progressValuesModel);
                $scope.submitTestDetails(false, $scope.selectedSection);
            }catch(err){}
        }, true);
        function sliceOutQuestions(){
            $scope.sliced_questions = $scope.total_questions.slice($scope.sliceFactor*15, ($scope.sliceFactor+1)*15);
        }
        $scope.decreaseSlicing = function(){
            $scope.sliceFactor -= 1;
            sliceOutQuestions();
        }
        $scope.increaseSlicing = function(){
            $scope.sliceFactor += 1;
            sliceOutQuestions();
        }

        function submitEachQuestion(){
            
        }

        $scope.submitTestDetails = function(isSaveToDB, currentSection){
            var data = TestPageFactory.saveQuestionsAnsweredSectionWise($scope.selectedSection, TestPageFactory.getAnswersForSection(currentSection), TestPageFactory.getProgressValuesSectionWise(currentSection));
            // if(isSaveToDB){
            //     data['sections'] = Object.keys($window.opener.data['details']).sort();
            // }
            TestPageFactory.postTestDetails(isSaveToDB, $stateParams.obj.test_key, $scope.quiz, currentSection).save(data).$promise.then(
                function(response){
                    console.log('success');                    
                },
                function(response) {
                    console.log('failed');
                });
        }
        try{
            if(isNotEmpty($stateParams.obj)){
                console.log($stateParams.obj,'====');
                $scope.quiz = $stateParams.obj.quiz;
                TestPageFactory.addQuizData($scope.quiz);
                console.log(Object.keys($stateParams.obj.details).sort());
                $scope.sectionNames = Object.keys($stateParams.obj.details).sort();
                console.log($scope.sectionNames);
                if($scope.sectionNames.length<=1){
                    $scope.hideNextSectionButton = true;
                }
                $scope.selectedSection = $scope.sectionNames[0];
                $scope.currentSection = $scope.selectedSection;
                $scope.addQuestions($scope.selectedSection);
                // for(var i=0;i<sectionNames.length;i++){
                //     angular.element(document.querySelector('#sectionnames')).append('<option value='+sectionNames[i]+'>'+sectionNames[i]+'</option>');
                // }
                $scope.totalDuration = findTotalDuration($stateParams.obj.quizStacks);
                $interval(function(){
                    $scope.totalDuration -= 1;
                    if($scope.totalDuration===0){
                        alert('Time Over');
                    }
                },1000, $scope.totalDuration);
                $scope.dataPresent = true;
            }else{
                $scope.dataPresent = false;
            }
        }catch(e){
            $scope.dataPresent = false;
        }
        $scope.$on('$locationChangeStart', function( event ) {
            console.log('kk');
            var answer = confirm("Do you want to start the test?");
            if(answer){
                event.preventDefault();
            }else{
                $window.close();
            }
        });
    }]);   



        

    


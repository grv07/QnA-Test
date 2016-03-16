/* global $ */
appmodule
    .controller('CookiesController', ['$scope', '$rootScope', '$cookies', '$state', function($scope, $rootScope, $cookies, $state) {

    }])
    .controller('UserDataController',['$scope','$state', '$http', '$cookies', '$window', '$stateParams', 'TestUserDataFactory', function($scope, $state, $http, $cookies, $window, $stateParams, TestUserDataFactory) {
            TestUserDataFactory.getQuizAccordingToKey($stateParams.quizKey).get().$promise.then(
                function(response){
                    $scope.userData = { username:'', email:'', quiz_id: response.id, quiz_name: response.title, test_key: response.quiz_key, 'quizStacks': undefined, 'testToken': undefined };
                    },
                function(response){
                        alert("Error in retrieving quiz details!");                     
                });
            // Below object is required from source.
            $scope.postUserDetails = function(){
                TestUserDataFactory.saveTestUser().save($scope.userData).$promise.then(
                function(response){
                    $scope.isFormInvalid = false;
                    $cookies.put('testToken', response.token);
                    $scope.userData['testToken'] = response.token;
                    $scope.userData['testUser'] = response.testUser;
                    TestUserDataFactory.getQuizStack($scope.userData.quiz_id, 'all').query(
                        function(response) {
                            $scope.userData['quizStacks'] = response;
                        },
                        function(response) {
                            $scope.unableToGetAllSavedStacks = true;
                    });
                    $window.data = $scope.userData;
                    $window.open($state.href('app.load-questions', {quizKey: $stateParams.quizKey}), "Test Window", "width=1280,height=890,resizable=0");
                },
                function(response) {
                    $scope.isFormInvalid = true;
                    $scope.alertType = "danger";
                    $scope.alertMsg = "Unable to find the user - please try again.";
                });
            }
    }])
    .controller('LoadQuestionsController', ['$scope', '$window', '$state', '$cookies', 'LoadQuestionsFactory', 'TestPageFactory', function($scope, $window, $state, $cookies, LoadQuestionsFactory, TestPageFactory) {
        var allSections = [];
        var allQuestions = {}; 
        $scope.progressValue = 0.00;
        $scope.total_questions = 0;
        $scope.sectionsDetails = {};
        $cookies.put('testToken', $window.opener.data.testToken);
        var data = { test_key: $window.opener.data.test_key, test_user: $window.opener.data.testUser, 'quiz': $window.opener.data.quiz_id , 'quizName': $window.opener.data.quiz_name, 'quizStacks' : $window.opener.data.quizStacks, 'testToken': $window.opener.data.testToken , 'details' : {} };
        $scope.closeTestWindow = function(){
            $window.close();
        }
        for(var i=0;i<data['quizStacks'].length;i++){
            var stack = data['quizStacks'][i];
            if(allSections.indexOf(data['quizStacks'][i].section_name)===-1){
                data['details'][stack.section_name] = { 'duration': 0, 'questions' : 0};
                allSections.push(stack.section_name);
            }
            $scope.total_questions += parseInt(stack.no_questions);
            data['details'][stack.section_name]['duration'] += parseInt(stack.duration);
            data['details'][stack.section_name]['questions'] += parseInt(stack.no_questions);
        }
        allSections.sort();
        for(var i=0;i<allSections.length;i++){
            $scope.sectionsDetails[allSections[i]] = { 'duration': data['details'][allSections[i]]['duration'], 'questions': data['details'][allSections[i]]['questions'] };
        }
        function loadQuestions(sectionName){
            LoadQuestionsFactory.loadAllQuestions($window.opener.data.quiz_id, sectionName).query(
                function(response){
                    TestPageFactory.addQuestionsForSection(sectionName, response.questions);
                    $scope.progressValue +=  (response.questions.length/$scope.total_questions)*100;
                    if($scope.progressValue>=100){
                        $scope.progressValue = 100;
                        $scope.startTest = function(){
                            $state.go('app.start-test', { obj: data});
                        }
                    }
                },
                function(response){
                    alert('Problem in getting questions from server-side.');
                    $window.close();
                });
        }
        for(var i=0;i<allSections.length;i++){
            loadQuestions(allSections[i]);
        }           
    }])
    .controller('TestPageHeaderController', ['$scope', '$controller', '$window', '$stateParams', function($scope, $controller, $window, $stateParams) {
            // console.log($window.opener.data.quiz)
            if(isNotEmpty($stateParams.obj)){
                $scope.quizName = $stateParams.obj.quizName;
                $scope.dataPresent = true;      
            }
            else{
                $scope.dataPresent = false;
            }   
        }])
    .controller('TestPageController', ['$scope', '$controller', '$window', '$interval', '$stateParams', '$state', 'TestPageFactory', function($scope, $controller, $window, $interval, $stateParams, $state, TestPageFactory) {
        $scope.allQuestions = {};
        var firstItemVisited= false;
        $scope.serverURL = 'http://localhost:8000';
        function getQuestionsBasedOnSection(sectionName){
            $scope.total_questions = TestPageFactory.getQuestionsForSection(sectionName);
            $scope.sliced_questions = range(0, $scope.total_questions.slice(0,15).length);
            $scope.sliceFactor = 0;
            $scope.slicingLimit = Math.floor($scope.total_questions.length/15);
            $scope.answersModel = {};
            firstItemVisited = false;
            $scope.progressValuesModel = {};
            for(var i=0;i<$scope.total_questions.length;i++){
                $scope.answersModel[$scope.total_questions[i][i+1].id] = { value:null };
                $scope.progressValuesModel[$scope.total_questions[i][i+1].id] = { status:'NV' };
            }
            TestPageFactory.saveSectionQuestion(sectionName, $scope.answersModel);
            TestPageFactory.saveProgressValues(sectionName, $scope.progressValuesModel);
            $scope.changeQuestion(1);
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
            // $scope.submitTestDetails(true, currentSection);
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
            getQuestionsBasedOnSection(sectionName);
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
                $scope.currentQuestion = TestPageFactory.getQuestion($scope.selectedSection, count);
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
            if(newVal!=oldVal){
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
            }
        }, true);


        // Watch for test to complete
        // $scope.$watch(function() {
        //    return $scope.testCompleted;
        //  },                       
        //   function(newVal, oldVal) {
        //     if(newVal!=oldVal){
        //         $state.go('app.finish-test', { obj: {"quizName": $stateParams.obj.quizName}});
        //     }
        // }, true);
        function sliceOutQuestions(){
            if($scope.sliceFactor===$scope.slicingLimit){
                $scope.sliced_questions = range($scope.sliceFactor*15, $scope.total_questions.length);
            }else{
                $scope.sliced_questions = range($scope.sliceFactor*15, ($scope.sliceFactor+1)*15);
            }
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
            var data = { 'answer' : {}, 'test_user': $stateParams.obj.test_user, 'test_key': $stateParams.obj.test_key, 'quiz_id': $stateParams.obj.quiz, 'section_name': currentSection };
            data['answer'][$scope.currentQuestion.id] = {
                        value: TestPageFactory.getAnswerForQuestion(currentSection, $scope.currentQuestion.id).value, 
                        status: TestPageFactory.getAnswerProgressValue(currentSection, $scope.currentQuestion.id).status 
                        };
            data['duration'] = $scope.totalDuration;
            // if(isSaveToDB){
            //     data['sections'] = Object.keys($window.opener.data['details']).sort();
            // }
            // TestPageFactory.postTestDetails(isSaveToDB, $stateParams.obj.test_key, $scope.quiz, currentSection).save(data).$promise.then(
            //     function(response){
            //         console.log('success');                    
            //     },
            //     function(response) {
            //         console.log('failed');
            //     });
            if(isSaveToDB){
                var testCompleted = false;
                data['progressValues'] = TestPageFactory.getProgressValues();
                TestPageFactory.saveResultToDB().save(data).$promise.then(
                    function(response){
                        testCompleted = true;
                    },
                    function(response){
                        testCompleted = false;
                    }
                );
                // if(testCompleted){
                // console.log('lll');
                // }else{
                //     $state.go('app.finish-test', { obj: {"quizName": $stateParams.obj.quizName}});
                // }
            }else{
                TestPageFactory.saveResultToCache(data).then(function(data){
                    console.log('success');
                });
            }
        }
        try{
            if(isNotEmpty($stateParams.obj)){
                $scope.quiz = $stateParams.obj.quiz;
                // TestPageFactory.addQuizData($scope.quiz);
                $scope.sectionNames = Object.keys($stateParams.obj.details).sort();
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
        // $scope.$on('$locationChangeStart', function( event ) {
        //     var answer = confirm("Do you want to start the test?");
        //     if(answer){
        //         event.preventDefault();
        //     }else{
        //         $window.close();
        //     }
        // });
    }])
    .controller('TestFinishController',['$scope', '$stateParams', '$window', function($scope, $stateParams, $window) {
        $scope.alertType = "success";
        $scope.alertMsg = "You have completed your test for quiz "+$stateParams.obj.quizName+" successfully.";
        $scope.closeTestWindow = function(){
            $window.close();
        }
    }]);



        

    


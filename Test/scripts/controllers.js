/* global $ */
appmodule
    .controller('CookiesController', ['$scope', '$rootScope', '$cookies', '$state', function($scope, $rootScope, $cookies, $state) {

    }])
    .controller('UserDataController',['$scope', '$state', '$http', '$cookies', '$window', '$stateParams', 'TestUserDataFactory', function($scope, $state, $http, $cookies, $window, $stateParams, TestUserDataFactory) {
            // console.log($stateParams.quizKey);
            $scope.message = '';
            $scope.image = '';
            $scope.$on('from-iframe', function(e, message) {
                if(message==='TestLoading'){
                    $scope.message = 'Your questions are loading right now.';
                    $scope.image = '../images/ellipsis.svg';
                }
                else if(message==='TestLoaded'){
                    $scope.message = 'Your questions have been loaded. Now you can start the test.';
                    $scope.image = '../images/start.png';
                }
                else if(message==='TestStarted'){
                    $scope.message = 'Your test has started.';
                    $scope.image = '../images/hourglass.svg';
                }
                $('#stateModalBodyMessage').html($scope.message);
                $('#stateModalBodyImage').attr('src', $scope.image);
                angular.element(document.querySelector('#stateModal')).modal('show');
            });

            TestUserDataFactory.getQuizAccordingToKey($stateParams.quizKey).get().$promise.then(
                function(response){
                    $scope.userData = { username:'', email:'', quiz_id: response.id, quiz_name: response.title, test_key: response.quiz_key, 'quizStacks': undefined, 'testToken': undefined };
                    },
                function(response){
                        alert("Error in retrieving quiz details!");                     
                });

            $scope.redirectToResultPage = function(resultPageURL){
                $window.location = resultPageURL;
            }

            function loadQuizStacks(){
                TestUserDataFactory.getQuizStack($scope.userData.quiz_id, 'all').query(
                    function(response) {
                        $scope.userData['quizStacks'] = response;

                    },
                    function(response) {
                        $scope.unableToGetAllSavedStacks = true;
                });
            }

            // Below object is required from source.
            $scope.postUserDetails = function(){
                TestUserDataFactory.saveTestUser().save($scope.userData).$promise.then(
                function(response){
                    $scope.isFormInvalid = false;
                    $cookies.put('testToken', response.token);
                    $scope.userData['testToken'] = response.token;
                    $scope.userData['isTestNotCompleted'] = response.isTestNotCompleted;
                    $scope.userData['testUser'] = response.testUser;
                    $scope.userData['sectionsRemaining'] = response.sectionsRemaining;
                    $scope.userData['sectionNoWhereLeft'] = response.sectionNoWhereLeft;
                    $scope.userData['existingAnswers'] = response.existingAnswers;
                    $scope.userData['timeRemaining'] = response.timeRemaining;
                    if(!response.isTestNotCompleted){
                        loadQuizStacks();
                    }else{
                        var result = confirm('You have a uncompleted test! Click to give it.');
                        if(result){
                            if(response.sectionsRemaining.length===0 && response.sectionNoWhereLeft===null) {
                                loadQuizStacks();
                            }else{                          
                                TestUserDataFactory.getQuizStackForUncompleteTest().save($scope.userData).$promise.then(
                                    function(response) {
                                        $scope.userData['quizStacks'] = response;
                                    },
                                    function(response) {
                                        $scope.unableToGetAllSavedStacks = true;
                                        return false;
                                });
                            }
                        }else{
                            console.log('Re-attempt test cancelled.');
                            return false;
                        }
                    }
                    $window.data = $scope.userData;
                    $window.$windowScope = $scope;
                    $window.open($state.href('app.load-questions', {quizKey: $stateParams.quizKey}), "Test Window", "width=1280,height=890,resizable=0");
                },
                function(response) {
                    $scope.isFormInvalid = true;
                    $scope.alertType = "danger";
                    $scope.alertMsg = response.data.errors;
                    setTimeout(closeAlert, 5000);
                });
            }
    }])
    .controller('LoadQuestionsController', ['$scope', '$rootScope', '$window', '$state', '$cookies', 'LoadQuestionsFactory', 'TestPageFactory', function($scope, $rootScope, $window, $state, $cookies, LoadQuestionsFactory, TestPageFactory) {
        var allSections = [];
        var allQuestions = {}; 
        var parentScope = $window.opener.$windowScope;
        parentScope.$emit('from-iframe','TestLoading');
        parentScope.$apply();
        parentScope.$digest();

        $scope.progressValue = 0.00;
        $scope.total_questions = 0;
        $scope.sectionsDetails = {};
        $cookies.put('testToken', $window.opener.data.testToken);

        var data = { test_key: $window.opener.data.test_key, test_user: $window.opener.data.testUser, 'quiz': $window.opener.data.quiz_id , 'quizName': $window.opener.data.quiz_name, 'quizStacks' : $window.opener.data.quizStacks, 'testToken': $window.opener.data.testToken , 'details' : {} };
        data['isTestNotCompleted'] = $window.opener.data.isTestNotCompleted;
        data['allQuestionsIds'] = [];
        if(data['isTestNotCompleted']){
            data['existingAnswers'] = $window.opener.data.existingAnswers;
            data['sectionNameWhereLeft'] = "Section#"+$window.opener.data.sectionNoWhereLeft;
            data['sectionsRemaining'] = $window.opener.data.sectionsRemaining;
            data['timeRemaining'] = $window.opener.data.timeRemaining;
        }
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
                    for(var i=1;i<=response.added_questions.length;i++){
                        $scope.progressValue +=  (i/$scope.total_questions)*100;
                        if(!data['isTestNotCompleted'] || data['sectionsRemaining'].length===0 ){
                            data['allQuestionsIds'].push(response.added_questions[i-1]);
                        }
                    }    
                    if($scope.progressValue>=100){
                        parentScope.$emit('from-iframe','TestLoaded');
                        $scope.progressValue = 100;
                        $scope.startTest = function(){
                            $rootScope.parentScope = parentScope;
                            parentScope.$emit('from-iframe','TestStarted');
                            parentScope.$apply();
                            parentScope.$digest();
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
    .controller('TestPageController', ['$scope', '$controller', '$cookies', '$window', '$interval', '$stateParams', '$state', 'TestPageFactory', function($scope, $controller, $cookies, $window, $interval, $stateParams, $state, TestPageFactory) {
        $scope.allQuestions = {};
        var firstItemVisited = false;
        $scope.testSubmitted = false;
        var allQuestionsIds = [];
        var totalTime = 0;
        var timeCounter = 0;
        if($stateParams.obj.isTestNotCompleted){
            totalTime = parseInt($stateParams.obj.timeRemaining);
            if($stateParams.obj.sectionsRemaining){
                allQuestionsIds = $stateParams.obj.allQuestionsIds;
            }
        }else{
            totalTime = findTotalDuration($stateParams.obj.quizStacks);
            allQuestionsIds = $stateParams.obj.allQuestionsIds;
        }
        $scope.serverURL = serverURL;
        TestPageFactory.saveQuestionIdsList(allQuestionsIds);
        function getQuestionsBasedOnSection(sectionName){
            try{
                $scope.total_questions = TestPageFactory.getQuestionsForSection(sectionName);
                $scope.sliced_questions = range(0, $scope.total_questions.slice(0,15).length);
                $scope.sliceFactor = 0;
                $scope.slicingLimit = Math.floor($scope.total_questions.length/15);
                $scope.answersModel = {};
                firstItemVisited = false;
                $scope.progressValuesModel = {};
                var existingAnswersKeys = null;
                var existingAnswers = null;
                if(sectionName===$stateParams.obj.sectionNameWhereLeft && $stateParams.obj.isTestNotCompleted){
                    existingAnswers = $stateParams.obj.existingAnswers['answers'][sectionName];
                    existingAnswersKeys = Object.keys(existingAnswers);
                }
                for(var i=0;i<$scope.total_questions.length;i++){
                    var qKey = $scope.total_questions[i][i+1].id;
                    if((sectionName===$stateParams.obj.sectionNameWhereLeft) && existingAnswersKeys.indexOf(qKey.toString())!=-1){
                        $scope.answersModel[qKey] = { value: existingAnswers[qKey].value  };
                        $scope.progressValuesModel[qKey] = { status: 'A' };
                    }else{
                        $scope.answersModel[qKey] = { value:null };
                        $scope.progressValuesModel[qKey] = { status:'NV' };
                    }
                    
                }
                TestPageFactory.saveSectionQuestion(sectionName, $scope.answersModel);
                TestPageFactory.saveProgressValues(sectionName, $scope.progressValuesModel);
                if((sectionName===$stateParams.obj.sectionNameWhereLeft) && $stateParams.obj.isTestNotCompleted){
                    $scope.progressValues = changeProgressValues($scope.progressValuesModel);
                }
                $scope.changeQuestion(1);
            }catch(err){
                console.log(err,'------------');
            }
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
            if($scope.sectionNames.indexOf($scope.selectedSection)<$scope.sectionNames.length && $scope.sectionNames.length>1){
                if($scope.currentSection === $scope.nextSection){
                    if($scope.sectionNames.indexOf($scope.selectedSection)===$scope.sectionNames.length - 1){
                        $scope.selectedSection = $scope.sectionNames[0];

                    }else{
                        $scope.selectedSection = $scope.sectionNames[$scope.sectionNames.indexOf($scope.selectedSection)+1];
                    }
                    
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
                            if($stateParams.obj.isTestNotCompleted){
                                $scope.progressValuesModel[$scope.currentQuestion.id].status = 'A';
                            }
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
                console.log($scope.progressValuesModel);
                TestPageFactory.saveProgressValues($scope.selectedSection, $scope.progressValuesModel);
                $scope.submitTestDetails(false, $scope.selectedSection);
            }catch(err){}
            }
        }, true);

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

        function showFinishPage(){
            $state.go('app.finish-test', { obj: {"quizName": $stateParams.obj.quizName}});
        }

        $scope.submitTestDetails = function(isSaveToDB, currentSection){
            var data = { 'test_user': $stateParams.obj.test_user, 'test_key': $stateParams.obj.test_key };
            if(isSaveToDB){
                var testCompleted = false;
                data['time_spent'] = $scope.totalDuration;
                // var progressData= {};
                // var progressValues = TestPageFactory.getProgressValues();
                // for(var sectionName in progressValues){
                //     progressData[sectionName] = { NV: [], NA: [] };
                //     for(var questionId in progressValues[sectionName]){
                //         var status = progressValues[sectionName][questionId].status;
                //         if(status === 'NA'){
                //             progressData[sectionName]['NA'].push(questionId);
                //         }else if(status === 'NV'){
                //             progressData[sectionName]['NV'].push(questionId);
                //         }
                //     }
                // }
                // data['progressValues'] = progressData;
                TestPageFactory.saveResultToDB().save(data).$promise.then(
                    function(response){
                        $cookies.remove('testToken');
                        $scope.parentScope.redirectToResultPage(serverURL+'user/result/'+$stateParams.obj.test_user+'/'+$stateParams.obj.test_key+'/');
                        alert("You have completed your test successfully. You can now close this window!");
                        $window.close();
                    },
                    function(response){
                        // testCompleted = false;
                    }
                );
                // showFinishPage();
                // if(testCompleted){
                // console.log('lll');
                // }else{
                //     $state.go('app.finish-test', { obj: {"quizName": $stateParams.obj.quizName}});
                // }
            }else{
                data['answer'] = {};
                data['answer'][$scope.currentQuestion.id] = {
                    value: TestPageFactory.getAnswerForQuestion(currentSection, $scope.currentQuestion.id).value, 
                    status: TestPageFactory.getAnswerProgressValue(currentSection, $scope.currentQuestion.id).status 
                    }; 
                data['quiz_id'] = $stateParams.obj.quiz;
                data['section_name'] = currentSection;
                data['questions_list'] = allQuestionsIds;
                TestPageFactory.saveResultToCache(data).then(function(response){
                    console.log('success');
                    allQuestionsIds = [];
                });
            }
        }

        function updateTimeRemaining(timeData){
            TestPageFactory.saveTimeRemainingToCache(timeData).then(
                function(response){
                    console.log('time updated');
                }
            );
        }

        try{
            if(isNotEmpty($stateParams.obj)){
                $scope.quiz = $stateParams.obj.quiz;
                // TestPageFactory.addQuizData($scope.quiz);
                $scope.sectionNames = Object.keys($stateParams.obj.details).sort();
                if($scope.sectionNames.length<=1){
                    $scope.hideNextSectionButton = true;
                }
                if(!$stateParams.obj.isTestNotCompleted || $stateParams.obj.sectionsRemaining.length===0){
                    $scope.selectedSection = $scope.sectionNames[0];
                }
                else{
                    $scope.selectedSection = $stateParams.obj.sectionNameWhereLeft;
                }
                $scope.currentSection = $scope.selectedSection;
                $scope.addQuestions($scope.selectedSection);
                // for(var i=0;i<sectionNames.length;i++){
                //     angular.element(document.querySelector('#sectionnames')).append('<option value='+sectionNames[i]+'>'+sectionNames[i]+'</option>');
                // }
                $scope.totalDuration = totalTime;
                $interval(function(){
                    $scope.totalDuration -= 1;
                    timeCounter += 1;
                    if(timeCounter % 5 === 0){
                        updateTimeRemaining({'test_user': $stateParams.obj.test_user, 'test_key': $stateParams.obj.test_key, 'remaining_duration': $scope.totalDuration, 'section_name': $scope.selectedSection });
                    }
                    if($scope.totalDuration===0){
                        alert('Time Over');
                        submitTestDetails(true, $scope.currentSection);
                    }
                },1000, totalTime);
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



        

    


/* global $ */
appmodule
    .controller('IndexThirdPartyController', ['$scope', '$rootScope', '$cookies', '$state', '$window', '$stateParams', function($scope, $rootScope, $cookies, $state, $window, $stateParams) {
        $scope.openLiveTest = function(){
            $window.$windowScope = $scope;
            $window.data = {quizKey: $stateParams.quizKey};
            $window.open($state.href('thirdpartytest-open', {quizKey: $stateParams.quizKey, testID: $stateParams.testID, token:$stateParams.token}), "Test Window", "width=1280,height=890,resizable=0");
        }
        $scope.message = '';
        $scope.image = '';
        $scope.$on('from-iframe', function(e, message) {
            if(message==='TestStart'){
                $scope.message = 'You can start the test.';
                $scope.image = '../images/ellipsis.svg';
            }
            else if(message==='TestLoading'){
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

        $scope.redirectToResultPage = function(resultPageURL){
            $window.location = resultPageURL;
        }

        $scope.closeStateModal = function(){
            angular.element(document.querySelector('#stateModal')).modal('hide');
        }
    }])
    .controller('UserDataThirdPartyController',['$scope', '$rootScope', '$state', '$cookies', '$window', '$stateParams', 'TestUserDataFactory', function($scope, $rootScope, $state, $cookies, $window, $stateParams, TestUserDataFactory) {
        if($window.opener){
            $scope.error = false;

            TestUserDataFactory.getQuizAccordingToKey($stateParams.quizKey).get().$promise.then(
                function(response){
                    $scope.userData = { username:'', email:'', quiz_id: response.id, quiz_name: response.title, test_key: response.quiz_key, show_result_on_completion:response.show_result_on_completion, 'quizStacks': undefined, 'testToken': undefined };
                    var parentScope = $window.opener.$windowScope;
                    parentScope.$emit('from-iframe','TestStart');
                    parentScope.$apply();
                    parentScope.$digest();
                    $rootScope.parentScope = parentScope;
                    },
                function(response){
                        alert("Error in retrieving quiz details!");                     
                });

            // Below object is required from source.
            $scope.getUserDetails = function(){
                TestUserDataFactory.getTestUser($stateParams.testID, $stateParams.token).get().$promise.then(
                function(response){
                    $scope.isFormInvalid = false;
                    $cookies.put('testToken', response.token);
                    $scope.userData['testToken'] = response.token;
                    $scope.userData['isTestNotCompleted'] = response.test.isTestNotCompleted;
                    $scope.userData['testUser'] = response.testUser;
                    $scope.userData['sectionsRemaining'] = response.test.sectionsRemaining;
                    $scope.userData['sectionNoWhereLeft'] = response.test.sectionNoWhereLeft;
                    $scope.userData['existingAnswers'] = response.test.existingAnswers;
                    $scope.userData['timeRemaining'] = response.test.timeRemaining;
                    if(!$scope.userData['isTestNotCompleted']){
                        TestUserDataFactory.getQuizStack($scope.userData.quiz_id, 'all').query(
                            function(response) {
                                $scope.userData['quizStacks'] = response;
                                $rootScope.userDetails = $scope.userData;
                                $state.go('thirdpartytest-load', {quizKey: $stateParams.quizKey, testID: $stateParams.testID, token:$stateParams.token});
                            },
                            function(response) {
                                $scope.unableToGetAllSavedStacks = true;
                        });
                    }else{
                        var result = confirm('You have a uncompleted test! Click to give it.');
                        if(result){
                            if($scope.userData['sectionsRemaining'].length===0 && $scope.userData['sectionNoWhereLeft']===null) {
                                TestUserDataFactory.getQuizStack($scope.userData.quiz_id, 'all').query(
                                    function(response) {
                                        $scope.userData['quizStacks'] = response;
                                        $rootScope.userDetails = $scope.userData;
                                        $state.go('thirdpartytest-load', {quizKey: $stateParams.quizKey, testID: $stateParams.testID, token:$stateParams.token});
                                    },
                                    function(response) {
                                        $scope.unableToGetAllSavedStacks = true;
                                });
                            }else{                          
                                TestUserDataFactory.getQuizStackForUncompleteTest().save($scope.userData).$promise.then(
                                    function(response) {
                                        $scope.userData['quizStacks'] = response;
                                        $rootScope.userDetails = $scope.userData;
                                        $state.go('thirdpartytest-load', {quizKey: $stateParams.quizKey, testID: $stateParams.testID, token:$stateParams.token});
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
                    // $window.data = $scope.userData;
                    // $window.$windowScope = $scope;
                    // $window.open($state.href('app.load-questions', {quizKey: $stateParams.quizKey}), "Test Window", "width=1280,height=890,resizable=0");
                },
                function(response) {
                    $scope.isFormInvalid = true;
                    $scope.alertType = "danger";
                    $scope.alertMsg = response.data.errors;
                    setTimeout(closeAlert, 5000);
                });
            }
        }else{
            $scope.error = true;
        }
    }])
    .controller('LoadQuestionsThirdPartyController', ['$scope', '$rootScope', '$window', '$state', '$stateParams', '$cookies', 'LoadQuestionsFactory', 'TestPageFactory', function($scope, $rootScope, $window, $state, $stateParams, $cookies, LoadQuestionsFactory, TestPageFactory) {
        if($scope.userDetails){
            $scope.error = false;
            var allSections = [];
            var allQuestions = {}; 
            var parentScope = $scope.parentScope;
            parentScope.$emit('from-iframe','TestLoading');
            parentScope.$apply();
            parentScope.$digest();
            $scope.progressValue = 0.00;
            $scope.total_questions = 0;
            $scope.sectionsDetails = {};
            $cookies.put('testToken', $scope.userDetails.testToken);
            var data = { test_key: $scope.userDetails.test_key, test_user: $scope.userDetails.testUser, show_result_on_completion: $scope.userDetails.show_result_on_completion, 'quiz': $scope.userDetails.quiz_id , 'quizName': $scope.userDetails.quiz_name, 'quizStacks' : $scope.userDetails.quizStacks, 'testToken': $scope.userDetails.testToken , 'details' : {} };
            data['isTestNotCompleted'] = $scope.userDetails.isTestNotCompleted;
            if(data['isTestNotCompleted']){
                data['existingAnswers'] = $scope.userDetails.existingAnswers;
                data['sectionNameWhereLeft'] = "Section#"+$scope.userDetails.sectionNoWhereLeft;
                data['sectionsRemaining'] = $scope.userDetails.sectionsRemaining;
                data['timeRemaining'] = $scope.userDetails.timeRemaining;
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
                LoadQuestionsFactory.loadAllQuestions($scope.userDetails.quiz_id, sectionName).query(
                    function(response){
                        TestPageFactory.addQuestionsForSection(sectionName, response.questions);
                        for(var i=1;i<=response.added_questions.length;i++){
                            $scope.progressValue +=  (i/$scope.total_questions)*100;
                            // if(!data['isTestNotCompleted'] || data['sectionsRemaining'].length===0 ){
                            //     data['allQuestionsIds'].push(response.added_questions[i-1]);
                            // }
                        }
                        if($scope.progressValue>=100){
                            parentScope.$emit('from-iframe','TestLoaded');
                            $scope.progressValue = 100;
                            $scope.startTest = function(){
                                LoadQuestionsFactory.saveSittingUser().save({ test_user: $scope.userDetails.testUser, quiz_id: $scope.userDetails.quiz_id }).$promise.then(
                                    function(response){
                                        parentScope.$emit('from-iframe','TestStarted');
                                        parentScope.$apply();
                                        parentScope.$digest();
                                        $state.go('thirdpartytest-start', { obj: data, token: $scope.userDetails.testToken, testID: $stateParams.testID, quizKey: $scope.userDetails.test_key });
                                    }, 
                                    function(response){
                                        alert('Error in getting test details.');
                                        $window.close();
                                    });
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
        }else{
            $scope.error = true;
        }          
    }])
    .controller('TestPageHeaderThirdPartyController', ['$scope', '$controller', '$window', '$stateParams', function($scope, $controller, $window, $stateParams) {
            // console.log($window.opener.data.quiz)
            if(isNotEmpty($stateParams.obj)){
                $scope.quizName = $stateParams.obj.quizName;
                $scope.dataPresent = true;      
            }
            else{
                $scope.dataPresent = false;
            }   
        }])
    .controller('TestPageThirdPartyController', ['$scope', '$controller', '$cookies', '$window', '$interval', '$stateParams', '$state', 'TestPageFactory', function($scope, $controller, $cookies, $window, $interval, $stateParams, $state, TestPageFactory) {
        $scope.allQuestions = {};
        var firstItemVisited = false;
        // var allQuestionsIds = [];
        var totalTime = 0;
        var timeCounter = 0;
        if($stateParams.obj.isTestNotCompleted){
            totalTime = parseInt($stateParams.obj.timeRemaining);
            // if($stateParams.obj.sectionsRemaining){
            //     allQuestionsIds = $stateParams.obj.allQuestionsIds;
            // }
        }else{
            totalTime = findTotalDuration($stateParams.obj.quizStacks);
            // allQuestionsIds = $stateParams.obj.allQuestionsIds;
        }
        $scope.serverURL = serverURL;

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

        $scope.changeQuestion = function(count){
            if(count>=1 && count<=$scope.total_questions.length)
            {
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

                // $scope.parentScope from $rootScope (set in LoadQuestionsController)
                $scope.parentScope.message = 'Your have submitted the test. Please wait for the result. Do not refresh the page.';
                $scope.parentScope.image = '../images/ellipsis.svg';
                $scope.parentScope.$emit('from-iframe','TestFinished');
                $scope.parentScope.$apply();
                $scope.parentScope.$digest();

                data['time_spent'] = $scope.totalDuration;
                TestPageFactory.saveResultToDB().save(data).$promise.then(
                    function(response){
                        $cookies.remove('testToken');
                        if($stateParams.obj.show_result_on_completion){
                            $scope.parentScope.closeStateModal();
                            $scope.parentScope.redirectToResultPage(testURL+'#/view/report/'+$stateParams.obj.test_user+'/'+$stateParams.obj.test_key+'/'+response.attempt_no);
                        }else{
                            $scope.parentScope.message = 'Your result has been saved. But the result cannot be shown right now. You can now close this window.';
                            $scope.parentScope.image = '../images/completed.png';
                            $scope.parentScope.$emit('from-iframe','TestFinished');
                            $scope.parentScope.$apply();
                            $scope.parentScope.$digest();
                        }
                        alert("You have completed your test successfully. You can now close this window.");
                        $window.close();
                    },
                    function(response){
                        alert('Error in submitting test!');
                    }
                );
            }else{
                data['answer'] = {};
                data['answer'][$scope.currentQuestion.id] = {
                    value: TestPageFactory.getAnswerForQuestion(currentSection, $scope.currentQuestion.id).value, 
                    status: TestPageFactory.getAnswerProgressValue(currentSection, $scope.currentQuestion.id).status 
                    }; 
                data['quiz_id'] = $stateParams.obj.quiz;
                data['section_name'] = currentSection;
                TestPageFactory.saveResultToCache(data).then(function(response){
                    console.log('success');
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
                $scope.totalDuration = totalTime;
                updateTimeRemaining({'test_user': $stateParams.obj.test_user, 'test_key': $stateParams.obj.test_key, 'remaining_duration': $scope.totalDuration, 'section_name': $scope.selectedSection });
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
    }]);


        

    


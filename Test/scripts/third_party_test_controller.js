/* global $ */
appmodule
    .controller('IndexThirdPartyController', ['$scope', '$rootScope', '$cookies', '$state', '$window', '$stateParams', function($scope, $rootScope, $cookies, $state, $window, $stateParams) {
        $scope.openLiveTest = function(){
            $window.$windowScope = $scope;
            $window.data = {quizKey: $stateParams.quizKey};
            $window.open($state.href('thirdpartytest-open', {quizKey: $stateParams.quizKey, testID: $stateParams.testID, token:$stateParams.token}), "Test Window", "width=1280,height=890,resizable=0");
        }
        // $scope.message = '';
        // $scope.image = '';
        $scope.$on('from-iframe', function(e, message) {
            var params = getParamsForStateModal(msg);
            showStateModal(params.message, params.image);
        });

        $scope.redirectToResultPage = function(resultPageURL){
            $cookies.remove('testToken');
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
                    $rootScope.parentScope = parentScope;
                    },
                function(response){
                    alert("Error in retrieving quiz details!");
                    $window.close();                    
                });

            function moveToLoadingState(response){
                $scope.userData['quizStacks'] = response;
                $rootScope.userDetails = $scope.userData;
                $state.go('thirdpartytest-load', {quizKey: $stateParams.quizKey, testID: $stateParams.testID, token:$stateParams.token});
            }

            // Below object is required from source.
            $scope.getUserDetails = function(){
                TestUserDataFactory.getTestUser($stateParams.testID, $stateParams.token).get().$promise.then(
                function(response){
                    $scope.isFormInvalid = false;
                    $cookies.put('testToken', response.token);
                    $scope.userData['testToken'] = response.token;
                    $scope.userData['isTestNotCompleted'] = response.test.isTestNotCompleted;
                    $scope.userData['testUser'] = response.testUser;
                    $scope.userData['existingAnswers'] = response.test.existingAnswers;
                    $scope.userData['timeRemaining'] = response.test.timeRemaining;
                    $scope.userData['sectionNoWhereLeft'] = response.test.sectionNoWhereLeft;
                    if(!$scope.userData['isTestNotCompleted']){
                        TestUserDataFactory.getQuizStack($scope.userData.quiz_id, 'all').query(
                            function(response) {
                                moveToLoadingState(response);
                            },
                            function(response) {
                                $scope.unableToGetAllSavedStacks = true;
                        });
                    }else{
                        var result = confirm('You have a uncompleted test! Click to give it.');
                        if(result){
                            if($scope.userData['isTestNotCompleted']) {
                                TestUserDataFactory.getQuizStack($scope.userData.quiz_id, 'all').query(
                                    function(response) {
                                        moveToLoadingState(response);
                                    },
                                    function(response) {
                                        $scope.unableToGetAllSavedStacks = true;
                                });
                            }
                        }else{
                            console.log('Re-attempt test cancelled.');
                            $cookies.remove('testToken');
                            return false;
                        }
                    }
                },
                function(response) {
                    $scope.isFormInvalid = true;
                    showAlert('alert-danger', response.data.errors);
                    $window.opener.$windowScope.$emit('from-iframe','TestLimitExceeded');
                });
            }
        }
        else{
            $scope.error = true;
        }
    }])
    .controller('LoadQuestionsThirdPartyController', ['$scope', '$rootScope', '$window', '$state', '$stateParams', '$cookies', 'LoadQuestionsFactory', 'TestPageFactory', function($scope, $rootScope, $window, $state, $stateParams, $cookies, LoadQuestionsFactory, TestPageFactory) 
    {
        if($scope.userDetails)
        {
            $scope.error = false;
            var allSections = [];
            var parentScope = $scope.parentScope;
            parentScope.$emit('from-iframe','TestLoading');
            $scope.progressValue = 0.0;
            $scope.total_questions = 0;
            $scope.total_duration = 0;
            $scope.total_sections = 0;
            $scope.sectionsDetails = {};
            $cookies.put('testToken', $scope.userDetails.testToken);
            var data = { test_key: $scope.userDetails.test_key, test_user: $scope.userDetails.testUser, show_result_on_completion: $scope.userDetails.show_result_on_completion, 'quiz': $scope.userDetails.quiz_id , 'quizName': $scope.userDetails.quiz_name, 'quizStacks' : $scope.userDetails.quizStacks, 'testToken': $scope.userDetails.testToken, isTestNotCompleted: $scope.userDetails.isTestNotCompleted, 'details' : {} };
            var result = processLoadedData(data);
            data = result.data;
            $scope.total_questions = result.total_questions;
            $scope.total_duration = result.total_duration;
            $scope.total_sections = result.total_sections;
            var allSections = result.allSections;
            var progressFactor = 100/$scope.total_sections;
            for(var i=0;i<allSections.length;i++){
                $scope.sectionsDetails[allSections[i]] = { 'duration': data['details'][allSections[i]]['duration'], 'questions': data['details'][allSections[i]]['questions'] };
                loadQuestions(allSections[i]);
            }

            function loadQuestions(sectionName){
                LoadQuestionsFactory.loadAllQuestions($scope.userDetails.quiz_id, sectionName).query(
                    function(response){
                        TestPageFactory.addQuestionsForSection(sectionName, response.questions);
                        $scope.progressValue += progressFactor;
                        if($scope.progressValue>99){
                            parentScope.$emit('from-iframe','TestLoaded');
                            $scope.progressValue = 100;
                            $scope.startTest = function(){
                                LoadQuestionsFactory.saveSittingUser().save({ test_user: $scope.userDetails.testUser, quiz_id: $scope.userDetails.quiz_id }).$promise.then(
                                    function(response){
                                        parentScope.$emit('from-iframe','TestStarted');
                                        $state.go('thirdpartytest-start', { obj: data, token: $scope.userDetails.testToken, testID: $stateParams.testID, quizKey: $scope.userDetails.test_key });
                                    }, 
                                    function(response){
                                        alert('Error in getting test details.');
                                        $cookies.remove('testToken');
                                        $window.close();
                                    });
                            }
                        }
                    },
                    function(response){
                        alert('Problem in getting questions from server-side.');
                        $cookies.remove('testToken');
                        $window.close();
                    });
            }
        }else{
            $scope.error = true;
            $cookies.remove('testToken');
        } 
        }]) 
        .controller('TestPageHeaderThirdPartyController', ['$scope', '$controller', '$window', '$stateParams', function($scope, $controller, $window, $stateParams) {
            if(isNotEmpty($stateParams.obj)){
                $scope.quizName = $stateParams.obj.quizName;
                $scope.dataPresent = true;      
            }
            else{
                $scope.dataPresent = false;
            }   
        }])
    .controller('TestPageThirdPartyController', ['$scope', '$controller', '$cookies', '$window', '$interval', '$stateParams', '$state', 'TestPageFactory', function($scope, $controller, $cookies, $window, $interval, $stateParams, $state, TestPageFactory) {
        var firstQuestionVisited = false;
        var hasAttempted = true;
        var totalTime = 0;
        var timeCounter = 0;
        if($stateParams.obj.isTestNotCompleted){
            totalTime = parseInt($stateParams.obj.timeRemaining);
        }else{
            totalTime = findTotalDuration($stateParams.obj.quizStacks);
        }

        $scope.baseURLImage = baseURLImage;
        $scope.progressValuesModel = {};
        $scope.answersModel = {};
        var previousCountForQuestionBeforeSectionChange = 0;
        var bookmarkedQuestions = {};
        bookmarkedQuestions[qTypes[0]] = [];
        bookmarkedQuestions[qTypes[2]] = [];
        var timeSpentOnQuestions = {};
        $scope.comprehensionAnswersModel = {};
        var comprehensionQuestions = 0;
        $scope.isBookMarked = {};
        $scope.isBookMarked[qTypes[0]] = [];
        $scope.isBookMarked[qTypes[2]] = [];

        function getQuestionsBasedOnSection(sectionName){
            try{
                $scope.total_questions = TestPageFactory.getQuestionsForSection(sectionName);
                $scope.sliced_questions = range(0, $scope.total_questions.slice(0,15).length);
                $scope.sliceFactor = 0;
                $scope.slicingLimit = Math.floor($scope.total_questions.length/15);                
                firstQuestionVisited = false;                
                var existingAnswersKeys = null;
                var existingAnswers = null;
                if($stateParams.obj.isTestNotCompleted){
                    if(hasAttempted){
                        existingAnswers = $stateParams.obj.existingAnswers['answers'];
                        if(existingAnswers && existingAnswers.hasOwnProperty(sectionName)){
                            existingAnswersKeys = Object.keys(existingAnswers[sectionName]);
                        }else{
                            existingAnswersKeys = [];
                        }
                    }
                }else{
                    existingAnswersKeys = [];
                }
                for(var i=0;i<$scope.total_questions.length;i++){
                    var q = $scope.total_questions[i][i+1];
                    var qKey = q.id;
                    if(hasAttempted && existingAnswersKeys.length!=0 && existingAnswersKeys.indexOf(qKey.toString())!=-1){
                        if(existingAnswers[sectionName][qKey].hasOwnProperty('status')){
                            $scope.answersModel[qKey] = { value: existingAnswers[sectionName][qKey].value  };
                            $scope.progressValuesModel[qKey] = { status: existingAnswers[sectionName][qKey].status };
                        }else{
                            $scope.answersModel[qKey] = { comprehension_questions: [], heading: q.heading };
                            for(var cq_id in existingAnswers[sectionName][qKey]){
                                $scope.comprehensionAnswersModel[cq_id] = { value:existingAnswers[sectionName][qKey][cq_id].value };
                            } 
                            $scope.progressValuesModel[qKey] = { status: 'A' };                           
                        }
                        timeSpentOnQuestions[qKey] = { time: totalTime };                        
                    }else{
                        if($scope.answersModel.hasOwnProperty(qKey)){
                            continue;
                        }else{
                            $scope.answersModel[qKey] = { value:null };
                            $scope.progressValuesModel[qKey] = { status:progressTypes[1] };
                            timeSpentOnQuestions[qKey] = { time: totalTime };
                            if(q.que_type === qTypes[2]){
                                $scope.answersModel[qKey]['comprehension_questions'] = [];
                                $scope.answersModel[qKey]['heading'] = q.heading;
                                for(var j=0;j<q.comprehension_questions.length;j++){
                                    $scope.comprehensionAnswersModel[q.comprehension_questions[j][j+1].id] = { value:null };
                                }                        
                            }
                        }
                    }
                }
                TestPageFactory.saveSectionQuestionAnswers(sectionName, $scope.answersModel);
                TestPageFactory.saveProgressValues(sectionName, $scope.progressValuesModel);
                if($stateParams.obj.isTestNotCompleted){
                    $scope.progressValues = changeProgressValues($scope.progressValuesModel);
                }
                $scope.changeQuestion(1, undefined);
            }catch(err){
                console.log(err,'------------');

            }
        }

        $scope.openWarningModal = function(action){
            $scope.action = action;
            switch(action){
                case "sectionChangeRequestInitiated":
                    toggleWarningModal('show', '<b>Do you really want to change the section?</b>', 'Yes I am sure.');
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

        function addQuestions(sectionName){
            $scope.sliceFactor = 0;
            getQuestionsBasedOnSection(sectionName);
        }

        $scope.changeSection = function(currentSection){
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
                // $scope.sectionNames.splice($scope.sectionNames.indexOf($scope.currentSection), 1);
                addQuestions($scope.selectedSection);
                if($scope.sectionNames.indexOf($scope.selectedSection)===$scope.sectionNames.length-1){
                    $scope.hideNextSectionButton = true;
                }
                $scope.currentSection = $scope.selectedSection;                
            }
            else{
                $scope.hideNextSectionButton = true;
            }
            saveTimeSpentOnQuestion(currentSection, previousCountForQuestionBeforeSectionChange);
        }

        $scope.bookmarkQuestion = function(questionID, que_type){
            var questionID = parseInt(questionID);
            var isAlreadyBookMarked = bookmarkedQuestions[que_type].indexOf(questionID);
                if(isAlreadyBookMarked === -1){
                    bookmarkedQuestions[que_type].push(questionID);
                    $scope.isBookMarked[que_type] = 1;
                }else{
                    bookmarkedQuestions[que_type].splice(isAlreadyBookMarked, 1);
                    $scope.isBookMarked[que_type] = -1;
                }
            // console.log(bookmarkedQuestions);
        }

        function saveTimeSpentOnQuestion(section, previousCount){
            var remaining_timespent = 0;
            var timeSpent = 0;
            var previousQuestion = TestPageFactory.getQuestion(section, previousCount);
            var recordedTime = timeSpentOnQuestions[previousQuestion.id]['time'];
            if(recordedTime<totalTime){
                timeSpent = totalTime - $scope.totalDuration;
            }else{
                timeSpent = recordedTime - $scope.totalDuration;
            }
            for(var q in timeSpentOnQuestions){
                if(q != previousQuestion.id && timeSpentOnQuestions[q]['time'] != totalTime){
                    remaining_timespent += timeSpentOnQuestions[q]['time'];
                }
            }
            timeSpentOnQuestions[previousQuestion.id]['time'] = timeSpent - remaining_timespent;
            postTimePerQuestion(timeSpentOnQuestions[previousQuestion.id]['time'], previousQuestion.id);
        }

        $scope.changeQuestion = function(count, previousCount){
            if(count>=1 && count<=$scope.total_questions.length)
            {
                if(previousCount!=undefined){
                    previousCountForQuestionBeforeSectionChange = count;
                    saveTimeSpentOnQuestion($scope.selectedSection, previousCount);
                }
                $scope.currentComprehensionQuestion = [];
                $scope.currentCount = count;
                if($scope.currentComprehensionQuestionCount!=undefined){
                    $scope.isComprehension = false;
                    delete $scope.currentComprehensionQuestion;
                    delete $scope.currentComprehensionQuestionCount;
                    delete $scope.comprehensionQuestionsLimit;
                    comprehensionQuestions = null;
                }
                $scope.currentQuestion = TestPageFactory.getQuestion($scope.selectedSection, count);

                if($scope.currentQuestion.que_type === qTypes[0]){
                    $scope.currentOptions = $scope.currentQuestion.options;
                }
                else if(($scope.currentQuestion.que_type === qTypes[1])){
                    $scope.currentOptions = [];
                }else{
                    $scope.isComprehension = true;
                    comprehensionQuestions = $scope.currentQuestion.comprehension_questions;
                    $scope.comprehensionQuestionsLimit = comprehensionQuestions.length - 1;
                    $scope.changeComprehensionQuestion(0);
                }       
                if($scope.progressValuesModel[$scope.currentQuestion.id].status === progressTypes[1]){
                    $scope.progressValuesModel[$scope.currentQuestion.id].status = progressTypes[0];
                    $scope.progressValues = changeProgressValues($scope.progressValuesModel);
                    TestPageFactory.saveProgressValues($scope.selectedSection, $scope.progressValuesModel);
                }
                $scope.isBookMarked[qTypes[0]] = bookmarkedQuestions[qTypes[0]].indexOf(parseInt($scope.currentQuestion.id));
            }
        }

        $scope.changeComprehensionQuestion = function(comprehensionCount){
            if(comprehensionCount>=0 && comprehensionCount<=$scope.comprehensionQuestionsLimit)
            {
                $scope.currentComprehensionQuestionCount = comprehensionCount;
                $scope.currentComprehensionQuestion = comprehensionQuestions[comprehensionCount][comprehensionCount+1];
                $scope.isBookMarked[qTypes[2]] = bookmarkedQuestions[qTypes[2]].indexOf(parseInt($scope.currentComprehensionQuestion.id));
            }
        }

        function markQuestionVisited(){
            if(!firstQuestionVisited){
                firstQuestionVisited = true;
                if($stateParams.obj.isTestNotCompleted){
                    $scope.progressValuesModel[$scope.currentQuestion.id].status = progressTypes[2];
                }
            }
            if($scope.progressValuesModel[$scope.currentQuestion.id].status === progressTypes[0]){
                $scope.progressValuesModel[$scope.currentQuestion.id].status = progressTypes[2];
            }
        }
        
        // Watch for a change in answersModel
        $scope.$watch(function() {
           return $scope.answersModel;
         },                       
          function(newVal, oldVal) {
            if(newVal!=oldVal){
            try{ 
                if($scope.currentCount > 1 || ($scope.currentCount > 1 && $scope.currentQuestion.que_type === qTypes[0])){
                    if($scope.progressValuesModel[$scope.currentQuestion.id].status === progressTypes[1]){
                        $scope.progressValuesModel[$scope.currentQuestion.id].status = progressTypes[0];
                    }
                    else if($scope.progressValuesModel[$scope.currentQuestion.id].status === progressTypes[0]){
                        $scope.progressValuesModel[$scope.currentQuestion.id].status = progressTypes[2];
                    }
                }else if($scope.currentCount === 1){
                    // if($scope.currentQuestion.que_type === qTypes[1]){  
                    // }
                    // else if($scope.currentQuestion.que_type === qTypes[0]){                        
                    // }
                    markQuestionVisited();
                }
                $scope.progressValues = changeProgressValues($scope.progressValuesModel);
                TestPageFactory.saveProgressValues($scope.selectedSection, $scope.progressValuesModel);
                $scope.submitTestDetails(false, $scope.selectedSection);
            }catch(err){}
            }
        }, true);

        // Watch for a change in comprehensionAnswersModel
        $scope.$watch(function() {
           return $scope.comprehensionAnswersModel;
         },                       
          function(newVal, oldVal) {
            try{ 
                if(newVal!=oldVal){
                    markQuestionVisited();
                    $scope.progressValues = changeProgressValues($scope.progressValuesModel);
                    TestPageFactory.saveProgressValues($scope.selectedSection, $scope.progressValuesModel);
                    $scope.submitTestDetails(false, $scope.selectedSection);
                }
            }catch(err){}
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

        function postBookMarks(data){
           TestPageFactory.saveBookMarks().save(data).$promise.then(
                function(response){
                    console.log('bookmarks saved');
                },
                function(response){
                    console.log('bookmarks not saved');
            });  
        }

        $scope.submitTestDetails = function(isSaveToDB, currentSection){
            var data = { 'test_user': $stateParams.obj.test_user, 'test_key': $stateParams.obj.test_key };
            if(isSaveToDB){
                saveTimeSpentOnQuestion($scope.selectedSection, $scope.currentCount);
                data['bookmarked_questions'] = bookmarkedQuestions;
                // Save bookmarks
                postBookMarks(data);
                // $scope.parentScope from $rootScope (set in LoadQuestionsController)
                // $scope.parentScope.message = 'Your have submitted the test. Please wait for the result page to load.';
                // $scope.parentScope.image = '../images/ellipsis.svg';
                $scope.parentScope.$emit('from-iframe','TestFinished');
                data['time_spent'] = $scope.totalDuration;
                data['time_spent_on_question'] = timeSpentOnQuestions;
                TestPageFactory.saveResultToDB().save(data).$promise.then(
                    function(response){
                        $cookies.remove('testToken');
                        if($stateParams.obj.show_result_on_completion){
                            $scope.parentScope.closeStateModal();
                            $scope.parentScope.redirectToResultPage(testURL+'#/view/report/'+$stateParams.obj.test_user+'/'+$stateParams.obj.test_key+'/'+response.attempt_no);
                        }else{
                            // $scope.parentScope.message = 'Your result has been saved. But the result cannot be shown right now. You can now close this window.';
                            // $scope.parentScope.image = '../images/completed.png';
                            $scope.parentScope.$emit('from-iframe','TestFinished');
                        }
                        alert("You have completed your test successfully. You can now close this window.");
                        $window.close();
                    },
                    function(response){
                        alert('Error in submitting test!');
                        // $cookies.remove('testToken');
                    }
                );
            }else{
                data['answer'] = {};
                data['que_type'] = $scope.currentQuestion.que_type;
                if($scope.currentQuestion.que_type != qTypes[2]){
                    data['answer'][$scope.currentQuestion.id] = {
                        value: TestPageFactory.getAnswerForQuestion(currentSection, $scope.currentQuestion.id).value, 
                        status: TestPageFactory.getAnswerProgressValue(currentSection, $scope.currentQuestion.id).status,
                        }; 
                    }else{
                        data['answer'][$scope.currentQuestion.id] = {};
                        data['answer'][$scope.currentQuestion.id][$scope.currentComprehensionQuestion.id] = {
                            value: $scope.comprehensionAnswersModel[$scope.currentComprehensionQuestion.id].value,
                        }; 
                }
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

        function postTimePerQuestion(qTimeValue, questionID){
            var data = { 'test_user': $stateParams.obj.test_user, 'test_key': $stateParams.obj.test_key, 'qtime_spent':{}};
            data['qtime_spent'][questionID.toString()] = qTimeValue;
            TestPageFactory.saveTimePerQuestionToCache(data).then(
                function(response){
                    console.log('time per question updated');
                }
            );
        }

        try{
            if(isNotEmpty($stateParams.obj)){
                if($stateParams.obj.hasOwnProperty('existingAnswers') && $stateParams.obj.existingAnswers.hasOwnProperty('answers'))
                {
                    if($stateParams.obj.existingAnswers['answers']===null){
                        hasAttempted = false;
                    }else{
                        hasAttempted = true;
                    }
                }
                $scope.quiz = $stateParams.obj.quiz;
                $scope.sectionNames = Object.keys($stateParams.obj.details).sort();
                if($scope.sectionNames.length<=1){
                    $scope.hideNextSectionButton = true;
                }
                if(!$stateParams.obj.isTestNotCompleted){
                    $scope.selectedSection = $scope.sectionNames[0];
                }
                else{
                    $scope.selectedSection = $stateParams.obj.sectionNameWhereLeft;
                }
                $scope.currentSection = $scope.selectedSection;
                addQuestions($scope.selectedSection);
                $scope.totalDuration = totalTime;
                updateTimeRemaining({'test_user': $stateParams.obj.test_user, 'test_key': $stateParams.obj.test_key, 'remaining_duration': $scope.totalDuration, 'section_name': $scope.selectedSection });

                $interval(function(){
                    $scope.totalDuration -= 1;
                    timeCounter += 1;
                    if(timeCounter % 5 === 0){
                        updateTimeRemaining({'test_user': $stateParams.obj.test_user, 'test_key': $stateParams.obj.test_key, 'remaining_duration': $scope.totalDuration, 'section_name': $scope.selectedSection });
                    }
                    if($scope.totalDuration === 0){
                        alert('Time Over');
                        $scope.submitTestDetails(true, $scope.currentSection);
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


        

    


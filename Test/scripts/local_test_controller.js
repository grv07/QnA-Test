/* global $ */
appmodule
    .controller('IndexController', ['$scope', '$rootScope', '$state', '$window', '$stateParams', function($scope, $rootScope, $state, $window, $stateParams) {
        $scope.openTest = function(){
            $window.$windowScope = $scope;
            $window.data = {quizKey: $stateParams.quizKey};
            $window.open($state.href('app.open-test', {quizKey: $stateParams.quizKey}), "Test Window", "width=1280,height=890,resizable=0");
        }
        $scope.message = '';
        $scope.image = '';
        $scope.$on('from-iframe', function(e, message) {
            if(message==='TestOpen'){
                $scope.message = 'You need to fill some details first.';
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
            else if(message==='TestLimitExceeded'){
                $scope.message = 'The test limit has been exceeded. No attempts left.';
                $scope.image = '../images/not_allowed.png';
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
    .controller('UserDataController',['$scope', '$rootScope', '$state', '$cookies', '$window', '$stateParams', 'TestUserDataFactory', function($scope, $rootScope, $state, $cookies, $window, $stateParams, TestUserDataFactory) {
        if($window.opener){
            $scope.error = false;
            TestUserDataFactory.getQuizAccordingToKey($window.opener.data.quizKey).get().$promise.then(
                function(response){
                    $scope.userData = { username:'', email:'', quiz_id: response.id, quiz_name: response.title, test_key: response.quiz_key, show_result_on_completion: response.show_result_on_completion, allow_public_access: response.allow_public_access, quizStacks: undefined, testToken: undefined };
                    // if(response.allow_public_access){
                        var parentScope = $window.opener.$windowScope;
                        parentScope.$emit('from-iframe','TestOpen');
                        parentScope.$apply();
                        parentScope.$digest();
                        $rootScope.parentScope = parentScope;
                    // }else{
                        // alert("Sorry the quiz has not been made publicly available. You cannot take the test.");
                        // $window.close(); 
                    // }
                },
                function(response){
                    alert("Error in retrieving quiz details!");
                    $window.close();                     
                });

            function moveToLoadingState(response){
                $scope.userData['quizStacks'] = response;
                $rootScope.userDetails = $scope.userData;
                $state.go('app.load-questions');
            }

            // Below object is required from source.
            $scope.postUserDetails = function(){
                TestUserDataFactory.saveTestUser().save($scope.userData).$promise.then(
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
                    // $window.data = $scope.userData;
                    // $window.$windowScope = $scope;
                    // $window.open($state.href('app.load-questions', {quizKey: $window.opener.data.quizKey}), "Test Window", "width=1280,height=890,resizable=0");
                },
                function(response) {
                    $scope.isFormInvalid = true;
                    $scope.alertType = "danger";
                    $scope.alertMsg = response.data.errors;
                    setTimeout(closeAlert, 5000);
                    $window.opener.$windowScope.$emit('from-iframe','TestLimitExceeded');
                });
            }
        }else{
            $scope.error = true;
        }
    }])
    .controller('LoadQuestionsController', ['$scope', '$rootScope', '$window', '$state', '$stateParams', '$cookies', 'LoadQuestionsFactory', 'TestPageFactory', function($scope, $rootScope, $window, $state, $stateParams, $cookies, LoadQuestionsFactory, TestPageFactory) {
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
            $scope.total_duration = 0;
            $scope.total_sections = 0;
            $scope.sectionsDetails = {};
            $cookies.put('testToken', $scope.userDetails.testToken);

            var data = { test_key: $scope.userDetails.test_key, test_user: $scope.userDetails.testUser, show_result_on_completion: $scope.userDetails.show_result_on_completion, 'quiz': $scope.userDetails.quiz_id , 'quizName': $scope.userDetails.quiz_name, 'quizStacks' : $scope.userDetails.quizStacks, 'testToken': $scope.userDetails.testToken , 'details' : {} };
            data['isTestNotCompleted'] = $scope.userDetails.isTestNotCompleted;
            if(data['isTestNotCompleted']){
                data['existingAnswers'] = $scope.userDetails.existingAnswers;
                data['sectionNameWhereLeft'] = "Section#"+$scope.userDetails.sectionNoWhereLeft;
                data['timeRemaining'] = $scope.userDetails.timeRemaining;
            }

            $scope.closeTestWindow = function(){
                $window.close();
            }

            for(var i=0;i<data['quizStacks'].length;i++){
                var stack = data['quizStacks'][i];
                if(allSections.indexOf(data['quizStacks'][i].section_name)===-1){
                    data['details'][stack.section_name] = { 'duration': 0, 'questions' : 0 };
                    allSections.push(stack.section_name);
                }
                $scope.total_questions += parseInt(stack.no_questions);
                $scope.total_duration += parseInt(stack.duration);
                data['details'][stack.section_name]['duration'] += parseInt(stack.duration);
                data['details'][stack.section_name]['questions'] += parseInt(stack.no_questions);
            }
            $scope.total_sections = allSections.length;
            allSections.sort();
            for(var i=0;i<allSections.length;i++){
                $scope.sectionsDetails[allSections[i]] = { 'duration': data['details'][allSections[i]]['duration'], 'questions': data['details'][allSections[i]]['questions'] };
            }
            function loadQuestions(sectionName){
                LoadQuestionsFactory.loadAllQuestions($scope.userDetails.quiz_id, sectionName).query(
                    function(response){
                        TestPageFactory.addQuestionsForSection(sectionName, response.questions);
                        for(var i=1;i<=response.total_questions;i++){
                            $scope.progressValue +=  (i/$scope.total_questions)*100;
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
                                        $state.go('app.start-test', { obj: data});
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
                        $cookies.remove('testToken');
                        $window.close();
                    });
            }
            for(var i=0;i<allSections.length;i++){
                loadQuestions(allSections[i]);
            }
        }else{
            $scope.error = true;
            $cookies.remove('testToken');
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
        var firstItemVisited = false;
        var totalTime = 0;
        var hasAttempted = true;
        var timeCounter = 0;
        if($stateParams.obj.isTestNotCompleted){
            totalTime = parseInt($stateParams.obj.timeRemaining);
        }else{
            totalTime = findTotalDuration($stateParams.obj.quizStacks);
        }
        
        $scope.serverURL = serverURL;
        $scope.progressValuesModel = {};
        $scope.answersModel = {};
        var previousCountForQuestionBeforeSectionChange = 0;
        var bookmarkedQuestions = [];
        var timeSpentOnQuestions = {};

        function getQuestionsBasedOnSection(sectionName){
            try{
                $scope.total_questions = TestPageFactory.getQuestionsForSection(sectionName);
                $scope.sliced_questions = range(0, $scope.total_questions.slice(0,15).length);
                $scope.sliceFactor = 0;
                $scope.slicingLimit = Math.floor($scope.total_questions.length/15);                
                firstItemVisited = false;                
                var existingAnswersKeys = null;
                var existingAnswers = null;
                if($stateParams.obj.isTestNotCompleted){
                    if(hasAttempted){
                        existingAnswers = $stateParams.obj.existingAnswers['answers'].hasOwnProperty[sectionName];
                        if(existingAnswers){
                            existingAnswersKeys = Object.keys(existingAnswers);
                        }else{
                            existingAnswersKeys = [];
                        }
                    }
                }
                for(var i=0;i<$scope.total_questions.length;i++){
                    var qKey = $scope.total_questions[i][i+1].id;
                    if(hasAttempted && existingAnswersKeys.length!=0 && existingAnswersKeys.indexOf(qKey.toString())!=-1){
                        $scope.answersModel[qKey] = { value: existingAnswers[qKey].value  };
                        $scope.progressValuesModel[qKey] = { status: existingAnswers[qKey].status };
                    }else{
                        if($scope.answersModel.hasOwnProperty(qKey)){
                            continue;
                        }else{
                            $scope.answersModel[qKey] = { value:null };
                            $scope.progressValuesModel[qKey] = { status:'NV' };
                            timeSpentOnQuestions[qKey] = { time: totalTime };
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

        $scope.bookmarkQuestion = function(questionID){
            var questionID = parseInt(questionID);
            var isAlreadyBookMarked = bookmarkedQuestions.indexOf(questionID);
            if(isAlreadyBookMarked === -1){
                bookmarkedQuestions.push(questionID);
                $scope.isBookMarked = 1;
            }else{
                bookmarkedQuestions.splice(isAlreadyBookMarked, 1);
                $scope.isBookMarked = -1;
            }
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
                $scope.currentCount = count;
                $scope.currentQuestion = TestPageFactory.getQuestion($scope.selectedSection, count);

                if(isMCQ($scope.currentQuestion.que_type)){
                    $scope.currentOptions = $scope.currentQuestion.options;
                }else{
                    $scope.currentOptions = [];
                }
       
                if($scope.progressValuesModel[$scope.currentQuestion.id].status==='NV'){
                    $scope.progressValuesModel[$scope.currentQuestion.id].status = 'NA';
                    $scope.progressValues = changeProgressValues($scope.progressValuesModel);
                    TestPageFactory.saveProgressValues($scope.selectedSection, $scope.progressValuesModel);
                }
                $scope.isBookMarked = bookmarkedQuestions.indexOf(parseInt($scope.currentQuestion.id));
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
                $scope.parentScope.message = 'Your have submitted the test. Please wait for the result page to load.';
                $scope.parentScope.image = '../images/ellipsis.svg';
                $scope.parentScope.$emit('from-iframe','TestFinished');
                $scope.parentScope.$apply();
                $scope.parentScope.$digest();
                data['time_spent'] = $scope.totalDuration;
                data['time_spent_on_question'] = timeSpentOnQuestions;
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
                        $cookies.remove('testToken');
                    }
                );
            }else{
                data['answer'] = {};
                data['answer'][$scope.currentQuestion.id] = {
                    value: TestPageFactory.getAnswerForQuestion(currentSection, $scope.currentQuestion.id).value, 
                    status: TestPageFactory.getAnswerProgressValue(currentSection, $scope.currentQuestion.id).status,
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
                if($stateParams.obj.hasOwnProperty('existingAnswers') && $stateParams.obj.existingAnswers.hasOwnProperty('answers') && $stateParams.obj.existingAnswers['answers']===null){
                    hasAttempted = false;
                }else{
                    hasAttempted = false;
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
                    if($scope.totalDuration===0){
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



        

    


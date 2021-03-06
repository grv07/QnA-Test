/* global $ */
appmodule
    .controller('IndexController', ['$scope', '$rootScope', '$state', '$window', '$stateParams', '$cookies', 'TestPageFactory', function($scope, $rootScope, $state, $window, $stateParams, $cookies, TestPageFactory) {
        // var timer;
        $scope.openTest = function(){
            $window.$windowScope = $scope;
            $window.data = {quizKey: $stateParams.quizKey};
            var child = $window.open($state.href('app.open-test', {quizKey: $stateParams.quizKey}), "Test Window", "width=1280,height=890,resizable=0");
            // timer = setInterval(checkChild, 500);
            // function checkChild() {
            //     if(child.closed) {
            //         clearInterval(timer);
            //         showStateModal("You have closed the test window.If your test is not submitted the you can restart the test from where you have left.", "closed.png");
            //     }
            // }
        }

        $window.onbeforeunload = function (){
            return "Do not close this window unless test window is closed or never opened.";
        }
        // $scope.message = '';
        // $scope.image = '';
        $scope.$on('from-iframe', function(e, msg) {
            var params = getParamsForStateModal(msg);
            showStateModal(params.message, params.image);
            if(msg === 'TestClosedOnly'){
                $cookies.remove('testToken');
            }
        });

        $scope.showResultPage = function(resultPageURL){
            $cookies.remove('testToken');
            // showStateModal("Click here to get to <a href="+resultPageURL+"><b>result page</b></a>.", "ellipsis.svg");
            $window.location = resultPageURL;
        }

        $scope.closeStateModal = function(){
            // clearInterval(timer);
            angular.element(document.querySelector('#stateModal')).modal('hide');
        }

        $scope.savePartialTestDetails = function(data){
            TestPageFactory.saveResultToDB().save(data).$promise.then(
                function(response){
                    $cookies.remove('testToken');
                    console.log('partial data saved');
                },
                function(response){
                    console.log('partial data not saved');
                    $cookies.remove('testToken');
                }
            );
        }
    }])
    .controller('UserDataController',['$scope', '$rootScope', '$state', '$cookies', '$window', '$stateParams', 'TestUserDataFactory', function($scope, $rootScope, $state, $cookies, $window, $stateParams, TestUserDataFactory) {
        if($window.opener){
            var showAttemptError = 0;
            $scope.error = false;
            TestUserDataFactory.getQuizAccordingToKey($window.opener.data.quizKey).get().$promise.then(
                function(response){
                    $scope.userData = { username:'', email:'', quiz_id: response.id, quiz_name: response.title, test_key: response.quiz_key, show_result_on_completion: response.show_result_on_completion, allow_public_access: response.allow_public_access, quizStacks: undefined, testToken: undefined };
                    // if(response.allow_public_access){
                    var parentScope = $window.opener.$windowScope;
                    parentScope.$emit('from-iframe','TestOpen');
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

            $window.onbeforeunload = function(e) {
                if(!showAttemptError){
                    $rootScope.parentScope.$emit('from-iframe','TestClosedOnly');
                }
            };

            function moveToLoadingState(response){
                $scope.userData['quizStacks'] = response.data;
                $scope.userData['sectionDetails'] = response.section_data; 
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
                    if(response.test.hasOwnProperty('existingAnswers') && response.test.hasOwnProperty('existingSittingID')){
                        $scope.userData['existingAnswers'] = response.test.existingAnswers;
                        $scope.userData['existingSittingID'] = response.test.existingSittingID;
                        $scope.userData['timeRemaining'] = response.test.timeRemaining;
                        $scope.userData['sectionNoWhereLeft'] = response.test.sectionNoWhereLeft;
                        $scope.userData['timeSpentOnQuestions'] = response.test.timeSpentOnQuestions;
                        $scope.userData['bookmarkedQuestions'] = response.test.bookmarkedQuestions;
                    }
                    if(!$scope.userData['isTestNotCompleted']){
                        TestUserDataFactory.getQuizStack($scope.userData.quiz_id, 'all').query(
                            function(response) {
                                moveToLoadingState(response);
                            },
                            function(response) {
                                $scope.unableToGetAllSavedStacks = true;
                                $cookies.remove('testToken');
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
                                        $cookies.remove('testToken');
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
                    showAttemptError = 1;
                    showAlert('alert-danger', response.data.errors);
                    $window.opener.$windowScope.$emit('from-iframe','TestLimitExceeded');
                });
            }
        }else{
            $scope.error = true;
        }
    }])
    .controller('LoadQuestionsController', ['$scope', '$rootScope', '$window', '$state', '$stateParams', '$cookies', 'LoadQuestionsFactory', 'TestPageFactory', function($scope, $rootScope, $window, $state, $stateParams, $cookies, LoadQuestionsFactory, TestPageFactory) {
        if($scope.userDetails){
            $scope.closeTestWindow = function(){
                $window.close();
            }            
            $scope.error = false;
            var parentScope = $scope.parentScope;
            $window.onbeforeunload = function(e) {
                parentScope.$emit('from-iframe','TestClosedOnly');
            };
            parentScope.$emit('from-iframe','TestLoading');
            $scope.progressValue = 0;
            $scope.sectionsDetails = {};
            $cookies.put('testToken', $scope.userDetails.testToken);
            var result = processLoadedData($scope.userDetails);
            var data = result.data;
            $scope.total_questions = result.total_questions;
            $scope.total_duration = result.data.total_duration;
            $scope.total_sections = result.total_sections;
            var allSections = result.allSections;
            var progressFactor = (100/$scope.total_sections)|0;
            function loadQuestions(sectionName){
                LoadQuestionsFactory.loadAllQuestions($scope.userDetails.quiz_id, sectionName).query(
                    function(response){
                        TestPageFactory.addQuestionsForSection(sectionName, response.questions);
                        $scope.progressValue += (progressFactor|0);
                        if($scope.progressValue>99){
                            parentScope.$emit('from-iframe','TestLoaded');
                            $scope.startTest = function(){
                                if(!$scope.userDetails.existingSittingID){
                                    parentScope.$emit('from-iframe','TestStarted');
                                    LoadQuestionsFactory.saveSittingUser().save({ test_user: data.test_user, quiz_id: data.quiz, existingSittingID: data.existingSittingID, toPost: false }).$promise.then(
                                        function(response){
                                            data['sitting'] = response.sitting;
                                            $state.go('app.start-test', { obj: data});
                                        }, 
                                        function(response){
                                            alert('Error in getting test details.');
                                            $cookies.remove('testToken');
                                            $window.close();
                                        });
                                }else{
                                    $state.go('app.start-test', { obj: data});

                                }
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
                $scope.sectionsDetails[allSections[i]] = { 'duration': data['details'][allSections[i]]['duration'], 'questions': data['details'][allSections[i]]['questions'], 'subcategory_name': data.sectionDetails[allSections[i]] };
                loadQuestions(allSections[i]);
            }
        }else{
            $scope.error = true;
            $cookies.remove('testToken');
        }          
    }])
    .controller('TestPageHeaderController', ['$scope', '$controller', '$window', '$stateParams', function($scope, $controller, $window, $stateParams) {
            if(isNotEmpty($stateParams.obj)){
                $scope.quizName = $stateParams.obj.quizName;
                $scope.dataPresent = true;      
            }
            else{
                $scope.dataPresent = false;
            }   
        }])
    .controller('TestPageController', ['$scope', '$controller', '$cookies', '$window', '$interval', '$stateParams', '$state', '$timeout', 'TestPageFactory', function($scope, $controller, $cookies, $window, $interval, $stateParams, $state, $timeout, TestPageFactory) {
        var firstQuestionVisited = false;
        // hasAttempted means that he/she has spent 5 seconds or more without answering any question or have answered any question(s).
        var hasAttempted = true;
        var timeRemaining = 0;
        // var timeCounter = 0;
        var showReportPageStatus = 0;
        var partialTestData = {};
        var existingAnswers = undefined;
        var existingbookmarkQuestions = undefined;
        var existingTimeSpentOnQuestions = undefined;
        var totalTime = $stateParams.obj.total_duration; // Used for time calculation per question - different from timer time.
        var selectedSectionNames = {};
        
        $window.onbeforeunload = function(e) {
            if(showReportPageStatus === 0){
                $scope.parentScope.$emit('from-iframe','TestClosed');
                $scope.submitTestDetails(false, $scope.selectedSection);
                $scope.parentScope.savePartialTestDetails(partialTestData);
            }else if(showReportPageStatus === -1){
                $scope.parentScope.$emit('from-iframe','TestFinishedNoReport');
            }else{
                $scope.parentScope.closeStateModal();
            }
        };
        
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
                for(var i=0;i<$scope.total_questions.length;i++){
                    var q = $scope.total_questions[i][i+1];
                    var qKey = q.id;
                    if($scope.answersModel.hasOwnProperty(qKey)){
                        break;
                    }else{
                        $scope.progressValuesModel[qKey] = { status:progressTypes[1] };
                        $scope.answersModel[qKey] = { value:null };
                        timeSpentOnQuestions[qKey] = { time: 0 };
                        if(q.que_type === qTypes[2]){
                            $scope.answersModel[qKey]['comprehension_questions'] = {};
                            $scope.answersModel[qKey]['heading'] = q.heading;
                            for(var j=0;j<q.comprehension_questions.length;j++){
                                var qComprehsionID = q.comprehension_questions[j][j+1].id;
                                $scope.answersModel[qKey]['comprehension_questions'][qComprehsionID] = { value:null };
                                $scope.comprehensionAnswersModel[qComprehsionID] = { value:null };
                            }                        
                        }
                    }
                }
                // TestPageFactory.saveSectionQuestionAnswers(sectionName, $scope.answersModel);
                // TestPageFactory.saveProgressValues(sectionName, $scope.progressValuesModel);
                if($stateParams.obj.isTestNotCompleted){
                    $scope.progressValues = changeProgressValues($scope.progressValuesModel);
                }
                // console.log(bookmarkedQuestions,'bookmarkedQuestions');
                // console.log(timeSpentOnQuestions,'timeSpentOnQuestions')
                $scope.changeQuestion(1, undefined);
            }catch(err){
                console.log(err,'------------');

            }
        }

        $scope.openWarningModal = function(action, counter){
            $scope.action = action;
            switch(action){
                case "sectionChangeRequestInitiated":
                    toggleWarningModal('show', '<b>Do you really want to change the section?</b>', 'Yes I am sure.');
                    $scope.counter = counter;
                    break;
                case "sectionChangeRequestCancelled":
                    toggleWarningModal('hide', '', '');
                    $scope.selectedSection = $scope.currentSection;
                    delete $scope.counter;
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

        $scope.changeSection = function(currentSection, counter){
            $scope.nextSection = $scope.selectedSection;
            var index = $scope.sectionNames.indexOf($scope.selectedSection);
            if(index<$scope.sectionNames.length){
                if($scope.currentSection === $scope.nextSection){
                    $scope.selectedSection = $scope.sectionNames[index+counter];
                }else{
                    $scope.selectedSection = $scope.sectionNames[$scope.sectionNames.indexOf($scope.nextSection)];
                }
                // $scope.sectionNames.splice($scope.sectionNames.indexOf($scope.currentSection), 1);
                addQuestions($scope.selectedSection);
                index = $scope.sectionNames.indexOf($scope.selectedSection);
                if(index===$scope.sectionNames.length-1){
                    $scope.hideNextSectionButton = true;
                }
                else{
                    $scope.hideNextSectionButton = false;
                }
                if(index===0){
                    $scope.hidePreviousSectionButton = true;
                }
                else{
                    $scope.hidePreviousSectionButton = false;
                }
                $scope.currentSection = $scope.selectedSection;                
            }
            else{
                $scope.hideNextSectionButton = true;
            }
            $scope.selectedSectionName = selectedSectionNames[$scope.selectedSection];
            firstQuestionVisited = false;
        }

        $scope.bookmarkQuestion = function(questionID, que_type){
            var questionID = parseInt(questionID);
            var isAlreadyBookMarked = bookmarkedQuestions[que_type].indexOf(questionID);
            // console.log(isAlreadyBookMarked,'isAlreadyBookMarked');
            if(isAlreadyBookMarked === -1){
                bookmarkedQuestions[que_type].push(questionID);
                $scope.isBookMarked[que_type] = 1;
            }else{
                bookmarkedQuestions[que_type].splice(isAlreadyBookMarked, 1);
                $scope.isBookMarked[que_type] = -1;
            }

        }

        function saveTimeSpentOnQuestion(section, previousCount){
            if($scope.totalDuration>=0){
                var remainingTimeSpent = 0;
                var previousQuestion = TestPageFactory.getQuestion(section, previousCount);
                var recordedTime = timeSpentOnQuestions[previousQuestion.id]['time'];
                if(recordedTime === 0){
                    recordedTime = totalTime - $scope.totalDuration;
                }else{
                    recordedTime += totalTime - $scope.totalDuration;
                }
                for(var q in timeSpentOnQuestions){
                    if(timeSpentOnQuestions[q]['time'] != 0){
                        remainingTimeSpent += timeSpentOnQuestions[q]['time'];
                    }
                }
                timeSpentOnQuestions[previousQuestion.id]['time'] = recordedTime - remainingTimeSpent;
                // console.log(timeSpentOnQuestions[previousQuestion.id]['time'], previousQuestion.id, section, previousCount);
                // postTimePerQuestion(timeSpentOnQuestions[previousQuestion.id]['time'], previousQuestion.id);
            }
        }

        $scope.changeQuestion = function(count, previousCount){
            if(count>=1 && count<=$scope.total_questions.length)
            {
                previousCountForQuestionBeforeSectionChange = count;
                if(previousCount!=undefined){
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
                    $scope.instruction = setInstruction($scope.currentQuestion.problem_type);
                }
                else if(($scope.currentQuestion.que_type === qTypes[1])){
                    $scope.currentOptions = [];
                }else{
                    $scope.isComprehension = true;
                    $scope.instruction = 'Read the given passage and answer the questions that follow:';
                    comprehensionQuestions = $scope.currentQuestion.comprehension_questions;
                    $scope.comprehensionQuestionsLimit = comprehensionQuestions.length - 1;
                    $scope.changeComprehensionQuestion(0);
                }       
                if($scope.progressValuesModel[$scope.currentQuestion.id].status === progressTypes[1]){
                    $scope.progressValuesModel[$scope.currentQuestion.id].status = progressTypes[0];
                    $scope.progressValues = changeProgressValues($scope.progressValuesModel);
                    // TestPageFactory.saveProgressValues($scope.selectedSection, $scope.progressValuesModel);
                }
                $scope.isBookMarked[qTypes[0]] = bookmarkedQuestions[qTypes[0]].indexOf(parseInt($scope.currentQuestion.id));
                // console.log(bookmarkedQuestions[qTypes[0]].indexOf(parseInt($scope.currentQuestion.id)));
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
            if($scope.currentQuestion.que_type === qTypes[2]){
                if($scope.progressValuesModel[$scope.currentQuestion.id].status === progressTypes[0]){
                    $scope.progressValuesModel[$scope.currentQuestion.id].status = progressTypes[2];
                }
            }else{
                if(!firstQuestionVisited){
                    if($stateParams.obj.isTestNotCompleted){
                        $scope.progressValuesModel[$scope.currentQuestion.id].status = progressTypes[2];
                    }
                    firstQuestionVisited = true;
                }else{
                    if($scope.progressValuesModel[$scope.currentQuestion.id].status === progressTypes[0]){
                        $scope.progressValuesModel[$scope.currentQuestion.id].status = progressTypes[2];
                    }
                }
            }
        }

        // Watch for a change in answersModel
        $scope.$watch(function() {
           return $scope.answersModel;
         },                       
          function(newVal, oldVal) {
            if(newVal!=oldVal && $scope.currentQuestion.que_type === qTypes[0]){
                try{ 
                    if($scope.currentCount > 1 || ($scope.currentCount > 1 && $scope.currentQuestion.que_type === qTypes[0])){
                        if($scope.progressValuesModel[$scope.currentQuestion.id].status === progressTypes[1]){
                            $scope.progressValuesModel[$scope.currentQuestion.id].status = progressTypes[0];
                        }
                        else if($scope.progressValuesModel[$scope.currentQuestion.id].status === progressTypes[0]){
                            $scope.progressValuesModel[$scope.currentQuestion.id].status = progressTypes[2];
                        }
                    }else if($scope.currentCount === 1){
                        if($scope.answersModel[$scope.currentQuestion.id].value){
                            firstQuestionVisited = true;
                        }
                        markQuestionVisited();
                    }
                    $scope.progressValues = changeProgressValues($scope.progressValuesModel);
                }catch(err){}
            }
        }, true);

        // Watch for a change in comprehensionAnswersModel
        $scope.$watch(function() {
           return $scope.comprehensionAnswersModel;
         },                       
          function(newVal, oldVal) {
            try{ 
                if(newVal!=oldVal && $scope.currentQuestion.que_type === qTypes[2]){
                    markQuestionVisited();
                    $scope.progressValues = changeProgressValues($scope.progressValuesModel);
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

        $scope.submitTestDetails = function(isNormalSubmission, currentSection){
            saveTimeSpentOnQuestion($scope.selectedSection, $scope.currentCount);
            var data = { test_user: $stateParams.obj.test_user, test_key: $stateParams.obj.test_key};
            data['test_data'] = {
                'time_remaining': $scope.totalDuration,
                'time_spent_on_questions': timeSpentOnQuestions,
                'answers': $scope.answersModel,
                'comprehension_answers': $scope.comprehensionAnswersModel,
                'is_normal_submission': isNormalSubmission,
                'sitting': $stateParams.obj.sitting,
                'toPost': false,
            };
            if(isNormalSubmission){
                // Save bookmarks
                postBookMarks({'bookmarked_questions': bookmarkedQuestions, test_user: data['test_user']});
                // $scope.parentScope from $rootScope (set in LoadQuestionsController)
                $scope.parentScope.$emit('from-iframe','TestFinished');
                TestPageFactory.saveResultToDB().save(data).$promise.then(
                    function(response){
                        alert("You have completed your test successfully.");
                        if($stateParams.obj.show_result_on_completion){
                            showReportPageStatus = parseInt(response.attempt_no);
                            $scope.parentScope.closeStateModal();
                            $scope.parentScope.showResultPage(testURL+'#/view/report/'+$stateParams.obj.test_user+'/'+$stateParams.obj.test_key+'/'+response.attempt_no);
                        }else{
                            showReportPageStatus = -1;
                        }
                        $cookies.remove('testToken');
                        $window.close();
                    },
                    function(response){
                        alert('Error in submitting test!');
                        // $cookies.remove('testToken');
                    }
                );
                // console.log(data);
            }else{
                data['test_data']['section_no'] = currentSection.split('#')[1];
                data['test_data']['bookmarked_questions'] = bookmarkedQuestions;
                partialTestData = data;
            }
        }

        function updateTimeRemaining(timeData){
            // TestPageFactory.saveTimeRemainingToCache(timeData).then(
            //     function(response){
            //         console.log('time updated');
            //     }
            // );
        }

        // function postTimePerQuestion(qTimeValue, questionID){
        //     // var data = { 'test_user': $stateParams.obj.test_user, 'test_key': $stateParams.obj.test_key, 'qtime_spent':{}};
        //     // data['qtime_spent'][questionID.toString()] = qTimeValue;
        //     // TestPageFactory.saveTimePerQuestionToCache(data).then(
        //     //     function(response){
        //     //         console.log('time per question updated');
        //     //     }
        //     // );
        // }

        function fillUncompletedTestDataWithPartialData(sectionsList){
            for(var i=0;i<sectionsList.length;i++){
                var total_questions = TestPageFactory.getQuestionsForSection(sectionsList[i]);
                for(var j=0;j<total_questions.length;j++){
                    var q = total_questions[j][j+1];
                    var qKey = q.id;
                    if(existingAnswers && existingAnswers.hasOwnProperty(qKey)){
                        $scope.answersModel[qKey] = { value:null };
                        $scope.progressValuesModel[qKey] = { status:progressTypes[1] };
                        if(existingTimeSpentOnQuestions && existingTimeSpentOnQuestions.hasOwnProperty(qKey)){
                            timeSpentOnQuestions[qKey] = existingTimeSpentOnQuestions[qKey];
                            if(existingTimeSpentOnQuestions[qKey]['time'] === 0){
                                continue;
                            }else{
                                $scope.progressValuesModel[qKey] = { status:progressTypes[0] };
                            }
                        }else{
                            timeSpentOnQuestions[qKey] = { time: 0 };
                        }
                        if(existingbookmarkQuestions && existingbookmarkQuestions[qTypes[0]].indexOf(qKey) != -1){
                            bookmarkedQuestions[qTypes[0]].push(parseInt(qKey));
                        }
                        if(existingAnswers[qKey].hasOwnProperty('heading') && existingAnswers[qKey].hasOwnProperty('comprehension_questions')){
                            $scope.answersModel[qKey]['heading'] = q.heading;
                            $scope.answersModel[qKey]['comprehension_questions'] = existingAnswers[qKey]['comprehension_questions'];
                            for(var cq_id in $scope.answersModel[qKey]['comprehension_questions']){
                                $scope.comprehensionAnswersModel[cq_id] = $scope.answersModel[qKey]['comprehension_questions'][cq_id];
                                if($scope.comprehensionAnswersModel[cq_id].value != null && $scope.progressValuesModel[qKey].status != progressTypes[2]){
                                    $scope.progressValuesModel[qKey] = { status:progressTypes[2] };
                                }
                                if(existingbookmarkQuestions && existingbookmarkQuestions[qTypes[2]].indexOf(cq_id)!=-1){
                                    bookmarkedQuestions[qTypes[2]].push(parseInt(cq_id));
                                }
                            }

                        }else{
                            if(existingAnswers[qKey].value!=null){
                                $scope.answersModel[qKey] = existingAnswers[qKey];
                                $scope.progressValuesModel[qKey] = { status:progressTypes[2] };
                            }
                        }                          
                    }
                }
            }
        }

        try{
            if(isNotEmpty($stateParams.obj)){
                // if($stateParams.obj.hasOwnProperty('existingAnswers') && $stateParams.obj.existingAnswers.hasOwnProperty('answers'))
                // {
                //     if($stateParams.obj.existingAnswers['answers']===null){
                //         hasAttempted = false;
                //     }else{
                //         hasAttempted = true;
                //     }
                // }
                $scope.quiz = $stateParams.obj.quiz;
                $scope.sectionNames = Object.keys($stateParams.obj.details).sort();
                $scope.timeLeftWarningMsg = false;
                selectedSectionNames = $stateParams.obj.sectionDetails;

                if(!$stateParams.obj.isTestNotCompleted){
                    $scope.selectedSection = $scope.sectionNames[0];
                    timeRemaining = findTotalDuration($stateParams.obj.details);
                }
                else{
                    $scope.selectedSection = $stateParams.obj.sectionNameWhereLeft;
                    timeRemaining = $stateParams.obj.timeRemaining;
                    // totalTime = timeRemaining;
                    existingAnswers = $stateParams.obj.existingAnswers;
                    existingbookmarkQuestions = $stateParams.obj.existingbookmarkedQuestions;
                    existingTimeSpentOnQuestions = $stateParams.obj.existingTimeSpentOnQuestions;
                    fillUncompletedTestDataWithPartialData($scope.sectionNames);
                }
                if($scope.sectionNames.length<=1){
                    $scope.hideNextSectionButton = true;
                    $scope.hidePreviousSectionButton = true;
                }else{
                    if($scope.sectionNames.indexOf($scope.selectedSection)>0){
                        $scope.hidePreviousSectionButton = false;
                    }else{
                        $scope.hidePreviousSectionButton = true;
                    }
                }
                $scope.selectedSectionName = selectedSectionNames[$scope.selectedSection];
                $scope.currentSection = $scope.selectedSection;
                addQuestions($scope.selectedSection);
                $scope.totalDuration = timeRemaining;
                // updateTimeRemaining({'test_user': $stateParams.obj.test_user, 'test_key': $stateParams.obj.test_key, 'remaining_duration': $scope.totalDuration, 'section_name': $scope.selectedSection });

                $interval(function(){
                    if($scope.totalDuration>0){
                        $scope.totalDuration -= 1;
                        if ($scope.totalDuration === 30){ // replace 30 by 600 for 10 minutes
                            $scope.timeLeftWarningMsg = '30 seconds are';
                            $timeout(function() {
                                $scope.timeLeftWarningMsg = false;
                            }, 10000);
                        }
                        // timeCounter += 1;
                        // if(timeCounter % 5 === 0){
                        //     updateTimeRemaining({'test_user': $stateParams.obj.test_user, 'test_key': $stateParams.obj.test_key, 'remaining_duration': $scope.totalDuration, 'section_name': $scope.selectedSection });
                        // }
                        else if($scope.totalDuration === 0){
                            alert('Time Over');
                            $scope.submitTestDetails(true, $scope.currentSection);
                        }
                    }else{
                        $scope.submitTestDetails(true, $scope.currentSection);
                    }
                },1000, timeRemaining);
                $scope.dataPresent = true;
            }else{
                $scope.dataPresent = false;
            }
        }catch(e){
            $scope.dataPresent = false;
            console.log(e);
        }
    }]);



        

    


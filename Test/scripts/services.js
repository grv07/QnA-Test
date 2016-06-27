/* global $ */
appmodule
  .service('TestUserDataFactory', ['$resource', function($resource) {
    
    this.getQuizAccordingToKey = function(quizKey){
      return $resource(serverURL+"quiz/get/key/", { quiz_key: quizKey },
        {
          get: {
          method : 'GET',
          isArray : false,
          }
        },
        { stripTrailingSlashes: false }
        );
    }
    this.saveTestUser = function(){
      return $resource(serverURL+"user/data/", null,
          {'save':  
            { method:'POST',} 
          },
          { stripTrailingSlashes: false }
          );
    };
    this.getTestUser = function(testUserID, token){
      return $resource(serverURL+"user/data/", { test_user_id: testUserID, token: token },
          {'get':  
            { method:'GET',} 
          },
          { stripTrailingSlashes: false }
          );
    };
    // function to fetch either all quiz stacks or with a specifid id.
    this.getQuizStack = function(quizId, quizStackId){
      return $resource(serverURL+"stack/get/"+quizId+"/"+quizStackId+"/", null,
      {
          query: {
          // headers: {'Authorization': 'JWT ' + token},
          method : 'GET',
          isArray : false,
          }
      },
      { stripTrailingSlashes: false }
      );
    };

    // Actually a POST call
    this.getQuizStackForUncompleteTest = function(){
      return $resource(serverURL+"stack/get/uncompletetest/", null,
      {
          save: {
          // headers: {'Authorization': 'JWT ' + token},
          method : 'POST',
          isArray : true,
          }
      },
      { stripTrailingSlashes: false }
      );
    }    
  }])
  .service('LoadQuestionsFactory', ['$resource', function($resource) {
    this.loadAllQuestions = function(quizid, sectionName){
      return $resource(serverURL+"stack/get/questions/"+quizid+"/", { sectionName: sectionName},
          {
              query: {
              // headers: {'Authorization': 'JWT ' + token},
              method : 'GET',
              isArray : false,
              }
          },
          { stripTrailingSlashes: false }
          );
    }
    this.saveSittingUser = function(extraData){
      return $resource(serverURL+"save/sitting/user/", extraData,
        {
            save: {
            // headers: {'Authorization': 'JWT ' + token},
            method : 'POST',
            isArray : false,
            }
        },
        { stripTrailingSlashes: false }
      );
    } 

  }])
  .service('TestPageFactory', ['$resource', '$http', '$q', function($resource, $http, $q) {
        var allQuestions = {};
        var progressData = {};
        var data = {};
        var allQuestionsIds = [];

        this.addQuestionsForSection = function(sectionName, data){
            allQuestions[sectionName] = data;
            return data;
        }
        this.getAllQuestionsForAllSection = function(sectionName){
            return allQuestions;
        }
        this.getAnswersForSection = function(sectionName){
            return data[sectionName];
        }
        this.getQuestionsForSection = function(sectionName){
            return allQuestions[sectionName];
        }
        this.getAnswerForQuestion = function(sectionName, questionId){
            return data[sectionName][questionId];
        }
        this.getQuestion = function(sectionName, count){
            return allQuestions[sectionName][count-1][count];
        }
        this.saveOrChangeAnswer = function(sectionName, count, answerid, value){
           var data = allQuestions[sectionName][count-1][count]['options'];
           for(i=0;i<data.length;i++){
            if(data[i].id===answerid){
                data[i].isSelected = value;
            }else{
                data[i].isSelected = false;
            }
           }
        }
        // Save all questions answered with section name as key including progress values
        // this.changeAnswerFormat = function(sectionName, answer, progressValue){
        //     result = {};
        //     result[sectionName] = { answers : {} };
        //     for(var question_id in progressValues){
        //         result[sectionName]['answers'][question_id] = { status: progressValues[question_id]['status']  , value: answers[question_id]['value']};
        //     }
        //     return result[sectionName];
        // }

        // Save section-wise questions-answers
        this.saveSectionQuestionAnswers = function(sectionName, answers){
            data[sectionName] = answers;
        }

        this.saveProgressValues = function(sectionName, data){
            progressData[sectionName] = data;
        }
        this.getProgressValues = function(){
            return progressData;
        }
        this.getProgressValuesSectionWise = function(sectionName){
            return progressData[sectionName];
        }
        this.getAnswerProgressValue = function(sectionName, questionId){
            return progressData[sectionName][questionId];
        }

        // Send the answers to server on answering the question
        // this.postTestDetails = function(isSaveToDB, testUser, quizId, sectionName){
        //     return $resource(serverURL+"save/test/", { 'is_save_to_db': isSaveToDB  ,'test_key': testUser, 'quiz_id': quizId, 'section_name': sectionName },
        //         {'save':   
        //         { method:'POST', 
        //         } 
        //         },
        //         { stripTrailingSlashes: false }
        //         );
        // };

        this.saveResultToCache = function(data){
            var deferred = $q.defer();
            $http.post(serverURL+"save/test/cache/", data).then(function (response) {
              deferred.resolve(response.data);
            });
            return deferred.promise;
        }

        this.saveResultToDB = function(extraData){
          return $resource(serverURL+"save/test/db/", extraData,
            {
              save: {
              method : 'POST',
              }
            },
            { stripTrailingSlashes: false }
            );
        }

        this.saveTimeRemainingToCache = function(data){
          var deferred = $q.defer();
          $http.post(serverURL+"save/time/remaining/", data).then(function (response) {
            deferred.resolve(response.data);
          });
          return deferred.promise;
        }

        this.saveBookMarks = function(data){
          return $resource(serverURL+"save/test/bookmarks/", null,
            {
              save: {
              method : 'POST',
              }
            },
            { stripTrailingSlashes: false }
            );
        }

        this.saveTimePerQuestionToCache = function(data){
          var deferred = $q.defer();
          $http.post(serverURL+"save/question/time/", data).then(function (response) {
            deferred.resolve(response.data);
          });
          return deferred.promise;
        }

  }])
  .service('ReportFactory', ['$resource', function($resource) {
    this.getReportDetails = function(testUserID, quizKey, attemptNo){
      return $resource(serverURL+"user/result/"+testUserID+"/"+quizKey+"/"+attemptNo+"/", null,
        {
          get: {
          method : 'GET',
          isArray : false,
          }
        },
        { stripTrailingSlashes: false }
        );
    }

    this.getQuestionStats = function(sittingID, count, allQuestionIds){
      return $resource(serverURL+"question/stats/"+sittingID+"/", null,
        {
          get: {
          method : 'POST',
          isArray : false,
          }
        },
        { stripTrailingSlashes: false }
        );
    }
  }]);

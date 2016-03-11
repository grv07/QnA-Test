/* global $ */
appmodule
  .service('testUserDataFactory', ['$resource', function($resource) {
    this.saveTestUser = function(key){
          return $resource(serverURL+"user/data/", null,
                  {'save':  
                  { method:'POST', 
                  } 
                  },
                  { stripTrailingSlashes: false }
                  );
      };      
  }])
  .service('LoadQuestionsFactory', ['$resource', function($resource) {
    // function to fetch either all quiz stacks or with a specifid id.
    this.getQuizStack = function(quizid, quizstackid){
      return $resource(serverURL+"stack/get/"+quizid+"/"+quizstackid+"/", null,
      {
          query: {
          // headers: {'Authorization': 'JWT ' + token},
          method : 'GET',
          isArray : true,
          }
      },
      { stripTrailingSlashes: false }
      );
    };
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
  }])
  .service('TestPageFactory', ['$resource', function($resource) {
        var allQuestions = {}
        var progressData = {}
        var data = {};
        this.addQuestionsForSection = function(sectionName, data){
            allQuestions[sectionName] = data;
            return data;
        }
        this.getAnswersForSection = function(sectionName){
            return data[sectionName];
        }
        this.getQuestionsForASection = function(sectionName){
            return allQuestions[sectionName];
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
        this.getAQuestion = function(sectionName, count){
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
        this.saveQuestionsAnsweredSectionWise = function(sectionName, answers, progressValues){
            result = {};
            result[sectionName] = { answers : {} };
            for(var question_id in progressValues){
                result[sectionName]['answers'][question_id] = { status: progressValues[question_id]['status']  , value: answers[question_id]['value']};
            }
            console.log(result[sectionName]);
            return result[sectionName];
        }

        // Save section-wise questions-answers
        this.saveSectionQuestion = function(sectionName, answers){
            data[sectionName] = answers;
        }

        this.addQuizData = function(quizid){
            data['quiz'] = quizid;
        }

        // Send the answers to server on answering the question
        this.postTestDetails = function(isSaveToDB, testUser, quizId, sectionName){
            return $resource(serverURL+"save/test/", { 'is_save_to_db': isSaveToDB  ,'test_key': testUser, 'quiz_id': quizId, 'section_name': sectionName },
                {'save':   
                { method:'POST', 
                } 
                },
                { stripTrailingSlashes: false }
                );
        };

        this.getAQuestion = function(sectionName, count){
            return allQuestions[sectionName][count-1][count];
        }
  }]);

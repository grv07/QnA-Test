/* global $ */
appmodule
    .controller('ViewReportContoller', ['$scope', '$stateParams', '$state', '$window', 'ReportFactory', function($scope, $stateParams, $state, $window, ReportFactory) {
    	$window.onbeforeunload = function (){};
    	$scope.error = false;
    	var sittingID = 0;
    	ReportFactory.getReportDetails($stateParams.testUserID, $stateParams.quizKey, $stateParams.attemptNo).get().$promise.then(
            function(response){
            sittingID = response.sitting_id;

        	CanvasJS.addColorSet("colors",
	            [
	            "#3EA0DD",
	            "#EC5657",
	            "#FFFF00",
	            "#B08BEB",
	            "#3EA0DD",
	            "#F5A52A",
	            "#FAA586",
	            "#EB8CC6",
	            "#2F4F4F",
	            "#2E8B57",
	            "#90EE90",
	        ]);
        	var dataPoints1 = [
			{
				type: "stackedColumn100",
	            name: "Correct",
	            showInLegend: "true",
	            dataPoints: []
			},
			{
				type: "stackedColumn100",
	            name: "Incorrect",
	            showInLegend: "true",
	            dataPoints: []
			},
			{
				type: "stackedColumn100",
	            name: "Unattempted",
	            showInLegend: "true",
	            dataPoints: []
			}];
			
			for(var key in response.analysis.section_wise_results){
				for(i=0;i<=2;i++){	
			    	dataPoints1[i].dataPoints.push(response.analysis.section_wise_results[key][i]);
				}
			}
			createStackedBar100Chart("sectionWiseBarGraphContainer", "colors", "", "Sections", "%age of questions", dataPoints1);

			dataPoints1 = [
			{
				type: "stackedColumn100",
	            name: "Correct",
	            showInLegend: "true",
	            dataPoints: []
			},
			{
				type: "stackedColumn100",
	            name: "Incorrect",
	            showInLegend: "true",
	            dataPoints: []
			},
			{
				type: "stackedColumn100",
	            name: "Unattempted",
	            showInLegend: "true",
	            dataPoints: []
			}];

			for (var key in response.analysis.filter_by_category) {	
				dataPoints1[0].dataPoints.push({ y: response.analysis.filter_by_category[key][1], label: key });
				dataPoints1[1].dataPoints.push({ y: response.analysis.filter_by_category[key][0], label: key });
		    	dataPoints1[2].dataPoints.push({ y: response.analysis.filter_by_category[key][2], label: key });
			}
			createStackedBar100Chart("categoryWiseBarGraphContainer", "colors", "", "Categories", "%age of questions", dataPoints1);

			dataPoints1 = []
			var dataPoints2 = []
			var dataPoints3 = []
			var no_of_questions = 0;
			var value = 0;
			for(var key in response.questions_stats){
				no_of_questions += 1;
				dataPoints1.push({ x: no_of_questions , y: response.questions_stats[key]['ideal_time'] });
				if(response.analysis.question_vs_time_result_topper.hasOwnProperty(key))
				{
					value = response.analysis.question_vs_time_result_topper[key];
					if(value.length>1)
						dataPoints2.push({ x: no_of_questions , y: value[1] });
					else
						dataPoints2.push({ x: no_of_questions , y: value });	
				}
				if(response.analysis.hasOwnProperty('question_vs_time_result_user') && response.analysis.question_vs_time_result_user.hasOwnProperty(key))
				{
					value = response.analysis.question_vs_time_result_user[key];
					if(value.length>1)
						dataPoints3.push({ x: no_of_questions , y: value[1] });
					else
						dataPoints3.push({ x: no_of_questions , y: value });
				}
			}
			createSplineChart("timeWiseSplineContainer", "", dataPoints1, dataPoints2, dataPoints3);

			delete response.analysis;
			$scope.data = response;
			$scope.downloadAsPDF = function(){
				downloadAsPDF('report', 'report');
			}
            },
            function(response){            	
            	$scope.error = true;
                alert("Error in retrieving report details!");                   
            });

    	$scope.goToQuestionsStats = function(){
    		$state.go('questionStats', { sittingID: sittingID  });
    	}
    }])
	.controller('QuestionsStatsContoller', ['$scope', '$stateParams', '$state', 'ReportFactory', function($scope, $stateParams, $state, ReportFactory) {
		var count = 0;	
		$scope.stop = false;
		var allQuestionIds = [];
		var allQuestions = undefined;
		$scope.questionStats = { mcq: [], comprehension: [] };
		function getQuestionsStats(count){
			ReportFactory.getQuestionStats($stateParams.sittingID).get({ count: count, allQuestionIds: allQuestionIds, allQuestions: allQuestions }).$promise.then(
	            function(response){
	            	if(allQuestions===undefined){
	            		allQuestions = response.allQuestions;
	            	}
	            	allQuestionIds = response.allQuestionIds;
	            	for(var i=0;i<response.questionStats[qTypes[0]].length;i++){
	            		$scope.questionStats[qTypes[0]].push(response.questionStats[qTypes[0]][i]);
	            	}
	            	if(response.questionStats[qTypes[2]].length!=0){
	            		for(var i=0;i<response.questionStats[qTypes[2]].length;i++){
	            			$scope.questionStats[qTypes[2]].push(response.questionStats[qTypes[2]][i]);
	            		}
	            	}            	
	            	$scope.stop = response.stop;
	            	$("#loader").css('display', 'none');
	            	if(response.stop){
	            		delete allQuestionIds;
	            		delete allQuestions;
	            		delete count;
	            	}
	            },
	            function(response){
	            	alert("Error in retrieving questions statistics.");
	        });
		}

		getQuestionsStats(count);
		$scope.loadMoreQuestions = function(){
			$("#loader").css('display', 'block');
			count += 1;
			getQuestionsStats(count);
		}
	}]);
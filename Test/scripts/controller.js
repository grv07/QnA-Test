/* global $ */
appmodule
    .controller('ViewReportContoller', ['$scope', '$stateParams', '$state', 'ReportFactory', function($scope, $stateParams, $state, ReportFactory) {
    	$scope.error = false;
    	var questionIds = [];
    	ReportFactory.getReportDetails($stateParams.testUserID, $stateParams.quizKey, $stateParams.attemptNo).get().$promise.then(
            function(response){
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
			questionIds = Object.keys(response.questions_stats);
			// $scope.questionsStats = [];
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
					if(value.length>1){
						dataPoints3.push({ x: no_of_questions , y: value[1] });
						// if(response.questions_stats[key]['correct_answer_id']===value[0]){
						// 	status = 'Correct';
						// }else{
						// 	status = 'Incorrect';
						// }
					}
					else{
						dataPoints3.push({ x: no_of_questions , y: value });
						// status = 'Unattempted';
					}
				}
			}
			createSplineChart("timeWiseSplineContainer", "", dataPoints1, dataPoints2, dataPoints3);

			delete response.analysis;
			$scope.data = response;
            },
            function(response){            	
            	$scope.error = true;
                alert("Error in retrieving report details!");                   
            });

    	$scope.goToQuestionsStats = function(){
    		$state.go('questionStats', { obj: questionIds });
    	}
    }])
	.controller('QuestionsStatsContoller', ['$scope', '$stateParams', '$state', 'ReportFactory', function($scope, $stateParams, $state, ReportFactory) {
		if($stateParams.obj===null){
			$scope.error = true;
		}else{
			$scope.error = false;
		}
	}]);
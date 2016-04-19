/* global $ */
appmodule
    .controller('ViewReportContoller', ['$scope', '$stateParams', 'ReportFactory', function($scope, $stateParams, ReportFactory) {
    	$scope.error = false;

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
        	CanvasJS.addColorSet("NoItemColor",
	            [
	            "#BDBDBD",
	            ]);
        	$scope.data = response;
        	if(response.section_wise_result_correct.length!=0){
        		createPieChart("sectionWiseCorrectContainer", "colors", "Correct", response.section_wise_result_correct);
			}else{
				createPieChart("sectionWiseCorrectContainer", "NoItemColor", "Correct",  [ {'y':1, 'indexLabel':"No value"} ]);
			}

			if(response.section_wise_result_incorrect.length!=0){
        		createPieChart("sectionWiseIncorrectContainer", "colors", "Incorrect", response.section_wise_result_incorrect);

			}else{
				createPieChart("sectionWiseIncorrectContainer", "NoItemColor", "Incorrect",  [ {'y':1, 'indexLabel':"No value"} ]);
			}

			if(response.section_wise_result_unattempt.length!=0){
        		createPieChart("sectionWiseUnattemptedContainer", "colors", "Unattempted", response.section_wise_result_unattempt);

			}else{
				createPieChart("sectionWiseUnattemptedContainer", "NoItemColor", "Unattempted",  [ {'y':1, 'indexLabel':"No value"} ]);
			}

			var barGraphDataPoints = [
			{
				type: "stackedColumn100",
	            legendText: "Correct",
	            showInLegend: "true",
	            indexLabel: "#percent %",
	            indexLabelPlacement: "inside",
	            indexLabelFontColor: "white",
	            dataPoints: []
			},
			{
				type: "stackedColumn100",
	            legendText: "Incorrect",
	            showInLegend: "true",
	            indexLabel: "#percent %",
	            indexLabelPlacement: "inside",
	            indexLabelFontColor: "white",
	            dataPoints: []
			},
			{
				type: "stackedColumn100",
	            legendText: "Unattempted",
	            showInLegend: "true",
	            indexLabel: "#percent %",
	            indexLabelPlacement: "inside",
	            indexLabelFontColor: "white",
	            dataPoints: []
			}];
			for (var key in response.filter_by_category) {	
				for(i=0;i<=2;i++){	
			    	barGraphDataPoints[i].dataPoints.push({ y: response.filter_by_category[key][i], label: key });
				}
			}
			createStackedBarChart("categoryWiseBarGraphContainer", "colors", "", barGraphDataPoints);
            },
            function(response){            	
            	$scope.error = true;
                alert("Error in retrieving report details!");                   
            });

    }]);
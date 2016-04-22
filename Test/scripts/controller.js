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

        	var dataPoints1 = [
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
			
			for(var key in response.analysis.section_wise_results){
				for(i=0;i<=2;i++){	
			    	dataPoints1[i].dataPoints.push(response.analysis.section_wise_results[key][i]);
				}
			}
			createStackedBarChart("sectionWiseBarGraphContainer", "colors", "", "Sections", "%age of questions", dataPoints1);

			dataPoints1 = [
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

			for (var key in response.analysis.filter_by_category) {	
			    dataPoints1[0].dataPoints.push({ y: response.analysis.filter_by_category[key][1], label: key });
			    dataPoints1[1].dataPoints.push({ y: response.analysis.filter_by_category[key][0], label: key });
			    dataPoints1[2].dataPoints.push({ y: response.analysis.filter_by_category[key][2], label: key });
			}
			createStackedBarChart("categoryWiseBarGraphContainer", "colors", "", "Categories", "%age of questions", dataPoints1);

			dataPoints1 = []
			var dataPoints2 = []
			var no_of_questions = 0;
			for(var key in response.analysis.question_vs_time_result_ideal){
				no_of_questions += 1;
				dataPoints1.push({ x: no_of_questions , y: response.analysis.question_vs_time_result_ideal[key][1] });
				dataPoints2.push({ x: no_of_questions , y: response.analysis.question_vs_time_result_real[key][1] });				
			}
			createSplineChart("timeWiseSplineContainer", "", dataPoints1, dataPoints2);
			
			delete response.analysis;
			$scope.data = response;
            },
            function(response){            	
            	$scope.error = true;
                alert("Error in retrieving report details!");                   
            });
    }]);
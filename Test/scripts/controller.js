/* global $ */
appmodule
    .controller('ViewReportContoller', ['$scope', '$stateParams', 'ReportFactory', function($scope, $stateParams, ReportFactory) {
    	$scope.error = false;
    	ReportFactory.getReportDetails($stateParams.testUserID, $stateParams.quizKey, $stateParams.attemptNo).get().$promise.then(
            function(response){
        	$scope.data = response;
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
			
			for(var key in response.section_wise_results){
				for(i=0;i<=2;i++){	
			    	barGraphDataPoints[i].dataPoints.push(response.section_wise_results[key][i]);
				}
			}
			createStackedBarChart("sectionWiseBarGraphContainer", "colors", "", "Sections", "%age of questions", barGraphDataPoints);

			barGraphDataPoints = [
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
			    barGraphDataPoints[0].dataPoints.push({ y: response.filter_by_category[key][1], label: key });
			    barGraphDataPoints[1].dataPoints.push({ y: response.filter_by_category[key][0], label: key });
			    barGraphDataPoints[2].dataPoints.push({ y: response.filter_by_category[key][2], label: key });
			}
			createStackedBarChart("categoryWiseBarGraphContainer", "colors", "", "Categories", "%age of questions", barGraphDataPoints);
            },
            function(response){            	
            	$scope.error = true;
                alert("Error in retrieving report details!");                   
            });

    }]);
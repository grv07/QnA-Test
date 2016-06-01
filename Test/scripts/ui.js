$(function() { 
    $("#loadingButton").click(function(){
        $(this).button('loading').delay(1000).queue(function() {
            $(this).button('reset');
            $(this).dequeue();
        });        
    });
});
var qTypes = ['mcq', 'objective', 'comprehension'];
var progressTypes = ['NA', 'NV', 'A'];

function sortObject(obj) {
    return Object.keys(obj).sort().reduce(function (result, key) {
        result[key] = obj[key];
        return result;
    }, {});
}
function isNotEmpty(object){
    for(var i in object){ return true;}
    return false;
}
function showAlert(type, msg){
    $('#notification').removeClass('alert-danger').removeClass('alert-success').removeClass('alert-info').removeClass('alert-warning').addClass(type).html(msg).show();
    setTimeout(closeAlert, 5000);
}
function closeAlert(){
    $("#notification").fadeTo(0, 500).slideUp(500, function(){
        $("#notification").hide();
    });
}
function range(start, end, step, offset){ 
    start = start + 1;
    return Array.apply(null, Array((Math.abs(end - start) + ((offset||0)*2))/(step||1)+1)) .map(function(_, i) { return start < end ? i*(step||1) + start - (offset||0) :  (start - (i*(step||1))) + (offset||0) });
}    

// in seconds
function findTotalDuration(list){
    var total = 0;
    for(var i=0;i<list.length;i++){
        total += parseInt(list[i]['duration']);
    }
    return total;
}
function toggleWarningModal(action, bodyText, okButtonText){
    $('#warningModalBody').html(bodyText);
    $('#warningModal').modal(action);
}
function changeProgressValues(object) {
    var count = [0 ,0, 0];
    var totalKeys = 0;
    for(var key in object){
        var value = object[key]['status'];
        if(value==="NV")
            count[1] += 1;
        else if(value==="NA")
            count[2] += 1;
        else if(value==="A")
            count[0] += 1;        
        totalKeys+=1;
    }
    return [{ percentage: (count[0]*100)/totalKeys, count: count[0] }, { percentage: (count[1]*100)/totalKeys, count: count[1] }, { percentage: (count[2]*100)/totalKeys, count: count[2] }];
};

function createStackedBar100Chart(chartID, colorSet, text, titleX, titleY, dataPoints1){
    new CanvasJS.Chart(chartID,
    {
        title:{
            text: text
        },
        exportEnabled: true,
        axisX:{
            title: titleX
        },
        axisY:{
            title: titleY
        },
        toolTip: {
            shared: true
        },
        data: dataPoints1
    }).render();
}

function createSplineChart(chartID, text, dataPoints1, dataPoints2, dataPoints3){
    new CanvasJS.Chart(chartID,
    {    
      title:{
      text: text
      },
      axisX:{
        title: "Questions"
      },
      axisY:{
        title: "Time spent (in seconds)"
      },
      exportEnabled: true,
        data: [
      {        
        type: "spline",
        color: "#6DCFF6",
        legendText: "Ideal time",
        showInLegend: "true",
        dataPoints: dataPoints1
      },
      {        
        type: "spline",
        color: "#B36491", 
        legendText: "Topper time",
        showInLegend: "true",      
        dataPoints: dataPoints2
      },
      {        
        type: "spline",
        color: "#B30110", 
        legendText: "Actual time",
        showInLegend: "true",      
        dataPoints: dataPoints3
      } 
      ]
    }).render();
}

function getParamsForStateModal(action){
    var params = { message:'', image:'' };
    switch (action) {
        case 'TestOpen':
            params.message = 'You need to fill some details first.';
            params.image = 'ellipsis.svg';
            break;
        case 'TestLoading':
            params.message = 'Your questions are loading right now.';
            params.image = 'ellipsis.svg';
            break;
        case 'TestLoaded':
            params.message = 'Your questions have been loaded. Now you can start the test.';
            params.image = 'start.png';
            break;
        case 'TestStarted':
            params.message = 'Your test has started.';
            params.image = 'hourglass.svg';
            break;
        case 'TestLimitExceeded':
            params.message = 'The test limit has been exceeded. No attempts left.';
            params.image = 'not_allowed.png';
            break;
        case 'TestStart':
            params.message = 'Wait for some time.';
            params.image = 'ellipsis.svg';
            break;
        case 'TestFinished':
            params.message = 'You have finished the test. Wait for report.';
            params.image = 'ellipsis.svg';
        case 'TestFinishedNoReport':
            params.message = 'Your result has been saved. But the result cannot be shown right now. You can now close this window.';
            params.image = 'completed.png';
            break;
        case 'TestClosed':
            params.message = 'You have closed the test. If you started the test then your answers have been saved till the last question you answered. You can resume the test again.';
            params.image = 'closed.png';
            break;
        case 'TestClosedOnly':
            params.message = 'You have closed the test.';
            params.image = 'closed.png';
            break;
        default:
            break;
    }
    return params;
}

function showStateModal(message, image){
    $('#stateModalBodyMessage').html(message);
    $('#stateModalBodyImage').attr('src', '../images/'+image);
    $('#stateModal').modal('show');
}

function processLoadedData(data){
    var result = { data:data , total_questions:0, total_duration:0, total_sections:0, allSections:[] };
    if(data['isTestNotCompleted']){
        result.data['existingAnswers'] = $scope.userDetails.existingAnswers;
        result.data['sectionNameWhereLeft'] = "Section#"+$scope.userDetails.sectionNoWhereLeft;
        result.data['timeRemaining'] = $scope.userDetails.timeRemaining;
    }

    for(var i=0;i<data['quizStacks'].length;i++){
        var stack = data['quizStacks'][i];
        if(result.allSections.indexOf(data['quizStacks'][i].section_name)===-1){
            result.data['details'][stack.section_name] = { 'duration': 0, 'questions' : 0 };
            result.allSections.push(stack.section_name);
        }
        result.total_questions += parseInt(stack.no_questions);
        result.total_duration += parseInt(stack.duration);
        result.data['details'][stack.section_name]['duration'] += parseInt(stack.duration);
        result.data['details'][stack.section_name]['questions'] += parseInt(stack.no_questions);
    }
    result.total_sections = result.allSections.length;
    result.allSections.sort();
    return result;
}

function downloadReportAsPDF(elementID, outputFileName){
    html2canvas($("#"+elementID), {
        onrendered: function(canvas) {         
            var pdf = new jsPDF('p', 'pt', 'a4');
            pdf.setFontSize(30);
            pdf.text(260, 50, 'Report');

            pdf.setFontSize(20);
            pdf.text(60, 120, '1. Normal Details -');

            pdf.setFontSize(16);
            pdf.text(60, 160, 'Result Status');
            pdf.text(60, 190, 'Username');
            pdf.text(60, 220, 'Email');
            pdf.text(60, 250, 'Marks');
            pdf.text(60, 280, 'Actual Rank');
            pdf.text(60, 310, 'Attempt No.');
            pdf.text(60, 340, 'Start Time');
            pdf.text(60, 370, 'End Time');
            pdf.text(60, 400, 'Quiz Name');
            pdf.text(60, 430, 'Quiz Key');
            pdf.text(60, 460, 'Total Questions');
            pdf.text(60, 490, 'Passing %age');

            for(var i=1;i<=12;i++){
                pdf.text(300, 130+i*30, $('#report'+i).text());
            }

            pdf.addPage();
            pdf.setFontSize(20);
            pdf.text(60, 70, '2. Questions Statistics');

            pdf.setFontSize(14);
            pdf.text(40, 110, 'Section Wise Result');
            var imgData = document.querySelector("#sectionWiseBarGraphContainer canvas").toDataURL('image/jpeg');
            pdf.addImage(imgData, 'JPEG', 40, 130, 500, 300);

            pdf.text(40, 470, 'Category Wise Result');
            var imgData = document.querySelector("#categoryWiseBarGraphContainer canvas").toDataURL('image/jpeg');
            pdf.addImage(imgData, 'JPEG', 40, 490, 500, 300);

            pdf.addPage();
            pdf.text(40, 70, 'Time Wise Result');
            var imgData = document.querySelector("#timeWiseSplineContainer canvas").toDataURL('image/jpeg');
            pdf.addImage(imgData, 'JPEG', 40, 100, 500, 300);

            pdf.save(outputFileName+'.pdf');
        }
    });
}
// function addAnswerExplanationLink(explanation){
//     $('#answerExplanationRow').html('<a data-toggle="collapse" data-target="#answerExplanation">View Answer</a><div id="answerExplanation" class="collapse bold-text">'+explanation+'</div>')
// }
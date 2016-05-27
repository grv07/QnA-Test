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

// function addAnswerExplanationLink(explanation){
//     $('#answerExplanationRow').html('<a data-toggle="collapse" data-target="#answerExplanation">View Answer</a><div id="answerExplanation" class="collapse bold-text">'+explanation+'</div>')
// }
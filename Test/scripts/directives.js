appmodule.directive("katexBind", function() {
    return {
        restrict: "A",
        controller: ["$scope", "$element", "$attrs", function($scope, $element, $attrs) {
            $scope.$watch($attrs.katexBind, function(value) {
                try{
                    if(value){
                        if(value!=undefined && value.indexOf("<<Answer>>")!=-1){
                            value.replace(/<<Answer>>/g, "________");
                        }
                        katex.render(value, $element[0]);
                    }
                }catch(error){
                }
                // var $script = angular.element("<script type='math/tex'>")
                //     .html(value == undefined ? "" : value);
                // $element.html("");
                // $element.append($script);
                // MathJax.Hub.Queue(["Typeset", MathJax.Hub, $element[0]]);
            });
        }]
    };
});
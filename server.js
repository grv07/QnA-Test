var connect = require('connect'), serveStatic = require('serve-static');

var app = connect();

app.use(serveStatic("dist"));
app.listen(9000, function(){
        console.log('LIVE >>>> listening on 9000 port');
    console.log(__dirname);
});

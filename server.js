var connect = require('connect'), serveStatic = require('serve-static');

var app = connect();

app.use(serveStatic("Test"));
app.listen(9001, function(){
        console.log('listening on 9000 port');
    console.log(__dirname);
});

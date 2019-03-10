var express = require('express');
var app = express();
var msgpack = require("msgpack-lite");


//
// console.warn(data); // => {"foo": "bar"}
// var buffer = msgpack.encode(jsobject);
app.get('/pack/:a', function(req, res){
    var jsonVal = req.param("a")
    var jsonObject = JSON.parse(jsonVal)
    // encode from JS Object to MessagePack (Buffer)
    var buffer = msgpack.encode(jsonObject);
    var bufferString = buffer.toString("hex")
    // console.log(buffer)
    res.send(bufferString);
});

app.get('/unpack/:b',function (reg,res) {
   var unpackVal = reg.param("b")
   var buffer = new Buffer(unpackVal,"hex")
    var data = msgpack.decode(buffer);

   res.send(data);
});

app.listen(3000);
/**
 * Created by litengfei on 2017/12/18.
 */
var fs = require("fs")
class IDManager{
    constructor(){

    }

    initFromConfig(){

    }

    gnerateRandomID(from,to,path){

    }

    getID(){

    }


}

// var stream = fs.createWriteStream("./nums.txt",{flags:"w"});
// stream.on("open",function () {
//     var buffer = new Buffer(4*89999999);
//     var offset = 0;
//     for(var i = 10000000;i<99999999;i++){
//         buffer.writeUInt32BE(i,offset);
//         offset+=4;
//     }
//     stream.write(buffer);
//     stream.end();
// })

// var readStream = fs.createReadStream("./nums.txt",{flags:"r",start:4*10000000,end:4*10000000+4});
// readStream.on("data",function (data) {
//     var value = data.readUInt32BE(0);
//     console.log(value)
//     //console.log(data);
// })

fs.writeFileSync("count.txt",0);

var data = fs.readFileSync("count.txt")
console.log(data.toString())



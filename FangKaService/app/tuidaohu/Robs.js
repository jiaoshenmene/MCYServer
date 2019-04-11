

var Client = require("./../../core/WsRpcClient");
var HallIP = "ws://127.0.0.1:39401";

var Robs = function (account,pass,afterLogin) {
    this.account = account;
    this.pass = pass;
    this.playerId = null;
    this.hallClient = new Client();
    this.hallClient.connect(HallIP);
    this.gameClient = null;
    this.login(afterLogin);
}

var proto = Robs.prototype;

proto.login = function (afterLogin) {
    var self = this;
    this.hallClient.onReady(function (client) {
        client.proxy.login(self.account,self.pass,function (data) {
            console.log("机器人:%s,登录结果:%o",self.account,data);
            if(data.ok&&data.suc){
                self.playerId = data.id;
                if(afterLogin)afterLogin();
            }
        })
    })
}

proto.createRoom = function (afterCreate) {
    var self = this;
    this.hallClient.onReady(function (client) {
        client.proxy.createRoom({},function (data) {
            console.log("机器人:%s，创建房间结果:%o",self.account,data);
            if(data.ok&&data.suc){
                if(afterCreate)afterCreate(data.roomId);
                var gameUrl = data.url;
                self.connectToGameServerAndAuth(gameUrl);
            }
        })
    })
}

proto.joinRoom = function (roomId) {
    var self = this;
    this.hallClient.onReady(function (client) {
        client.proxy.joinTable(roomId,function (data) {
            console.log("机器人:%s,加入房间结果:%o",self.account,data);
            if(data.ok&&data.suc){
                var gameUrl = data.gameUrl;
                self.connectToGameServerAndAuth(gameUrl);
            }
        })
    })
}

proto.connectToGameServerAndAuth = function (gameUrl) {

    var gameClient = this.gameClient = new Client();
    var service = {};
    service.toHitCard = function (data,cb) {
        setTimeout(function () {
            gameClient.proxy.robHitCard({},function () {

            })

        },2000)

    }

    var self = this;
    this.gameClient.addRpc(service);
    this.gameClient.connect(gameUrl);
    this.gameClient.onReady(function (client) {
        client.proxy.login(self.account,self.pass,function (data) {
            console.log("机器人:%s,登录游戏服务器结果:%o",self.account,data);
            if(data.ok&&data.suc){
                //

            }
        })
    })
}


var rob1 = new Robs(3,3,function () {
    rob1.createRoom(function (roomId) {
        var rob2 = new Robs(10,10,function () {
            rob2.joinRoom(roomId);
        });

        var rob3 = new Robs(20,20,function () {
            rob3.joinRoom(roomId);
        });

        // var rob4 = new Robs(2,2,function () {
        //     rob4.joinRoom(roomId);
        // });


    })
});


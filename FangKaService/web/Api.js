/**
 * Created by litengfei on 2017/12/17.
 */
var ServerBlance = require("./ServerBlance.js");
var UnitTools = require("./../core/UnitTools.js");
var WeixinModel = require("./../model/Weixin.js");
var DataBaseManager = require("./../Theme/FangkaMajiang/db/DataBaseManager.js");
var IDs = require("./../core/IDs.js");

var express = require("express");
var app = express();

var idGenerater = new IDs();
idGenerater.initFromConfig();

var asyncRun = async function () {
    var ok = await DataBaseManager.instance().initDBFromServerConfig();
    if(!ok){
        console.log("数据库初始化错误！请检查！@Api.js");
        return;
    }

    app.all('*', function (req, res, next) {
        res.header("Access-Control-Allow-Origin", "*");
        res.header("Access-Control-Allow-Headers", "X-Requested-With");
        res.header("Access-Control-Allow-Methods", "PUT,POST,GET,DELETE,OPTIONS");
        res.header("X-Powered-By", ' 3.2.1')
        res.header("Content-Type", 'text\/plain; charset=utf-8');
        next();
    });


    app.get("/weixinlogin/",async function (req,res) {
        var openId = req.query.openid;
        var access_token = req.query.access_token;
        var refresh_token = req.query.refresh_token;
        console.log(openId);
        console.log(access_token);
        console.log(refresh_token);

        //先得到这个玩家的所有信息，头像、名字、性别
        var userInfo = await WeixinModel.getInfoOrRefresh(openId,access_token,refresh_token);

        if(userInfo.code == -1){//获取失败
            res.send({code:userInfo.code});
            return;
        }

        if(userInfo.code == 2){//重新调用微信登录
            res.send({code:userInfo.code});
            return;
        }

        var nickname = userInfo.info.nickname;
        var sex = userInfo.info.sex;
        var headimgurl = userInfo.info.headimgurl;
        var unionid = userInfo.info.unionid;

        //去判断是否有这个玩家，如果有，就更新，如果没有，就在数据库添加
        var playerInfo = await DataBaseManager.instance().findPlayerWithOpenId(openId);
        if(playerInfo == null){//创建
            var id = await idGenerater.getID();
            var account = UnitTools.genID();
            var pass = UnitTools.genShortID();
            playerInfo = await DataBaseManager.instance().createPlayer(id,openId,unionid,nickname,sex,headimgurl,account,pass,0);
        }else{
            DataBaseManager.instance().updatePlayerWithOpenId(openId,{nickname:nickname,sex:sex,headimgurl:headimgurl});
        }

        //得到account和pass
        //返回给客户端
        var hallUrl = ServerBlance.getInstance().getIp("HallService",openId);
        res.send({code:0,account:playerInfo.account,pass:playerInfo.pass,hallUrl:hallUrl});
    })

    app.get("/testlogin/",async function (req,res) {
        //1.获得客户端传递的账号
        //2.判断账号是否已经注册
        //3.如果注册了，直接返回  account pass hallUrl code 0;如果没有注册，注册新的账户
        var account = req.query.account;
        if(!account)res.send({});
        var playerInfo = await DataBaseManager.instance().findPlayer(account,{account:1,pass:1,openId:1});
        if(playerInfo){
            var hallUrl = ServerBlance.getInstance().getIp("HallService",playerInfo.openId);
            res.send({code:0,account:playerInfo.account,pass:playerInfo.pass,hallUrl:hallUrl});
        }else{//注册
            var id = await idGenerater.getID();
            var playerInfo = await DataBaseManager.instance().createPlayer(id,account,account,account,1,
                "http://i4.cfimg.com/583278/00e2ef22ec67b9b0.jpg",account,account,0);
            var hallUrl = ServerBlance.getInstance().getIp("HallService",playerInfo.openId);
            res.send({code:0,account:playerInfo.account,pass:playerInfo.pass,hallUrl:hallUrl});
        }

    })

    app.get("/getHallUrl/:id",function (req,res) {
        var id = req.param("id");
        if(UnitTools.isNullOrUndefined(id)){
            res.send("发生错误!");
            return;
        }
        var ip = ServerBlance.getInstance().getIp("HallService",id);
        res.send(ip);
    })

    app.listen(3000);
}

asyncRun();







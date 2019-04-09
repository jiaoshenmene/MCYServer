/**
 * Created by litengfei on 2017/9/13.
 */
/**
 * Created by litengfei on 2017/4/10.
 */

/**
 * Created by litengfei on 2017/1/8.
 * 门的主要作用是路由客户端的请求，一般用来做一些实时性不大的请求,比如登录，大厅操作等，比如游戏服务器的话，需要很强的顺序性的话，所以，需要再次联系游戏服务器
 */
var app = require("./../core/app.js").instance;
var UnitTools = require("./../core/UnitTools.js");
var PlayerManager = require("./../model/PlayerManager");
var DataBaseManager = require("./../Theme/FangkaMajiang/db/DataBaseManager");
var Config = require("./../core/Config");
var Codes = require("./../app/share/Codes");
var Map = require("./../core/Map");
DataBaseManager.instance().initDBFromServerConfig();
var safeCode = Config.getServerConfig()["safeCode"];

module.exports = function () {
    // ------------------管理-----------------
    var playerManager = new PlayerManager();

    console.log("hallService init")

    //  --------------- End 管理------------------

    var onStart = function (serverID, serviceType, serverIP, serverPort, custom) {

    }

    var onClientIn = function (session) {

    }

    var onClientOut = function (session) {
        if (!playerManager.hasPlayer(session.playerId))return;
        if (session == playerManager.getSession(session.playerId)){//表示可以设置非login状态
            playerManager.setIsLogin(session.playerId,false);//非登陆状态
        }

    }

    var service = {};


    /**
     * 客户端调用微信登录
     * @param argJson uuid 微信uuid openid 微信openid
     * @param cb -1 表示需要重新认证
     */
    service.weixinLogin = async function (argJson,cb) {
        //调用LoginService的微信登录接口
        var service = app.getRandomService("LoginService");
        var info = await service.runProxy["weixinLogin"](argJson);
        if(info.ok){//登录成功了

        }
        cb(info);
    }

    /**
     * 账号密码登录
     * @param account pass
     * @param cb code -1 表示需要重新登录
     */
    service.login = async function (account,pass,cb) {
        if(UnitTools.isNullOrUndefined(account) || UnitTools.isNullOrUndefined(pass)){
            cb({ok:false})
            return;
        }
        //判断是否可以登录，如果可以登录，返回基本信息
        var infos = await DataBaseManager.instance().canLogin(account,pass);
        if(infos === null){
            cb({ok:true,suc:false});
            return;
        }
        playerManager.setIsLogin(infos.id,true);
        cb.session.playerId = infos.id;
        cb({ok:true,suc:true,info:infos});
    }


    service.getPlayerBaseInfo = async function (cb) {
        var playerId = cb.session.playerId;
        var isLogin = playerManager.getIsLogin(playerId);
        if (!isLogin){
            cb({ok:false});
            return ;
        }
        // 获得基本信息
        var infos = await DataBaseManager.instance().findPlayerWithId(playerId,{id:1,nickname:1,score:1,headimgurl:1});
        console.log(infos);
        if (infos === null){
            cb({ok:true,suc:false});
            return ;
        }
        cb({ok:true,suc:true,info:infos});


    }

    service.createRoom = async function (roomInfo,cb){
        var playerId = cb.session.playerId;
        var isLogin = playerManager.getIsLogin(playerId);
        if (!isLogin){
            cb({ok:false});
            return ;
        }
        var oldUrl = playerManager.getGameUrl(playerId);
        if (oldUrl) {
            cb({ok:true,suc:true,url:oldUrl});
            return ;
        }

        var gameService = app.getRandomService("Tuidaohu");
        var gameUrl = "ws://"+gameService.ip+":"+gameService.port;

        var idService = app.getServiceWithServerID("IdService1");
        var newId = await idService.runProxy.getTableId(gameUrl,safeCode);

        console.log("newid: ",newId.tableId);
        if (!newId.ok) {
            cb({ok:true,suc:false,info:"创建失败，请重试"});
            return ;
        }


        console.log("tableId gameUrl : %s %s",newId.tableId,gameUrl);



        playerManager.setGameUrl(playerId,gameUrl);

        // 创建房间
        await gameService.runProxy.createTable(playerId,newId.tableId,roomInfo,safeCode);
        cb({ok:true,suc:true,url:gameUrl,roomId:newId.tableId});
    }


    service.joinTable = async function (tableId,cb) { //加入桌子
        var playerId = cb.session.playerId;
        console.log("joinTable : "+tableId);
        if (!playerManager.getIsLogin(playerId)) {
            cb({ok:true,suc:false,codes:Codes.Player_Not_Login});
            return ;

        }
        var gameUrl = playerManager.getGameUrl(playerId);
        if (gameUrl){
            cb({ok:true,suc:true,gameUrl:gameUrl});
            return ;
        }
        var idService = app.getServiceWithServerID("IdService1");
        var urlInfo = await idService.runProxy.getTabGameUrl(tableId,safeCode);

        if (!urlInfo.gameUrl){
            cb({ok:true,suc:false,codes:Codes.Game_Not_Exsit});
            return ;
        }

        //调用服务器加入桌子
        var gameService = app.getServiceWithServerPort(urlInfo.gameUrl);
        var res = await gameService.runProxy.joinTable(tableId,playerId,safeCode);

        if (res.ok && res.suc){
            cb({ok:true,suc:true,gameUrl:urlInfo.gameUrl});
            return ;
        }
        cb(res);
    }

    /**
     * 注册游戏名字
     * @param argJson name 玩家的名字
     * @param cb
     */
    service.registerName = function (argJson,cb) {

    }




    return {
        service: service, onClientIn: onClientIn, onClientOut: onClientOut, onStart: onStart
    };
}
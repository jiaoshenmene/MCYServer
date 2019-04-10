
var app = require("./../core/app");
var Config = require("./../core/Config.js");
var UnitTools = require("./../core/UnitTools");
var safeCode = Config.getServerConfig()["safeCode"];
var DataBaseManager = require("./../Theme/FangkaMajiang/db/DataBaseManager");
DataBaseManager.instance().initDBFromServerConfig();
var Handler = require("./../app/tuidaohu/Handler");
var User = require("./../app/tuidaohu/User");
var Codes = require("./../app/share/Codes");


module.exports = function () {
    var onStart = function (serverID, serviceType, serverIP, serverPort, custom) {

    }

    var onClientIn = function (session) {

    }

    var onClientOut = function (session) {
    }

    var service = {};

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
        var infos = await DataBaseManager.instance().canLogin(account,pass,{headimgurl:1,nickname:1,id:1});

        if(infos === null){
            cb({ok:true,suc:false});
            return;
        }
        User.setIsLogin(infos.id,true)
        User.setNickName(infos.id,infos.nickname);
        User.setHeadUrl(infos.id,infos.headimgurl);
        User.setSession(infos.id,cb.session);

        var playerId = cb.session.playerId = infos.id;

        var table = User.getPlayerGameInstance(playerId);

        if (!table){
            cb({ok:true,suc:false,codes:Codes.player_Not_In_Game});
            return ;
        }
        var heads = table.getHeads();
        console.log("heads:%o",heads);
        var frames = table.logic.getRestoreFrames(playerId);
        console.log("frames : %o",frames);
        cb({ok:true,suc:true,info:infos,isInGame:true,inRoomInfo:{playerId:playerId,pos:User.getPos(playerId),heads:heads,frames:frames}});

    }

    service.createTable = function (playerId,tableId,roomInfo,serverCode,cb) {
        if (serverCode !==safeCode) {
            cb({ok:false});
            return;
        }
        var oldTableId = User.getTableId(playerId);
        if (oldTableId){
            cb({ok:true,suc:false,tableId:oldTableId,info:"玩家已经在游戏当中了"});
            return;
        }
        console.log(playerId,tableId,roomInfo);
        Handler.createTable(playerId,tableId,roomInfo);
        Handler.inPos(playerId,tableId,0);

        cb({ok:true});
    }

    service.joinTable = async function (tableId,playerId,serverCode,cb) {
        console.log("playerId: %s",playerId);
        if (serverCode !== safeCode){
            cb({ok:false});
            return;
        }
        var table = User.getPlayerGameInstance(playerId);

        if (!table){ // 不在桌子里，可以加入
            if (Handler.tables.hasKey(tableId)){
                if(!User.getHeadUrl(playerId)){
                    //获取玩家信息,并保存
                    var baseInfo = await DataBaseManager.instance().findPlayerWithId(playerId,{headimgurl:1,nickname:1,id:1});
                    User.setNickName(baseInfo.id,baseInfo.nickname);
                    User.setHeadUrl(baseInfo.id,baseInfo.headimgurl);
                }

                table = Handler.tables.getNotCreate(tableId);
                var freePos = table.room.getFreePos();
                console.log("playerId: %s, freePos : %s",playerId,freePos);
                if (freePos == null){
                    cb({ok:true,suc:false,codes:Codes.Game_Table_Full});
                    return;
                }else{//可以入座

                    Handler.inPos(playerId,tableId,freePos);
                    User.setPlayerGameInstance(playerId,table);
                    cb({ok:true,suc:true});
                }
            }
        }else{
            cb({ok:true,suc:true});
        }
    }

    service.hitCard = function (data,cb) {
        //判断打牌的合法性
        var playerId = cb.session.playerId;
        if (!User.getIsLogin(playerId)){
            cb({ok:true,suc:false,codes:Codes.Player_Not_Login});
            return;
        }

        var cardIndex = data.cardIndex;
        var actionId = data.actionId;
        var table = User.getPlayerGameInstance(playerId);
        if (!table){
            cb({ok:true,suc:false,codes:Codes.Player_Not_Login});
            return;
        }

        if (actionId != table.actionId()){
            cb({ok:true,suc:false,codes:Codes.Game_Action_Not_Valid});
            return;
        }
        var pos = User.getPos(playerId);
        if (pos != table.hitPos()){
            cb({ok:true,suc:false,codes:Codes.Game_Action_Not_Valid});
            return;
        }
        if (!table.hasCard(pos,cardIndex)){
            cb({ok:true,suc:false,codes:Codes.Game_Action_Not_Valid});
            return;
        }
        //合法:
        table.logic.action.setRespond(pos,cardIndex);
        cb({ok:true,suc:true});

    }

    return{
        service:service,onClientIn:onClientIn,onClientOut:onClientOut,onStart:onStart

    };
}
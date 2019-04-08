
var UnitTools = require("./../../core/UnitTools");
var Room = require("./../share/Room");
var Logic = require("./Logic");
var User = require("./User");

class Table {
    constructor(playerId,tableId,custom){
        this.createId = playerId;
        this.tableId = tableId;
        this.custom = custom;
        this.room = new Room(tableId,4,null);
        this.logic = new Logic();
    }

    getHead(pos){
        var info = {};
        info.pos = pos;
        info.playerId = this.room.getInPosInfo()[pos].account;
        info.headimgurl = User.getHeadUrl(info.playerId);
        console.log("headInfo : "+info.headimgurl);
        info.nickname = User.getNickName(info.playerId);
        return info;
    }

    getHeads(){//获得头像
        var info = {};
        var posInfo = this.room.getInPosInfo();
        console.log("posInfo:%o",posInfo);
        UnitTools.forEach(posInfo,function (pos,pInfo) {
            var one = info[pos] = {};
            one.playerId = pInfo.account;
            one.headimgurl = User.getHeadUrl(one.playerId);
            one.nickname = User.getNickName(one.playerId);
        })
        return info;
    }

    inPos(playerId,pos){//  进入座位
        var ok = this.room.inPos(playerId,pos);
        return ok;
    }

}

module.exports = Table;
/**
 * Created by litengfei on 2018/1/23.
 */

var UnitTools = require("./../../core/UnitTools.js");
var Room = require("./../share/Room.js");
var Logic = require("./Logic.js");
var User = require("./User.js");
class Table {
    constructor(playerId, tableId, custom) {
        this.posCount = 4;
        this.createId = playerId;
        this.tableId = tableId;
        this.custom = custom;
        this.room = new Room(tableId, 4, null);
        this.logic = new Logic(this);
    }

    getHead(pos) {
        var info = {};
        info.pos = pos;
        info.playerId = this.room.getInPosInfo()[pos].account;
        info.headimgurl = User.getHeadUrl(info.playerId);
        info.nickname = User.getNickName(info.playerId);
        return info;
    }

    getHeads() {//获得头像
        var info = {};
        var posInfo = this.room.getInPosInfo();
        UnitTools.forEach(posInfo, function (pos, pInfo) {
            var one = info[pos] = {};
            one.playerId = pInfo.account;
            one.headimgurl = User.getHeadUrl(one.playerId);
            one.nickname = User.getNickName(one.playerId);
        })
        return info;
    }

    getNextPos(pos) {
        var nextPos = new Number(pos) + 1;
        nextPos = nextPos > this.posCount - 1 ? 0 : nextPos;
        return nextPos;
    }

    //获得之前的位置
    getPrePos(pos) {
        var prePos = new Number(pos) - 1;
        prePos = prePos < 0 ? this.posCount - 1 : prePos;
        return prePos;
    }

    //获得对家的位置
    getTeamPos(pos) {
        var teamPos = new Number(pos) + 2;
        teamPos = teamPos > this.posCount - 1 ? teamPos - this.posCount : teamPos;
        return teamPos;
    }

    getPidWithPos(pos) {
        return this.room.getInPosInfo()[pos].account;
    }

    inPos(playerId, pos) {//进入座位
        var ok = this.room.inPos(playerId, pos);
        return ok;
    }

    eachPos(cb) {//遍历每一个位置
        for (var pos = 0; pos < this.posCount; pos++) {
            cb(pos);
        }
    }

    actionId(){
        return this.logic.action.actionId;
    }

    hitPos(){
        return this.logic.toHitPos;
    }

    hasCard(pos,cardIndex){
        return !UnitTools.isNullOrUndefined(this.logic.rawHandCards[pos][cardIndex])
    }

    hasAction(pos,actionType){ //判断是否有动作
        var action = this.logic.action;
        var actions = action.getActionData();

        if (UnitTools.isNullOrUndefined(actions[pos][actionType])) return false;
        return true;
    }

    update() {
        this.logic.update();
    }

}
module.exports = Table;

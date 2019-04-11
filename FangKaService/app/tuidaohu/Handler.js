/**
 * Created by litengfei on 2018/1/23.
 */
var Table = require("./Table.js");
var Map = require("./../../core/Map.js");
var UnitTools = require("./../../core/UnitTools.js");
var User = require("./User.js");
var Message = require("./Message.js");
class Handler{
    constructor(){
        this.tables = new Map();
        this.intVal = setInterval(this.update.bind(this),10);
    }
    createTable(playerId,tableId,custom){
        var table = new Table(playerId,tableId,custom);
        this.tables.setKeyValue(tableId,table);
    }
    inPos(playerId,tableId,pos){
        var self = this;
        var table = this.tables.getNotCreate(tableId);
        table.inPos(playerId,pos);

        User.setTableId(playerId,tableId);
        User.setPlayerGameInstance(playerId,table);
        User.setPos(playerId,pos);

        //发送给桌子里其他玩家，有新玩家进入
        var inPosPIds = table.room.getRoomInPosAccounts();
        var headInfo = table.getHead(pos);
        UnitTools.forEach(inPosPIds,function (idx,pId) {
            if(pId == playerId)return;
            User.send(pId,Message.inPos,headInfo);
        })

    }

    update(){
        this.tables.forEach(function (tabId,table) {
            table.update();
        })
    }

    sendEvent(playerIds,eventName,data){
        UnitTools.forEach(playerIds,function (index,pId) {
            User.send(pId,eventName,data);
        })
    }
}
Handler.g = new Handler();
module.exports = Handler.g;

var StaM = require("./../../core/StateManger.js");
var Majiang = require("./../share/Chess").Majiang;
var UnitTools = require("./../../core/UnitTools.js");
var Message = require("./../tuidaohu/Message");
var User = require("./User");

class Logic {
    constructor(tab){
        this.tab = tab;
        this.washCards = null; //洗完后的牌
        this.handCards = new Array(this.tab.posCount); //牌形数量数组
        this.rawHandCards = new Array(this.tab.posCount); //手里原始牌数字
        for (var pos = 0;pos<this.tab.posCount;pos++) {
            var a = this.handCards[pos] = new Array(34);
            a.fill(0);
            a = this.rawHandCards[pos] = new Array(14);
            a.fill(0);
        }

        this.frames = []; // 历史消息

        this.staM = new StaM();
        this.staM.registerState(1,this.waitingP.bind(this));//1表示等待
        this.staM.registerState(2,this.washP.bind(this));//2表示洗牌
        this.staM.registerState(3,this.hitP.bind(this));//3表示出牌等待
        this.staM.changeToState(1);
    }

    sendSpecialAndSave(pId,eventName,data){
        User.send(pId,eventName,data);
        this.frames.push({type:"special",pId:pId,eventName:eventName,data:data});
    }

    sendGroupAndSave(specials,eventName,data){
        var dataS = this.handleGroupData(data);
        this.tab.eachPos(function (pos) {
            var pId = this.tab.getPidWithPos(pos);
            var realData = UnitTools.arrayHasValue(pId,specials)?data:dataS;
            User.send(pId,eventName,realData);
        }.bind(this));
        this.frames.push({type:"group",specials:specials,eventName:eventName,data:data,dataS:dataS});
    }

    handleGroupData(data) {
        var dataS = {};//特殊包
        for (var key in data){
            var value = data[key];
            if (key.indexOf("_s") != -1)continue;
            dataS[key] = value;
        }
        return dataS;
    }

    getRestoreFrames(pId){
        console.log("frames" + this.frames);
        var frames = [];
        for (var idx in this.frames){
            var frame = this.frames[idx];
            if (frame.type == "special" && pId == frame.pId) {
                frames.push(frame);
                continue;
            }
            if (frame.type == "group"){
                var realData = UnitTools.arrayHasValue(pId,frame.species)?frame.data:frame.dataS;
                frames.push({type: "group",eventName: frame.event,data: realData});
            }
        }
        return frames;
    }

    waitingP(){
        if (this.tab.room.getFreePos() == null){
            console.log("满人了，游戏开始");
            this.staM.changeToState(2);
        }
    }

    washP(){
        console.log("进入洗牌阶段");

        this.washCards = Majiang.cards.concat();
        UnitTools.washArray(this.washCards);
        console.log("洗完后的牌：%o",this.washCards);
        for (var i = 0;i<54;i+=16){
            this.tab.eachPos(function (pos) {
                var startIndex = i+pos*4;
                var handStartIndex = i / 4;
                for (var j = 0;j<4;j++){
                    var cardIndex = this.rawHandCards[pos][handStartIndex+j] = this.washCards[startIndex+j];
                    var tIndex = Majiang.tIndex(cardIndex);
                    this.handCards[pos][tIndex]+=1;
                }

            }.bind(this));
        }
        // console.log("发到手里的牌%o",this.rawHandCards);
        // console.log("牌型：%o",this.handCards);
        this.tab.eachPos(function (pos) {
            var pId = this.tab.getPidWithPos(pos);
            var cards13 = this.rawHandCards[pos].slice(0,13);
            console.log("sdfdsf");
            console.log(cards13);
            this.sendSpecialAndSave(pId,Message.startCards,{cardIndexs:cards13});
        }.bind(this))
        this.staM.changeToState(3);

    }
    hitP(){

    }
    update(){
        this.staM.update();
    }

}

module.exports = Logic;
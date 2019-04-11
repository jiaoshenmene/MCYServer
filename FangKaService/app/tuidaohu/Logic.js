/**
 * Created by litengfei on 2018/1/23.
 */
var StaM = require("./../../core/StateManger.js");
var Majiang = require("./../share/Chess.js").Majiang;
var UnitTools = require("./../../core/UnitTools.js");
var Message = require("./../tuidaohu/Message.js");
var User = require("./User.js");

class Action{
    constructor(actionId){
        this.actionTime = Date.now();
        this.actionId = actionId;
        this.actionData = null;
        this.responds = {};
    }
    setRespond(pos,data){//设置玩家回复消息
        this.responds[pos] = data;
    }
    getRespond(pos){//得到回复消息
        return this.responds[pos];
    }
    isRepond(pos){//是否回复
        return !UnitTools.isNullOrUndefined(this.responds[pos])
    }
    setActionData(actionData){
        this.actionData = actionData;
    }
    getActionData(){
        return this.actionData;
    }
}
class Logic{
    constructor(tab){
        this.tab = tab;
        this.washCards = null;//洗完后的牌
        this.handCards = new Array(this.tab.posCount);//牌形数量数组
        this.rawHandCards = new Array(this.tab.posCount);//手里原始牌数字
        for(var pos = 0;pos<this.tab.posCount;pos++){
            var a = this.handCards[pos] = new Array(35);
            a.fill(0);
            a = this.rawHandCards[pos] = {};
        }

        this.mainPos = null;//庄pos
        this.touchIndex = 0;
        this.touchPos = null;//当前摸牌位置
        this.toHitPos = null;//当前轮到谁打牌的位置
        this.actionId = 0;
        this.action = null;//当前action

        this.frames = [];//历史消息

        this.hitTimeOut = 2000;
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

    handleGroupData(data){
        var dataS = {};//特殊包
        for(var key in data) {
            var value = data[key];
            if (key.indexOf("_s") != -1)continue;
            dataS[key] = value;
        }
        return dataS;
    }

    getRestoreFrames(pId){
        var frames = [];
        for(var idx in this.frames){
            var frame = this.frames[idx];
            if(frame.type == "special" && pId == frame.pId){
                frames.push(frame);
                continue;
            }
            if(frame.type == "group"){
                var realData = UnitTools.arrayHasValue(pId,frame.specials)?frame.data:frame.dataS;
                frames.push({type:"group",eventName:frame.eventName,data:realData});
            }
        }
        return frames;
    }

    manageCard(pos,cardIndex){
        this.rawHandCards[pos][cardIndex] = cardIndex;
        var tIndex = Majiang.tIndex(cardIndex);
        this.handCards[pos][tIndex]+=1;
    }

    unManageCard(pos,cardIndex){
        delete  this.rawHandCards[pos][cardIndex];
        var tIndex = Majiang.tIndex(cardIndex);
        this.handCards[pos][tIndex]-=1;
    }

    getRandomHitCard(pos){
        var handCars = Object.keys(this.rawHandCards[pos]);
        return handCars[handCars.length-1];
    }

    touchCard(pos){//摸一张牌
        this.touchPos = pos;
        var touchCardIndex = this.washCards[this.touchIndex];
        if(UnitTools.isNullOrUndefined(touchCardIndex)){//进入流局
            this.staM.changeToState("liuju");
            console.log("流局了");
            return;
        }
        this.touchIndex+=1;
        this.manageCard(pos,touchCardIndex);
        this.handCards[pos][34] = touchCardIndex;
        var pId = this.tab.getPidWithPos(pos);
        this.sendGroupAndSave([pId],Message.touchCard,{pos:pos,cardIndex_s:touchCardIndex});
    }

    toHitCard(pos){//轮到谁打牌了
        this.toHitPos = pos;
        this.action = new Action(++this.actionId);
        this.sendGroupAndSave([],Message.toHitCard,{pos:this.toHitPos,actionId:this.action.actionId});
        this.staM.changeToState(3);//等待打牌
    }


    waitingP(){
        if(this.tab.room.getFreePos() == null){//满了
            console.log("满人了，游戏开始！");
            this.staM.changeToState(2);
        }
    }

    washP(){
        console.log("进入洗牌阶段!");
        this.washCards = Majiang.cards.concat();
        UnitTools.washArray(this.washCards);
        //console.log("洗完后的牌:%o",this.washCards);
        for(var i = 0;i<48;i+=16){
            this.tab.eachPos(function (pos) {
                var startIndex = i+pos*4;
                var handStartIndex = i/4;
                for(var j = 0;j<4;j++){//次数
                    var cardIndex = this.washCards[startIndex+j];
                    this.manageCard(pos,cardIndex);
                }

            }.bind(this));
        }
        var startIndex = 48;
        this.tab.eachPos(function (pos) {
            var cardIndex = this.washCards[startIndex];
            this.manageCard(pos,cardIndex);
            startIndex+=1;
        }.bind(this));
        console.log("发完牌了，手里牌:");
        console.log(this.rawHandCards[3]);
        // console.log("发到手里的牌%o",this.rawHandCards);
        // console.log("牌型:%o",this.handCards);
        this.tab.eachPos(function (pos) {
            var pId = this.tab.getPidWithPos(pos);
            var cards13 = Object.keys(this.rawHandCards[pos]);
            this.sendSpecialAndSave(pId,Message.startCards,{cardIndexs:cards13});
            if(pos == 3)console.log(cards13);
        }.bind(this))

        this.touchIndex = 54;
        this.mainPos = 3;//逻辑位置是2，对应客户端自己第一个打牌
        this.touchCard(this.mainPos);
        this.toHitCard(this.mainPos);
    }

    hitP(){
        if(!this.action.isRepond(this.toHitPos)){
            // var time = Date.now();
            // if((time - this.action.actionTime)>this.hitTimeOut){//超时，自动出牌
            //     var hitIndex = this.getRandomHitCard(this.toHitPos);
            //     this.action.setRespond(this.toHitPos,hitIndex);
            // }
            return;
        }
        var cardIndex = this.action.getRespond(this.toHitPos);
        //移除手里的牌
        this.unManageCard(this.toHitPos,cardIndex);
        //通知所有玩家打牌了
        this.sendGroupAndSave([],Message.hitCard,{pos:this.toHitPos,cardIndex:cardIndex});

        var nextPos = this.tab.getNextPos(this.toHitPos);
        this.touchCard(nextPos);
        this.toHitCard(nextPos);
    }

    update(){
        this.staM.update();
    }

}

module.exports = Logic;
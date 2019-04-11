
var StaM = require("./../../core/StateManger.js");
var Majiang = require("./../share/Chess").Majiang;
var UnitTools = require("./../../core/UnitTools.js");
var Message = require("./../tuidaohu/Message");
var User = require("./User");

class Action {
    constructor(actionId){
        this.actionTime = Date.now();
        this.actionId = actionId;
        this.actionData = null;
        this.responds = {};
        this.waitPoss = [];
    }

    setRespond(pos,data){
        this.responds[pos] = data;
    }

    getRespond(pos){//得到回复消息
        return this.responds[pos];
    }

    isRespond(pos){//是否回复
        return !UnitTools.isNullOrUndefined(this.responds[pos]);
    }

    setActionData(actionData){
        this.actionData = actionData;
    }

    getActionData(){
        return this.actionData;
    }

    addWaitPos(pos){
        this.waitPoss.push(pos);
    }

    getWaitPoss(){
        return this.waitPoss;
    }

}

class Logic {
    constructor(tab){
        this.tab = tab;
        this.washCards = null; //洗完后的牌
        this.handCards = new Array(this.tab.posCount); //牌形数量数组
        this.rawHandCards = new Array(this.tab.posCount); //手里原始牌数字
        this.handActions = new Array(this.tab.posCount);//手里的动作保存
        for (var pos = 0;pos<this.tab.posCount;pos++) {
            var a = this.handCards[pos] = new Array(35);
            a.fill(0);
            this.rawHandCards[pos] = {};
            this.handActions[pos] = [];//actionTyoe
        }

        this.mainPos = null; //庄pos
        this.touchIndex = 0;
        this.touchPos = null;//当前摸牌位置
        this.toHitPos = null;//当前轮到谁打牌的位置
        this.actionId = 0;
        this.action = null; //当前action




        this.frames = []; // 历史消息

        this.hitTimeOut = 2000;

        this.staM = new StaM();
        this.staM.registerState(1,this.waitingP.bind(this));//1表示等待
        this.staM.registerState(2,this.washP.bind(this));//2表示洗牌
        this.staM.registerState(3,this.hitP.bind(this));//3表示出牌等待
        this.staM.registerState(4,this.actionP)
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

    manageCard(pos,cardIndex){
        this.rawHandCards[pos][cardIndex] = cardIndex;
        var tIndex = Majiang.tIndex(cardIndex);
        this.handCards[pos][tIndex] += 1;

    }

    unManageCard(pos,cardIndex){
        delete this.rawHandCards[pos][cardIndex];
        var tIndex = Majiang.tIndex(cardIndex);
        this.handCards[pos][tIndex]-=1;
    }

    getRandomHitCard(pos){
        var handCars = Object.keys(this.rawHandCards[pos]);
        var random = UnitTools.random(0,handCars.length-1);
        return handCars[random];
    }

    touchCard(pos) { //摸一张牌
        this.touchPos = pos;
        var touchCardIndex = this.washCards[this.touchIndex];
        if (UnitTools.isNullOrUndefined(touchCardIndex)){ //进入流局
            this.staM.changeToState("liuju");
            console.log("流局了");
            return;
        }
        this.handCards[pos][34] = touchCardIndex;
        var pId = this.tab.getPidWithPos(pos);
        this.sendGroupAndSave([pId],Message.touchCard,{pos:pos,cardIndex_s:touchCardIndex});
    }

    touchAndDealHandAction(pos){//摸起来牌，并处理动作
        this.touchCard(pos);
        var action = this.getActionInHand(pos);
        var nums = Object.keys(action);
        var handAction = {};
        handAction[pos] = action;
        nums != 0 ? this.toWaitAction(handAction):this.toHitCard(pos);

    }


    toHitCard(pos) { //轮到谁打牌
        this.toHitPos = pos;
        this.action = new Action(++this.actionId);
        this.sendGroupAndSave([],Message.toHitCard,{pos:this.toHitPos,actionId:this.action.actionId});
        this.staM.changeToState(3);//等待打牌

    }

    toWaitAction(actions){
        this.action = new Action(++this.actionId);
        this.action.setActionData(actions);
        for (var pos in actions){
            var action = actions[pos];
            this.action.addWaitPos(pos);
            var pId = this.tab.getPidWithPos(pos);
            this.sendSpecialAndSave(pId,Message.toWaitAction,{actionId:this.actionId,action:action});
        }
        this.staM.changeToState(4,this.action);
    }

    getActionInHand(pos){//判定手里牌的动作，如，暗杠，过路杠
        var action  = {};
        var handShap = this.handCards[pos];
        {//暗杠
            var details = [];
            for(var i = 0;i<34;i++){
                if(handShap[i] == 4){
                    var detail = {};
                    detail.pos = pos;
                    detail.tIndex = i;
                    details.push(detail);
                }
            }
            if(details.length != 0)action[Logic.HandAction.AnGang] = details;
        }

        {//过路杠
            var details = [];
            var actions = this.handActions[pos];
            for(var idx in actions){
                var one = actions[idx];
                if(one.actionType == Logic.HandAction.Peng){
                    var tIndex = one.tIndex;
                    var cardNum = handShap[tIndex];
                    if(cardNum == 1){
                        var detail = {};
                        detail.pos = pos;
                        detail.tIndex = tIndex;
                        detail.actionType = Logic.HandAction.GuoluGang;
                        details.push(detail);
                    }
                }
            }
            if(details.length != 0)action[Logic.HandAction.GuoluGang] = details;
        }

        // {//判断自摸
        //     var handCards = this.handCards[pos];
        //     var isHu = Rule.Majiang.hu(handCards);
        //     if(isHu){//胡了
        //         var detail = action[Logic.HandAction.Zimo] = {};
        //         detail.pos = pos;
        //         detail.tIndex = tIndex;
        //         detail.actionType = Logic.HandAction.Zimo;
        //     }
        // }
        return action;
    }

    getActionWithCard(pos,cardIndex){//判定别人打出来的牌
        var action = {};
        var tIndex = Majiang.tIndex(cardIndex);
        var cardNum = this.handCards[pos][tIndex];
        {//碰
            if (cardNum == 2){
                var detail = action[Logic.HandAction.Peng] = {};
                detail.pos = pos;
                detail.tIndex = tIndex;
                detail.hitPos = this.toHitPos;
                detail.actionType = Logic.HandAction.Peng;
            }
        }

        {//明杠
            if (cardNum == 3){
                var detail = action[Logic.HandAction.MingGang] = {};
                detail.pos = pos;
                detail.tIndex = tIndex;
                detail.hitPos = this.toHitPos;
                detail.actionType = Logic.HandAction.MingGang;
            }

        }

        return action;

    }

    getAllActionWithCard(hitPos,cardIndex){
        var actions = {};
        this.tab.eachPos(function (pos) {
            if (pos == hitPos)return;
            var action = this.getActionWithCard(pos,cardIndex);
            var nums = Object.keys(action);
            if (nums != 0)actions[pos] = action;
        }.bind(this));
        return actions;
    }

    waitingP(){
        if (this.tab.room.getFreePos() == null){
            console.log("满人了，游戏开始");
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

        // console.log("发到手里的牌%o",this.rawHandCards);
        // console.log("牌型:%o",this.handCards);
        this.tab.eachPos(function (pos) {
            var pId = this.tab.getPidWithPos(pos);
            var cards13 = Object.keys(this.rawHandCards[pos]);// .slice(0,13);
            this.sendSpecialAndSave(pId,Message.startCards,{cardIndexs:cards13});
        }.bind(this))

        this.touchIndex = 54;
        this.mainPos = 3;//逻辑位置是2，对应客户端自己第一个打牌
        this.touchAndDealHandAction(this.mainPos);
        // this.touchCard(this.mainPos);
        // this.toHitCard(this.mainPos);
    }

    washPTest(){
        console.log("进入配牌阶段！");
        this.washCards = [];

        var pos0 = [];
        var pos1 = [];
        var pos2 = [];
        var pos3 = [];

        {//碰
            this.washCards = [41,42,43,44];
            this.touchIndex = 0;
            this.mainPos = 3;
            pos0 = [11,12,13,14,15,16,17,18,19,45,42,43,44];
            pos1 = [61,62,63,64,65,66,67,68,69,95,92,93,94];
            pos2 = [111,112,113,114,115,116,117,118,119,145,142,143,144];
            pos3 = [161,162,163,164,165,166,167,168,169,91,141,193,194];

            for(var i = 0;i<13;i++){
                this.manageCard(0,pos0[i]);
                this.manageCard(1,pos1[i]);
                this.manageCard(2,pos2[i]);
                this.manageCard(3,pos3[i]);
            }
            this.tab.eachPos(function (pos) {
                console.log("pos"+pos);
                var pId = this.tab.getPidWithPos(pos);
                var cards13 = Object.keys(this.rawHandCards[pos]);
                this.sendSpecialAndSave(pId,Message.startCards,{cardIndexs:cards13});
                if(pos == 3)console.log(cards13);
            }.bind(this))

            this.touchCard(this.mainPos);
            this.toHitCard(this.mainPos);
        }

        {//暗杠
            // this.washCards = [41,42,43,44];
            // this.touchIndex = 0;
            // this.mainPos = 3;
            // pos0 = [11,12,13,14,15,16,17,18,19,45,42,43,44];
            // pos1 = [61,62,63,64,65,66,67,68,69,95,92,93,94];
            // pos2 = [111,112,113,114,115,116,117,118,119,145,142,143,144];
            // pos3 = [161,162,163,164,165,166,167,168,169,91,141,191,194];
            //
            // for(var i = 0;i<13;i++){
            //     this.manageCard(0,pos0[i]);
            //     this.manageCard(1,pos1[i]);
            //     this.manageCard(2,pos2[i]);
            //     this.manageCard(3,pos3[i]);
            // }
            // this.tab.eachPos(function (pos) {
            //     var pId = this.tab.getPidWithPos(pos);
            //     var cards13 = Object.keys(this.rawHandCards[pos]);
            //     this.sendSpecialAndSave(pId,Message.startCards,{cardIndexs:cards13});
            //     if(pos == 3)console.log(cards13);
            // }.bind(this));
            // this.touchAndDealHandAction(this.mainPos);
            // this.touchCard(this.mainPos);
            // this.toHitCard(this.mainPos);
        }

        {//明杠
            // this.washCards = [41,42,43,44];
            // this.touchIndex = 0;
            // this.mainPos = 2;
            // pos0 = [11,12,13,14,15,16,17,18,19,45,42,43,44];
            // pos1 = [61,62,63,64,65,66,67,68,69,95,92,93,94];
            // pos2 = [111,112,113,114,115,116,117,118,119,141,142,143,144];
            // pos3 = [161,162,163,164,165,166,167,168,169,91,141,191,194];
            //
            // for(var i = 0;i<13;i++){
            //     this.manageCard(0,pos0[i]);
            //     this.manageCard(1,pos1[i]);
            //     this.manageCard(2,pos2[i]);
            //     this.manageCard(3,pos3[i]);
            // }
            // this.tab.eachPos(function (pos) {
            //     var pId = this.tab.getPidWithPos(pos);
            //     var cards13 = Object.keys(this.rawHandCards[pos]);
            //     this.sendSpecialAndSave(pId,Message.startCards,{cardIndexs:cards13});
            //     if(pos == 3)console.log(cards13);
            // }.bind(this))
            // this.touchCard(this.mainPos);
            // this.toHitCard(this.mainPos);
        }

        {//过路杠
            //-------------------0   1  2  3
            // this.washCards = [41,42,43,44,191];
            // this.touchIndex = 0;
            // this.mainPos = 2;
            // pos0 = [11,12,13,14,15,16,17,18,19,45,42,43,44];
            // pos1 = [61,62,63,64,65,66,67,68,69,95,92,93,94];
            // pos2 = [111,112,113,114,115,116,117,118,119,145,142,143,144];
            // pos3 = [161,162,163,164,165,166,167,168,169,91,141,192,194];
            //
            // for(var i = 0;i<13;i++){
            //     this.manageCard(0,pos0[i]);
            //     this.manageCard(1,pos1[i]);
            //     this.manageCard(2,pos2[i]);
            //     this.manageCard(3,pos3[i]);
            // }
            // this.tab.eachPos(function (pos) {
            //     var pId = this.tab.getPidWithPos(pos);
            //     var cards13 = Object.keys(this.rawHandCards[pos]);
            //     this.sendSpecialAndSave(pId,Message.startCards,{cardIndexs:cards13});
            //     if(pos == 3)console.log(cards13);
            // }.bind(this))
            // this.touchAndDealHandAction(this.mainPos)
        }

        {//点炮测试
            // this.washCards = [41,42,43,44,191];
            // this.touchIndex = 0;
            // this.mainPos = 2;
            // pos0 = [11,12,13,14,15,16,17,18,19,45,42,43,44];
            // pos1 = [61,62,63,64,65,66,67,68,69,95,92,93,94];
            // pos2 = [111,112,113,114,115,116,117,118,119,145,142,143,144];
            // pos3 = [161,162,163,164,165,166,167,168,169,171,172,173,191];
            //
            // for(var i = 0;i<13;i++){
            //     this.manageCard(0,pos0[i]);
            //     this.manageCard(1,pos1[i]);
            //     this.manageCard(2,pos2[i]);
            //     this.manageCard(3,pos3[i]);
            // }
            // this.tab.eachPos(function (pos) {
            //     var pId = this.tab.getPidWithPos(pos);
            //     var cards13 = Object.keys(this.rawHandCards[pos]);
            //     this.sendSpecialAndSave(pId,Message.startCards,{cardIndexs:cards13});
            //     if(pos == 3)console.log(cards13);
            // }.bind(this))
            // this.touchAndDealHandAction(this.mainPos)
        }

        {//自摸测试
            // this.washCards = [42,41,43,44,191];
            // this.touchIndex = 0;
            // this.mainPos = 2;
            // pos0 = [11,12,13,14,15,16,17,18,19,45,42,43,44];
            // pos1 = [61,62,63,64,65,66,67,68,69,95,92,93,94];
            // pos2 = [111,112,113,114,115,116,117,118,119,145,142,143,144];
            // pos3 = [161,162,163,164,165,166,167,168,169,171,172,173,191];
            //
            // for(var i = 0;i<13;i++){
            //     this.manageCard(0,pos0[i]);
            //     this.manageCard(1,pos1[i]);
            //     this.manageCard(2,pos2[i]);
            //     this.manageCard(3,pos3[i]);
            // }
            //
            // this.tab.eachPos(function (pos) {
            //     var pId = this.tab.getPidWithPos(pos);
            //     var cards13 = Object.keys(this.rawHandCards[pos]);
            //     this.sendSpecialAndSave(pId,Message.startCards,{cardIndexs:cards13});
            //     if(pos == 3)console.log(cards13);
            // }.bind(this))
            // this.touchAndDealHandAction(this.mainPos)
        }

    }

    hitP(){
        if (!this.action.isRespond(this.toHitPos)){
            var time = Date.now();
            if (time - this.action.actionTime > this.hitTimeOut){//超时自动出牌

                var  hitIndex = this.getRandomHitCard(this.toHitPos);
                this.action.setRespond(this.toHitPos,hitIndex);
            }
            return;
        }
        var cardIndex = this.action.getRespond(this.toHitPos);
        //移除手里的牌
        this.unManageCard(this.toHitPos,cardIndex);
        this.sendGroupAndSave([],Message.hitCard,{pos: this.toHitPos,cardIndex:cardIndex});

        //要判断其他三家是否有动作，基于这张牌
        var handActions = this.getActionWithCard(this.toHitPos,cardIndex);
        if (handActions.length != 0){
            this.toWaitAction(handActions);
        } else {
            var nextPos = this.tab.getNextPos(this.toHitPos);
            this.touchAndDealHandAction(nextPos);
        }
    }

    actionP(action){
        // var waitingPoss = this.action.getWaitPoss();
        // for (var idx in waitingPoss){
        //     var pos = waitingPoss[idx];
        //     if (!this.action.isRespond(pos))return;
        // }
        // var resData = this.action.getRespond(pos);
        // this.handleAction(pos,resData.actionType,resData.tIndex);

        // if (waitingPoss.length == 1){//只有一个人有工作，通常是刚碰等
        //     //所有等待玩家都答复了
        //     var realPos = waitingPoss[0];
        //     var resData = this.action.getRespond(realPos);
        //     // if (resData.actionType != Logic.HandAction.Dianpao)
        //
        // }

    }

    update(){
        this.staM.update();
    }

}

Logic.HandAction = {
    Pass:0,
    Peng:1,
    AnGang:2,
    GuoluGang:3,
    MingGang:4,
    Dianpao:5,//点炮胡
    Zimo:6//自摸胡
}

module.exports = Logic;
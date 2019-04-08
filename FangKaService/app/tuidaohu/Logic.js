
var StaM = require("./../../core/StateManger.js");
var Majiang = require("./../share/Chess").Majiang;
var UnitTools = require("./../../core/UnitTools.js");

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
        this.staM = new StaM();
        this.staM.registerState(1,this.waitingP.bind(this));//1表示等待
        this.staM.registerState(2,this.washP.bind(this));//2表示洗牌
        this.staM.registerState(3,this.hitP.bind(this));//3表示出牌等待
        this.staM.changeToState(1);
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
        console.log("发到手里的牌%o",this.rawHandCards);
        console.log("牌型：%o",this.handCards);
        this.staM.changeToState(3);
    }
    hitP(){

    }
    update(){
        this.staM.update();
    }

}

module.exports = Logic;
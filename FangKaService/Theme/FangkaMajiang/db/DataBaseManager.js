/**
 * Created by litengfei on 2017/12/14.
 */
var MongooseAsync = require("../../../core/MongooseAsync.js")
var Config = require("../../../core/Config.js")
var UnitTools = require("../../../core/UnitTools");

class DataBaseManager {
    constructor() {
        this.inited = false;

    }

    static instance() {
        if (DataBaseManager.g_Instance == null) {
            DataBaseManager.g_Instance = new DataBaseManager();
        }
        return DataBaseManager.g_Instance;
    }

    async initDB(account,pass,ip,port,dbName) {
        if (this.inited) return ;
        this.inited = true;
        this.mog = new MongooseAsync();
        var isOK = await this.mog.connect(account,pass,ip,port,dbName);
        if(isOK){//在这里定义表
            this.mog.makeModel("userinfo",
                {id:Number,openid:String,unionid:String,nickname:String,sex:Number,headimgurl:String,account:String,pass:String,loginTime:Date,createTime:Date,score:Number})//id account pass logintime createtime score

            return Promise.resolve(true)
        }
        return Promise.resolve(false);
    }

    async initDBFromServerConfig(){
        var dbConfig = Config.getServerConfig()["database"]["mongodb"];
        return await this.initDB(dbConfig.account,dbConfig.pass,dbConfig.ip,dbConfig.port,dbConfig.dbname);
    }

    async createPlayer(id,openid,unionid,nickname,sex,headimgurl,account,pass,score){
        var userInfoModel = this.mog.getModle("userinfo");
        var newPlayer = new userInfoModel();
        newPlayer.id = id;
        newPlayer.openid = openid;
        newPlayer.unionid = unionid;
        newPlayer.nickname = nickname;
        newPlayer.headimgurl = headimgurl;
        newPlayer.account = account;
        newPlayer.pass = pass;
        newPlayer.score = score;
        newPlayer.sex = sex;
        newPlayer.loginTime = new Date();
        newPlayer.createTime = new Date();
        var info =  await newPlayer.save().catch(function (e) {
            info = null;
        })
        return Promise.resolve(info);
    }

    async canLogin(account,pass,options = {id:1,_id:0}){
        var userInfoModel = this.mog.getModle("userinfo");
        var infos = await userInfoModel.findOne({account:account,pass:pass},options).lean().catch(function (e) {
            infos = null;
        })
        return Promise.resolve(UnitTools.deepCopy(infos));
    }

    async findPlayer(account,options){
        var userInfoModel = this.mog.getModle("userinfo");
        var infos = await userInfoModel.findOne({account:account},options).catch(function (e) {
            infos = null;
        })
        return Promise.resolve(infos);
    }

    async findPlayerWithId(playerId,options){
        var userInfoModel = this.mog.getModle("userinfo");
        var infos = await userInfoModel.findOne({id:playerId},options).lean().catch(function (e) {
            infos = null;
        })
        return Promise.resolve(infos);
    }

    async findPlayerWithOpenId(openId){
        var userInfoModel = this.mog.getModle("userinfo");
        var infos = await userInfoModel.findOne({openid:openId}).catch(function (e) {
            infos = null;
        })
        return Promise.resolve(infos);
    }

    async updatePlayerWithOpenId(openId,values){
        var userInfoModel = this.mog.getModle("userinfo");
        var info = await userInfoModel.update({openid:openId},values).catch(function (e) {
            info = null;
        })
        return Promise.resolve(info);
    }
}
DataBaseManager.g_Instance = null;

module.exports = DataBaseManager;

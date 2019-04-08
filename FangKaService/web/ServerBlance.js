/**
 * Created by litengfei on 2017/12/17.
 */
var Config = require("./../core/Config.js");
var ConsistentHash = require('consistent-hash')

class ServerBlance{
    constructor(){
        this.hrs = {};
        this.initFromServerConf();
    }
    static getInstance(){
        if(ServerBlance.g_Instance === null){
            ServerBlance.g_Instance = new ServerBlance();
        }
        return ServerBlance.g_Instance;
    }
    initFromServerConf(){
       var config = Config.getServerConfig();
       config = config.serverblance;
       for(var serviceName in config){
           var ips = config[serviceName];
           for(var index in ips){
               var oneIp = ips[index];
               this.addIP(serviceName,oneIp);
           }
       }
    }

    addIP(serviceName,ip){
        var hr;
        if(typeof this.hrs[serviceName] === "undefined"){
            hr = new ConsistentHash({range:100});
            this.hrs[serviceName] = hr;
        }
       hr = this.hrs[serviceName];
       hr.add(ip);
    }

    getIp(serviceName,id){//后期使用的是微信，所以，实际到时候这里传递的是微信登录后的uuid
        var hr = this.hrs[serviceName];
        return hr.get(id);
    }
}

ServerBlance.g_Instance = null;

module.exports = ServerBlance;
var app = require("./../core/app.js").instance;
var Ids = require("./../core/IDs.js");
var Config = require("./../core/Config.js");

var idGenerater = new Ids();
idGenerater.initFromTableIdConfig();

var safeCode = Config.getServerConfig()["safeCode"];

var idWithGmUrl = {};

module.exports = function () {
    var onStart = function (serverID, serviceType, serverIP, serverPort, custom) {

    }

    var onClientIn = function (session) {

    }

    var onClientOut = function (session) {
    }

    var service = {};

    service.getTableId = async function (gameUrl, serverCode, cb) {
        if (safeCode !== serverCode) {
            cb({ok: false});
            return;
        }

        var newId = await idGenerater.getTableId();
        idWithGmUrl[newId] = gameUrl;
        cb({ok: true, suc: true, tableId: newId});
    }

    service.getTabGameUrl = function (tabId,serverCode,cb) {
        cb({ok:true,suc:true,gameUrl:idWithGmUrl[tabId]});
    }

    return {
        service: service, onClientIn: onClientIn, onClientOut: onClientOut, onStart: onStart
    };
}
var app = require("./../core/app.js").instance;
var Ids = require("./../core/IDs.js");
var Config = require("./../core/Config.js");

var idGenerater = new Ids();
idGenerater.initFromTableIdConfig();

var safeCode = Config.getServerConfig()["safeCode"];

module.exports = function () {
    var onStart = function (serverID, serviceType, serverIP, serverPort, custom) {

    }

    var onClientIn = function (session) {

    }

    var onClientOut = function (session) {
    }

    var service = {};

    service.getTableId = async function (serverCode, cb) {
        if (safeCode !== serverCode) {
            cb({ok: false});
            return;
        }
        var newId = await idGenerater.getTableId();
        cb({ok: true, suc: true, tableId: newId});
    }

    return {
        service: service, onClientIn: onClientIn, onClientOut: onClientOut, onStart: onStart
    };
}
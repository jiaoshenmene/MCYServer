/**
 * Created by litengfei on 2017/12/14.
 */
var DataBaseManager = require("./../Theme/FangkaMajiang/db/DataBaseManager")
var Assert = require("assert")

describe('测试数据库连接', function () {
        var ins = DataBaseManager.instance();
        it('必须返回true', async function () {
            var ok = await ins.initDB("root", "123456", "127.0.0.1", "27017", "majiang");
            Assert.equal(true, ok);
        });

        it("创建一个用户成功", async function () {
            var okInfo = await ins.createPlayer(123456, "jidan", "123456", 0);
            Assert.equal(okInfo.account, "jidan")
        })
        //
        // it("查询账号为jidan的玩家", async function () {
        //     var okInfo = await ins.findPlayer("jidan");
        //     Assert.equal(okInfo[0].account, "jidan")
        // })
    }
)
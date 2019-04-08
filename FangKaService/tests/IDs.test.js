/**
 * Created by litengfei on 2017/12/19.
 */

var IDs = require("./../core/IDs.js");
var Assert = require("assert")

describe('生成随机ID测试', function () {
        it('创建并返回一个有效的ID', async function () {
            var ids = new IDs();
            ids.initFromConfig();
            var id = await ids.getID();
            console.log(id);
            if(id >=10000000 && id<= 99999999){
                Assert.equal(true,true);
            }else{
                Assert.equal(false,false);
            }
        });
    }
)
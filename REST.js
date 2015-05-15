var mysql   = require("mysql");

function REST_ROUTER(router,connection,md5) {
    var self = this;
    self.handleRoutes(router,connection,md5);
}

REST_ROUTER.prototype.handleRoutes = function(router,connection,md5) {
    var self = this;
    router.get("/",function(req,res){
        res.json({"Message" : "Hello World !"});
    });
    router.get("/data/:token/:user_id",function(req,res){
        console.log(req.params.token);
        var query = "SELECT * FROM TOKEN WHERE token=?";
        var table = [req.params.token];        
        query = mysql.format(query,table);
        connection.query(query,function(err,rows){
            if(err) {
                res.json({"Error" : true, "Message" : "Error executing MySQL query"});
            } else {
                if (rows.length === 0) {
                    res.json({"Error" : true, "Message" : "Wrong tokens"});
                } else {
                    query = mysql.format("SELECT * FROM ?? ORDER BY UploadTime DESC LIMIT 100", ["n" + req.params.user_id]);
                    connection.query(query,function(err,rows){
                        if(err) {
                            res.json({"Error" : true, "Message" : "Error executing MySQL query"});
                        } else {
                            res.json({"Error" : false, "Message" : "Success", "Data" : rows});
                        }
                    });
                }
            }
        });
    });
}

module.exports = REST_ROUTER;

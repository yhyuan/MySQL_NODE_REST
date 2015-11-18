var mysql   = require("mysql");
var _ = require('underscore')
var Q = require("q");

function REST_ROUTER(router,connection,md5) {
    var self = this;
    self.handleRoutes(router,connection,md5);
}

var queryWithPromise = function (connection, query) {
    var deferred = Q.defer();
    connection.query(query, function(err, rows, fields) {
        if (err) {
//console.log(query);
            deferred.reject(err);
        };
        if (!rows||(rows.length === 0)) {
          deferred.reject("No record!");  
        }
        deferred.resolve(rows);
    });
    return deferred.promise;    
};


REST_ROUTER.prototype.handleRoutes = function(router,connection,md5) {
    var self = this;
    router.get("/",function(req,res){
        res.json({"Message" : "Hello World !"});
    });
    router.get("/data/:token/:latlng",function(req,res){
//        console.log(req.params.token);
        query = mysql.format("SELECT * FROM TOKEN WHERE token=?",[req.params.token]);
        queryWithPromise(connection, query).then(function (tokens) {
            //console.log(tokens);
            var latlngs = req.params.latlng.split(',');
            var lat = parseFloat(latlngs[0]);
            var lng = parseFloat(latlngs[1]);
            var queryLatLng = mysql.format("SELECT * FROM device WHERE longitude > ? AND longitude < ? AND latitude > ? AND latitude < ?", [lng-0.1, lng+0.1, lat-0.1, lat+0.1]);
            return queryWithPromise(connection, queryLatLng);
        }).then(function (devices) {
            //console.log(tokens);
            var latlngs = req.params.latlng.split(',');
            var computeDistance = function (fromLatlng, toLatlng) {
                var toRad = function (degree) {
                    return degree * Math.PI / 180;
                };                
                var EARTH_RADIUS = 6378137; // in meter
                var lat1 = toRad(fromLatlng.lat);
                var lng1 = toRad(fromLatlng.lng);
                var lat2 = toRad(toLatlng.lat);
                var lng2 = toRad(toLatlng.lng);
                var d = EARTH_RADIUS*Math.acos(Math.sin(lat1)*Math.sin(lat2) + Math.cos(lat1)*Math.cos(lat2)*Math.cos(lng1 - lng2));
                return d;
            };
            var closestDevice = _.min(devices, function(device) {
                return computeDistance({lat: parseFloat(latlngs[0]), lng: parseFloat(latlngs[1])}, {lat: device.latitude, lng: device.longitude});
            });
            var queryDevice = mysql.format("SELECT * FROM ?? ORDER BY UploadTime DESC LIMIT 100", ["" + closestDevice.device_id]);
            return queryWithPromise(connection, queryDevice);
        }).then(function (data) {
            var latlngs = req.params.latlng.split(',');            
            res.json({
                "latitude": parseFloat(latlngs[0]),
                "longitude": parseFloat(latlngs[1]),
                "timezone": "Asia/Shanghai",
                "offset": 8,
                 "hourly": {
                    "data": _.map(data, function(item) {
                        return {
                            "time": item.UploadTime.getTime()/1000, 
                            "precipIntensity": item.rainfall,
                            "temperature": item.airtemp,
                            "humidity": item.airhumidity,
                            "windSpeed": item.windspeed,
                            "windBearing": item.winddirection,
                            "pressure": item.atmosphericpressure,
                            "soiltemp": item.soiltemp,
                            "soilhumidity": item.soilhumidity
                        };
                    })
                 }
            });
        }).catch(function (error) {
            res.json({"Error" : true, "Message" : "Success", "Data" : error});
        })
        .done(function () {     
//            connection.release();  
         });
    });
}

module.exports = REST_ROUTER;

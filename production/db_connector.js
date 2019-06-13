var mysql = require('mysql');
var db_credentials = require('./db_credentials');

var pool = db_credentials.pool;

module.exports = {

	getAllSeriesData(callback){
		this._query("SELECT * FROM series",null,callback);
	},
	insertSeriesData(new_series_id,new_series_name, callback){
		var t = this;
		this._query("INSERT INTO series (series_id, series_name) VALUES (?,?)",[new_series_id, new_series_name],function(err, data){
			callback(err, {"series_id":new_series_id});
		});
	},
	_toJSON(data){
		return JSON.parse(JSON.stringify(data));
	},
	_query(sql, params, callback){
		var t = this;
		pool.getConnection(function(err, connection){
			if(err){
				connection.release();
				callback(err);
				return 
			}
			connection.query(sql, params, function(err, rows){
				connection.release();
				if(err){
					console.log("error in query")
					callback(err);
					return
				}
				console.log("the query is good")
				callback(null, t._toJSON(rows));
				return 
			});
		});

	}
}


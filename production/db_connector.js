var mysql = require('mysql');
var db_credentials = require('./db_credentials');

var pool = db_credentials.pool;

module.exports = {

	getAllSeriesData(callback){
		this._query("SELECT * FROM `series`",null,callback);
	},
	insertSeries(new_series_id,new_series_name, callback){
		this._query("INSERT INTO series (series_id, series_name) VALUES (?,?)",[new_series_id, new_series_name],function(err, data){
			callback(err, {
				"series_id":new_series_id,
				"series_name":name_series_name
			});
		});
	},
	getAllCharacterData(series_ids, callback){
		if(series_ids ){
			var ids = "";
			series_ids.forEach(function(id){ ids += id.toString() + ","});
			this._query("SELECT * FROM `character` WHERE series_id IN (?)",ids.slice(0, -1),callback);
		}else{
			this._query("SELECT * FROM `character`",null,callback);
		}
		
	},
	insertNewCharacter(new_character_id,new_character_name,series_id, callback){
		this._query("INSERT INTO `character` (character_id, character_name, series_id) VALUES (?,?,?)",[new_character_id, new_character_name, series_id],function(err, data){
			callback(err, {
				"character_id":new_character_id,
				"character_name":new_character_name, 
				"series_id":series_id});
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
					callback(err);
					return
				}
				callback(null, t._toJSON(rows));
				return 
			});
		});

	}
}


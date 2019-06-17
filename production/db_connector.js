var mysql = require('mysql');
var db_credentials = require('./db_credentials');

var pool = db_credentials.pool;


var TABLES = {
	'episode':{
		"episode_id": "number",
		"episode_name": "string",
		"season": "number",
		"episode": "number",
		"air_date": "number"
	}, 
	'category':{
		"category_id":"number",
		"category_name":"string"
	}, 
	'character':{
		"series_id":"number",
		"character_name":"string",
		"character_id":"number"
	}, 
	'series':{
		"series_id":"number",
		"series_name":"string"
	}, 
};

module.exports = {

	TABLES : TABLES,

	getAllSeriesData(callback){
		this._query("SELECT * FROM `series`",null,callback);
	},
	insertSeries(new_series_id,new_series_name, callback){
		this._query("INSERT INTO series (series_id, series_name) VALUES (?,?)",[new_series_id, new_series_name],function(err, data){
			callback(err, {
				"series_id":new_series_id,
				"series_name":new_series_name
			});
		});
	},
	getAllCharacterData(series_ids, callback){
		if(series_ids ){
			var ids = "";
			this._query("SELECT * FROM `character` WHERE "+this._multipleConditions('series_id',series_ids),null,callback);
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

	getAllCategoryData(callback){
		this._query("SELECT * FROM `category`",null,callback);
	},
	insertNewCategory(new_category_id,new_category_name, callback){
		this._query("INSERT INTO `category` (category_id, category_name) VALUES (?,?)",[new_category_id, new_category_name],function(err, data){
			callback(err, {
				"category_id":new_category_id,
				"category_name":new_category_name
			});
		});
	},
	
	getAllEpisodeData(series_ids, callback){
		if(series_ids ){
			var ids = "";
			series_ids.forEach(function(id){ ids += id.toString() + ","});
			this._query("SELECT * FROM `episode` WHERE "+this._multipleConditions('series_id',series_ids),null,callback);
		}else{
			this._query("SELECT * FROM `episode`",null,callback);
		}
	},
	getEpisodeData(episode_id, callback){
		this._query("SELECT * FROM `episode` WHERE "+this._multipleConditions('episode_id',episode_id),null,callback);
	},
	insertNewEpisode(new_episode_id,new_episode_name, series_id,  season, episode, air_date,callback){
		this._query("INSERT INTO `episode` (episode_id, episode_name,series_id,season, episode, air_date) VALUES (?,?,?,?,?,?)",[new_episode_id, new_episode_name,series_id,season, episode, air_date],function(err, data){
			callback(err, {
				"episode_id":new_episode_id,
				"episode_name":new_episode_name
			});
		});
	},

	getAllTimestampIds(episode_ids, callback){
		if(episode_ids ){
			var ids = "";
			this._query("SELECT timestamp_id FROM `timestamp` WHERE "+this._multipleConditions('episode_id',episode_ids),null,callback);
		}else{
			this._query("SELECT timestamp_id FROM `timestamp`",null,callback);
		}
	},
	getTimestampData(timestamp_id, callback){
		var ids = "";
		this._query("SELECT * FROM `timestamp` WHERE "+this._multipleConditions('timestamp_id',[timestamp_id]),null,callback);
	},
	getAllTimestampDataForEpisode(episode_ids, callback){
		if(episode_ids ){
			var ids = "";
			this._query("SELECT * FROM `timestamp` WHERE "+this._multipleConditions('episode_id',episode_ids),null,callback);
		}else{
			this._query("SELECT * FROM `timestamp`",null,callback);
		}
	},
	insertNewTimestamp(new_timestamp_id,new_start_time, new_episode_id,callback){
		this._query("INSERT INTO `timestamp` (timestamp_id, start_time, episode_id) VALUES (?,?,?)",[new_timestamp_id,new_start_time, new_episode_id],function(err, data){
			callback(err, {
				"timestamp_id":new_timestamp_id,
				"start_time":new_start_time,
				"episode_id":new_episode_id
			});
		});
	},

	insertTimestampCharacter(timestamp_id, characters, callback){
		var values = "";
		characters.forEach(function(ch){values += "(" + timestamp_id + ", "+ch + "),"});
		this._query("INSERT INTO `timestamp_characters` (timestamp_id, character_id) VALUES "+values.slice(0,-1),null,function(err, data){
			callback(err, characters);
		});
	},
	removeTimestampCharacter(timestamp_id, callback){
		this._query("DELETE FROM `timestamp_characters`WHERE "+this._multipleConditions('timestamp_id',timestamp_id),null,callback);
	},
	getTimestampCharacter(timestamp_id, character_id, callback){
		var timestamp_value = (timestamp_id ? this._multipleConditions('timestamp_id',timestamp_id) : "")
		var characters_value = (character_id ? this._multipleConditions('character_id',character_id) : "")
		var or = (timestamp_id && character_id ? " OR ": "");

		this._query("SELECT DISTINCT * FROM `timestamp_characters` WHERE "+timestamp_value+or+characters_value,null,callback);
	},

	insertTimestampCategory(timestamp_id, categories, callback){
		var values = "";
		categories.forEach(function(ch){values += "(" + timestamp_id + ", "+ch + "),"});
		this._query("INSERT INTO `timestamp_category` (timestamp_id, category_id) VALUES "+values.slice(0,-1),null,function(err, data){
			callback(err, categories);
		});
	},
	removeTimestampCategory(timestamp_id, callback){
		this._query("DELETE FROM `timestamp_category`WHERE "+this._multipleConditions('timestamp_id',timestamp_id),null,callback);
	},
	getTimestampCategory(timestamp_id, category_id, callback){
		var timestamp_value = (timestamp_id ? this._multipleConditions('timestamp_id',timestamp_id) : "")
		var category_value = (category_id ? this._multipleConditions('category_id',category_id) : "")
		var or = (timestamp_id && category_id ? " OR ": "");

		this._query("SELECT DISTINCT * FROM `timestamp_category` WHERE "+timestamp_value+or+category_value,null,callback);
	},

	_multipleConditions(atr, ids){
		var conditions = ""
		ids.forEach(function(id){conditions += atr + " = "+ id + " OR "})
		return conditions.slice(0,-3)
	},
	_toJSON(data){
		return JSON.parse(JSON.stringify(data));
	},
	_query(sql, params, callback){
		var t = this;
		pool.query(sql, params, function(err, results){
			if(err){
				callback(err)
			}
			else{
				callback(null, t._toJSON(results))
			}
		});
	}
}


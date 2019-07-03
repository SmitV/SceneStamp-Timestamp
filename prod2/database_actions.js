var mysql = require('mysql');
var db_credentials = require('./credentials');

var pool = db_credentials.pool;

var TABLES = {
	'episode':{
		"episode_id": "number",
		"episode_name": "string",
		"season": "number",
		"episode": "number",
		"air_date": "number",
		"series_id":"number"
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
	'timestamp':{
		"timestamp_id":"number",
		"start_time":"number",
		"episode_id":"number"
	}
};


/**
GENERAL DESIGN
 Each sql function will call the provided callback with the data retreived, or it will pass an additional error object
 Will get callbacks and set errors in the passed baton
 */

module.exports = {

	TABLES: TABLES,

	getAllSeriesData(baton, callback){

		baton.addMethod(this._formatMethod('getAllSeriesData'))
		this._selectQuery('series', null,null,baton, callback)
	},
	insertSeries(baton,values, callback){
		this._insertQuery('series',values, baton, function(){
			callback(values)
		});
	},

	getAllEpisodeData(baton, series_ids, callback){
		baton.addMethod(this._formatMethod('getAllEpisodeData'))
		this._selectQuery('episode', null,(series_ids ? {'series_id':series_ids} : null),baton, callback)
	},
	insertEpisode(baton,values, callback){
		baton.addMethod(this._formatMethod('insertEpisode'))
		this._insertQuery('episode',values, baton, function(){
			callback(values)
		});
	},
	getAllCharacterData(baton, series_ids, callback){
		baton.addMethod(this._formatMethod('getAllCharacterData'))
		this._selectQuery('character', null,(series_ids ? {'series_id':series_ids} : null),baton, callback)
	},
	insertCharacter(baton,values, callback){
		baton.addMethod(this._formatMethod('insertCharacter'))
		this._insertQuery('character',values, baton, function(){
			callback(values)
		});
	},
	getAllCategoryData(baton, series_ids, callback){
		baton.addMethod(this._formatMethod('getAllCategoryData'))
		this._selectQuery('category', null,(series_ids ? {'series_id':series_ids} : null),baton, callback)
	},
	insertCategory(baton,values, callback){
		baton.addMethod(this._formatMethod('insertCategory'))
		this._insertQuery('category',values, baton, function(){
			callback(values)
		});
	},

	getAllTimestampData(baton, episode_ids, timestamp_ids,callback){
		baton.addMethod(this._formatMethod('getAllTimestampData'))
		var data = {}
		data.episode_id = (episode_ids ? episode_ids : null)
		data.timestamp_id = (timestamp_ids ? timestamp_ids : null)
		this._selectQuery('timestamp', null,data,baton, callback)
	},
	insertTimestamp(baton,values, callback){
		baton.addMethod(this._formatMethod('insertTimestamp'))
		this._insertQuery('timestamp',values, baton, function(){
			callback(values)
		});
	},

	_insertQuery(table, values, baton, callback){

		var attr_string = ""
		var values_string =""
		var value_array = []
		Object.keys(values).forEach(function(attr){
			attr_string += attr + ','
			values_string += "?,"
			value_array.push(values[attr])
		})
		this._makequery("INSERT INTO `"+table+"` ("+attr_string.slice(0,-1)+") VALUES"+"("+values_string.slice(0,-1)+")",value_array,baton, callback)
	},

	/**
	 * Makes the SELECT _query
	 * @param {string} table name of the table to get data
	 * @param {string[]} attributes list of attributes to select from table
	 * @param {json} conditions key is the attribute, value is an array of values for the conditions
	 * @param {function} callback returning function with resulting data
	 */
	_selectQuery(table,attributes, conditions,baton, callback){
		var t = this;
		if(attributes == null) attributes = ['*'];
		if(conditions == null) conditions = {};
		var conditions_string = (conditions == null ? " " : " WHERE ")
		Object.keys(conditions).forEach(function(attr){
			if(conditions[attr]) conditions_string += t._multipleConditions(attr, conditions[attr]) + " OR "
		})
		this._makequery("SELECT "+ attributes.join(',')+ " FROM `"+table+"`"+conditions_string.slice(0,-3),null, baton, callback)
	},

	/**
	 * Returns the intersection of two arrays
	 */
	_intersection(a, b){
		c = [...a.sort()];
		d = [...b.sort()];
		var result = [];
		while( c.length >0 && d.length >0 )
		{
		    if      (c[0] < d[0] ){ c.shift(); }
		    else if (c[0] > d[0] ){ d.shift(); }
		    else /* they're equal */
		    {
		       result.push(c.shift());
		       d.shift();
		    }
		}
		return result;
	},
	/**
	 * Takes atrribute and creates proceeding conditions to append to _query
	 * Assumption that all conditions will need the 'OR' conditional
	 *
 	 */
	_multipleConditions(atr, values){
		var conditions = ""
		values.forEach(function(value){conditions += atr + " = "+ value + " OR "})
		return conditions.slice(0,-3)
	},
	/** makes the query
	 * @param {function} callback function that will return with the data, or a sql error
	 */
	_makequery(sql, values, baton, callback){
		var t = this;
		pool.query(sql, values, function(err, results){
			if(err){
				baton.setError(err, 'An Error Occured During SQL Querying')
				callback(null)
			}
			else{
				callback(t._toJSON(results))
			}
		});
	},
	//converts the qery data to JSON parsable data in array
		_toJSON(data){
		return JSON.parse(JSON.stringify(data));
	},
	_formatMethod(method){
		return 'DB_'+method;
	}
}

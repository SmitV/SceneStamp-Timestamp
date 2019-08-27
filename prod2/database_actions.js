var mysql = require('mysql');
var db_credentials = require('./credentials');

var pool = db_credentials.pool;


//internal use only, used when inserting new data or selecting data
const MAIN_SCHEME = {
	'series': {
		'series_id': {
			'type': 'number',
		},
		'series_name': {
			'type': 'string',
		}
	},
	'episode': {
		'episode_id': {
			'type': 'number',
		},
		'episode_name': {
			'type': 'string',
		},
		'series_id': {
			'type': 'number',
			'optional': true
		},
		'air_date': {
			'type': 'number',
			'optional': true
		},
		'youtube_id': {
			'type': 'string',
			'optional': true
		}
	},
	'category': {
		'category_id': {
			'type': 'number',
		},
		'category_name': {
			'type': 'string',
		},
	},
	'character': {
		'character_id': {
			'type': 'number',
		},
		'character_name': {
			'type': 'string',
		}
	},
	'timestamp': {
		'episode_id': {
			'type': 'number',
		},
		'start_time': {
			'type': 'number',
		},
		'timestamp_id': {
			'type': 'number'
		}
	},
	'timestamp_category': {
		'timestamp_id': {
			'type': 'number',
		},
		'category_id': {
			'type': 'number',
		},
	},
	'timestamp_characters': {
		'timestamp_id': {
			'type': 'number',
		},
		'character_id': {
			'type': 'number',
		},
	},
	'compilation_timestamp': {
		'compilation_id': {
			'type': 'number',
		},
		'timestamp_id': {
			'type': 'number',
		},
		'duration': {
			'type': 'number',
		},
		'start_time': {
			'type': 'number',
		},
	},
	'compilation': {
		'compilation_id': {
			'type': 'number',
		},
		'compilation_name': {
			'type': 'string',
		},
	},
	'user':{
		'user_id':{
			'type': 'number'
		},
		'username':{
			'type':'string'
		},
		'password':{
			'type':'string'
		},
		'email':{
			'type':'string'
		},
		'auth_token':{
			'type':'string',
			'optional':true
		}
	}
}

var DB_SCHEME = MAIN_SCHEME


/**
GENERAL DESIGN
 Each sql function will call the provided callback with the data retreived, or it will pass an additional error object
 Will get callbacks and set errors in the passed baton
 */

module.exports = {

	SCHEME: DB_SCHEME,
	setScheme(scheme) {
		DB_SCHEME = scheme;
	},
	resetScheme() {
		DB_SCHEME = MAIN_SCHEME
	},
	//the above is for testing only

	getAllSeriesData(baton, callback) {

		baton.addMethod(this._formatMethod('getAllSeriesData'))
		this._selectQuery('series', null, null, baton, callback)
	},
	insertSeries(baton, values, callback) {
		this._insertMultipleQuery('series', [values], baton, function() {
			callback(values)
		});
	},

	getAllEpisodeData(baton, series_ids, callback) {
		baton.addMethod(this._formatMethod('getAllEpisodeData'))
		this._selectQuery('episode', null, (series_ids ? {
			'series_id': series_ids
		} : null), baton, callback)
	},
	insertEpisode(baton, values, callback) {
		baton.addMethod(this._formatMethod('insertEpisode'))
		this._insertMultipleQuery('episode', [values], baton, function() {
			callback(values)
		});
	},
	getAllCharacterData(baton, callback) {
		baton.addMethod(this._formatMethod('getAllCharacterData'))
		this._selectQuery('character', null, null, baton, callback)
	},
	insertCharacter(baton, values, callback) {
		baton.addMethod(this._formatMethod('insertCharacter'))
		this._insertMultipleQuery('character', [values], baton, function() {
			callback(values)
		});
	},
	getAllCategoryData(baton, callback) {
		baton.addMethod(this._formatMethod('getAllCategoryData'))
		this._selectQuery('category', null, null, baton, callback)
	},
	insertCategory(baton, values, callback) {
		baton.addMethod(this._formatMethod('insertCategory'))
		this._insertMultipleQuery('category', [values], baton, function() {
			callback(values)
		});
	},
	getAllTimestampData(baton, episode_ids, timestamp_ids, callback) {
		baton.addMethod(this._formatMethod('getAllTimestampData'))
		var data = {}
		data.episode_id = (episode_ids ? episode_ids : null)
		data.timestamp_id = (timestamp_ids ? timestamp_ids : null)
		this._selectQuery('timestamp', null, data, baton, callback)
	},
	insertTimestamp(baton, values, callback) {
		baton.addMethod(this._formatMethod('insertTimestamp'))
		this._insertMultipleQuery('timestamp', [values], baton, function() {
			callback(values)
		});
	},
	getAllTimestampCategory(baton, params, callback) {
		baton.addMethod(this._formatMethod('getAllTimestampCategory'))
		var data = {}
		data.timestamp_id = (params.timestamp_ids ? params.timestamp_ids : null)
		data.category_id = (params.category_ids ? params.category_ids : null)
		data = (Object.keys(data).filter(key => {
			return data[key] != null
		}).length == 0 ? null : data)
		this._selectQuery('timestamp_category', null, data, baton, callback)
	},
	insertTimestampCategory(baton, values, callback) {
		baton.addMethod(this._formatMethod('insertTimestampCategory'))
		this._insertMultipleQuery('timestamp_category', values, baton, function() {
			callback(values)
		});
	},
	removeTimestampCategory(baton, timestamp_ids, callback) {
		baton.addMethod(this._formatMethod('removeTimestampCategory'))
		this._deleteQuery('timestamp_category', (timestamp_ids ? {
			'timestamp_id': timestamp_ids
		} : null), baton, callback)
	},
	getAllTimestampCharacter(baton, params, callback) {
		baton.addMethod(this._formatMethod('getAllTimestampCharacter'))
		var data = {}
		data.timestamp_id = (params.timestamp_ids ? params.timestamp_ids : null)
		data.character_id = (params.character_ids ? params.character_ids : null)
		data = (Object.keys(data).filter(key => {
			return data[key] != null
		}).length == 0 ? null : data)
		this._selectQuery('timestamp_characters', null, data, baton, callback)
	},
	insertTimestampCharacter(baton, values, callback) {
		baton.addMethod(this._formatMethod('insertTimestampCharacter'))
		this._insertMultipleQuery('timestamp_characters', values, baton, function() {
			callback(values)
		});
	},
	removeTimestampCharacter(baton, timestamp_ids, callback) {
		baton.addMethod(this._formatMethod('removeTimestampCategory'))
		this._deleteQuery('timestamp_characters', (timestamp_ids ? {
			'timestamp_id': timestamp_ids
		} : null), baton, callback)
	},
	getAllCompilationData(baton, params, callback) {
		baton.addMethod(this._formatMethod('getAllCompilationData'))
		var data = {}
		data.compilation_id = (params.compilation_ids ? params.compilation_ids : null)
		data.timestamp_id = (params.timestamp_ids ? params.timestamp_ids : null)
		data = (Object.keys(data).filter(key => {
			return data[key] != null
		}).length == 0 ? null : data)
		this._selectQuery('compilation', null, data, baton, callback)
	},
	insertCompilation(baton, values, callback) {
		baton.addMethod(this._formatMethod('insertCategory'))
		this._insertMultipleQuery('compilation', [values], baton, function() {
			callback(values)
		});
	},
	getAllCompilationTimestamp(baton, params, callback) {
		baton.addMethod(this._formatMethod('getAllCompilationTimestamp'))
		var data = {}
		data.compilation_id = (params.compilation_ids ? params.compilation_ids : null)
		data.timestamp_id = (params.timestamp_ids ? params.timestamp_ids : null)
		data = (Object.keys(data).filter(key => {
			return data[key] != null
		}).length == 0 ? null : data)
		this._selectQuery('compilation_timestamp', null, data, baton, callback)
	},

	insertUser(baton, values, callback){
		baton.addMethod(this._formatMethod('insertUser'))
		this._insertMultipleQuery('user', [values], baton, function() {
			callback(values)
		});
	},

	getUserData(baton, params, callback){
		baton.addMethod(this._formatMethod('getUserData'))
		var data = {}
		data.username = (params.username ? [params.username] : null)
		data.auth_token = (params.auth_token ? [params.auth_token] : null)
		this._selectQuery('user', null, data, baton, callback)
	},

	insertCompilationTimestamp(baton, values, callback) {
		baton.addMethod(this._formatMethod('insertCompilationTimestamp'))
		this._insertMultipleQuery('compilation_timestamp', values, baton, function() {
			callback(values)
		});
	},

	_insertMultipleQuery(table, values, baton, callback) {
		var t = this
		var attr_string = Object.keys(DB_SCHEME[table]).map(function(key) {
			return key
		}).join(',')
		var value_array = []
		values.every(function(value) {
			var single_val = []
			Object.keys(DB_SCHEME[table]).every(function(attr) {
				if (value[attr] !== undefined && value[attr] !== null) {
					if (typeof value[attr] !== DB_SCHEME[table][attr].type) {
						baton.setError({
							details: 'DB Actions: type of value not valid',
							table: table,
							attr: attr,
							expected_type: DB_SCHEME[table][attr].type,
							object: value
						})
						callback()
						return false
					}
					single_val.push(value[attr])
					return true

				} else if (DB_SCHEME[table][attr].optional !== true) {
					baton.setError({
						details: 'DB Actions: non-optional value not present',
						table: table,
						attr: attr,
						object: value
					})
					callback()
					return false
				} else {
					single_val.push(null)
					return true;
				}
			})
			value_array.push(single_val)
			if (value_array.length === values.length && baton.err.length === 0) {
				//the values need to be in three arrays 
				// [[[value],[value]]]
				t._makequery("INSERT INTO `" + table + "` (" + attr_string + ") VALUES ?", [value_array], baton, callback)
			} else {
				return true
			}
		})
	},

	_deleteQuery(table, conditions, baton, callback) {
		var t = this;
		var conditions_string = "";
		if (conditions != null) {
			conditions_string = " WHERE "
			Object.keys(conditions).forEach(function(attr) {
				if (conditions[attr]) conditions_string += t._multipleConditions(table, attr, conditions[attr]) + " OR "
			})
		}
		this._makequery("DELETE FROM `" + table + "`" + conditions_string.slice(0, -3), null, baton, callback)
	},

	/**
	 * Makes the SELECT _query
	 * @param {string} table name of the table to get data
	 * @param {string[]} attributes list of attributes to select from table
	 * @param {json} conditions key is the attribute, value is an array of values for the conditions
	 * @param {function} callback returning function with resulting data
	 */
	_selectQuery(table, attributes, conditions, baton, callback) {
		var t = this;
		if (attributes == null) attributes = ['*'];
		var conditions_string = "";
		if (conditions != null) {
			conditions_string = " WHERE "
			Object.keys(conditions).forEach(function(attr) {
				if (conditions[attr]) conditions_string += t._multipleConditions(table, attr, conditions[attr]) + " OR "
			})
		}
		this._makequery("SELECT " + attributes.join(',') + " FROM `" + table + "`" + conditions_string.slice(0, -3), null, baton, callback)
	},

	/**
	 * Returns the intersection of two arrays
	 */
	_intersection(a, b) {
		c = [...a.sort()];
		d = [...b.sort()];
		var result = [];
		while (c.length > 0 && d.length > 0) {
			if (c[0] < d[0]) {
				c.shift();
			} else if (c[0] > d[0]) {
				d.shift();
			} else /* they're equal */ {
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
	_multipleConditions(table, atr, values) {
		var conditions = ""
		values.forEach(function(value) {
			conditions += atr + " = " + (DB_SCHEME[table][atr].type == 'string' ? "'"+value+"'" : value) + " OR "
		})
		return conditions.slice(0, -3)
	},
	/** makes the query
	 * @param {function} callback function that will return with the data, or a sql error
	 */
	_makequery(sql, values, baton, callback) {
		var t = this;
		pool.query(sql, values, function(err, results) {
			if (err) {
				baton.setError(err)
				callback()
			} else {
				callback(t._toJSON(results))
			}
		});
	},
	//converts the qery data to JSON parsable data in array
	_toJSON(data) {
		return JSON.parse(JSON.stringify(data));
	},
	_formatMethod(method) {
		return 'DB_' + method;
	}
}
var mysql = require('mysql');
var db_credentials = require('./credentials');

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
		'creation_time': {
			'retrieve': 'getCreationTime',
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
		},
	},
	'category': {
		'category_id': {
			'type': 'number',
		},
		'category_name': {
			'type': 'string',
			'like_option': true
		},
	},
	'character': {
		'character_id': {
			'type': 'number',
		},
		'character_name': {
			'type': 'string',
			'like_option': true
		}
	},
	'timestamp': {
		'episode_id': {
			'type': 'number',
		},
		'creation_time': {
			'retrieve': 'getCreationTime',
		},
		'start_time': {
			'type': 'number',
		},
		'timestamp_id': {
			'type': 'number'
		},
		'user_id': {
			'retrieve': 'getUserId',
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
		'creation_time': {
			'retrieve': 'getCreationTime',
		},
		'compilation_name': {
			'type': 'string',
		},
	},
	'user': {
		'user_id': {
			'type': 'number'
		},
		'username': {
			'type': 'string'
		},
		'password': {
			'type': 'string'
		},
		'email': {
			'type': 'string'
		},
		'role': {
			'type': 'number',
			'optional': true
		}
	},
	'role': {
		'role_id': {
			'type': 'number'
		},
		'role_name': {
			'type': 'string'
		},
	},
	'action': {
		'action_id': {
			'type': 'number'
		},
		'action_name': {
			'type': 'string'
		}
	},
	'role_action': {
		'role_id': {
			'type': 'number'
		},
		'action_id': {
			'type': 'number'
		},
	},
}

var DB_SCHEME = MAIN_SCHEME

var pools = {
	timestamp: db_credentials.pool,
	user: db_credentials.user_pool
}

var tableToPool = {
	user: pools.user
}



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
	getPool(table) {
		pools = {
			timestamp: db_credentials.pool,
			user: db_credentials.user_pool
		}
		return (tableToPool[table] !== undefined ? tableToPool[table] : pools.timestamp)
	},
	//the above is for testing only

	/*
		auto generated values functions
		any value that isn't passed by the user explicity, but is needed for content creation
		all functions will require baton and callback
		
	*/
	getUserId(baton, callback) {
		callback(baton.user_id)
	},
	getCreationTime(baton, callback) {
		callback(baton.start_time)
	},

	getAllSeriesData(baton, callback) {

		baton.addMethod(this._formatMethod('getAllSeriesData'))
		this._selectQuery(baton, 'series', null, callback)
	},
	insertSeries(baton, values, callback) {
		this._insertMultipleQuery('series', [values], baton, function() {
			callback(values)
		});
	},

	getAllEpisodeData(baton, data, callback) {
		baton.addMethod(this._formatMethod('getAllEpisodeData'))
		this._selectQuery(baton, 'episode', data, callback)
	},
	insertEpisode(baton, values, callback) {
		baton.addMethod(this._formatMethod('insertEpisode'))
		this._insertMultipleQuery('episode', [values], baton, function() {
			callback(values)
		});
	},
	getAllCharacterData(baton, data, callback) {
		baton.addMethod(this._formatMethod('getAllCharacterData'))
		this._selectQuery(baton, 'character', data, callback)
	},
	insertCharacter(baton, values, callback) {
		baton.addMethod(this._formatMethod('insertCharacter'))
		this._insertMultipleQuery('character', [values], baton, function() {
			callback(values)
		});
	},
	getAllCategoryData(baton, data, callback) {
		baton.addMethod(this._formatMethod('getAllCategoryData'))
		this._selectQuery(baton, 'category', data, callback)
	},
	insertCategory(baton, values, callback) {
		baton.addMethod(this._formatMethod('insertCategory'))
		this._insertMultipleQuery('category', [values], baton, function() {
			callback(values)
		});
	},
	getAllTimestampData(baton, data, callback) {
		baton.addMethod(this._formatMethod('getAllTimestampData'))

		this._selectQuery(baton, 'timestamp', data, callback)
	},
	insertTimestamp(baton, values, callback) {
		baton.addMethod(this._formatMethod('insertTimestamp'))
		this._insertMultipleQuery('timestamp', (Array.isArray(values) ? values : [values]), baton, function() {
			callback(values)
		});
	},
	getAllTimestampCategory(baton, data, callback) {
		baton.addMethod(this._formatMethod('getAllTimestampCategory'))
		this._selectQuery(baton, 'timestamp_category', data, callback)
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
	getAllTimestampCharacter(baton, data, callback) {
		baton.addMethod(this._formatMethod('getAllTimestampCharacter'))
		this._selectQuery(baton, 'timestamp_characters', data, callback)
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
	getAllCompilationData(baton, data, callback) {
		baton.addMethod(this._formatMethod('getAllCompilationData'))
		this._selectQuery(baton, 'compilation', data, callback)
	},
	insertCompilation(baton, values, callback) {
		baton.addMethod(this._formatMethod('insertCategory'))
		this._insertMultipleQuery('compilation', [values], baton, function() {
			callback(values)
		});
	},
	getAllCompilationTimestamp(baton, data, callback) {
		baton.addMethod(this._formatMethod('getAllCompilationTimestamp'))
		this._selectQuery(baton, 'compilation_timestamp', data, callback)
	},

	insertUser(baton, values, callback) {
		baton.addMethod(this._formatMethod('insertUser'))
		this._insertMultipleQuery('user', [values], baton, function() {
			callback(values)
		});
	},

	getUserData(baton, data, callback) {
		baton.addMethod(this._formatMethod('getUserData'))
		this._selectQuery(baton, 'user', data, callback)
	},

	insertUser(baton, values, callback) {
		baton.addMethod(this._formatMethod('insertUser'))
		this._insertMultipleQuery('user', [values], baton, function() {
			callback(values)
		});
	},

	insertCompilationTimestamp(baton, values, callback) {
		baton.addMethod(this._formatMethod('insertCompilationTimestamp'))
		this._insertMultipleQuery('compilation_timestamp', values, baton, function() {
			callback(values)
		});
	},

	getAllRoleData(baton, data, callback) {
		baton.addMethod(this._formatMethod('getAllRoleData'))
		this._selectQuery(baton, 'role', data, callback)
	},
	getAllActionData(baton, data, callback) {
		baton.addMethod(this._formatMethod('getAllActionData'))
		this._selectQuery(baton, 'action', data, callback)
	},
	getAllRoleActionData(baton, data, callback) {
		baton.addMethod(this._formatMethod('getAllRoleActionData'))
		this._selectQuery(baton, 'role_action', data, callback)
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
				if (DB_SCHEME[table][attr].retrieve !== undefined) {
					t[DB_SCHEME[table][attr].retrieve](baton, autoGeneratedValue => {
						single_val.push((autoGeneratedValue == undefined ? null : autoGeneratedValue))
					})
					return true
				} else if (value[attr] !== undefined && value[attr] !== null) {
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
				t._makequery("INSERT INTO `" + table + "` (" + attr_string + ") VALUES ?", [value_array], table, baton, callback)
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
		this._makequery("DELETE FROM `" + table + "`" + conditions_string.slice(0, -3), null, table, baton, callback)
	},

	/**
	 * Makes the SELECT _query
	 * @param {string} table name of the table to get data
	 * @param {json} conditions key is the attribute, value is an array of values for the conditions
	 */
	_selectQuery(baton, table, conditions, callback) {
		var t = this;
		var condition_delimiter = ' OR '
		var condition_string = ""
		if (conditions !== null) {
			Object.keys(DB_SCHEME[table]).every(function(table_attr) {
				if (conditions[table_attr] !== undefined && Array.isArray(conditions[table_attr])) {
					if (conditions[table_attr].length > 0) {
						condition_string += t._multipleConditions(table, table_attr, conditions[table_attr]) + condition_delimiter
						return true
					}
					return true
				}
				return true
			})
		}
		this._makequery("SELECT * FROM `" + table + "`" + (condition_string == "" ? "" : " WHERE " + condition_string.slice(0, -3)), null, table, baton, callback)
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

		var getEquator = function(value) {
			var re = new RegExp("^\%(([a-z])*([A-Z])*(\\s)*)*\%$");
			if (DB_SCHEME[table][atr].like_option === true && re.test(value)) return " LIKE "
			return " = "
		}

		values.forEach(function(value) {
			conditions += atr + getEquator(value) + (DB_SCHEME[table][atr].type == 'string' ? "'" + value + "'" : value) + " OR "
		})
		return conditions.slice(0, -3)
	},
	/** makes the query
	 * @param {function} callback function that will return with the data, or a sql error
	 */
	_makequery(sql, values, table, baton, callback) {
		var t = this;
		var pool = t.getPool(table)
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
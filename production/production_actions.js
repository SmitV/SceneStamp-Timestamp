var db = require('./db_connector');
var async = require('async');



var ID_LENGTH = {
	'series': 5,
	'episode': 6,
	'character':7,
	'timestamp': 9,
	'category':5
}

module.exports = {

	getAllSeriesData(final_callback){
		var t = this;
		var method = "getAllSeriesData";
		var callback = function(err, data){
			if(err) {
				t._generateError(final_callback, method, err);
				return
			}
			final_callback(data);
		}
		db.getAllSeriesData(callback)
	},
	_assertSeriesIdExist(method, final_callback,series_ids, sucsess_callback){
		var t = this;
		this.getAllSeriesData(function(series_data){
			if(series_ids.length != t._intersect(series_data.map(function(series){return series.series_id}) , series_ids).length){
				t._generateError(final_callback,method, "Invalid series id");
				return 
			}
			else{
				sucsess_callback(series_data.filter(function(series){return series_ids.includes(series.series_id)}));
			}
		});
	},
	_assertEpisodeIdExist(method, final_callback,episode_ids, sucsess_callback){
		var t = this;
		this.getAllEpisodeData(function(episode_data){
			var episode = episode_data.filter(function(ep){return episode_ids.includes(ep.episode_id)});
			if(episode.length !== episode_ids.length ){
				t._generateError(final_callback,method, "Invalid episode id");
				return 
			}
			else{
				sucsess_callback(episode);
			}
		});
	},
	_assertTimestampIdExist(method, final_callback,timestamp_id, sucsess_callback){
		var t = this;
		if(timestamp_id === undefined){
			t._generateError(final_callback,method, "Invalid timestamp id");
			return 
		}
		db.getTimestampData(timestamp_id, function(er, data){
			if(data === undefined){
				t._generateError(final_callback,method, "Invalid timestamp id");
			}
			else if(data.length === 0 ){
				t._generateError(final_callback,method, "Invalid timestamp id");
				return 
			}
			else{
				sucsess_callback(data);
			}
		});
	},
	_isValuePresent(data, attribute_function, value, err, callback){
		if(!data.map(attribute_function).includes(value)){
			err()
			return 
		}
		callback()
	},
	insertNewSeries(series_name,final_callback){
		var t = this;
		var method = "insertNewSeries";
		var callback = function(err, data){
			if(err){
				t._generateError(final_callback,method, err);
				return
			}
			final_callback(data);
		}
		if(series_name == undefined ){
			this._generateError(final_callback,method, "Invalid param series_name");
		}else{
			t.getAllSeriesData(function(data){
				var id = t._generateId(ID_LENGTH.series,data.map(function(series){return series.series_id}));
				if(data.map(function(series){return series.series_name.toLowerCase()}).includes(series_name.toString().toLowerCase())){
					t._generateError(final_callback,method, "Series with same name exists");
					return
				}
				db.insertSeries(id,series_name,callback);
			});
			
		}
	},

	getAllCharacterData(series_ids, final_callback){
		this.getCharacterData(final_callback, final_callback, series_ids)
	},

	getCharacterData(final_callback, suc_callback, series_ids){
		var t = this;
		var method = "getAllCharacters";
		var callback = function(err, data){
			if(err) {
				t._generateError(final_callback, method, err);
				return
			}
			suc_callback(data);
		}
		if(series_ids && !Array.isArray(series_ids) && series_ids !== undefined) series_ids = series_ids.split(",").map(function(id){return parseInt(id)});
		db.getAllCharacterData(series_ids,callback)
	},
	insertNewCharacter(character_name, series_id,final_callback){
		var t = this;
		var method = "insertNewCharacter";
		var callback = function(err, data){
			if(err){
				t._generateError(final_callback,method, err);
				return
			}
			final_callback(data);
		}
		if(character_name == undefined || series_id == undefined ){
			this._generateError(final_callback,method, "Invalid param series_id / character_name");
			return 		
		}else{
			series_id = parseInt(series_id)
			t._assertSeriesIdExist(method, final_callback, [series_id], function(){
				t.getCharacterData(final_callback, function(character_data){

					var id = t._generateId(ID_LENGTH.character,character_data.map(function(character){return character.character_id}));
					if(character_data.filter(function(character){return character.character_name.toLowerCase() == character_name.toLowerCase() && character.series_id == series_id}).length !== 0){
						t._generateError(final_callback,method, "Character with the same name exists in the series");
						return 
					}
					db.insertNewCharacter(id,character_name,series_id,callback);
				});
			});
		}
	},

	getAllCategoryData(final_callback){
		var t = this;
		var method = "getAllCategory";
		var callback = function(err, data){
			if(err) {
				t._generateError(final_callback, method, err);
				return
			}
			final_callback(data);
		}
		db.getAllCategoryData(callback)
	},
	insertNewCategory(category_name,final_callback){
		var t = this;
		var method = "insertNewCategory";
		var callback = function(err, data){
			if(err){
				t._generateError(final_callback,method, err);
				return
			}
			final_callback(data);
		}
		if(category_name == undefined ){
			this._generateError(final_callback,method, "Invalid param category_name");
			return 
		}else{
			t.getAllCategoryData(function(category_data){
			var id = t._generateId(ID_LENGTH.category,category_data.map(function(category){return category.category_id}));

				if(category_data.map(function(category){return category.category_name.toLowerCase()}).includes(category_name.toLowerCase())){
					t._generateError(final_callback,method, "Category with the same name exists");
					return 
				}
				db.insertNewCategory(id,category_name,callback);
			});
		}
	},

	getAllEpisodeData(final_callback, series_ids){
		var t = this;
		var method = "getAllEpisode";
		var callback = function(err, data){
			if(err) {
				t._generateError(final_callback, method, err);
				return
			}
			final_callback(data);
		}
		if(series_ids) series_ids = series_ids.split(",").map(function(id){return parseInt(id)});
		db.getAllEpisodeData(series_ids,callback)
	},
	getEpisodeData(episode_id, final_callback, suc_callback){
		var t = this;
		var method = "getEpisodeData";
		var callback = function(err, data){
			if(err) {
				t._generateError(final_callback, method, err);
				return
			}
			suc_callback(data);
		}
		db.getEpisodeData([parseInt(episode_id)],callback)
	},
	insertNewEpisode(params ,final_callback){
		var t = this;
		var method = "insertNewEpisode";
		var callback = function(err, data){
			if(err){
				t._generateError(final_callback,method, err);
				return
			}
			final_callback(data);
		}
		  if(params.episode_name == undefined || typeof params.episode_name !== "string" || params.series_id == undefined || typeof parseInt(params.series_id) !== "number"){
			this._generateError(final_callback,method, "Invalid param episode_name / series_id");
			return 
		}else{
			var series_id = parseInt(params.series_id)
			t._assertSeriesIdExist(method, final_callback, [series_id], function(){
				t.getAllEpisodeData(function(episode_data){
					var id = t._generateId(ID_LENGTH.episode,episode_data.map(function(episode){return episode.episode_id}));

					if(episode_data.filter(function(episode){return episode.episode_name.toLowerCase() == params.episode_name.toLowerCase() && series_id == episode.series_id}).length > 0){
						t._generateError(final_callback,method, "Episode with the same episode name in series");
						return 
					}
					params.season = parseInt(params.season);
					params.episode = parseInt(params.episode);
					params.air_date = parseInt(params.air_date);
					if(episode_data.filter(function(episode){return episode.season == params.season && episode.episode == params.episode}).length > 0){
						t._generateError(final_callback,method, "Episode with the same season and episode number exists in series");
						return 
					}
					var season  = (params.season && typeof parseInt(params.season) == "number" ?  parseInt(params.season) : null) ;
					var episode = (params.episode && typeof parseInt(params.episode) == "number" ? parseInt(params.episode) : null) ;
					var air_date = (params.air_date && typeof parseInt(params.air_date) == "number" ? parseInt(params.air_date) : null) ;
					db.insertNewEpisode(id,params.episode_name,series_id,season, episode, air_date,callback);
				});
			});
		}
	},
	getAllTimestampData(final_callback, episode_ids, internal,suc_callback ){
		var t = this;
		var method = "getAllEpisode";
		var direct_callback = function(err, data){
			if(err) {
				t._generateError(final_callback, method, err);
				return
			}
			var tasks = []
			data.forEach(
				function(id){
					tasks.push(
						function(callback){
							t.getTimestamp(id.timestamp_id, 
								function(data){
									callback(null, data[0])
			})})});
			async.parallel(tasks, function(err, result){
				suc_callback(result)
			})
			return 
		}
		if(episode_ids & !internal ) episode_ids = episode_ids.split(",").map(function(id){return parseInt(id)});
		db.getAllTimestampIds(episode_ids,direct_callback)
	},
	getTimestamp(timestamp_id, final_callback){
		this.getTimestampData(timestamp_id, final_callback,final_callback);
	},
	getTimestampData(timestamp_id,final_callback,sus_callback){

		var t = this;
		var method = "getTimestampDataEpisode";
		var callback = function(err, data){
			if(err) {
				t._generateError(final_callback, method, err);
				return
			}
			async.parallel({
				characters: function(callback){
					db.getTimestampCharacter([timestamp_id],null,callback);
				},
				categories: function(callback){
					db.getTimestampCategory([timestamp_id],null,callback);
				},

			},function(err, results){
				if(results.characters){
					data[0].characters = results.characters.map(function(rel){return rel.character_id});
				}
				if(results.categories){
					data[0].categories = results.categories.map(function(rel){return rel.category_id});
				}
				sus_callback(data);
			});
			return 
		}
		t._assertTimestampIdExist(method, final_callback, parseInt(timestamp_id),function(data){
			callback(null, data)
		});

	},
	insertNewTimestamp(start_time, episode_id, final_callback){
		var t = this;
		var method = "insertNewCategory";
		var callback = function(err, data){
			if(err){
				t._generateError(final_callback,method, err);
				return
			}
			final_callback(data);
		}
		if(start_time == undefined || episode_id == undefined){
			this._generateError(final_callback,method, "Invalid param start_time/ episode_id");
			return 
		}else{
			episode_id = parseInt(episode_id)
			start_time = parseInt(start_time)
			t._assertEpisodeIdExist(method, final_callback, [episode_id], function(){
				db.getAllTimestampIds(null,function(data){
					var id = t._generateId(ID_LENGTH.timestamp,);
					db.insertNewTimestamp(id,start_time,episode_id, callback);
				});
			});
		}
	},

	queryTimestamps(series_ids, episode_ids, character_ids, category_ids,final_callback){
		var t = this;
		var method = "updateTimestamp"

		var getId =function(eps){
			return eps.map(function(ep){return ep.episode_id});
		}

		var getEpisodeids = function(series_ids, episode_ids, callback){
			if(episode_ids ){
				episode_ids = episode_ids.split(",").map(function(id){return parseInt(id)})
				t._assertEpisodeIdExist(method, final_callback, episode_ids, function(){
					callback(episode_ids)
				})


			}else if(series_ids){
				t._assertSeriesIdExist(method, final_callback, series_ids.split(",").map(function(id){return parseInt(id)}), function(){
					t.getAllEpisodeData(function(episode_data){
						callback(getId(episode_data))
					},series_ids);
				});
			}else{
				t.getAllEpisodeData(function(episode_data){
					callback(getId(episode_data))
				});

			}
		}

		var filter_characters = function(timestamps, characters, callback){
			if(characters == undefined){
				callback(timestamps)
			}
			else{
				callback(timestamps.filter(function(timestamp){
					return ( t._intersect(characters.split(",").map(function(id){return parseInt(id)}), timestamp.characters) > 0)
				}))
			}
		}

		var filter_categories = function(timestamps, categories, callback){
			if(categories == undefined){
				callback(timestamps)
			}
			else{
				callback(timestamps.filter(function(timestamp){
					return ( t._intersect(categories.split(",").map(function(id){return parseInt(id)}), timestamp.categories) > 0)
				}))
			}
		}

		var filter_timestamps = function(timestamps,characters, categories, callback){
			filter_characters(timestamps, characters, function(up_timestamps){
				filter_categories(up_timestamps, categories, function(resulting_timestamps){
					callback(resulting_timestamps)
			})});
		}

		getEpisodeids(series_ids,episode_ids, function(up_episode_ids){
			t.getAllTimestampData(final_callback,up_episode_ids, true, 
				function(timestamp_data){
					filter_timestamps(timestamp_data, character_ids, category_ids, function(timestamps){
						final_callback(timestamps)
					})
				});
		});


	},
	updateTimestamp(timestamp_id, characters,categories, final_callback){

		var t = this;
		var method = "updateTimestamp"

		timestamp_id = parseInt(timestamp_id)

		t.getTimestampData(timestamp_id, final_callback, function(timestamp){

			async.parallel({
					update_characters : function(callback){
						if(characters){
								characters = characters.split(",").map(function(id){return parseInt(id)});
								t.getEpisodeData(timestamp[0].episode_id, final_callback,function(episode){
									var series_id = episode[0].series_id;
										t.getCharacterData(callback, function(character_data){
										if(characters.length !== t._intersect(character_data.map(function(ch){return ch.character_id;}), characters).length){
											callback(null,"Characters passed are not all in series");
											return
										}else{
											db.removeTimestampCharacter([timestamp_id], function(){
												db.insertTimestampCharacter(timestamp_id, characters,callback)
											})
											return
										}
									},[series_id.toString()])
										
								}) 
							}else{
								callback(null,"no characters passed")
							}
						},
						update_categories : function(callback){
							if(categories){
								t.getAllCategoryData(function(category_data){
									categories = categories.split(",").map(function(id){return parseInt(id)});
									if(categories.length !== t._intersect(category_data.map(function(ch){return ch.category_id;}), categories).length){
										callback(null,"Categories passed are not all valid");
										return
									}else{
										db.removeTimestampCategory([timestamp_id], function(){
											db.insertTimestampCategory(timestamp_id, categories,callback)
										});
										return 
									}
								})
							}else{
								callback(null,"no categories passed")
							}
						}
					},
					function(err, results){
						if(err){
							final_callback({'error':err})
						}
						else{
							final_callback(results);
						}
					});
			});
	},
	_intersect(a, b){
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
	_generateId(length, ids){
		var id= (Math.pow(10, length-1)) + Math.floor( + Math.random() * 9 * Math.pow(10 , (length-1)));
			if(ids){
				while( ids.includes(id)){
				id= (Math.pow(10, length-1)) + Math.floor( + Math.random() * 9 * Math.pow(10 , (length-1)));
			}
		}
		return id;
	},
	_generateError(final_callback, method, err){
		var error_id = this._generateId(8, []); 
		console.log({'id':error_id, "method":method, "err":err});
		final_callback({'id':error_id, "method":method, "err":err})
	}
}
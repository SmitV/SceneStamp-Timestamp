var db = require('./db_connector');

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
	insertNewSeries(req,final_callback){
		var t = this;
		var method = "insertNewSeries";
		var callback = function(err, data){
			if(err){
				t._generateError(final_callback,method, err);
				return
			}
			final_callback(data);
		}
		if(req.query.series_name == undefined ){
			this._generateError(final_callback,method, "Invalid param series_name");
		}else{
			t.getAllSeriesData(function(data){
				var id = t._generateId(5,data.map(function(series){return series.series_id}));
				if(data.map(function(series){return series.series_name.toLowerCase()}).includes(req.query.series_name.toLowerCase())){
					t._generateError(final_callback,method, "Series with same name exists");
					return
				}
				db.insertSeriesData(id,req.query.series_name,callback);
			});
			
		}
	},

	getAllCharacterData(final_callback, series_ids){
		var t = this;
		var method = "getAllCharacters";
		var callback = function(err, data){
			if(err) {
				t._generateError(final_callback, method, err);
				return
			}
			final_callback(data);
		}
		if(series_ids) series_ids = series_ids.split(",").map(function(id){return parseInt(id)});
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
			t.getAllSeriesData(function(series_data){
				if(!series_data.map(function(series){return series.series_id}).includes(series_id)){
					t._generateError(final_callback,method, "Invalid series id");
					return 
				}
				t.getAllCharacterData(function(character_data){
					var id = t._generateId(5,character_data.map(function(character){return character.character_id}));

					if(character_data.filter(function(character){return character.character_name.toLowerCase() == character_name.toLowerCase() && character.series_id == series_id}).length !== 0){
						t._generateError(final_callback,method, "Character with the same name exists in the series");
						return 
					}
					db.insertNewCharacter(id,character_name,series_id,callback);
				});

			});
		}
	},
	_generateId(length, ids){
		var id= (Math.pow(10, length-1)) + Math.floor( + Math.random() * 9 * Math.pow(10 , (length-1)));
		while(ids.includes(id)){
			id= (Math.pow(10, length-1)) + Math.floor( + Math.random() * 9 * Math.pow(10 , (length-1)));
		}
		return id;
	},
	_generateError(final_callback, method, err){
		final_callback({"method":method, "error":err})
	}
}
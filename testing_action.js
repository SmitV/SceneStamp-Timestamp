var fs = require('fs');

module.exports = {

	//Get methods
	getAllSeries(){
		series_data = JSON.parse(fs.readFileSync('assets/mocks/series_data.json','utf8'));
		return series_data;
	},
	getCharacterDataFromSeries(external , series_id){
		if(series_id == undefined){
			return this._generateError("series id must be defined");
		}
		return this._getData(
			JSON.parse(fs.readFileSync('assets/mocks/character_data.json')),
			function(character){
				return character.series_id
			},
			(external ? this._getArray(series_id).map(
				function(id){
					return parseInt(id);
				}):
				series_id
				));
	},
	getEpisodesFromSeries(external,series_id){
		if(series_id == undefined){
			return this._generateError("series id must be defined");
		}
		return this._getData(
			JSON.parse(fs.readFileSync('assets/mocks/episode_data.json')),
			function(episode){
				return parseInt(episode.episode_id.split('_')[0])
			},
			(external ? 
				this._getArray(series_id).map(
					function(id){
						return parseInt(id);
					}) 
				:
				series_id)
			);
	},
	getAllCategories(){
		episode_data = JSON.parse(fs.readFileSync('assets/mocks/categories_data.json'));
		return episode_data;
	},
	getTimestampsFromEpisode(external, episode_id){
		var t = this;
		timestamp_data = this._getData(
			JSON.parse(fs.readFileSync('assets/mocks/timestamp_data.json')),
			function(timestamp){
				return timestamp.episode_id.toString()
			},
			(external ? this._getArray(episode_id) : episode_id));

		timestamp_data.forEach(function(timestamp){
			timestamp.characters = t.getCharactersForTimestamp(timestamp.timestamp_id);
			timestamp.categories = t.getCategoriesForTimestamp(timestamp.timestamp_id);
		});
		return timestamp_data;

	},
	getCategoriesForTimestamp(timestamp_id){
		ct_data = JSON.parse(fs.readFileSync('assets/mocks/CategoryToTimestamp_relation.json'));
		return ct_data.filter(function(relation){
				return relation.timestamp_id === timestamp_id.toString();
			}).map(function(category){return category.category_id});

	},
	getCharactersForTimestamp(timestamp_id){
		ct_data = JSON.parse(fs.readFileSync('assets/mocks/CharacterToTimestamp_relation.json'));
		return ct_data.filter(function(relation){
				return relation.timestamp_id === timestamp_id.toString();
			}).map(function(character){return character.character_id});

	},
	queryForTimestamps(params){
		var t = this;

		if(params.series_id == null){
			series_data = this.getAllSeries();
		}else{
			series_data = this._getData(this.getAllSeries(), function(series){return series.series_id}, this._getArray(params.series_id).map(function(id){return parseInt(id);}));		
		}
		episode_ids = this.getEpisodesFromSeries(false, series_data.map(function(series){return series.series_id})).map(function(episode){return episode.episode_id});
		timestamp_data = this.getTimestampsFromEpisode(false, episode_ids);

		if(params.episode_id != null){
			new_timestamp_data = this._getData(timestamp_data, function(timestamp){return timestamp.episode_id}, this._getArray(params.episode_id));
			timestamp_data = new_timestamp_data;
		}

		if(params.character_id != null){
			new_timestamp_data = timestamp_data.filter(function(timestamp){ 
					return t._intersect(timestamp.characters, t._getArray(params.character_id).map(id => parseInt(id))).length > 0
				});
			timestamp_data = new_timestamp_data;
		}

		if(params.category_id != null){
			new_timestamp_data = timestamp_data.filter(function(timestamp){ 
					return t._intersect(timestamp.categories, t._getArray(params.category_id).map(id => parseInt(id))).length > 0
				});
			timestamp_data = new_timestamp_data;
		}

		return timestamp_data;
	},
	_getData(dataList, filterAction, list){
		return dataList.filter(function(data){
			return list.includes(filterAction(data));
		});
	},
	_getArray(parameter){
		return parameter.split(',');
	},
	_intersect(a, b){
		c = [...a];
		d = [...b];
		  var result = [];
		  while( c.length > 0 && d.length > 0 )
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

	//Post methods
	postNewSeries(name){
		if(name == undefined){
			return this._generateError('series name must be provided');
		}
		series_data = JSON.parse(fs.readFileSync('assets/mocks/series_data.json','utf8'));
		var id = this._generateId(5);
		while(series_data.filter(function(series){ return series.series_id === id}).length > 0){
			id = this._generateId(5);
		}
		if(series_data.map(function(series){return series.name.toLowerCase()}).includes(name.toLowerCase())){
			return this._generateError("series exists with same name");
		}
		var new_series = 
			{
				'series_id': id,
				'name': name
			};
		series_data.push(new_series);
		this._updateFile('assets/mocks/series_data.json', series_data);
		return new_series;
	}, 

	postNewCharacter(series_id, name){

		if( name == undefined  || series_id  == undefined){
			return this._generateError('series id / character name must be provided');
		}
		series_id = this._getArray(series_id).map(function(id){return parseInt(id)})[0];

		series_data = JSON.parse(fs.readFileSync('assets/mocks/series_data.json','utf8'));
		if(!series_data.map(function(series){ return series.series_id}).includes(series_id)){
			return this._generateError('invalid series_id');
		}

		var character_names_from_series = this.getCharacterDataFromSeries(false, [series_id]).map(function(character){return character.name.toLowerCase()});
		if(character_names_from_series.includes(name.toLowerCase())){
			return this._generateError("character with same name exists in series");
		}
		
		var new_character_id = this._generateId(8);
		var new_character = {
			"series_id": series_id,
			"name":name,
			"character_id":new_character_id
		};
		var character_data = JSON.parse(fs.readFileSync('assets/mocks/character_data.json'));
		character_data.push(new_character);

		this._updateFile('assets/mocks/character_data.json', character_data);
		return new_character;

	},

	postNewEpisode(episode, series_id, title){

		if( title == undefined  || series_id  == undefined   || episode == undefined ){
			return this._generateError('series id / title / episode must be provided');
		}
		series_data = JSON.parse(fs.readFileSync('assets/mocks/series_data.json','utf8'));
		if(!series_data.map(function(series){ return series.series_id}).includes(series_id)){
			return this._generateError('invalid series_id');
		}
		var new_episode_id = series_id.toString()+"_"+ episode;
		episode_data = this.getEpisodesFromSeries(false, [series_id]);
		if(episode_data.map(function(episode){return episode.episode_id.toString()}).includes(new_episode_id.toString()) || episode_data.map(function(episode){return episode.title.toLowerCase()}).includes(title.toLowerCase())){
			return this._generateError('passed series has episode with same title/episode number');
		}
		var new_episode = {
			"episode_id" : new_episode_id,
			"title": title
		};
		var episode_data = this.getEpisodesFromSeries(false, this.getAllSeries().map(function(series){return series.series_id}));
		episode_data.push(new_episode);
		this._updateFile('assets/mocks/episode_data.json',episode_data);
		return new_episode;
	},

	postNewTimestamp(params){
		var episode = params.episode_id.toString();
		var start_time = parseInt(params.start_time);

		var new_timestamp_id = this._generateId(8).toString(36);

		if(episode == undefined || start_time == undefined){
			return this._generateError('episode / start_time needs to be provides');
		}
		var series_id = parseInt(episode.split("_")[0]);
		if(!this.getEpisodesFromSeries(false, [series_id]).map(function(episode){return episode.episode_id}).includes(episode)){
			return this._generateError('invalid episode');
		}
		var character_relation =  JSON.parse(fs.readFileSync('assets/mocks/CharacterToTimestamp_relation.json'));
		if(params.characters !== undefined){
			var characters = this._getArray( params.characters).map(function(character){return parseInt(character)});
			character_ids_from_series = this.getCharacterDataFromSeries(false, [series_id]).map(function(character){return character.character_id});
			if(characters.length !== this._intersect(character_ids_from_series,characters).length){
				return this._generateError("all characters ids must be from the same series");
			}
			characters.forEach(function(char){
				character_relation.push({
				"timestamp_id":new_timestamp_id,
				"character_id":char		
				});
			})
		}
		var category_relation =  JSON.parse(fs.readFileSync('assets/mocks/CategoryToTimestamp_relation.json'));
		if(params.categories !== undefined){
			var categories = this._getArray( params.categories).map(function(category){return parseInt(category)});
			categories.forEach(function(cat){
				category_relation.push({
				"timestamp_id":new_timestamp_id,
				"character_id":cat		
				});
			});

		}
		var new_timestamp = 
		{
			"timestamp_id" : new_timestamp_id,
			"start_time" : start_time,
			"episode_id" : episode
		};

		var timestamp_data = JSON.parse(fs.readFileSync('assets/mocks/timestamp_data.json'));
		timestamp_data.push(new_timestamp);

		this._updateFile('assets/mocks/CharacterToTimestamp_relation.json',character_relation );
		this._updateFile('assets/mocks/CategoryToTimestamp_relation.json',category_relation );
		this._updateFile('assets/mocks/timestamp_data.json',timestamp_data );

		return new_timestamp;

	},

	_generateId(length){
		return (Math.pow(10, length-1)) + Math.floor( + Math.random() * 9 * Math.pow(10 , (length-1)));
	},
	_updateFile(file, data){
		fs.writeFileSync(file, '');
		fs.writeFileSync(file, JSON.stringify(data));

	},
	_generateError(desc){
		return {'error':desc};
	}
}


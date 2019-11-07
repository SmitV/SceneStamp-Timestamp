var async = require('async');
var moment = require('moment')

var db = require('./database_actions');
var nba_fetching = require('./nba_fetching')
var actions = require('./actions')
var automatedSystemLogger = require('./logger').AUTOMATED_SYSTEM_LOGGER
var methodLogger = require('./logger').METHOD_LOGGER


//for all tasks running on the server in interval, all system initiated

module.exports = {


	_updateTodayGamePlaysWithTimestamp(callback) {
		var baton = this._getBaton('_updateTodayGamePlaysWithTimestamp', callback)

		var updateRegTimestamps = (timestamps, callback) => {
			if (timestamps.length === 0) {
				baton.done({
					no_timestamps_to_update: true
				})
				return
			}
			actions.updateTimestamps(baton, timestamps, 'nba_timestamp_id', callback)
		}

		var getNonUpdatedTimestamps = (timestamps, callback) => {
			if (timestamps.length === 0) {
				console.log('none to update')
				baton.done({
					no_timestamps_to_update: true
				})
				return
			}
			actions.getTimestampData(baton, {
				nba_timestamp_id: timestamps.map(ts => ts.nba_timestamp_id)
			}, (regTimestamps) => {
				var neededTimestamps = regTimestamps.filter(ts => ts.start_time === -1).map(ts => ts.nba_timestamp_id)
				callback(timestamps.filter(ts => neededTimestamps.includes(ts.nba_timestamp_id)))
			})
		}

		console.log('_updateTodayGamePlaysWithTimestamp')
		this._getTodayGames(baton, (episodes) => {
			console.log('ep found')
			nba_fetching.getTimestampedPlays(baton, episodes, (formatted_timestamps) => {
				getNonUpdatedTimestamps(formatted_timestamps, (need_to_be_updated_timestamp) => {
					updateRegTimestamps(need_to_be_updated_timestamp, () => {
						baton.done({
							updated_nba_timestamps: need_to_be_updated_timestamp.map(ts => ts.nba_timestamp_id)
						})
					})
				})
			})
		})


	},

	_updateActiveGameTimestamps(callback) {
		var baton = this._getBaton('_updateActiveGameTimestamps', callback)

		var getAllNewTimestamps = (timestamps, callback) => {
			if (timestamps.length === 0) {
				baton.done({
					no_timestamps_to_add: true
				})
				return
			}
			actions.getTimestampData(baton, {
				nba_timestamp_id: timestamps.map(ts => ts.nba_timestamp_id)
			}, (regTimestamps) => {
				callback(timestamps.filter(ts => !regTimestamps.map(ts => ts.nba_timestamp_id).includes(ts.nba_timestamp_id)))
			})
		}

		var prepareTimestamps = (timestamps, callback) => {
			if (timestamps.length === 0) {
				baton.done({
					no_timestamps_to_add: true
				})
				return
			}
			actions.getTimestampData(baton, {}, function(timestamp_data) {
				callback(timestamps.map(ts => {
					ts.timestamp_id = actions._generateId(actions.ID_LENGTH.timestamp, timestamp_data.map(function(ts) {
						return ts.timestamp_id
					}))
					return ts
				}))
			})
		}

		var insertTimestamps = (timestamps, callback) => {
			actions.insertTimestamp(baton, timestamps, () => {
				callback()
			})
		}

		var getDbValues = (timestamps, attr) => {
			return [].concat.apply([], timestamps.map(ts => ts[attr].map(id => {
				var result = {
					timestamp_id: ts.timestamp_id,
				}
				result[attr] = id
				return result
			})))
		}

		var insertTimestampCategories = (timestamps, callback) => {
			if (getDbValues(timestamps, 'category_id').length === 0) {
				callback()
				return
			}
			actions.insertTimestampCategory(baton, getDbValues(timestamps, 'category_id'), /*multiple=*/ false, callback)
		}

		var insertTimestampCharacters = (timestamps, callback) => {
			if (getDbValues(timestamps, 'character_id').length === 0) {
				callback()
				return
			}
			actions.insertTimestampCharacter(baton, getDbValues(timestamps, 'character_id'), /*multiple=*/ false, callback)
		}

		this._getTodayGames(baton, (episodes) => {
			actions.getAllCharacterData(baton, {}, character_data => {
				nba_fetching.getTimestamps(baton, episodes, character_data, (timestamps) => {
					getAllNewTimestamps(timestamps, newTimestamps => {
						prepareTimestamps(newTimestamps, updated_timestamps => {
							insertTimestamps(updated_timestamps, () => {
								insertTimestampCategories(updated_timestamps, () => {
									insertTimestampCharacters(updated_timestamps, () => {
										baton.done({
											added_nba_timestamps: updated_timestamps.length
										})
									})
								})
							})
						})
					})
				})
			})
		})
	},


	_getTodayGames(baton, callback) {
		var hourBuffer = 4
		var startEpoch = moment().utc().subtract(hourBuffer, 'hours');
		var endEpoch = moment().utc();

		var formatEpoch = (epoch) => {
			while (epoch.toString().length < 13) epoch = parseInt(epoch.toString() + '0')
			return epoch
		}

		var queryParams = {
			lessThan: {
				nba_start_time: formatEpoch(endEpoch.valueOf())
			},
			greaterThan: {
				nba_start_time: formatEpoch(startEpoch.valueOf())
			}
		}

		actions.getAllEpisodeData(baton, queryParams, function(episode_data) {

						//FOR NOW, only return one game
			if (process.env.NODE_ENV === 'production') {
				callback([{
					"episode_id": 128728,
					"creatIon_time": 1572684810728,
					"episode_name": "MILLAC2019-11-06",
					"air_date": null,
					"series_id": null,
					"youtube_id": null,
					"nba_game_id": "0021900111",
					"nba_start_time": 1573095600000,
					"video_offset": null
				}])
				return
			}

			if (episode_data.length === 0) {
				baton.done({
					no_current_games: true
				})
				return
			}

			callback(episode_data)
		})
	},

	_updateActivePlayers() {
		var baton = this._getBaton('_updateActivePlayers')

		var getNonRegisteredNbaCharacters = (nba_characters, callback) => {

			if (nba_characters.length === 0) {
				baton.done({
					no_players_to_add: true
				})
				return
			}

			actions.getAllCharacterData(baton, {
				nba_player_id: nba_characters.map(char => char.nba_player_id)
			}, function(character_data) {
				var nonRegCharacters = nba_characters.filter(nba_player => !character_data.map(existing_char => existing_char.nba_player_id).includes(nba_player.nba_player_id))
				if (nonRegCharacters.length === 0) {
					baton.done({
						none_to_add: true
					})
				} else callback(nonRegCharacters)
			})
		}

		var prepareCharacters = (characters, callback) => {
			actions.getAllCharacterData(baton, {}, function(character_data) {
				callback(characters.map(character => {
					character.character_id = actions._generateId(actions.ID_LENGTH.character, character_data.map(char => char.character_id))
					return character
				}))
			})
		}

		function insertAllCharacters(characters, callback) {
			db.insertCharacter(baton, characters, function(data) {
				actions._handleDBCall(baton, data, true /*multiple*/ , (err, data) => {
					if (err) {
						callback({
							nba_player_ids_attempted: characters.map(char => char.nba_player_id),
							error: err
						})
						return
					}
					callback({
						nba_player_ids_added: characters.map(char => char.nba_player_id),
					})

				})
			})
		}

		nba_fetching.getActivePlayers(baton, (players) => {
			getNonRegisteredNbaCharacters(players, (nonRegCharacters) => {
				prepareCharacters(nonRegCharacters, (updated_characters) => {
					insertAllCharacters(updated_characters, (result) => {
						baton.done(result)
					})
				})
			})
		})
	},

	_updateActiveNBAGames() {
		var baton = this._getBaton('_updateActiveEpisodes')

		var getNonRegisteredNbaGameIds = (nba_game_ids, callback) => {

			if (nba_game_ids.length === 0) {
				baton.done({
					no_games_to_add: true
				})
				return
			}

			actions.getAllEpisodeData(baton, {
				nba_game_id: nba_game_ids
			}, function(episode_data) {
				var nonRegEpisodes = nba_game_ids.filter(gid => !episode_data.map(ep => ep.nba_game_id).includes(gid))
				if (nonRegEpisodes.length === 0) {
					baton.done({
						none_to_add: true
					})
				} else callback(nonRegEpisodes)
			})
		}


		var prepareEpisodes = (episodes, callback) => {
			actions.getAllEpisodeData(baton, {}, function(episode_data) {
				callback(episodes.map(ep => {
					ep.episode_id = actions._generateId(actions.ID_LENGTH.episode, episode_data.map(ep => ep.episode_id))
					ep.nba_start_time = actions.convertUtcToEpoch(ep.nba_start_time)
					return ep
				}))
			})
		}

		function insertAllEpisodes(game_data, callback) {
			db.insertEpisode(baton, game_data, function(data) {
				actions._handleDBCall(baton, data, true /*multiple*/ , (err, data) => {
					if (err) {
						callback({
							nba_game_ids_attempted: game_data.map(game => game.nba_game_id),
							error: err
						})
						return
					}
					callback({
						nba_game_ids_added: game_data.map(game => game.nba_game_id),
					})

				})
			})
		}
		nba_fetching.getGameSchedule(baton, (game_data) => {
			getNonRegisteredNbaGameIds(game_data.map(game => game.nba_game_id), (nonRegisteredIds) => {
				prepareEpisodes(game_data.filter(game => nonRegisteredIds.includes(game.nba_game_id)), updated_games => {
					insertAllEpisodes(updated_games, (results) => {
						baton.done(results)
					})
				})
			})
		})
	},

	//this is the special baton created for automated tasks
	//since there is no endpoint call
	_getBaton(task_name, end_callback) {
		var t = this;
		var time = new Date();
		return {
			automated_task_name: task_name,
			//id to reference detail log
			id: actions._generateId(10),
			start_time: time.getTime(),
			err: [],
			//the res for the request
			sendError: function(data, errorCode) {
				automatedSystemLogger.error(this.printable())
				this.lastMethod();
				res.status((errorCode ? errorCode : 500)).json(data)
			},
			methods: [],
			done: function(data) {
				var end_time = new Date()
				this.duration = end_time.getTime() - this.start_time
				this.lastMethod()
				this.additionalData = data
				automatedSystemLogger.info(this.printable())
				if (end_callback) end_callback(this)
			},
			addMethod: function(meth) {
				if (this.methods.length == 0) {
					this.methods.push({
						correlation_id: this.id,
						method: meth,
						time: new Date().getTime()
					})
				} else {
					this.methods[this.methods.length - 1].duration = new Date().getTime() - this.methods[this.methods.length - 1].time
					delete this.methods[this.methods.length - 1].time
					methodLogger.info(this.methods[this.methods.length - 1])
					this.methods.push({
						correlation_id: this.id,
						method: meth,
						time: new Date().getTime()
					})
				}
			},
			lastMethod: function() {
				if (this.methods.length > 0) {
					this.methods[this.methods.length - 1].duration = new Date().getTime() - this.methods[this.methods.length - 1].time
					delete this.methods[this.methods.length - 1].time
					methodLogger.info(this.methods[this.methods.length - 1])
				}
			},
			//the error object & public message to display
			setError: function(error) {
				var end_time = new Date()
				this.duration = end_time.getTime() - this.start_time
				this.err.push(error);
			},
			printable: function() {
				var printableBaton = {}
				Object.keys(this).forEach((key) => {
					if (typeof this[key] !== 'function') printableBaton[key] = this[key]
				});
				delete printableBaton.methods
				return printableBaton
			},

		}
	},
}
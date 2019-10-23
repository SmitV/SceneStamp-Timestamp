var async = require('async');

var db = require('./database_actions');
var nba_fetching = require('./nba_fetching')
var actions = require('./actions')
var automatedSystemLogger = require('./logger').AUTOMATED_SYSTEM_LOGGER
var methodLogger = require('./logger').METHOD_LOGGER


//for all tasks running on the server in interval, all system initiated

module.exports = {

	tasksInfo() {
		return [{
			interval: 60 *60 * 12,
			function: this._updateActiveNBAGames()
		},
		{
			interval: 60 *60 * 12,
			function: this._updateActivePlayers()
		}]
	},

	_updateActivePlayers() {
		var baton = this._getBaton('_updateActivePlayers')

		var getNonRegisteredNbaCharacters = (nba_characters, callback) => {
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
			actions.getAllEpisodeData(baton, {nba_game_id: nba_game_ids}, function(episode_data) {
				var nonRegEpisodes = nba_game_ids.filter(gid => !episode_data.map(ep => ep.nba_game_id).includes(gid))
				if (nonRegEpisodes.length === 0) {
					baton.done({
						none_to_add: true
					})
				} else callback(nonRegEpisodes)
			})
		}


		var prepareEpisodes = (episodes, callback) => {
			actions.getAllEpisodeData(baton,{}, function(episode_data) {
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
	_getBaton(task_name) {
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
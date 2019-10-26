var actions = require('./actions')
var http = require('follow-redirects').http;

const Nightmare = require('nightmare')

const NBA_MAIN_SITE = 'http://www.nba.com'
const NBA_DATA_SITE = 'http://data.nba.net'
const NBA_PLAYERS_URL = NBA_MAIN_SITE + '/players/active_players.json'
const BASE_NBA_PLAY_BY_PLAY = 'http://data.nba.com/data/10s/v2015/json/mobile_teams/nba/2019/scores/pbp/'


var PLAYER_UI_SELECTOR = '.nba-player-index__trending-item'



module.exports = {

	NBA_MAIN_SITE: NBA_MAIN_SITE,
	NBA_PLAYERS_URL: NBA_PLAYERS_URL,
	PLAYER_UI_SELECTOR: PLAYER_UI_SELECTOR,
	BASE_NBA_PLAY_BY_PLAY: BASE_NBA_PLAY_BY_PLAY,

	getNbaPlayByPlayUrl(game_id) {
		return BASE_NBA_PLAY_BY_PLAY + game_id + '_full_pbp.json'
	},

	getNbaGamesForMonthUrl() {
		var currentDate = new Date();
		return NBA_DATA_SITE + "/v2015/json/mobile_teams/nba/" + currentDate.getFullYear() + "/league/00_league_schedule_" + (currentDate.getMonth() + 1 < 10 ? '0' + currentDate.getMonth() + 1 : currentDate.getMonth() + 1) + ".json"
	},

	getGameSchedule(baton, callback) {
		var t = this;
		baton.addMethod('getGameSchedule')

		var formatToUtcTime = (date, time) => {
			return date + ' ' + time + ':00 UTC'
		}

		var formatRawData = (raw_data) => {
			return raw_data.mscd.g.map(game => {
				return {
					nba_game_id: game.gid,
					episode_name: (game.gcode.split('/')[1] + game.gdte),
					nba_start_time: formatToUtcTime(game.gdtutc, game.utctm)
				}
			})
		}

		this._makeHttpCallWithUrl(baton, this.getNbaGamesForMonthUrl(), raw_data => {
			callback(formatRawData(raw_data))
		})
	},

	getTimestamps(baton, episodes, character_data, callback) {
		baton.addMethod('getTimestamps')

		var formatRawData = (ep, raw_data, callback) => {

			var getCategoryId = (playType, desc) => {
				if (playType === 1) {
					return (desc.includes('3pt Shot: Made') ? 3 : 2)
				} else {
					return playType
				}
			}

			if (raw_data.g === undefined || !Array.isArray(raw_data.g.pd)) {
				callback([])
				return
			}

			callback([].concat.apply([], raw_data.g.pd.map(period => period.pla.map(play => {
				var correlatedCharacterId = character_data.find(char => char.nba_player_id === play.pid)
				return {
					episode_id: ep.episode_id,
					start_time: -1,
					nba_timestamp_id: ep.nba_game_id + '.' + play.evt,
					nba_play_description: play.cl + " | " + play.de,
					character_id: (correlatedCharacterId !== undefined ? [correlatedCharacterId.character_id] : []),
					category_id: [getCategoryId(play.etype, play.de)]
				}
			}))).sort((a, b) => {
				return a.nba_timestamp_id - b.nba_timestamp_id
			}))
		}

		var filterandReformat = (timestamps, callback) => {
			callback(timestamps.map(ts => {

				return ts
			}))
		}

		var timestamps = []
		episodes.forEach((ep, index) => {
			this._makeHttpCallWithUrl(baton, this.getNbaPlayByPlayUrl(ep.nba_game_id), raw_data => {
				formatRawData(ep, raw_data, formatted_data => {
					timestamps = timestamps.concat(formatted_data)
					if (index === episodes.length - 1) callback(timestamps)
				})
			})
		})
	},


	getActivePlayers(baton, callback) {
		var t = this;
		baton.addMethod('getActivePlayers')

		var formatRawData = (raw_data) => {
			return raw_data.map(player => {
				return {
					character_name: player.firstName + ' ' + player.lastName,
					nba_player_id: parseInt(player.personId)
				}
			})
		}

		this._makeHttpCallWithUrl(baton, 'http://www.nba.com/players/active_players.json', raw_data => {
			callback(formatRawData(raw_data))
		})
	},

	_makeHttpCallWithUrl(baton, url, callback) {
		baton.addMethod('_makeHttpCallWithUrl')
		var chunks = ''
		var req = http.get(url, (res) => {
			res.on('data', function(data) {
				chunks += data
			});

			res.on('end', () => {
				try {
					var parsedData = JSON.parse(Buffer.from(chunks).toString());
					if (res.statusCode == 200) {
						callback(parsedData)
					} else {
						baton.setError(parsedData)
						this._batonErrorExit(baton)
						return
					}
				} catch (e) {
					callback({})
				}
			})
		}).on('error', (err) => {
			baton.setError({
				error: err.toString(),
				error_details: 'Error from making https call to get nba game data'
			})
			this._batonErrorExit(baton)
			return
		})
		req.end()
	},


	_batonErrorExit(baton) {
		if (baton.automated_task_name) baton.done(baton.err[0])
		else actions._generateError(baton)
	}
}
var actions = require('./actions')
var http = require('http')

const Nightmare = require('nightmare')

const NBA_MAIN_SITE = 'https://www.nba.com'
const NBA_DATA_SITE = 'http://data.nba.net'
NBA_PLAYERS_URL = NBA_MAIN_SITE + '/players'


var PLAYER_UI_SELECTOR = '.nba-player-index__trending-item'


module.exports = {

	NBA_MAIN_SITE: NBA_MAIN_SITE,
	NBA_PLAYERS_URL: NBA_PLAYERS_URL,
	PLAYER_UI_SELECTOR: PLAYER_UI_SELECTOR,

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

	_makeHttpCallWithUrl(baton, url, callback) {
		baton.addMethod('_makeHttpCallWithUrl')

		var chunks = ''
		var req = http.get(url, (res) => {
			res.on('data', function(data) {
				chunks += data
			});

			res.on('end', () => {
				var parsedData = JSON.parse(Buffer.from(chunks).toString());
				if (res.statusCode == 200) {
					callback(parsedData)
				} else {
					baton.setError(parsedData)
					this._batonErrorExit(baton)
					return
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


	_batonErrorExit(baton){
		if(baton.automated_task_name) baton.done(baton.err[0])
		else actions._generateError(baton)
	}
}
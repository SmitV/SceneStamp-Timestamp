const Nightmare = require('nightmare')

const NBA_MAIN_SITE = 'https://www.nba.com'
NBA_PLAYERS_URL = NBA_MAIN_SITE + '/players'

var PLAYER_UI_SELECTOR = '.nba-player-index__trending-item'

module.exports = {

	NBA_MAIN_SITE : NBA_MAIN_SITE,
	NBA_PLAYERS_URL : NBA_PLAYERS_URL,
	PLAYER_UI_SELECTOR : PLAYER_UI_SELECTOR,


	getPlayerData(baton, callback) {

		baton.addMethod('getPlayerData')

		var nightmare = Nightmare({
			show: false
		})
		nightmare
			.goto(NBA_PLAYERS_URL)
			.evaluate(() => window.scrollTo(0, 9999999))
			.evaluate(() => {
				var extractPlayerInfo = (link) => {
					var data = link.split('/')
					return {
						player_id: parseInt(data[4]),
						name: data[2] + ' ' + data[3]
					}
				}

				var allPlayers = Array.from(document.querySelectorAll('.nba-player-index__trending-item'))
				return allPlayers.map((option) => {
					return extractPlayerInfo(option.querySelector('a').getAttribute('href'))
				})
			})
			.end()
			.then(player_data => {
				if(player_data.length < 100){
					baton.setError({
			        	error: "Page didn't have all players",
			        	public_message: 'Fetching page didnt work, try again'
			        })
				}
				callback(player_data)
			})
			.catch(error => {
				baton.setError(error)
				callback()
			})
	}
}
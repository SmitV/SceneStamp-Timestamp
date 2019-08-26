var express = require('express');
var production_action = require('./prod2/actions.js');
const bodyParser = require('body-parser');

var app = express();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
	extended: false
}));


var endpoints = [{
	url: 'getSeriesData',
	action: 'get_allSeriesData'
}, {
	url: 'newSeries',
	action: 'post_newSeries'

}, {
	url: 'getEpisodeData',
	action: 'get_allEpisodeData'
}, {
	url: 'newEpisode',
	action: 'post_newEpisode'

}, {
	url: 'getCharacterData',
	action: 'get_allCharacterData'
}, {
	url: 'newCharacter',
	action: 'post_newCharacter'

}, {
	url: 'getCategoryData',
	action: 'get_allCategoryData'
}, {
	url: 'newCategory',
	action: 'post_newCategory'

}, {
	url: 'getTimestampData',
	action: 'get_allTimestampData'
}, {
	url: 'newTimestamp',
	action: 'post_newTimestamp'

}, {
	url: 'updateTimestamp',
	action: 'post_updateTimestamp'

}, {
	url: 'getCompilationData',
	action: 'get_allCompilationData'
}, {
	url: 'newCompilation',
	action: 'post_newCompilation',
	post: true
}, ];

app.all('*', function(req, res, next) {
	var origin = req.get('origin');
	res.header('Access-Control-Allow-Origin', origin);
	res.header("Access-Control-Allow-Headers", "X-Requested-With");
	res.header('Access-Control-Allow-Headers', 'Content-Type');
	next();
});



endpoints.forEach(function(endpoint) {

	var endpointFunction = function(req, res) {
		var params = (endpoint.post ? req.body : req.query)
		var baton = production_action._getBaton(endpoint.url, params, res)
		if (endpoint.post) baton.requestType = 'POST'
		production_action.validateRequest(baton, params, endpoint.url, function(updated_params) {
			production_action[endpoint.action](baton, updated_params, res);
		})
	}
	if (endpoint.post) {
		app.post('/' + endpoint.url, endpointFunction);
		return
	}
	app.get('/' + endpoint.url, endpointFunction);
})


var server = app.listen(process.env.PORT || 8081, process.env.PORT, function() {
	console.log("Scene Stamp Server Running @ port ", this.address().port)
})

module.exports = {
	server: server
}
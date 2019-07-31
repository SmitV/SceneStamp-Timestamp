var express = require('express');
var production_action = require('./prod2/actions.js');
var app = express();


var endpoints = [
	{
		url : 'getSeriesData',
		action : function(req, res){
					production_action.get_allSeriesData(req.query,res);
				}
	},
	{
		url : 'newSeries',
		action : function(req, res){
					production_action.post_newSeries(req.query,res);
				}

	},
	{
		url : 'getEpisodeData',
		action : function(req, res){
					production_action.get_allEpisodeData(req.query,res);
				}
	},
	{
		url : 'newEpisode',
		action : function(req, res){
					production_action.post_newEpisode(req.query,res);
				}

	},
	{
		url : 'getCharacterData',
		action : function(req, res){
					production_action.get_allCharacterData(req.query,res);
				}
	},
	{
		url : 'newCharacter',
		action : function(req, res){
					production_action.post_newCharacter(req.query,res);
				}

	},
	{
		url : 'getCategoryData',
		action : function(req, res){
					production_action.get_allCategoryData(req.query,res);
				}
	},
	{
		url : 'newCategory',
		action : function(req, res){
					production_action.post_newCategory(req.query,res);
				}

	},
	{
		url : 'getTimestampData',
		action : function(req, res){
					production_action.get_allTimestampData(req.query,res);
				}
	},
	{
		url : 'newTimestamp',
		action : function(req, res){
					production_action.post_newTimestamp(req.query,res);
				}

	},
	{
		url : 'updateTimestamp',
		action : function(req, res){
					production_action.post_updateTimestamp(req.query,res);
				}

	},
];

app.all('*', function(req, res, next) {
     var origin = req.get('origin');
     res.header('Access-Control-Allow-Origin', origin);
     res.header("Access-Control-Allow-Headers", "X-Requested-With");
     res.header('Access-Control-Allow-Headers', 'Content-Type');
     next();
});



endpoints.forEach(function(endpoint){
	app.get('/'+ endpoint.url, function(req, res){
		endpoint.action(req,res);
	});
})


var server = app.listen(process.env.PORT || 8081, function () {
   console.log("Scene Stamp Server Running @ port ",this.address().port )
})

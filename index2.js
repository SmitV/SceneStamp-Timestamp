var express = require('express');
var production_action = require('./prod2/actions.js');
var app = express();


var endpoints = [
	{
		url : 'getSeriesData',
		action : function(req, res){
					production_action.get_allSeriesData(req.query,function(data){
						res.json(data);
					});
				}
	},
	{
		url : 'newSeries',
		action : function(req, res){
					production_action.post_newSeries(req.query,function(data){
						res.json(data);
					});
				}

	},
	{
		url : 'getEpisodeData',
		action : function(req, res){
					production_action.get_allEpisodeData(req.query,function(data){
						res.json(data);
					});
				}
	},
	{
		url : 'newEpisode',
		action : function(req, res){
					production_action.post_newEpisode(req.query,function(data){
						res.json(data);
					});
				}

	},
	{
		url : 'getCharacterData',
		action : function(req, res){
					production_action.get_allCharacterData(req.query,function(data){
						res.json(data);
					});
				}
	},
	{
		url : 'newCharacter',
		action : function(req, res){
					production_action.post_newCharacter(req.query,function(data){
						res.json(data);
					});
				}

	},
	{
		url : 'getCategoryData',
		action : function(req, res){
					production_action.get_allCategoryData(req.query,function(data){
						res.json(data);
					});
				}
	},
	{
		url : 'newCategory',
		action : function(req, res){
					production_action.post_newCategory(req.query,function(data){
						res.json(data);
					});
				}

	},
	{
		url : 'getTimestampData',
		action : function(req, res){
					production_action.get_allTimestampData(req.query,function(data){
						res.json(data);
					});
				}
	},
	{
		url : 'newTimestamp',
		action : function(req, res){
					production_action.post_newTimestamp(req.query,function(data){
						res.json(data);
					});
				}

	},
	{
		url : 'updateTimestamp',
		action : function(req, res){
					production_action.post_updateTimestamp(req.query,function(data){
						res.json(data);
					});
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

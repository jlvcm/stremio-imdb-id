const { addonBuilder } = require('stremio-addon-sdk')
const request = require('request')
const cheerio = require('cheerio');
const package = require('./package.json')
const oneDay = 24 * 60 * 60 // in seconds

const cache = {
	maxAge: 1.5 * oneDay, // 1.5 days
	staleError: 6 * 30 * oneDay // 6 months
}

const manifest = {
	id: 'community.imdbid',
	logo: 'https://m.media-amazon.com/images/G/01/IMDb/BG_square._CB1509067564_SY230_SX307_AL_.png',
	catalogs: [
		{
			type: 'search',
			id: 'search_imdb',
			name: 'imdbID',
			extra: [
				{
		  			name: 'search',
		  			isRequired: true
				}
	  		]
	  	}
	],
	version: package.version,
	resources: ['catalog'],
	types: ['movie'],
	name: 'IMDB ID search',
	description: 'search movies by IMDB ID',
}


const builder = new addonBuilder(manifest)

builder.defineCatalogHandler(args => {
	return new Promise((resolve, reject) => {
		var id;
		if(args.type == 'search' && args.id=='search_imdb' && args.extra.search){
			id = args.extra.search.trim().match(/^(tt)?(\d{7,})$/);
			if(id){
				id = 'tt'+parseInt(id[2], 10).toString().padStart(7, "0");
				request('https://www.imdb.com/title/'+id, function (error, response, html) {
					if (!error && response.statusCode == 200) {
						const $ = cheerio.load(html,{ xmlMode: true });
						const script = $('script[type="application/ld+json"]');
						if(script){
							var data = JSON.parse($('script[type="application/ld+json"]')[0].children[0].data);
							resolve({metas:[{
								id: id,
								name: data.name,
								poster: data.image,
								imdbRating: data.aggregateRating?data.aggregateRating.ratingValue:undefined,
								genres: data.genre,
								posterShape: 'regular',
								type: data['@type']=='Movie'?'movie':'series'
							}],
							cacheMaxAge: cache.maxAge,
							staleError: cache.staleError
						});
						}
					}else{
						resolve({});
					}
				});
			}
		}
		if(!id) resolve({});
	});
});

module.exports = builder.getInterface()

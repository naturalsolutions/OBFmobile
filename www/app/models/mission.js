/**

Model Taxon

**/
define(['jquery', 'underscore', 'backbone','config'],
    function($, _ , Backbone, config){

	'use strict';

	return Backbone.Model.extend({
		defaults: {
			externId: '',
			num: 0,
			title: '',
			taxonId: 0,
			difficulty: 0,
			accept: false,
			success: false,
			departements: [],//codes
			criterias: [],
			seasons: [],//month-day
		},
		url: config.coreUrl,
		isInDepartement: function(codes) {
			var self = this;
			if ( !_.isArray(codes) )
				codes = [codes];
			return _.intersection(codes, self.get('departements')).length;
		},
		isInSeason: function(startAt, endAt) {
			var self = this;
			var seasons = self.get('seasons');
			var today = new Date();
			if ( endAt && !startAt )
				startAt = today;
			var year = startAt.getFullYear();
			var isMatch = false;
			_.forEach(seasons, function(season) {
				var seasonStart = new Date(year+'-'+season.startAt);
				var seasonEnd = new Date(year+'-'+season.endAt);
				if ( seasonEnd < seasonStart )
					seasonEnd.setFullYear(year+1);
				if ( !endAt && startAt >= seasonStart && startAt <= seasonEnd ) {
					isMatch = true;
				} else if ( endAt && !(startAt < seasonStart && endAt < seasonStart) && !(startAt > seasonEnd && endAt > seasonEnd) ) {
					isMatch = true;
				};
			});

			return isMatch;
		}
	});
});

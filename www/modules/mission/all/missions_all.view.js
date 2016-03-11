'use strict';
var Marionette = require('backbone.marionette'),
    Header = require('../../header/header'),
    Router = require('../../routing/router'),
    MissionListItem = require('../list_item/mission_list_item.view'),
    Footer = require('../../footer/footer.view');

module.exports = Marionette.CompositeView.extend({
  template: require('./missions_all.tpl.html'),
  className: 'page page-missions page-missions-all page-scrollable',
  childView: MissionListItem,
  childViewContainer: '.items',
  events: {},

  initialize: function(options) {
    var self = this;
    if ( !options.filterable ) {
      this.header = {
        titleKey: 'missions'
      };
    } else {
      this.header = {
        titleKey: 'missions',
        buttons: {
          right: ['option']
        }
      };
      this.listenTo(Header.getInstance(), 'btn:option:click', function(e) {
        Router.getInstance().navigate('missions/all/filter', {
          trigger: true
        });
      });
    }

    this.listenTo(Footer.getInstance(), 'btn:clue:click', function(e) {
      e.preventDefault();
      var ids = self.collection.pluck('id');
      Router.getInstance().navigate('clue?missionIds='+ids.join(), {trigger:true});
    });
  },

  onShow: function() {
    var self = this;
  },

  onDestroy: function() {
    var self = this;
  }
});

'use strict';

var Backbone = require('backbone'),
    $ = require('jquery'),
    config = require('../main/config'),
    _ = require('lodash'),
    Router = require('../routing/router'),
    Dialog = require('bootstrap-dialog'),
    i18n = require('i18next-client'),
    Observation = require('../observation/observation.model'),
    User = require('../profile/user.model');

Backbone.LocalStorage = require('backbone.localstorage');

var SessionModel = Backbone.Model.extend({
  defaults: {
    token: null,
    isAuth: false,
    authStatus: '',
    network: true,
  },
  initialize: function() {
    var self = this;

    this.on('change:isAuth', function() {
      $('body').toggleClass('user-logged user-unlogged');
    });
    this.on('change:network', function() {
      $('body').toggleClass('network not-network');
    });
  },

  getToken: function() {
    var self = this;
    var dfd = $.Deferred();

    // Call system connect with session token.
    $.ajax({
      url: config.apiUrl + '/user/token.json',
      type: 'post',
      dataType: 'json',
      contentType: 'application/json',
      xhrFields: {
        withCredentials: true
      },
      error: function(jqXHR, textStatus, errorThrown) {
        console.log(errorThrown);
        Dialog.alert({
          closable: true,
          message: errorThrown
        });
        dfd.reject();
      },
      success: function(response) {
        self.set('token', response.token);
        dfd.resolve();
      }
    });

    return dfd;
  },

  //test if user is connected
  isConnected: function() {
    var self = this;
    var dfd = $.Deferred();
    if (!navigator.onLine) {
      return false;
    }
    // Call system connect with session token.
    var query = {
      url: config.apiUrl + '/system/connect.json',
      type: 'post',
      dataType: 'json',
      contentType: 'application/json',
      error: function(jqXHR, textStatus, errorThrown) {
        Dialog.alert({
          closable: true,
          message: errorThrown
        });
      },
      success: function(data) {
        console.log('Hello user #' + data.user.uid);
        dfd.resolve(data);
      }
    };
    self.getCredentials(query).then(function() {
      $.ajax(query);
    });
    return dfd;
  },

  getCredentials: function(query) {
    var self = this;
    var dfd = $.Deferred();

    query.xhrFields = query.xhrFields || {};
    query.xhrFields.withCredentials = true;
    self.getToken().then(function() {
      query.headers = query.headers || {};
      query.headers['X-CSRF-Token'] = self.get('token');
      dfd.resolve();
    });

    return dfd;
  },

  indexUsers: function(parameters) {
    var self = this;
    var dfd = $.Deferred();

    // Call system connect with session token.
    $.ajax({
      url: config.apiUrl + '/user?fields=uid,name,mail&parameters[mail]=' + parameters,
      type: 'get',
      dataType: 'json',
      contentType: 'application/json',
      xhrFields: {
        withCredentials: true
      },
      error: function(jqXHR, textStatus, errorThrown) {
        console.log(errorThrown);
        Dialog.alert({
          closable: true,
          message: errorThrown
        });
        dfd.reject();
      },
      success: function(response) {
        dfd.resolve(response);
      }
    });
    return dfd;
  },

  login: function(username, password) {
    var self = this;
    var dfd = $.Deferred();
    var query = {
      url: config.apiUrl + '/obfmobile_user/login.json',
      type: 'POST',
      contentType: 'application/json',
      data: JSON.stringify({
        username: username,
        password: password,
      }),
      error: function(jqXHR, textStatus, errorThrown) {
        console.log(jqXHR, textStatus, errorThrown);
        Dialog.alert({
          closable: true,
          message: errorThrown
        });
        dfd.reject(errorThrown);
      },
      success: function(response) {
        self.set('isAuth', true);
        dfd.resolve(response);
        if ( self.afterLoggedAction && self[self.afterLoggedAction.name] ) {
          self[self.afterLoggedAction.name](self.afterLoggedAction.options);
        }
        self.afterLoggedAction = null;
      }
    };
    self.getCredentials(query).done(function() {
      $.ajax(query);
    });

    return dfd;
  },

  showObsAndTransmit: function(options) {
    Observation.idToTransmit = options.id;
    Router.getInstance().navigate('#observation/'+options.id, {trigger:true});
  },

  logout: function() {
    var self = this;
    var dfd = $.Deferred();
    var query = {
      url: config.apiUrl + '/user/logout.json',
      type: 'post',
      contentType: 'application/json',
      error: function(jqXHR, textStatus, errorThrown) {
        console.log(jqXHR, textStatus, errorThrown);
        dfd.reject(errorThrown);
        Dialog.alert({
          closable: true,
          message: errorThrown
        });
      },
      success: function(response) {
        self.set('isAuth', false);

        User.model.getInstance().off('change:level');
        User.model.getInstance().off('change:palm');

        User.collection.getInstance().getAnonymous();
        self.set('isAuth', false);
        Router.getInstance().navigate('', {
          trigger: true
        });
        dfd.resolve(response);
      }
    };
    this.getCredentials(query).then(function() {
      $.ajax(query);
    });

    return dfd;
  },

  logoutNoNetwork: function() {
    var self = this;
    modelInstance.set({
      'requestLogout': User.model.getInstance().get('externId')
    }).save();
    User.collection.getInstance().getAnonymous();
    this.set('isAuth', false);
    Router.getInstance().navigate('', {
      trigger: true
    });
  },

  findUser: function(attribute, value) {
    var dfd = $.Deferred();

    var userCollection = User.collection.getInstance();
    userCollection.fetch({
      success: function(users) {
        var myattribute = attribute;
        var myvalue = value;
        var userLogged;
        if (users.length > 0) {
          userLogged = _.find(users.models, function(user) {
            return user.get(myattribute) === myvalue;
          });
        }
        dfd.resolve(userLogged);
      },
      error: function(error) {
        console.log(error);
        dfd.reject();
      }
    });
    return dfd;
  },

  manageAccount: function(model, email) {
    var dfd = $.Deferred();
    User.model.clean();
    User.model.init();
    if (model) {
      // user existe in local
      User.model.getInstance().set(model.attributes);
      dfd.resolve(User.model.getInstance());
    } else if (!model && !email) {
      User.collection.getInstance().add(User.model.getInstance()).save();
      dfd.resolve(User.model.getInstance());
    } else if (email) {
      User.collection.getInstance().add(User.model.getInstance().set({
        'email': email
      })).save();
      dfd.resolve(User.model.getInstance());
    }
    return dfd;
  },

  userExistsLocal: function(response) {
    var self = this;
    var dfd = $.Deferred();
    var userCollection = User.collection.getInstance();
    userCollection.fetch({
      success: function(users) {
        if (users.length > 0) {
          User.model.clean();
          User.model.init();
          var userExists = users.findWhere({
            'externId': response.user.uid
          });
          if (userExists) {
            // user existe in local
            User.model.getInstance().set(userExists.attributes);
          } else {
            User.collection.getInstance().add(User.model.getInstance()).save();
          }
          self.addObsAnonymous();
        }
        dfd.resolve();
      },
      error: function(error) {
        console.log(error);
        dfd.reject();
      }
    });
    return dfd;
  },

  addObsAnonymous: function() {
    var dfd = $.Deferred();
    this.findUser('email', '').then(function(user) {
      Observation.collection.getInstance().fetch().then(function() {
        var obsAnonymous = Observation.collection.getInstance().where({
          userId: user.get('id')
        });
        if (obsAnonymous.length) {
          obsAnonymous.forEach(function(item) {
            item.set({
              userId: User.model.getInstance().get('id')
            });
          });
        }

        dfd.resolve(obsAnonymous);
      });
    });
    return dfd;
  },
});

var Collection = Backbone.Collection.extend({
  model: SessionModel,
  url: '',
  localStorage: new Backbone.LocalStorage('sessionCollection')
});

var modelInstance = null;
var collectionInstance = null;

module.exports = {
  model: {
    ClassDef: SessionModel,
    getClass: function() {
      return SessionModel;
    },
    getInstance: function() {
      if (!modelInstance) {
        collectionInstance = new Collection();
        modelInstance = collectionInstance.add(new SessionModel());
      }
      return modelInstance;
    }
  },
  collection: {
    getInstance: function() {
      if (!collectionInstance)
          collectionInstance = new Collection();
      return collectionInstance;
    }
  }
};

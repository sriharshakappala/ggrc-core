/*
 * Copyright (C) 2013 Google Inc., authors, and contributors <see AUTHORS file>
 * Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
 * Created By: dan@reciprocitylabs.com
 * Maintained By: dan@reciprocitylabs.com
 */

(function(can, $) {

  /* Role Assignment Modal Selector
   *
   * parameters:
   *   Templates:
   *     base_modal_view:
   *     option_column_view:
   *     active_column_view:
   *     option_object_view:
   *     active_object_view:
   *     option_detail_view:
   *
   *   Models and Queries:
   *     option_model: The model being "selected" (the "many")
   *     option_query:
   *       Any additional parameters needed to restrict valid options
   *     active_query:
   *       Any additional parameters needed to restrict active options
   *     join_model: The model representing the join table
   *     extra_join_query:
   *       Any additional parameters needed to restrict the join results
   *     extra_join_params:
   *       And additional parameters to be POSTed in the join object
   *
   *   Customizable text components:
   *     modal_title:
   *     option_list_title:
   *     active_list_title:
   *     new_object_title:
   */

  can.Control("GGRC.Controllers.UserRolesModalSelector", {
    _templates: [
      "base_modal_view",
      "option_column_view",
      "active_column_view",
      "option_object_view",
      "active_object_view",
      "option_detail_view"
    ],

    defaults: {
      base_modal_view: GGRC.mustache_path + "/selectors/base_modal.mustache",
      option_column_view: GGRC.mustache_path + "/selectors/option_column.mustache",
      active_column_view: GGRC.mustache_path + "/selectors/active_column.mustache",
      option_object_view: null, //GGRC.mustache_path + "/selectors/option_object.mustache",
      active_object_view: null, //GGRC.mustache_path + "/selectors/active_object.mustache",
      option_detail_view: GGRC.mustache_path + "/selectors/option_detail.mustache",

      option_model: null,
      option_query: {},
      active_query: {},
      join_model: null,
      join_query: {},
      join_object: null,

      modal_title: null,
      option_list_title: null,
      active_list_title: null,
      new_object_title: null,
    },

    launch: function($trigger, options) {
      // Extract parameters from data attributes

      var href = $trigger.attr('data-href') || $trigger.attr('href')
        , modal_id = 'ajax-modal-' + href.replace(/[\/\?=\&#%]/g, '-').replace(/^-/, '')
        , $target = $('<div id="' + modal_id + '" class="modal modal-selector hide"></div>')
        ;

      $target.modal_form({}, $trigger);
      this.newInstance($target[0], $.extend({ $trigger: $trigger}, options));
      return $target;
    }
  }, {
    init: function() {
      this.object_list = new can.Observe.List();
      this.option_list = new can.Observe.List();
      this.join_list = new can.Observe.List();
      this.active_list = new can.Observe.List();

      this.init_context();
      this.init_bindings();
      this.init_view(),
      this.init_data()
    },

    ".object_column li click": "select_object",
    ".option_column li click": "select_option",
    ".option_column li input[type='checkbox'] change": "change_option",

    init_bindings: function() {
      this.join_list.bind("change", this.proxy("update_active_list"));
      this.context.bind("selected_object", this.proxy("refresh_join_list"));
      this.option_list.bind("change", this.proxy("update_option_checkboxes"));
    },

    init_view: function() {
      var self = this
        , deferred = $.Deferred()
        ;

      can.view(
        this.options.base_modal_view,
        this.context,
        function(frag) {
          $(self.element).html(frag);
          deferred.resolve();
          self.element.trigger('loaded');
        });

      // Start listening for events
      this.on();

      return deferred;
    },

    init_data: function() {
      return $.when(
        this.refresh_object_list(),
        this.refresh_option_list(),
        this.refresh_join_list()
      );
    },

    init_context: function() {
      if (!this.context) {
        this.context = new can.Observe($.extend({
            objects: this.object_list
          , options: this.option_list
          , joins: this.join_list
          , actives: this.active_list
          , selected_object: null
          , selected_option: null
          , page_model: GGRC.page_model
        }, this.options));
      }
      return this.context;
    },

    update_active_list: function() {
      var self = this;

      self.active_list.replace(
        can.map(self.join_list, function(join) {
          return new can.Observe({
            option: CMS.Models.get_instance(
              CMS.Models.get_link_type(join, self.options.option_attr),
              join[self.options.option_id_field] || join[self.options.option_attr].id)
          , join: join
          });
        }));
    },

    refresh_object_list: function() {
      var self = this
        ;

      return this.options.object_model.findAll(
        $.extend({}, this.object_query),
        function(objects) {
          self.object_list.replace(objects)
        });
    },

    refresh_option_list: function() {
      var self = this
        , instance = GGRC.page_instance()
        , params = {}
        ;

      // If this is a private model, set the scope
      if (instance && instance.constructor.shortName === "Program" && instance.context) {
        params.scope = "Private Program";
      }
      else if (/admin/.test(window.location)) {
        params.scope = "System";
      }
      else if (instance) {
        params.scope = instance.constructor.shortName;
      }

      return this.options.option_model.findAll(
        $.extend(params, this.option_query),
        function(options) {
          self.option_list.replace(options)
        });
    },

    refresh_join_list: function() {
      var self = this
        , join_object = this.get_join_object()
        , join_query
        ;

      if (join_object) {
        join_query = can.extend({}, this.options.extra_join_query);
        join_query[this.options.join_id_field] = this.get_join_object_id();
        if (this.options.join_type_field) {
          join_query[this.options.join_type_field] = this.get_join_object_type();
        }

        return this.options.join_model.findAll(
          $.extend({}, join_query),
          function(joins) {
            self.join_list.replace(joins);
            self.update_option_checkboxes();
          });
      } else {
        return $.Deferred().resolve();
      }
    },

    update_option_checkboxes: function() {
      var self = this
        , $option_list = $(this.element).find('.option_column ul')
        ;

      $option_list
        .find('li[data-id] input[type=checkbox]')
        .prop('checked', false);

      this.join_list.forEach(function(join, index, list) {
        $option_list
          .find('li[data-id=' + join[self.options.option_attr].id + '] input[type=checkbox]')
          .prop('checked', true);
      });
    },

    /*" hide": function(el, ev) {
      // FIXME: This should only happen if there has been a change.
      //   - (actually, the "Related Widget" should just be Can-ified instead)
      var list_target = this.options.$trigger.data('list-target');
      if (list_target === "refresh" && this._data_changed)
        setTimeout(can.proxy(window.location.reload, window.location), 10);
    },*/

    select_object: function(el) {
      el.closest('.object_column').find('li').removeClass('selected');
      el.addClass('selected');
      this.context.attr('selected_object', el.data('object'));
      //this.refresh_join_list();
    },

    select_option: function(el) {
      el.closest('.option_column').find('li').removeClass('selected');
      el.addClass('selected');
      this.context.attr('selected_option', el.data('option'));
    },

    change_option: function(el, ev) {
      var self = this
        , option = el.closest('li').data('option')
        , join = this.find_join(option.id)
        ;

      // FIXME: This is to trigger a page refresh only when data has changed
      //   - currently only used for the Related widget (see the " hide" event)
      //this._data_changed = true;

      if (el.is(':checked')) {
        // First, check if join instance already exists
        if (join) {
          // Ensure '_removed' attribute is false
          join.attr('_removed', false);
        } else {
          // Otherwise, create it
          join = this.get_new_join(option.id, option.constructor.shortName);
          join.save().then(function() {
            //join.refresh().then(function() {
              self.join_list.push(join);
              self.element.trigger("relationshipcreated", join);
            //});
          });
        }
      } else {
        // Check if instance is still selected
        if (join) {
          // Ensure '_removed' attribute is false
          if (join.isNew()) {
            // It was created, then removed, so remove from list
            join_index = this.join_list.indexOf(join);
            if (join_index >= 0) {
              this.join_list.splice(join_index, 1);
            }
          } else {
            // FIXME: The data should be updated in bulk, and only when "Save"
            //   is clicked.  Right now, it updates continuously.
            //join.attr('_removed', true);
            join.refresh().done(function() {
              join.destroy().then(function() {
                join_index = self.join_list.indexOf(join);
                if (join_index >= 0) {
                  self.join_list.splice(join_index, 1);
                }
                self.element.trigger("relationshipdestroyed", join);
              });
            });
          }
        }
      }
    },

    // HELPERS

    find_join: function(option_id) {
      var self = this
        ;

      return can.reduce(
        this.join_list,
        function(result, join) {
          if (result)
            return result;
          if (self.match_join(option_id, join))
            return join;
        },
        null);
    },

    match_join: function(option_id, join) {
      return join[this.options.option_id_field] == option_id ||
        (join[this.options.option_attr]
         && join[this.options.option_attr].id == option_id)
    },

    get_new_join: function(option_id, option_type) {
      var join_params = {};
      join_params[this.options.option_id_field] = option_id;
      if (this.options.option_type_field) {
        join_params[this.options.option_type_field] = option_type;
      }
      join_params[this.options.join_id_field] = this.get_join_object_id();
      if (this.options.join_type_field) {
        join_params[this.options.join_type_field] = this.get_join_object_type();
      }
      $.extend(join_params, this.options.extra_join_fields);
      // FIXME: context_id must get a real value
      //if (!join_params.context || !join_params.context.id)
        //join_params.context = { id: 0 }

      return new (this.options.join_model)(join_params);
    },

    get_join_object: function() {
      return this.context.attr('selected_object');
    },

    get_join_object_id: function() {
      return this.get_join_object().id;
    },

    get_join_object_type: function() {
      var join_object = this.get_join_object();
      return (join_object ? join_object.constructor.shortName : null);
    }
  });

  function get_page_object() {
    return GGRC.make_model_instance(GGRC.page_object);
  }

  function get_option_set(name, data) {
    // Construct options for Authorizations selector
    var context;
    if (GGRC.page_object) {
      context = GGRC.make_model_instance(GGRC.page_object).context;
      if (!context)
        throw new Error("`context` is required for Assignments model");
      context = context.stub();
    } else {
      context = {id: null};
    }

    return {
        base_modal_view: "/static/ggrc_basic_permissions/mustache/people_roles/base_modal.mustache"
      , option_column_view: "/static/ggrc_basic_permissions/mustache/people_roles/option_column.mustache"
      , option_detail_view: "/static/ggrc_basic_permissions/mustache/people_roles/option_detail.mustache"
      , active_column_view: "/static/ggrc_basic_permissions/mustache/people_roles/active_column.mustache"

      , object_column_view: "/static/ggrc_basic_permissions/mustache/people_roles/object_column.mustache"
      , object_detail_view: "/static/ggrc_basic_permissions/mustache/people_roles/object_detail.mustache"

      , new_object_title: "Person"
      , modal_title: "User Role Assignments"

      , related_model_singular: "Person"
      , related_table_plural: "people"
      , related_title_singular: "Person"
      , related_title_plural: "People"

      , object_model: CMS.Models.Person
      , option_model: CMS.Models.Role
      , join_model: CMS.Models.UserRole

      //join_object_attr
      , option_attr: 'role'
      //join_option_attr
      , join_attr: 'person'
      //join_option_id_field
      , option_id_field: 'role_id'
      , option_type_field: null
      //join_object_id_field
      , join_id_field: 'person_id'
      , join_type_field: null

      , extra_join_fields: {
          context: context
        }
      , extra_join_query: {
          context_id: context.id
        }
    };
  }

  $(function() {
    $('body').on('click', '[data-toggle="user-roles-modal-selector"]', function(e) {
      var $this = $(this)
        , options = $this.data('modal-selector-options')
        , data_set = can.extend({}, $this.data())
        ;

      can.each($this.data(), function(v, k) {
        data_set[k.replace(/[A-Z]/g, function(s) { return "_" + s.toLowerCase(); })] = v; //this is just a mapping of keys to underscored keys
        if(!/[A-Z]/.test(k)) //if we haven't changed the key at all, don't delete the original
          delete data_set[k];
      });

      if (typeof(options) === "string")
        options = get_option_set(
          options
          , data_set
        );

      e.preventDefault();

      // Trigger the controller
      GGRC.Controllers.UserRolesModalSelector.launch($this, options)
        .on("relationshipcreated relationshipdestroyed", function(ev, data) {
          $this.trigger("modal:" + ev.type, data);
        });
    });
  });
})(window.can, window.can.$);

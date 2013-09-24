/*
 * Copyright (C) 2013 Google Inc., authors, and contributors <see AUTHORS file>
 * Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
 * Created By:
 * Maintained By:
 */

(function(can, $) {

can.Control("GGRC.Controllers.Modals", {
  BUTTON_VIEW_DONE : GGRC.mustache_path + "/modals/done_buttons.mustache"
  , BUTTON_VIEW_CLOSE : GGRC.mustache_path + "/modals/close_buttons.mustache"
//  BUTTON_VIEW_SAVE
  , BUTTON_VIEW_SAVE_CANCEL : GGRC.mustache_path + "/modals/save_cancel_buttons.mustache"
  , BUTTON_VIEW_SAVE_CANCEL_DELETE : GGRC.mustache_path + "/modals/save_cancel_delete_buttons.mustache"

  , defaults : {
    preload_view : GGRC.mustache_path + "/dashboard/modal_preload.mustache"
    , content_view : GGRC.mustache_path + "/help/help_modal_content.mustache"
    , header_view : GGRC.mustache_path + "/modals/modal_header.mustache"
    , button_view : null
    , model : null    // model class to use when finding or creating new
    , instance : null // model instance to use instead of finding/creating (e.g. for update)
    , new_object_form : false
    , find_params : {}
  }

  , init : function() {
    this.defaults.button_view = this.BUTTON_VIEW_DONE;
  }

  , confirm : function(options, success, dismiss) {
    var $target = $('<div class="modal hide"></div>');
    $target
    .modal({ backdrop: "static" })
    .ggrc_controllers_modals(can.extend({
      new_object_form : false
      , button_view : GGRC.mustache_path + "/modals/confirm_buttons.mustache"
      , modal_confirm : "Confirm"
      , modal_description : "description"
      , modal_title : "Confirm"
      , content_view : GGRC.mustache_path + "/modals/confirm.mustache" 
    }, options))
    .on('click', 'a.btn[data-toggle=confirm]', function(e) {
      $target.modal('hide').remove();
      success && success();
    })
    .on('click.modal-form.close', '[data-dismiss="modal"]', function() {
      $target.modal('hide').remove();
      dismiss && dismiss();
    });
  }
}, {
  init : function() {
    if(!this.element.find(".modal-body").length) {
      can.view(this.options.preload_view, {}, this.proxy("after_preload"));
    } else {
      this.after_preload()
    }
  }

  , after_preload : function(content) {
    var that = this;
    if (content) {
      this.element.html(content);
    }
    this.options.$header = this.element.find(".modal-header");
    this.options.$content = this.element.find(".modal-body");
    this.options.$footer = this.element.find(".modal-footer");
    this.on();
    this.fetch_all()
      .then(this.proxy("apply_object_params"))
      .then(function() { that.element.trigger('preload') })
      .then(this.proxy("autocomplete"));
  }

  , apply_object_params : function() {
    var self = this;

    if (this.options.object_params)
      can.each(this.options.object_params, function(value, key) {
        self.set_value({ name: key, value: value });
      });
  }

  , autocomplete : function() {
    // Add autocomplete to the owner field
    var ac = this.element.find('input[name="owner.email"]').autocomplete({
      // Ensure that the input.change event still occurs
      change : function(event, ui) {
        $(event.target).trigger("change");
      }

      // Search for the people based on the term
      , source : function(request, response) {
        var query = request.term;

        GGRC.Models.Search
        .search_for_types(
            request.term || '',
            ["Person"],
            {
              __permission_type: 'create'
              , __permission_model: 'ObjectPerson'
            })
        .then(function(search_result) {
          var people = search_result.getResultsForType('Person')
            , queue = new RefreshQueue()
            ;

          // Retrieve full people data
          can.each(people, function(person) {
            queue.enqueue(person);
          });
          queue.trigger().then(function(people) {
            response(can.map(people, function(person) { 
              return {
                label: person.name ? person.name + " <span class=\"url-link\">" + person.email + "</span>" : person.email,
                value: person.email
              };
            }));
          });
        });
      }
    }).data('ui-autocomplete');
    if(ac) {
      ac._renderItem = function(ul, item) {
        return $('<li>').append('<a>' + item.label + '</a>').appendTo(ul);
      };
    }
  }

  , fetch_templates : function(dfd) {
    var that = this;
    dfd = dfd ? dfd.then(function() { return that.options; }) : $.when(this.options);
    return $.when(
      can.view(this.options.content_view, dfd)
      , can.view(this.options.header_view, dfd)
      , can.view(this.options.button_view, dfd)
    ).done(this.proxy('draw'));
  }

  , fetch_data : function(params) {
    var that = this;
    var dfd;
    if (this.options.skip_refresh && this.options.instance) {
      return new $.Deferred().resolve(this.options.instance);
    }
    else if (this.options.instance) {
      dfd = this.options.instance.refresh();
    } else if (this.options.model) {
      dfd = this.options.new_object_form
          ? $.when(this.options.instance = new this.options.model(params || this.find_params()))
          : this.options.model.findAll(params || this.find_params()).then(function(data) {
            var h;
            if(data.length) {
              that.options.instance = data[0];
              return data[0].refresh(); //have to refresh (get ETag) to be editable.
            } else {
              that.options.new_object_form = true;
              that.options.instance = new that.options.model(params || that.find_params());
              return that.options.instance;
            }
          });
    } else {
      this.options.instance = new can.Observe(params || this.find_params());
      dfd = new $.Deferred().resolve(this.options.instance);
    }
    
    return dfd;
  }

  , fetch_all : function() {
    return this.fetch_templates(this.fetch_data(this.find_params()));
  }

  , find_params : function() {
    return this.options.find_params;
  }

  , draw : function(content, header, footer) {
    can.isArray(content) && (content = content[0]);
    can.isArray(header) && (header = header[0]);
    can.isArray(footer) && (footer = footer[0]);

    header != null && this.options.$header.find("h2").html(header);
    content != null && this.options.$content.html(content).removeAttr("style");
    footer != null && this.options.$footer.html(footer);

    this.options.$content.find("input:first").focus();

    this.element.find('.wysihtml5').each(function() {
      $(this).cms_wysihtml5();
    });
    this.serialize_form();
  }

  , "input, textarea, select change" : function(el, ev) {
      this.set_value_from_element(el);
  }

  , "input, textarea, select keyup" : function(el, ev) {
      if ($(el).is(':not([name="owner.email"])') || !$(el).val())
        this.set_value_from_element(el);
  }

  , serialize_form : function() {
      var $form = this.options.$content.find("form")
        , $elements = $form.find(":input")
        ;

      can.each($elements.toArray(), this.proxy("set_value_from_element"));
    }

  , set_value_from_element : function(el) {
      var $el = $(el)
        , name = $el.attr('name')
        , value = $el.val()
        ;

      if ($el.is('select[multiple]'))
        value = value || [];
      if (name)
        this.set_value({ name: name, value: value });
    }

  , set_value: function(item) {
    // Don't set `_wysihtml5_mode` on the instances
    if (item.name === '_wysihtml5_mode')
      return;
    var instance = this.options.instance
      , that = this;
    if(!(instance instanceof this.options.model)) {
      instance = this.options.instance
               = new this.options.model(instance && instance.serialize ? instance.serialize() : instance);
    }
    var name = item.name.split(".")
      , $elem, value, model;
    $elem = this.options.$content.find("[name='" + item.name + "']");
    model = $elem.attr("model");

    if (model) {
      if (item.value instanceof Array)
        value = can.map(item.value, function(id) {
          return CMS.Models.get_instance(model, id);
        });
      else
        value = CMS.Models.get_instance(model, item.value);
    } else if ($elem.is("[type=checkbox]")) {
      value = $elem.is(":checked");
    } else {
      value = item.value ? html_sanitize(item.value) : item.value;
    }

    if ($elem.is("[null-if-empty]") && (!value || value.length === 0))
      value = null;

    if(name.length > 1) {
      if(can.isArray(value)) {
        value = new can.Observe.List(can.map(value, function(v) { return new can.Observe({}).attr(name.slice(1).join("."), v); }));
      } else {

        if(name[name.length - 1] === "email") {
          if(!value) {
            name.pop(); //set the owner to null, not the email
            value = null;
          } else {
            // Search for the person
            this._email_check = $.when(
                CMS.Models.Person.findInCacheByEmail(value) || CMS.Models.Person.findAll({email : value})
              ).done(function(data) {
                if(data.length != null)
                  data = data[0];

                if(data) {
                  value = name.length > 2 ? new can.Observe({}).attr(name.slice(1, name.length - 1).join("."), data) : data;
                  instance.attr(name[0], value);
                } else {
                  that.element && that.element.trigger("ajax:flash", { warning : "user: " + value + " not found.  Please enter valid email address."});
                  $elem.val($elem.attr("value"));
                }
              });

            // If this is already resolved (cached), there wasn't really an XHR to bind to
            if (this._email_check.state() !== "resolved") {
              that.bindXHRToButton(that._email_check, that.options.$footer.find("a.btn[data-toggle='modal-submit']"), undefined, false);
              return; //don't update the existing owner email if there is one.
            }
          }
        } else {
          value = new can.Observe({}).attr(name.slice(1).join("."), value);
        }
      }
    }
    instance.attr(name[0], value && value.serialize ? value.serialize() : value);
  }

  , "{$footer} a.btn[data-toggle='modal-submit'] click" : function(el, ev) {
    var that = this;

    // Normal saving process
    if (el.is(':not(.disabled)')) {
      var instance = this.options.instance
      , ajd;

      this.serialize_form();

      // Special case to handle context outside the form itself
      // - this avoids duplicated change events, and the API requires
      //   `context` to be present even if `null`, unlike other attributes
      if (!instance.context)
        instance.attr('context', { id: null });

      ajd = instance.save().done(function(obj) {
        function finish() {
          that.element.trigger("modal:success", obj).modal_form("hide");
        };

        // If this was an Objective created directly from a Section, create a join
        var params = that.options.object_params;
        if (obj instanceof CMS.Models.Objective && params && params.section) {
          new CMS.Models.SectionObjective({
            objective: obj
            , section: CMS.Models.Section.findInCacheById(params.section.id)
            , context: { id: null }
          }).save().done(finish);
        }
        else {
          finish();
        }
      }).fail(function(xhr, status) {
        el.trigger("ajax:flash", { error : xhr.responseText });
      });
      this.bindXHRToButton(ajd, el, "Saving, please wait...");
    }
    // Queue a save if clicked after verifying the email address
    else if (this._email_check) {
      this._email_check.done(function(data) {
        if (data.length != null)
          data = data[0];
        if (data) {
          setTimeout(function() {
            delete that._email_check;
            el.trigger('click');
          }, 0);
        }
      });
    }
  }

  , " ajax:flash" : function(el, ev, mesg) {
    var that = this;
    this.options.$content.find(".flash").length || that.options.$content.prepend("<div class='flash'>");

    ev.stopPropagation();

    can.each(["success", "warning", "error"], function(type) {
      var tmpl;
      if(mesg[type]) {
        tmpl = '<div class="alert alert-'
        + type
        +'"><a href="#" class="close" data-dismiss="alert">&times;</a><span>'
        + mesg[type]
        + '</span></div>';
        that.options.$content.find(".flash").append(tmpl);
      }
    });
  }

  , " hide" : function() {
      if (this.options.instance instanceof can.Model
          && !this.options.skip_refresh
          && !this.options.instance.isNew()) {
        this.options.instance.refresh();
      }
    }

  , destroy : function() {
    if(this.options.model && this.options.model.cache) {
      delete this.options.model.cache[undefined];
    }
    this._super && this._super.apply(this, arguments);
  }
});

})(window.can, window.can.$);

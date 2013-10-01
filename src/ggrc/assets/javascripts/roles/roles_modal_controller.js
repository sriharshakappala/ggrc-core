/*
 * Copyright (C) 2013 Google Inc., authors, and contributors <see AUTHORS file>
 * Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
 * Created By: david@reciprocitylabs.com
 * Maintained By: david@reciprocitylabs.com
 */

(function(can, $) {
  GGRC.Controllers.Modals("GGRC.Controllers.RoleModal", {
    defaults : {
      content_view : GGRC.mustache_path + "/roles/modal_content.mustache"
    }
  }, {
    init : function() {
      this._super();
    }
    , set_value : function (item) {
      var instance = this.options.instance;
      if(!(instance instanceof this.options.model)) {
        instance = this.options.instance
                 = new this.options.model(instance && instance.serialize ? instance.serialize() : instance);
      }
      var name = item.name.split(".")
        , $elem, value;
      $elem = this.options.$content.find("[name='" + item.name + "']");

      if (typeof(item.value) == 'undefined') {
        value = $elem.val();
        if($elem.attr("numeric") && isNaN(parseInt(value, 10))) {
          value = null;
        }
      } else if ($elem.is("[type=checkbox]")) {
        value = $elem.is(":checked");
      } else {
        value = item.value;
      }

      if ($elem.is("[null-if-empty]") && value.length == 0)
        value = null;

      if(name.length > 1) {
        if(can.isArray(value)) {
          value = new can.Observe.List(can.map(value, function(v) { return new can.Observe({}).attr(name.slice(1).join("."), v); }));
        } else {
          value = new can.Observe({}).attr(name.slice(1).join("."), value);
        }
      }
      if ($elem.is("[type=checkbox]")) {
        this.set_permission_value(instance, item, name, value);
      } else {
        instance.attr(name[0], value);
      }
    }
    , set_permission_value : function (instance, item, name, value) {
      var push_if_missing = function push_(target, rtype) {
        if (target.indexOf(rtype) < 0) {
          target.push(rtype);
        }
      };

      var splice_if_present = function (target, rtype) {
        var idx = target.indexOf(rtype);
        if (idx >= 0) {
          target.splice(idx, 1);
        }
      };

      var clear = function(target) {
        target.splice(0, target.length);
      }

      if (name[1] == "__ALL__") {
        // Selection chaining is handled by events, so do nothing here.
      } else if (name[0] == "view") {
        if (value[name[1]] == true) {
          push_if_missing(instance.permissions.read, name[1]);
        } else {
          splice_if_present(instance.permissions.read, name[1]);
        }
      } else if (name[0] == "modify") {
        if (value[name[1]] == true) {
          push_if_missing(instance.permissions.create, name[1]);
          push_if_missing(instance.permissions.update, name[1]);
          push_if_missing(instance.permissions.delete, name[1]);
        } else {
          splice_if_present(instance.permissions.create, name[1]);
          splice_if_present(instance.permissions.update, name[1]);
          splice_if_present(instance.permissions.delete, name[1]);
        }
      }
    }

    , "input[type=checkbox] change": function(el, ev) {
        var name = el.attr('name').split('.')
          , checked = el.is(':checked')
          , $input
          ;

        if (name[1] === '__ALL__') {
          this.element.find("input[name^='" + name[0] + ".']").each(function(i, input) {
            $input = $(input);
            if ($input.is(':checked') != checked)
              $input.click();
          });
        } else if (name[0] === 'modify' && checked) {
          // If checked, ensure associated 'view' is checked
          $input = this.element.find("input[name='view." + name[1] + "']");
          if (!$input.is(':checked'))
            $input.click();
        } else if (name[0] === 'view' && !checked) {
          // If unchecked, ensure associated 'modify' is unchecked
          $input = this.element.find("input[name='modify." + name[1] + "']");
          if ($input.is(':checked'))
            $input.click();
        }
    }
  });

  $(function() {
    $('body').on('click', '[data-toggle="role-modal"]', function(e) {
      var $this = $(this)
        , toggle_type = $(this).data('toggle')
        , modal_id, target, $target, option, href, new_target, modal_type
        ;
      
      $target = $(target);
      new_target = $target.length == 0;

      if (new_target) {
        $target = $('<div id="' + modal_id + '" class="modal hide"></div>');
        $target.addClass($this.attr('data-modal-class'));
        $this.attr('data-target', '#' + modal_id);
      }
      
      $target.on('hidden', function(ev) {
        if (ev.target === ev.currentTarget)
          $target.remove();
      });

      option = $target.data('modal-help') ? 'toggle' : $.extend({}, $target.data(), $this.data());

      e.preventDefault();
      e.originalEvent && e.originalEvent.preventDefault();
      var $trigger = $this;
      var form_target = $trigger.data('form-target')
      , model = CMS.Models[$trigger.attr("data-object-singular")]
      , instance;
      if($trigger.attr('data-object-id') === "page") {
        instance = GGRC.page_instance();
      } else {
        instance = model.findInCacheById($trigger.attr('data-object-id'));
      }
      
      $target.modal_form(option, $trigger);
      var button_view;
      if (!instance || instance.not_system_role()) {
        button_view = GGRC.Controllers.Modals.BUTTON_VIEW_SAVE_CANCEL_DELETE;
      } else {
        button_view = GGRC.Controllers.Modals.BUTTON_VIEW_CLOSE;
      }
      options = {
        new_object_form : !$trigger.attr('data-object-id')
        , button_view : button_view
        , model : model
        , instance : instance
        , scopes : CMS.Models.Role.scopes
        , modal_title : (instance ? "Edit " : "New ") + $trigger.attr("data-object-singular")
        , content_view : GGRC.mustache_path + "/" + $trigger.attr("data-object-plural") + "/modal_content.mustache"
      };
      var modal = GGRC.Controllers.RoleModal.newInstance($target[0], $.extend({ $trigger: $trigger}, options));
      $target.on('ajax:json', function(e, data, xhr) {
        if (data.errors) {
        } else if (form_target == 'refresh') {
          refresh_page();
        } else if (form_target == 'redirect') {
          window.location.assign(xhr.getResponseHeader('location'));
        } else {
          var dirty;
          $target.modal_form('hide');
          if($trigger.data("dirty")) {
            dirty = $($trigger.data("dirty").split(",")).map(function(i, val) {
              return '[href="' + val.trim() + '"]';
            }).get().join(",");
            $(dirty).data('tab-loaded', false);
          }
          if(dirty) {
            var $active = $(dirty).filter(".active [href]");
            $active.closest(".active").removeClass("active");
            $active.click();
          }
          $trigger.trigger("routeparam", $trigger.data("route"));
          $trigger.trigger('modal:success', data);
        }
      });
    });
  });

})(window.can, window.can.$);

Mustache.registerHelper("permission_checkbox", function(action, resourcetype, contexts) {
  var capitalized_action = can.capitalize(action);
  var checked = false;
  if (resourcetype == "__ALL__") {
    var rtypes = [
      "Program", "Cycle", "ProgramDirective", "ProgramControl",
      "ObjectObjective", "ObjectSection", "Relationship", "ObjectDocument",
      "ObjectPerson", "UserRole"];
    if (action == "view") {
      checked = this.permissions["read"] != undefined;
      if (checked) {
        for (i in rtypes) {
          if (this.permissions.read.indexOf(rtypes[i]) < 0) {
            checked = false;
            break;
          }
        }
      }
    } else {
      checked =
        this.permissions["create"] != undefined
        && this.permissions["read"] != undefined
        && this.permissions["update"] != undefined
        && this.permissions["delete"] != undefined;
      if (checked) {
        for (i in rtypes) {
          if (this.permissions.create.indexOf(rtypes[i]) < 0
              || this.permissions.read.indexOf(rtypes[i]) < 0
              || this.permissions.update.indexOf(rtypes[i]) < 0
              || this.permissions.delete.indexOf(rtypes[i]) < 0) {
            checked = false;
            break;
          }
        }
      }
    }
  } else {
    if (action == "view") {
      checked = this.permissions["read"] != undefined && this.permissions.read.indexOf(resourcetype) >= 0;
    } else {
      checked = 
        this.permissions["create"] != undefined
        && this.permissions["read"] != undefined
        && this.permissions["update"] != undefined
        && this.permissions["delete"] != undefined
        && this.permissions.create.indexOf(resourcetype) >= 0
        && this.permissions.read.indexOf(resourcetype) >= 0
        && this.permissions.update.indexOf(resourcetype) >= 0
        && this.permissions.delete.indexOf(resourcetype) >= 0;
    }
  }
  return [
    '<input type="checkbox" name="'
    , action
    , '.'
    , resourcetype
    , '" value="permissions"'
    , checked ? ' checked="checked"' : ''
    , '>'
    , capitalized_action
    , '</input>'
  ].join("");
});

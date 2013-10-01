/*
 * Copyright (C) 2013 Google Inc., authors, and contributors <see AUTHORS file>
 * Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
 * Created By:
 * Maintained By:
 */

//= require can.jquery-all
//= require controllers/filterable_controller

CMS.Controllers.Filterable("CMS.Controllers.DashboardWidgets", {
  defaults : {
    model : null
    , widget_id : ""
    , widget_name : ""
    , widget_icon : ""
    , widget_view : "/static/mustache/dashboard/object_widget.mustache"
    , widget_guard : null
    , widget_initial_content : ''
    , show_filter : false
    , object_category : null //e.g. "governance"
    , content_selector : ".content"
    //, minimum_widget_height : 100
    , content_controller : null
    , content_controller_options : {}
    , content_controller_selector : null
  }
}, {

  init : function() {

    if(!this.options.model && GGRC.page_model) {
      this.options.model = GGRC.infer_object_type(GGRC.page_object);
    }

    if(!this.options.widget_icon && this.options.model) {
      this.options.widget_icon = this.options.model.table_singular;
    }
    if(this.options.widget_icon && !/^grcicon/.test(this.options.widget_icon)) {
      this.options.widget_icon = "grcicon-" + this.options.widget_icon + "-color";
    }

    if(!this.options.object_category && this.options.model) {
      this.options.object_category = this.options.model.category;
    }

    this.element
    .addClass("widget")
    .addClass(this.options.object_category)
    .attr("id", this.options.widget_id + "_widget")
    //.css("height", this.options.minimum_widget_height)
    .html($(new Spinner().spin().el).css({
        width: '100px',
        height: '100px',
        left: '0px',
        top: '10px'
        }))
    .trigger("section_created");

    $.when(
      can.view(this.options.widget_view, $.when(this.options))
      , CMS.Models.DisplayPrefs.findAll()
    ).done(this.proxy("draw_widget"));
  }

  , draw_widget : function(frag, prefs) {

    this.element.html(frag[0]);
    this.element.trigger("widgets_updated");

    var content = this.element
      , controller_content = null;
    if(prefs.length < 1) {
      prefs.push(new CMS.Models.DisplayPrefs());
      prefs[0].save();
    }

    if(prefs[0].getCollapsed(window.getPageToken(), this.element.attr("id"))) {

      this.element
      .find(".widget-showhide > a")
      .showhide("hide");

      content.add(this.element).css("height", "");
      if(content.is(".ui-resizable")) {
        content.resizable("destroy");
      }
    } else {
      content.trigger("min_size");
    }

    if(this.options.content_controller) {
      controller_content = this.element.find(this.options.content_selector);
      if (this.options.content_controller_selector)
        controller_content =
          controller_content.find(this.options.content_controller_selector);

      // Determine whether the user can read this widget
      var options = this.options.content_controller_options;
      options.allow_reading = Permission.is_allowed("read", (options.model && options.model.shortName) || options.model, Permission.page_context_id());

      if (options.allow_reading) {
        controller_content
          .html($(new Spinner().spin().el)
            .css({
              width: '100px',
              height: '100px',
              left: '50px',
              top: '40px'
            }));
      }
      else {
        options.footer_view = "/static/mustache/base_objects/tree_footer_no_access.mustache"
      }

      new this.options.content_controller(
          controller_content
        , this.options.content_controller_options
      );
    }
  }

  , ".remove-widget click" : function() {
    var parent = this.element.parent();
    this.element.remove();
    parent.trigger("sortremove");
  }

  , ".widgetsearch keydown" : function(el, ev) {
    if(ev.which === 13) {
      this.filter(el.val());
      this.element.trigger('kill-all-popovers');
    }
    ev.stopPropagation();
    ev.originalEvent && ev.originalEvent.stopPropagation();
  }

  , " updateCount" : function(el, ev, count) {
    this.element.find(".header .object_count").html("(" + count + ")");
    this.element.trigger("widgets_updated");
  }
});

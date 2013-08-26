/*
 * Copyright (C) 2013 Google Inc., authors, and contributors <see AUTHORS file>
 * Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
 * Created By:
 * Maintained By:
 */

//= require controls/control
//= require controls/controls_controller
(function(namespace, $) {

if (!/\/controls/.test(window.location.pathname))
  return;

$(function() {
  var page_model = GGRC.make_model_instance(GGRC.page_object);
  var controlId = page_model.id;
  var spin_opts = { position : "absolute", top : 100, left : 100, height : 50, width : 50};
  var rq = new ModelRefreshQueue(CMS.Models.Section);

  // The following uncommented line is equivalent to doing its preceding commented line, but we have a jQuery CanJS helpers option added:
    //CMS.Controllers.Controls.Instances = { Control : new CMS.Controllers.Controls('#controls', { arity : 2 })};
    // CMS.Controllers.Controls.Instances = {
    //   Control : $("#controls").cms_controllers_controls({
    //     arity : 2
    //     , id : controlId
    //     , model : (/^\d+$/.test(controlId) ? CMS.Models.ImplementedControl : CMS.Models.Control)
    //     , list : "/static/mustache/controls/tree.mustache"
    //   }).control(CMS.Controllers.Controls)};


  var $sections_tree = $("#sections .tree-structure").append($(new Spinner().spin().el).css(spin_opts));

  can.each(page_model.sections, function(s) {
    rq.enqueue(s);
  });
  rq.trigger()
  .done(function(s) {
    page_model.sections.replace(can.makeArray(page_model.sections).sort(window.natural_comparator));

    CMS.Models.Section.bind("created destroyed", function(ev, instance) {
      page_model.refresh();
      page_model.sections.replace(can.makeArray(page_model.sections).sort(window.natural_comparator));
    });

    $sections_tree.cms_controllers_tree_view({
      model : CMS.Models.Section
      , edit_sections : true
      , draw_children : false
      , list : page_model.sections
      , list_view : "/static/mustache/sections/tree.mustache"
      , parent_instance : page_model
      , allow_mapping_or_creating : true
      , allow_creating : false
      , list_loader : function() {
        return page_model.sections;
      }
    });
  });
});

})(this, jQuery);

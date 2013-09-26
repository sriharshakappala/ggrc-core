

GGRC.Controllers.Modals("GGRC.Controllers.QuickForm", {
  defaults : {
    model : null
    , instance : null
  }
}, {

  init : function() {
    if(this.options.instance && !this.options.model) {
      this.options.model = this.options.instance.constructor;
    }
    this.options.$content = this.element;
    this.options.instance.refresh();
  }

  , "input, select, textarea change" : function(el, ev) {
    var that = this;
    this.set_value_from_element(el);
    setTimeout(function() {
      that.options.instance.save();
    }, 100);
  }

  , autocomplete_select : function(el, event, ui) {
    if(this._super.apply(this, arguments) !== false) {
      this.options.instance.save();
    } else {
      return false;
    }
  }

  , "input, select, textarea click" : function(el, ev) {
    this._super && this._super.apply(this, arguments);
    ev.stopPropagation();
  }

});
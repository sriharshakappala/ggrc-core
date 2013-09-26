/*
 * Copyright (C) 2013 Google Inc., authors, and contributors <see AUTHORS file>
 * Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
 * Created By:
 * Maintained By:
 */

(function(namespace, $, can) {

//chrome likes to cache AJAX requests for Mustaches.
var mustache_urls = {};
$.ajaxPrefilter(function( options, originalOptions, jqXHR ) {
  if ( /\.mustache$/.test(options.url) ) {
    if(mustache_urls[options.url]) {
      options.url = mustache_urls[options.url];
    } else {
      mustache_urls[options.url] = options.url += "?r=" + Math.random();
    }
  }
});

function get_template_path(url) {
  var match;
  match = url.match(/\/static\/mustache\/(.*)\.mustache/);
  return match && match[1];
}

// Check if the template is available in "GGRC.Templates", and if so,
//   short-circuit the request.
$.ajaxTransport("text", function(options, _originalOptions, _jqXHR) {
  var template_path = get_template_path(options.url),
      template = GGRC.Templates[template_path];

  if (template) {
    return {
      send: function(headers, completeCallback) {
        function done() {
          if (template)
            completeCallback(200, "success", { text: template });
        }
        if (options.async)
          setTimeout(done, 0);
        else
          done();
      },

      abort: function() {
        template = null;
      }
    }
  }
});

  Mustache.registerHelper("join", function() {
    var prop, context = this, ret, options = arguments[arguments.length - 1];

    switch(arguments.length) {
      case 1:
        break;
      case 2:
        typeof arguments[0] === 'string' ? prop = arguments[0] : context = arguments[0];
        break;
      default:
        prop = arguments[0];
        context = arguments[1];
    }
    if(!context) {
      ret =  "";
    } else if(context.length) {
      ret = $(context).map(function() { return prop ? (can.getObject(prop, this) || "").toString() : this.toString(); }).get().join(", ");
    } else {
      ret = prop ? (can.getObject(prop, context) || "").toString() : context.toString();
    }
    return ret;
  });

  var quickHash = function(str, seed) {
    var bitval = seed || 1;
    str = str || "";
    for(var i = 0; i < str.length; i++)
    {
      bitval *= str.charCodeAt(i);
      bitval = Math.pow(bitval, 7);
      bitval %= Math.pow(7, 37);
    }
    return bitval;
  }


  var getParentNode = function (el, defaultParentNode) {
    return defaultParentNode && el.parentNode.nodeType === 11 ? defaultParentNode : el.parentNode;
  }


    function isExtendedFalsy(obj) {
      return !obj 
        || (typeof obj === "object" && can.isEmptyObject(obj))
        || (obj.length != null && obj.length == 0) 
        || (obj.serialize && can.isEmptyObject(obj.serialize()));
    }

    function preprocessClassString(str) {
      var ret = []
      , src = str.split(" ");

      for(var i = 0; i < src.length; i++) {
        var expr = src[i].trim();
        if(expr.charAt(0) === "=") {
          ret.push({ attr : src[i].trim().substr(1) });
        } else if(expr.indexOf(":") > -1) {
          var spl = expr.split(":");
          var arr = [];
          for(var j = 0; j < spl.length - 1; j ++) {
            var inverse = spl[j].trim()[0] === "!"
            , attr_name = spl[j].trim().substr(inverse ? 1 : 0)
            
            arr.push({attr : attr_name, inverse : inverse});
          }
          arr.value = spl[spl.length - 1];
          ret.push(arr);
        } else {
          ret.push(expr);
        }
      }
      return ret;
    }

    function buildClassString(arr, context) {
      var ret = [];
      for(var i = 0; i < arr.length; i++) {
        if(typeof arr[i] === "string") {
          ret.push(arr[i]);
        } else if(typeof arr[i] === "object" && arr[i].attr) {
          ret.push(can.getObject(arr[i].attr, context));
        } else if(can.isArray(arr[i]) && arr[i].value) {
          var p = true;
          for(var j = 0; j < arr[i].length; j ++) {
            var attr = can.getObject(arr[i][j].attr, context);
            if(arr[i][j].inverse ? !isExtendedFalsy(attr) : isExtendedFalsy(attr)) {
              p = false;
              break;
            }
          }
          if(p) {
            ret.push(arr[i].value);
          }
        } else {
          throw "Unsupported class building expression: " + JSON.stringify(arr[i]);
        }
      }

      return ret.join(" ");
    }

  /**
  * helper withclass
  * puts a class string on the element, includes live binding:
  * usage:
  * {{#withclass 'class strings'}}<element>...</element>{{/withclass}}
  * {{{withclass 'class strings'}}} to apply to the parent element a la XSLT <xsl:attribute>. Note the triple braces!
  * Tokens usable in class strings:
  *  =attribute : add the value of the attribute as a class
  *  attribute:value : if attribute is truthy, add value to the classes
  *  !attribute:value : if attribute is falsy, add value
  *  attr1:!attr2:value : if attr1 is truthy and attr2 is falsy, add value
  *  plainstring : use this class literally
    *  
  */
  Mustache.registerHelper("withclass", function() {
    var options = arguments[arguments.length - 1]
    , exprs = preprocessClassString(arguments[0])
    , that = this.___st4ck ? this[this.length-1] : this
    , hash = quickHash(arguments[0], quickHash(that._cid)).toString(36)
    //, content = options.fn(this).trim()
    //, index = content.indexOf("<") + 1

    // while(content[index] != " ") {
    //   index++;
    // }
    function classbinding(el, ev, newVal, oldVal) {
      $(el).attr("class", buildClassString(exprs, this));
    }


    function hookupfunc(el, parent, view_id) {
      var content = options.fn(that);

      if(content) {
        var frag = can.view.frag(content, parent);
        var $newel = $(frag.querySelector("*"));
        el.parentNode ? el.parentNode.replaceChild($newel[0], el) : $(parent).append($newel);
        el = $newel[0];
      } else {
        //we are inside the element we want to add attrs to.
        var p = el.parentNode
        p.removeChild(el)
        el = p;
      }
      for(var i = 0; i < exprs.length; i ++) {
        var expr = exprs[i];
        if(typeof expr === "object" && expr.attr && that.bind) {
          that.bind(expr.attr + "." + hash, $.proxy(classbinding, that, el));
        } else if(can.isArray(expr) && expr.value && that.bind) {
          can.each(expr, function(attr_expr) {
            var attr_token = attr_expr.attr;
            that.bind(attr_token + "." + hash, $.proxy(classbinding, that, el));
          });
        }
      }
      classbinding.call(that, el);
      
    }
    return "<div" 
    + can.view.hook(hookupfunc)
    + " data-replace='true'/>";
  });

  /**
    Add a live bound attribute to an element, avoiding buggy CanJS attribute interpolations.
    Usage:
    {{#withattr attrname attrvalue attrname attrvalue...}}<element/>{{/withattr}} to apply to the child element
    {{{withattr attrname attrvalue attrname attrvalue...}}} to apply to the parent element a la XSLT <xsl:attribute>. Note the triple braces!
    attrvalue can take mustache tokens, but they should be backslash escaped.
  */
  Mustache.registerHelper("withattr", function() {
    var args = can.makeArray(arguments).slice(0, arguments.length - 1)
    , options = arguments[arguments.length - 1]
    , attribs = []
    , that = this.___st4ck ? this[this.length-1] : this
    , data = can.extend({}, that)
    , hash = quickHash(args.join("-"), quickHash(that._cid)).toString(36)
    , attr_count = 0;

    var hook = can.view.hook(function(el, parent, view_id) {
      var content = options.fn(that);

      if(content) {
        var frag = can.view.frag(content, parent);
        var $newel = $(frag.querySelector("*"));
        var newel = $newel[0];

        el.parentNode ? el.parentNode.replaceChild(newel, el) : $(parent).append($newel);
        el = newel;
      } else {
        //we are inside the element we want to add attrs to.
        var p = el.parentNode;
        p.removeChild(el);
        el = p;
      }

      function sub_all(el, ev, newVal, oldVal) {
        var $el = $(el);
        can.each(attribs, function(attrib) {
          $el.attr(attrib.name, $("<div>").html(can.view.render(attrib.value, data)).html());
        });
      }

      for(var i = 0; i < args.length - 1; i += 2) {
        var attr_name = args[i];
        var attr_tmpl = args[i + 1];
        //set up bindings where appropriate
        attr_tmpl = attr_tmpl.replace(/\{[^\}]*\}/g, function(match, offset, string) {
          var token = match.substring(1, match.length - 1);
          if(typeof data[token] === "function") {
            data[token].bind && data[token].bind("change." + hash, $.proxy(sub_all, that, el));
            data[token] = data[token].call(that);
          }

          that.bind && that.bind(token + "." + hash, $.proxy(sub_all, that, el));

          return "{" + match + "}";
        });
        can.view.mustache("withattr_" + hash + "_" + (++attr_count), attr_tmpl);
        attribs.push({name : attr_name, value : "withattr_" + hash + "_" + attr_count });
      }

      sub_all(el);

    });

    return "<div"
    + hook
    + " data-replace='true'/>";
  });


  var controlslugs = function() {
    var slugs = [];
    slugs.push((this.title && this.title.length > 15 )? this.title.substr(0, 15) + "..." : this.title);
    can.each(this.implementing_controls, function(val) {
      slugs.push.apply(slugs, controlslugs.call(this));
    });
    return slugs;
  };

  var countcontrols = function() {
    var slugs = [];
    can.each(this.linked_controls, function() {
      slugs.push.apply(slugs, controlslugs.apply(this));
    });
    return slugs.length;
  };

  Mustache.registerHelper("controlscount", countcontrols);

  Mustache.registerHelper("controlslugs", function() {
    var slugs = [];
    can.each(this.linked_controls, function() {
      slugs.push.apply(slugs, controlslugs.apply(this)); 
    });
    return slugs.join(arguments.length > 1 ? arguments[0] : " ");
  });

$.each({
	"rcontrols" : "RegControl"
	, "ccontrols" : "Control"
}, function(key, val) {
  Mustache.registerHelper(key, function(obj, options) {
    var implementing_control_ids = []
    , ctls_list = obj.linked_controls;

    can.each(ctls_list, function(ctl) {
      var ctl_model = namespace.CMS.Models[val].findInCacheById(ctl.id);
      if(ctl_model && ctl_model.implementing_controls && ctl_model.implementing_controls.length) {
        implementing_control_ids = implementing_control_ids.concat(
          can.map(ctl_model.implementing_controls, function(ictl) { return ictl.id })
        );
      }
    });

    return can.map(
      $(ctls_list).filter( 
        function() {
          return $.inArray(this.id, implementing_control_ids) < 0;
        })
      , function(ctl) { return options.fn({ foo_controls : namespace.CMS.Models[val].findInCacheById(ctl.id) }); }
    )
    .join("\n");
  });
});

Mustache.registerHelper("if_equals", function(val1, val2, options) {
  var that = this, _val1, _val2;
  function exec() {
    if(_val1 == _val2) return options.fn(options.contexts);
    else return options.inverse(options.contexts);
  }
    if(typeof val1 === "function") { 
      if(val1.isComputed) {
        val1.bind("change", function(ev, newVal, oldVal) {
          _val1 = newVal;
          return exec();
        });
      }
      _val1 = val1.call(this);
    } else {
      _val1 = val1;
    }
    if(typeof val2 === "function") { 
      if(val2.isComputed) {
        val2.bind("change", function(ev, newVal, oldVal) {
          _val2 = newVal;
          exec();
        });
      }
      _val2 = val2.call(this);
    } else {
      _val2 = val2;
    }

  return exec();
});

Mustache.registerHelper("if_match", function(val1, val2, options) {
  var that = this, _val1, _val2;
  function exec() {
    var re = new RegExp(_val2);
    if(re.test(_val1)) return options.fn(that);
    else return options.inverse(that);
  }
    if(typeof val1 === "function") {
      if(val1.isComputed) {
        val1.bind("change", function(ev, newVal, oldVal) {
          _val1 = newVal;
          return exec();
        });
      }
      _val1 = val1.call(this);
    } else {
      _val1 = val1;
    }
    if(typeof val2 === "function") {
      if(val2.isComputed) {
        val2.bind("change", function(ev, newVal, oldVal) {
          _val2 = newVal;
          exec();
        });
      }
      _val2 = val2.call(this);
    } else {
      _val2 = val2;
    }

  return exec();
});

Mustache.registerHelper("if_null", function(val1, options) {
  var that = this, _val1;
  function exec() {
    if(_val1 == null) return options.fn(that);
    else return options.inverse(that);
  }
    if(typeof val1 === "function") { 
      if(val1.isComputed) {
        val1.bind("change", function(ev, newVal, oldVal) {
          _val1 = newVal;
          return exec();
        });
      }
      _val1 = val1.call(this);
    } else {
      _val1 = val1;
    }
  return exec();
});

can.each(["firstexist", "firstnonempty"], function(fname) {
  Mustache.registerHelper(fname, function() {
    var args = can.makeArray(arguments).slice(0, arguments.length - 1);
    for(var i = 0; i < args.length; i++) {
      var v = args[i];
      if(typeof v === "function") v = v.call(this);
      if(v != null && (fname === "firstexist" || !!(v.toString().trim().replace(/&nbsp;|\s|<br *\/?>/g, "")))) return v.toString();
    }
    return "";
  });
});

Mustache.registerHelper("pack", function() {
  var options = arguments[arguments.length - 1];
  var objects = can.makeArray(arguments).slice(0, arguments.length - 1);
  var pack = {};
  can.each(objects, function(obj, i) {
      if(typeof obj === "function") {
          objects[i] = obj = obj();
      }
    // if(obj instanceof can.Observe) {
    //   obj.bind("change", function(ev, attr, how, newVal, oldVal) {
    //     var tokens, idx, subobj;
    //     switch(how) {
    //     case "remove":
    //     case "add":
    //     tokens = attr.split(".");
    //     idx = tokens.pop();
    //     subobj = can.getObject(tokens.join("."), pack);
    //     subobj && (subobj instanceof can.Observe.List 
    //       ? subobj.splice.apply(subobj, how === "remove" ? [+idx, 1] : [+idx, 0, newVal])
    //       : pack.attr(attr, newVal));
    //     break;
    //     default:          
    //     pack.attr(attr, newVal);
    //     }
    //   });
    // }
    if(obj._data) {
      obj = obj._data;
    }
    for(var k in obj) {
      if(obj.hasOwnProperty(k)) {
        pack[k] = obj[k];
      }
    }
  });
  if(options.hash) {
    for(var k in options.hash) {
      if(options.hash.hasOwnProperty(k)) {
        pack[k] = options.hash[k];
      }
    }
  }
  //pack.attr("packed", pack.serialize()); //account for Can 1.1.3 not constructing context stack properly
  pack = new can.Observe(pack);
  var retval = options.fn(pack);
  return retval;
});


Mustache.registerHelper("is_beta", function(){
  var options = arguments[arguments.length - 1];
  if($(document.body).hasClass('BETA')) return options.fn(this);
  else return options.inverse(this);
});

Mustache.registerHelper("if_page_type", function(page_type, options) {
  var options = arguments[arguments.length - 1];
  if (window.location.pathname.split('/')[1] == page_type)
    return options.fn(this);
  else
    return options.inverse(this);
});

// Render a named template with the specified context, serialized and
// augmented by 'options.hash'
Mustache.registerHelper("render", function(template, context, options) {
  if(!options) {
    options = context;
    context = this;
  }

  if(typeof context === "function") {
    context = context();
  }

  if(typeof template === "function") {
    template = template();
  }

  context = $.extend({}, context.serialize ? context.serialize() : context);

  if (options.hash) {
    for(var k in options.hash) {
      if(options.hash.hasOwnProperty(k)) {
        context[k] = options.hash[k];
        if (typeof context[k] == "function")
          context[k] = context[k]();
      }
    }
  }

  return can.view.render(template, context);
});

// Like 'render', but doesn't serialize the 'context' object, and doesn't
// apply options.hash
Mustache.registerHelper("renderLive", function(template, context, options) {
  if(!options) {
    options = context;
    context = this;
  }

  if(typeof context === "function") {
    context = context();
  }

  if(typeof template === "function") {
    template = template();
  }

  return can.view.render(template, context);
});

function defer_render(tag_name, func, deferred) {
  var hook
    ;

  tag_name = tag_name || "span";

  function hookup(element, parent, view_id) {
    var f = function() {
      var frag_or_html = func.apply(this, arguments);
      $(element).after(frag_or_html).remove();
      //can.view.hookup(parent);
    };
    if (deferred)
      deferred.done(f)
    else
      setTimeout(f, 13);
  }

  hook = can.view.hook(hookup);
  return ["<", tag_name, " ", hook, ">", "</", tag_name, ">"].join("");
}

Mustache.registerHelper("defer", function(tag_name, options) {
  var context = this;

  if (!options) {
    options = tag_name;
    tag_name = "span";
  }

  return defer_render(tag_name, function() {
    return options.fn(context);
  });
});

Mustache.registerHelper("pbc_is_read_only", function() {
  var options = arguments[arguments.length - 1];
  if (window.location.pathname.split('/')[1] == 'pbc_lists')
    return options.inverse(this);
  else
    return options.fn(this);
});

Mustache.registerHelper("with_line_breaks", function(content) { 
  var value = typeof content === "function" ? content() : content;
  if (value && value.search(/<\w+[^>]*>/) < 0)
    return value.replace(/\n/g, "<br />");
  else
    return value;
});

Mustache.registerHelper("show_expander", function() {
  var options = arguments[arguments.length - 1]
  , args = can.makeArray(arguments).slice(0, arguments.length - 1)
  , disjunctions = [[]]
  , not = false;
  for(var i = 0; i < args.length; i++) {
    if(args[i] === "||") {
      disjunctions.push([]);
    } else if (args[i] === "!") {
      not = true;
    } else {
      disjunctions[disjunctions.length - 1].push(not ? { not : args[i] } : args[i]);
      not = false;
    }
  }

  return can.reduce(disjunctions, function(a, b) {
    return a || can.reduce(b, function(c, d) {
      if(!c)
        return false;

      var not = !!d.not;
      d = d.not ? d.not : d;

      typeof d === "function" && (d = d());

      var pred = (d && (d.length == null || d.length > 0));
      if(not) pred = !pred;
      return pred;
    }, true);
  }, false) ? options.fn(this) : options.inverse(this);
});

Mustache.registerHelper("allow_help_edit", function() {
  var options = arguments[arguments.length - 1];
  return options.fn(this); //always true for now
});

Mustache.registerHelper("all", function(type, options) {
  var model = CMS.Models[type] || GGRC.Models[type]
  , $dummy_content = $(options.fn({}).trim()).first()
  , tag_name = $dummy_content.prop("tagName")
  , items_dfd, hook;

  function hookup(element, parent, view_id) {
    items_dfd.done(function(items){
      var $el = $(element);
      can.each(items, function(item) {
        $(can.view.frag(options.fn(item), parent)).appendTo(element.parentNode);
      });
      $el.remove();
    });
    return element.parentNode;
  }

  if($dummy_content.attr("data-view-id")) {
    can.view.hookups[$dummy_content.attr("data-view-id")] = hookup;
  } else {
    hook = can.view.hook(hookup);
    $dummy_content.attr.apply($dummy_content, can.map(hook.split('='), function(s) { return s.replace(/'|"| /, "");}));
  }

  items_dfd = model.findAll();
  return "<" + tag_name + " data-view-id='" + $dummy_content.attr("data-view-id") + "'></" + tag_name + ">";
});

Mustache.registerHelper("handle_context", function() {
  var context_href = this.attr('context.href')
    , context_id = this.attr('context.id')
    ;

  return [
    "<input type='hidden' name='context.href'" +
      (context_href ? ("value='" + context_href + "'") : "") +
      " null-if-empty='null-if-empty' />",
    "<input type='hidden' name='context.id'" +
      (context_id ? ("value='" + context_id + "'") : "") +
      " null-if-empty='null-if-empty' numeric='numeric' />"
    ].join("\n");
});

can.each(["page_object", "current_user"], function(fname) {
  Mustache.registerHelper("with_" + fname + "_as", function(name, options) {
    if(!options) {
      options = name;
      name = fname;
    }
    var page_object = (fname === "current_user" ? CMS.Models.Person.model(GGRC.current_user) : GGRC.page_instance());
    if(page_object) {
      var p = {};
      p[name] = page_object;
      options.contexts.push(p);
      return options.fn(options.contexts);
    } else {
      return options.inverse(options.contexts);
    }
  });
});

Mustache.registerHelper("role_checkbox", function(role, model, operation) {
  return [
    '<input type="checkbox" name="permissions."'
    , operation
    , '" value="'
    , model.model_singular
    , '"'
    , role.allowed(operation, model) ? ' checked="checked"' : ''
    , '>'
  ].join("");
});

Mustache.registerHelper("private_program", function(modal_title) {
  return modal_title.indexOf("New ") !=0 ? '' : [
    '<div class="span6">'
    , '<label>'
    , 'Privacy'
    , '<i class="grcicon-help-black" rel="tooltip" title="Should only certain people know about this Program?  If so, make it Private."></i>'
    , '</label>'
    , '<div class="checkbox-area">'
    , '<input name="private" value="private" type="checkbox"> Private Program'
    , '</div>'
    , '</div>'
  ].join("");
});


Mustache.registerHelper("can_link_to_page_object", function(context, options) {
  if(!options) {
    options = context;
    context = options.contexts ? options.contexts[options.contexts.length - 1] : this;
  }

  var page_type = GGRC.infer_object_type(GGRC.page_object);
  var context_id = null;
  if (page_type === CMS.Models.Program || !(context instanceof CMS.Models.Program)) {
    context_id = GGRC.page_object[page_type.table_singular].context ?
      GGRC.page_object[page_type.table_singular].context.id : null;
  } else {
    context_id = context.context ? context.context.id : null;
  }
  var join_model_name = GGRC.JoinDescriptor.join_model_name_for(
      page_type.shortName, context.constructor.shortName);
  if (join_model_name && Permission.is_allowed('create', join_model_name, context_id)) {
    return options.fn(options.contexts);
  } else {
    return options.inverse(options.contexts);
  }
});

Mustache.registerHelper("iterate", function() {
  var args = can.makeArray(arguments).slice(0, arguments.length - 1)
  , options = arguments[arguments.length - 1]

  return can.map(args, function(arg) {
    var ctx = $.extend([], options.contexts);
    ctx.push({iterator : arg});
    return options.fn(ctx);
  }).join("");
});

Mustache.registerHelper("is_private", function(options) {
  var context_id = this.attr('context.id');
  if (context_id != undefined && context_id != null) {
    return options.fn(this);
  }
  return options.inverse(this);
});

Mustache.registerHelper("option_select", function(object, attr_name, role) {
  var selected_option = object.attr(attr_name)
    , selected_id = selected_option ? selected_option.id : null
    , options_dfd = CMS.Models.Option.for_role(role)
    ;

  function get_select_html(options) {
    return [
        '<select class="span12" model="Option"'
      ,   ' name="', attr_name
      , '">'
      , '<option value=""'
      ,   !selected_id ? ' selected=selected' : ''
      , '>None</option>'
      , can.map(options, function(option) {
          return [
            '<option value="', option.id, '"'
          ,   selected_id == option.id ? ' selected=selected' : ''
          , '>'
          ,   option.title
          , '</option>'
          ].join('');
        }).join('\n')
      , '</select>'
    ].join('');
  }

  return defer_render('select', get_select_html, options_dfd);
});

Mustache.registerHelper("category_select", function(object, attr_name, scope) {
  var selected_options = object.attr(attr_name) || []
    , selected_ids = can.map(selected_options, function(selected_option) {
        return selected_option.id;
      })
    , options_dfd = CMS.Models.Category.for_scope(scope)
    ;

  function get_select_html(options) {
    return [
        '<select class="span12" model="Category" multiple=multiple'
      ,   ' name="', attr_name
      , '">'
      , can.map(options, function(option) {
          return [
            '<option value="', option.id, '"'
          ,   selected_ids.indexOf(option.id) > -1 ? ' selected=selected' : ''
          , '>'
          ,   option.name
          , '</option>'
          ].join('');
        }).join('\n')
      , '</select>'
    ].join('');
  }

  return defer_render('select', get_select_html, options_dfd);
});

Mustache.registerHelper("schemed_url", function(url) {
  if (url) {
    url = url.isComputed? url(): url;
    if (url && !url.match(/^[a-zA-Z]+:/)) {
        return 'http://' + url;
    }
  }
  return url;
});

function when_attached_to_dom(el, cb) {
  // Trigger the "more" toggle if the height is the same as the scrollable area
  el = $(el);
  !function poll() {
    if (el.closest(document.documentElement).length) {
      cb();
    }
    else {
      setTimeout(poll, 100);
    }
  }();
}

Mustache.registerHelper("trigger_created", function() {
  return function(el) {
    when_attached_to_dom(el, function() {
      $(el).trigger("contentAttached");
    });
  };
});

Mustache.registerHelper("show_long", function() {
  return  [
      '<a href="javascript://" class="show-long"'
    , can.view.hook(function(el, parent, view_id) {
        el = $(el);

        var content = el.prevAll('.short');
        if (content.length) {
          !function hide() {
            // Trigger the "more" toggle if the height is the same as the scrollable area
            if (el[0].offsetHeight) {
              if (content[0].offsetHeight === content[0].scrollHeight) {
                el.trigger('click');
              }
            }
            else {
              // If there is an open/close toggle, wait until "that" is triggered
              var root = el.closest('.tree-item')
                , toggle;
              if (root.length && !root.hasClass('item-open') && (toggle = root.find('.openclose')) && toggle.length) {
                // Listen for the toggle instead of timeouts
                toggle.one('click', function() {
                  // Delay to ensure all event handlers have fired
                  setTimeout(hide, 0);
                });
              }
              // Otherwise just detect visibility
              else {
                setTimeout(hide, 100);
              }
            }
          }();
        }
      })
    , ">...more</a>"
  ].join('');
});

Mustache.registerHelper("using", function(args, options) {
  var refresh_queue = new RefreshQueue()
    , context
    , frame = new can.Observe()
    , i, arg;

  args = can.makeArray(arguments);
  options = args.pop();
  context = options.contexts || this;

  if (options.hash) {
    for (i in options.hash) {
      if (options.hash.hasOwnProperty(i)) {
        arg = options.hash[i];
        arg = Mustache.resolve(arg);
        if (arg && arg.reify) {
          refresh_queue.enqueue(arg.reify());
          frame.attr(i, arg.reify());
        } else {
          frame.attr(i, arg);
        }
      }
    }
  }

  function finish() {
    return options.fn(frame);
  }

  return defer_render('span', finish, refresh_queue.trigger());
});

Mustache.registerHelper("unmap_or_delete", function(instance, mappings) {
  if (can.isFunction(instance))
    instance = instance();
  if (can.isFunction(mappings))
    mappings = mappings();
  if (mappings.indexOf(instance) > -1) {
    if (mappings.length == 1) {
      if (mappings[0] instanceof CMS.Models.Control)
        return "Unmap"
      else 
        return "Delete"
    }
    else
      return "Unmap and Delete"
  } else
    return "Unmap"
});

Mustache.registerHelper("date", function(date) {
  var m = moment(new Date(date.isComputed ? date() : date))
    , dst = m.isDST()
    ;
  return m.zone(dst ? "-0700" : "-0800").format("MM/DD/YYYY hh:mm:ssa") + " " + (dst ? 'PDT' : 'PST');
});

/**
 * Checks permissions. 
 * RESOURCE_TYPE and CONTEXT_ID will be retrieved from GGRC.page_object if not defined.
 * Usage:
 *  {{#is_allowed ACTION [ACTION2 ACTION3...] RESOURCE_TYPE CONTEXT_ID}} content {{/is_allowed}}
 *  {{#is_allowed ACTION RESOURCE_TYPE}} content {{/is_allowed}}
 *  {{#is_allowed ACTION CONTEXT_ID}} content {{/is_allowed}}
 *  {{#is_allowed ACTION}} content {{/is_allowed}}
 */
var allowed_actions = [
      "create", "read", "update", "delete",
      "join_create", "join_read", "join_update", "join_delete"];
Mustache.registerHelper("is_allowed", function() {
  var allowed_page = GGRC.page_instance()
    , args = Array.prototype.slice.call(arguments, 0)
    , actions = []
    , resource_type = allowed_page && allowed_page.constructor.shortName
    , context_id = allowed_page && allowed_page.context && allowed_page.context.id
    , options = args[args.length-1]
    , passed = true
    ;

  // Resolve arguments
  can.each(args, function(arg, i) {
    arg = typeof arg === 'function' && arg.isComputed ? arg() : arg;

    if (typeof arg === 'string' && can.inArray(arg, allowed_actions) > -1) {
      actions.push(arg);
    }
    else if (typeof arg === 'string') {
      resource_type = arg;
    }
    else if (typeof arg === 'number' || arg == null) {
      context_id = arg;
    } else if (typeof arg === 'object' && arg instanceof can.Model) {
      if (GGRC.page_model instanceof CMS.Models.Program) {
        resource_type = arg.constructor.shortName
      } else {
        resource_type = arg.constructor.shortName;
        context_id = arg.context ? arg.context.id : null;
      }
    }
  });
  actions = actions.length ? actions : allowed_actions;

  // Check permissions
  can.each(actions, function(action) {
    var actual_resource_type = resource_type;
    var actual_action = action;
    if (action.indexOf("join_") == 0) {
      actual_action = action.slice(5);
      actual_resource_type = GGRC.JoinDescriptor.join_model_name_for(
        GGRC.page_model.constructor.shortName, resource_type);
    }
    passed = passed && Permission.is_allowed(actual_action, actual_resource_type, context_id);
  });

  return passed
    ? options.fn(options.contexts || this) 
    : options.inverse(options.contexts || this)
    ;
});

Mustache.registerHelper("is_allowed_for_all", function(action, instances, options) {
  var passed = true;

  action = resolve_computed(action);
  instances = resolve_computed(instances);

  can.each(instances, function(instance) {
    var resource_type
      , context_id
      ;

    resource_type = instance.constructor.shortName;
    context_id = instance.context ? instance.context.id : null;

    passed = passed && Permission.is_allowed(action, resource_type, context_id);
  });

  if (passed)
    return options.fn(options.contexts || this);
  else
    return options.inverse(options.contexts || this);
});

Mustache.registerHelper("is_allowed_to_map", function(source, target, options) {
  //  For creating mappings, we only care if the user can create instances of
  //  the join model.
  //  - `source` must be a model instance
  //  - `target` must be the name of the target model
  //
  //  FIXME: This should actually iterate through all applicable join models
  //    and return success if any one matches.
  var target_type
    , resource_type
    , context_id
    ;

  source = resolve_computed(source);
  target = resolve_computed(target);

  if (target instanceof can.Model)
    target_type = target.constructor.shortName;
  else
    target_type = target;

  //if (!(source instanceof can.Model)) {
  //  //  If `source` is not a model instance, assume they want to link to the
  //  //  page object.
  //  options = target;
  //  target = source;
  //  source = GGRC.page_instance();
  //}

  resource_type = GGRC.JoinDescriptor.join_model_name_for(
    source.constructor.shortName, target_type);

  context_id = source.context ? source.context.id : null;
  if (!(source instanceof CMS.Models.Program)
      && target instanceof CMS.Models.Program)
    context_id = target.context ? target.context.id : null;

  // We should only map objects that have join models
  if ((!(options.hash && options.hash.join) || resource_type) && Permission.is_allowed('create', resource_type, context_id))
    return options.fn(options.contexts || this);
  else
    return options.inverse(options.contexts || this);
});

function resolve_computed(maybe_computed) {
  return (typeof maybe_computed === "function" && maybe_computed.isComputed) ? maybe_computed() : maybe_computed;
}

Mustache.registerHelper("attach_spinner", function(spin_opts, styles) {
  spin_opts = resolve_computed(spin_opts);
  styles = resolve_computed(styles);
  spin_opts = typeof spin_opts === "string" ? JSON.parse(spin_opts) : {};
  styles = typeof styles === "string" ? styles : "";
  return function(el) {
    var spinner = new Spinner(spin_opts).spin();
    $(el).append($(spinner.el).attr("style", $(spinner.el).attr("style") + ";" + styles)).data("spinner", spinner);
  };
});

Mustache.registerHelper("determine_context", function(page_object, target) {
  if (page_object.constructor.shortName == "Program") {
    return page_object.context ? page_object.context.id : null;
  } else if (target.constructor.shortName == "Program") {
    return target.context ? target.context.id : null;
  }
  return page_object.context ? page_object.context.id : null;
});

Mustache.registerHelper("json_escape", function(obj, options) {
  return (""+resolve_computed(obj))
    .replace(/"/g, '\\"')
    //  FUNFACT: JSON does not allow wrapping strings with single quotes, and
    //    thus does not allow backslash-escaped single quotes within strings.
    //    E.g., make sure attributes use double quotes, or use character
    //    entities instead -- but these aren't replaced by the JSON parser, so
    //    the output is not identical to input (hence, not using them now.)
    //.replace(/'/g, "\\'")
    //.replace(/"/g, '&#34;').replace(/'/g, "&#39;")
    .replace(/\n/g, "\\n").replace(/\r/g, "\\r");
});

Mustache.registerHelper("localize_date", function(date) {
  date = resolve_computed(date);
  return date ? moment(date).format("MM/DD/YYYY") : "";
});

})(this, jQuery, can);

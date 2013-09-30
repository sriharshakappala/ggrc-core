/*
 * Copyright (C) 2013 Google Inc., authors, and contributors <see AUTHORS file>
 * Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
 * Created By:
 * Maintained By:
 */

Permission = function(action, resource_type, context_id) {
  return {
    action: action,
    resource_type: resource_type,
    context_id: context_id
  };
};

$.extend(Permission, (function() {
  var _permission_match, _is_allowed, _admin_permission_for_context
    , ADMIN_PERMISSION = new Permission('__GGRC_ADMIN__', '__GGRC_ALL__', 0)
    ;

  _admin_permission_for_context = function(context_id) {
    return new Permission(
      ADMIN_PERMISSION.action, ADMIN_PERMISSION.resource_type, context_id);
  };

  _permission_match = function(permissions, permission) {
    var resource_types = permissions[permission.action] || {}
      , contexts = resource_types[permission.resource_type] || []
      ;

    return (contexts.indexOf(permission.context_id) > -1);
  };

  _is_allowed = function(permissions, permission) {
    if (!permissions)
      return false; //?
    if (_permission_match(permissions, permission))
      return true;
    if (_permission_match(permissions, ADMIN_PERMISSION))
      return true;
    if (_permission_match(permissions,
          _admin_permission_for_context(permission.context_id)))
      return true;
    // Check for System Admin permission
    if (_permission_match(permissions,
          _admin_permission_for_context(0)))
      return true;
    return false;
  };

  is_allowed = function(action, resource_type, context_id) {
    return _is_allowed(
        GGRC.permissions, new Permission(action, resource_type, context_id));
  };

  return {
      _is_allowed: _is_allowed
    , is_allowed: is_allowed
    , page_context_id: function() {
        var page_instance = GGRC.page_instance();
        return (page_instance && page_instance.context && page_instance.context.id) || null;
      }
  };
})());

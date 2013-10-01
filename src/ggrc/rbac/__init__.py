# Copyright (C) 2013 Google Inc., authors, and contributors <see AUTHORS file>
# Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
# Created By: david@reciprocitylabs.com
# Maintained By: david@reciprocitylabs.com

def context_query_filter(context_column, contexts):
  '''
  Intended for use by `model.query.filter(...)`
  If `contexts == None`, it's Admin (no filter), so return `True`
  Else, return the full query
  '''
  from sqlalchemy import or_

  if contexts is None:
    # Admin context, no filter
    return True
  else:
    filter_expr = None
    # Handle `NULL` context specially
    if None in contexts:
      filter_expr = context_column == None
      # We're modifying `contexts`, so copy
      contexts = set(contexts)
      contexts.remove(None)
    if len(contexts) > 0:
      filter_in_expr = context_column.in_(contexts)
      if filter_expr is not None:
        filter_expr = or_(filter_expr, filter_in_expr)
      else:
        filter_expr = filter_in_expr
    if filter_expr is None:
      # No valid contexts
      return False
    return filter_expr

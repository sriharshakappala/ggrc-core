# Copyright (C) 2013 Google Inc., authors, and contributors <see AUTHORS file>
# Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
# Created By: david@reciprocitylabs.com
# Maintained By: david@reciprocitylabs.com

import json
from flask import request, current_app
from ggrc.fulltext import get_indexer
from ggrc.utils import DateTimeEncoder, url_for, benchmark

def search():
  terms = request.args.get('q')
  permission_type = request.args.get('__permission_type', 'read')
  permission_model = request.args.get('__permission_model', None)
  if terms is None:
    return current_app.make_response((
      'Query parameter "q" specifying search terms must be provided.',
      400,
      [('Content-Type', 'text/plain')],
      ))

  should_group_by_type = request.args.get('group_by_type', '')
  should_group_by_type = should_group_by_type.lower() == 'true'
  should_just_count = request.args.get('counts_only', '')
  should_just_count = should_just_count.lower() == 'true'

  types = request.args.get('types', '');
  types = [t.strip() for t in types.split(',') if len(t.strip()) > 0]
  if len(types) == 0:
    types = None

  if should_just_count:
    return do_counts(terms, types)
  if should_group_by_type:
    return group_by_type_search(terms, types)
  return basic_search(terms, types, permission_type, permission_model)

def do_counts(terms, types=None):
  indexer = get_indexer()
  with benchmark("Counts"):
    results = indexer.counts(terms, types=types)

  return current_app.make_response((
    json.dumps({ 'results': {
        'selfLink': request.url,
        'counts': dict(results)
        }
      }, cls=DateTimeEncoder),
    200,
    [('Content-Type', 'application/json')],
    ))

def do_search(
    terms, list_for_type, types=None, permission_type='read',
    permission_model=None):
  indexer = get_indexer()
  with benchmark("Search"):
    results = indexer.search(
        terms, types=types, permission_type=permission_type,
        permission_model=permission_model)
  seen_results = {}

  for result in results:
    id = result.key
    model_type = result.type
    result_pair = (model_type, id)
    if result_pair not in seen_results:
      seen_results[result_pair] = True
      entries_list = list_for_type(model_type)
      entries_list.append({
        'id': id,
        'type': model_type,
        'href': url_for(model_type, id=id),
        })

def make_search_result(entries):
  return current_app.make_response((
    json.dumps({ 'results': {
        'selfLink': request.url,
        'entries': entries,
        }
      }, cls=DateTimeEncoder),
    200,
    [('Content-Type', 'application/json')],
    ))

def basic_search(
    terms, types=None, permission_type='read', permission_model=None):
  entries = []
  list_for_type = lambda t: entries
  do_search(terms, list_for_type, types, permission_type, permission_model)
  return make_search_result(entries)

def group_by_type_search(terms, types=None):
  entries = {}
  list_for_type = \
      lambda t: entries[t] if t in entries else entries.setdefault(t, [])
  do_search(terms, list_for_type, types)
  return make_search_result(entries)

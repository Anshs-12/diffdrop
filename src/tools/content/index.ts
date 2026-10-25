/** Page text for the newer tools, one file per tool (merged into TOOL_CONTENT in ../content.ts). */
import type { ToolContent } from '../content';
import uuid_generator from './uuid-generator';
import hash_generator from './hash-generator';
import cron_generator from './cron-generator';
import slug_generator from './slug-generator';
import number_base_converter from './number-base-converter';
import html_entities from './html-entities';
import color_palette from './color-palette';
import contrast_checker from './contrast-checker';
import aspect_ratio from './aspect-ratio';
import image_compressor from './image-compressor';
import image_resizer from './image-resizer';
import favicon_generator from './favicon-generator';
import svg_optimizer from './svg-optimizer';
import json_to_typescript from './json-to-typescript';
import yaml_validator from './yaml-validator';
import line_cleaner from './line-cleaner';
import list_to_sql from './list-to-sql';
import mock_json from './mock-json';
import meta_tag_generator from './meta-tag-generator';
import robots_txt from './robots-txt';
import http_status from './http-status';
import subnet_calculator from './subnet-calculator';
import chmod_calculator from './chmod-calculator';
import java_beautifier from './java-beautifier';
import javascript_beautifier from './javascript-beautifier';
import css_beautifier from './css-beautifier';
import html_beautifier from './html-beautifier';
import python_formatter from './python-formatter';
import sql_formatter from './sql-formatter';
import xml_formatter from './xml-formatter';
import px_to_rem from './px-to-rem';
import email_extractor from './email-extractor';
import user_agent_parser from './user-agent-parser';
import jsonpath_tester from './jsonpath-tester';

export const NEW_TOOL_CONTENT = {
  'uuid-generator': uuid_generator,
  'hash-generator': hash_generator,
  'cron-generator': cron_generator,
  'slug-generator': slug_generator,
  'number-base-converter': number_base_converter,
  'html-entities': html_entities,
  'color-palette': color_palette,
  'contrast-checker': contrast_checker,
  'aspect-ratio': aspect_ratio,
  'image-compressor': image_compressor,
  'image-resizer': image_resizer,
  'favicon-generator': favicon_generator,
  'svg-optimizer': svg_optimizer,
  'json-to-typescript': json_to_typescript,
  'yaml-validator': yaml_validator,
  'line-cleaner': line_cleaner,
  'list-to-sql': list_to_sql,
  'mock-json': mock_json,
  'meta-tag-generator': meta_tag_generator,
  'robots-txt': robots_txt,
  'http-status': http_status,
  'subnet-calculator': subnet_calculator,
  'chmod-calculator': chmod_calculator,
  'java-beautifier': java_beautifier,
  'javascript-beautifier': javascript_beautifier,
  'css-beautifier': css_beautifier,
  'html-beautifier': html_beautifier,
  'python-formatter': python_formatter,
  'sql-formatter': sql_formatter,
  'xml-formatter': xml_formatter,
  'px-to-rem': px_to_rem,
  'email-extractor': email_extractor,
  'user-agent-parser': user_agent_parser,
  'jsonpath-tester': jsonpath_tester,
} satisfies Record<string, ToolContent>;
